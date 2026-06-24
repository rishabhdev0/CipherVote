const crypto = require("crypto");

const isProduction = process.env.NODE_ENV === "production";
const requiredInProduction = [
  "DATABASE_URL",
  "JWT_SECRET",
  "JWT_REFRESH_SECRET",
  "CORS_ORIGINS",
  "RPC_URL",
  "PRIVATE_KEY",
  "CONTRACT_VOTING",
  "CONTRACT_ZKP_VERIFIER",
  "CONTRACT_ELECTION_MANAGER",
  "CONTRACT_VOTER_REGISTRY",
  "CONTRACT_EMERGENCY_CONTROL",
  "VOTER_SECRET_PEPPER",
  "PII_ENCRYPTION_KEY",
  "BALLOT_PRIVACY_MODE",
  "REQUIRE_ZKP",
  "REQUIRE_GOVERNANCE_FOR_ELECTIONS",
];

function parseOrigins() {
  const raw =
    process.env.CORS_ORIGINS ||
    process.env.FRONTEND_URL ||
    "http://localhost:3000";
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function requireProductionEnv() {
  if (!isProduction) return;
  const missing = requiredInProduction.filter((k) => !process.env[k]);
  if (missing.length)
    throw new Error(
      `Missing production environment variables: ${missing.join(", ")}`,
    );
  if (
    [
      "secret",
      "refresh",
      "dev-only-access-secret-change-me",
      "dev-only-refresh-secret-change-me",
    ].includes(process.env.JWT_SECRET)
  )
    throw new Error("JWT_SECRET is not production safe");
  if (
    [
      "secret",
      "refresh",
      "dev-only-access-secret-change-me",
      "dev-only-refresh-secret-change-me",
    ].includes(process.env.JWT_REFRESH_SECRET)
  )
    throw new Error("JWT_REFRESH_SECRET is not production safe");
  if (process.env.CORS_ORIGINS === "*")
    throw new Error("CORS_ORIGINS cannot be '*' in production");
  if (process.env.BALLOT_PRIVACY_MODE !== "encrypted")
    throw new Error("BALLOT_PRIVACY_MODE must be encrypted in production");
  if (process.env.REQUIRE_ZKP !== "true")
    throw new Error("REQUIRE_ZKP must be true in production");
  if (process.env.REQUIRE_GOVERNANCE_FOR_ELECTIONS !== "true")
    throw new Error(
      "REQUIRE_GOVERNANCE_FOR_ELECTIONS must be true in production",
    );
}

function runtimeConfig() {
  requireProductionEnv();
  return {
    isProduction,
    trustProxy: process.env.TRUST_PROXY === "true" || isProduction,
    corsOrigins: parseOrigins(),
    cookieSecure: process.env.COOKIE_SECURE === "true" || isProduction,
    cookieSameSite:
      process.env.COOKIE_SAMESITE || (isProduction ? "strict" : "lax"),
    cookieDomain: process.env.COOKIE_DOMAIN || undefined,
    csrfCookieName: process.env.CSRF_COOKIE_NAME || "cv_csrf",
    accessCookieName: process.env.ACCESS_COOKIE_NAME || "cv_access",
    refreshCookieName: process.env.REFRESH_COOKIE_NAME || "cv_refresh",
    requestIdHeader: "x-request-id",
  };
}

function secureRandomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

module.exports = { runtimeConfig, requireProductionEnv, secureRandomToken };
