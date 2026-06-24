const { ethers } = require("ethers");
const logger = require("../config/logger");
const { loadAbi } = require("../config/contract-artifacts");

let provider,
  signer,
  contracts = {};
const fallbackVotingAbi = [
  "function castVote(uint256 eId,uint256 cId,bytes32 salt,uint256 commitment,uint256 nullifier,uint256 eligibilityRoot,uint256[2] pA,uint256[2][2] pB,uint256[2] pC) external",
  "function castVoteFor(address voter,uint256 eId,uint256 cId,bytes32 salt,uint256 commitment,uint256 nullifier,uint256 eligibilityRoot,uint256[2] pA,uint256[2][2] pB,uint256[2] pC) external",
  "function castEncryptedBallotFor(address voter,uint256 eId,bytes32 ballotCommitment,uint256 nullifier,uint256 eligibilityRoot,uint256 proofCommitment,uint256[2] pA,uint256[2][2] pB,uint256[2] pC) external",
  "function getCandidateVotes(uint256 eId,uint256 cId) external view returns(uint256)",
  "function getTotalVotes(uint256 eId) external view returns(uint256)",
  "function voterHasVoted(address voter,uint256 eId) external view returns(bool)",
  "function nullifiersUsed(bytes32 nullifier) external view returns(bool)",
  "event VoteCast(bytes32 indexed voteHash,uint256 indexed electionId,uint256 timestamp,bytes32 commitment,bool zkpVerified)",
  "event EncryptedBallotCast(bytes32 indexed ballotHash,uint256 indexed electionId,address indexed voter,bytes32 ballotCommitment,bytes32 nullifier,bool zkpVerified)",
];
const fallbackZkpAbi = [
  "function verifyProofView(uint256[2] pA,uint256[2][2] pB,uint256[2] pC,uint256[] pub) external view returns(bool)",
];
const votingAbi = loadAbi("Voting", fallbackVotingAbi);
const zkpAbi = loadAbi("ZKPVerifier", fallbackZkpAbi);
const electionManagerAbi = loadAbi("ElectionManager", [
  "function createElection(string title,string description,string constituency,uint256 start,uint256 end) external returns(uint256)",
  "function addCandidate(uint256 eId,string name,string party,string metadataURI) external",
  "function setEligibilityRoot(uint256 eId,uint256 root) external",
  "function updateElectionWindow(uint256 eId,uint256 start,uint256 end) external",
  "function activateElection(uint256 eId) external",
  "function pauseElection(uint256 eId) external",
  "function resumeElection(uint256 eId) external",
  "function closeElection(uint256 eId) external",
  "function declareResults(uint256 eId) external",
  "event ElectionCreated(uint256 indexed electionId,string title)",
  "event CandidateAdded(uint256 indexed electionId,uint256 candidateId)",
  "event EligibilityRootUpdated(uint256 indexed electionId,uint256 root)",
  "event ElectionWindowUpdated(uint256 indexed electionId,uint256 startTime,uint256 endTime)",
  "event ElectionActivated(uint256 indexed electionId)",
  "event ElectionClosed(uint256 indexed electionId)",
  "event ResultsDeclared(uint256 indexed electionId)",
]);
const voterRegistryAbi = loadAbi("VoterRegistry", [
  "function registerVoter(address wallet,bytes32 idHash,string constituency,uint256 age) external",
  "function verifyVoter(address wallet) external",
  "function blacklistVoter(address wallet,string reason) external",
  "function isVoterVerified(address wallet) external view returns(bool)",
  "event VoterRegistered(address indexed wallet,string constituency)",
  "event VoterVerified(address indexed wallet,uint256 timestamp)",
  "event VoterBlacklisted(address indexed wallet,string reason)",
]);
const emergencyControlAbi = loadAbi("EmergencyControl", [
  "function pauseSystem(string reason) external",
  "function resumeSystem() external",
  "function systemPaused() external view returns(bool)",
  "event SystemPaused(address indexed by,string reason)",
  "event SystemResumed(address indexed by)",
]);
const soulboundNFTAbi = loadAbi("SoulboundVoterNFT", [
  "function mint(address voter) external returns(uint256)",
  "function recordParticipation(address voter,uint256 eId,string metadataURI) external",
  "function incrementEligibleElections(address voter) external",
  "function getCredential(address voter) external view returns(tuple(uint256 tokenId,uint256 issuedAt,uint256 electionsParticipated,uint256 electionsEligible,uint8 tier,bool isRevoked))",
  "function getTierName(address voter) external view returns(string)",
  "event CredentialMinted(address indexed voter,uint256 tokenId)",
  "event ParticipationRecorded(address indexed voter,uint256 electionId)",
]);

