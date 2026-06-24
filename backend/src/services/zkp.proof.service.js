const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function requireFromBlockchain(pkg) {
  const root =
    process.env.ZKP_NODE_MODULES ||
    path.join(__dirname, "../../../blockchain/node_modules");
  return require(path.join(root, pkg));
}

async function poseidonHash(values) {
  const { buildPoseidon } = requireFromBlockchain("circomlibjs");
  const poseidon = await buildPoseidon();
  const field = poseidon.F;
  return field.toObject(poseidon(values.map((v) => BigInt(v)))).toString();
}

function zkpBuildDir() {
  return (
    process.env.ZKP_BUILD_DIR ||
    path.join(__dirname, "../../../blockchain/circuits/build")
  );
}

function requireProofAssets() {
  const build = zkpBuildDir();
  const wasm =
    process.env.ZKP_WASM_PATH || path.join(build, "vote_js/vote.wasm");
  const zkey = process.env.ZKP_ZKEY_PATH || path.join(build, "vote_final.zkey");
  if (!fs.existsSync(wasm)) throw new Error(`ZKP wasm missing: ${wasm}`);
  if (!fs.existsSync(zkey)) throw new Error(`ZKP zkey missing: ${zkey}`);
  return { wasm, zkey };
}

function voterSecretFor(voter) {
  if (process.env.VOTER_SECRET_PEPPER) {
    return BigInt(
      "0x" +
        crypto
          .createHash("sha256")
          .update(
            `${process.env.VOTER_SECRET_PEPPER}:${voter.id}:${voter.walletAddress || ""}`,
          )
          .digest("hex"),
    ).toString();
  }
  if (process.env.NODE_ENV === "production")
    throw new Error(
      "VOTER_SECRET_PEPPER required for server-side proof generation",
    );
  return BigInt(
    "0x" +
      crypto
        .createHash("sha256")
        .update(`dev-voter-secret:${voter.id}`)
        .digest("hex"),
  ).toString();
}

async function zeroMerkleRoot(leaf, levels = 20) {
  let current = leaf;
  const elements = [];
  const indices = [];
  for (let i = 0; i < levels; i++) {
    elements.push("0");
    indices.push("0");
    current = await poseidonHash([current, "0"]);
  }
  return {
    root: current,
    merklePathElements: elements,
    merklePathIndices: indices,
  };
}

function proofToSolidity(proof) {
  return {
    proofA: [proof.pi_a[0], proof.pi_a[1]],
    proofB: [
      [proof.pi_b[0][1], proof.pi_b[0][0]],
      [proof.pi_b[1][1], proof.pi_b[1][0]],
    ],
    proofC: [proof.pi_c[0], proof.pi_c[1]],
  };
}

async function generateVoteProof({
  voter,
  electionId,
  candidateId,
  maxCandidates,
  eligibilityRoot,
}) {
  const snarkjs = requireFromBlockchain("snarkjs");
  const { wasm, zkey } = requireProofAssets();
  const voterSecret = voterSecretFor(voter);
  const salt = BigInt("0x" + crypto.randomBytes(31).toString("hex")).toString();
  const commitment = await poseidonHash([
    electionId,
    candidateId,
    salt,
    voterSecret,
  ]);
  const voterNullifier = await poseidonHash([voterSecret, electionId]);
  const leaf = await poseidonHash([voterSecret, electionId]);
  const merkle = await zeroMerkleRoot(leaf);
  const root = eligibilityRoot || merkle.root;
  if (String(root) !== String(merkle.root))
    throw new Error(
      "Eligibility Merkle path not available for configured root",
    );
  const input = {
    commitment: String(commitment),
    electionId: String(electionId),
    maxCandidates: String(maxCandidates),
    voterNullifier: String(voterNullifier),
    eligibilityRoot: String(root),
    candidateId: String(candidateId),
    salt: String(salt),
    voterSecret: String(voterSecret),
    merklePathElements: merkle.merklePathElements,
    merklePathIndices: merkle.merklePathIndices,
  };
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    input,
    wasm,
    zkey,
  );
  return {
    ...proofToSolidity(proof),
    publicSignals,
    commitment: String(commitment),
    nullifier: String(voterNullifier),
    eligibilityRoot: String(root),
    salt: String(salt),
  };
}

module.exports = {
  generateVoteProof,
  poseidonHash,
  zeroMerkleRoot,
  voterSecretFor,
};
