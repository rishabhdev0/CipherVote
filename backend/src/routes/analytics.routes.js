const r = require("express").Router(),
  prisma = require("../config/database"),
  { authenticate } = require("../middleware/auth.middleware"),
  { success } = require("../utils/response");
function analyticsReadOnly(req, res, next) {
  if (
    !["SUPER_ADMIN", "ELECTION_COMMISSION", "AUDITOR", "FRAUD_ANALYST"].includes(
      req.user?.role,
    )
  )
    return res
      .status(403)
      .json({ success: false, message: "Analytics permission required" });
  next();
}
function canRevealCandidateResults(election) {
  return ["CLOSED", "RESULTS_DECLARED"].includes(election?.status);
}
function sealedTally(election, candidates) {
  const total = election?.totalVotesCast || 0;
  if (!canRevealCandidateResults(election))
    return { sealed: true, leaderboard: [], candidates: [], totalVotes: total };
  const leaderboard = [...candidates]
    .sort((a, b) => b.voteCount - a.voteCount)
    .map((c, i) => ({
      ...c,
      percentage: total > 0 ? +((c.voteCount / total) * 100).toFixed(2) : 0,
      rank: i + 1,
    }));
  return { sealed: false, leaderboard, candidates: leaderboard, totalVotes: total };
}
r.get("/platform", async (req, res) => {
  const [vg, eg, tv, nft, cg] = await Promise.all([
    prisma.voter.groupBy({ by: ["status"], _count: { id: true } }),
    prisma.election.groupBy({ by: ["status"], _count: { id: true } }),
    prisma.vote.count(),
    prisma.voter.count({ where: { nftTokenId: { not: null } } }),
    prisma.candidateApplication
      ? prisma.candidateApplication.groupBy({ by: ["status"], _count: { id: true } }).catch(() => [])
      : Promise.resolve([]),
  ]);
  const voters = { total: 0 };
  vg.forEach((v) => {
    voters[v.status] = v._count.id;
    voters.total += v._count.id;
  });
  const elections = { total: 0 };
  eg.forEach((e) => {
    elections[e.status] = e._count.id;
    elections.total += e._count.id;
  });
  const candidateApplications = { total: 0 };
  cg.forEach((c) => {
    candidateApplications[c.status] = c._count.id;
    candidateApplications.total += c._count.id;
  });
  return success(res, {
    voters,
    elections,
    candidateApplications,
    totalVotesCast: tv,
    nftCredentials: nft,
  });
});

r.use(authenticate, analyticsReadOnly);
r.get("/elections/:id/overview", async (req, res) => {
  const e = await prisma.election.findUnique({
    where: { id: req.params.id },
    include: { candidates: true },
  });
  if (!e) return success(res, {});
  const tally = sealedTally(e, e.candidates);
  return success(res, {
    election: { ...e, candidates: tally.candidates },
    totalVotes: tally.totalVotes,
    sealed: tally.sealed,
    candidates: tally.candidates,
  });
});
r.get("/elections/:id/tally", async (req, res) => {
  const election = await prisma.election.findUnique({
    where: { id: req.params.id },
    include: { candidates: true },
  });
  return success(res, sealedTally(election, election?.candidates || []));
});
r.get("/elections/:id/snapshot", async (req, res) => {
  const election = await prisma.election.findUnique({
    where: { id: req.params.id },
    include: { candidates: true },
  });
  return success(res, sealedTally(election, election?.candidates || []));
});
r.get("/elections/:id/trend", async (req, res) => success(res, { trend: [] }));
r.get("/voters", async (req, res) => {
  const [data, total, flagged] = await Promise.all([
    prisma.voter.groupBy({ by: ["status"], _count: { id: true } }),
    prisma.voter.count(),
    prisma.voter.count({ where: { isFlagged: true } }),
  ]);
  return success(res, {
    total,
    flaggedVoters: flagged,
    byStatus: data.reduce((a, d) => ({ ...a, [d.status]: d._count.id }), {}),
  });
});
r.get("/blockchain", async (req, res) => {
  const minted = await prisma.voter.count({
    where: { nftTokenId: { not: null } },
  });
  return success(res, {
    health: {
      connected: true,
      network: "localhost",
      blockNumber: 0,
      contracts: { Voting: true, VoterRegistry: true },
    },
    nftStats: { minted, active: minted, revoked: 0 },
  });
});
r.get("/nft", async (req, res) => {
  const data = await prisma.voter.groupBy({
    by: ["nftTier"],
    _count: { id: true },
  });
  return success(res, {
    tiers: data,
    total: data.reduce((s, d) => s + d._count.id, 0),
  });
});
r.get("/historical", async (req, res) => {
  const elections = await prisma.election.findMany({
    include: { candidates: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  return success(res, elections.map((e) => sealedTally(e, e.candidates)));
});
r.get("/audit", async (req, res) => {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: +req.query.limit || 20,
  });
  return success(res, { logs, onChain: [] });
});
module.exports = r;
