const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient({ log: ["error", "warn"] });
p.$use(async (params, next) => {
  if (
    params.model === "AuditLog" &&
    ["update", "updateMany", "delete", "deleteMany", "upsert"].includes(
      params.action,
    )
  ) {
    throw new Error("AuditLog is append-only");
  }
  return next(params);
});
module.exports = p;