const getProvider = () => {
  if (!provider) {
    const url =
      process.env.RPC_URL ||
      process.env.SEPOLIA_RPC_URL ||
      "http://127.0.0.1:8545";
    const chainId = Number(
      process.env.CHAIN_ID ||
        process.env.NETWORK_CHAIN_ID ||
        (/localhost|127\.0\.0\.1/.test(url) ? 31337 : 0),
    );
    provider = chainId
      ? new ethers.JsonRpcProvider(url, chainId, { staticNetwork: true })
      : new ethers.JsonRpcProvider(url);
  }
  return provider;
};
const getSigner = () => {
  if (!signer) {
    const pk = process.env.PRIVATE_KEY;
    if (!pk) throw new Error("PRIVATE_KEY required for blockchain writes");
    signer = new ethers.NonceManager(new ethers.Wallet(pk, getProvider()));
  }
  return signer;
};
const getContract = (name, address, abi, write = false) => {
  if (!address) throw new Error(`${name} address not configured`);
  const key = `${name}:${write}`;
  if (!contracts[key])
    contracts[key] = new ethers.Contract(
      address,
      abi,
      write ? getSigner() : getProvider(),
    );
  return contracts[key];
};
const getVotingContract = (write = false) =>
  getContract("Voting", process.env.CONTRACT_VOTING, votingAbi, write);
const getElectionManagerContract = (write = false) =>
  getContract(
    "ElectionManager",
    process.env.CONTRACT_ELECTION_MANAGER,
    electionManagerAbi,
    write,
  );
const getVoterRegistryContract = (write = false) =>
  getContract(
    "VoterRegistry",
    process.env.CONTRACT_VOTER_REGISTRY,
    voterRegistryAbi,
    write,
  );
const getEmergencyControlContract = (write = false) =>
  getContract(
    "EmergencyControl",
    process.env.CONTRACT_EMERGENCY_CONTROL,
    emergencyControlAbi,
    write,
  );
const getSoulboundNFTContract = (write = false) =>
  getContract(
    "SoulboundVoterNFT",
    process.env.CONTRACT_SOULBOUND_NFT,
    soulboundNFTAbi,
    write,
  );
const normalizeBytes32 = (v) => {
  if (!v) return ethers.ZeroHash;
  if (v instanceof Uint8Array) return ethers.hexlify(v);
  if (typeof v === "string" && ethers.isHexString(v, 32)) return v;
  return ethers.keccak256(ethers.toUtf8Bytes(String(v)));
};
const parseVoteEvent = (receipt, contract) => {
  for (const log of receipt.logs) {
    try {
      const p = contract.interface.parseLog(log);
      if (p?.name === "VoteCast")
        return {
          voteHash: p.args.voteHash,
          zkpVerified: p.args.zkpVerified,
          logIndex: log.index,
        };
    } catch {}
  }
  return null;
};
const parseEncryptedBallotEvent = (receipt, contract) => {
  for (const log of receipt.logs) {
    try {
      const p = contract.interface.parseLog(log);
      if (p?.name === "EncryptedBallotCast")
        return {
          ballotHash: p.args.ballotHash,
          ballotCommitment: p.args.ballotCommitment,
          nullifier: p.args.nullifier,
          zkpVerified: p.args.zkpVerified,
          logIndex: log.index,
        };
    } catch {}
  }
  return null;
};
const parseEvent = (receipt, contract, name) => {
  for (const log of receipt.logs) {
    try {
      const p = contract.interface.parseLog(log);
      if (p?.name === name) return { args: p.args, logIndex: log.index };
    } catch {}
  }
  return null;
};
const receiptMeta = async (receipt, tx) => {
  const network = await getProvider().getNetwork();
  return {
    hash: receipt.hash || tx.hash,
    blockNumber: receipt.blockNumber,
    chainId: Number(network.chainId),
    confirmations: Number(process.env.BLOCK_CONFIRMATIONS || 1),
    gasUsed: receipt.gasUsed?.toString(),
  };
};

