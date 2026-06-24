const crypto = require("crypto");
const prisma = require("../config/database");

function providerName() {
  return process.env.IDENTITY_PROVIDER || "MANUAL";
}

function hashEvidence(value) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(value || {}))
    .digest("hex");
}

async function submitIdentityReview({ voterId, evidence = {} }) {
  const provider = providerName();
  const automatic =
    provider === "DEV_AUTO_APPROVE" && process.env.NODE_ENV !== "production";
  const status = automatic ? "APPROVED" : "PENDING";
  const review = await prisma.identityVerificationReview.create({
    data: {
      voterId,
      provider,
      status,
      faceVerified: automatic,
      idVerified: automatic,
      livenessVerified: automatic,
      faceMatchScore: automatic ? 100 : null,
      riskScore: automatic ? 0 : 25,
      providerReference: `${provider}-${hashEvidence({ voterId, evidence, at: Date.now() }).slice(0, 24)}`,
      evidence,
    },
  });
  if (automatic)
    await applyIdentityDecision({
      reviewId: review.id,
      reviewerId: null,
      status: "APPROVED",
      reason: "Development auto-approval",
    });
  return review;
}

async function applyIdentityDecision({
  reviewId,
  reviewerId,
  status,
  reason,
  faceVerified,
  idVerified,
  livenessVerified,
  faceMatchScore,
  riskScore,
}) {
  if (
    !["APPROVED", "REJECTED", "NEEDS_MANUAL_REVIEW", "IN_REVIEW"].includes(
      status,
    )
  )
    throw new Error("Invalid identity review status");
  const review = await prisma.identityVerificationReview.findUnique({
    where: { id: reviewId },
  });
  if (!review) throw new Error("Identity review not found");
  const approved = status === "APPROVED";
  const update = {
    status,
    reviewerId,
    decisionReason: reason,
    reviewedAt: ["APPROVED", "REJECTED", "NEEDS_MANUAL_REVIEW"].includes(status)
      ? new Date()
      : null,
    faceVerified: approved ? faceVerified !== false : Boolean(faceVerified),
    idVerified: approved ? idVerified !== false : Boolean(idVerified),
    livenessVerified: approved
      ? livenessVerified !== false
      : Boolean(livenessVerified),
    faceMatchScore:
      faceMatchScore === undefined
        ? review.faceMatchScore
        : Number(faceMatchScore),
    riskScore: riskScore === undefined ? review.riskScore : Number(riskScore),
  };
  return prisma.$transaction(async (tx) => {
    const updated = await tx.identityVerificationReview.update({
      where: { id: reviewId },
      data: update,
    });
    if (status === "APPROVED") {
      await tx.voter.update({
        where: { id: review.voterId },
        data: {
          faceVerified: updated.faceVerified,
          idVerified: updated.idVerified,
          livenessVerified: updated.livenessVerified,
          faceMatchScore: updated.faceMatchScore,
          riskScore: updated.riskScore,
          status: "VERIFIED",
          verifiedAt: new Date(),
        },
      });
    } else if (status === "REJECTED") {
      await tx.voter.update({
        where: { id: review.voterId },
        data: {
          status: "REJECTED",
          rejectionReason: reason || "Identity verification rejected",
          faceVerified: false,
          idVerified: false,
          livenessVerified: false,
          riskScore: updated.riskScore,
        },
      });
    }
    return updated;
  });
}

async function fileIdentityAppeal({ voterId, filedById, reason, evidence }) {
  const voter = await prisma.voter.findUnique({ where: { id: voterId } });
  if (!voter) throw new Error("Voter not found");
  if (!reason || reason.trim().length < 10)
    throw new Error("Appeal reason must be at least 10 characters");
  const open = await prisma.identityAppeal.findFirst({
    where: { voterId, status: { in: ["FILED", "UNDER_REVIEW"] } },
  });
  if (open) throw new Error("An identity appeal is already open");
  return prisma.identityAppeal.create({
    data: { voterId, filedById, reason, evidence },
  });
}

async function reviewIdentityAppeal({
  appealId,
  reviewerId,
  status,
  decisionReason,
}) {
  if (!["UNDER_REVIEW", "APPROVED", "REJECTED"].includes(status))
    throw new Error("Invalid appeal status");
  const appeal = await prisma.identityAppeal.findUnique({
    where: { id: appealId },
  });
  if (!appeal) throw new Error("Identity appeal not found");
  return prisma.$transaction(async (tx) => {
    const updated = await tx.identityAppeal.update({
      where: { id: appealId },
      data: {
        status,
        reviewerId,
        decisionReason,
        reviewedAt: status === "UNDER_REVIEW" ? null : new Date(),
      },
    });
    if (status === "APPROVED") {
      await tx.identityVerificationReview.create({
        data: {
          voterId: appeal.voterId,
          provider: "MANUAL_APPEAL",
          status: "NEEDS_MANUAL_REVIEW",
          reviewerId,
          evidence: { appealId: appeal.id, reason: appeal.reason },
          decisionReason: "Appeal approved for renewed manual review",
        },
      });
      await tx.voter.update({
        where: { id: appeal.voterId },
        data: { status: "PENDING", rejectionReason: null },
      });
    }
    return updated;
  });
}

function verifyProviderSignature(rawBody, signature) {
  const secret = process.env.IDENTITY_WEBHOOK_SECRET;
  if (!secret) throw new Error("IDENTITY_WEBHOOK_SECRET not configured");
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  const actual = String(signature || "").replace(/^sha256=/, "");
  if (
    actual.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual))
  )
    throw new Error("Invalid identity provider signature");
}

async function applyProviderWebhook({ rawBody, signature, payload }) {
  verifyProviderSignature(rawBody, signature);
  const reference =
    payload.providerReference || payload.reference || payload.id;
  if (!reference) throw new Error("Provider reference required");
  const review = await prisma.identityVerificationReview.findFirst({
    where: { providerReference: reference },
  });
  if (!review)
    throw new Error("Identity review not found for provider reference");
  const approved =
    payload.status === "APPROVED" || payload.decision === "approved";
  const rejected =
    payload.status === "REJECTED" || payload.decision === "rejected";
  const status = approved
    ? "APPROVED"
    : rejected
      ? "REJECTED"
      : "NEEDS_MANUAL_REVIEW";
  return applyIdentityDecision({
    reviewId: review.id,
    reviewerId: null,
    status,
    reason: payload.reason || `Provider decision: ${status}`,
    faceVerified: payload.faceVerified,
    idVerified: payload.idVerified,
    livenessVerified: payload.livenessVerified,
    faceMatchScore: payload.faceMatchScore,
    riskScore: payload.riskScore,
  });
}

module.exports = {
  submitIdentityReview,
  applyIdentityDecision,
  providerName,
  fileIdentityAppeal,
  reviewIdentityAppeal,
  applyProviderWebhook,
};
