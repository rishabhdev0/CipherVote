require("dotenv").config();

const prisma = require("../config/database");
const { loadContractAddresses } = require("../config/contracts");
const blockchain = require("../services/blockchain.service");
const { ethers } = require("ethers");

loadContractAddresses();

const titleArg = process.argv[2];
const shouldDeclare = process.argv.includes("--declare");

async function chainWrite(fn) {
  let lastError;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const signer = blockchain.getSigner();
      if (typeof signer.reset === "function") signer.reset();
      return await fn();
    } catch (error) {
      lastError = error;
      const message = error.shortMessage || error.reason || error.message || "";
      if (!/nonce|Nonce/i.test(message)) throw error;
      await new Promise((resolve) => setTimeout(resolve, 500 + attempt * 250));
    }
  }
  throw lastError;
}

function identityHash(voter) {
  return ethers.keccak256(
    ethers.toUtf8Bytes(
      [
        voter.id,
        voter.voterIdNumber || "",
        voter.walletAddress || voter.user?.walletAddress || "",
      ].join(":"),
    ),
  );
}

function ageFromDob(dateOfBirth) {
  if (!dateOfBirth) return 18;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return 18;
  const now = new Date();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const beforeBirthday =
    now.getUTCMonth() < dob.getUTCMonth() ||
    (now.getUTCMonth() === dob.getUTCMonth() &&
      now.getUTCDate() < dob.getUTCDate());
  if (beforeBirthday) age -= 1;
  return Math.max(age, 18);
}

async function createChainElection(election) {
  const currentCount = Number(
    await blockchain.getElectionManagerContract(false).electionCount(),
  );
  const now = Date.now();
  const originalDuration = Math.max(
    new Date(election.endTime).getTime() - new Date(election.startTime).getTime(),
    7 * 24 * 60 * 60 * 1000,
  );
  const draftStart = new Date(now + 5 * 60 * 1000);
  const draftEnd = new Date(draftStart.getTime() + originalDuration);
  const chain = await chainWrite(() => blockchain.electionManager.createElection({
    title: election.title,
    description: election.description || "",
    constituency: election.constituency,
    startTime: draftStart,
    endTime: draftEnd,
  }));
  if (chain.blockchainId <= currentCount)
    throw new Error("ElectionManager did not create a new election");
  return chain;
}

async function setReplayWindow(election) {
  const duration = Math.max(
    new Date(election.endTime).getTime() - new Date(election.startTime).getTime(),
    7 * 24 * 60 * 60 * 1000,
  );
  const start = new Date(Date.now() - 10 * 1000);
  const end = new Date(start.getTime() + duration);
  await chainWrite(() => blockchain.electionManager.updateElectionWindow(
    election.blockchainId,
    start,
    end,
  ));
  await prisma.election.update({
    where: { id: election.id },
    data: { startTime: start, endTime: end },
  });
  return { start, end };
}

async function registerAndVerifySelectedVoters(electionId) {
  const selected = await prisma.electionVoterSelection.findMany({
    where: { electionId, status: "SELECTED" },
    include: { voter: { include: { user: true } } },
  });
  for (const row of selected) {
    const wallet = row.voter.walletAddress || row.voter.user?.walletAddress;
    if (!wallet) throw new Error(`Selected voter ${row.voter.id} has no wallet`);
    try {
      await chainWrite(() => blockchain.voterRegistry.registerVoter({
        walletAddress: wallet,
        identityHash: identityHash(row.voter),
        constituency: row.voter.constituency,
        age: ageFromDob(row.voter.dateOfBirth),
      }));
    } catch (error) {
      if (!/Already|registered|exists/i.test(error.message)) throw error;
    }
    try {
      await chainWrite(() => blockchain.voterRegistry.verifyVoter(wallet));
    } catch (error) {
      if (
        /Not pending/i.test(error.message) &&
        (await blockchain.voterRegistry.isVoterVerified(wallet))
      )
        continue;
      if (!/Already|verified/i.test(error.message)) throw error;
    }
  }
  return selected.length;
}

async function addCandidates(election) {
  const candidates = await prisma.candidate.findMany({
    where: { electionId: election.id, isActive: true },
    orderBy: { createdAt: "asc" },
  });
  for (const candidate of candidates) {
    const chain = await chainWrite(() => blockchain.electionManager.addCandidate(
      election.blockchainId,
      {
        name: candidate.name,
        party: candidate.party,
        metadataURI: candidate.manifesto || "",
      },
    ));
    await prisma.candidate.update({
      where: { id: candidate.id },
      data: { blockchainId: chain.blockchainId },
    });
  }
  return candidates.length;
}

