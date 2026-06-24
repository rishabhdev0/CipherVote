const fs = require("fs");
const prisma = require("../config/database");

async function deleteExpiredDocuments({
  days = Number(process.env.UPLOAD_RETENTION_DAYS || 365),
  dryRun = true,
} = {}) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const docs = await prisma.uploadedDocument.findMany({
    where: { createdAt: { lt: cutoff } },
    take: 500,
  });
  let deleted = 0;
  for (const doc of docs) {
    if (!dryRun && doc.storagePath && fs.existsSync(doc.storagePath))
      fs.unlinkSync(doc.storagePath);
    if (!dryRun)
      await prisma.uploadedDocument.delete({ where: { id: doc.id } });
    deleted++;
  }
  return {
    cutoff,
    matched: docs.length,
    deleted: dryRun ? 0 : deleted,
    dryRun,
  };
}

if (require.main === module) {
  deleteExpiredDocuments({ dryRun: process.argv.includes("--dry-run") })
    .then((r) => {
      console.log(JSON.stringify(r, null, 2));
      process.exit(0);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

module.exports = { deleteExpiredDocuments };
