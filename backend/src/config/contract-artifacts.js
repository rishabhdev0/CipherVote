const fs = require("fs");
const path = require("path");

const artifactRoot = path.join(
  __dirname,
  "../../../blockchain/artifacts/contracts",
);

function artifactPath(contractName) {
  return path.join(artifactRoot, `${contractName}.sol`, `${contractName}.json`);
}

function loadAbi(contractName, fallback = []) {
  const file = artifactPath(contractName);
  if (!fs.existsSync(file)) return fallback;
  const artifact = JSON.parse(fs.readFileSync(file, "utf8"));
  return artifact.abi || fallback;
}

function loadDeployment() {
  const file = path.join(
    __dirname,
    "../../../blockchain/deployments/latest.json",
  );
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

module.exports = { loadAbi, loadDeployment };
