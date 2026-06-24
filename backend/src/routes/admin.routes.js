const r = require("express").Router(),
  prisma = require("../config/database"),
  {
    authenticate,
    auditReadOnly,
    roleAdminOnly,
    chainOpsOnly,
    electionAdminOnly,
  } = require("../middleware/auth.middleware"),
  { success, badRequest } = require("../utils/response"),
  {
    syncVotingEvents,
    getSyncState,
  } = require("../services/blockchain.sync.service"),
  audit = require("../services/audit.service"),
  governance = require("../services/governance.service");
r.use(authenticate);
r.get("/notifications", async (req, res) => {
  const data = await prisma.notification.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return success(res, {
    notifications: data,
    unread: data.filter((n) => !n.isRead).length,
  });
});
r.put("/notifications/read-all", async (req, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user.id },
    data: { isRead: true },
  });
  return success(res, {});
});
r.put("/notifications/:id/read", async (req, res) => {
  await prisma.notification.update({
    where: { id: req.params.id },
    data: { isRead: true },
  });
  return success(res, {});
});
r.get("/audit", auditReadOnly, async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      skip: (+page - 1) * +limit,
      take: +limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.auditLog.count(),
  ]);
  return success(res, { logs, total });
});
r.get("/audit/root", auditReadOnly, async (req, res) =>
  success(res, await audit.computeAuditRoot()),
);
r.post("/audit/anchors", chainOpsOnly, async (req, res) => {
  try {
    const anchor = await audit.createAuditAnchor({
      anchoredTxHash: req.body.anchoredTxHash,
      chainId: req.body.chainId,
    });
    await audit.log({
      userId: req.user.id,
      action: "AUDIT_ROOT_ANCHORED",
      resource: "AUDIT",
      resourceId: anchor.id,
      description: "Audit root anchored",
      severity: "CRITICAL",
      ipAddress: req.ip,
      metadata: {
        rootHash: anchor.rootHash,
        anchoredTxHash: anchor.anchoredTxHash,
        chainId: anchor.chainId,
      },
    });
    return success(res, anchor, "Anchored", 201);
  } catch (e) {
    return badRequest(res, e.message);
  }
});
r.put("/users/:id/role", roleAdminOnly, async (req, res) => {
  await prisma.user.update({
    where: { id: req.params.id },
    data: { role: req.body.role },
  });
  await audit.log({
    userId: req.user.id,
    action: "USER_ROLE_CHANGED",
    resource: "USER",
    resourceId: req.params.id,
    description: `Role changed to ${req.body.role}`,
    severity: "CRITICAL",
    ipAddress: req.ip,
  });
  return success(res, {}, "Updated");
});
r.get("/governance/actions", auditReadOnly, async (req, res) =>
  success(res, {
    actions: await prisma.governanceAction.findMany({
      orderBy: { createdAt: "desc" },
      take: Number(req.query.limit || 50),
    }),
  }),
);
r.post("/governance/actions", electionAdminOnly, async (req, res) => {
  try {
    const action = await governance.propose({
      userId: req.user.id,
      actionType: req.body.actionType,
      resource: req.body.resource,
      resourceId: req.body.resourceId,
      payload: req.body.payload,
      requiredApprovals: req.body.requiredApprovals,
    });
    await audit.log({
      userId: req.user.id,
      action: "GOVERNANCE_ACTION_PROPOSED",
      resource: "GOVERNANCE",
      resourceId: action.id,
      description: action.actionType,
      severity: "HIGH",
      ipAddress: req.ip,
      metadata: {
        resource: action.resource,
        resourceId: action.resourceId,
        notBefore: action.notBefore,
      },
    });
    return success(res, action, "Proposed", 201);
  } catch (e) {
    return badRequest(res, e.message);
  }
});
r.post(
  "/governance/actions/:id/approve",
  electionAdminOnly,
  async (req, res) => {
    try {
      const action = await governance.approve({
        actionId: req.params.id,
        userId: req.user.id,
      });
      await audit.log({
        userId: req.user.id,
        action: "GOVERNANCE_ACTION_APPROVED",
        resource: "GOVERNANCE",
        resourceId: action.id,
        description: action.actionType,
        severity: "HIGH",
        ipAddress: req.ip,
        metadata: { approvals: action.approvals, status: action.status },
      });
      return success(res, action, "Approved");
    } catch (e) {
      return badRequest(res, e.message);
    }
  },
);
r.post("/governance/actions/:id/execute", chainOpsOnly, async (req, res) => {
  try {
    const action = await governance.markExecuted({ actionId: req.params.id });
    await audit.log({
      userId: req.user.id,
      action: "GOVERNANCE_ACTION_EXECUTED",
      resource: "GOVERNANCE",
      resourceId: action.id,
      description: action.actionType,
      severity: "CRITICAL",
      ipAddress: req.ip,
    });
    return success(res, action, "Executed");
  } catch (e) {
    return badRequest(res, e.message);
  }
});
r.get("/blockchain/sync-state", auditReadOnly, async (req, res) =>
  success(res, { voting: await getSyncState("Voting") }),
);
r.post("/blockchain/sync", chainOpsOnly, async (req, res) => {
  try {
    const result = await syncVotingEvents({ toBlock: req.body.toBlock });
    await audit.log({
      userId: req.user.id,
      action: "BLOCKCHAIN_SYNC",
      resource: "CHAIN",
      description: "Manual blockchain sync triggered",
      ipAddress: req.ip,
      metadata: result,
    });
    return success(res, result, "Synced");
  } catch (e) {
    return badRequest(res, e.message);
  }
});
module.exports = r;
