import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const sourceFiles = [
  {
    file: "app/pe-exam/kusfAdmissionData.ts",
    exportName: "kusfAdmissionSnapshot",
    label: "KUSF 수시 요약",
    minSchoolYearOffset: 0,
    minUniversities: 180,
    minAdmissions: 800,
    countAdmissions: (snapshot) =>
      (snapshot.universities || []).reduce((total, university) => total + (university.admissions || []).length, 0),
  },
  {
    file: "app/pe-exam/kusfAdmissionDetailData.ts",
    exportName: "kusfAdmissionDetailSnapshot",
    label: "KUSF 수시 상세",
    minSchoolYearOffset: 0,
    minUniversities: 0,
    minAdmissions: 800,
    countAdmissions: (snapshot) => (snapshot.admissions || []).length,
  },
  {
    file: "app/pe-exam/adigaRegularAdmissionData.ts",
    exportName: "adigaRegularAdmissionSnapshot",
    label: "ADIGA 정시 전형",
    minSchoolYearOffset: 1,
    minUniversities: 180,
    minAdmissions: 100,
    countAdmissions: (snapshot) =>
      (snapshot.universities || []).reduce((total, university) => total + (university.admissions || []).length, 0),
  },
  {
    file: "app/pe-exam/adigaRegularSelectionData.ts",
    exportName: "adigaRegularSelectionSnapshot",
    label: "ADIGA 정시 입결",
    minSchoolYearOffset: 1,
    minResultYearOffset: 0,
    minUniversities: 60,
    minAdmissions: 200,
    countAdmissions: (snapshot) =>
      (snapshot.universities || []).reduce((total, university) => (
        total + (university.resultRows || []).length + (university.targetUnits || []).length
      ), 0),
  },
];

function cleanValue(value) {
  return String(value || "").trim();
}

function getArgValue(name, fallback = "") {
  const prefix = `--${name}=`;
  const match = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  if (!match) return fallback;
  return match.slice(prefix.length);
}

function hasArg(name) {
  return process.argv.includes(`--${name}`);
}

function getKstYear(date = new Date()) {
  return new Date(date.getTime() + (9 * 60 * 60 * 1000)).getUTCFullYear();
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number(cleanValue(value));
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function readText(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function parseExportedJson(file, exportName) {
  const text = readText(file);
  const match = text.match(new RegExp(`export const ${exportName} = ([\\s\\S]*?) as const;`));
  if (!match) throw new Error(`Could not find ${exportName} in ${file}`);
  return JSON.parse(match[1]);
}

function countUniversities(snapshot) {
  if (Array.isArray(snapshot.universities)) return snapshot.universities.length;
  if (Array.isArray(snapshot.admissions)) {
    return new Set(snapshot.admissions.map((admission) => admission.universityCode).filter(Boolean)).size;
  }
  return 0;
}

function daysSince(value) {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return Number.POSITIVE_INFINITY;
  return Math.floor((Date.now() - time) / (24 * 60 * 60 * 1000));
}

function addResult(results, ok, label, detail) {
  results.push({ ok: Boolean(ok), label, detail });
}

if (hasArg("help")) {
  console.log(`Usage:
  node scripts/check-pe-exam-data-freshness.mjs
  node scripts/check-pe-exam-data-freshness.mjs --max-age-days=180

Options:
  --max-age-days=N       Maximum age for generated source snapshots. Default: 120.
  --min-kusf-year=N      Minimum KUSF schoolYear. Default: current Korea year.
  --min-adiga-year=N     Minimum ADIGA schoolYear. Default: current Korea year + 1.
  --min-result-year=N    Minimum ADIGA resultYear. Default: current Korea year.
  --no-age-check         Skip generatedAt age checks.`);
  process.exit(0);
}

const currentYear = getKstYear();
const maxAgeDays = parsePositiveInteger(getArgValue("max-age-days", ""), 120);
const minKusfYear = parsePositiveInteger(getArgValue("min-kusf-year", ""), currentYear);
const minAdigaYear = parsePositiveInteger(getArgValue("min-adiga-year", ""), currentYear + 1);
const minResultYear = parsePositiveInteger(getArgValue("min-result-year", ""), currentYear);
const skipAgeCheck = hasArg("no-age-check");
const results = [];

console.log("PE exam source data freshness check");
console.log(`- current Korea year: ${currentYear}`);
console.log(`- expected KUSF schoolYear >= ${minKusfYear}`);
console.log(`- expected ADIGA schoolYear >= ${minAdigaYear}`);
console.log(`- expected ADIGA resultYear >= ${minResultYear}`);
console.log(`- generatedAt max age: ${skipAgeCheck ? "skipped" : `${maxAgeDays} days`}`);

for (const sourceFile of sourceFiles) {
  const snapshot = parseExportedJson(sourceFile.file, sourceFile.exportName);
  const schoolYear = Number(snapshot.schoolYear || 0);
  const resultYear = Number(snapshot.resultYear || 0);
  const minSchoolYear = sourceFile.minSchoolYearOffset === 1 ? minAdigaYear : minKusfYear;
  const minResult = sourceFile.minResultYearOffset === 0 ? minResultYear : null;
  const universityCount = countUniversities(snapshot);
  const admissionCount = sourceFile.countAdmissions(snapshot);
  const ageDays = daysSince(snapshot.generatedAt);

  console.log(`\n[${sourceFile.label}]`);
  console.log(`file: ${sourceFile.file}`);
  console.log(`source: ${snapshot.sourceName || "source missing"}`);
  console.log(`schoolYear: ${snapshot.schoolYear || "missing"}`);
  if (snapshot.resultYear) console.log(`resultYear: ${snapshot.resultYear}`);
  console.log(`generatedAt: ${snapshot.generatedAt || "missing"} (${Number.isFinite(ageDays) ? `${ageDays} days old` : "invalid"})`);
  console.log(`universities: ${universityCount}`);
  console.log(`admission/result rows: ${admissionCount}`);

  addResult(results, schoolYear >= minSchoolYear, `${sourceFile.label} schoolYear`, `${schoolYear} >= ${minSchoolYear}`);
  if (minResult !== null) {
    addResult(results, resultYear >= minResult, `${sourceFile.label} resultYear`, `${resultYear} >= ${minResult}`);
  }
  if (!skipAgeCheck) {
    addResult(results, Number.isFinite(ageDays) && ageDays >= 0 && ageDays <= maxAgeDays, `${sourceFile.label} generatedAt`, `${ageDays} <= ${maxAgeDays} days`);
  }
  if (sourceFile.minUniversities > 0) {
    addResult(results, universityCount >= sourceFile.minUniversities, `${sourceFile.label} university count`, `${universityCount} >= ${sourceFile.minUniversities}`);
  }
  addResult(results, admissionCount >= sourceFile.minAdmissions, `${sourceFile.label} admission/result count`, `${admissionCount} >= ${sourceFile.minAdmissions}`);
}

const failed = results.filter((result) => !result.ok);
console.log("\nSummary");
for (const result of results) {
  console.log(`${result.ok ? "OK" : "FAIL"} ${result.label} (${result.detail})`);
}

if (failed.length) {
  console.log(`\nFreshness gate failed: ${failed.length} issue(s). Run npm.cmd run pe-exam:data:refresh, then npm.cmd run pe-exam:data:audit.`);
  process.exitCode = 1;
} else {
  console.log("\nOK: PE exam source snapshots satisfy freshness, source-year, and minimum coverage gates.");
}
