import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const results = [];

function readFile(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function fileExists(file) {
  return fs.existsSync(path.join(root, file));
}

function addResult(area, name, ok, detail = "") {
  results.push({ area, name, ok: Boolean(ok), detail });
}

function includesAll(file, needles) {
  const text = readFile(file);
  return needles.every((needle) => text.includes(needle));
}

function listFiles(dir, predicate = () => true) {
  const dirPath = path.join(root, dir);
  if (!fs.existsSync(dirPath)) return [];

  const files = [];
  const stack = [dirPath];
  while (stack.length) {
    const current = stack.pop();
    const stats = fs.statSync(current);
    if (stats.isDirectory()) {
      for (const child of fs.readdirSync(current)) stack.push(path.join(current, child));
      continue;
    }

    if (stats.isFile() && predicate(current)) {
      files.push(path.relative(root, current).split(path.sep).join("/"));
    }
  }

  return files.sort();
}

function findLineMatches(files, pattern) {
  const matches = [];
  for (const file of files) {
    const lines = readFile(file).split(/\r?\n/);
    lines.forEach((line, index) => {
      if (pattern.test(line)) {
        matches.push(`${file}:${index + 1}`);
      }
    });
  }
  return matches;
}

const sourceFiles = [
  ...listFiles("app/api", (file) => /\.(js|jsx|ts|tsx|mjs)$/.test(file)),
  ...listFiles("lib", (file) => /\.(js|jsx|ts|tsx|mjs)$/.test(file)),
];

const rawErrorLogMatches = findLineMatches(
  sourceFiles,
  /console\.(error|warn)\([^;\n]*(,\s*error\b|\berror\s*\))/,
);

addResult(
  "logging",
  "API and library logs do not print raw error objects",
  rawErrorLogMatches.length === 0,
  rawErrorLogMatches.slice(0, 8).join(", "),
);

addResult(
  "logging",
  "Safe log error detail helper exists",
  includesAll("lib/rpPublicErrors.js", [
    "getSafeLogErrorDetail",
    "getSafePublicErrorMessage(error, fallback)",
    "name:",
    "status:",
    "message:",
    "expose:",
  ]),
);

addResult(
  "logging",
  "Account recovery catch log is sanitized",
  includesAll("app/api/auth/account-recovery/route.js", [
    "getSafeLogErrorDetail",
    "console.error('account recovery failed', getSafeLogErrorDetail(error, 'account_recovery_failed'))",
    "getSafePublicErrorMessage(error, '계정 찾기 처리 중 오류가 발생했습니다.')",
  ])
    && !readFile("app/api/auth/account-recovery/route.js").includes("console.error('account recovery failed', error)"),
);

addResult(
  "logging",
  "External auth-store lookup warnings are sanitized",
  includesAll("lib/rpSheetAuthStore.js", [
    "getSafeLogErrorDetail",
    "auth_account_lookup_failed",
    "detail.message",
  ])
    && !readFile("lib/rpSheetAuthStore.js").includes("error?.message || 'unknown error'"),
);

const publicApiRoutes = [
  "app/api/auth/identity-verification/route.js",
  "app/api/auth/account-recovery/route.js",
  "app/api/rp/signup/route.js",
  "app/api/rp/service-application/route.js",
  "app/api/rp/pe-exam-question/route.js",
  "app/api/rp/pe-exam-ai-consult/route.js",
];

const missingSafePublicMessages = publicApiRoutes.filter((file) =>
  fileExists(file) && !readFile(file).includes("getSafePublicErrorMessage")
);

addResult(
  "public-errors",
  "Public API catch responses use safe public error messages",
  missingSafePublicMessages.length === 0,
  missingSafePublicMessages.join(", "),
);

addResult(
  "public-errors",
  "Internal error keywords are redacted from public messages",
  includesAll("lib/rpPublicErrors.js", [
    "INTERNAL_ERROR_PATTERN",
    "DATABASE_URL",
    "POSTGRES_URL",
    "RP_[A-Z0-9_]+",
    "OPENAI",
    "Apps Script",
    "PostgreSQL",
    "secret",
    "token",
    "webhook",
    "environment variable",
  ]),
);

addResult(
  "security-events",
  "Security-event metadata drops sensitive keys",
  includesAll("lib/rpSecurityEvents.js", [
    "SENSITIVE_KEY_PATTERN",
    "password|secret|token|code|hash|cookie|session",
    ".filter(([key]) => !SENSITIVE_KEY_PATTERN.test(key))",
    "actorHash: hashValue(actor)",
    "targetHash: hashValue(target)",
    "ipHash: hashValue(ip)",
  ]),
);

addResult(
  "retention",
  "Retention audit covers legacy plaintext passwords and broad payloads",
  includesAll("lib/rpDataRetention.mjs", [
    "legacyPlainPasswords",
    "password_plain = NULL",
    "rp_service_applications",
    "rp_pe_exam_ai_consults",
    "rp_pe_exam_questions",
    "oldSecurityEvents",
  ]),
);

const appsScriptSource = readFile("integrations/google-apps-script/Code.gs");
addResult(
  "integrations",
  "Google Apps Script source keeps spreadsheet and API secret values as placeholders",
  /SPREADSHEET_ID:\s*['"]CHANGE_THIS_TO_SPREADSHEET_ID['"]/.test(appsScriptSource)
    && /DEFAULT_SECRET:\s*['"]CHANGE_THIS_TO_A_LONG_RANDOM_SECRET['"]/.test(appsScriptSource),
);

const byArea = new Map();
for (const result of results) {
  if (!byArea.has(result.area)) byArea.set(result.area, []);
  byArea.get(result.area).push(result);
}

console.log("RePERFORMANCE sensitive data exposure check");
for (const [area, areaResults] of byArea.entries()) {
  console.log(`\n[${area}]`);
  for (const result of areaResults) {
    console.log(`${result.ok ? "OK" : "FAIL"} ${result.name}${result.detail ? ` (${result.detail})` : ""}`);
  }
}

const failed = results.filter((result) => !result.ok);
console.log(`\nSummary: ${results.length - failed.length}/${results.length} checks passed`);

if (failed.length) {
  process.exitCode = 1;
}
