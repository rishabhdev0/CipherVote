const crypto = require("crypto");
const r = require("express").Router(),
  prisma = require("../config/database"),
  multer = require("multer"),
  {
    authenticate,
    verifiedVoterOnly,
    electionAdminOnly,
    voterRegistryRead,
  } = require("../middleware/auth.middleware"),
  { success, badRequest, notFound, forbidden, conflict } = require("../utils/response"),
  audit = require("../services/audit.service"),
  blockchain = require("../services/blockchain.service");
const { sendNotification } = require("../services/notification.service");
const {
  moveToPrivateStorage,
  encryptFileAtRest,
  malwareScanPlaceholder,
} = require("../services/upload.security.service");
const {
  submitIdentityReview,
  applyIdentityDecision,
  fileIdentityAppeal,
  reviewIdentityAppeal,
  applyProviderWebhook,
} = require("../services/identity.verification.service");
const {
  issueCredentialForVoter,
} = require("../services/nft.credential.service");
const {
  validateVoterRegistration,
} = require("../middleware/input-validation.middleware");
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 5 * 1024 * 1024 },
});
const requireChain = () =>
  process.env.NODE_ENV === "production" ||
  process.env.REQUIRE_CHAIN_LIFECYCLE === "true";
const identityHashFor = (u, v) =>
  "0x" +
  crypto
    .createHash("sha256")
    .update(`${u.id}:${u.walletAddress}:${voterSafe(v)}`)
    .digest("hex");
const voterSafe = (v) =>
  `${v.voterIdNumber || ""}:${v.constituency}:${v.dateOfBirth?.toISOString?.() || v.dateOfBirth}`;
