const r = require("express").Router(),
  prisma = require("../config/database"),
  {
    authenticate,
    fraudAdminOnly,
    auditReadOnly,
  } = require("../middleware/auth.middleware"),
  { success, badRequest } = require("../utils/response"),
  audit = require("../services/audit.service"),
  emergency = require("../services/emergency.service");
r.use(authenticate);
r.get("/dashboard", auditReadOnly, async (req, res) => {
  const [logs, flagged] = await Promise.all([
    prisma.fraudLog.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.voter.count({ where: { isFlagged: true } }),
  ]);
  const unresolved = logs.filter((l) => !l.isResolved).length;
  return success(res, {
    recentLogs: logs,
    summary: {
      unresolvedAlerts: unresolved,
      flaggedVoters: flagged,
      flaggedIPs: 0,
      bySeverity: logs.reduce(
        (a, l) => ({ ...a, [l.severity]: (a[l.severity] || 0) + 1 }),
        {},
      ),
    },
  });
});
r.get("/logs", auditReadOnly, async (req, res) => {
  const { page = 1, limit = 10, severity } = req.query;
  const where = {};
  if (severity) where.severity = severity;
  const [data, total] = await Promise.all([
    prisma.fraudLog.findMany({
      where,
      skip: (+page - 1) * +limit,
      take: +limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.fraudLog.count({ where }),
  ]);
  return success(res, {
    data,
    pagination: { total, pages: Math.ceil(total / +limit) },
  });
});
r.put("/logs/:id/review", fraudAdminOnly, async (req, res) => {
  const log = await prisma.fraudLog.update({
    where: { id: req.params.id },
    data: {
      reviewStatus: req.body.reviewStatus || "UNDER_REVIEW",
      reviewNotes: req.body.reviewNotes,
      reviewedBy: req.user.id,
      reviewedAt: new Date(),
    },
  });
  await audit.log({
    userId: req.user.id,
    action: "FRAUD_LOG_REVIEWED",
    resource: "FRAUD_LOG",
    resourceId: req.params.id,
    description: req.body.reviewNotes || "Fraud log reviewed",
    ipAddress: req.ip,
    metadata: { reviewStatus: log.reviewStatus },
  });
  return success(res, log, "Reviewed");
});
r.put("/logs/:id/resolve", fraudAdminOnly, async (req, res) => {
  await prisma.fraudLog.update({
    where: { id: req.params.id },
    data: {
      isResolved: true,
      reviewStatus: "RESOLVED",
      reviewNotes: req.body.reviewNotes,
      resolvedBy: req.user.id,
      resolvedAt: new Date(),
      reviewedBy: req.user.id,
      reviewedAt: new Date(),
    },
  });
  await audit.log({
    userId: req.user.id,
    action: "FRAUD_LOG_RESOLVED",
    resource: "FRAUD_LOG",
    resourceId: req.params.id,
    description: "Fraud log resolved",
    severity: "CRITICAL",
    ipAddress: req.ip,
  });
  return success(res, {}, "Resolved");
});
r.get("/anomalies", auditReadOnly, async (req, res) =>
  success(res, { data: [], pagination: { total: 0 } }),
);
r.get("/emergency", auditReadOnly, async (req, res) =>
  success(res, {
    ...(await emergency.getState()),
    unresolvedCritical: await prisma.fraudLog.count({
      where: { severity: "CRITICAL", isResolved: false },
    }),
  }),
);
r.post("/emergency/pause", fraudAdminOnly, async (req, res) => {
  try {
    const state = await emergency.pause({
      userId: req.user.id,
      reason: req.body.reason,
    });
    await audit.log({
      userId: req.user.id,
      action: "SYSTEM_PAUSED",
      resource: "EMERGENCY",
      description: req.body.reason,
      severity: "CRITICAL",
      ipAddress: req.ip,
      metadata: { chainTxHash: state.chainTxHash },
    });
    return success(res, state, "Paused");
  } catch (e) {
    return badRequest(res, e.message);
  }
});
r.post("/emergency/resume", fraudAdminOnly, async (req, res) => {
  try {
    const state = await emergency.resume({ userId: req.user.id });
    await audit.log({
      userId: req.user.id,
      action: "SYSTEM_RESUMED",
      resource: "EMERGENCY",
      description: req.body.reason || "Emergency pause lifted",
      severity: "CRITICAL",
      ipAddress: req.ip,
      metadata: { chainTxHash: state.chainTxHash },
    });
    return success(res, state, "Resumed");
  } catch (e) {
    return badRequest(res, e.message);
  }
});
r.get("/voters/flagged", auditReadOnly, async (req, res) => {
  const data = await prisma.voter.findMany({
    where: { isFlagged: true },
    take: 20,
  });
  return success(res, { data });
});
module.exports = r;
