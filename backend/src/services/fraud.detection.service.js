const crypto = require("crypto");
const prisma = require("../config/database");
const { getClientIP, getDeviceId } = require("../utils/helpers");

function fingerprint(req) {
  const ua = req.headers["user-agent"] || "unknown";
  const device = getDeviceId(req);
  const ip = getClientIP(req);
  const hash = (v) =>
    v === "unknown"
      ? null
      : crypto.createHash("sha256").update(String(v)).digest("hex");
  return {
    ua,
    device,
    ip,
    ipHash: hash(ip),
    deviceHash: hash(device),
    userAgentHash: hash(ua),
    hash: crypto
      .createHash("sha256")
      .update(`${ip}:${ua}:${device}`)
      .digest("hex"),
  };
}

function scoreReasons({ voter, recentVotes, sameDeviceVotes, sameIpVotes }) {
  const reasons = [];
  let score = voter.riskScore || 0;
  if (voter.isBlacklisted) {
    score += 100;
    reasons.push("Blacklisted voter");
  }
  if (score > 90) reasons.push("Risk score too high");
  if (recentVotes >= 1) {
    score += 40;
    reasons.push("Rapid repeated vote attempt");
  }
  if (sameDeviceVotes >= 3) {
    score += 35;
    reasons.push("Device used by multiple recent votes");
  }
  if (sameIpVotes >= 10) {
    score += 25;
    reasons.push("High voting concentration from IP");
  }
  return { score, reasons };
}

async function preVoteCheck(req, voter) {
  const fp = fingerprint(req);
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const [recentVotes, sameDeviceVotes, sameIpVotes] = await Promise.all([
    prisma.vote.count({
      where: { voterId: voter.id, castAt: { gte: fiveMinutesAgo } },
    }),
    fp.deviceHash
      ? prisma.votePrivacySignal.count({
          where: { deviceHash: fp.deviceHash, castAt: { gte: oneHourAgo } },
        })
      : 0,
    fp.ipHash
      ? prisma.votePrivacySignal.count({
          where: { ipHash: fp.ipHash, castAt: { gte: oneHourAgo } },
        })
      : 0,
  ]);
  const result = scoreReasons({
    voter,
    recentVotes,
    sameDeviceVotes,
    sameIpVotes,
  });
  if (result.reasons.length) {
    await prisma.fraudLog
      .create({
        data: {
          voterId: voter.id,
          fraudType: "PRE_VOTE_CHECK",
          description: result.reasons.join("; "),
          severity:
            result.score >= 100
              ? "CRITICAL"
              : result.score >= 70
                ? "HIGH"
                : "MEDIUM",
          riskScore: result.score,
          ipAddress: fp.ip,
          metadata: {
            deviceId: fp.device,
            userAgent: fp.ua,
            fingerprint: fp.hash,
            recentVotes,
            sameDeviceVotes,
            sameIpVotes,
          },
        },
      })
      .catch(() => {});
  }
  return {
    blocked: result.score >= 100,
    reason: result.reasons[0] || "Fraud risk blocked",
    riskScore: result.score,
    signals: { ...fp, recentVotes, sameDeviceVotes, sameIpVotes },
  };
}

function votePrivacySignalData(req, electionId) {
  const fp = fingerprint(req);
  return {
    electionId,
    ipHash: fp.ipHash,
    deviceHash: fp.deviceHash,
    userAgentHash: fp.userAgentHash,
  };
}

async function recordVotePrivacySignal(req, electionId) {
  return prisma.votePrivacySignal
    .create({ data: votePrivacySignalData(req, electionId) })
    .catch(() => null);
}

module.exports = {
  preVoteCheck,
  recordVotePrivacySignal,
  votePrivacySignalData,
  fingerprint,
  scoreReasons,
};
