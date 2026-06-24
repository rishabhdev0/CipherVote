const r = require("express").Router();
const prisma = require("../config/database");
const {
  authenticate,
  electionAdminOnly,
  voterRegistryRead,
} = require("../middleware/auth.middleware");
const {
  success,
  badRequest,
  notFound,
  forbidden,
} = require("../utils/response");
const audit = require("../services/audit.service");
const blockchain = require("../services/blockchain.service");
const { chainCandidateId } = require("../services/chain.authority.service");
const {
  validateCandidateApplication,
} = require("../middleware/input-validation.middleware");

const requireChain = () =>
  process.env.NODE_ENV === "production" ||
  process.env.REQUIRE_CHAIN_LIFECYCLE === "true";
const MIN_ELECTION_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
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

function resultSummary(candidates = [], ownCandidateId, notaVotes = 0) {
  const sorted = [...candidates].sort(
    (a, b) => Number(b.voteCount || 0) - Number(a.voteCount || 0),
  );
  const candidateVotes = sorted.reduce(
    (sum, c) => sum + Number(c.voteCount || 0),
    0,
  );
  const totalVotes = candidateVotes + Number(notaVotes || 0);
  const topVotes = Number(sorted[0]?.voteCount || 0);
  const winners = topVotes > 0
    ? sorted.filter((c) => Number(c.voteCount || 0) === topVotes)
    : [];
  const ownRank =
    sorted.findIndex((c) => c.id === ownCandidateId) >= 0
      ? sorted.findIndex((c) => c.id === ownCandidateId) + 1
      : null;
  return {
    totalVotes,
    notaVotes: Number(notaVotes || 0),
    isTie: winners.length > 1,
    winner: winners.length === 1 ? winners[0] : null,
    tiedCandidates: winners,
    ownRank,
    isWinner: winners.some((c) => c.id === ownCandidateId),
  };
}

r.use(authenticate);

r.use((req, res, next) => {
  if (!prisma.candidateApplication) {
    return res.status(503).json({
      success: false,
      message:
        "Candidate application model is not available. Run: npm.cmd --prefix backend run db:migrate && npm.cmd --prefix backend run db:gen",
    });
  }
  next();
});

r.post("/applications", validateCandidateApplication, async (req, res) => {
  try {
    const {
      electionId,
      fullName,
      party,
      partyLogoUrl,
      constituency,
      manifesto,
      contactEmail,
      contactPhone,
      documentHash,
    } = req.body;
    if (!fullName || !party || !constituency)
      return badRequest(res, "fullName, party, and constituency are required");
    if (!req.user.walletAddress)
      return badRequest(
        res,
        "Registered wallet required before candidate application",
      );
    if (req.user.role !== "CANDIDATE")
      return forbidden(
        res,
        "Candidate applications require a candidate account. Sign out and create a separate candidate account.",
      );
    let election = null;
    if (electionId) {
      election = await prisma.election.findUnique({
        where: { id: electionId },
      });
      if (!election) return notFound(res, "Election not found");
      if (election.status !== "DRAFT")
        return badRequest(
          res,
          "Candidate applications are only accepted while election is DRAFT",
        );
      if (
        !(
          election.constituency === "ALL" ||
          election.constituency === constituency
        )
      )
        return badRequest(
          res,
          "Candidate constituency does not match election constituency",
        );
    }
    const existing = await prisma.candidateApplication.findFirst({
      where: {
        userId: req.user.id,
        electionId: electionId || null,
        status: { in: ["SUBMITTED", "APPROVED"] },
      },
    });
    if (existing)
      return badRequest(
        res,
        "You already have an active candidate application for this election",
      );
    const app = await prisma.$transaction(async (tx) => {
      return tx.candidateApplication.create({
        data: {
          userId: req.user.id,
          electionId: electionId || null,
          fullName,
          party,
          partyLogoUrl,
          constituency,
          manifesto,
          contactEmail,
          contactPhone,
          documentHash,
          status: "SUBMITTED",
        },
      });
    });
    await audit.log({
      userId: req.user.id,
      action: "CANDIDATE_APPLICATION_SUBMITTED",
      resource: "CANDIDATE_APPLICATION",
      resourceId: app.id,
      description: "Candidate application submitted",
      ipAddress: req.ip,
      metadata: { electionId, constituency, party, hasPartyLogo: !!partyLogoUrl },
    });
    return success(res, app, "Candidate application submitted", 201);
  } catch (e) {
    return badRequest(res, e.message);
  }
});