const voting = {
  voterHasVoted: async (voterAddress, electionId) => {
    const contract = getVotingContract(false);
    return contract.voterHasVoted(voterAddress, Number(electionId));
  },
  getTotalVotes: async (electionId) => {
    const contract = getVotingContract(false);
    return Number(await contract.getTotalVotes(Number(electionId)));
  },
  getCandidateVotes: async (electionId, candidateId) => {
    const contract = getVotingContract(false);
    return Number(
      await contract.getCandidateVotes(Number(electionId), Number(candidateId)),
    );
  },
  isNullifierUsed: async (nullifierHash) => {
    const contract = getVotingContract(false);
    return contract.nullifiersUsed(normalizeBytes32(nullifierHash));
  },
  castVote: async (
    voterAddress,
    eId,
    cId,
    salt,
    commitment = 0,
    nullifier = 0,
    eligibilityRoot = 0,
    pA = [0, 0],
    pB = [
      [0, 0],
      [0, 0],
    ],
    pC = [0, 0],
  ) => {
    const address = process.env.CONTRACT_VOTING;
    const contract = getVotingContract(true);
    logger.info(`Submitting relayed vote tx: election=${eId} candidate=${cId}`);
    const tx = await contract.castVoteFor(
      voterAddress,
      Number(eId),
      Number(cId),
      normalizeBytes32(salt),
      BigInt(commitment || 0),
      BigInt(nullifier || 0),
      BigInt(eligibilityRoot || 0),
      pA,
      pB,
      pC,
    );
    const receipt = await tx.wait(Number(process.env.BLOCK_CONFIRMATIONS || 1));
    const parsed = parseVoteEvent(receipt, contract);
    if (!parsed) throw new Error("VoteCast event not found in receipt");
    const network = await getProvider().getNetwork();
    return {
      hash: receipt.hash || tx.hash,
      voteHash: parsed.voteHash,
      status: receipt.status === 1 ? "success" : "failed",
      blockNumber: receipt.blockNumber,
      logIndex: parsed.logIndex,
      chainId: Number(network.chainId),
      confirmations: Number(process.env.BLOCK_CONFIRMATIONS || 1),
      zkpVerified: parsed.zkpVerified,
      gasUsed: receipt.gasUsed?.toString(),
    };
  },
  castEncryptedBallot: async ({
    voterAddress,
    electionId,
    ballotCommitment,
    nullifierHash,
    eligibilityRoot = 0,
    proofCommitment = 0,
    pA = [0, 0],
    pB = [
      [0, 0],
      [0, 0],
    ],
    pC = [0, 0],
  }) => {
    const contract = getVotingContract(true);
    logger.info(`Submitting encrypted ballot tx: election=${electionId}`);
    const tx = await contract.castEncryptedBallotFor(
      voterAddress,
      Number(electionId),
      normalizeBytes32(ballotCommitment),
      BigInt(nullifierHash || 0),
      BigInt(eligibilityRoot || 0),
      BigInt(proofCommitment || 0),
      pA,
      pB,
      pC,
    );
    const receipt = await tx.wait(Number(process.env.BLOCK_CONFIRMATIONS || 1));
    const parsed = parseEncryptedBallotEvent(receipt, contract);
    if (!parsed)
      throw new Error("EncryptedBallotCast event not found in receipt");
    const network = await getProvider().getNetwork();
    return {
      hash: receipt.hash || tx.hash,
      voteHash: parsed.ballotHash,
      ballotCommitment: parsed.ballotCommitment,
      nullifierHash: parsed.nullifier,
      status: receipt.status === 1 ? "success" : "failed",
      blockNumber: receipt.blockNumber,
      logIndex: parsed.logIndex,
      chainId: Number(network.chainId),
      confirmations: Number(process.env.BLOCK_CONFIRMATIONS || 1),
      zkpVerified: parsed.zkpVerified,
      gasUsed: receipt.gasUsed?.toString(),
    };
  },
};

const zkpVerifier = {
  verifyVoteProof: async (
    pA,
    pB,
    pC,
    commitment,
    electionId,
    maxCandidates,
    nullifier,
    eligibilityRoot,
  ) => {
    const address = process.env.CONTRACT_ZKP_VERIFIER;
    if (!address) return false;
    const contract = getContract("ZKPVerifier", address, zkpAbi, false);
    return contract.verifyProofView(pA, pB, pC, [
      commitment,
      electionId,
      maxCandidates,
      nullifier,
      eligibilityRoot,
    ]);
  },
};

