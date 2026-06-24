const fs = require("fs"),
  path = require("path"),
  logger = require("./logger");
const loadContractAddresses = () => {
  const p = path.join(__dirname, "../../../blockchain/deployments/latest.json");
  try {
    if (fs.existsSync(p)) {
      const d = JSON.parse(fs.readFileSync(p, "utf8"));
      const m = {
        CONTRACT_ACCESS_CONTROL: d.contracts.AccessControl,
        CONTRACT_AUDIT_LOG: d.contracts.AuditLog,
        CONTRACT_ZKP_VERIFIER: d.contracts.ZKPVerifier,
        CONTRACT_VOTER_REGISTRY: d.contracts.VoterRegistry,
        CONTRACT_ELECTION_MANAGER: d.contracts.ElectionManager,
        CONTRACT_VOTING: d.contracts.Voting,
        CONTRACT_RESULT_TALLY: d.contracts.ResultTally,
        CONTRACT_EMERGENCY_CONTROL: d.contracts.EmergencyControl,
        CONTRACT_SOULBOUND_NFT: d.contracts.SoulboundVoterNFT,
      };
      let n = 0;
      Object.entries(m).forEach(([k, v]) => {
        if (!process.env[k] && v) {
          process.env[k] = v;
          n++;
        }
      });
      if (n > 0)
        logger.info(`✅ Loaded ${n} contract addresses from ${d.network}`);
      return true;
    }
  } catch (e) {
    logger.warn("Contract load failed:", e.message);
  }
  return false;
};
module.exports = { loadContractAddresses };
