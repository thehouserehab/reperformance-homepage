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

function getOptionalNonNegativeNumberArg(name) {
  const rawValue = getArgValue(name, null);
  if (rawValue === null || rawValue === "") return null;

  const value = Number(rawValue);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`--${name} must be a non-negative number.`);
  }

  return Math.floor(value);
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
  console.log(`summary: prunableCandidates=${summary.prunableCandidates}, reviewOnlyCandidates=${summary.reviewOnlyCandidates}, missingTables=${summary.missingTables.length}`);
}

function buildGateOptions() {
  const failOnCandidates = hasArg("fail-on-candidates");

  return {
    requireDatabase: hasArg("require-database"),
    requireTables: hasArg("require-tables"),
    maxCandidates: failOnCandidates ? 0 : getOptionalNonNegativeNumberArg("max-candidates"),
    maxPrunableCandidates: getOptionalNonNegativeNumberArg("max-prunable-candidates"),
    maxReviewOnlyCandidates: getOptionalNonNegativeNumberArg("max-review-only-candidates"),
  };
}

function evaluateGates(summary, gates) {
  const failures = [];

  if (gates.requireDatabase && !summary.connected) {
    failures.push("database connection is required, but no DATABASE_URL, POSTGRES_URL, or RP_DATABASE_URL is configured");
  }

  if (!summary.connected) {
    if (
      gates.maxCandidates !== null
      || gates.maxPrunableCandidates !== null
      || gates.maxReviewOnlyCandidates !== null
      || gates.requireTables
    ) {
      failures.push("candidate thresholds cannot be evaluated without a database connection");
    }
    return failures;
  }

  if (gates.requireTables && summary.missingTables.length > 0) {
    failures.push(`required retention table(s) are missing: ${summary.missingTables.join(", ")}`);
  }

  if (gates.maxCandidates !== null && summary.candidates > gates.maxCandidates) {
    failures.push(`total retention candidates ${summary.candidates} exceed limit ${gates.maxCandidates}`);
  }

  if (gates.maxPrunableCandidates !== null && summary.prunableCandidates > gates.maxPrunableCandidates) {
    failures.push(`prunable retention candidates ${summary.prunableCandidates} exceed limit ${gates.maxPrunableCandidates}`);
  }

  if (gates.maxReviewOnlyCandidates !== null && summary.reviewOnlyCandidates > gates.maxReviewOnlyCandidates) {
    failures.push(`review-only retention candidates ${summary.reviewOnlyCandidates} exceed limit ${gates.maxReviewOnlyCandidates}`);
  }

  return failures;
}

if (hasArg("help")) {
  console.log(`Usage:
  node scripts/audit-rp-data-retention.mjs
  node scripts/audit-rp-data-retention.mjs --application-payload-days=365 --ai-consult-days=365 --question-days=730 --ai-usage-days=400
  node scripts/audit-rp-data-retention.mjs --require-database --require-tables --max-prunable-candidates=0
  node scripts/audit-rp-data-retention.mjs --fail-on-candidates
  RP_RETENTION_ALLOW_APPLY=true node scripts/audit-rp-data-retention.mjs --apply --confirm=${RETENTION_CONFIRM_TOKEN}

Gate options:
  --require-database              Fail when no PostgreSQL URL is configured.
  --require-tables                Fail when any retention-managed table is missing.
  --max-candidates=N              Fail when total candidate rows exceed N.
  --max-prunable-candidates=N     Fail when auto-prunable candidate rows exceed N.
  --max-review-only-candidates=N  Fail when manual-review candidate rows exceed N.
  --fail-on-candidates            Shortcut for --max-candidates=0.`);
  process.exit(0);
}

const plan = buildCliPlan();
const apply = hasArg("apply");
const json = hasArg("json");
const confirm = getArgValue("confirm", "");
const gates = buildGateOptions();

if (apply && (process.env.RP_RETENTION_ALLOW_APPLY !== "true" || confirm !== RETENTION_CONFIRM_TOKEN)) {
  console.error(`Refusing to apply retention changes. Set RP_RETENTION_ALLOW_APPLY=true and pass --confirm=${RETENTION_CONFIRM_TOKEN}.`);
  process.exit(1);
}

try {
  const result = await runDataRetention({ apply, plan });
  const summary = summarizeRetentionResult(result, plan);
  const gateFailures = evaluateGates(summary, gates);
  if (json) {
    console.log(JSON.stringify({ ok: gateFailures.length === 0, mode: apply ? "apply" : "dry-run", ...summary, gateFailures }, null, 2));
  } else {
    printResult(result, plan, apply);
    if (gateFailures.length > 0) {
      console.error("\nRetention gate failed:");
      for (const failure of gateFailures) console.error(`- ${failure}`);
    }
  }

  if (gateFailures.length > 0) {
    process.exitCode = 1;
  }
} catch (error) {
  console.error(`Retention audit failed: ${error?.message || error}`);
  process.exit(1);
}
