const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { runtimeConfig } = require("./config/env");
const {
  requestId,
  csrfProtection,
  noStore,
} = require("./middleware/security.middleware");
const logger = require("./config/logger");
const app = express();
const cfg = runtimeConfig();
app.set("trust proxy", cfg.trustProxy);
app.use(requestId);
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "script-src": ["'self'"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "img-src": ["'self'", "data:"],
        "connect-src": ["'self'", ...cfg.corsOrigins],
        "frame-ancestors": ["'none'"],
        "object-src": ["'none'"],
      },
    },
  }),
);
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || cfg.corsOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("Origin not allowed"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-CSRF-Token",
      "X-Request-ID",
    ],
  }),
);
app.use(
  express.json({
    limit: process.env.JSON_BODY_LIMIT || "2mb",
    verify: (req, res, buf) => {
      req.rawBody = buf.toString("utf8");
    },
  }),
);
app.use(express.urlencoded({ extended: true, limit: process.env.FORM_BODY_LIMIT || "256kb" }));
app.use(
  morgan(
    (tokens, req, res) =>
      JSON.stringify({
        type: "http",
        requestId: req.id,
        method: tokens.method(req, res),
        url: tokens.url(req, res),
        status: Number(tokens.status(req, res)),
        responseTimeMs: Number(tokens["response-time"](req, res)),
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      }),
    { stream: { write: (line) => logger.info(line.trim()) } },
  ),
);
app.use(noStore);
app.use(csrfProtection);
app.use("/api", require("./middleware/rate-limit.middleware").apiRateLimit);
app.use(
  "/api/auth",
  require("./middleware/rate-limit.middleware").authRateLimit,
);
app.use("/api/health", require("./routes/health.routes"));
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/voters", require("./routes/voter.routes"));
app.use("/api/candidates", require("./routes/candidate.routes"));
app.use("/api/elections", require("./routes/election.routes"));
app.use("/api/voting", require("./routes/voting.routes"));
app.use("/api/fraud", require("./routes/fraud.routes"));
app.use("/api/analytics", require("./routes/analytics.routes"));
app.use("/api/admin", require("./routes/admin.routes"));
app.use("/api/disputes", require("./routes/dispute.routes"));
app.use("/api/delegate", require("./routes/delegation.routes"));
app.use("/nft", require("./routes/nft.routes"));
app.use("/api/nft", require("./routes/nft.routes"));
app.use((err, req, res, next) => {
  logger.error(err.stack || err.message || String(err));
  const message =
    process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message;
  res
    .status(500)
    .json({ success: false, message, requestId: req.id });
});
module.exports = app;
