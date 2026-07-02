import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [];

function readFile(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function fileExists(file) {
  return fs.existsSync(path.join(root, file));
}

function addCheck(area, name, ok, detail = "") {
  checks.push({ area, name, ok: Boolean(ok), detail });
}

function parseVersion(version) {
  return String(version || "")
    .replace(/^[^\d]*/, "")
    .split(".")
    .map((part) => Number.parseInt(part, 10) || 0);
}

function versionAtLeast(current, minimum) {
  const left = parseVersion(current);
  const right = parseVersion(minimum);
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const currentPart = left[index] || 0;
    const minimumPart = right[index] || 0;
    if (currentPart > minimumPart) return true;
    if (currentPart < minimumPart) return false;
  }
  return true;
}

function includesAll(file, needles) {
  const text = readFile(file);
  return needles.every((needle) => text.includes(needle));
}

function directoryIncludesText(dir, needle) {
  const dirPath = path.join(root, dir);
  if (!fs.existsSync(dirPath)) return false;

  const stack = [dirPath];
  while (stack.length) {
    const current = stack.pop();
    const stats = fs.statSync(current);
    if (stats.isDirectory()) {
      for (const child of fs.readdirSync(current)) stack.push(path.join(current, child));
      continue;
    }

    if (stats.isFile() && fs.readFileSync(current, "utf8").includes(needle)) return true;
  }

  return false;
}