const electionManager = {
  createElection: async ({
    title,
    description,
    constituency,
    startTime,
    endTime,
  }) => {
    const contract = getElectionManagerContract(true);
    const tx = await contract.createElection(
      title,
      description || "",
      constituency,
      Math.floor(new Date(startTime).getTime() / 1000),
      Math.floor(new Date(endTime).getTime() / 1000),
    );
    const receipt = await tx.wait(Number(process.env.BLOCK_CONFIRMATIONS || 1));
    const parsed = parseEvent(receipt, contract, "ElectionCreated");
    if (!parsed) throw new Error("ElectionCreated event not found");
    return {
      blockchainId: Number(parsed.args.electionId),
      logIndex: parsed.logIndex,
      ...(await receiptMeta(receipt, tx)),
    };
  },
  addCandidate: async (electionId, { name, party, metadataURI = "" }) => {
    const contract = getElectionManagerContract(true);
    const tx = await contract.addCandidate(
      Number(electionId),
      name,
      party,
      metadataURI,
    );
    const receipt = await tx.wait(Number(process.env.BLOCK_CONFIRMATIONS || 1));
    const parsed = parseEvent(receipt, contract, "CandidateAdded");
    if (!parsed) throw new Error("CandidateAdded event not found");
    return {
      blockchainId: Number(parsed.args.candidateId),
      logIndex: parsed.logIndex,
      ...(await receiptMeta(receipt, tx)),
    };
  },
  setEligibilityRoot: async (electionId, root) => {
    const contract = getElectionManagerContract(true);
    const tx = await contract.setEligibilityRoot(
      Number(electionId),
      BigInt(root),
    );
    const receipt = await tx.wait(Number(process.env.BLOCK_CONFIRMATIONS || 1));
    const parsed = parseEvent(receipt, contract, "EligibilityRootUpdated");
    if (!parsed) throw new Error("EligibilityRootUpdated event not found");
    return { logIndex: parsed.logIndex, ...(await receiptMeta(receipt, tx)) };
  },
  updateElectionWindow: async (electionId, startTime, endTime) => {
    const contract = getElectionManagerContract(true);
    const tx = await contract.updateElectionWindow(
      Number(electionId),
      Math.floor(new Date(startTime).getTime() / 1000),
      Math.floor(new Date(endTime).getTime() / 1000),
    );
    const receipt = await tx.wait(Number(process.env.BLOCK_CONFIRMATIONS || 1));
    const parsed = parseEvent(receipt, contract, "ElectionWindowUpdated");
    if (!parsed) throw new Error("ElectionWindowUpdated event not found");
    return { logIndex: parsed.logIndex, ...(await receiptMeta(receipt, tx)) };
  },
  activateElection: async (electionId) => {
    const contract = getElectionManagerContract(true);
    const tx = await contract.activateElection(Number(electionId));
    const receipt = await tx.wait(Number(process.env.BLOCK_CONFIRMATIONS || 1));
    return await receiptMeta(receipt, tx);
  },
  pauseElection: async (electionId) => {
    const contract = getElectionManagerContract(true);
    const tx = await contract.pauseElection(Number(electionId));
    const receipt = await tx.wait(Number(process.env.BLOCK_CONFIRMATIONS || 1));
    return await receiptMeta(receipt, tx);
  },
  resumeElection: async (electionId) => {
    const contract = getElectionManagerContract(true);
    const tx = await contract.resumeElection(Number(electionId));
    const receipt = await tx.wait(Number(process.env.BLOCK_CONFIRMATIONS || 1));
    return await receiptMeta(receipt, tx);
  },
  closeElection: async (electionId) => {
    const contract = getElectionManagerContract(true);
    const tx = await contract.closeElection(Number(electionId));
    const receipt = await tx.wait(Number(process.env.BLOCK_CONFIRMATIONS || 1));
    return await receiptMeta(receipt, tx);
  },
  declareResults: async (electionId) => {
    const contract = getElectionManagerContract(true);
    const tx = await contract.declareResults(Number(electionId));
    const receipt = await tx.wait(Number(process.env.BLOCK_CONFIRMATIONS || 1));
    return await receiptMeta(receipt, tx);
  },
};

