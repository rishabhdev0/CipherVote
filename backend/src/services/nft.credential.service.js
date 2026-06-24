const crypto = require("crypto");
const prisma = require("../config/database");
const blockchain = require("./blockchain.service");

const requireChain = () =>
  process.env.NODE_ENV === "production" ||
  process.env.REQUIRE_CHAIN_LIFECYCLE === "true";
const requireNftChain = () => requireChain() || Boolean(process.env.CONTRACT_SOULBOUND_NFT);

function tierForParticipation(count) {
  if (count >= 10) return "PLATINUM";
  if (count >= 7) return "GOLD";
  if (count >= 3) return "SILVER";
  return "BRONZE";
}

function devTokenId(voterId) {
  return `DEV-${crypto.createHash("sha256").update(voterId).digest("hex").slice(0, 10).toUpperCase()}`;
}

async function credentialStats(voterId) {
  const [electionsParticipated, electionsEligible] = await Promise.all([
    prisma.vote.count({
      where: { voterId, status: "CONFIRMED" },
    }),
    prisma.electionVoterSelection.count({
      where: { voterId, status: "SELECTED" },
    }),
  ]);
  return {
    electionsParticipated,
    electionsEligible,
    tier: tierForParticipation(electionsParticipated),
  };
}

async function refreshLocalTier(voterId) {
  const stats = await credentialStats(voterId);
  await prisma.voter.update({
    where: { id: voterId },
    data: { nftTier: stats.tier },
  });
  return stats;
}

async function ensureOnChainCredential(voter) {
  const walletAddress = voter.walletAddress || voter.user?.walletAddress;
  if (!walletAddress || !requireNftChain()) return { tokenId: voter.nftTokenId, chain: null };

  const existing = await blockchain.soulboundNFT.getCredential(walletAddress);
  if (existing.tokenId && existing.tokenId !== "0")
    return { tokenId: existing.tokenId, chain: { recovered: true, tokenId: existing.tokenId } };

  const minted = await blockchain.soulboundNFT.mint(walletAddress);
  return { tokenId: minted.tokenId, chain: minted };
}

async function issueCredentialForVoter(voterOrId) {
  const voter =
    typeof voterOrId === "string"
      ? await prisma.voter.findUnique({
          where: { id: voterOrId },
          include: { user: true },
        })
      : voterOrId;
  if (!voter) throw new Error("Voter not found");
  if (voter.status !== "VERIFIED" || voter.isBlacklisted)
    throw new Error("Only verified non-blacklisted voters can receive credentials");

  const walletAddress = voter.walletAddress || voter.user?.walletAddress;
  if (!walletAddress && requireNftChain())
    throw new Error("Wallet address required to mint voter credential");

  let chain = null;
  let tokenId = voter.nftTokenId;

  if (walletAddress && requireNftChain()) {
    try {
      const ensured = await ensureOnChainCredential(voter);
      tokenId = ensured.tokenId;
      chain = ensured.chain;
    } catch (e) {
      if (requireNftChain()) throw e;
      chain = { skipped: true, error: e.message };
    }
  }

  if (!tokenId && !requireNftChain()) tokenId = devTokenId(voter.id);

  const stats = await credentialStats(voter.id);
  const updated = await prisma.voter.update({
    where: { id: voter.id },
    data: {
      nftTokenId: tokenId,
      nftTier: stats.tier,
      blockchainTxHash: chain?.hash || voter.blockchainTxHash,
    },
  });

  return { voter: updated, chain, ...stats };
}

async function recordEligibility(voterId) {
  const voter = await prisma.voter.findUnique({
    where: { id: voterId },
    include: { user: true },
  });
  if (!voter) return refreshLocalTier(voterId);
  const walletAddress = voter.walletAddress || voter.user?.walletAddress;
  if (walletAddress && requireNftChain()) {
    try {
      const ensured = await ensureOnChainCredential(voter);
      if (ensured.tokenId && ensured.tokenId !== voter.nftTokenId)
        await prisma.voter.update({
          where: { id: voter.id },
          data: { nftTokenId: ensured.tokenId },
        });
      await blockchain.soulboundNFT.incrementEligibleElections(walletAddress);
    } catch (e) {
      if (requireNftChain()) throw e;
    }
  }
  return refreshLocalTier(voterId);
}

async function recordParticipation(voterId, electionBlockchainId) {
  const voter = await prisma.voter.findUnique({
    where: { id: voterId },
    include: { user: true },
  });
  if (!voter) return refreshLocalTier(voterId);
  const walletAddress = voter.walletAddress || voter.user?.walletAddress;
  if (walletAddress && requireNftChain()) {
    try {
      const ensured = await ensureOnChainCredential(voter);
      if (ensured.tokenId && ensured.tokenId !== voter.nftTokenId)
        await prisma.voter.update({
          where: { id: voter.id },
          data: { nftTokenId: ensured.tokenId },
        });
      await blockchain.soulboundNFT.recordParticipation(
        walletAddress,
        electionBlockchainId || 0,
        "",
      );
    } catch (e) {
      if (requireNftChain()) throw e;
    }
  }
  return refreshLocalTier(voterId);
}

module.exports = {
  credentialStats,
  issueCredentialForVoter,
  recordEligibility,
  recordParticipation,
  refreshLocalTier,
};
