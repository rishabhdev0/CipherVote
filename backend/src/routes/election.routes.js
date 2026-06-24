const r = require("express").Router(),
  prisma = require("../config/database"),
  {
    authenticate,
    electionAdminOnly,
    optionalAuthenticate,
  } = require("../middleware/auth.middleware"),
  { success, badRequest, notFound } = require("../utils/response"),
  audit = require("../services/audit.service");
const blockchain = require("../services/blockchain.service");
const governance = require("../services/governance.service");
const {
  electionState,
  chainCandidateId,
} = require("../services/chain.authority.service");
const {
  rebuildElectionEligibility,
  listElectionRoll,
  listSelectableVoters,
  setElectionVoterSelection,
} = require("../services/eligibility.service");
const {
  validateElectionCreate,
  validateElectionCandidate,
} = require("../middleware/input-validation.middleware");
const requireChain = () =>
  process.env.NODE_ENV === "production" ||
  process.env.REQUIRE_CHAIN_LIFECYCLE === "true";
const MIN_ELECTION_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const RESULT_VISIBLE_STATUSES = new Set(["CLOSED", "RESULTS_DECLARED"]);
const QUICK_RESULT_MAX_MS = 20 * 60 * 1000;
const chainErrorMessage = (error) =>
  error.shortMessage || error.reason || error.message || "Blockchain transaction failed";

async function refreshDraftChainWindowIfNeeded(election) {
  if (process.env.NODE_ENV === "production") return null;
  if (!election?.blockchainId || election.status !== "DRAFT") return null;
  if (new Date(election.startTime) > new Date()) return null;
  const start = new Date(Date.now() + 5 * 60 * 1000);
  const currentDuration =
    new Date(election.endTime).getTime() - new Date(election.startTime).getTime();
  const end = new Date(
    start.getTime() + Math.max(currentDuration, MIN_ELECTION_WINDOW_MS),
  );
  const chain = await blockchain.electionManager.updateElectionWindow(
    election.blockchainId,
    start,
    end,
  );
  await prisma.election.update({
    where: { id: election.id },
    data: { startTime: start, endTime: end },
  });
  return { start, end, chain };
}

function resultSummary(candidates = [], notaVotes = 0) {
  const sorted = [...candidates].sort(
    (a, b) => Number(b.voteCount || 0) - Number(a.voteCount || 0),
  );
  const candidateVotes = sorted.reduce((sum, c) => sum + Number(c.voteCount || 0), 0);
  const totalVotes = candidateVotes + Number(notaVotes || 0);
  const topVotes = Number(sorted[0]?.voteCount || 0);
  const winners = topVotes > 0
    ? sorted.filter((c) => Number(c.voteCount || 0) === topVotes)
    : [];
  return {
    totalVotes,
    notaVotes: Number(notaVotes || 0),
    isTie: winners.length > 1,
    winner: winners.length === 1 ? winners[0] : null,
    tiedCandidates: winners,
    winMargin:
      winners.length > 1
        ? 0
        : topVotes - Number(sorted[1]?.voteCount || 0),
    sorted,
  };
}

function decodeDevBallotPayload(encryptedPayload) {
  const envelope = JSON.parse(encryptedPayload);
  if (envelope.scheme !== "DEV_BASE64_NOT_FOR_PRODUCTION") return null;
  const json = Buffer.from(envelope.ciphertext, "base64").toString("utf8");
  return JSON.parse(json);
}

async function tallyDevEncryptedBallots(tx, election) {
  if (process.env.NODE_ENV === "production") {
    if (election.privacyMode === "ENCRYPTED_BALLOT")
      throw new Error("Production encrypted tally service is not configured");
    return null;
  }
  const ballots = await tx.encryptedBallot.findMany({
    where: { electionId: election.id, status: "CONFIRMED" },
    select: { encryptedPayload: true, encryptionScheme: true },
  });
  const devBallots = ballots.filter(
    (b) => b.encryptionScheme === "DEV_BASE64_NOT_FOR_PRODUCTION",
  );
  if (devBallots.length === 0) return null;
  if (devBallots.length !== ballots.length)
    throw new Error("Mixed ballot encryption schemes cannot be dev tallied");
  const counts = new Map();
  let notaVotes = 0;
  for (const ballot of devBallots) {
    try {
      const payload = decodeDevBallotPayload(ballot.encryptedPayload);
      if (payload?.isNota || payload?.candidateId === "NOTA") {
        notaVotes++;
        continue;
      }
      if (!payload?.candidateId) continue;
      counts.set(payload.candidateId, (counts.get(payload.candidateId) || 0) + 1);
    } catch {}
  }
  await tx.candidate.updateMany({
    where: { electionId: election.id },
    data: { voteCount: 0 },
  });
  for (const [candidateId, count] of counts.entries()) {
    await tx.candidate.update({
      where: { id: candidateId },
      data: { voteCount: count },
    });
  }
  await tx.election.update({
    where: { id: election.id },
    data: { notaVotes },
  });
  return { candidates: Object.fromEntries(counts), notaVotes };
}

