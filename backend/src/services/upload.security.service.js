const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PRIVATE_UPLOAD_ROOT =
  process.env.PRIVATE_UPLOAD_ROOT ||
  path.join(__dirname, "../../private_uploads");
const FILE_ALGORITHM = "aes-256-gcm";
const ALLOWED_SIGNATURES = {
  "image/jpeg": [Buffer.from([0xff, 0xd8, 0xff])],
  "image/png": [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
  "application/pdf": [Buffer.from("%PDF")],
};

function ensurePrivateUploadRoot() {
  fs.mkdirSync(PRIVATE_UPLOAD_ROOT, { recursive: true });
  return PRIVATE_UPLOAD_ROOT;
}

function sha256File(filePath) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(filePath))
    .digest("hex");
}

function detectMime(filePath) {
  const header = fs.readFileSync(filePath).subarray(0, 16);
  for (const [mime, signatures] of Object.entries(ALLOWED_SIGNATURES)) {
    if (signatures.some((sig) => header.subarray(0, sig.length).equals(sig)))
      return mime;
  }
  return "application/octet-stream";
}

function assertAllowedUpload(
  file,
  allowed = ["image/jpeg", "image/png", "application/pdf"],
) {
  if (!file) throw new Error("Upload missing");
  const detected = detectMime(file.path);
  if (!allowed.includes(detected))
    throw new Error(`Unsupported file type: ${detected}`);
  if (file.mimetype && file.mimetype !== detected)
    throw new Error(`MIME mismatch: ${file.mimetype} != ${detected}`);
  return detected;
}

function quarantinePath(file, scope = "general") {
  const root = ensurePrivateUploadRoot();
  const dir = path.join(root, scope);
  fs.mkdirSync(dir, { recursive: true });
  const ext = path
    .extname(file.originalname || "")
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, "")
    .slice(0, 10);
  return path.join(dir, `${crypto.randomUUID()}${ext}`);
}

function moveToPrivateStorage(file, scope) {
  const detected = assertAllowedUpload(file);
  const target = quarantinePath(file, scope);
  fs.renameSync(file.path, target);
  return {
    storagePath: target,
    mimeType: detected,
    sha256: sha256File(target),
    sizeBytes: file.size,
  };
}

function fileEncryptionKey() {
  const raw = process.env.PII_ENCRYPTION_KEY;
  if (!raw) {
    if (process.env.NODE_ENV === "production")
      throw new Error("PII_ENCRYPTION_KEY required for encrypted uploads");
    return crypto
      .createHash("sha256")
      .update("dev-only-upload-key-change-me")
      .digest();
  }
  const key = Buffer.from(raw, "hex");
  if (key.length !== 32)
    throw new Error("PII_ENCRYPTION_KEY must be 32 bytes hex");
  return key;
}

function encryptFileAtRest(filePath) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(FILE_ALGORITHM, fileEncryptionKey(), iv);
  const plaintext = fs.readFileSync(filePath);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([Buffer.from("CVENC1:"), iv, tag, encrypted]);
  fs.writeFileSync(filePath, payload);
  return {
    encrypted: true,
    encryptionKeyRef: process.env.PII_KEY_REF || "local-pii-key-v1",
  };
}

function malwareScanPlaceholder(filePath) {
  if (process.env.MALWARE_SCAN_REQUIRED === "true")
    throw new Error("Malware scanner is required but not configured");
  return { status: "SKIPPED", reason: "No scanner configured" };
}

module.exports = {
  PRIVATE_UPLOAD_ROOT,
  assertAllowedUpload,
  moveToPrivateStorage,
  encryptFileAtRest,
  sha256File,
  detectMime,
  malwareScanPlaceholder,
};
