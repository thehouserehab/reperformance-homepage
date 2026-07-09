import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

export const DEFAULT_PE_EXAM_MAX_AGE_DAYS = 120;

export const PE_EXAM_SOURCE_FILES = [
  {
    key: "kusfEarlySummary",
    file: "app/pe-exam/kusfAdmissionData.ts",
    exportName: "kusfAdmissionSnapshot",
    label: "KUSF early admission summary",
    minSchoolYearOffset: 0,
    minResultYearOffset: null,
    minUniversities: 180,
    minAdmissions: 800,
    countAdmissions: (snapshot) =>
      (snapshot.universities || []).reduce((total, university) => total + (university.admissions || []).length, 0),
  },
  {
    key: "kusfEarlyDetail",
    file: "app/pe-exam/kusfAdmissionDetailData.ts",
    exportName: "kusfAdmissionDetailSnapshot",
    label: "KUSF early admission detail",
    minSchoolYearOffset: 0,
    minResultYearOffset: null,
    minUniversities: 0,
    minAdmissions: 800,
    countAdmissions: (snapshot) => (snapshot.admissions || []).length,
  },
  {
    key: "adigaRegularAdmission",
    file: "app/pe-exam/adigaRegularAdmissionData.ts",
    exportName: "adigaRegularAdmissionSnapshot",
    label: "ADIGA regular admission",
    minSchoolYearOffset: 1,
    minResultYearOffset: null,
    minUniversities: 180,
    minAdmissions: 100,
    countAdmissions: (snapshot) =>
      (snapshot.universities || []).reduce((total, university) => total + (university.admissions || []).length, 0),
  },
  {
    key: "adigaRegularSelection",
    file: "app/pe-exam/adigaRegularSelectionData.ts",
    exportName: "adigaRegularSelectionSnapshot",
    label: "ADIGA regular result",
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

export function cleanValue(value) {
  return String(value || "").trim();
}

export function getKstYear(date = new Date()) {
  return new Date(date.getTime() + (9 * 60 * 60 * 1000)).getUTCFullYear();
}

export function parsePositiveInteger(value, fallback) {
  const parsed = Number(cleanValue(value));
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

export function daysSince(value, now = Date.now()) {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return Number.POSITIVE_INFINITY;
  return Math.floor((now - time) / (24 * 60 * 60 * 1000));
}

function readText(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

export function parseExportedJson(file, exportName) {
  const text = readText(file);
  const match = text.match(new RegExp(`export const ${exportName} = ([\\s\\S]*?) as const;`));
  if (!match) throw new Error(`Could not find ${exportName} in ${file}`);
  return JSON.parse(match[1]);
}

export function countUniversities(snapshot) {
  if (Array.isArray(snapshot.universities)) return snapshot.universities.length;
  if (Array.isArray(snapshot.admissions)) {
    return new Set(snapshot.admissions.map((admission) => admission.universityCode).filter(Boolean)).size;
  }
  return 0;
}

function addResult(results, ok, label, detail) {
  results.push({ ok: Boolean(ok), label, detail });
}

export function buildPeExamSourceStatus(options = {}) {
  const currentYear = parsePositiveInteger(options.currentYear, getKstYear());
  const maxAgeDays = parsePositiveInteger(options.maxAgeDays, DEFAULT_PE_EXAM_MAX_AGE_DAYS);
  const minKusfYear = parsePositiveInteger(options.minKusfYear, currentYear);
  const minAdigaYear = parsePositiveInteger(options.minAdigaYear, currentYear + 1);
  const minResultYear = parsePositiveInteger(options.minResultYear, currentYear);
  const skipAgeCheck = Boolean(options.skipAgeCheck);
  const now = Number.isFinite(options.now) ? options.now : Date.now();
  const results = [];
  const sources = [];

  for (const sourceFile of PE_EXAM_SOURCE_FILES) {
    const snapshot = parseExportedJson(sourceFile.file, sourceFile.exportName);
    const schoolYear = Number(snapshot.schoolYear || 0);
    const resultYear = Number(snapshot.resultYear || 0);
    const minSchoolYear = sourceFile.minSchoolYearOffset === 1 ? minAdigaYear : minKusfYear;
    const minResult = sourceFile.minResultYearOffset === 0 ? minResultYear : null;
    const universityCount = countUniversities(snapshot);
    const admissionCount = sourceFile.countAdmissions(snapshot);
    const ageDays = daysSince(snapshot.generatedAt, now);

    const sourceResults = [];
    addResult(sourceResults, schoolYear >= minSchoolYear, `${sourceFile.label} schoolYear`, `${schoolYear} >= ${minSchoolYear}`);
    if (minResult !== null) {
      addResult(sourceResults, resultYear >= minResult, `${sourceFile.label} resultYear`, `${resultYear} >= ${minResult}`);
    }
    if (!skipAgeCheck) {
      addResult(sourceResults, Number.isFinite(ageDays) && ageDays >= 0 && ageDays <= maxAgeDays, `${sourceFile.label} generatedAt`, `${ageDays} <= ${maxAgeDays} days`);
    }
    if (sourceFile.minUniversities > 0) {
      addResult(sourceResults, universityCount >= sourceFile.minUniversities, `${sourceFile.label} university count`, `${universityCount} >= ${sourceFile.minUniversities}`);
    }
    addResult(sourceResults, admissionCount >= sourceFile.minAdmissions, `${sourceFile.label} admission/result count`, `${admissionCount} >= ${sourceFile.minAdmissions}`);
    results.push(...sourceResults);

    sources.push({
      key: sourceFile.key,
      label: sourceFile.label,
      file: sourceFile.file,
      exportName: sourceFile.exportName,
      sourceName: snapshot.sourceName || "",
      sourceUrl: snapshot.sourceUrl || "",
      schoolYear: snapshot.schoolYear || "",
      resultYear: snapshot.resultYear || "",
      generatedAt: snapshot.generatedAt || "",
      ageDays: Number.isFinite(ageDays) ? ageDays : null,
      universityCount,
      admissionCount,
      minSchoolYearOffset: sourceFile.minSchoolYearOffset,
      minResultYearOffset: sourceFile.minResultYearOffset,
      minUniversities: sourceFile.minUniversities,
      minAdmissions: sourceFile.minAdmissions,
      requiredSchoolYear: minSchoolYear,
      requiredResultYear: minResult,
      ok: sourceResults.every((result) => result.ok),
      failures: sourceResults.filter((result) => !result.ok),
    });
  }

  const failures = results.filter((result) => !result.ok);
  return {
    ok: failures.length === 0,
    currentKoreaYear: currentYear,
    maxAgeDays,
    minKusfYear,
    minAdigaYear,
    minResultYear,
    skipAgeCheck,
    sources,
    results,
    failures,
  };
}
