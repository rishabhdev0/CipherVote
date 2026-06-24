require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const { ethers } = require("ethers");

const prisma = new PrismaClient();

function wallet(seed) {
  return new ethers.Wallet(ethers.keccak256(ethers.toUtf8Bytes(seed))).address;
}

async function deleteIfModel(modelName, where = {}) {
  if (!prisma[modelName]) return;
  try {
    await prisma[modelName].deleteMany({ where });
  } catch (error) {
    if (error.code === "P2021") {
      console.warn(`Skipping ${modelName}: table does not exist yet`);
      return;
    }
    throw error;
  }
}

async function upsertUser({ email, password, role, walletSeed }) {
  return prisma.user.upsert({
    where: { email },
    update: {
      passwordHash: await bcrypt.hash(password, 10),
      role,
      walletAddress: wallet(walletSeed),
      isEmailVerified: true,
      isPhoneVerified: true,
      failedLoginAttempts: 0,
      loginLockedUntil: null,
    },
    create: {
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role,
      walletAddress: wallet(walletSeed),
      isEmailVerified: true,
      isPhoneVerified: true,
    },
  });
}

async function seed() {
  console.log("\nSeeding CipherVote clean system accounts...\n");

  await deleteIfModel("voteReceipt");
  await deleteIfModel("encryptedBallot");
  await deleteIfModel("votePrivacySignal");
  await deleteIfModel("vote");
  await deleteIfModel("eligibilityCommitment");
  await deleteIfModel("electionVoterSelection");
  await deleteIfModel("candidate");
  await deleteIfModel("candidateApplication");
  await deleteIfModel("delegation");
  await deleteIfModel("disputeEvidence");
  await deleteIfModel("dispute");
  await deleteIfModel("identityAppeal");
  await deleteIfModel("identityVerificationReview");
  await deleteIfModel("uploadedDocument");
  await deleteIfModel("fraudLog");
  await deleteIfModel("chainEvent");
  await deleteIfModel("blockchainSync");
  await deleteIfModel("auditAnchor");
  await deleteIfModel("auditLog");
  await deleteIfModel("notification");
  await deleteIfModel("election");
  await deleteIfModel("voter");
  await deleteIfModel("refreshSession");
  await deleteIfModel("otpChallenge");
  await deleteIfModel("walletNonce");
  await prisma.user.deleteMany({
    where: {
      OR: [
        { email: { endsWith: "@demo.ciphervote.io" } },
        { email: "pending@demo.ciphervote.io" },
      ],
    },
  });

  await upsertUser({
    email: "admin@ciphervote.io",
    password: "Admin@123456",
    role: "SUPER_ADMIN",
    walletSeed: "ciphervote-super-admin",
  });

  await upsertUser({
    email: "ec@ciphervote.io",
    password: "EC@123456",
    role: "ELECTION_COMMISSION",
    walletSeed: "ciphervote-election-commission",
  });

  await upsertUser({
    email: "auditor@ciphervote.io",
    password: "Audit@123456",
    role: "AUDITOR",
    walletSeed: "ciphervote-auditor",
  });

  await prisma.systemState.upsert({
    where: { id: "global" },
    update: { emergencyPaused: false, pauseReason: null, resumedAt: new Date() },
    create: { id: "global", emergencyPaused: false },
  });

  console.log("Clean seed complete. No demo voters, elections, candidates, votes, or fraud logs were created.");
  console.log("SUPER_ADMIN: admin@ciphervote.io / Admin@123456");
  console.log("ELECTION_COMMISSION: ec@ciphervote.io / EC@123456");
  console.log("AUDITOR: auditor@ciphervote.io / Audit@123456\n");
}

seed()
  .then(() => prisma.$disconnect())
  .catch((error) => {
    console.error("Seed failed:", error);
    prisma.$disconnect();
    process.exit(1);
  });
