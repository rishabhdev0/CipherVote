require("dotenv").config();
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

function readJson(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} not found: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

async function main() {
  const deploymentsPath = path.join(__dirname, "../deployments/latest.json");
  const vkPath = path.join(__dirname, "../circuits/build/vk_params.json");
  const deployments = readJson(deploymentsPath, "Deployment file");
  const vk = readJson(vkPath, "Verifying key params");

  const zkpAddress = deployments.contracts?.ZKPVerifier;
  const votingAddress = deployments.contracts?.Voting;
  if (!zkpAddress)
    throw new Error("ZKPVerifier address missing from deployments/latest.json");
  if (!votingAddress)
    throw new Error("Voting address missing from deployments/latest.json");

  const zkp = await ethers.getContractAt("ZKPVerifier", zkpAddress);
  const voting = await ethers.getContractAt("Voting", votingAddress);

  console.log(`Setting verifying key on ZKPVerifier: ${zkpAddress}`);
  const setVkTx = await zkp.setVerifyingKey(
    vk.alpha,
    vk.beta,
    vk.gamma,
    vk.delta,
    vk.ic,
  );
  await setVkTx.wait();

  console.log(`Enabling ZKP requirement on Voting: ${votingAddress}`);
  const zkpRequiredTx = await voting.setZKPRequired(true);
  await zkpRequiredTx.wait();

  console.log("ZKP verifier activated");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
