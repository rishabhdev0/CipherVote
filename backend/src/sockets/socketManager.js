const { verifyAccess } = require("../services/jwt.service");
const { runtimeConfig } = require("../config/env");
let io;
function parseCookie(header, name) {
  if (!header) return null;
  const hit = header
    .split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith(`${name}=`));
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : null;
}
function socketUser(sock) {
  try {
    const token = parseCookie(
      sock.handshake.headers.cookie,
      runtimeConfig().accessCookieName,
    );
    return token ? verifyAccess(token) : null;
  } catch {
    return null;
  }
}
const init = (s) => {
  io = s;
  io.on("connection", (sock) => {
    sock.data.user = socketUser(sock);
    sock.on("join:election", ({ electionId }) =>
      sock.join(`election:${electionId}`),
    );
    sock.on("leave:election", ({ electionId }) =>
      sock.leave(`election:${electionId}`),
    );
    sock.on("join:admin", () => {
      if (
        [
          "SUPER_ADMIN",
          "ELECTION_COMMISSION",
          "AUDITOR",
          "FRAUD_ANALYST",
        ].includes(sock.data.user?.role)
      )
        sock.join("admin");
    });
    sock.on("subscribe:fraud", () => {
      if (
        ["SUPER_ADMIN", "FRAUD_ANALYST", "AUDITOR"].includes(
          sock.data.user?.role,
        )
      )
        sock.join("fraud");
    });
  });
};
const broadcastTallyUpdate = async (eId) => {
  if (io)
    io.to(`election:${eId}`).emit("tally:update", {
      electionId: eId,
      timestamp: new Date(),
    });
};
const emitVoteCast = (eId, data) => {
  if (io)
    io.to(`election:${eId}`).emit("vote:cast", { electionId: eId, ...data });
};
const emitFraudAlert = (d) => {
  if (io) io.to("admin").emit("fraud:alert", d);
};
const emitVoterVerified = (d) => {
  if (io) io.to("admin").emit("voter:verified", d);
};
const emitVoterBlacklisted = (d) => {
  if (io) io.to("admin").emit("voter:blacklisted", d);
};
module.exports = {
  init,
  broadcastTallyUpdate,
  emitVoteCast,
  emitFraudAlert,
  emitVoterVerified,
  emitVoterBlacklisted,
};
