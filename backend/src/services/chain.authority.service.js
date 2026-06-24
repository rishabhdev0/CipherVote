const blockchain = require("./blockchain.service");

const ELECTION_STATUS = [
  "DRAFT",
  "ACTIVE",
  "PAUSED",
  "CLOSED",
  "RESULTS_DECLARED",
];
const VOTER_STATUS = [
  "UNREGISTERED",
  "PENDING",
  "VERIFIED",
  "REJECTED",
  "BLACKLISTED",
];

function chainConfigured() {
  return Boolean(
    process.env.CONTRACT_ELECTION_MANAGER ||
      process.env.CONTRACT_VOTING ||
      process.env.CONTRACT_VOTER_REGISTRY ||
      process.env.NODE_ENV === "production",
  );
}

function voterWallet(voter) {
  return voter?.user?.walletAddress || voter?.walletAddress || null;
}

function unavailable(reason) {
  return {
    configured: chainConfigured(),
    available: false,
    reason,
  };
}

async function electionState(election) {
  if (!chainConfigured()) return unavailable("Blockchain contracts not configured");
  if (!election?.blockchainId)
    return unavailable("Election is not linked to an on-chain election");
  try {
    const manager = blockchain.getElectionManagerContract(false);
    const raw = await manager.getElection(election.blockchainId);
    const chainStatusCode = Number(raw.status);
    const chainRoot = raw.eligibilityRoot.toString();
    const totalVotes = process.env.CONTRACT_VOTING
      ? await blockchain.voting.getTotalVotes(election.blockchainId)
      : null;
    return {
      configured: true,
      available: true,
      electionId: Number(raw.id),
      statusCode: chainStatusCode,
      status: ELECTION_STATUS[chainStatusCode] || String(chainStatusCode),
      isActive: await manager.isElectionActive(election.blockchainId),
      candidateCount: Number(raw.candidateCount),
      eligibilityRoot: chainRoot,
      rootMatches:
        !election.merkleRoot || chainRoot === "0"
          ? false
          : String(election.merkleRoot) === chainRoot,
      totalVotes,
      db: {
        electionId: election.id,
        status: election.status,
        blockchainId: election.blockchainId,
        eligibilityRoot: election.merkleRoot,
        totalVotesCast: election.totalVotesCast,
      },
    };
  } catch (error) {
    return unavailable(error.shortMessage || error.reason || error.message);
  }
}

async function voterState(voter, election) {
  const wallet = voterWallet(voter);
  if (!wallet) return unavailable("Voter wallet not linked");
  try {
    const registry = blockchain.getVoterRegistryContract(false);
    const raw = await registry.getVoter(wallet);
    const registryStatusCode = Number(raw.status);
    const verified = await registry.isVoterVerified(wallet);
    const hasVoted =
      election?.blockchainId && process.env.CONTRACT_VOTING
        ? await blockchain.voting.voterHasVoted(wallet, election.blockchainId)
        : false;
    return {
      configured: true,
      available: true,
      wallet,
      registryStatusCode,
      registryStatus:
        VOTER_STATUS[registryStatusCode] || String(registryStatusCode),
      registryVerified: verified,
      registryConstituency: raw.constituency,
      registryBlacklisted: Boolean(raw.isBlacklisted),
      hasVoted,
      db: {
        voterId: voter.id,
        status: voter.status,
        walletAddress: voter.walletAddress,
        identityComplete:
          voter.faceVerified && voter.idVerified && voter.livenessVerified,
        isBlacklisted: voter.isBlacklisted,
      },
    };
  } catch (error) {
    return unavailable(error.shortMessage || error.reason || error.message);
  }
}

function chainCandidateId(chain) {
  return chain?.blockchainId || chain?.addCandidate?.blockchainId || null;
}

module.exports = {
  chainConfigured,
  electionState,
  voterState,
  voterWallet,
  chainCandidateId,
};
