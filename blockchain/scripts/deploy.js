 require("dotenv").config();
const { ethers } = require("hardhat");
const fs = require("fs"),
  path = require("path");
async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  console.log(`\n🚀 Deploying to ${network.name} (${network.chainId})`);
  console.log(`📌 Deployer: ${deployer.address}\n`);
  const deployed = {};
  const deploy = async (name, ...args) => {
    const F = await ethers.getContractFactory(name);
    const c = await F.deploy(...args);
    await c.waitForDeployment();
    const addr = await c.getAddress();
    deployed[name] = addr;
    console.log(`✅ ${name}: ${addr}`);
    return c;
  };
  const auditLog = await deploy("AuditLog");
  const ac = await deploy("CipherVoteAccessControl");
  const zkpV = await deploy("ZKPVerifier");
  const vr = await deploy("VoterRegistry");
  const em = await deploy("ElectionManager");
  const voting = await deploy("Voting");
  const rt = await deploy("ResultTally");
  const ec = await deploy("EmergencyControl");
  const ms = await deploy("MultiSig", [deployer.address], 1);
  const vd = await deploy("VoteDelegation");
  const dr = await deploy("DisputeResolution");
  const mw = await deploy("MerkleWhitelist");
  const nft = await deploy("SoulboundVoterNFT");
  await voting.initialize(
    await zkpV.getAddress(),
    await em.getAddress(),
    await vr.getAddress(),
    await ec.getAddress(),
  );
  const relayer = process.env.BACKEND_RELAYER_ADDRESS || deployer.address;
  await voting.setRelayer(relayer, true);
  await auditLog.setTrustedWriter(await voting.getAddress(), true);
  await auditLog.setTrustedWriter(relayer, true);
  if (
    process.env.ZKP_REQUIRED === "true" ||
    process.env.NODE_ENV === "production"
  )
    await voting.setZKPRequired(true);
  const governanceOwner = process.env.GOVERNANCE_MULTISIG_ADDRESS;
  if (governanceOwner) {
    for (const c of [auditLog, zkpV, vr, em, voting, rt, ec, vd, dr, mw, nft]) {
      if (c.transferOwnership) {
        const tx = await c.transferOwnership(governanceOwner);
        await tx.wait();
      }
    }
    console.log(
      `\nGovernance ownership transferred to multisig: ${governanceOwner}`,
    );
  }
  console.log(`\n🔗 Voting initialized; relayer authorized: ${relayer}`);
  const dir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const dep = {
    network: network.name,
    chainId: Number(network.chainId),
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    contracts: {
      AccessControl: deployed["CipherVoteAccessControl"],
      AuditLog: deployed["AuditLog"],
      ZKPVerifier: deployed["ZKPVerifier"],
      VoterRegistry: deployed["VoterRegistry"],
      ElectionManager: deployed["ElectionManager"],
      Voting: deployed["Voting"],
      ResultTally: deployed["ResultTally"],
      EmergencyControl: deployed["EmergencyControl"],
      MultiSig: deployed["MultiSig"],
      VoteDelegation: deployed["VoteDelegation"],
      DisputeResolution: deployed["DisputeResolution"],
      MerkleWhitelist: deployed["MerkleWhitelist"],
      SoulboundVoterNFT: deployed["SoulboundVoterNFT"],
    },
  };
  fs.writeFileSync(path.join(dir, "latest.json"), JSON.stringify(dep, null, 2));
  console.log("\n💾 Saved to deployments/latest.json");
  console.log("\n╔══════════════════════════════════╗");
  console.log("║  ✅ 13 CONTRACTS DEPLOYED          ║");
  console.log("╚══════════════════════════════════╝\n");
}
main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