const voterRegistry = {
  isVoterVerified: async (walletAddress) =>
    getVoterRegistryContract(false).isVoterVerified(walletAddress),
  registerVoter: async ({ walletAddress, identityHash, constituency, age }) => {
    const contract = getVoterRegistryContract(true);
    const idHash = normalizeBytes32(identityHash);
    const tx = await contract.registerVoter(
      walletAddress,
      idHash,
      constituency,
      Number(age || 0),
    );
    const receipt = await tx.wait(Number(process.env.BLOCK_CONFIRMATIONS || 1));
    const parsed = parseEvent(receipt, contract, "VoterRegistered");
    if (!parsed) throw new Error("VoterRegistered event not found");
    return { logIndex: parsed.logIndex, ...(await receiptMeta(receipt, tx)) };
  },
  verifyVoter: async (walletAddress) => {
    const contract = getVoterRegistryContract(true);
    const tx = await contract.verifyVoter(walletAddress);
    const receipt = await tx.wait(Number(process.env.BLOCK_CONFIRMATIONS || 1));
    const parsed = parseEvent(receipt, contract, "VoterVerified");
    if (!parsed) throw new Error("VoterVerified event not found");
    return { logIndex: parsed.logIndex, ...(await receiptMeta(receipt, tx)) };
  },
  blacklistVoter: async (walletAddress, reason) => {
    const contract = getVoterRegistryContract(true);
    const tx = await contract.blacklistVoter(walletAddress, reason || "");
    const receipt = await tx.wait(Number(process.env.BLOCK_CONFIRMATIONS || 1));
    return await receiptMeta(receipt, tx);
  },
};

const emergencyControl = {
  pauseSystem: async (reason) => {
    const contract = getEmergencyControlContract(true);
    const tx = await contract.pauseSystem(reason || "Emergency pause");
    const receipt = await tx.wait(Number(process.env.BLOCK_CONFIRMATIONS || 1));
    return await receiptMeta(receipt, tx);
  },
  resumeSystem: async () => {
    const contract = getEmergencyControlContract(true);
    const tx = await contract.resumeSystem();
    const receipt = await tx.wait(Number(process.env.BLOCK_CONFIRMATIONS || 1));
    return await receiptMeta(receipt, tx);
  },
  isPaused: async () => getEmergencyControlContract(false).systemPaused(),
};

const tierNames = ["BRONZE", "SILVER", "GOLD", "PLATINUM"];
const soulboundNFT = {
  mint: async (voterAddress) => {
    const contract = getSoulboundNFTContract(true);
    const tx = await contract.mint(voterAddress);
    const receipt = await tx.wait(Number(process.env.BLOCK_CONFIRMATIONS || 1));
    const parsed = parseEvent(receipt, contract, "CredentialMinted");
    if (!parsed) throw new Error("CredentialMinted event not found");
    return {
      tokenId: parsed.args.tokenId.toString(),
      logIndex: parsed.logIndex,
      ...(await receiptMeta(receipt, tx)),
    };
  },
  recordParticipation: async (voterAddress, electionId, metadataURI = "") => {
    const contract = getSoulboundNFTContract(true);
    const tx = await contract.recordParticipation(
      voterAddress,
      Number(electionId || 0),
      metadataURI,
    );
    const receipt = await tx.wait(Number(process.env.BLOCK_CONFIRMATIONS || 1));
    return await receiptMeta(receipt, tx);
  },
  getTierName: async (voterAddress) =>
    getSoulboundNFTContract(false).getTierName(voterAddress),
  incrementEligibleElections: async (voterAddress) => {
    const contract = getSoulboundNFTContract(true);
    const tx = await contract.incrementEligibleElections(voterAddress);
    const receipt = await tx.wait(Number(process.env.BLOCK_CONFIRMATIONS || 1));
    return await receiptMeta(receipt, tx);
  },
  getCredential: async (voterAddress) => {
    const c = await getSoulboundNFTContract(false).getCredential(voterAddress);
    return {
      tokenId: c.tokenId.toString(),
      issuedAt: Number(c.issuedAt),
      electionsParticipated: Number(c.electionsParticipated),
      electionsEligible: Number(c.electionsEligible),
      tier: tierNames[Number(c.tier)] || "BRONZE",
      isRevoked: Boolean(c.isRevoked),
    };
  },
};
module.exports = {
  getProvider,
  getSigner,
  getVotingContract,
  getElectionManagerContract,
  getVoterRegistryContract,
  getEmergencyControlContract,
  getSoulboundNFTContract,
  voting,
  zkpVerifier,
  electionManager,
  voterRegistry,
  emergencyControl,
  soulboundNFT,
  contracts,
};