async function replayEncryptedBallots(election) {
  const votes = await prisma.vote.findMany({
    where: { electionId: election.id, status: "CONFIRMED" },
    include: { voter: { include: { user: true } } },
    orderBy: { castAt: "asc" },
  });
  let replayed = 0;
  for (const vote of votes) {
    const ballot = await prisma.encryptedBallot.findUnique({
      where: { receiptHash: vote.receiptHash },
    });
    if (!ballot) {
      console.warn(`Skipping vote ${vote.id}: encrypted ballot missing`);
      continue;
    }
    const wallet = vote.voter.walletAddress || vote.voter.user?.walletAddress;
    if (!wallet) throw new Error(`Vote ${vote.id} voter has no wallet`);
    const already = await blockchain.voting.voterHasVoted(
      wallet,
      election.blockchainId,
    );
    if (already) continue;
    const result = await chainWrite(() => blockchain.voting.castEncryptedBallot({
      voterAddress: wallet,
      electionId: election.blockchainId,
      ballotCommitment: ballot.ballotCommitment,
      nullifierHash: ballot.nullifierHash,
      eligibilityRoot: ballot.eligibilityRoot || election.merkleRoot,
      proofCommitment: ballot.proofCommitment || 0,
      pA: [0, 0],
      pB: [
        [0, 0],
        [0, 0],
      ],
      pC: [0, 0],
    }));
    await prisma.vote.update({
      where: { id: vote.id },
      data: {
        voteHash: result.voteHash,
        blockchainTxHash: result.hash,
        blockNumber: result.blockNumber,
        logIndex: result.logIndex,
        chainId: result.chainId,
        confirmations: result.confirmations,
      },
    });
    await prisma.encryptedBallot.update({
      where: { id: ballot.id },
      data: {
        blockchainTxHash: result.hash,
        blockNumber: result.blockNumber,
        logIndex: result.logIndex,
        chainId: result.chainId,
        confirmations: result.confirmations,
      },
    });
    if (vote.receiptHash) {
      await prisma.voteReceipt.updateMany({
        where: { publicReceiptHash: vote.receiptHash },
        data: {
          blockchainTxHash: result.hash,
          blockNumber: result.blockNumber,
          logIndex: result.logIndex,
          chainId: result.chainId,
          confirmations: result.confirmations,
        },
      });
    }
    replayed++;
  }
  return replayed;
}

function decodeDevBallotPayload(encryptedPayload) {
  const envelope = JSON.parse(encryptedPayload);
  if (envelope.scheme !== "DEV_BASE64_NOT_FOR_PRODUCTION") return null;
  return JSON.parse(Buffer.from(envelope.ciphertext, "base64").toString("utf8"));
}

async function tallyDevEncryptedBallots(electionId) {
  const ballots = await prisma.encryptedBallot.findMany({
    where: { electionId, status: "CONFIRMED" },
  });
  const counts = new Map();
  let notaVotes = 0;
  for (const ballot of ballots) {
    const payload = decodeDevBallotPayload(ballot.encryptedPayload);
    if (payload?.isNota || payload?.candidateId === "NOTA") {
      notaVotes++;
      continue;
    }
    if (payload?.candidateId)
      counts.set(payload.candidateId, (counts.get(payload.candidateId) || 0) + 1);
  }
  await prisma.$transaction(async (tx) => {
    await tx.candidate.updateMany({
      where: { electionId },
      data: { voteCount: 0 },
    });
    for (const [candidateId, count] of counts.entries()) {
      await tx.candidate.update({
        where: { id: candidateId },
        data: { voteCount: count },
      });
    }
    await tx.election.update({ where: { id: electionId }, data: { notaVotes } });
  });
  return { candidates: Object.fromEntries(counts), notaVotes };
}

async function main() {
  if (!titleArg) {
    throw new Error(
      "Usage: node src/utils/repair-local-chain-election.js <election-title> [--declare]",
    );
  }
  if (process.env.NODE_ENV === "production")
    throw new Error("This repair utility is local-development only");
  const election = await prisma.election.findFirst({
    where: { title: titleArg },
    include: { candidates: true },
  });
  if (!election) throw new Error(`Election not found: ${titleArg}`);
  if (!election.merkleRoot)
    throw new Error("Election must have an eligibility Merkle root first");

  const chainElection = await createChainElection(election);
  const linked = await prisma.election.update({
    where: { id: election.id },
    data: { blockchainId: chainElection.blockchainId },
  });
  const selectedVoters = await registerAndVerifySelectedVoters(election.id);
  const candidates = await addCandidates(linked);
  await chainWrite(() => blockchain.electionManager.setEligibilityRoot(
    chainElection.blockchainId,
    election.merkleRoot,
  ));
  await setReplayWindow({
    ...election,
    blockchainId: chainElection.blockchainId,
  });
  if (["ACTIVE", "CLOSED", "RESULTS_DECLARED"].includes(election.status)) {
    await chainWrite(() =>
      blockchain.electionManager.activateElection(chainElection.blockchainId),
    );
  }
  const replayedVotes = await replayEncryptedBallots({
    ...linked,
    blockchainId: chainElection.blockchainId,
    merkleRoot: election.merkleRoot,
  });
  let declared = false;
  let tally = null;
  if (shouldDeclare) {
    await chainWrite(() =>
      blockchain.electionManager.closeElection(chainElection.blockchainId),
    );
    await chainWrite(() =>
      blockchain.electionManager.declareResults(chainElection.blockchainId),
    );
    await prisma.election.update({
      where: { id: election.id },
      data: {
        status: "RESULTS_DECLARED",
        certifiedAt: new Date(),
        challengeEndsAt: new Date(),
      },
    });
    tally = await tallyDevEncryptedBallots(election.id);
    declared = true;
  }
  const onChainTotal = await blockchain.voting.getTotalVotes(
    chainElection.blockchainId,
  );
  console.log(
    JSON.stringify(
      {
        election: election.title,
        blockchainId: chainElection.blockchainId,
        selectedVoters,
        candidates,
        replayedVotes,
        onChainTotal,
        declared,
        tally,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
