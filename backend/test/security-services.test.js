const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { hashEntry } = require("../src/services/audit.service");
const { detectMime } = require("../src/services/upload.security.service");
const { scoreReasons } = require("../src/services/fraud.detection.service");

test("audit hash changes when payload changes", () => {
  const a = hashEntry(null, { action: "A", metadata: { x: 1 } });
  const b = hashEntry(null, { action: "A", metadata: { x: 2 } });
  assert.notEqual(a, b);
});

test("upload MIME detection uses file signatures", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cv-upload-"));
  const png = path.join(dir, "x.bin");
  fs.writeFileSync(
    png,
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]),
  );
  assert.equal(detectMime(png), "image/png");
});

test("fraud score blocks blacklisted and scores repeated devices", () => {
  const blacklisted = scoreReasons({
    voter: { riskScore: 0, isBlacklisted: true },
    recentVotes: 0,
    sameDeviceVotes: 0,
    sameIpVotes: 0,
  });
  assert.ok(blacklisted.score >= 100);
  const device = scoreReasons({
    voter: { riskScore: 0, isBlacklisted: false },
    recentVotes: 0,
    sameDeviceVotes: 3,
    sameIpVotes: 0,
  });
  assert.ok(device.reasons.includes("Device used by multiple recent votes"));
});
