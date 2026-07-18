import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const args = new Set(process.argv.slice(2));

function printUsage() {
  console.log(`RePERFORMANCE PE exam data refresh

Usage:
  node scripts/refresh-pe-exam-data.mjs
  node scripts/refresh-pe-exam-data.mjs --verify-only
  node scripts/refresh-pe-exam-data.mjs --build

Options:
  --verify-only  Skip source fetches and run freshness/coverage gates only.
  --skip-fetch   Alias for --verify-only.
  --build        Run npm run build after data gates pass.
  --status       Regenerate the system-status PE source summary without fetching.
`);
}

function runStep(label, command) {
  console.log(`\n[pe-data] ${label}`);
  console.log(`$ ${command.join(" ")}`);

  const result = spawnSync(command[0], command.slice(1), {
    cwd: root,
    env: process.env,
    stdio: "inherit",
    shell: false,
  });

  if (result.error) {
    console.error(`\nFailed to start ${label}: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`\nPE exam data refresh stopped at: ${label}`);
    process.exit(result.status || 1);
  }
}

if (args.has("--help") || args.has("-h")) {
  printUsage();
  process.exit(0);
}

const verifyOnly = args.has("--verify-only") || args.has("--skip-fetch");
const runBuild = args.has("--build");
const statusOnly = args.has("--status");

const fetchSteps = [
  ["KUSF early admission summary fetch", [process.execPath, "scripts/fetch-kusf-pe-exam-data.mjs"]],
  ["KUSF early admission detail fetch", [process.execPath, "scripts/fetch-kusf-pe-exam-detail-data.mjs"]],
  ["ADIGA regular admission fetch", [process.execPath, "scripts/fetch-adiga-pe-exam-regular-data.mjs"]],
  ["ADIGA regular result fetch", [process.execPath, "scripts/fetch-adiga-pe-exam-selection-data.mjs"]],
];

const gateSteps = [
  ["Freshness/source-year gate", [process.execPath, "scripts/check-pe-exam-data-freshness.mjs"]],
  ["University coverage audit", [process.execPath, "scripts/audit-pe-exam-university-coverage.mjs"]],
  ["Practical-standard safety gate", [process.execPath, "scripts/check-pe-exam-practical-standards.mjs"]],
];

console.log("RePERFORMANCE PE exam data refresh");
console.log(`mode: ${statusOnly ? "status-only" : verifyOnly ? "verify-only" : "fetch-and-verify"}`);

if (statusOnly) {
  runStep("System-status source summary", [process.execPath, "scripts/write-pe-exam-source-status.mjs"]);
  process.exit(0);
}

if (!verifyOnly) {
  for (const [label, command] of fetchSteps) runStep(label, command);
}

for (const [label, command] of gateSteps) runStep(label, command);

if (!verifyOnly) {
  runStep("System-status source summary", [process.execPath, "scripts/write-pe-exam-source-status.mjs"]);
}

if (runBuild) {
  runStep("Next.js production build", [npmCommand, "run", "build"]);
}

console.log("\nOK: PE exam source snapshots are refreshed and verified.");
