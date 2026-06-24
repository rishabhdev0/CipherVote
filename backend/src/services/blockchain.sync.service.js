const prisma = require("../config/database");
const logger = require("../config/logger");
const blockchain = require("./blockchain.service");

async function getSyncState(contractName) {
  return prisma.blockchainSync.upsert({
    where: { contractName },
    update: {},
    create: {
      contractName,
      lastSyncedBlock: Number(process.env.SYNC_START_BLOCK || 0),
    },
  });
}

async function syncVotingEvents({ toBlock } = {}) {
  const contract = blockchain.getVotingContract(false);
  const state = await getSyncState("Voting");
  const latest = toBlock || (await blockchain.getProvider().getBlockNumber());
  const from = Math.max(
    state.lastSyncedBlock + 1,
    Number(process.env.SYNC_START_BLOCK || 0),
  );
  if (from > latest) return { from, to: latest, processed: 0 };
  const voteLogs = await contract.queryFilter(contract.filters.VoteCast(), from, latest);
  const encryptedLogs = contract.filters.EncryptedBallotCast
    ? await contract.queryFilter(contract.filters.EncryptedBallotCast(), from, latest)
    : [];
  const logs = [...voteLogs, ...encryptedLogs].sort((a, b) =>
    a.blockNumber === b.blockNumber ? a.index - b.index : a.blockNumber - b.blockNumber,
  );
  for (const event of logs) {
    const isEncrypted = event.fragment?.name === "EncryptedBallotCast";
    const voteHash = isEncrypted ? event.args.ballotHash : event.args.voteHash;
    await prisma.chainEvent.upsert({
      where: {
        chainId_transactionHash_logIndex: {
          chainId: Number(
            (await blockchain.getProvider().getNetwork()).chainId,
          ),
          transactionHash: event.transactionHash,
          logIndex: event.index,
        },
      },
      update: {
        processed: true,
        args: {
          voteHash,
          electionId: event.args.electionId?.toString(),
          zkpVerified: event.args.zkpVerified,
          encrypted: isEncrypted,
          ballotCommitment: isEncrypted ? event.args.ballotCommitment : undefined,
          nullifier: isEncrypted ? event.args.nullifier : undefined,
        },
      },
      create: {
        contractName: "Voting",
        eventName: isEncrypted ? "EncryptedBallotCast" : "VoteCast",
        chainId: Number((await blockchain.getProvider().getNetwork()).chainId),
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        logIndex: event.index,
        args: {
          voteHash,
          electionId: event.args.electionId?.toString(),
          zkpVerified: event.args.zkpVerified,
          encrypted: isEncrypted,
          ballotCommitment: isEncrypted ? event.args.ballotCommitment : undefined,
          nullifier: isEncrypted ? event.args.nullifier : undefined,
        },
        processed: true,
      },
    });
    await prisma.vote.updateMany({
      where: { voteHash, OR: [{ blockNumber: null }, { confirmations: null }] },
      data: {
        blockNumber: event.blockNumber,
        logIndex: event.index,
        confirmations: Math.max(0, latest - event.blockNumber + 1),
      },
    });
    await prisma.voteReceipt.updateMany({
      where: { blockchainTxHash: event.transactionHash, logIndex: event.index },
      data: { confirmations: Math.max(0, latest - event.blockNumber + 1) },
    });
  }
  await prisma.blockchainSync.update({
    where: { contractName: "Voting" },
    data: { lastSyncedBlock: latest, lastSyncedAt: new Date(), syncErrors: 0 },
  });
  logger.info(`Synced ${logs.length} Voting events from ${from} to ${latest}`);
  return { from, to: latest, processed: logs.length };
}

module.exports = { syncVotingEvents, getSyncState };