r.post("/identity/provider-webhook", async (req, res) => {
  try {
    const decision = await applyProviderWebhook({
      rawBody: req.rawBody || JSON.stringify(req.body || {}),
      signature: req.headers["x-identity-signature"],
      payload: req.body,
    });
    await audit.log({
      action: "IDENTITY_PROVIDER_DECISION",
      resource: "VOTER",
      resourceId: decision.voterId,
      description: "Identity provider decision applied",
      severity: "CRITICAL",
      ipAddress: req.ip,
      metadata: {
        reviewId: decision.id,
        status: decision.status,
        providerReference: decision.providerReference,
      },
    });
    return success(res, { received: true }, "Webhook accepted");
  } catch (e) {
    return badRequest(res, e.message);
  }
});
r.use(authenticate);
r.post(
  "/register",
  upload.fields([
    { name: "faceImage", maxCount: 1 },
    { name: "idImage", maxCount: 1 },
  ]),
  validateVoterRegistration,
  async (req, res) => {
    try {
      if (req.user.role !== "VOTER")
        return forbidden(
          res,
          "Voter registration requires a voter account. Sign out and create a separate voter account.",
        );
      if (!req.user.walletAddress)
        return badRequest(
          res,
          "Registered wallet required before voter registration",
        );
      const ex = await prisma.voter.findFirst({
        where: { userId: req.user.id },
      });
      if (ex && ex.status !== "REJECTED")
        return badRequest(res, "Already registered");
      const {
        firstName,
        lastName,
        dateOfBirth,
        gender,
        constituency,
        voterIdNumber,
      } = req.body;
      const duplicateVoter = await prisma.voter.findFirst({
        where: {
          OR: [
            { voterIdNumber },
            { walletAddress: req.user.walletAddress },
          ],
          NOT: ex ? { id: ex.id } : undefined,
        },
        select: {
          id: true,
          voterIdNumber: true,
          walletAddress: true,
        },
      });
      if (duplicateVoter) {
        const duplicateField =
          duplicateVoter.voterIdNumber === voterIdNumber
            ? "voter ID number"
            : "wallet address";
        return conflict(res, `This ${duplicateField} is already registered`);
      }
      const dob = new Date(dateOfBirth);
      const voter = ex
        ? await prisma.voter.update({
            where: { id: ex.id },
            data: {
              firstName,
              lastName,
              dateOfBirth: dob,
              gender,
              constituency,
              voterIdNumber,
              walletAddress: req.user.walletAddress,
              status: "PENDING",
              rejectionReason: null,
              faceVerified: false,
              idVerified: false,
              livenessVerified: false,
              faceMatchScore: null,
              riskScore: 0,
              isFlagged: false,
              flagReason: null,
              registeredAt: new Date(),
              verifiedAt: null,
            },
          })
        : await prisma.voter.create({
            data: {
              userId: req.user.id,
              firstName,
              lastName,
              dateOfBirth: dob,
              gender,
              constituency,
              voterIdNumber,
              walletAddress: req.user.walletAddress,
              status: "PENDING",
            },
          });
      const evidence = { documents: [] };
      for (const [field, type] of [
        ["faceImage", "FACE_IMAGE"],
        ["idImage", "ID_DOCUMENT"],
      ]) {
        for (const file of req.files?.[field] || []) {
          const stored = moveToPrivateStorage(file, `voters/${voter.id}`);
          malwareScanPlaceholder(stored.storagePath);
          const enc = encryptFileAtRest(stored.storagePath);
          const doc = await prisma.uploadedDocument.create({
            data: {
              userId: req.user.id,
              voterId: voter.id,
              type,
              storagePath: stored.storagePath,
              originalName: file.originalname,
              mimeType: stored.mimeType,
              sizeBytes: stored.sizeBytes,
              sha256: stored.sha256,
              encrypted: enc.encrypted,
              encryptionKeyRef: enc.encryptionKeyRef,
            },
          });
          evidence.documents.push({
            id: doc.id,
            type,
            sha256: stored.sha256,
            mimeType: stored.mimeType,
            sizeBytes: stored.sizeBytes,
          });
        }
      }
      const review = await submitIdentityReview({
        voterId: voter.id,
        evidence,
      });
      await sendNotification({
        userId: req.user.id,
        type: ex ? "VOTER_REGISTRATION_RESUBMITTED" : "VOTER_REGISTRATION_SUBMITTED",
        title: ex ? "Registration resubmitted" : "Registration submitted",
        message:
          "Your voter registration has been sent to the Election Commission for review.",
        metadata: { voterId: voter.id, identityReviewId: review.id },
      });
      let chain = null;
      if (process.env.CONTRACT_VOTER_REGISTRY || requireChain()) {
        if (!req.user.walletAddress)
          return badRequest(
            res,
            "Wallet required for chain voter registration",
          );
        chain = await blockchain.voterRegistry.registerVoter({
          walletAddress: req.user.walletAddress,
          identityHash: identityHashFor(req.user, voter),
          constituency,
          age: voter.age || 0,
        });
      }
      await audit.log({
        userId: req.user.id,
        action: "VOTER_REGISTRATION_SUBMITTED",
        resource: "VOTER",
        resourceId: voter.id,
        description: "Voter registration submitted for identity review",
        ipAddress: req.ip,
        metadata: {
          chain,
          identityReviewId: review.id,
          identityReviewStatus: review.status,
        },
      });
      return success(
        res,
        {
          voter,
          identityReview: {
            id: review.id,
            status: review.status,
            provider: review.provider,
          },
        },
        "Submitted",
        201,
      );
    } catch (e) {
      if (e.code === "P2002") {
        const field = Array.isArray(e.meta?.target)
          ? e.meta.target.join(", ")
          : "voter ID or wallet";
        return conflict(res, `Duplicate voter registration field: ${field}`);
      }
      return badRequest(res, e.message);
    }
  },
);
r.get("/me", async (req, res) => {
  const voter = await prisma.voter.findFirst({
    where: { userId: req.user.id },
  });
  if (!voter) return notFound(res, "Not registered");
  return success(res, voter);
});
r.post("/me/identity-appeals", async (req, res) => {
  try {
    const voter = await prisma.voter.findFirst({
      where: { userId: req.user.id },
    });
    if (!voter) return notFound(res, "Not registered");
    const appeal = await fileIdentityAppeal({
      voterId: voter.id,
      filedById: req.user.id,
      reason: req.body.reason,
      evidence: req.body.evidence,
    });
    await audit.log({
      userId: req.user.id,
      action: "IDENTITY_APPEAL_FILED",
      resource: "VOTER",
      resourceId: voter.id,
      description: "Identity appeal filed",
      ipAddress: req.ip,
      metadata: { appealId: appeal.id },
    });
    return success(res, appeal, "Appeal filed", 201);
  } catch (e) {
    return badRequest(res, e.message);
  }
});
r.get("/me/identity-appeals", async (req, res) => {
  const voter = await prisma.voter.findFirst({
    where: { userId: req.user.id },
  });
  if (!voter) return notFound(res, "Not registered");
  return success(res, {
    appeals: await prisma.identityAppeal.findMany({
      where: { voterId: voter.id },
      orderBy: { createdAt: "desc" },
    }),
  });
});
r.get("/stats", voterRegistryRead, async (req, res) => {
  const data = await prisma.voter.groupBy({
    by: ["status"],
    _count: { id: true },
  });
  const total = await prisma.voter.count();
  const flagged = await prisma.voter.count({ where: { isFlagged: true } });
  return success(res, {
    total,
    flaggedVoters: flagged,
    byStatus: data.reduce((a, d) => ({ ...a, [d.status]: d._count.id }), {}),
  });
});
r.get("/eligibility/:electionId", verifiedVoterOnly, async (req, res) => {
  const voter = req.voter;
  const election = await prisma.election.findUnique({
    where: { id: req.params.electionId },
  });
  if (!election) return notFound(res, "Election not found");
  const voted = await prisma.vote.findFirst({
    where: { voterId: voter.id, electionId: election.id },
  });
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
  const now = new Date();
  const reasons = [];
  if (voter.status !== "VERIFIED" || voter.isBlacklisted)
    reasons.push("Verified voter status required");
  if (!voter.faceVerified || !voter.idVerified || !voter.livenessVerified)
    reasons.push("Identity checks incomplete");
  if (voted) reasons.push("Already voted");
  if (
    election.status !== "ACTIVE" ||
    election.startTime > now ||
    election.endTime < now
  )
    reasons.push("Election not open");
  if (
    !(
      election.constituency === "ALL" ||
      election.constituency === voter.constituency
    )
  )
    reasons.push("Wrong constituency");
  if (!selected || selected.status !== "SELECTED")
    reasons.push("Not selected on Election Commission voter roll");
  if (!commitment || commitment.revokedAt)
    reasons.push("Eligibility proof package not issued");
  return success(res, {
    eligible: reasons.length === 0,
    hasVoted: !!voted,
    voterStatus: voter.status,
    rollStatus: selected?.status || "NOT_SELECTED",
    hasEligibilityCommitment: !!commitment && !commitment.revokedAt,
    reasons,
  });
});
r.get("/", voterRegistryRead, async (req, res) => {
  const { page = 1, limit = 12, status, flagged, search } = req.query;
  const where = {};
  if (status) where.status = status;
  if (flagged === "true") where.isFlagged = true;
  if (search)
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { voterIdNumber: { contains: search, mode: "insensitive" } },
      { walletAddress: { contains: search, mode: "insensitive" } },
    ];
  const [data, total] = await Promise.all([
    prisma.voter.findMany({
      where,
      skip: (+page - 1) * +limit,
      take: +limit,
      orderBy: { registeredAt: "desc" },
    }),
    prisma.voter.count({ where }),
  ]);
  return success(res, {
    data,
    total,
    pages: Math.ceil(total / +limit),
    page: +page,
  });
});
r.get("/:id", voterRegistryRead, async (req, res) => {
  const voter = await prisma.voter.findUnique({ where: { id: req.params.id } });
  if (!voter) return notFound(res);
  return success(res, voter);
});
r.get("/:id/review-detail", voterRegistryRead, async (req, res) => {
  const voter = await prisma.voter.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      userId: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      age: true,
      gender: true,
      constituency: true,
      voterIdNumber: true,
      walletAddress: true,
      status: true,
      faceVerified: true,
      idVerified: true,
      livenessVerified: true,
      faceMatchScore: true,
      riskScore: true,
      isFlagged: true,
      flagReason: true,
      isBlacklisted: true,
      rejectionReason: true,
      registeredAt: true,
      verifiedAt: true,
      uploadedDocuments: {
        select: {
          id: true,
          type: true,
          originalName: true,
          mimeType: true,
          sizeBytes: true,
          sha256: true,
          encrypted: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
      identityReviews: {
        select: {
          id: true,
          provider: true,
          status: true,
          faceVerified: true,
          idVerified: true,
          livenessVerified: true,
          faceMatchScore: true,
          riskScore: true,
          decisionReason: true,
          providerReference: true,
          evidence: true,
          submittedAt: true,
          reviewedAt: true,
        },
        orderBy: { submittedAt: "desc" },
      },
    },
  });
  if (!voter) return notFound(res);
  return success(res, { voter });
});
r.get("/:id/identity-reviews", voterRegistryRead, async (req, res) => {
  const reviews = await prisma.identityVerificationReview.findMany({
    where: { voterId: req.params.id },
    orderBy: { submittedAt: "desc" },
  });
  return success(res, { reviews });
});
r.get("/:id/identity-appeals", voterRegistryRead, async (req, res) => {
  const appeals = await prisma.identityAppeal.findMany({
    where: { voterId: req.params.id },
    orderBy: { createdAt: "desc" },
  });
  return success(res, { appeals });
});
r.put(
  "/identity-appeals/:appealId/review",
  electionAdminOnly,
  async (req, res) => {
    try {
      const appeal = await reviewIdentityAppeal({
        appealId: req.params.appealId,
        reviewerId: req.user.id,
        status: req.body.status,
        decisionReason: req.body.decisionReason,
      });
      await audit.log({
        userId: req.user.id,
        action: "IDENTITY_APPEAL_REVIEWED",
        resource: "VOTER",
        resourceId: appeal.voterId,
        description: req.body.decisionReason,
        severity: "HIGH",
        ipAddress: req.ip,
        metadata: { appealId: appeal.id, status: appeal.status },
      });
      return success(res, appeal, "Appeal reviewed");
    } catch (e) {
      return badRequest(res, e.message);
    }
  },
);
r.put("/:id/verify", electionAdminOnly, async (req, res) => {
  try {
    const existing = await prisma.voter.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) return notFound(res);
    let review = await prisma.identityVerificationReview.findFirst({
      where: { voterId: existing.id },
      orderBy: { submittedAt: "desc" },
    });
    if (!review)
      review = await submitIdentityReview({
        voterId: existing.id,
        evidence: {
          source: "MANUAL_EC_APPROVAL",
          reason:
            req.body.reason ||
            "Election Commission manual identity approval without prior provider review",
        },
      });
    const decision = await applyIdentityDecision({
      reviewId: review.id,
      reviewerId: req.user.id,
      status: "APPROVED",
      reason: req.body.reason || "Approved by election commission",
      faceVerified: req.body.faceVerified,
      idVerified: req.body.idVerified,
      livenessVerified: req.body.livenessVerified,
      faceMatchScore: req.body.faceMatchScore,
      riskScore: req.body.riskScore,
    });
    let chain = null;
    if (process.env.CONTRACT_VOTER_REGISTRY || requireChain()) {
      if (!existing.walletAddress) return badRequest(res, "Voter wallet missing");
      try {
        chain = await blockchain.voterRegistry.verifyVoter(existing.walletAddress);
        await prisma.voter.update({
          where: { id: req.params.id },
          data: { blockchainTxHash: chain?.hash || existing.blockchainTxHash },
        });
      } catch (e) {
        const message = e.shortMessage || e.reason || e.message || "";
        const alreadyVerified =
          /Not pending/i.test(message) &&
          (await blockchain.voterRegistry.isVoterVerified(existing.walletAddress));
        if (alreadyVerified) {
          chain = {
            alreadyVerified: true,
            source: "voter-registry",
            walletAddress: existing.walletAddress,
          };
        } else if (requireChain() || process.env.CONTRACT_VOTER_REGISTRY) {
          return badRequest(res, message || "On-chain voter verification failed");
        } else {
          chain = { skipped: true, error: message };
        }
      }
    }
    const refreshedVoter = await prisma.voter.findUnique({
      where: { id: req.params.id },
      include: { user: true },
    });
    const credential = await issueCredentialForVoter(refreshedVoter);
    await audit.log({
      userId: req.user.id,
      action: "IDENTITY_REVIEW_APPROVED",
      resource: "VOTER",
      resourceId: req.params.id,
      description: "Identity review approved and voter verified",
      severity: "CRITICAL",
      ipAddress: req.ip,
      metadata: {
        chain,
        credential: {
          tokenId: credential.voter.nftTokenId,
          source: credential.chain?.skipped ? "development-local" : "soulbound-nft",
        },
        identityReviewId: decision.id,
      },
    });
    await sendNotification({
      userId: existing.userId,
      type: "VOTER_REGISTRATION_APPROVED",
      title: "Voter registration approved",
      message:
        "Your voter registration has been approved by the Election Commission. You can vote when an election is active and you are selected in the voter roll.",
      metadata: { voterId: existing.id, identityReviewId: decision.id },
    });
    return success(
      res,
      { identityReview: decision, credential: credential.voter, chain },
      chain?.alreadyVerified ? "Already verified on-chain" : "Verified",
    );
  } catch (e) {
    return badRequest(res, e.message || "Voter verification failed");
  }
});
r.put("/:id/reject", electionAdminOnly, async (req, res) => {
  const existing = await prisma.voter.findUnique({
    where: { id: req.params.id },
  });
  if (!existing) return notFound(res);
  let review = await prisma.identityVerificationReview.findFirst({
    where: { voterId: existing.id },
    orderBy: { submittedAt: "desc" },
  });
  if (!review)
    review = await submitIdentityReview({
      voterId: existing.id,
      evidence: {
        reason: "Administrative rejection without prior provider review",
      },
    });
  const decision = await applyIdentityDecision({
    reviewId: review.id,
    reviewerId: req.user.id,
    status: "REJECTED",
    reason: req.body.reason || "Rejected by election commission",
  });
  await audit.log({
    userId: req.user.id,
    action: "IDENTITY_REVIEW_REJECTED",
    resource: "VOTER",
    resourceId: req.params.id,
    description: req.body.reason,
    ipAddress: req.ip,
    metadata: { identityReviewId: decision.id },
  });
  await sendNotification({
    userId: existing.userId,
    type: "VOTER_REGISTRATION_REJECTED",
    title: "Voter registration rejected",
    message: `${req.body.reason || "Your registration was rejected by the Election Commission."} Please review your details and submit the voter registration form again.`,
    metadata: { voterId: existing.id, identityReviewId: decision.id },
  });
  return success(res, { identityReview: decision }, "Rejected");
});
r.put("/:id/blacklist", electionAdminOnly, async (req, res) => {
  const existing = await prisma.voter.findUnique({
    where: { id: req.params.id },
  });
  if (!existing) return notFound(res);
  let chain = null;
  if (process.env.CONTRACT_VOTER_REGISTRY || requireChain()) {
    if (!existing.walletAddress) return badRequest(res, "Voter wallet missing");
    try {
      chain = await blockchain.voterRegistry.blacklistVoter(
        existing.walletAddress,
        req.body.reason || "",
      );
    } catch (e) {
      if (requireChain() || process.env.CONTRACT_VOTER_REGISTRY) throw e;
      chain = { skipped: true, error: e.message };
    }
  }
  await prisma.voter.update({
    where: { id: req.params.id },
    data: {
      status: "BLACKLISTED",
      isBlacklisted: true,
      blacklistReason: req.body.reason,
      blacklistedAt: new Date(),
      blockchainTxHash: chain?.hash || existing.blockchainTxHash,
    },
  });
  await audit.log({
    userId: req.user.id,
    action: "VOTER_BLACKLISTED",
    resource: "VOTER",
    resourceId: req.params.id,
    description: req.body.reason,
    severity: "CRITICAL",
    ipAddress: req.ip,
    metadata: { chain },
  });
  await sendNotification({
    userId: existing.userId,
    type: "VOTER_BLACKLISTED",
    title: "Voter account blacklisted",
    message:
      req.body.reason ||
      "Your voter account has been blacklisted by the Election Commission.",
    metadata: { voterId: existing.id },
  });
  return success(res, {}, "Blacklisted");
});
module.exports = r;
