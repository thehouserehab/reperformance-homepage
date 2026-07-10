import fs from "node:fs";
import { spawnSync } from "node:child_process";
import {
  DEFAULT_PE_EXAM_MAX_AGE_DAYS,
  PE_EXAM_SOURCE_FILES,
  buildPeExamSourceStatus,
  parsePositiveInteger,
} from "./lib/peExamSourceStatus.mjs";

const args = process.argv.slice(2);
const flags = new Set(args.filter((arg) => arg.startsWith("--") && !arg.includes("=")));
const namedArgs = new Map(
  args
    .filter((arg) => arg.startsWith("--") && arg.includes("="))
    .map((arg) => {
      const [key, ...valueParts] = arg.slice(2).split("=");
      return [key, valueParts.join("=")];
    }),
);

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const sourceStatusFile = "app/pe-exam/peExamSourceStatus.js";

function printUsage() {
  console.log(`RePERFORMANCE PE exam data readiness report

Usage:
  node scripts/report-pe-exam-data-readiness.mjs
  node scripts/report-pe-exam-data-readiness.mjs --json
  node scripts/report-pe-exam-data-readiness.mjs --max-age-days=180

Options:
  --json            Print machine-readable JSON.
  --max-age-days=N  Override source snapshot max age. Default: ${DEFAULT_PE_EXAM_MAX_AGE_DAYS}.`);
}

function readSourceStatusSnapshot() {
  try {
    const text = fs.readFileSync(sourceStatusFile, "utf8");
    const match = text.match(/export const peExamSourceStatusSnapshot = ([\s\S]*?);\s*$/);
    if (!match) return { ok: false, reason: "export_not_found" };
    return { ok: true, snapshot: JSON.parse(match[1]) };
  } catch (error) {
    return { ok: false, reason: error?.message || "read_failed" };
  }
}

function getMaxGeneratedAt(sources) {
  const times = sources
    .map((source) => Date.parse(source.generatedAt))
    .filter((time) => Number.isFinite(time));
  return times.length ? new Date(Math.max(...times)).toISOString() : "";
}

function getSourceGitStatus() {
  const paths = [
    ...PE_EXAM_SOURCE_FILES.map((source) => source.file),
    sourceStatusFile,
  ];
  const result = spawnSync("git", ["status", "--short", "--", ...paths], {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: false,
  });

  if (result.error || result.status !== 0) {
    return {
      ok: false,
      entries: [],
      reason: result.error?.message || result.stderr || "git_status_failed",
    };
  }

  return {
    ok: true,
    entries: result.stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean),
  };
}

function buildReport() {
  const status = buildPeExamSourceStatus({
    maxAgeDays: parsePositiveInteger(namedArgs.get("max-age-days"), DEFAULT_PE_EXAM_MAX_AGE_DAYS),
  });
  const sourceStatus = readSourceStatusSnapshot();
  const maxGeneratedAt = getMaxGeneratedAt(status.sources);
  const summaryGeneratedAt = sourceStatus.snapshot?.sourceSnapshotsMaxGeneratedAt || "";
  const sourceStatusSynced = sourceStatus.ok && summaryGeneratedAt === maxGeneratedAt;
  const gitStatus = getSourceGitStatus();
  const ready = status.ok && sourceStatusSynced;
  const blockers = [
    ...status.failures.map((failure) => ({
      code: "source_gate_failed",
      message: failure.label,
      detail: failure.detail,
    })),
  ];

  if (!sourceStatusSynced) {
    blockers.push({
      code: "source_status_summary_stale",
      message: `${sourceStatusFile} must be regenerated after source snapshots change.`,
      detail: `summary=${summaryGeneratedAt || "missing"} latest=${maxGeneratedAt || "missing"}`,
    });
  }

  return {
    ready,
    generatedAt: new Date().toISOString(),
    currentKoreaYear: status.currentKoreaYear,
    maxAgeDays: status.maxAgeDays,
    sourceStatusSynced,
    sourceSnapshotsMaxGeneratedAt: maxGeneratedAt,
    statusSummaryMaxGeneratedAt: summaryGeneratedAt,
    blockers,
    sources: status.sources.map((source) => ({
      key: source.key,
      label: source.label,
      file: source.file,
      sourceName: source.sourceName,
      schoolYear: source.schoolYear,
      requiredSchoolYear: source.requiredSchoolYear,
      resultYear: source.resultYear,
      requiredResultYear: source.requiredResultYear,
      generatedAt: source.generatedAt,
      ageDays: source.ageDays,
      universityCount: source.universityCount,
      admissionCount: source.admissionCount,
      ok: source.ok,
      failures: source.failures,
    })),
    gitStatus,
    commands: {
      refresh: `${npmCommand} run pe-exam:data:refresh`,
      verify: `${npmCommand} run pe-exam:data:verify`,
      status: `${npmCommand} run pe-exam:data:status`,
      build: `${npmCommand} run build`,
      campaign: `${npmCommand} run ops:campaign:check`,
    },
  };
}

function printTextReport(report) {
  console.log("RePERFORMANCE PE exam data readiness report");
  console.log(`ready=${report.ready}`);
  console.log(`currentKoreaYear=${report.currentKoreaYear}`);
  console.log(`maxAgeDays=${report.maxAgeDays}`);
  console.log(`sourceSnapshotsMaxGeneratedAt=${report.sourceSnapshotsMaxGeneratedAt || "missing"}`);
  console.log(`statusSummarySynced=${report.sourceStatusSynced}`);

  console.log("\nSources");
  for (const source of report.sources) {
    const result = source.ok ? "OK" : "FAIL";
    const resultYear = source.requiredResultYear
      ? ` resultYear=${source.resultYear || "missing"}>=${source.requiredResultYear}`
      : "";
    console.log(
      `- ${result} ${source.label}: schoolYear=${source.schoolYear || "missing"}>=${source.requiredSchoolYear}${resultYear}, age=${source.ageDays}d, universities=${source.universityCount}, rows=${source.admissionCount}`,
    );
  }

  if (report.blockers.length) {
    console.log("\nBlockers");
    for (const blocker of report.blockers) {
      console.log(`- ${blocker.code}: ${blocker.message} (${blocker.detail})`);
    }
  }

  if (report.gitStatus.ok && report.gitStatus.entries.length) {
    console.log("\nChanged PE exam data files");
    for (const entry of report.gitStatus.entries) console.log(`- ${entry}`);
  }

  console.log("\nNext commands");
  if (!report.ready) console.log(`- ${report.commands.refresh}`);
  if (!report.sourceStatusSynced) console.log(`- ${report.commands.status}`);
  console.log(`- ${report.commands.verify}`);
  console.log(`- ${report.commands.build}`);
  console.log(`- ${report.commands.campaign}`);
}

if (flags.has("--help") || flags.has("-h")) {
  printUsage();
  process.exit(0);
}

const report = buildReport();

if (flags.has("--json")) {
  console.log(JSON.stringify(report, null, 2));
} else {
  printTextReport(report);
}

if (!report.ready) process.exitCode = 1;
