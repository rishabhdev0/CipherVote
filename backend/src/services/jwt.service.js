const jwt = require("jsonwebtoken"),
  { randomUUID } = require("crypto");
const required = (name) => {
  const v = process.env[name];
  if (!v && process.env.NODE_ENV === "production")
    throw new Error(`${name} is required`);
  return v;
};
const S = required("JWT_SECRET") || "dev-only-access-secret-change-me";
const R = required("JWT_REFRESH_SECRET") || "dev-only-refresh-secret-change-me";
const opts = {
  issuer: process.env.JWT_ISSUER || "ciphervote",
  audience: process.env.JWT_AUDIENCE || "ciphervote-app",
};
const generateAccessToken = (p) =>
  jwt.sign({ ...p, type: "access" }, S, {
    ...opts,
    jwtid: randomUUID(),
    expiresIn: process.env.JWT_EXPIRES_IN || "15m",
  });
const generateRefreshToken = (p) =>
  jwt.sign({ ...p, type: "refresh" }, R, {
    ...opts,
    jwtid: randomUUID(),
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  });
const generateTokens = (p) => ({
  accessToken: generateAccessToken(p),
  refreshToken: generateRefreshToken(p),
});
const verifyAccess = (t) => {
  const d = jwt.verify(t, S, opts);
  if (d.type !== "access") throw new Error("Invalid token type");
  return d;
};
const verifyRefresh = (t) => {
  const d = jwt.verify(t, R, opts);
  if (d.type !== "refresh") throw new Error("Invalid token type");
  return d;
};
module.exports = {
  generateTokens,
  generateAccessToken,
  generateRefreshToken,
  verifyAccess,
  verifyRefresh,
};
