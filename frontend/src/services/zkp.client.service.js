const proofAssets = {
  wasm: import.meta.env.VITE_ZKP_WASM_URL || "/zkp/vote.wasm",
  zkey: import.meta.env.VITE_ZKP_ZKEY_URL || "/zkp/vote_final.zkey",
};

export async function generateClientVoteProof({
  candidate,
  election,
  eligibilityPackage,
  ballot,
}) {
  if (!import.meta.env.PROD && !import.meta.env.VITE_ENABLE_BROWSER_ZKP)
    return null;
  const snarkjs = await import("snarkjs");
  if (!eligibilityPackage?.merklePath)
    throw new Error("Eligibility Merkle path missing");
  const optionCount =
    (election.candidates || []).filter((c) => c.isActive !== false).length + 1;
  if (!election.blockchainId)
    throw new Error("Election is not linked to an on-chain election");
  if (!candidate.isNota && !candidate.blockchainId)
    throw new Error("Candidate is not linked to an on-chain candidate");
  const input = {
    commitment: ballot.ballotCommitment,
    electionId: String(election.blockchainId),
    maxCandidates: String(optionCount),
    voterNullifier: ballot.nullifierHash,
    eligibilityRoot: String(eligibilityPackage.eligibilityRoot),
    candidateId: String(candidate.isNota ? 0 : candidate.blockchainId),
    salt: ballot.salt,
    voterSecret: eligibilityPackage.clientSecret,
    merklePathElements: eligibilityPackage.merklePath.merklePathElements,
    merklePathIndices: eligibilityPackage.merklePath.merklePathIndices,
  };
  if (!input.voterSecret)
    throw new Error(
      "Client voter secret missing; cannot generate production proof",
    );
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    input,
    proofAssets.wasm,
    proofAssets.zkey,
  );
  return {
    proofA: [proof.pi_a[0], proof.pi_a[1]],
    proofB: [
      [proof.pi_b[0][1], proof.pi_b[0][0]],
      [proof.pi_b[1][1], proof.pi_b[1][0]],
    ],
    proofC: [proof.pi_c[0], proof.pi_c[1]],
    proofCommitment: publicSignals[0],
    publicSignals,
  };
}