async function hasOpenDisputes() {
  return prisma.dispute.count({
    where: { status: { in: ["FILED", "UNDER_REVIEW"] } },
  });
}

async function declareElectionResults({ req, election, notes, quick = false }) {
  const openDisputes = await hasOpenDisputes();
  if (openDisputes > 0)
    throw new Error("Open disputes must be resolved before declaring results");
  await consumeGovernance(req, {
    actionType: "DECLARE_RESULTS",
    resourceId: election.id,
  });
  let chain = null;
  if (process.env.CONTRACT_ELECTION_MANAGER || requireChain()) {
    if (!election.blockchainId) throw new Error("Election missing blockchainId");
    try {
      chain = await blockchain.electionManager.declareResults(election.blockchainId);
    } catch (error) {
      if (requireChain() || process.env.CONTRACT_ELECTION_MANAGER)
        throw error;
      chain = { skipped: true, error: error.message };
    }
  }
  const tally = await prisma.$transaction(async (tx) => {
    const counts = await tallyDevEncryptedBallots(tx, election);
    await tx.election.update({
      where: { id: election.id },
      data: {
        status: "RESULTS_DECLARED",
        certifiedAt: new Date(),
        certifiedById: req.user.id,
        certificationNotes: notes,
        blockchainTxHash: chain?.hash || election.blockchainTxHash,
      },
    });
    return counts;
  });
  await audit.log({
    userId: req.user.id,
    action: quick ? "QUICK_RESULTS_DECLARED" : "RESULTS_DECLARED",
    resource: "ELECTION",
    resourceId: election.id,
    description: quick
      ? "Election quick results certified and declared after full turnout"
      : "Election results certified and declared",
    severity: "CRITICAL",
    ipAddress: req.ip,
    metadata: { chain, certificationNotes: notes, tally, quick },
  });
}

function canViewDraft(req) {
  return ["SUPER_ADMIN", "ELECTION_COMMISSION", "AUDITOR"].includes(
    req.user?.role,
  );
}

