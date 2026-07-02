import process from "node:process";
import {
  RETENTION_CONFIRM_TOKEN,
  buildRetentionPlan,
  runDataRetention,
  summarizeRetentionResult,
} from "../lib/rpDataRetention.mjs";

function getArgValue(name, fallback = "") {
  const prefix = `--${name}=`;
  const match = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  if (!match) return fallback;
  return match.slice(prefix.length);
}

function getNumberArg(name, fallback) {
  const value = Number(getArgValue(name, ""));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function hasArg(name) {
  return process.argv.includes(`--${name}`);
}

function buildCliPlan() {
  return buildRetentionPlan({
    applicationPayloadDays: getNumberArg("application-payload-days", 365),
    aiConsultDays: getNumberArg("ai-consult-days", 365),
    questionDays: getNumberArg("question-days", 730),
    rateLimitDays: getNumberArg("rate-limit-days", 7),
    aiUsageDays: getNumberArg("ai-usage-days", 400),
  });
}

function printStaticPlan(plan) {
  console.log("\nStatic retention plan:");
  for (const item of plan) {
    console.log(`- ${item.key}: ${item.description}`);
    if (item.applySql) console.log(`  apply: ${item.applySql.trim().replace(/\s+/g, " ")}`);
    else console.log("  apply: manual review only");
  }
}

function printResult(result, plan, apply) {
  console.log("RePERFORMANCE data retention audit");
  console.log(`mode: ${apply ? "apply" : "dry-run"}`);

  if (!result.connected) {
    console.log("database: not configured; showing static plan only");
    printStaticPlan(plan);
    return;
  }

  const summary = summarizeRetentionResult(result, plan);
  console.log("database: connected");
  for (const row of result.rows) {
    if (!row.exists) {
      console.log(`MISS ${row.key}: table ${row.table} does not exist`);
      continue;
    }
    const suffix = row.applied ? `, affected=${row.affected}` : "";
    console.log(`OK ${row.key}: candidates=${row.count}${suffix}`);
  }
  console.log(`summary: candidates=${summary.candidates}, affected=${summary.affected}`);
}

if (hasArg("help")) {
  console.log(`Usage:
  node scripts/audit-rp-data-retention.mjs
  node scripts/audit-rp-data-retention.mjs --application-payload-days=365 --ai-consult-days=365 --question-days=730 --ai-usage-days=400
  RP_RETENTION_ALLOW_APPLY=true node scripts/audit-rp-data-retention.mjs --apply --confirm=${RETENTION_CONFIRM_TOKEN}`);
  process.exit(0);
}

const plan = buildCliPlan();
const apply = hasArg("apply");
const json = hasArg("json");
const confirm = getArgValue("confirm", "");

if (apply && (process.env.RP_RETENTION_ALLOW_APPLY !== "true" || confirm !== RETENTION_CONFIRM_TOKEN)) {
  console.error(`Refusing to apply retention changes. Set RP_RETENTION_ALLOW_APPLY=true and pass --confirm=${RETENTION_CONFIRM_TOKEN}.`);
  process.exit(1);
}

try {
  const result = await runDataRetention({ apply, plan });
  if (json) {
    console.log(JSON.stringify({ ok: true, mode: apply ? "apply" : "dry-run", ...summarizeRetentionResult(result, plan) }, null, 2));
  } else {
    printResult(result, plan, apply);
  }
} catch (error) {
  console.error(`Retention audit failed: ${error?.message || error}`);
  process.exit(1);
}
