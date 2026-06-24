const fs = require("fs");
const path = require("path");

const CIRCOM_PUBLIC_ORDER = [
  "commitment",
  "electionId",
  "maxCandidates",
  "voterNullifier",
  "eligibilityRoot",
];
const SOLIDITY_EXPECTED_ORDER = [
  "commitment",
  "electionId",
  "maxCandidates",
  "nullifier",
  "eligibilityRoot",
];

function readCircuitPublicOrder() {
  const circuit = fs.readFileSync(
    path.join(__dirname, "../circuits/vote/vote.circom"),
    "utf8",
  );
  const match = circuit.match(/component\s+main\{public\[([^\]]+)\]\}/);
  if (!match) throw new Error("Could not find Circom public input declaration");
  return match[1].split(",").map((v) => v.trim());
}

function main() {
  const actual = readCircuitPublicOrder();
  if (JSON.stringify(actual) !== JSON.stringify(CIRCOM_PUBLIC_ORDER)) {
    throw new Error(
      `Unexpected Circom public input order: ${actual.join(", ")}`,
    );
  }
  if (
    CIRCOM_PUBLIC_ORDER[3] !== "voterNullifier" ||
    SOLIDITY_EXPECTED_ORDER[3] !== "nullifier"
  ) {
    throw new Error("Nullifier public input mismatch");
  }
  const out = {
    circom: CIRCOM_PUBLIC_ORDER,
    solidity: SOLIDITY_EXPECTED_ORDER,
    note: "voterNullifier in Circom is passed as nullifier to Solidity verifier",
  };
  fs.mkdirSync(path.join(__dirname, "../circuits/build"), { recursive: true });
  fs.writeFileSync(
    path.join(__dirname, "../circuits/build/public_input_order.json"),
    JSON.stringify(out, null, 2),
  );
  console.log("Public input order verified");
}

if (require.main === module) main();
module.exports = {
  readCircuitPublicOrder,
  CIRCOM_PUBLIC_ORDER,
  SOLIDITY_EXPECTED_ORDER,
};
