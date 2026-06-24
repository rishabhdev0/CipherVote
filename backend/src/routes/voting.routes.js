const r = require("express").Router(),
  prisma = require("../config/database"),
  {
    authenticate,
    verifiedVoterOnly,
  } = require("../middleware/auth.middleware"),
  { votingRateLimit } = require("../middleware/rate-limit.middleware"),
  {
    success,
    badRequest,
    forbidden,
    notFound,
    conflict,
  } = require("../utils/response"),
  { broadcastTallyUpdate, emitVoteCast } = require("../sockets/socketManager"),
  blockchainService = require("../services/blockchain.service"),
  { ethers } = require("ethers"),
  {
    preVoteCheck,
    votePrivacySignalData,
  } = require("../services/fraud.detection.service");
const { generateVoteProof } = require("../services/zkp.proof.service");
const emergency = require("../services/emergency.service");
const {
  getVoterEligibilityPackage,
} = require("../services/eligibility.service");
const {
  recordParticipation,
} = require("../services/nft.credential.service");
const {
  electionState,
  voterState,
} = require("../services/chain.authority.service");
r.use(authenticate);

function electionOpen(e) {
  const now = new Date();
  return e.status === "ACTIVE" && e.startTime <= now && e.endTime >= now;
}
function identityReady(v) {
  return (
    v.status === "VERIFIED" &&
    !v.isBlacklisted &&
    v.faceVerified &&
    v.idVerified &&
    v.livenessVerified
  );
}
function privacyMode() {
  return process.env.BALLOT_PRIVACY_MODE || "encrypted";
}
function chainVotingConfigured() {
  return Boolean(process.env.CONTRACT_VOTING) || process.env.NODE_ENV === "production";
}
function voterWallet(voter) {
  return voter?.user?.walletAddress || voter?.walletAddress || null;
}
function requireElectionChainId(election) {
  if (!election?.blockchainId && chainVotingConfigured())
    throw new Error("Election is not linked to an on-chain election");
  return election.blockchainId;
}
function requireCandidateChainId(candidate) {
  if (!candidate?.blockchainId && chainVotingConfigured())
    throw new Error("Candidate is not linked to an on-chain candidate");
  return candidate.blockchainId;
}
function isHex32(value) {
  return typeof value === "string" && /^0x[0-9a-fA-F]{64}$/.test(value);
}
async function readOnChainVoteStatus(election, voter) {
  if (!chainVotingConfigured())
    return { configured: false, hasVoted: false, source: "database-only" };
  if (!process.env.CONTRACT_VOTING)
    return {
      configured: true,
      available: false,
      hasVoted: false,
      source: "missing-contract",
      reason: "Voting contract is not configured",
    };
  if (!election?.blockchainId)
    return {
      configured: true,
      available: false,
      hasVoted: false,
      source: "missing-election-chain-id",
      reason: "Election is not linked to an on-chain election",
    };
  const wallet = voterWallet(voter);
  if (!wallet)
    return {
      configured: true,
      available: false,
      hasVoted: false,
      source: "missing-voter-wallet",
      reason: "Voter wallet not linked",
    };
  try {
    return {
      configured: true,
      available: true,
      hasVoted: Boolean(
        await blockchainService.voting.voterHasVoted(wallet, election.blockchainId),
      ),
      source: "voting-contract",
      electionBlockchainId: election.blockchainId,
      voterWallet: wallet,
    };
  } catch (error) {
    return {
      configured: true,
      available: false,
      hasVoted: false,
      source: "chain-read-failed",
      reason: error.message,
      electionBlockchainId: election.blockchainId,
      voterWallet: wallet,
    };
  }
}
async function assertOnChainVoteOpen(election, voter) {
  const chainVote = await readOnChainVoteStatus(election, voter);
  if (chainVote.configured && !chainVote.available)
    throw new Error(chainVote.reason || "Unable to verify on-chain vote status");
  if (chainVote.hasVoted)
    throw Object.assign(new Error("Already voted on-chain"), {
      statusCode: 409,
    });
  return chainVote;
}
function parseEncryptedBallotPayload(encryptedPayload, encryptionScheme) {
  if (typeof encryptedPayload !== "string" || encryptedPayload.length > 65536)
    throw new Error("Encrypted ballot payload is invalid or too large");
  let envelope;
  try {
    envelope = JSON.parse(encryptedPayload);
  } catch {
    throw new Error("Encrypted ballot payload must be a JSON envelope");
  }
  const scheme = envelope.scheme || encryptionScheme;
  const allowed = new Set([
    "RSA-OAEP-SHA256+AES-256-GCM",
    "DEV_BASE64_NOT_FOR_PRODUCTION",
  ]);
  if (!allowed.has(scheme)) throw new Error("Unsupported ballot encryption scheme");
  if (process.env.NODE_ENV === "production" && scheme !== "RSA-OAEP-SHA256+AES-256-GCM")
    throw new Error("Production ballots must use the configured tally public key");
  if (scheme === "RSA-OAEP-SHA256+AES-256-GCM") {
    if (!envelope.iv || !envelope.wrappedKey || !envelope.ciphertext)
      throw new Error("Encrypted ballot envelope is incomplete");
  }
  if (scheme === "DEV_BASE64_NOT_FOR_PRODUCTION" && !envelope.ciphertext)
    throw new Error("Development ballot envelope is incomplete");
  return scheme;
}
async function recordParticipationAfterVote(req, voter, election) {
  try {
    await recordParticipation(voter.id, election.blockchainId || 0);
  } catch (error) {
    await require("../services/audit.service").log({
      userId: req.user.id,
      action: "NFT_PARTICIPATION_RECORD_FAILED",
      resource: "VOTER",
      resourceId: voter.id,
      description: error.message,
      severity: "WARN",
      ipAddress: req.ip,
      metadata: { electionId: election.id, blockchainId: election.blockchainId },
    });
  }
}