function directoryIncludesPattern(dir, pattern) {
  const dirPath = path.join(root, dir);
  if (!fs.existsSync(dirPath)) return false;

  const stack = [dirPath];
  while (stack.length) {
    const current = stack.pop();
    const stats = fs.statSync(current);
    if (stats.isDirectory()) {
      for (const child of fs.readdirSync(current)) stack.push(path.join(current, child));
      continue;
    }

    if (stats.isFile() && pattern.test(fs.readFileSync(current, "utf8"))) return true;
  }

  return false;
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

function uniqueSorted(items) {
  return [...new Set(items)].sort();
}

function findMissing(required, inventory) {
  const known = new Set(inventory);
  return required.filter((item) => !known.has(item));
}

function routeMethodNames(route) {
  const text = readFile(route);
  return [...text.matchAll(/export\s+async\s+function\s+([A-Z]+)\s*\(/g)].map((match) => match[1]);
}

const packageJson = JSON.parse(readFile("package.json"));
const dependencies = packageJson.dependencies || {};
const scripts = packageJson.scripts || {};
const externalManagementDomain = ["no", "re", "app", ".com"].join("");
const externalManagementPattern = /nore(?!ferrer)|noreapp|trainer\/home|7977D6D6/i;
const apiRouteFiles = listFiles("app/api", (file) => path.basename(file) === "route.js");

addCheck("runtime", "Next.js is on a patched 15.5.x+ line", versionAtLeast(dependencies.next, "15.5.7"), `next=${dependencies.next}`);
addCheck("runtime", "React is on a patched 19.2.x+ line", versionAtLeast(dependencies.react, "19.2.4"), `react=${dependencies.react}`);
addCheck("runtime", "PostCSS override is pinned", packageJson.overrides?.postcss === "8.5.10", `postcss=${packageJson.overrides?.postcss || "missing"}`);

addCheck(
  "security",
  "Global security headers are configured",
  includesAll("next.config.js", [
    "X-Content-Type-Options",
    "X-Frame-Options",
    "Referrer-Policy",
    "Permissions-Policy",
    "Strict-Transport-Security",
  ]),
);
addCheck(
  "security",
  "API responses are marked no-store",
  includesAll("next.config.js", ["source: '/api/:path*'", "Cache-Control", "no-store", "X-Robots-Tag"]),
);
addCheck(
  "security",
  "Shared rate limit helper exists",
  includesAll("lib/rpRateLimit.js", ["checkSharedRequestRateLimit", "checkDatabaseRateLimit", "checkRateLimit(key"]),
);
addCheck(
  "security",
  "Request body size guard exists",
  includesAll("lib/rpRequestGuards.js", ["checkRequestBodySize", "buildRequestTooLargeResponse", "REQUEST_SIZE_LIMITS"]),
);
addCheck(
  "security",
  "Same-origin state-change guard exists",
  includesAll("lib/rpRequestGuards.js", ["checkSameOriginRequest", "buildForbiddenOriginResponse", "RP_ALLOWED_ORIGINS", "NEXT_PUBLIC_SITE_URL"]),
);
addCheck(
  "security",
  "PostgreSQL shared rate limit buckets are available",
  includesAll("lib/rpDatabase.js", ["rp_rate_limit_buckets", "checkDatabaseRateLimit", "ON CONFLICT (rate_key, window_start)"]),
);
addCheck(
  "security",
  "AI approval and daily usage buckets are available",
  includesAll("lib/rpDatabase.js", ["ai_approved", "rp_ai_usage_buckets", "consumeDatabaseAiUsage"])
    && includesAll("lib/rpAiAccess.js", ["checkAiServiceAccess", "RP_AI_MEMBER_DAILY_LIMIT", "AI_APPROVAL_REQUIRED"]),
);
addCheck(
  "security",
  "Sensitive auth actions write hashed security events",
  includesAll("lib/rpDatabase.js", ["rp_security_events", "recordDatabaseSecurityEvent"])
    && includesAll("lib/rpSecurityEvents.js", ["recordSecurityEvent", "createHmac", "SENSITIVE_KEY_PATTERN"])
    && includesAll("app/api/auth/login/route.js", ["auth.login", "recordSecurityEvent"])
    && includesAll("app/api/admin/login/route.js", ["auth.admin_login", "recordSecurityEvent"])
    && includesAll("app/api/rp/signup/route.js", ["auth.signup", "recordSecurityEvent"])
    && includesAll("app/api/auth/account-recovery/route.js", ["auth.account_recovery", "recordSecurityEvent"])
    && includesAll("app/api/rp/auth-accounts/route.js", ["admin.ai_access_update", "recordSecurityEvent"]),
);
addCheck(
  "security",
  "Account recovery request response avoids account enumeration",
  includesAll("app/api/auth/account-recovery/route.js", [
    "GENERIC_REQUEST_MESSAGE",
    "buildGenericRequestCodeResponse",
    "decoy: true",
    "'decoy_token'",
    "reason: 'account_not_found'",
  ])
    && !readFile("app/api/auth/account-recovery/route.js").includes("accountLookupMatched"),
);
addCheck(
  "security",
  "Member-facing AI consult route is gated by approval and daily usage",
  includesAll("app/api/rp/pe-exam-ai-consult/route.js", ["checkAiServiceAccess", "AI_DAILY_LIMIT_REACHED", "aiUsage"]),
);
addCheck(
  "security",
  "Token-backed staff AI summary route is daily limited",
  includesAll("app/api/rp/consultation-summary/route.js", ["checkAiServiceAccess", "OPENAI_API_KEY", "consultation-summary"]),
);
addCheck(
  "security",
  "Admin account API can manage AI approvals",
  includesAll("app/api/rp/auth-accounts/route.js", ["updateDatabaseAuthAccountAiApproval", "PATCH", "aiApproved"]),
);
addCheck(
  "security",
  "Admin client manager exposes AI approval controls",
  includesAll("components/rp-consultation/RPClientManager.jsx", ["/api/rp/auth-accounts", "AI ACCESS CONTROL", "AI 사용 승인"]),
);
addCheck(
  "security",
  "External management app URL is not wired into homepage code",
  !directoryIncludesText("app", externalManagementDomain)
    && !directoryIncludesText("components", externalManagementDomain)
    && !directoryIncludesText("lib", externalManagementDomain),
);
addCheck(
  "security",
  "External management service identifiers are absent from source code",
  !["app", "components", "lib", "database"].some((dir) => directoryIncludesPattern(dir, externalManagementPattern)),
);
addCheck(
  "security",
  "Baseline SQL migration exists",
  includesAll("database/migrations/20260630_security_scale_baseline.sql", ["rp_auth_accounts", "rp_service_applications", "rp_rate_limit_buckets", "rp_ai_usage_buckets"]),
);
addCheck(
  "security",
  "AI access SQL migration exists",
  includesAll("database/migrations/20260701_ai_access_controls.sql", ["ai_approved", "rp_ai_usage_buckets", "rp_ai_usage_buckets_usage_date_idx"]),
);
addCheck(
  "security",
  "Security event SQL migration exists",
  includesAll("database/migrations/20260701_security_event_log.sql", ["rp_security_events", "actor_hash", "target_hash", "ip_hash"]),
);
addCheck(
  "data",
  "Retention scale index SQL migration exists",
  includesAll("database/migrations/20260702_retention_scale_indexes.sql", [
    "rp_service_applications_retention_idx",
    "rp_pe_exam_ai_consults_retention_idx",
    "rp_pe_exam_questions_retention_idx",
  ])
    && includesAll("scripts/check-rp-database-migration.mjs", [
      "rp_service_applications_retention_idx",
      "rp_pe_exam_ai_consults_retention_idx",
      "rp_pe_exam_questions_retention_idx",
    ]),
);
addCheck(
  "security",
  "Security event audit log documentation exists",
  includesAll("docs/RP_SECURITY_EVENT_AUDIT_LOG.md", ["rp_security_events", "Non-Storage Rules", "oldSecurityEvents"]),
);
addCheck(
  "data",
  "Data retention audit command exists",
  Boolean(scripts["data:retention:audit"]) && includesAll("scripts/audit-rp-data-retention.mjs", ["RP_RETENTION_ALLOW_APPLY", "RETENTION_CONFIRM_TOKEN"]),
);
addCheck(
  "data",
  "Retention audit covers sensitive broad payloads",
  includesAll("lib/rpDataRetention.mjs", ["rp_service_applications", "minimized_on_write", "rp_pe_exam_ai_consults", "rp_pe_exam_questions", "oldAiUsageBuckets", "oldSecurityEvents", "legacyPlainPasswords"]),
);
addCheck(
  "data",
  "Service application payload is minimized before storage",
  includesAll("app/api/rp/service-application/route.js", ["buildMinimizedApplicationPayload", "minimized_on_write", "JSON.stringify(storedPayload)"]),
);
addCheck(
  "data",
  "Service application Google Drive backup payload is minimized",
  includesAll("app/api/rp/service-application/route.js", [
    "buildGoogleDriveBackupApplication",
    "buildGoogleDriveBackupClient",
    "minimized_on_send",
    "application: backupApplication",
    "client: backupClient",
  ]),
);
addCheck(
  "data",
  "PE exam AI consult JSON records are minimized before storage",
  includesAll("lib/rpDatabase.js", [
    "buildMinimizedPeExamAiConsultPayload",
    "buildMinimizedPeExamAiConversationRecord",
    "minimized_on_write",
    "JSON.stringify(storedPayload)",
    "JSON.stringify(storedConversationRecord)",
  ]),
);
addCheck(
  "data",
  "PE exam AI consult Google Drive backup payload is minimized",
  includesAll("app/api/rp/pe-exam-ai-consult/route.js", [
    "buildPeExamAiConsultBackupRecord",
    "minimized_on_send",
    "record: backupRecord",
    "peExamAiConsult: backupRecord",
  ]),
);
addCheck(
  "data",
  "PE exam question payload is minimized before storage",
  includesAll("lib/rpDatabase.js", [
    "buildMinimizedPeExamQuestionPayload",
    "buildMinimizedPeExamQuestionPayload(question)",
    "kind: 'pe_exam_question'",
    "minimized_on_write",
    "JSON.stringify(storedPayload)",
  ]),
);
addCheck(
  "data",
  "Retention logic is shared by CLI and cron",
  includesAll("scripts/audit-rp-data-retention.mjs", ["runDataRetention", "summarizeRetentionResult", "RETENTION_CONFIRM_TOKEN"])
    && includesAll("app/api/rp/maintenance/retention/route.js", ["runDataRetention", "summarizeRetentionResult", "RP_RETENTION_CRON_APPLY"]),
);
addCheck(
  "data",
  "Retention apply mode is transactional",
  includesAll("lib/rpDataRetention.mjs", ["BEGIN", "COMMIT", "ROLLBACK"]),
);
addCheck(
  "data",
  "Retention cron route is bearer-secret protected",
  includesAll("app/api/rp/maintenance/retention/route.js", [
    "CRON_SECRET",
    "RP_MAINTENANCE_CRON_SECRET",
    "getBearerToken",
    "getMaintenanceSecret",
    "if (!token)",
    "status: 401",
    "status: 403",
    "safeEqual",
    "authorization",
    "Bearer ",
  ]),
);
addCheck(
  "data",
  "Vercel retention cron is configured",
  fileExists("vercel.json")
    && includesAll("vercel.json", ["\"crons\"", "\"/api/rp/maintenance/retention\"", "\"0 18 1 * *\""]),
);
addCheck(
  "traffic",
  "Campaign readiness command exists",
  Boolean(scripts["ops:campaign:check"])
    && includesAll("scripts/check-rp-campaign-readiness.mjs", ["--build", "--typecheck", "--database", "--vercel", "--public", "Manual gates before a high-traffic campaign"]),
);
addCheck(
  "traffic",
  "Campaign Vercel gate requires deployed HEAD match",
  includesAll("scripts/check-rp-campaign-readiness.mjs", ["ops:vercel:check", "--require-commit-match", "deployed HEAD matching"])
    && includesAll("scripts/check-rp-vercel-production.mjs", ["requireCommitMatch", "expectedCommit", "latest deployment commit matches expected"]),
);
addCheck(
  "pe-data",
  "PE exam data freshness gate exists",
  Boolean(scripts["pe-exam:data:freshness"])
    && includesAll("scripts/check-pe-exam-data-freshness.mjs", [
      "schoolYear",
      "generatedAt",
      "min-kusf-year",
      "min-adiga-year",
      "max-age-days",
    ])
    && includesAll("scripts/check-rp-campaign-readiness.mjs", ["pe-exam:data:freshness", "PE exam source freshness"]),
);
addCheck(
  "data",
  "Database migration check command exists",
  Boolean(scripts["db:migration:check"])
    && includesAll("scripts/check-rp-database-migration.mjs", ["rp_auth_accounts", "rp_rate_limit_buckets", "rp_ai_usage_buckets", "requiredIndexes", "--allow-missing-database"]),
);
addCheck(
  "data",
  "Database migration apply command is gated",
  Boolean(scripts["db:migration:apply"])
    && includesAll("scripts/apply-rp-database-migration.mjs", ["RP_DATABASE_MIGRATION_ALLOW_APPLY", "APPLY_RP_DB_MIGRATION", "database/migrations", "db:migration:check"]),
);
addCheck(
  "traffic",
  "Vercel production check command exists",
  Boolean(scripts["ops:vercel:check"])
    && includesAll("scripts/check-rp-vercel-production.mjs", [
      "VERCEL_TOKEN",
      "DEFAULT_PROJECTS",
      "RP_VERCEL_PROJECT_IDS",
      "CRON_SECRET",
      "RP_MAINTENANCE_CRON_SECRET",
      "/v9/projects",
      "/v13/deployments",
      "/v1/security/firewall/config/active",
    ]),
);
addCheck(
  "traffic",
  "Public production smoke check command exists",
  Boolean(scripts["ops:public:check"])
    && includesAll("scripts/check-rp-public-production.mjs", [
      "DEFAULT_BASE_URLS",
      "requiredPageHeaders",
      "protectedApiChecks",
      "externalServiceChecks",
      "strict-transport-security",
      "x-robots-tag",
    ])
    && includesAll("scripts/check-rp-campaign-readiness.mjs", ["ops:public:check", "Public production smoke and security gates"]),
);
addCheck(
  "traffic",
  "High-traffic campaign runbook exists",
  includesAll("docs/RP_CAMPAIGN_READINESS_RUNBOOK.md", ["Vercel Firewall", "npm.cmd run ops:campaign:check", "PE exam data freshness"]),
);
addCheck(
  "traffic",
  "Vercel production audit document exists",
  includesAll("docs/RP_VERCEL_PRODUCTION_AUDIT.md", [
    "Production projects",
    "prj_W2sXR8dobiMSH9QGksPYnwbhX03Z",
    "prj_VOlVshBafX9Njmw5ZzgVDc9b2syC",
    "CRON_SECRET",
    "Known gaps",
  ]),
);
addCheck(
  "traffic",
  "Vercel firewall rule checklist exists",
  includesAll("docs/RP_VERCEL_FIREWALL_RULES.md", [
    "/api/auth/login",
    "/api/rp/service-application",
    "/api/rp/clients",
    "/api/rp/auth-accounts",
  ]),
);
addCheck("security", "Shared safe comparison helper exists", fileExists("lib/rpSecurity.js") && readFile("lib/rpSecurity.js").includes("safeEqual"));
addCheck(
  "security",
  "PostgreSQL legacy password fallback auto-migrates",
  includesAll("lib/rpDatabase.js", ["migratePlainDatabasePassword", "password_plain = NULL", "safeEqual(account.password_plain"]),
);
addCheck(
  "security",
  "Google backup query secret is legacy opt-in only",
  includesAll("lib/rpGoogleDriveBackup.js", ["RP_BACKUP_SECRET_IN_QUERY", "isEnabledFlag(process.env.RP_BACKUP_SECRET_IN_QUERY)"]),
);

const rateLimitedRoutes = [
  "app/api/auth/login/route.js",
  "app/api/admin/login/route.js",
  "app/api/auth/identity-verification/route.js",
  "app/api/auth/account-recovery/route.js",
  "app/api/rp/signup/route.js",
  "app/api/rp/service-application/route.js",
  "app/api/rp/pe-exam-question/route.js",
  "app/api/rp/pe-exam-ai-consult/route.js",
  "app/api/rp/consultation-summary/route.js",
  "app/api/rp/clients/route.js",
  "app/api/rp/auth-accounts/route.js",
  "app/api/rp/system-status/route.js",
];

for (const route of rateLimitedRoutes) {
  addCheck("traffic", `${route} uses shared rate limiting`, includesAll(route, ["checkSharedRequestRateLimit", "buildRateLimitResponse"]));
}

const bodyLimitedRoutes = [
  "app/api/auth/login/route.js",
  "app/api/admin/login/route.js",
  "app/api/auth/identity-verification/route.js",
  "app/api/auth/account-recovery/route.js",
  "app/api/rp/signup/route.js",
  "app/api/rp/service-application/route.js",
  "app/api/rp/pe-exam-question/route.js",
  "app/api/rp/pe-exam-ai-consult/route.js",
  "app/api/rp/consultation-summary/route.js",
  "app/api/rp/clients/route.js",
  "app/api/rp/auth-accounts/route.js",
];

for (const route of bodyLimitedRoutes) {
  addCheck("traffic", `${route} enforces request body size`, includesAll(route, ["checkRequestBodySize", "buildRequestTooLargeResponse"]));
}

const originProtectedRoutes = [
  ...bodyLimitedRoutes,
  "app/api/auth/logout/route.js",
  "app/api/admin/logout/route.js",
];

for (const route of originProtectedRoutes) {
  addCheck("security", `${route} rejects foreign origins`, includesAll(route, ["checkSameOriginRequest", "buildForbiddenOriginResponse"]));
}

const bearerSecretRoutes = [
  "app/api/rp/maintenance/retention/route.js",
];

const protectedApiRouteInventory = uniqueSorted([
  ...rateLimitedRoutes,
  ...originProtectedRoutes,
  ...bearerSecretRoutes,
]);
const missingProtectedApiRoutes = findMissing(apiRouteFiles, protectedApiRouteInventory);
addCheck(
  "security",
  "All API routes are covered by the protection inventory",
  missingProtectedApiRoutes.length === 0,
  missingProtectedApiRoutes.length ? `missing=${missingProtectedApiRoutes.join(", ")}` : "",
);

const stateChangingApiRoutes = apiRouteFiles.filter((route) =>
  routeMethodNames(route).some((method) => !["GET", "HEAD", "OPTIONS"].includes(method)),
);
const missingOriginGuards = findMissing(stateChangingApiRoutes, uniqueSorted(originProtectedRoutes));
addCheck(
  "security",
  "All state-changing API routes are same-origin guarded",
  missingOriginGuards.length === 0,
  missingOriginGuards.length ? `missing=${missingOriginGuards.join(", ")}` : "",
);

const jsonBodyRoutes = apiRouteFiles.filter((route) => readFile(route).includes("request.json("));
const missingBodySizeGuards = findMissing(jsonBodyRoutes, uniqueSorted(bodyLimitedRoutes));
addCheck(
  "traffic",
  "All JSON body API routes are request-size guarded",
  missingBodySizeGuards.length === 0,
  missingBodySizeGuards.length ? `missing=${missingBodySizeGuards.join(", ")}` : "",
);

addCheck(
  "traffic",
  "Consultation summary requires staff session",
  includesAll("app/api/rp/consultation-summary/route.js", ["verifyAdminSessionCookie", "hasStaffRole", "OPENAI_API_KEY"]),
);

addCheck(
  "traffic",
  "Customer clients API requires staff session",
  includesAll("app/api/rp/clients/route.js", ["verifyAdminSessionCookie", "hasStaffAccess", "ADMIN_COOKIE_NAME"]),
);

addCheck(
  "traffic",
  "Auth account API requires staff session",
  includesAll("app/api/rp/auth-accounts/route.js", ["verifyAdminSessionCookie", "hasStaffAccess", "ADMIN_COOKIE_NAME"]),
);

addCheck(
  "traffic",
  "System status API requires staff session",
  includesAll("app/api/rp/system-status/route.js", ["verifyAdminSessionCookie", "hasStaffAccess", "ADMIN_COOKIE_NAME"]),
);

addCheck(
  "traffic",
  "Account recovery has request and verification limits",
  includesAll("app/api/auth/account-recovery/route.js", ["PHONE_REQUEST_LIMIT", "IP_REQUEST_LIMIT", "VERIFY_ATTEMPT_LIMIT"]),
);

addCheck("pe-data", "PE exam data refresh command exists", Boolean(scripts["pe-exam:data:refresh"]));
addCheck("pe-data", "PE exam data coverage audit command exists", Boolean(scripts["pe-exam:data:audit"]));
addCheck("pe-data", "KUSF summary fetch script exists", fileExists("scripts/fetch-kusf-pe-exam-data.mjs"));
addCheck("pe-data", "KUSF detail fetch script exists", fileExists("scripts/fetch-kusf-pe-exam-detail-data.mjs"));
addCheck("pe-data", "ADIGA regular fetch script exists", fileExists("scripts/fetch-adiga-pe-exam-regular-data.mjs"));
addCheck("pe-data", "ADIGA selection fetch script exists", fileExists("scripts/fetch-adiga-pe-exam-selection-data.mjs"));
addCheck("pe-data", "Coverage audit script exists", fileExists("scripts/audit-pe-exam-university-coverage.mjs"));

const byArea = new Map();
for (const check of checks) {
  if (!byArea.has(check.area)) byArea.set(check.area, []);
  byArea.get(check.area).push(check);
}

console.log("RePERFORMANCE operational readiness audit");
for (const [area, areaChecks] of byArea.entries()) {
  console.log(`\n[${area}]`);
  for (const check of areaChecks) {
    console.log(`${check.ok ? "OK" : "FAIL"} ${check.name}${check.detail ? ` (${check.detail})` : ""}`);
  }
}

const failed = checks.filter((check) => !check.ok);
console.log(`\nSummary: ${checks.length - failed.length}/${checks.length} checks passed`);

if (failed.length) {
  process.exitCode = 1;
}
