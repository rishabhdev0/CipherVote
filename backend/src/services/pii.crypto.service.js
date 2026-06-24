const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";
const KEY_BYTES = 32;

function key() {
  const raw = process.env.PII_ENCRYPTION_KEY;
  if (!raw) {
    if (process.env.NODE_ENV === "production")
      throw new Error("PII_ENCRYPTION_KEY required in production");
    return crypto
      .createHash("sha256")
      .update("dev-only-pii-key-change-me")
      .digest();
  }
  const buf = Buffer.from(raw, "hex");
  if (buf.length !== KEY_BYTES)
    throw new Error("PII_ENCRYPTION_KEY must be 32 bytes hex");
  return buf;
}

function encryptPII(value) {
  if (value === undefined || value === null) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key(), iv);
  const encrypted = Buffer.concat([
    cipher.update(String(value), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

function decryptPII(payload) {
  if (!payload) return null;
  const [ivHex, tagHex, dataHex] = payload.split(":");
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key(),
    Buffer.from(ivHex, "hex"),
  );
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]).toString("utf8");
}

function piiHash(value) {
  if (value === undefined || value === null) return null;
  return crypto
    .createHash("sha256")
    .update(`${process.env.PII_HASH_PEPPER || "dev-pepper"}:${String(value)}`)
    .digest("hex");
}

module.exports = { encryptPII, decryptPII, piiHash };
