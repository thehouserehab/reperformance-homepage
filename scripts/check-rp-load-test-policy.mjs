import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const script = read("scripts/load-test-rp-public.mjs");
const runbook = read("docs/RP_TRAFFIC_LOAD_TEST.md");

const checks = [
  ["load test command exists", read("package.json").includes('"ops:load:test"')],
  ["remote runs require explicit confirmation", script.includes("RUN_RP_PUBLIC_LOAD_TEST") && script.includes("Remote load tests require")],
  ["remote request count is capped", script.includes("isLocal ? 2000 : 300")],
  ["remote concurrency is capped", script.includes("isLocal ? 100 : 20")],
  ["API paths are rejected", script.includes("API paths are not allowed")],
  ["cross-origin redirects are rejected", script.includes("Cross-origin redirect blocked")],
  ["requests use abort timeouts", script.includes("AbortController") && script.includes("clearTimeout")],
  ["p95 and error-rate gates exist", script.includes("maxP95Ms") && script.includes("maxErrorRate")],
  ["runbook separates local and production use", runbook.includes("Local baseline") && runbook.includes("Controlled production probe")],
];

let failed = 0;
console.log("RePERFORMANCE public load-test safety policy check");
for (const [label, ok] of checks) {
  console.log(`${ok ? "OK" : "FAIL"} ${label}`);
  if (!ok) failed += 1;
}
console.log(`Summary: ${checks.length - failed}/${checks.length} load-test policy checks passed`);
if (failed) process.exit(1);
