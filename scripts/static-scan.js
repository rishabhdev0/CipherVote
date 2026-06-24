const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const sourceRoots = [
  "backend/src",
  "backend/test",
  "frontend/src",
  "blockchain/contracts",
  "blockchain/scripts",
  "blockchain/test",
].map((p) => path.join(root, p));
const banned = [
  { name: "generic adminOnly middleware", pattern: /\badminOnly\b/ },
  {
    name: "frontend token localStorage",
    pattern: /localStorage\.(getItem|setItem|removeItem)\(["']cv_/,
  },
  {
    name: "public upload serving",
    pattern: /express\.static\([^)]*uploads|\/uploads\//,
  },
  { name: "mojibake encoding artifact", pattern: /â|Ã|Â/ },
  { name: "dynamic Tailwind color class", pattern: /(bg|text|border)-\$\{/ },
  {
    name: "direct wallet-address login body",
    pattern: /login\/wallet[\s\S]{0,500}\{\s*walletAddress\s*\}/,
  },
];

function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(full);
    if (!/\.(js|jsx|ts|tsx|sol|sh)$/.test(entry.name)) return [];
    return [full];
  });
}

const failures = [];
for (const file of sourceRoots.flatMap(listFiles)) {
  const rel = path.relative(root, file);
  const text = fs.readFileSync(file, "utf8");
  for (const rule of banned) {
    if (rule.pattern.test(text)) failures.push(`${rel}: ${rule.name}`);
  }
}

if (failures.length) {
  console.error("Static security scan failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Static security scan passed.");
