const rl = require("express-rate-limit");

const authRateLimit = rl({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || 50),
  message: { success: false, message: "Too many requests" },
  standardHeaders: true,
  legacyHeaders: false,
});

const votingRateLimit = rl({
  windowMs: 60 * 60 * 1000,
  max: Number(process.env.VOTING_RATE_LIMIT_MAX || 10),
  message: { success: false, message: "Too many vote attempts" },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiRateLimit = rl({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.API_RATE_LIMIT_MAX || 300),
  message: { success: false, message: "Rate limit exceeded" },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authRateLimit, votingRateLimit, apiRateLimit };
