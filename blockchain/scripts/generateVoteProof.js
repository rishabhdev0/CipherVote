 const fs = require("fs");
const path = require("path");
const snarkjs = require("snarkjs");

async function loadWitnessCalculator(wasmDir) {
  const wcPath = path.join(wasmDir, "witness_calculator.js");
  if (!fs.existsSync(wcPath))
    throw new Error(
      `witness_calculator.js missing at ${wcPath}. Run circuits/setup.sh first.`,
    );
  return require(wcPath);
}

async function generateVoteProof(
  input,
  { buildDir = path.join(__dirname, "../circuits/build") } = {},
) {
  const wasmDir = path.join(buildDir, "vote_js");
  const wasmPath = path.join(wasmDir, "vote.wasm");
  const zkeyPath = path.join(buildDir, "vote_final.zkey");
  if (!fs.existsSync(wasmPath))
    throw new Error(`vote.wasm missing at ${wasmPath}`);
  if (!fs.existsSync(zkeyPath))
    throw new Error(`vote_final.zkey missing at ${zkeyPath}`);
  const wcFactory = await loadWitnessCalculator(wasmDir);
  const wasm = fs.readFileSync(wasmPath);
  const wc = await wcFactory(wasm);
  const witness = await wc.calculateWTNSBin(input, 0);
  const { proof, publicSignals } = await snarkjs.groth16.prove(
    zkeyPath,
    witness,
  );
  return {
    proof,
    publicSignals,
    solidityCallData: await snarkjs.groth16.exportSolidityCallData(
      proof,
      publicSignals,
    ),
  };
}

function normalizeInput(raw) {
  const required = [
    "commitment",
    "electionId",
    "maxCandidates",
    "voterNullifier",
    "candidateId",
    "salt",
    "voterSecret",
  ];
  for (const key of required)
    if (raw[key] === undefined)
      throw new Error(`Missing circuit input: ${key}`);
  return raw;
}

async function main() {
  const inputPath = process.argv[2];
  const outputPath =
    process.argv[3] || path.join(__dirname, "../circuits/build/proof.json");
  if (!inputPath)
    throw new Error(
      "Usage: node scripts/generateVoteProof.js input.json [output.json]",
    );
  const input = normalizeInput(JSON.parse(fs.readFileSync(inputPath, "utf8")));
  const result = await generateVoteProof(input, {});
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log(`Proof written to ${outputPath}`);
}

if (require.main === module)
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
module.exports = { generateVoteProof, normalizeInput };
