const test = require("node:test");
const assert = require("node:assert/strict");
const { generateOTP, generateToken } = require("../src/utils/helpers");

test("generateOTP returns a fixed-length numeric string", () => {
  const otp = generateOTP(6);
  assert.match(otp, /^\d{6}$/);
});

test("generateToken returns hex with two chars per byte", () => {
  const token = generateToken(16);
  assert.match(token, /^[0-9a-f]{32}$/);
});
