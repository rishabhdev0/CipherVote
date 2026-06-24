const r = require("express").Router(),
  prisma = require("../config/database"),
  {
    authenticate,
    verifiedVoterOnly,
  } = require("../middleware/auth.middleware"),
  { success, badRequest, notFound, forbidden } = require("../utils/response"),
  audit = require("../services/audit.service");
r.use(authenticate, verifiedVoterOnly);
r.get("/mine", async (req, res) => {
  const [given, received] = await Promise.all([
    prisma.delegation.findMany({
      where: { delegatorUserId: req.user.id },
      include: { election: true, delegateUser: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.delegation.findMany({
      where: { delegateUserId: req.user.id },
      include: { election: true, delegatorUser: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return success(res, { given, received });
});
r.post("/", async (req, res) => {
  const { electionId, delegateWalletAddress, reason, expiresAt } = req.body;
  if (!electionId || !delegateWalletAddress)
    return badRequest(res, "electionId and delegateWalletAddress required");
  const election = await prisma.election.findUnique({
    where: { id: electionId },
  });
  if (!election) return notFound(res, "Election not found");
  if (election.status !== "ACTIVE" && election.status !== "DRAFT")
    return badRequest(res, "Election is not delegatable");
  const delegate = await prisma.user.findUnique({
    where: { walletAddress: delegateWalletAddress },
  });
  if (!delegate) return notFound(res, "Delegate user not found");
  if (delegate.id === req.user.id)
    return badRequest(res, "Cannot delegate to self");
  const delegateVoter = await prisma.voter.findFirst({
    where: { userId: delegate.id, status: "VERIFIED", isBlacklisted: false },
  });
  if (!delegateVoter)
    return forbidden(res, "Delegate must be a verified voter");
  const d = await prisma.delegation.upsert({
    where: {
      electionId_delegatorUserId: { electionId, delegatorUserId: req.user.id },
    },
    update: {
      delegateUserId: delegate.id,
      delegateVoterId: delegateVoter.id,
      status: "ACTIVE",
      reason,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      revokedAt: null,
    },
    create: {
      electionId,
      delegatorUserId: req.user.id,
      delegateUserId: delegate.id,
      delegatorVoterId: req.voter.id,
      delegateVoterId: delegateVoter.id,
      reason,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    },
  });
  await audit.log({
    userId: req.user.id,
    action: "DELEGATION_CREATED",
    resource: "DELEGATION",
    resourceId: d.id,
    description: "Vote delegation created",
    ipAddress: req.ip,
    metadata: { electionId, delegateUserId: delegate.id },
  });
  return success(res, d, "Created", 201);
});
r.put("/:id/revoke", async (req, res) => {
  const d = await prisma.delegation.findUnique({
    where: { id: req.params.id },
  });
  if (!d) return notFound(res, "Delegation not found");
  if (d.delegatorUserId !== req.user.id)
    return forbidden(res, "Only delegator can revoke");
  await prisma.delegation.update({
    where: { id: d.id },
    data: { status: "REVOKED", revokedAt: new Date() },
  });
  await audit.log({
    userId: req.user.id,
    action: "DELEGATION_REVOKED",
    resource: "DELEGATION",
    resourceId: d.id,
    description: "Vote delegation revoked",
    ipAddress: req.ip,
  });
  return success(res, {}, "Revoked");
});
r.post("/vote", (req, res) =>
  badRequest(
    res,
    "Delegated vote casting requires explicit ballot privacy design and is disabled",
  ),
);
module.exports = r;