r.get("/:electionId/eligibility", verifiedVoterOnly, async (req, res) => {
  const voter = req.voter;
  const election = await prisma.election.findUnique({
    where: { id: req.params.electionId },
  });
  if (!election) return notFound(res, "Election not found");
  const voted = await prisma.vote.findFirst({
    where: { voterId: voter.id, electionId: election.id },
  });
  const chainVote = await readOnChainVoteStatus(election, voter);
  const chainElection = await electionState(election);
  const chainVoter = await voterState(voter, election);
  const hasVoted = Boolean(voted) || Boolean(chainVote.hasVoted);
  const reasons = [];
  if (!identityReady(voter)) reasons.push("Identity verification incomplete");
  if (!electionOpen(election)) reasons.push("Election not open");
  if (chainElection.configured && !chainElection.available)
    reasons.push(chainElection.reason || "Unable to verify on-chain election");
  if (chainElection.available && !chainElection.isActive)
    reasons.push("Election is not active on-chain");
  if (
    chainElection.available &&
    election.merkleRoot &&
    !chainElection.rootMatches
  )
    reasons.push("Eligibility root does not match on-chain root");
  if (chainVoter.configured && !chainVoter.available)
    reasons.push(chainVoter.reason || "Unable to verify on-chain voter");
  if (chainVoter.available && !chainVoter.registryVerified)
    reasons.push("Voter wallet is not verified on-chain");
  if (hasVoted) reasons.push("Already voted");
  if (chainVote.configured && !chainVote.available)
    reasons.push(chainVote.reason || "Unable to verify on-chain vote status");
  if (
    !(
      election.constituency === "ALL" ||
      election.constituency === voter.constituency
    )
  )
    reasons.push("Wrong constituency");
  const selected = await prisma.electionVoterSelection.findUnique({
    where: {
      electionId_voterId: { electionId: election.id, voterId: voter.id },
    },
  });
  const commitment = await prisma.eligibilityCommitment.findUnique({
    where: {
      electionId_voterId: { electionId: election.id, voterId: voter.id },
    },
  });
  if (!selected || selected.status !== "SELECTED")
    reasons.push("Not selected on Election Commission voter roll");
  if (!commitment || commitment.revokedAt)
    reasons.push("Eligibility proof package not issued");
  return success(res, {
    eligible: reasons.length === 0,
    hasVoted,
    dbHasVoted: !!voted,
    chainHasVoted: Boolean(chainVote.hasVoted),
    chainVoteStatus: chainVote,
    chainElection,
    chainVoter,
    voterStatus: voter.status,
    rollStatus: selected?.status || "NOT_SELECTED",
    hasEligibilityCommitment: !!commitment && !commitment.revokedAt,
    reasons,
  });
});