r.get("/applications/mine", async (req, res) => {
  const rows = await prisma.candidateApplication.findMany({
    where: { userId: req.user.id },
    include: {
      election: {
        select: {
          id: true,
          title: true,
          status: true,
          startTime: true,
          endTime: true,
          constituency: true,
          totalVotesCast: true,
          notaVotes: true,
          candidates: {
            select: {
              id: true,
              name: true,
              party: true,
              partyLogoUrl: true,
              voteCount: true,
              isActive: true,
            },
          },
        },
      },
      candidate: true,
    },
    orderBy: { submittedAt: "desc" },
  });
  const applications = rows.map((app) => {
    const resultVisible = ["CLOSED", "RESULTS_DECLARED"].includes(
      app.election?.status,
    );
    const result = resultVisible && app.election
      ? resultSummary(
          app.election.candidates || [],
          app.candidate?.id,
          app.election.notaVotes,
        )
      : null;
    const candidate = app.candidate
      ? {
          id: app.candidate.id,
          name: app.candidate.name,
          party: app.candidate.party,
          partyLogoUrl: app.candidate.partyLogoUrl,
          constituency: app.candidate.constituency,
          isActive: app.candidate.isActive,
          blockchainId: app.candidate.blockchainId,
          voteCount: resultVisible ? app.candidate.voteCount : null,
          tallySealed: !resultVisible,
        }
      : null;
    return {
      ...app,
      candidate,
      election: app.election
        ? {
            ...app.election,
            totalVotesCast: resultVisible ? app.election.totalVotesCast : null,
            tallySealed: !resultVisible,
            candidates: undefined,
            result: result
              ? {
                  totalVotes: result.totalVotes,
                  notaVotes: result.notaVotes,
                  isTie: result.isTie,
                  isWinner: result.isWinner,
                  ownRank: result.ownRank,
                  winnerName: result.winner?.name || null,
                  winnerParty: result.winner?.party || null,
                  tiedCandidates: result.tiedCandidates.map((c) => ({
                    id: c.id,
                    name: c.name,
                    party: c.party,
                    partyLogoUrl: c.partyLogoUrl,
                    voteCount: c.voteCount,
                  })),
                }
              : null,
          }
        : null,
    };
  });
  return success(res, { applications });
});

r.get("/applications", voterRegistryRead, async (req, res) => {
  const {
    status,
    electionId,
    constituency,
    page = 1,
    limit = 25,
    search,
  } = req.query;
  const where = {};
  if (status) where.status = status;
  if (electionId) where.electionId = electionId;
  if (constituency) where.constituency = constituency;
  if (search)
    where.OR = [
      { fullName: { contains: search, mode: "insensitive" } },
      { party: { contains: search, mode: "insensitive" } },
      { contactEmail: { contains: search, mode: "insensitive" } },
    ];
  const [data, total] = await Promise.all([
    prisma.candidateApplication.findMany({
      where,
      skip: (+page - 1) * +limit,
      take: +limit,
      include: {
        user: {
          select: { id: true, email: true, phone: true, walletAddress: true },
        },
        election: {
          select: { id: true, title: true, status: true, constituency: true },
        },
      },
      orderBy: { submittedAt: "desc" },
    }),
    prisma.candidateApplication.count({ where }),
  ]);
  return success(res, {
    data,
    total,
    pages: Math.ceil(total / +limit),
    page: +page,
  });
});

