const r = require("express").Router(),
  prisma = require("../config/database"),
  {
    authenticate,
    verifiedVoterOnly,
  } = require("../middleware/auth.middleware"),
  { success, notFound } = require("../utils/response");
const {
  credentialStats,
  issueCredentialForVoter,
} = require("../services/nft.credential.service");
const TC = {
  BRONZE: "#CD7F32",
  SILVER: "#C0C0C0",
  GOLD: "#FFD700",
  PLATINUM: "#00D4FF",
};
r.use(authenticate);
const canView = (req, v) =>
  v.userId === req.user.id ||
  ["SUPER_ADMIN", "AUDITOR", "ELECTION_COMMISSION"].includes(req.user.role);
const escapeXml = (value) =>
  String(value ?? "").replace(/[<>&"']/g, (ch) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[
      ch
    ],
  );
r.get("/metadata/:voterId", async (req, res) => {
  const v = await prisma.voter.findUnique({
    where: { id: req.params.voterId },
  });
  if (!v) return res.status(404).json({ error: "Not found" });
  if (!canView(req, v))
    return res.status(403).json({ success: false, message: "Forbidden" });
  const tier = v.nftTier || "BRONZE";
  res.setHeader("Cache-Control", "private, no-store");
  res.json({
    name: `CipherVote Credential #${v.nftTokenId || 0}`,
    description: "Private soulbound voter credential",
    image: `/nft/image/${v.id}`,
    attributes: [
      { trait_type: "Tier", value: tier },
      {
        trait_type: "Credential Status",
        value: v.nftTokenId ? "Issued" : "Pending",
      },
    ],
  });
});
r.get("/image/:voterId", async (req, res) => {
  const v = await prisma.voter.findUnique({
    where: { id: req.params.voterId },
  });
  if (!v) return res.status(404).send("Not found");
  if (!canView(req, v)) return res.status(403).send("Forbidden");
  const tier = v.nftTier || "BRONZE";
  const color = TC[tier] || TC.BRONZE;
  const safeTier = escapeXml(tier);
  const safeToken = escapeXml(v.nftTokenId || "PENDING");
  const svg = `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="400" fill="#0a0a0a"/><rect x="2" y="2" width="396" height="396" fill="none" stroke="${color}" stroke-width="3"/><rect width="400" height="5" fill="${color}"/><text x="200" y="55" font-family="monospace" font-size="14" font-weight="900" fill="${color}" text-anchor="middle" letter-spacing="4">CIPHERVOTE</text><text x="200" y="80" font-family="monospace" font-size="10" fill="#707070" text-anchor="middle">PRIVATE VOTER CREDENTIAL</text><rect x="135" y="145" width="130" height="130" fill="${color}18" stroke="${color}" stroke-width="2"/><text x="200" y="215" font-family="monospace" font-size="36" font-weight="bold" fill="${color}" text-anchor="middle">CVC</text><rect x="150" y="300" width="100" height="26" fill="${color}33" stroke="${color}" stroke-width="1.5"/><text x="200" y="318" font-family="monospace" font-size="11" font-weight="bold" fill="${color}" text-anchor="middle">${safeTier}</text><text x="200" y="350" font-family="monospace" font-size="10" fill="#505050" text-anchor="middle">TOKEN #${safeToken}</text><rect y="390" width="400" height="10" fill="${color}" opacity="0.5"/></svg>`;
  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Content-Security-Policy", "default-src 'none'; script-src 'none'; object-src 'none'; base-uri 'none'");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.send(svg);
});
r.get("/mine", verifiedVoterOnly, async (req, res) => {
  let v = req.voter;
  if (!v?.nftTokenId && v.status === "VERIFIED" && !v.isBlacklisted) {
    const issued = await issueCredentialForVoter(v.id);
    v = issued.voter;
  }
  const stats = await credentialStats(v.id);
  if (!v?.nftTokenId)
    return success(res, {
      hasNFT: false,
      tier: stats.tier,
      electionsParticipated: stats.electionsParticipated,
      electionsEligible: stats.electionsEligible,
      source: "database",
    });
  return success(res, {
    hasNFT: true,
    tokenId: v.nftTokenId,
    tier: stats.tier || v.nftTier,
    electionsParticipated: stats.electionsParticipated,
    electionsEligible: stats.electionsEligible,
    metadataURL: `/nft/metadata/${v.id}`,
    imageURL: `/nft/image/${v.id}`,
    source: v.nftTokenId.startsWith("DEV-") ? "development-local" : "soulbound-nft",
  });
});
module.exports = r;