r.get(
  "/:electionId/eligibility-package",
  verifiedVoterOnly,
  async (req, res) => {
    try {
      const election = await prisma.election.findUnique({
        where: { id: req.params.electionId },
        select: { id: true, status: true, merkleRoot: true },
      });
      if (!election) return notFound(res, "Election not found");
      const pkg = await getVoterEligibilityPackage({
        electionId: election.id,
        voterId: req.voter.id,
      });
      return success(
        res,
        { ...pkg, eligibilityRoot: election.merkleRoot },
        "Eligibility package issued",
      );
    } catch (e) {
      return badRequest(res, e.message);
    }
  },
);

r.get("/verify/:receiptHash", async (req, res) => {
  const vote = await prisma.vote.findFirst({
    where: { receiptHash: req.params.receiptHash },
    include: { election: { select: { title: true, status: true } } },
  });
  if (!vote) return notFound(res, "Vote not found");
  return success(res, {
    verified: true,
    voteId: vote.id,
    electionTitle: vote.election?.title,
    status: vote.status,
    castAt: vote.castAt,
    blockchainTx: vote.blockchainTxHash,
    blockNumber: vote.blockNumber,
    chainId: vote.chainId,
    confirmations: vote.confirmations,
    zkpVerified: vote.zkpVerified,
  });
});

r.get("/history", verifiedVoterOnly, async (req, res) => {
  const votes = await prisma.vote.findMany({
    where: { voterId: req.voter.id },
    include: { election: { select: { title: true, status: true } } },
    orderBy: { castAt: "desc" },
  });
  return success(
    res,
    votes.map((v) => ({
      voteId: v.id,
      electionId: v.electionId,
      electionTitle: v.election?.title,
      status: v.status,
      receiptHash: v.receiptHash,
      blockchainTxHash: v.blockchainTxHash,
      blockNumber: v.blockNumber,
      chainId: v.chainId,
      zkpVerified: v.zkpVerified,
      castAt: v.castAt,
    })),
  );
});

r.post("/:electionId/proof", verifiedVoterOnly, async (req, res) => {
  try {
    if (privacyMode() === "encrypted" || process.env.NODE_ENV === "production")
      return badRequest(
        res,
        "Server-side candidate proof generation is disabled in encrypted ballot mode",
      );
    const voter = req.voter;
    const { candidateId } = req.body;
    if (!candidateId) return badRequest(res, "candidateId required");
    if (!identityReady(voter))
      return forbidden(res, "Identity verification incomplete");
    const election = await prisma.election.findUnique({
      where: { id: req.params.electionId },
    });
    if (!election) return notFound(res, "Election not found");
    if (!electionOpen(election)) return badRequest(res, "Election not open");
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
    });
    if (
      !candidate ||
      candidate.electionId !== election.id ||
      !candidate.isActive
    )
      return badRequest(res, "Invalid candidate");
    const alreadyVoted = await prisma.vote.findFirst({
      where: { voterId: voter.id, electionId: election.id },
    });
    if (alreadyVoted) return conflict(res, "Already voted");
    const maxCandidates = await prisma.candidate.count({
      where: { electionId: election.id, isActive: true },
    });
    const proof = await generateVoteProof({
      voter,
      electionId: requireElectionChainId(election),
      candidateId: requireCandidateChainId(candidate),
      maxCandidates,
      eligibilityRoot: election.merkleRoot,
    });
    return success(res, proof, "Proof generated");
  } catch (e) {
    return badRequest(res, e.message);
  }
});

