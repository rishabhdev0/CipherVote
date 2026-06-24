const prisma = require("../config/database");

function delayUntil() {
  const minutes = Number(process.env.GOVERNANCE_TIMELOCK_MINUTES || 60);
  return new Date(Date.now() + minutes * 60000);
}

async function propose({
  userId,
  actionType,
  resource,
  resourceId,
  payload,
  requiredApprovals,
}) {
  return prisma.governanceAction.create({
    data: {
      actionType,
      resource,
      resourceId,
      payload,
      proposedById: userId,
      requiredApprovals:
        requiredApprovals ||
        Number(process.env.GOVERNANCE_REQUIRED_APPROVALS || 2),
      approvals: [userId],
      notBefore: delayUntil(),
    },
  });
}

async function approve({ actionId, userId }) {
  const action = await prisma.governanceAction.findUnique({
    where: { id: actionId },
  });
  if (!action) throw new Error("Governance action not found");
  if (action.status !== "PENDING")
    throw new Error("Governance action is not pending");
  const approvals = Array.from(
    new Set([
      ...(Array.isArray(action.approvals) ? action.approvals : []),
      userId,
    ]),
  );
  const status =
    approvals.length >= action.requiredApprovals ? "APPROVED" : "PENDING";
  return prisma.governanceAction.update({
    where: { id: actionId },
    data: { approvals, status },
  });
}

async function markExecuted({ actionId }) {
  const action = await prisma.governanceAction.findUnique({
    where: { id: actionId },
  });
  if (!action) throw new Error("Governance action not found");
  if (action.status !== "APPROVED")
    throw new Error("Governance action is not approved");
  if (action.notBefore && action.notBefore > new Date())
    throw new Error("Governance timelock has not expired");
  return prisma.governanceAction.update({
    where: { id: actionId },
    data: { status: "EXECUTED", executedAt: new Date() },
  });
}

async function requireApprovedAction({
  actionId,
  actionType,
  resource,
  resourceId,
}) {
  if (
    process.env.REQUIRE_GOVERNANCE_FOR_ELECTIONS !== "true" &&
    process.env.NODE_ENV !== "production"
  )
    return null;
  if (!actionId) throw new Error("Approved governance action required");
  const action = await prisma.governanceAction.findUnique({
    where: { id: actionId },
  });
  if (!action) throw new Error("Governance action not found");
  if (
    action.actionType !== actionType ||
    action.resource !== resource ||
    String(action.resourceId || "") !== String(resourceId || "")
  )
    throw new Error("Governance action does not match requested operation");
  if (action.status !== "APPROVED")
    throw new Error("Governance action is not approved");
  if (action.notBefore && action.notBefore > new Date())
    throw new Error("Governance timelock has not expired");
  return action;
}

module.exports = { propose, approve, markExecuted, requireApprovedAction };
