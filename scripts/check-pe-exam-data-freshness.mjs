import {
  DEFAULT_PE_EXAM_MAX_AGE_DAYS,
  buildPeExamSourceStatus,
  cleanValue,
  getKstYear,
  parsePositiveInteger,
} from "./lib/peExamSourceStatus.mjs";

function getArgValue(name, fallback = "") {
  const prefix = `--${name}=`;
  const match = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  if (!match) return fallback;
  return match.slice(prefix.length);
}

function hasArg(name) {
  return process.argv.includes(`--${name}`);
}

if (hasArg("help")) {
  console.log(`Usage:
  node scripts/check-pe-exam-data-freshness.mjs
  node scripts/check-pe-exam-data-freshness.mjs --max-age-days=180

Options:
  --max-age-days=N       Maximum age for generated source snapshots. Default: ${DEFAULT_PE_EXAM_MAX_AGE_DAYS}.
  --min-kusf-year=N      Minimum KUSF schoolYear. Default: current Korea year.
  --min-adiga-year=N     Minimum ADIGA schoolYear. Default: current Korea year + 1.
  --min-result-year=N    Minimum ADIGA resultYear. Default: current Korea year.
  --no-age-check         Skip generatedAt age checks.`);
  process.exit(0);
}

const currentYear = getKstYear();
const status = buildPeExamSourceStatus({
  maxAgeDays: parsePositiveInteger(getArgValue("max-age-days", ""), DEFAULT_PE_EXAM_MAX_AGE_DAYS),
  minKusfYear: parsePositiveInteger(getArgValue("min-kusf-year", ""), currentYear),
  minAdigaYear: parsePositiveInteger(getArgValue("min-adiga-year", ""), currentYear + 1),
  minResultYear: parsePositiveInteger(getArgValue("min-result-year", ""), currentYear),
  skipAgeCheck: hasArg("no-age-check"),
});

console.log("PE exam source data freshness check");
console.log(`- current Korea year: ${status.currentKoreaYear}`);
console.log(`- expected KUSF schoolYear >= ${status.minKusfYear}`);
console.log(`- expected ADIGA schoolYear >= ${status.minAdigaYear}`);
console.log(`- expected ADIGA resultYear >= ${status.minResultYear}`);
console.log(`- generatedAt max age: ${status.skipAgeCheck ? "skipped" : `${status.maxAgeDays} days`}`);

for (const source of status.sources) {
  console.log(`\n[${source.label}]`);
  console.log(`file: ${source.file}`);
  console.log(`source: ${cleanValue(source.sourceName) || "source missing"}`);
  console.log(`schoolYear: ${source.schoolYear || "missing"}`);
  if (source.resultYear) console.log(`resultYear: ${source.resultYear}`);
  console.log(`generatedAt: ${source.generatedAt || "missing"} (${source.ageDays !== null ? `${source.ageDays} days old` : "invalid"})`);
  console.log(`universities: ${source.universityCount}`);
  console.log(`admission/result rows: ${source.admissionCount}`);
}

console.log("\nSummary");
for (const result of status.results) {
  console.log(`${result.ok ? "OK" : "FAIL"} ${result.label} (${result.detail})`);
}

if (!status.ok) {
  console.log(`\nFreshness gate failed: ${status.failures.length} issue(s). Run npm.cmd run pe-exam:data:refresh, then npm.cmd run pe-exam:data:audit.`);
  process.exitCode = 1;
} else {
  console.log("\nOK: PE exam source snapshots satisfy freshness, source-year, and minimum coverage gates.");
}