r.post("/cast", verifiedVoterOnly, votingRateLimit, async (req, res) => {
  try {
    if (privacyMode() === "encrypted" || process.env.NODE_ENV === "production")
      return badRequest(
        res,
        "Plaintext candidate vote casting is disabled; use encrypted ballot casting",
      );
    const {
      electionId,
      candidateId,
      salt,
      commitment,
      nullifier,
      eligibilityRoot,
      proofA,
      proofB,
      proofC,
    } = req.body;
    const voter = req.voter;
    await emergency.assertNotPaused();
    if (!electionId || !candidateId)
      return badRequest(res, "electionId and candidateId required");
    if (!identityReady(voter))
      return forbidden(res, "Identity verification incomplete");
    const fraud = await preVoteCheck(req, voter);
    if (fraud.blocked) return forbidden(res, fraud.reason);
    const election = await prisma.election.findUnique({
      where: { id: electionId },
    });
    if (!election) return notFound(res, "Election not found");
    if (!electionOpen(election)) return badRequest(res, "Election not open");
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
    });
    if (!candidate) return notFound(res, "Candidate not found");
    if (candidate.electionId !== electionId)
      return badRequest(res, "Candidate does not belong to this election");
    if (!candidate.isActive) return badRequest(res, "Candidate inactive");
    if (
      !(
        election.constituency === "ALL" ||
        election.constituency === voter.constituency
      )
    )
      return forbidden(res, "Wrong constituency");
    const alreadyVoted = await prisma.vote.findFirst({
      where: { voterId: voter.id, electionId },
    });
    if (alreadyVoted) return conflict(res, "Already voted");
    const proofSubmitted = Boolean(
      commitment && nullifier && eligibilityRoot && proofA && proofB && proofC,
    );
    if (
      (process.env.REQUIRE_ZKP === "true" ||
        process.env.NODE_ENV === "production") &&
      !proofSubmitted
    )
      return badRequest(res, "ZKP proof required");
    const pA = proofA || [0, 0],
      pB = proofB || [
        [0, 0],
        [0, 0],
      ],
      pC = proofC || [0, 0];
    if (proofSubmitted) {
      const maxCandidates = await prisma.candidate.count({
        where: { electionId, isActive: true },
      });
      const proofOk = await blockchainService.zkpVerifier.verifyVoteProof(
        pA,
        pB,
        pC,
        commitment,
        requireElectionChainId(election),
        maxCandidates,
        nullifier,
        eligibilityRoot,
      );
      if (!proofOk) return badRequest(res, "Invalid ZKP proof");
    }
    const voterWallet = voter.user?.walletAddress || voter.walletAddress;
    if (!voterWallet) return badRequest(res, "Voter wallet not linked");
    const result = await blockchainService.voting.castVote(
      voterWallet,
      requireElectionChainId(election),
      requireCandidateChainId(candidate),
      salt || ethers.hexlify(ethers.randomBytes(32)),
      commitment || 0,
      nullifier || 0,
      eligibilityRoot || 0,
      pA,
      pB,
      pC,
    );
    if (result.status !== "success")
      throw new Error("Blockchain transaction failed");
    const receiptHash = ethers.keccak256(ethers.randomBytes(32));
    const vote = await prisma.$transaction(async (tx) => {
      const created = await tx.vote.create({
        data: {
          electionId,
          voterId: voter.id,
          voteHash: result.voteHash,
          receiptHash,
          status: "CONFIRMED",
          blockchainTxHash: result.hash,
          blockNumber: result.blockNumber,
          logIndex: result.logIndex,
          chainId: result.chainId,
          confirmations: result.confirmations,
          constituency: voter.constituency,
          zkpVerified: !!result.zkpVerified,
          castAt: new Date(),
          confirmedAt: new Date(),
        },
      });
      await tx.voteReceipt.create({
        data: {
          voteId: created.id,
          electionId,
          publicReceiptHash: receiptHash,
          blockchainTxHash: result.hash,
          blockNumber: result.blockNumber,
          logIndex: result.logIndex,
          chainId: result.chainId,
          confirmations: result.confirmations,
        },
      });
      await tx.votePrivacySignal.create({
        data: votePrivacySignalData(req, electionId),
      });
      await tx.candidate.update({
        where: { id: candidateId },
        data: { voteCount: { increment: 1 } },
      });
      await tx.election.update({
        where: { id: electionId },
        data: { totalVotesCast: { increment: 1 } },
      });
      return created;
    });
    await require("../services/audit.service").voteLog(
      req,
      "VOTE_CAST",
      vote.id,
      "Vote recorded and confirmed on-chain",
      {
        electionId,
        txHash: result.hash,
        blockNumber: result.blockNumber,
        chainId: result.chainId,
      },
    );
    await recordParticipationAfterVote(req, voter, election);
    broadcastTallyUpdate(electionId);
    emitVoteCast(electionId, { totalVotes: election.totalVotesCast + 1 });
    return success(
      res,
      {
        voteId: vote.id,
        receiptHash,
        status: vote.status,
        blockchainTx: result.hash,
        blockNumber: result.blockNumber,
        chainId: result.chainId,
        confirmations: result.confirmations,
        zkpVerified: vote.zkpVerified,
        electionTitle: election.title,
      },
      "Vote cast successfully",
    );
  } catch (e) {
    if (e.code === "P2002") return conflict(res, "Already voted");
    return badRequest(res, e.message);
  }
});

