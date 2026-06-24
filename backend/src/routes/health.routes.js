const r = require("express").Router();
const prisma = require("../config/database");
const blockchain = require("../services/blockchain.service");

r.get("/", async (req, res) => {
  const checks = {
    api: "ok",
    db: "unknown",
    rpc: "unknown",
    contracts: "unknown",
    sync: "unknown",
  };
  let status = 200;
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.db = "ok";
  } catch (e) {
    checks.db = e.message;
    status = 503;
  }
  try {
    const block = await blockchain.getProvider().getBlockNumber();
    checks.rpc = { ok: true, block };
  } catch (e) {
    checks.rpc = e.message;
    status = 503;
  }
  try {
    checks.contracts = {
      voting: !!process.env.CONTRACT_VOTING,
      zkpVerifier: !!process.env.CONTRACT_ZKP_VERIFIER,
    };
    if (!checks.contracts.voting) status = 503;
  } catch (e) {
    checks.contracts = e.message;
    status = 503;
  }
  try {
    const sync = await prisma.blockchainSync.findMany({
      take: 5,
      orderBy: { contractName: "asc" },
    });
    checks.sync = sync;
  } catch (e) {
    checks.sync = e.message;
  }
  return res
    .status(status)
    .json({
      success: status < 500,
      status: status < 500 ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      requestId: req.id,
      checks,
    });
});

module.exports = r;
