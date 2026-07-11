import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const workflowFile = path.join(root, ".github/workflows/pe-exam-data-maintenance.yml");
const workflow = fs.readFileSync(workflowFile, "utf8");

const checks = [
  ["monthly schedule exists", /schedule:[\s\S]*cron:/],
  ["manual verify or refresh input exists", /workflow_dispatch:[\s\S]*mode:[\s\S]*verify[\s\S]*refresh/],
  ["pull request write permission is explicit", /pull-requests:\s*write/],
  ["checkout action is commit-pinned", /actions\/checkout@[0-9a-f]{40}/],
  ["Node setup action is commit-pinned", /actions\/setup-node@[0-9a-f]{40}/],
  ["scheduled source refresh uses the maintained command", /npm run pe-exam:data:refresh/],
  ["read-only verification remains available", /npm run pe-exam:data:verify/],
  ["refreshed data is typechecked and built", /npm run typecheck[\s\S]*npm run build/],
  ["only generated PE data files are staged", /git add -- "\$\{data_files\[@\]\}"/],
  ["automatic deployment is not present", !/\bvercel\s+(?:deploy|--prod)\b|npm run deploy/.test(workflow)],
  ["updates are proposed through a review branch", /automation\/pe-exam-data-refresh[\s\S]*gh pr (?:create|edit)/],
];

let failed = 0;
console.log("RePERFORMANCE PE exam data automation policy check");

for (const [label, test] of checks) {
  const ok = typeof test === "boolean" ? test : test.test(workflow);
  console.log(`${ok ? "OK" : "FAIL"} ${label}`);
  if (!ok) failed += 1;
}

console.log(`Summary: ${checks.length - failed}/${checks.length} automation checks passed`);
if (failed) process.exit(1);