r.post(
  "/cast-private",
  verifiedVoterOnly,
  votingRateLimit,
  async (req, res) => {
    try {
      const {
        electionId,
        encryptedPayload,
        ballotCommitment,
        nullifierHash,
        proofCommitment,
        eligibilityRoot,
        proofA,
        proofB,
        proofC,
      } = req.body;
      const voter = req.voter;
      await emergency.assertNotPaused();
      if (
        !electionId ||
        !encryptedPayload ||
        !ballotCommitment ||
        !nullifierHash
      )
        return badRequest(
          res,
          "electionId, encryptedPayload, ballotCommitment, and nullifierHash required",
        );
      const encryptionScheme = parseEncryptedBallotPayload(
        encryptedPayload,
        req.body.encryptionScheme,
      );
      if (!isHex32(ballotCommitment) || !isHex32(nullifierHash))
        return badRequest(res, "Invalid ballot commitment or nullifier format");
      const expectedCommitment = ethers.keccak256(
        ethers.toUtf8Bytes(encryptedPayload),
      );
      if (expectedCommitment !== ballotCommitment)
        return badRequest(res, "Ballot commitment does not match payload");
      if (!identityReady(voter))
        return forbidden(res, "Identity verification incomplete");
      const fraud = await preVoteCheck(req, voter);
      if (fraud.blocked) return forbidden(res, fraud.reason);
      const election = await prisma.election.findUnique({
        where: { id: electionId },
      });
      if (!election) return notFound(res, "Election not found");
      if (!electionOpen(election)) return badRequest(res, "Election not open");
      const chainElection = await electionState(election);
      const chainVoter = await voterState(voter, election);
      if (chainElection.configured && !chainElection.available)
        return badRequest(
          res,
          chainElection.reason || "Unable to verify on-chain election",
        );
      if (chainElection.available && !chainElection.isActive)
        return badRequest(res, "Election is not active on-chain");
      if (
        chainElection.available &&
        election.merkleRoot &&
        !chainElection.rootMatches
      )
        return badRequest(res, "Eligibility root does not match on-chain root");
      if (chainVoter.configured && !chainVoter.available)
        return badRequest(
          res,
          chainVoter.reason || "Unable to verify on-chain voter",
        );
      if (chainVoter.available && !chainVoter.registryVerified)
        return forbidden(res, "Voter wallet is not verified on-chain");
      if (chainVoter.available && chainVoter.hasVoted)
        return conflict(res, "Already voted on-chain");
      if (election.privacyMode !== "ENCRYPTED_BALLOT")
        return badRequest(
          res,
          "Election is not configured for encrypted ballot privacy",
        );
      if (
        !(
          election.constituency === "ALL" ||
          election.constituency === voter.constituency
        )
      )
        return forbidden(res, "Wrong constituency");
      if (!election.merkleRoot)
        return badRequest(res, "Election eligibility root is not set");
      if (String(eligibilityRoot) !== String(election.merkleRoot))
        return badRequest(res, "Eligibility root mismatch");
      const alreadyVoted = await prisma.vote.findFirst({
        where: { voterId: voter.id, electionId },
      });
      if (alreadyVoted) return conflict(res, "Already voted");
      await getVoterEligibilityPackage({ electionId, voterId: voter.id });
      const proofSubmitted = Boolean(
        proofCommitment && eligibilityRoot && proofA && proofB && proofC,
      );
      if (
        (process.env.REQUIRE_ZKP === "true" ||
          process.env.NODE_ENV === "production") &&
        !proofSubmitted
      )
        return badRequest(res, "ZKP proof required");
      if (proofSubmitted) {
        const maxCandidates = await prisma.candidate.count({
          where: { electionId, isActive: true },
        });
        const proofOk = await blockchainService.zkpVerifier.verifyVoteProof(
          proofA,
          proofB,
          proofC,
          proofCommitment,
          requireElectionChainId(election),
          maxCandidates + 1,
          nullifierHash,
          eligibilityRoot,
        );
        if (!proofOk) return badRequest(res, "Invalid ZKP proof");
      }
      if (
        process.env.NODE_ENV === "production" &&
        process.env.REQUIRE_ONCHAIN_RECEIPTS === "true" &&
        !process.env.CONTRACT_VOTING
      )
        throw new Error("Voting contract not configured for on-chain ballot acceptance");
      let chainResult = null;
      if (process.env.CONTRACT_VOTING || process.env.NODE_ENV === "production") {
        const voterWallet = voter.user?.walletAddress || voter.walletAddress;
        if (!voterWallet) return badRequest(res, "Voter wallet not linked");
        chainResult = await blockchainService.voting.castEncryptedBallot({
          voterAddress: voterWallet,
          electionId: requireElectionChainId(election),
          ballotCommitment,
          nullifierHash,
          eligibilityRoot,
          proofCommitment: proofCommitment || 0,
          pA: proofA || [0, 0],
          pB: proofB || [
            [0, 0],
            [0, 0],
          ],
          pC: proofC || [0, 0],
        });
        if (chainResult.status !== "success")
          throw new Error("Blockchain ballot acceptance failed");
      }
      const receiptHash = ethers.keccak256(ethers.randomBytes(32));
      const vote = await prisma.$transaction(async (tx) => {
        const created = await tx.vote.create({
          data: {
            electionId,
            voterId: voter.id,
            voteHash: chainResult?.voteHash,
            receiptHash,
            status: "CONFIRMED",
            constituency: voter.constituency,
            blockchainTxHash: chainResult?.hash,
            blockNumber: chainResult?.blockNumber,
            logIndex: chainResult?.logIndex,
            chainId: chainResult?.chainId,
            confirmations: chainResult?.confirmations,
            zkpVerified: chainResult ? !!chainResult.zkpVerified : proofSubmitted,
            castAt: new Date(),
            confirmedAt: new Date(),
          },
        });
        await tx.encryptedBallot.create({
          data: {
            electionId,
            ballotCommitment,
            nullifierHash: String(nullifierHash),
            encryptedPayload,
            encryptionScheme,
            proofCommitment: proofCommitment ? String(proofCommitment) : null,
            eligibilityRoot: String(eligibilityRoot),
            receiptHash,
            status: "CONFIRMED",
            blockchainTxHash: chainResult?.hash,
            blockNumber: chainResult?.blockNumber,
            logIndex: chainResult?.logIndex,
            chainId: chainResult?.chainId,
            confirmations: chainResult?.confirmations || 0,
          },
        });
        await tx.voteReceipt.create({
          data: {
            voteId: created.id,
            electionId,
            publicReceiptHash: receiptHash,
            blockchainTxHash: chainResult?.hash,
            blockNumber: chainResult?.blockNumber,
            logIndex: chainResult?.logIndex,
            chainId: chainResult?.chainId,
            confirmations: chainResult?.confirmations || 0,
          },
        });
        await tx.votePrivacySignal.create({
          data: votePrivacySignalData(req, electionId),
        });
        await tx.election.update({
          where: { id: electionId },
          data: { totalVotesCast: { increment: 1 } },
        });
        return created;
      });
      await require("../services/audit.service").voteLog(
        req,
        "PRIVATE_VOTE_CAST",
        vote.id,
        "Encrypted ballot recorded",
        {
          electionId,
          receiptHash,
          zkpVerified: vote.zkpVerified,
          txHash: chainResult?.hash,
          blockNumber: chainResult?.blockNumber,
          chainId: chainResult?.chainId,
        },
      );
      await recordParticipationAfterVote(req, voter, election);
      emitVoteCast(electionId, { privateReceipt: true });
      broadcastTallyUpdate(electionId);
      return success(
        res,
        {
          voteId: vote.id,
          receiptHash,
          status: vote.status,
          zkpVerified: vote.zkpVerified,
          blockchainTx: chainResult?.hash,
          blockNumber: chainResult?.blockNumber,
          chainId: chainResult?.chainId,
          confirmations: chainResult?.confirmations,
          electionTitle: election.title,
        },
        "Encrypted ballot cast successfully",
      );
    } catch (e) {
      if (e.code === "P2002")
        return conflict(res, "Already voted or duplicate ballot nullifier");
      return badRequest(res, e.message);
    }
  },
);
module.exports = r;
