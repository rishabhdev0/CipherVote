const fs = require("fs");
const path = require("path");

const circuitPath = path.join(__dirname, "../circuits/vote/vote.circom");
const source = fs.readFileSync(circuitPath, "utf8");

const requiredSnippets = [
  "template VoteCircuit()",
  "component main",
  "public[commitment,electionId,maxCandidates,voterNullifier,eligibilityRoot]",
  "Poseidon(4)",
  "Poseidon(2)",
  "LessEqThan(32)",
  "merklePathElements[20]",
  "eligibilityRoot===current[20]",
];

const missing = requiredSnippets.filter((snippet) => !source.includes(snippet));
if (missing.length > 0) {
  console.error(`Circuit sanity check failed. Missing: ${missing.join(", ")}`);
  process.exit(1);
}

console.log("Circuit sanity check passed");
