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
  "Session cookie security options are centralized",
  includesAll("lib/rpAdminAuth.js", [
    "getAdminCookieSecurityOptions",
    "getAdminCookieOptions",
    "getAdminCookieClearOptions",
    "httpOnly: true",
    "secure: process.env.NODE_ENV === 'production'",
    "sameSite: 'lax'",
    "maxAge: getAdminSessionTtlSeconds()",
    "maxAge: 0",
  ])
    && includesAll("app/api/auth/login/route.js", ["getAdminCookieOptions", "response.cookies.set(ADMIN_COOKIE_NAME, session, getAdminCookieOptions())"])
    && includesAll("app/api/admin/login/route.js", ["getAdminCookieOptions", "response.cookies.set(ADMIN_COOKIE_NAME, session, getAdminCookieOptions())"])
    && includesAll("app/api/rp/signup/route.js", ["getAdminCookieOptions", "response.cookies.set(ADMIN_COOKIE_NAME, session, getAdminCookieOptions())"])
    && includesAll("app/api/auth/logout/route.js", ["getAdminCookieClearOptions", "response.cookies.set(ADMIN_COOKIE_NAME, '', getAdminCookieClearOptions())"])
    && includesAll("app/api/admin/logout/route.js", ["getAdminCookieClearOptions", "response.cookies.set(ADMIN_COOKIE_NAME, '', getAdminCookieClearOptions())"])
    && !readFile("app/api/auth/logout/route.js").includes("secure: process.env.NODE_ENV")
    && !readFile("app/api/admin/logout/route.js").includes("secure: process.env.NODE_ENV"),
);
addCheck(
  "security",
  "Production signing and password secrets are strength-gated",
  includesAll("lib/rpSecurity.js", [
    "MIN_PRODUCTION_SECRET_LENGTH",
    "assertStrongProductionSecret",
    "getProductionSecretStatus",
    "PLACEHOLDER_SECRET_PATTERN",
  ])
    && includesAll("lib/rpAdminAuth.js", ["assertStrongProductionSecret", "RP_ADMIN_SESSION_SECRET or RP_API_SECRET"])
    && includesAll("lib/rpIdentityVerification.js", ["assertStrongProductionSecret", "RP_IDENTITY_VERIFICATION_SECRET or fallback signing secret"])
    && includesAll("app/api/auth/account-recovery/route.js", ["assertStrongProductionSecret", "RP_ACCOUNT_RECOVERY_SECRET or fallback signing secret"])
    && includesAll("lib/rpDatabase.js", ["assertStrongProductionSecret", "RP_PASSWORD_HASH_SECRET or fallback signing secret"])
    && includesAll("lib/rpSheetAuthStore.js", ["assertStrongProductionSecret", "RP_PASSWORD_HASH_SECRET or fallback signing secret"])
    && includesAll("app/api/rp/system-status/route.js", [
      "getProductionSecretStatus",
      "buildSecretStatus",
      "signingSecret",
      "passwordHash",
    ])
    && includesAll("docs/RP_PRODUCTION_SECRET_POLICY.md", [
      "at least 32 characters",
      "placeholder",
      "RP_ADMIN_SESSION_SECRET",
      "RP_PASSWORD_HASH_SECRET",
    ]),
);
addCheck(
  "security",
  "Production environment auth accounts require explicit opt-in",
  includesAll("lib/rpAdminAuth.js", [
    "areEnvironmentAuthAccountsAllowed",
    "RP_ALLOW_ENV_AUTH_ACCOUNTS",
    "process.env.NODE_ENV !== 'production'",
    "if (!areEnvironmentAuthAccountsAllowed()) return [];",
  ])
    && includesAll("app/api/rp/system-status/route.js", [
      "areEnvironmentAuthAccountsAllowed",
      "productionOptInRequired",
      "seedAccounts",
    ])
    && includesAll("docs/RP_PRIVACY_SECURITY_REVIEW.md", [
      "RP_ALLOW_ENV_AUTH_ACCOUNTS=true",
      "environment-variable auth accounts",
    ]),
);
addCheck(
  "security",
  "Shared rate limit helper exists",
  includesAll("lib/rpRateLimit.js", [
    "checkSharedRequestRateLimit",
    "checkDatabaseRateLimit",
    "checkRateLimit(key",
    "isSharedRateLimitFailClosed",
    "RP_RATE_LIMIT_FAIL_CLOSED",
  ]),
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
  "Middleware rejects foreign protected API writes before staff auth",
  includesAll("middleware.js", [
    "checkSameOriginRequest",
    "buildForbiddenOriginResponse",
    "isProtectedApiPath(pathname) && isStateChangingMethod(request.method)",
    "verifyAdminSessionCookie",
  ]),
);
addCheck(
  "security",
  "PostgreSQL shared rate limit buckets are available",
  includesAll("lib/rpDatabase.js", ["rp_rate_limit_buckets", "checkDatabaseRateLimit", "ON CONFLICT (rate_key, window_start)"]),
);
addCheck(
  "security",
  "Auth account lockout controls are available",
  includesAll("lib/rpDatabase.js", [
    "failed_login_count",
    "failed_login_window_started_at",
    "locked_until",
    "getDatabaseAuthLockoutPolicy",
    "verifyDatabaseAuthAccount",
    "recordDatabaseAuthLoginFailure",
    "resetDatabaseAuthLoginFailure",
    "rp_auth_accounts_locked_until_idx",
  ])
    && includesAll("lib/rpAuthStores.js", ["verifyAuthAccountFromStores", "accountFound", "databaseResult"])
    && includesAll("app/api/auth/login/route.js", ["verifyAuthAccountFromStores", "failedLoginCount", "lockedUntil"])
    && includesAll("app/api/admin/login/route.js", ["verifyAuthAccountFromStores", "failedLoginCount", "lockedUntil"])
    && includesAll("app/api/rp/system-status/route.js", ["loginLockout", "auth_lockout_store_not_ready"]),
);
addCheck(
  "security",
  "AI approval and daily usage buckets are available",
  includesAll("lib/rpDatabase.js", ["ai_approved", "ai_daily_limit", "rp_ai_usage_buckets", "AI_USAGE_DAILY_ROUTE_KEY", "daily_usage", "route_usage", "consumeDatabaseAiUsage"])
    && includesAll("lib/rpAiAccess.js", ["checkAiServiceAccess", "RP_AI_MEMBER_DAILY_LIMIT", "RP_AI_DAILY_LIMIT_MAX", "AI_APPROVAL_REQUIRED"]),
);
addCheck(
  "security",
  "Sensitive auth actions write hashed security events",
  includesAll("lib/rpDatabase.js", ["rp_security_events", "recordDatabaseSecurityEvent"])
    && includesAll("lib/rpSecurityEvents.js", ["recordSecurityEvent", "createHmac", "SENSITIVE_KEY_PATTERN"])
    && includesAll("lib/rpDatabase.js", ["listDatabaseSecurityEvents", "actorHashPrefix", "ipPrefixes"])
    && includesAll("app/api/auth/login/route.js", ["auth.login", "recordSecurityEvent"])
    && includesAll("app/api/admin/login/route.js", ["auth.admin_login", "recordSecurityEvent"])
    && includesAll("app/api/rp/signup/route.js", ["auth.signup", "recordSecurityEvent"])
    && includesAll("app/api/auth/account-recovery/route.js", ["auth.account_recovery", "recordSecurityEvent"])
    && includesAll("app/api/rp/auth-accounts/route.js", ["admin.ai_access_update", "recordSecurityEvent"]),
);
addCheck(
  "security",
  "Staff security event monitor exists without raw PII exposure",
  includesAll("app/api/rp/security-events/route.js", ["listDatabaseSecurityEvents", "verifyAdminSessionCookie", "hasStaffAccess", "checkSharedRequestRateLimit"])
    && includesAll("app/admin/security/page.jsx", ["보안 이벤트 점검", "actorHashPrefix", "ipPrefix", "원본 전화번호·이메일·IP는 표시하지 않습니다", "verifyAdminSessionCookie", "hasStaffAccess", "redirect"])
    && includesAll("app/admin/page.tsx", ["/admin/security", "보안 이벤트"]),
);
addCheck(
  "security",
  "System status summarizes auth security monitoring",
  includesAll("app/api/rp/system-status/route.js", [
    "buildSecurityMonitoringStatus",
    "listDatabaseSecurityEvents",
    "securityMonitoring",
    "auth_failure_volume_high",
    "auth_rate_limit_triggered",
    "security_event_ip_prefix_volume_high",
  ])
    && includesAll("scripts/check-rp-system-status.mjs", [
      "securityMonitoring is available",
      "auth security event counters are reported",
      "auth abuse thresholds are reported",
      "--security-strict",
      "securityMonitoring.status is normal in strict mode",
    ])
    && includesAll("docs/RP_PRIVACY_SECURITY_REVIEW.md", [
      "securityMonitoring",
      "authFailureCount",
      "rateLimitedCount",
    ]),
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
  "Public-facing API error responses are sanitized",
  includesAll("lib/rpPublicErrors.js", [
    "INTERNAL_ERROR_PATTERN",
    "getSafePublicErrorMessage",
    "getPublicErrorStatus",
    "exposePublicError",
  ])
    && includesAll("lib/rpIdentityVerification.js", ["exposePublicError"])
    && includesAll("app/api/auth/identity-verification/route.js", ["getSafePublicErrorMessage", "getPublicErrorStatus"])
    && includesAll("app/api/auth/account-recovery/route.js", ["getSafePublicErrorMessage", "getPublicErrorStatus"])
    && includesAll("app/api/rp/signup/route.js", ["getSafePublicErrorMessage", "buildPublicSignupResult", "buildPublicBackupResult"])
    && includesAll("app/api/rp/pe-exam-question/route.js", ["getSafePublicErrorMessage", "질문 저장소 설정"])
    && includesAll("app/api/rp/pe-exam-ai-consult/route.js", ["getSafePublicErrorMessage", "buildPublicBackupResult", "AI 상담 준비 저장소 설정"])
    && includesAll("app/api/rp/consultation-summary/route.js", ["getSafePublicErrorMessage"]),
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
  "Admin account API can manage AI approvals and daily limits",
  includesAll("app/api/rp/auth-accounts/route.js", ["updateDatabaseAuthAccountAiAccess", "PATCH", "aiApproved", "aiDailyLimit", "getAiDailyLimitMax"]),
);
addCheck(
  "security",
  "Admin client manager exposes AI approval and daily limit controls",
  includesAll("components/rp-consultation/RPClientManager.jsx", ["/api/rp/auth-accounts", "AI ACCESS CONTROL", "AI 사용 승인", "회원별 일일 한도", "한도 저장"]),
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
  includesAll("database/migrations/20260630_security_scale_baseline.sql", ["rp_auth_accounts", "rp_service_applications", "rp_rate_limit_buckets", "rp_ai_usage_buckets", "failed_login_count", "rp_auth_accounts_locked_until_idx"]),
);
addCheck(
  "security",
  "Auth account lockout SQL migration exists",
  includesAll("database/migrations/20260710_auth_account_lockout.sql", [
    "failed_login_count",
    "failed_login_window_started_at",
    "locked_until",
    "rp_auth_accounts_locked_until_idx",
  ]),
);
addCheck(
  "security",
  "AI access SQL migration exists",
  includesAll("database/migrations/20260701_ai_access_controls.sql", ["ai_approved", "ai_daily_limit", "rp_ai_usage_buckets", "rp_ai_usage_buckets_usage_date_idx"]),
);
addCheck(
  "security",
  "Signup verified contacts are unique per account",
  includesAll("database/migrations/20260703_auth_contact_uniqueness.sql", [
    "rp_auth_accounts_verified_contact_unique_idx",
    "LOWER(TRIM(verification_method))",
    "LOWER(TRIM(verified_contact))",
  ])
    && includesAll("lib/rpDatabase.js", [
      "assertVerifiedContactAvailable",
      "isUniqueViolation",
      "rp_auth_accounts_verified_contact_unique_idx",
    ])
    && includesAll("scripts/check-rp-database-migration.mjs", [
      "rp_auth_accounts_verified_contact_unique_idx",
      "Auth verified contact duplicates are resolved",
    ])
    && includesAll("scripts/apply-rp-database-migration.mjs", [
      "CREATE UNIQUE INDEX IF NOT EXISTS rp_auth_accounts_verified_contact_unique_idx",
    ])
    && includesAll("docs/RP_CUSTOMER_DATA_AUTH_MODEL.md", ["verified contact", "one account"]),
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
  includesAll("scripts/audit-rp-data-retention.mjs", [
    "runDataRetention",
    "summarizeRetentionResult",
    "RETENTION_CONFIRM_TOKEN",
    "--require-database",
    "--max-prunable-candidates",
    "evaluateGates",
  ])
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
    && includesAll("scripts/check-rp-campaign-readiness.mjs", [
      "--build",
      "--typecheck",
      "--database",
      "--vercel",
      "--public",
      "--retention-strict",
      "--security-strict",
      "--max-prunable-candidates=0",
      "includeSecurityStrict",
      "securityMonitoring.status=normal",
      "Manual gates before a high-traffic campaign",
      "RP_DATA_SOURCE",
      "RP_DATABASE_POOL_MAX",
      "RP_SMS_WEBHOOK_URL",
      "RP_RATE_LIMIT_FAIL_CLOSED",
    ]),
);
addCheck(
  "traffic",
  "Campaign Vercel gate requires deployed HEAD match",
  includesAll("scripts/check-rp-campaign-readiness.mjs", ["ops:vercel:check", "--require-commit-match", "deployed HEAD matching"])
    && includesAll("scripts/check-rp-vercel-production.mjs", ["requireCommitMatch", "expectedCommit", "latest deployment commit matches expected"]),
);
addCheck(
  "pe-data",
  "PE exam data freshness gate is wired into snapshot verification",
  Boolean(scripts["pe-exam:data:freshness"])
    && Boolean(scripts["pe-exam:data:status"])
    && includesAll("scripts/check-pe-exam-data-freshness.mjs", [
      "schoolYear",
      "generatedAt",
      "min-kusf-year",
      "min-adiga-year",
      "max-age-days",
    ])
    && includesAll("scripts/lib/peExamSourceStatus.mjs", [
      "buildPeExamSourceStatus",
      "PE_EXAM_SOURCE_FILES",
      "DEFAULT_PE_EXAM_MAX_AGE_DAYS",
    ])
    && includesAll("scripts/write-pe-exam-source-status.mjs", [
      "peExamSourceStatusSnapshot",
      "sourceSnapshotsMaxGeneratedAt",
    ])
    && includesAll("scripts/refresh-pe-exam-data.mjs", [
      "write-pe-exam-source-status.mjs",
      "status-only",
    ])
    && includesAll("scripts/check-rp-campaign-readiness.mjs", ["pe-exam:data:verify", "PE exam source snapshot gates"]),
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
  "data",
  "Runtime schema sync can be disabled after migrations",
  includesAll("lib/rpDatabase.js", [
    "isRuntimeSchemaSyncDisabled",
    "RP_DISABLE_RUNTIME_SCHEMA_SYNC",
    "RP_RUNTIME_SCHEMA_SYNC",
    "ensureDatabaseSchema",
  ])
    && includesAll("app/api/rp/service-application/route.js", [
      "isRuntimeSchemaSyncDisabled",
      "ensureApplicationSchema",
    ])
    && includesAll("app/api/rp/system-status/route.js", [
      "runtimeSchemaSyncDisabled",
      "isRuntimeSchemaSyncDisabled",
    ])
    && includesAll("docs/RP_DATABASE_MIGRATION_RUNBOOK.md", [
      "RP_DISABLE_RUNTIME_SCHEMA_SYNC=true",
      "db:migration:check",
    ]),
);
addCheck(
  "data",
  "System status reports production schema readiness",
  includesAll("lib/rpDatabase.js", [
    "checkDatabaseSchemaReadiness",
    "verifiedContactUniquenessReady",
    "allRequiredTablesPresent",
    "allRequiredIndexesPresent",
    "rateLimitBucketsReady",
    "aiUsageBucketsReady",
    "retentionIndexesReady",
    "securityEventsReady",
    "schema_check_failed",
  ])
    && includesAll("app/api/rp/system-status/route.js", [
      "checkDatabaseSchemaReadiness",
      "schema: databaseSchema",
      "database_required_tables_missing",
      "database_required_indexes_missing",
      "shared_rate_limit_store_not_ready",
      "ai_usage_buckets_not_ready",
      "retention_indexes_not_ready",
      "security_event_store_not_ready",
    ])
    && includesAll("docs/RP_DATABASE_MIGRATION_RUNBOOK.md", [
      "/api/rp/system-status",
      "verifiedContactUniquenessReady",
      "allRequiredTablesPresent",
      "rateLimitBucketsReady",
      "retentionIndexesReady",
    ]),
);
addCheck(
  "traffic",
  "System status summarizes high-traffic readiness",
  includesAll("app/api/rp/system-status/route.js", [
    "buildHighTrafficReadiness",
    "getDatabasePoolConfig",
    "highTrafficReadiness",
    "database_required_tables_missing",
    "database_required_indexes_missing",
    "runtime_schema_sync_enabled",
    "auth_verified_contact_uniqueness_not_ready",
    "shared_rate_limit_store_not_ready",
    "ai_usage_buckets_not_ready",
    "rate_limit_fail_closed_not_enabled",
    "database_pool_max_not_explicit",
    "database_pool_max_invalid",
    "database_pool_max_low",
    "database_pool_max_high",
    "pe_exam_data_not_fresh",
    "requiredManualChecks",
  ])
    && includesAll("docs/RP_CAMPAIGN_READINESS_RUNBOOK.md", [
      "highTrafficReadiness.ready",
      "highTrafficReadiness.blockers",
      "storage.postgres.pool.max",
      "storage.postgres.pool.validMax",
      "RP_DATABASE_POOL_MAX",
    ])
    && includesAll("docs/RP_PRIVACY_SECURITY_REVIEW.md", [
      "highTrafficReadiness.ready",
      "storage.postgres.pool.max",
      "storage.postgres.pool.validMax",
    ]),
);
addCheck(
  "traffic",
  "System status summarizes objective-level readiness",
  includesAll("app/api/rp/system-status/route.js", [
    "buildObjectiveReadiness",
    "objectiveReadiness",
    "customerDataSecurity",
    "signupLoginSecurity",
    "peExamDataMaintenance",
    "trafficSurgeReadiness",
    "dataScaleManagement",
    "retentionCron",
    "rate_limit_fail_closed_not_enabled",
    "databasePool",
  ])
    && includesAll("docs/RP_CAMPAIGN_READINESS_RUNBOOK.md", [
      "objectiveReadiness",
      "customerDataSecurity",
      "signupLoginSecurity",
      "peExamDataMaintenance",
      "trafficSurgeReadiness",
      "dataScaleManagement",
    ])
    && includesAll("docs/RP_PRIVACY_SECURITY_REVIEW.md", [
      "objectiveReadiness.customerDataSecurity",
      "objectiveReadiness.signupLoginSecurity",
      "objectiveReadiness.dataScaleManagement",
    ]),
);
addCheck(
  "pe-data",
  "System status reports PE exam source freshness",
  fileExists("app/pe-exam/peExamSourceStatus.js")
    && includesAll("app/pe-exam/peExamSourceStatus.js", [
      "peExamSourceStatusSnapshot",
      "sourceSnapshotsMaxGeneratedAt",
      "maxAgeDays",
    ])
    && includesAll("app/api/rp/system-status/route.js", [
      "peExamSourceStatusSnapshot",
      "buildPeExamDataStatus",
      "peExamData",
      "refreshCommand",
    ])
    && includesAll("docs/RP_CAMPAIGN_READINESS_RUNBOOK.md", [
      "peExamData.ok",
      "pe-exam:data:status",
    ]),
);
addCheck(
  "traffic",
  "Vercel production check command exists",
  Boolean(scripts["ops:vercel:check"])
    && includesAll("scripts/check-rp-vercel-production.mjs", [
      "VERCEL_TOKEN",
      "DEFAULT_PROJECTS",
      "RP_VERCEL_PROJECT_IDS",
      "RP_DATA_SOURCE",
      "RP_DISABLE_RUNTIME_SCHEMA_SYNC",
      "RP_DATABASE_POOL_MAX",
      "RP_SMS_WEBHOOK_URL",
      "NEXT_PUBLIC_SITE_URL",
      "RP_RATE_LIMIT_FAIL_CLOSED",
      "CRON_SECRET",
      "RP_MAINTENANCE_CRON_SECRET",
      "/v9/projects",
      "/v13/deployments",
      "/v1/security/firewall/config/active",
    ])
    && includesAll("docs/RP_CAMPAIGN_READINESS_RUNBOOK.md", [
      "RP_DATABASE_POOL_MAX",
      "RP_RATE_LIMIT_FAIL_CLOSED",
      "SMS verification webhook",
    ])
    && includesAll("docs/RP_VERCEL_PRODUCTION_AUDIT.md", [
      "Verified deployment ID",
      "Commit:",
      "RP_DATABASE_POOL_MAX",
      "RP_RATE_LIMIT_FAIL_CLOSED",
      "SMS verification webhook",
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
      "foreignOriginApiChecks",
      "checkForeignOriginApi",
      "Request origin is not allowed.",
      "externalServiceChecks",
      "extractStaticAssetPaths",
      "staticAssetCacheHeaders",
      "checkPublicPageCache",
      "checkResponseTime",
      "strict-transport-security",
      "x-robots-tag",
    ])
    && includesAll("scripts/check-rp-campaign-readiness.mjs", ["ops:public:check", "Public production smoke and security gates"]),
);
addCheck(
  "traffic",
  "Staff system-status production check command exists",
  Boolean(scripts["ops:status:check"])
    && includesAll("scripts/check-rp-system-status.mjs", [
      "RP_SYSTEM_STATUS_COOKIE",
      "RP_ADMIN_SESSION_COOKIE",
      "storage.postgres.configured",
      "storage.postgres.runtimeSchemaSyncDisabled",
      "storage.postgres.schema.allRequiredTablesPresent",
      "storage.postgres.schema.allRequiredIndexesPresent",
      "storage.postgres.schema.verifiedContactUniquenessReady",
      "storage.postgres.schema.rateLimitBucketsReady",
      "storage.postgres.schema.aiUsageBucketsReady",
      "storage.postgres.schema.retentionIndexesReady",
      "storage.postgres.schema.securityEventsReady",
      "auth login lockout policy is reported",
      "auth?.loginLockout",
      "storage.postgres.pool.max",
      "storage.postgres.pool.validMax",
      "postgres pool max is reported",
      "trafficControls?.sharedRateLimit",
      "shared rate-limit failure mode is reported",
      "highTrafficReadiness.ready",
      "objectiveReadiness",
      "cookie=provided via env; value is never printed",
    ])
    && includesAll("scripts/check-rp-campaign-readiness.mjs", [
      "--status",
      "--system-status",
      "--security-strict",
      "ops:status:check",
      "Production system-status readiness gates",
    ])
    && includesAll("docs/RP_CAMPAIGN_READINESS_RUNBOOK.md", [
      "npm.cmd run ops:status:check",
      "RP_SYSTEM_STATUS_COOKIE",
      "storage.postgres.configured",
      "storage.postgres.pool.max",
      "storage.postgres.pool.validMax",
      "storage.postgres.schema.allRequiredTablesPresent",
      "storage.postgres.schema.rateLimitBucketsReady",
      "RP_RATE_LIMIT_FAIL_CLOSED",
      "objectiveReadiness.*.ready",
    ])
    && includesAll("docs/RP_PRIVACY_SECURITY_REVIEW.md", [
      "npm run ops:status:check",
      "RP_SYSTEM_STATUS_COOKIE",
    ]),
);
addCheck(
  "traffic",
  "Server outbound fetches are timeout-bound",
  includesAll("lib/rpOutboundFetch.js", [
    "fetchWithTimeout",
    "AbortController",
    "RP_OUTBOUND_FETCH_TIMEOUT_MS",
    "Outbound request timed out",
  ])
    && includesAll("lib/rpGoogleDriveBackup.js", ["fetchWithTimeout", "RP_GOOGLE_BACKUP_FETCH_TIMEOUT_MS"])
    && includesAll("lib/rpSheetAuthStore.js", ["fetchWithTimeout", "RP_AUTH_SCRIPT_FETCH_TIMEOUT_MS"])
    && includesAll("lib/rpIdentityVerification.js", ["fetchWithTimeout", "RP_WEBHOOK_FETCH_TIMEOUT_MS"])
    && includesAll("app/api/auth/account-recovery/route.js", ["fetchWithTimeout", "RP_WEBHOOK_FETCH_TIMEOUT_MS"])
    && includesAll("app/api/rp/clients/route.js", ["fetchWithTimeout", "RP_GOOGLE_BACKUP_FETCH_TIMEOUT_MS"])
    && includesAll("app/api/rp/consultation-summary/route.js", ["fetchWithTimeout", "RP_OPENAI_FETCH_TIMEOUT_MS"])
    && includesAll("docs/RP_PRIVACY_SECURITY_REVIEW.md", ["Server-side outbound calls", "fetchWithTimeout"]),
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
addCheck(
  "data",
  "Google backup copies require explicit opt-in and API secret",
  includesAll("lib/rpGoogleDriveBackup.js", [
    "getBackupEnabledSetting",
    "getBackupApiSecret",
    "RP_GOOGLE_DRIVE_BACKUP_ENABLED",
    "RP_SERVICE_APPLICATION_BACKUP_ENABLED",
    "Boolean(getBackupWebAppUrl() && getBackupApiSecret() && isEnabledFlag(configuredValue))",
    "Google Drive backup requires RP_GOOGLE_DRIVE_BACKUP_ENABLED=true.",
  ])
    && includesAll("app/api/rp/system-status/route.js", [
      "isGoogleDriveBackupEnabled",
      "explicitOptInRequired",
      "skipReason",
      "backupWebAppConfigured",
    ])
    && includesAll("app/api/rp/clients/route.js", [
      "isGoogleDriveBackupEnabled",
      "getGoogleDriveBackupSkipReason",
      "skipped: true",
    ])
    && includesAll("docs/RP_PRIVACY_SECURITY_REVIEW.md", [
      "RP_GOOGLE_DRIVE_BACKUP_ENABLED=true",
      "fail closed",
    ]),
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
  "app/api/rp/security-events/route.js",
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
  "Security event API requires staff session",
  includesAll("app/api/rp/security-events/route.js", ["verifyAdminSessionCookie", "hasStaffAccess", "ADMIN_COOKIE_NAME"]),
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

addCheck(
  "pe-data",
  "PE exam data refresh command runs source fetches and verification gates",
  Boolean(scripts["pe-exam:data:refresh"])
    && scripts["pe-exam:data:refresh"].includes("scripts/refresh-pe-exam-data.mjs")
    && Boolean(scripts["pe-exam:data:verify"])
    && scripts["pe-exam:data:verify"].includes("--verify-only")
    && includesAll("scripts/refresh-pe-exam-data.mjs", [
      "fetch-kusf-pe-exam-data.mjs",
      "fetch-kusf-pe-exam-detail-data.mjs",
      "fetch-adiga-pe-exam-regular-data.mjs",
      "fetch-adiga-pe-exam-selection-data.mjs",
      "check-pe-exam-data-freshness.mjs",
      "audit-pe-exam-university-coverage.mjs",
      "--verify-only",
    ]),
);
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