r.put("/applications/:id/approve", electionAdminOnly, async (req, res) => {
  try {
    const app = await prisma.candidateApplication.findUnique({
      where: { id: req.params.id },
      include: { election: true },
    });
    if (!app) return notFound(res, "Application not found");
    if (app.status !== "SUBMITTED")
      return badRequest(res, "Only submitted applications can be approved");
    if (!app.electionId)
      return badRequest(
        res,
        "Application must be assigned to an election before approval",
      );
    if (app.election.status !== "DRAFT")
      return badRequest(
        res,
        "Candidates can only be approved while election is DRAFT",
      );
    let chain = null;
    if (
      (process.env.CONTRACT_ELECTION_MANAGER || requireChain()) &&
      !app.election.blockchainId
    )
      return badRequest(res, "Election missing blockchainId");
    if (process.env.CONTRACT_ELECTION_MANAGER || requireChain())
      try {
        const windowRefresh = await refreshDraftChainWindowIfNeeded(app.election);
        chain = await blockchain.electionManager.addCandidate(
          app.election.blockchainId,
          {
            name: app.fullName,
            party: app.party,
            metadataURI: app.manifesto || "",
          },
        );
        if (windowRefresh) chain = { addCandidate: chain, windowRefresh };
      } catch (error) {
        const message = chainErrorMessage(error);
        if (/Started/i.test(message))
          return badRequest(
            res,
            "This election has already reached its on-chain start time. Candidate approval is locked. Create a new draft election or update the draft voting window before approval.",
          );
        if (requireChain() || process.env.CONTRACT_ELECTION_MANAGER)
          return badRequest(res, message);
        chain = { skipped: true, error: message };
      }
    const result = await prisma.$transaction(async (tx) => {
      const candidate = await tx.candidate.create({
        data: {
          electionId: app.electionId,
          name: app.fullName,
          party: app.party,
          partyLogoUrl: app.partyLogoUrl,
          constituency: app.constituency,
          manifesto: app.manifesto,
          isActive: true,
          blockchainId: chainCandidateId(chain),
          applicationId: app.id,
        },
      });
      const updated = await tx.candidateApplication.update({
        where: { id: app.id },
        data: {
          status: "APPROVED",
          candidateId: candidate.id,
          reviewedById: req.user.id,
          reviewedAt: new Date(),
          reviewReason: req.body.reason || "Approved by Election Commission",
        },
      });
      return { candidate, application: updated };
    });
    await audit.log({
      userId: req.user.id,
      action: "CANDIDATE_APPLICATION_APPROVED",
      resource: "CANDIDATE_APPLICATION",
      resourceId: app.id,
      description: req.body.reason || "Candidate approved",
      severity: "HIGH",
      ipAddress: req.ip,
      metadata: {
        candidateId: result.candidate.id,
        electionId: app.electionId,
        chain,
      },
    });
    return success(res, result, "Candidate approved");
  } catch (e) {
    return badRequest(res, e.message);
  }
});

r.put("/applications/:id/reject", electionAdminOnly, async (req, res) => {
  try {
    const app = await prisma.candidateApplication.findUnique({
      where: { id: req.params.id },
    });
    if (!app) return notFound(res, "Application not found");
    if (!["SUBMITTED", "DRAFT"].includes(app.status))
      return badRequest(
        res,
        "Application cannot be rejected from current status",
      );
    const updated = await prisma.candidateApplication.update({
      where: { id: app.id },
      data: {
        status: "REJECTED",
        reviewedById: req.user.id,
        reviewedAt: new Date(),
        reviewReason: req.body.reason || "Rejected by Election Commission",
      },
    });
    await audit.log({
      userId: req.user.id,
      action: "CANDIDATE_APPLICATION_REJECTED",
      resource: "CANDIDATE_APPLICATION",
      resourceId: app.id,
      description: req.body.reason || "Candidate rejected",
      severity: "HIGH",
      ipAddress: req.ip,
      metadata: { electionId: app.electionId },
    });
    return success(res, updated, "Candidate rejected");
  } catch (e) {
    return badRequest(res, e.message);
  }
});

r.put(
  "/applications/:id/assign-election",
  electionAdminOnly,
  async (req, res) => {
    try {
      const { electionId } = req.body;
      if (!electionId) return badRequest(res, "electionId required");
      const [election, app] = await Promise.all([
        prisma.election.findUnique({ where: { id: electionId } }),
        prisma.candidateApplication.findUnique({
          where: { id: req.params.id },
        }),
      ]);
      if (!election) return notFound(res, "Election not found");
      if (!app) return notFound(res, "Application not found");
      if (election.status !== "DRAFT")
        return badRequest(
          res,
          "Applications can only be assigned to DRAFT elections",
        );
      if (
        !(
          election.constituency === "ALL" ||
          election.constituency === app.constituency
        )
      )
        return forbidden(res, "Candidate is outside election constituency");
      const updated = await prisma.candidateApplication.update({
        where: { id: app.id },
        data: { electionId },
      });
      await audit.log({
        userId: req.user.id,
        action: "CANDIDATE_APPLICATION_ASSIGNED",
        resource: "CANDIDATE_APPLICATION",
        resourceId: app.id,
        description: "Candidate application assigned to election",
        ipAddress: req.ip,
        metadata: { electionId },
      });
      return success(res, updated, "Assigned to election");
    } catch (e) {
      return badRequest(res, e.message);
    }
  },
);

module.exports = r;