async function publicElection(e, req) {
  if (!e) return e;
  const chainState = await electionState(e);
  const chainTotalVotes =
    chainState.available && Number.isFinite(Number(chainState.totalVotes))
      ? Number(chainState.totalVotes)
      : null;
  const totalVotesCast = chainTotalVotes ?? e.totalVotesCast;
  const showCandidateVotes = RESULT_VISIBLE_STATUSES.has(e.status);
  const showCandidateList =
    e.status !== "DRAFT" || canViewDraft(req);
  const summary = showCandidateVotes
    ? resultSummary(e.candidates || [], e.notaVotes)
    : null;
  const activeCandidates = (e.candidates || []).filter((c) => c.isActive);
  return {
    ...e,
    totalVotesCast,
    chainState,
    candidateCount: showCandidateList ? activeCandidates.length : 0,
    resultSummary: summary
      ? {
          totalVotes: summary.totalVotes,
          notaVotes: summary.notaVotes,
          isTie: summary.isTie,
          winnerName: summary.winner?.name || null,
          winnerParty: summary.winner?.party || null,
          winnerVotes: summary.winner?.voteCount || 0,
          tiedCandidates: summary.tiedCandidates.map((c) => ({
            id: c.id,
            name: c.name,
            party: c.party,
            partyLogoUrl: c.partyLogoUrl,
            voteCount: c.voteCount,
          })),
          winMargin: summary.winMargin,
        }
      : null,
    candidates: showCandidateList
      ? activeCandidates.map((c) => ({
          id: c.id,
          electionId: c.electionId,
          name: c.name,
          party: c.party,
          partyLogoUrl: c.partyLogoUrl,
          constituency: c.constituency,
          manifesto: c.manifesto,
          photoUrl: c.photoUrl,
          blockchainId: c.blockchainId,
          isActive: c.isActive,
          createdAt: c.createdAt,
          ...(showCandidateVotes ? { voteCount: c.voteCount } : {}),
        }))
      : [],
  };
}
async function consumeGovernance(
  req,
  { actionType, resource = "ELECTION", resourceId },
) {
  const action = await governance.requireApprovedAction({
    actionId: req.body.governanceActionId,
    actionType,
    resource,
    resourceId,
  });
  if (action) await governance.markExecuted({ actionId: action.id });
  return action;
}
r.get("/", optionalAuthenticate, async (req, res) => {
  const { status, page = 1, limit = 9 } = req.query;
  const where = canViewDraft(req) ? {} : { status: { not: "DRAFT" } };
  if (status) where.status = status;
  if (status === "DRAFT" && !canViewDraft(req))
    return success(res, {
      data: [],
      pagination: { total: 0, pages: 0, page: +page },
    });
  const [data, total] = await Promise.all([
    prisma.election.findMany({
      where,
      skip: (+page - 1) * +limit,
      take: +limit,
      include: { candidates: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.election.count({ where }),
  ]);
  return success(res, {
    data: await Promise.all(data.map((e) => publicElection(e, req))),
    pagination: { total, pages: Math.ceil(total / +limit), page: +page },
  });
});
r.get("/:id", optionalAuthenticate, async (req, res) => {
  const e = await prisma.election.findUnique({
    where: { id: req.params.id },
    include: { candidates: true },
  });
  if (!e) return notFound(res);
  if (e.status === "DRAFT" && !canViewDraft(req)) return notFound(res);
  return success(res, await publicElection(e, req));
});
r.get("/:id/tally", async (req, res) => {
  const e = await prisma.election.findUnique({ where: { id: req.params.id } });
  if (!e) return notFound(res);
  const chainState = await electionState(e);
  if (!["CLOSED", "RESULTS_DECLARED"].includes(e.status))
    return success(
      res,
      {
        sealed: true,
        totalVotes: chainState.available ? chainState.totalVotes : e.totalVotesCast,
        candidates: [],
      },
      "Tally sealed until election close",
    );
  const cands = await prisma.candidate.findMany({
    where: { electionId: req.params.id },
  });
  const candidateVotes = cands.reduce((s, c) => s + c.voteCount, 0);
  const notaVotes = Number(e.notaVotes || 0);
  return success(res, {
    sealed: false,
    candidates: cands,
    notaResult: {
      candidateId: "NOTA",
      candidateName: "None of the Above",
      partyName: "Official ballot option",
      voteCount: notaVotes,
      percentage:
        candidateVotes + notaVotes > 0
          ? +((notaVotes / (candidateVotes + notaVotes)) * 100).toFixed(2)
          : 0,
      isNota: true,
    },
    totalVotes: candidateVotes + notaVotes,
  });
});
r.get("/:id/results", async (req, res) => {
  const e = await prisma.election.findUnique({
    where: { id: req.params.id },
    include: { candidates: true },
  });
  if (!e) return notFound(res);
  if (e.status !== "RESULTS_DECLARED" || !e.certifiedAt)
    return success(
      res,
      {
        sealed: true,
        election: { id: e.id, title: e.title, status: e.status },
        totalVotes: e.totalVotesCast,
      },
      "Results not certified",
    );
  const summary = resultSummary(e.candidates, e.notaVotes);
  const sorted = summary.sorted;
  const total = summary.totalVotes;
  const winner = summary.winner;
  return success(res, {
    sealed: false,
    election: e,
    totalVotes: total,
    isTie: summary.isTie,
    winner,
    winnerName: winner?.name,
    winnerParty: winner?.party,
    winnerVotes: winner?.voteCount || 0,
    notaVotes: summary.notaVotes,
    notaPercentage:
      total > 0 ? +((summary.notaVotes / total) * 100).toFixed(2) : 0,
    tiedCandidates: summary.tiedCandidates.map((c) => ({
      candidateId: c.id,
      candidateName: c.name,
      partyName: c.party,
      partyLogoUrl: c.partyLogoUrl,
      voteCount: c.voteCount,
    })),
    winMargin: summary.winMargin,
    turnoutPercentage:
      e.totalRegistered > 0
        ? +((total / e.totalRegistered) * 100).toFixed(2)
        : 0,
    candidateResults: sorted.map((c, i) => ({
      candidateId: c.id,
      candidateName: c.name,
      partyName: c.party,
      partyLogoUrl: c.partyLogoUrl,
      voteCount: c.voteCount,
      percentage: total > 0 ? +((c.voteCount / total) * 100).toFixed(2) : 0,
      rank: i + 1,
    })),
    notaResult: {
      candidateId: "NOTA",
      candidateName: "None of the Above",
      partyName: "Official ballot option",
      voteCount: summary.notaVotes,
      percentage:
        total > 0 ? +((summary.notaVotes / total) * 100).toFixed(2) : 0,
      rank: null,
      isNota: true,
    },
  });
});
r.get("/:id/trend", async (req, res) => success(res, { trend: [] }));
r.use(authenticate, electionAdminOnly);
r.post("/", validateElectionCreate, async (req, res) => {
  const {
    title,
    description,
    constituency,
    startTime,
    endTime,
    challengeStartsAt,
    challengeEndsAt,
    tallyPublicKey,
  } = req.body;
  const start = new Date(startTime),
    end = new Date(endTime);
  if (
    !title ||
    !constituency ||
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime())
  )
    return badRequest(res, "Invalid election data");
  if (start >= end) return badRequest(res, "startTime must be before endTime");
  if (end - start < MIN_ELECTION_WINDOW_MS)
    return badRequest(res, "Election voting window must be at least 7 full days");
  if (
    (process.env.NODE_ENV === "production" ||
      process.env.BALLOT_PRIVACY_MODE === "encrypted") &&
    !tallyPublicKey
  )
    return badRequest(
      res,
      "Tally public key required for encrypted ballot elections",
    );
  await consumeGovernance(req, {
    actionType: "CREATE_ELECTION",
    resourceId: "NEW",
  });
  let chain = null;
  if (process.env.CONTRACT_ELECTION_MANAGER || requireChain())
    chain = await blockchain.electionManager.createElection({
      title,
      description,
      constituency,
      startTime: start,
      endTime: end,
    });
  if (chain?.blockchainId) {
    const duplicateChainElection = await prisma.election.findFirst({
      where: { blockchainId: chain.blockchainId },
      select: { id: true, title: true },
    });
    if (duplicateChainElection)
      return badRequest(
        res,
        `On-chain election ${chain.blockchainId} is already linked to ${duplicateChainElection.title}. Reset local DB or redeploy contracts before creating another linked election.`,
      );
  }
  const e = await prisma.election.create({
    data: {
      title,
      description,
      constituency,
      startTime: start,
      endTime: end,
      status: "DRAFT",
      createdBy: req.user.id,
      privacyMode: req.body.privacyMode || "ENCRYPTED_BALLOT",
      tallyPublicKey,
      challengeStartsAt: challengeStartsAt ? new Date(challengeStartsAt) : null,
      challengeEndsAt: challengeEndsAt ? new Date(challengeEndsAt) : null,
      blockchainId: chain?.blockchainId,
      blockchainTxHash: chain?.hash,
    },
  });
  await audit.log({
    userId: req.user.id,
    action: "ELECTION_CREATED",
    resource: "ELECTION",
    resourceId: e.id,
    description: "Election created",
    ipAddress: req.ip,
    metadata: { chain, governed: true, hasTallyPublicKey: !!tallyPublicKey },
  });
  return success(res, e, "Created", 201);
});
r.post(
  "/:id/candidates",
  validateElectionCandidate,
  async (req, res) => {
  const { name, party, partyLogoUrl, constituency, manifesto } = req.body;
  if (!name || !party)
    return badRequest(res, "Candidate name and party required");
  const e = await prisma.election.findUnique({ where: { id: req.params.id } });
  if (!e) return notFound(res, "Election not found");
  if (e.status !== "DRAFT")
    return badRequest(
      res,
      "Candidates can only be changed while election is DRAFT",
    );
  let chain = null;
  if (
    (process.env.CONTRACT_ELECTION_MANAGER || requireChain()) &&
    !e.blockchainId
  )
    return badRequest(res, "Election missing blockchainId");
  if (process.env.CONTRACT_ELECTION_MANAGER || requireChain()) {
    try {
      const windowRefresh = await refreshDraftChainWindowIfNeeded(e);
      chain = await blockchain.electionManager.addCandidate(e.blockchainId, {
        name,
        party,
        metadataURI: manifesto || "",
      });
      if (windowRefresh) chain = { addCandidate: chain, windowRefresh };
    } catch (error) {
      const message = chainErrorMessage(error);
      if (/Started/i.test(message))
        return badRequest(
          res,
          "This election has already reached its on-chain start time. Candidate changes are locked. Create a new draft election or update the draft voting window first.",
        );
      return badRequest(res, message);
    }
  }
  const c = await prisma.candidate.create({
    data: {
      electionId: req.params.id,
      name,
      party,
      partyLogoUrl,
      constituency: constituency || e.constituency,
      manifesto,
      isActive: true,
      blockchainId: chainCandidateId(chain),
    },
  });
  await audit.log({
    userId: req.user.id,
    action: "CANDIDATE_ADDED",
    resource: "ELECTION",
    resourceId: e.id,
    description: "Candidate added",
    ipAddress: req.ip,
    metadata: { candidateId: c.id, chain },
  });
    return success(res, c, "Added", 201);
  },
);
r.post("/:id/eligibility/rebuild", async (req, res) => {
  try {
    await consumeGovernance(req, {
      actionType: "REBUILD_ELIGIBILITY",
      resourceId: req.params.id,
    });
    const result = await rebuildElectionEligibility(req.params.id);
    const election = await prisma.election.findUnique({
      where: { id: req.params.id },
    });
    let chain = null;
    if (
      result.merkleRoot &&
      election?.blockchainId &&
      (process.env.CONTRACT_ELECTION_MANAGER || requireChain())
    ) {
      try {
        chain = await blockchain.electionManager.setEligibilityRoot(
          election.blockchainId,
          result.merkleRoot,
        );
      } catch (error) {
        if (requireChain() || process.env.CONTRACT_ELECTION_MANAGER)
          throw error;
        chain = { skipped: true, error: error.message };
      }
    }
    await audit.log({
      userId: req.user.id,
      action: "ELIGIBILITY_ROOT_REBUILT",
      resource: "ELECTION",
      resourceId: req.params.id,
      description: "Eligibility commitments and Merkle root rebuilt",
      severity: "CRITICAL",
      ipAddress: req.ip,
      metadata: { ...result, chain },
    });
    return success(res, { ...result, chain }, "Eligibility rebuilt");
  } catch (e) {
    return badRequest(res, e.message);
  }
});
r.get("/:id/roll/selectable", async (req, res) => {
  try {
    const result = await listSelectableVoters({
      electionId: req.params.id,
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search,
      status: req.query.status || "VERIFIED",
    });
    return success(res, result);
  } catch (e) {
    return badRequest(res, e.message);
  }
});
r.get("/:id/roll", async (req, res) => {
  try {
    const result = await listElectionRoll({
      electionId: req.params.id,
      status: req.query.status,
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search,
    });
    return success(res, result);
  } catch (e) {
    return badRequest(res, e.message);
  }
});
r.put("/:id/roll/:voterId/select", async (req, res) => {
  try {
    const row = await setElectionVoterSelection({
      electionId: req.params.id,
      voterId: req.params.voterId,
      status: "SELECTED",
      userId: req.user.id,
      reason: req.body.reason,
    });
    await audit.log({
      userId: req.user.id,
      action: "ELECTION_VOTER_SELECTED",
      resource: "ELECTION",
      resourceId: req.params.id,
      description: "Voter selected for election roll",
      severity: "HIGH",
      ipAddress: req.ip,
      metadata: { voterId: req.params.voterId, reason: req.body.reason },
    });
    return success(res, row, "Voter selected");
  } catch (e) {
    return badRequest(res, e.message);
  }
});
r.put("/:id/roll/:voterId/reject", async (req, res) => {
  try {
    const row = await setElectionVoterSelection({
      electionId: req.params.id,
      voterId: req.params.voterId,
      status: "REJECTED",
      userId: req.user.id,
      reason: req.body.reason,
    });
    await audit.log({
      userId: req.user.id,
      action: "ELECTION_VOTER_REJECTED",
      resource: "ELECTION",
      resourceId: req.params.id,
      description: req.body.reason || "Voter rejected from election roll",
      severity: "HIGH",
      ipAddress: req.ip,
      metadata: { voterId: req.params.voterId },
    });
    return success(res, row, "Voter rejected");
  } catch (e) {
    return badRequest(res, e.message);
  }
});
r.put("/:id/roll/:voterId/revoke", async (req, res) => {
  try {
    const row = await setElectionVoterSelection({
      electionId: req.params.id,
      voterId: req.params.voterId,
      status: "REVOKED",
      userId: req.user.id,
      reason: req.body.reason,
    });
    await audit.log({
      userId: req.user.id,
      action: "ELECTION_VOTER_REVOKED",
      resource: "ELECTION",
      resourceId: req.params.id,
      description: req.body.reason || "Voter revoked from election roll",
      severity: "CRITICAL",
      ipAddress: req.ip,
      metadata: { voterId: req.params.voterId },
    });
    return success(res, row, "Voter revoked");
  } catch (e) {
    return badRequest(res, e.message);
  }
});
r.put("/:id/activate", async (req, res) => {
  try {
    const e = await prisma.election.findUnique({
      where: { id: req.params.id },
      include: { candidates: { where: { isActive: true } } },
    });
    if (!e) return notFound(res);
    if (e.candidates.length < 2)
      return badRequest(res, "Need 2+ active candidates");
    const selectedVoters = await prisma.electionVoterSelection.count({
      where: { electionId: e.id, status: "SELECTED" },
    });
    if (selectedVoters < 1)
      return badRequest(
        res,
        "Election Commission must select the election voter roll before activation",
      );
    if (!e.merkleRoot)
      return badRequest(
        res,
        "Eligibility Merkle root required before activation",
      );
    if (e.totalRegistered !== selectedVoters)
      return badRequest(
        res,
        "Eligibility root is stale; rebuild the voter roll root before activation",
      );
    if (e.privacyMode === "ENCRYPTED_BALLOT" && !e.tallyPublicKey)
      return badRequest(res, "Tally public key required before activation");
    if (e.challengeEndsAt && e.challengeEndsAt > new Date())
      return badRequest(res, "Public challenge period has not ended");
    if (new Date() >= e.endTime)
      return badRequest(res, "Election endTime is in the past");
    if (e.endTime - e.startTime < MIN_ELECTION_WINDOW_MS)
      return badRequest(
        res,
        "Election voting window must be at least 7 full days",
      );
    const shouldStartNow =
      req.body.startNow === true &&
      process.env.NODE_ENV !== "production" &&
      e.startTime > new Date();
    await consumeGovernance(req, {
      actionType: "ACTIVATE_ELECTION",
      resourceId: e.id,
    });
    let chain = null;
    if (process.env.CONTRACT_ELECTION_MANAGER || requireChain()) {
      if (!e.blockchainId)
        return badRequest(res, "Election missing blockchainId");
      const duplicateChainElection = await prisma.election.findFirst({
        where: {
          blockchainId: e.blockchainId,
          NOT: { id: e.id },
        },
        select: { title: true },
      });
      if (duplicateChainElection)
        return badRequest(
          res,
          `On-chain election ${e.blockchainId} is already linked to ${duplicateChainElection.title}`,
        );
      if (shouldStartNow) {
        const start = new Date();
        const minEnd = new Date(start.getTime() + MIN_ELECTION_WINDOW_MS);
        const chainEnd = e.endTime > minEnd ? e.endTime : minEnd;
        const windowChain = await blockchain.electionManager.updateElectionWindow(
          e.blockchainId,
          start,
          chainEnd,
        );
        chain = { window: windowChain };
      }
      try {
        chain = {
          ...(chain || {}),
          activate: await blockchain.electionManager.activateElection(
            e.blockchainId,
          ),
        };
      } catch (error) {
        if (requireChain() || process.env.CONTRACT_ELECTION_MANAGER)
          throw error;
        chain = { ...(chain || {}), skipped: true, error: error.message };
      }
    }
    const effectiveStart = shouldStartNow ? new Date() : e.startTime;
    const effectiveEnd =
      shouldStartNow && process.env.CONTRACT_ELECTION_MANAGER
        ? e.endTime > new Date(effectiveStart.getTime() + MIN_ELECTION_WINDOW_MS)
          ? e.endTime
          : new Date(effectiveStart.getTime() + MIN_ELECTION_WINDOW_MS)
        : e.endTime;
    await prisma.election.update({
      where: { id: req.params.id },
      data: {
        status: "ACTIVE",
        ...(shouldStartNow
          ? { startTime: effectiveStart, endTime: effectiveEnd }
          : {}),
        blockchainTxHash:
          chain?.activate?.hash || chain?.hash || e.blockchainTxHash,
      },
    });
    await audit.log({
      userId: req.user.id,
      action: "ELECTION_ACTIVATED",
      resource: "ELECTION",
      resourceId: e.id,
      description: "Election activated",
      ipAddress: req.ip,
      metadata: {
        chain,
        merkleRoot: e.merkleRoot,
        selectedVoters,
        hasTallyPublicKey: !!e.tallyPublicKey,
        startNow: shouldStartNow,
      },
    });
    return success(res, {}, "Activated");
  } catch (e) {
    return badRequest(res, e.message);
  }
});
r.put("/:id/pause", async (req, res) => {
  try {
    await consumeGovernance(req, {
      actionType: "PAUSE_ELECTION",
      resourceId: req.params.id,
    });
    const e = await prisma.election.findUnique({ where: { id: req.params.id } });
    if (!e) return notFound(res);
    let chain = null;
    if (process.env.CONTRACT_ELECTION_MANAGER || requireChain()) {
      if (!e.blockchainId) return badRequest(res, "Election missing blockchainId");
      try {
        chain = await blockchain.electionManager.pauseElection(e.blockchainId);
      } catch (error) {
        if (requireChain() || process.env.CONTRACT_ELECTION_MANAGER)
          throw error;
        chain = { skipped: true, error: error.message };
      }
    }
    await prisma.election.update({
      where: { id: req.params.id },
      data: { status: "PAUSED", blockchainTxHash: chain?.hash || e.blockchainTxHash },
    });
    await audit.log({
      userId: req.user.id,
      action: "ELECTION_PAUSED",
      resource: "ELECTION",
      resourceId: req.params.id,
      description: "Election paused",
      ipAddress: req.ip,
      metadata: { chain },
    });
    return success(res, {}, "Paused");
  } catch (e) {
    return badRequest(res, e.message);
  }
});
r.put("/:id/resume", async (req, res) => {
  try {
    const e = await prisma.election.findUnique({
      where: { id: req.params.id },
    });
    if (!e) return notFound(res);
    if (new Date() > e.endTime)
      return badRequest(res, "Cannot resume ended election");
    await consumeGovernance(req, {
      actionType: "RESUME_ELECTION",
      resourceId: req.params.id,
    });
    let chain = null;
    if (process.env.CONTRACT_ELECTION_MANAGER || requireChain()) {
      if (!e.blockchainId) return badRequest(res, "Election missing blockchainId");
      try {
        chain = await blockchain.electionManager.resumeElection(e.blockchainId);
      } catch (error) {
        if (requireChain() || process.env.CONTRACT_ELECTION_MANAGER)
          throw error;
        chain = { skipped: true, error: error.message };
      }
    }
    await prisma.election.update({
      where: { id: req.params.id },
      data: { status: "ACTIVE", blockchainTxHash: chain?.hash || e.blockchainTxHash },
    });
    await audit.log({
      userId: req.user.id,
      action: "ELECTION_RESUMED",
      resource: "ELECTION",
      resourceId: req.params.id,
      description: "Election resumed",
      ipAddress: req.ip,
      metadata: { chain },
    });
    return success(res, {}, "Resumed");
  } catch (e) {
    return badRequest(res, e.message);
  }
});
r.put("/:id/close", async (req, res) => {
  try {
    const e = await prisma.election.findUnique({
      where: { id: req.params.id },
    });
    if (!e) return notFound(res);
    await consumeGovernance(req, {
      actionType: "CLOSE_ELECTION",
      resourceId: req.params.id,
    });
    let chain = null;
    if (process.env.CONTRACT_ELECTION_MANAGER || requireChain()) {
      if (!e.blockchainId)
        return badRequest(res, "Election missing blockchainId");
      try {
        chain = await blockchain.electionManager.closeElection(e.blockchainId);
      } catch (error) {
        if (requireChain() || process.env.CONTRACT_ELECTION_MANAGER)
          throw error;
        chain = { skipped: true, error: error.message };
      }
    }
    await prisma.election.update({
      where: { id: req.params.id },
      data: {
        status: "CLOSED",
        challengeStartsAt: new Date(),
        challengeEndsAt: req.body.challengeEndsAt
          ? new Date(req.body.challengeEndsAt)
          : e.challengeEndsAt,
        blockchainTxHash: chain?.hash || e.blockchainTxHash,
      },
    });
    await audit.log({
      userId: req.user.id,
      action: "ELECTION_CLOSED",
      resource: "ELECTION",
      resourceId: req.params.id,
      description: "Election closed",
      ipAddress: req.ip,
      metadata: { chain },
    });
    return success(res, {}, "Closed");
  } catch (e) {
    return badRequest(res, e.message);
  }
});

r.put("/:id/quick-result", async (req, res) => {
  try {
    const e = await prisma.election.findUnique({
      where: { id: req.params.id },
    });
    if (!e) return notFound(res);
    if (e.status !== "ACTIVE")
      return badRequest(res, "Election must be ACTIVE for quick result");
    if (e.totalRegistered < 1)
      return badRequest(res, "No selected voter roll exists for this election");
    if (e.totalVotesCast < e.totalRegistered)
      return badRequest(
        res,
        "Quick result is available only after every selected voter has voted",
      );
    const lastVote = await prisma.vote.findFirst({
      where: { electionId: e.id },
      orderBy: { castAt: "desc" },
      select: { castAt: true },
    });
    const quickResultDeadline = new Date(
      (lastVote?.castAt || new Date()).getTime() + QUICK_RESULT_MAX_MS,
    );
    let closeChain = null;
    if (process.env.CONTRACT_ELECTION_MANAGER || requireChain()) {
      if (!e.blockchainId)
        return badRequest(res, "Election missing blockchainId");
      try {
        closeChain = await blockchain.electionManager.closeElection(e.blockchainId);
      } catch (error) {
        if (requireChain() || process.env.CONTRACT_ELECTION_MANAGER)
          throw error;
        closeChain = { skipped: true, error: error.message };
      }
    }
    const closed = await prisma.election.update({
      where: { id: e.id },
      data: {
        status: "CLOSED",
        challengeStartsAt: new Date(),
        challengeEndsAt: new Date(),
        endTime: new Date(),
        blockchainTxHash: closeChain?.hash || e.blockchainTxHash,
      },
    });
    await audit.log({
      userId: req.user.id,
      action: "ELECTION_QUICK_CLOSED",
      resource: "ELECTION",
      resourceId: e.id,
      description: "Election closed early after full voter turnout",
      severity: "CRITICAL",
      ipAddress: req.ip,
      metadata: {
        closeChain,
        totalRegistered: e.totalRegistered,
        totalVotesCast: e.totalVotesCast,
        quickResultDeadline,
      },
    });
    await declareElectionResults({
      req,
      election: closed,
      notes:
        req.body.certificationNotes ||
        "Quick result declared after all selected voters cast ballots",
      quick: true,
    });
    return success(res, { quickResultDeadline }, "Quick results declared");
  } catch (e) {
    return badRequest(res, e.message);
  }
});

r.put("/:id/declare", async (req, res) => {
  try {
    const e = await prisma.election.findUnique({
      where: { id: req.params.id },
    });
    if (!e) return notFound(res);
    if (e.status !== "CLOSED")
      return badRequest(
        res,
        "Election must be CLOSED before declaring results",
      );
    if (e.challengeEndsAt && e.challengeEndsAt > new Date())
      return badRequest(res, "Challenge period has not ended");
    await declareElectionResults({
      req,
      election: e,
      notes: req.body.certificationNotes,
    });
    return success(res, {}, "Declared");
  } catch (e) {
    return badRequest(res, e.message);
  }
});
r.delete("/:id/candidates/:cId", async (req, res) => {
  const e = await prisma.election.findUnique({ where: { id: req.params.id } });
  if (!e) return notFound(res, "Election not found");
  if (e.status !== "DRAFT")
    return badRequest(
      res,
      "Candidates can only be removed while election is DRAFT",
    );
  await prisma.candidate.update({
    where: { id: req.params.cId },
    data: { isActive: false },
  });
  await audit.log({
    userId: req.user.id,
    action: "CANDIDATE_REMOVED",
    resource: "ELECTION",
    resourceId: req.params.id,
    description: "Candidate deactivated",
    ipAddress: req.ip,
    metadata: { candidateId: req.params.cId },
  });
  return success(res, {}, "Removed");
});
module.exports = r;
