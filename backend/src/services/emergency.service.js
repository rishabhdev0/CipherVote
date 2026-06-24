const prisma = require("../config/database");
const blockchain = require("./blockchain.service");

async function getState() {
  return prisma.systemState.upsert({
    where: { id: "global" },
    update: {},
    create: { id: "global" },
  });
}

async function assertNotPaused() {
  const state = await getState();
  if (state.emergencyPaused)
    throw new Error(state.pauseReason || "System emergency pause is active");
  return state;
}

async function pause({ userId, reason }) {
  let chain = null;
  if (process.env.CONTRACT_EMERGENCY_CONTROL) {
    chain = await blockchain.emergencyControl.pauseSystem(
      reason || "Emergency pause",
    );
  }
  return prisma.systemState.upsert({
    where: { id: "global" },
    create: {
      id: "global",
      emergencyPaused: true,
      pauseReason: reason,
      pausedById: userId,
      pausedAt: new Date(),
      chainTxHash: chain?.hash,
    },
    update: {
      emergencyPaused: true,
      pauseReason: reason,
      pausedById: userId,
      pausedAt: new Date(),
      resumedById: null,
      resumedAt: null,
      chainTxHash: chain?.hash,
    },
  });
}

async function resume({ userId }) {
  let chain = null;
  if (process.env.CONTRACT_EMERGENCY_CONTROL) {
    chain = await blockchain.emergencyControl.resumeSystem();
  }
  return prisma.systemState.upsert({
    where: { id: "global" },
    create: {
      id: "global",
      emergencyPaused: false,
      resumedById: userId,
      resumedAt: new Date(),
      chainTxHash: chain?.hash,
    },
    update: {
      emergencyPaused: false,
      resumedById: userId,
      resumedAt: new Date(),
      chainTxHash: chain?.hash,
    },
  });
}

module.exports = { getState, assertNotPaused, pause, resume };
