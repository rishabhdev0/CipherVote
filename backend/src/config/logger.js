const w = require("winston");
const json = w.format.combine(
  w.format.timestamp(),
  w.format.errors({ stack: true }),
  w.format.json(),
);

const pretty = w.format.combine(
  w.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  w.format.colorize(),
  w.format.printf(
    ({ timestamp: t, level: lv, message: m, stack }) =>
      `${t} [${lv}]: ${stack || m}`,
  ),
);
const l = w.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: process.env.NODE_ENV === "production" ? json : pretty,
  transports: [new w.transports.Console()],
});
module.exports = l;
