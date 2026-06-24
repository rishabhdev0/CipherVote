const crypto = require("crypto");
const prisma = require("../config/database");
function canonical(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonical);
  return Object.keys(value)
    .sort()
    .reduce((acc, key) => {
      acc[key] = canonical(value[key]);
      return acc;
    }, {});
}
function stable(value) {
  return JSON.stringify(canonical(value));
}
function hashEntry(previousHash, payload) {
  return crypto
    .createHash("sha256")
    .update(`${previousHash || ""}:${stable(payload)}`)
    .digest("hex");
}
const log = async ({
  userId,
  action,
  resource,
  resourceId,
  description,
  severity = "INFO",
  ipAddress,
  metadata,
}) => {
  const write = async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(91234567)`;
    const previous = await tx.auditLog.findFirst({
      orderBy: { createdAt: "desc" },
      select: { entryHash: true },
    });
    const payload = {
      userId,
      action,
      resource,
      resourceId,
      description,
      severity,
      ipAddress,
      metadata: metadata || undefined,
      createdAt: new Date().toISOString(),
    };
    const entryHash = hashEntry(previous?.entryHash, payload);
    return tx.auditLog.create({
      data: {
        ...payload,
        previousHash: previous?.entryHash,
        entryHash,
        createdAt: new Date(payload.createdAt),
      },
    });
  };
  try {
    return await prisma.$transaction(write);
  } catch (e) {
    if (
      process.env.NODE_ENV === "test" ||
      process.env.NODE_ENV === "development"
    )
      return prisma.auditLog.create({
        data: {
          userId,
          action,
          resource,
          resourceId,
          description,
          severity,
          ipAddress,
          metadata: metadata || undefined,
          entryHash: hashEntry(null, {
            userId,
            action,
            resource,
            resourceId,
            description,
            severity,
            ipAddress,
            metadata,
          }),
        },
      });
    throw e;
  }
};
const authLog = (req, action, description, metadata) =>
  log({
    userId: req.user?.id,
    action,
    resource: "AUTH",
    description,
    ipAddress: req.ip,
    metadata,
  });
const voteLog = (req, action, resourceId, description, metadata) =>
  log({
    userId: req.user?.id,
    action,
    resource: "VOTE",
    resourceId,
    description,
    severity: "CRITICAL",
    ipAddress: req.ip,
    metadata,
  });
async function computeAuditRoot({ limit = 1000 } = {}) {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "asc" },
    take: limit,
    select: { id: true, entryHash: true },
  });
  const root = logs.reduce(
    (acc, l) =>
      crypto
        .createHash("sha256")
        .update(`${acc}:${l.entryHash || ""}`)
        .digest("hex"),
    "",
  );
  return {
    rootHash: root || null,
    fromLogId: logs[0]?.id,
    toLogId: logs.at(-1)?.id,
    logCount: logs.length,
  };
}
async function createAuditAnchor({ anchoredTxHash, chainId } = {}) {
  const root = await computeAuditRoot();
  if (!root.rootHash) throw new Error("No audit logs to anchor");
  return prisma.auditAnchor.create({
    data: { ...root, anchoredTxHash, chainId },
  });
}
module.exports = {
  log,
  authLog,
  voteLog,
  hashEntry,
  computeAuditRoot,
  createAuditAnchor,
};
