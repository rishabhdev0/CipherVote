const multer = require("multer");
const r = require("express").Router(),
  prisma = require("../config/database"),
  {
    authenticate,
    electionAdminOnly,
    auditReadOnly,
  } = require("../middleware/auth.middleware"),
  { success, badRequest, notFound, forbidden } = require("../utils/response"),
  audit = require("../services/audit.service");
const {
  moveToPrivateStorage,
  encryptFileAtRest,
  malwareScanPlaceholder,
} = require("../services/upload.security.service");
const upload = multer({
  dest: "uploads/evidence/",
  limits: { fileSize: 10 * 1024 * 1024 },
});
r.use(authenticate);
r.get("/mine", async (req, res) => {
  const data = await prisma.dispute.findMany({
    where: { createdById: req.user.id },
    orderBy: { createdAt: "desc" },
  });
  return success(res, { disputes: data, total: data.length });
});
r.post("/", async (req, res) => {
  const {
    title,
    description,
    disputeType = "OTHER",
    isPublic = true,
  } = req.body;
  if (!title || !description)
    return badRequest(res, "Title and description required");
  const d = await prisma.dispute.create({
    data: {
      createdById: req.user.id,
      title,
      description,
      disputeType,
      isPublic,
      status: "FILED",
    },
  });
  return success(res, d, "Filed", 201);
});
r.get("/", auditReadOnly, async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;
  const where = {};
  if (status) where.status = status;
  const [data, total] = await Promise.all([
    prisma.dispute.findMany({
      where,
      skip: (+page - 1) * +limit,
      take: +limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.dispute.count({ where }),
  ]);
  return success(res, { disputes: data, total });
});
const canAccess = (req, d) =>
  d.isPublic ||
  d.createdById === req.user.id ||
  ["SUPER_ADMIN", "AUDITOR", "ELECTION_COMMISSION"].includes(req.user.role);
r.get("/:id", async (req, res) => {
  const d = await prisma.dispute.findUnique({
    where: { id: req.params.id },
    include: { evidence: { include: { document: true } } },
  });
  if (!d) return notFound(res);
  if (!canAccess(req, d)) return forbidden(res);
  return success(res, d);
});
r.post("/:id/evidence", upload.single("file"), async (req, res) => {
  const dispute = await prisma.dispute.findUnique({
    where: { id: req.params.id },
  });
  if (!dispute) return notFound(res);
  if (
    dispute.createdById !== req.user.id &&
    !["SUPER_ADMIN", "ELECTION_COMMISSION"].includes(req.user.role)
  )
    return forbidden(res);
  let documentId = null,
    hash = req.body.hash;
  if (req.file) {
    const stored = moveToPrivateStorage(req.file, `disputes/${dispute.id}`);
    malwareScanPlaceholder(stored.storagePath);
    hash = stored.sha256;
    const enc = encryptFileAtRest(stored.storagePath);
    const doc = await prisma.uploadedDocument.create({
      data: {
        userId: req.user.id,
        type: "DISPUTE_EVIDENCE",
        storagePath: stored.storagePath,
        originalName: req.file.originalname,
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
        sha256: hash,
        encrypted: enc.encrypted,
        encryptionKeyRef: enc.encryptionKeyRef,
      },
    });
    documentId = doc.id;
  }
  const ev = await prisma.disputeEvidence.create({
    data: {
      disputeId: req.params.id,
      uploadedById: req.user.id,
      documentId,
      description: req.body.description,
      hash,
    },
  });
  await prisma.dispute.update({
    where: { id: req.params.id },
    data: { evidenceCount: { increment: 1 } },
  });
  return success(res, ev, "Evidence added", 201);
});
r.put("/:id/resolve", electionAdminOnly, async (req, res) => {
  const { finalStatus, resolution, actionTaken } = req.body;
  await prisma.dispute.update({
    where: { id: req.params.id },
    data: {
      status: finalStatus,
      resolution,
      actionTaken: actionTaken || undefined,
      resolvedAt: new Date(),
    },
  });
  await audit.log({
    userId: req.user.id,
    action: "DISPUTE_RESOLVED",
    resource: "DISPUTE",
    resourceId: req.params.id,
    description: resolution,
    severity: "CRITICAL",
    ipAddress: req.ip,
  });
  return success(res, {}, "Resolved");
});
module.exports = r;
