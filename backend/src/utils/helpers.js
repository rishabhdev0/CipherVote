const crypto = require("crypto");
const getClientIP = (r) =>
  r.ip ||
  r.headers["x-forwarded-for"]?.split(",")[0] ||
  r.socket?.remoteAddress ||
  "unknown";
const getDeviceId = (r) => {
  const raw = r.headers["x-device-id"];
  if (typeof raw !== "string" || raw.length < 8 || raw.length > 128)
    return "unknown";
  return crypto.createHash("sha256").update(raw).digest("hex");
};
const generateToken = (b = 32) => crypto.randomBytes(b).toString("hex");
const generateOTP = (l = 6) =>
  Math.floor(Math.random() * Math.pow(10, l))
    .toString()
    .padStart(l, "0");
module.exports = { getClientIP, getDeviceId, generateToken, generateOTP };
