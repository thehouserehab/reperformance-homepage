import fs from "node:fs";
import path from "node:path";
import { buildPeExamSourceStatus } from "./lib/peExamSourceStatus.mjs";

const root = process.cwd();

function readFile(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function fileExists(file) {
  return fs.existsSync(path.join(root, file));
}

function includesAll(file, needles) {
  if (!fileExists(file)) return false;
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

function routeMethodNames(route) {
  const text = readFile(route);
  return [...text.matchAll(/export\s+async\s+function\s+([A-Z]+)\s*\(/g)].map((match) => match[1]);
}

function buildCheck(name, ok, detail = "") {
  return { name, ok: Boolean(ok), detail };
}

function allOk(checks) {
  return checks.every((check) => check.ok);
}

const packageJson = JSON.parse(readFile("package.json"));
const scripts = packageJson.scripts || {};
const apiRouteFiles = listFiles("app/api", (file) => path.basename(file) === "route.js");
const stateChangingApiRoutes = apiRouteFiles.filter((route) =>
  routeMethodNames(route).some((method) => ["POST", "PATCH", "PUT", "DELETE"].includes(method)),
);
const jsonBodyRoutes = apiRouteFiles.filter((route) => readFile(route).includes("request.json("));
const sameOriginMissingRoutes = stateChangingApiRoutes.filter((route) =>
  !includesAll(route, ["checkSameOriginRequest", "buildForbiddenOriginResponse"]),
);
const sizeGuardMissingRoutes = jsonBodyRoutes.filter((route) =>
  !includesAll(route, ["checkRequestBodySize", "buildRequestTooLargeResponse"]),
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
const rateLimitMissingRoutes = rateLimitedRoutes.filter((route) =>
  !includesAll(route, ["checkSharedRequestRateLimit", "buildRateLimitResponse"]),
);
const sampleClientText = readFile("components/rp-consultation/rpConsultationSchema.js");
const realisticSamplePhonePattern = /phone:\s*['"]010-\d{4}-\d{4}['"]|phone:\s*['"]010\d{8}['"]/;
const peExamSourceStatus = buildPeExamSourceStatus();

const objectives = [
  {
    label: "Customer data security",
    checks: [
      buildCheck(
        "Staff customer APIs require staff sessions and rate limiting",
        includesAll("app/api/rp/clients/route.js", [
          "verifyAdminSessionCookie",
          "hasStaffAccess",
          "checkSharedRequestRateLimit",
          "DEFAULT_CLIENT_LIST_LIMIT",
          "MAX_CLIENT_LIST_LIMIT",
          "pagination",
        ]),
      ),
      buildCheck(
        "Public application storage minimizes broad payloads and public responses",
        includesAll("app/api/rp/service-application/route.js", [
          "buildMinimizedApplicationPayload",
          "retention: 'minimized_on_write'",
          "retention: 'minimized_on_send'",
          "buildPublicApplicationResult",
          "getSafePublicErrorMessage",
        ]),
      ),
      buildCheck(
        "Google Drive backup is explicit opt-in and reported by system status",
        includesAll("lib/rpGoogleDriveBackup.js", [
          "RP_GOOGLE_DRIVE_BACKUP_ENABLED",
          "isGoogleDriveBackupEnabled",
          "Google Drive backup requires RP_GOOGLE_DRIVE_BACKUP_ENABLED=true.",
        ])
          && includesAll("app/api/rp/system-status/route.js", ["explicitOptInRequired", "google_backup_enabled"]),
      ),
      buildCheck(
        "Bundled fallback customer records are non-personal placeholders",
        sampleClientText.includes("DEMO-CLIENT-001")
          && sampleClientText.includes("데모 고객")
          && !realisticSamplePhonePattern.test(sampleClientText),
      ),
      buildCheck(
        "Security events and sensitive public errors are sanitized",
        includesAll("lib/rpSecurityEvents.js", [
          "SENSITIVE_KEY_PATTERN",
          "actorHash: hashValue(actor)",
          "targetHash: hashValue(target)",
          "ipHash: hashValue(ip)",
        ])
          && Boolean(scripts["ops:sensitive:check"]),
      ),
    ],
    productionEvidence: [
      "Production DATABASE_URL, POSTGRES_URL, or RP_DATABASE_URL is configured.",
      "With a staff session, /api/rp/system-status reports objectiveReadiness.customerDataSecurity.ready=true.",
      "Unauthenticated /api/rp/clients and /api/rp/security-events requests are rejected in production.",
      "If Google backup is enabled, sheet access, restore test, and retention policy are verified.",
    ],
  },
  {
    label: "Signup and login security",
    checks: [
      buildCheck(
        "Session, password, recovery, and identity secrets are strength-gated",
        includesAll("lib/rpSecurity.js", ["assertStrongProductionSecret", "MIN_PRODUCTION_SECRET_LENGTH", "PLACEHOLDER_SECRET_PATTERN"])
          && includesAll("lib/rpAdminAuth.js", ["getAdminSessionTtlSeconds", "assertStrongProductionSecret"])
          && includesAll("app/api/rp/system-status/route.js", ["auth.session.withinBlockingMax", "SESSION_TTL_BLOCKING_MAX_SECONDS"]),
      ),
      buildCheck(
        "Signup verified contacts are unique and account lockout is available",
        includesAll("database/migrations/20260703_auth_contact_uniqueness.sql", ["rp_auth_accounts_verified_contact_unique_idx"])
          && includesAll("database/migrations/20260710_auth_account_lockout.sql", ["failed_login_count", "locked_until"])
          && includesAll("lib/rpDatabase.js", ["assertVerifiedContactAvailable", "recordDatabaseAuthLoginFailure", "locked_until"]),
      ),
      buildCheck(
        "Account recovery avoids account enumeration and uses shared limits",
        includesAll("app/api/auth/account-recovery/route.js", [
          "GENERIC_REQUEST_MESSAGE",
          "buildGenericRequestCodeResponse",
          "decoy: true",
          "checkSharedRequestRateLimit",
          "checkSameOriginRequest",
        ])
          && !readFile("app/api/auth/account-recovery/route.js").includes("accountLookupMatched"),
      ),
      buildCheck(
        "Token-backed AI routes require approval and daily usage limits",
        includesAll("lib/rpAiAccess.js", ["checkAiServiceAccess", "RP_AI_DAILY_LIMIT_MAX", "AI_APPROVAL_REQUIRED", "AI_DAILY_LIMIT_REACHED"])
          && includesAll("lib/rpDatabase.js", ["ai_approved", "ai_daily_limit", "rp_ai_usage_buckets", "consumeDatabaseAiUsage"])
          && includesAll("app/api/rp/auth-accounts/route.js", ["updateDatabaseAuthAccountAiAccess", "aiApproved", "aiDailyLimit"]),
      ),
      buildCheck(
        "State-changing and JSON-body APIs are same-origin and size guarded",
        sameOriginMissingRoutes.length === 0 && sizeGuardMissingRoutes.length === 0,
        [
          sameOriginMissingRoutes.length ? `same-origin missing: ${sameOriginMissingRoutes.join(", ")}` : "",
          sizeGuardMissingRoutes.length ? `size guard missing: ${sizeGuardMissingRoutes.join(", ")}` : "",
        ].filter(Boolean).join(" / "),
      ),
    ],
    productionEvidence: [
      "Production auth/recovery/password secrets are unique, strong, and non-placeholder.",
      "With a staff session, /api/rp/system-status reports objectiveReadiness.signupLoginSecurity.ready=true.",
      "Phone or email delivery webhooks for identity verification/account recovery are configured and tested.",
      "AI approval and daily limit controls are verified from /admin/clients with a staff account.",
    ],
  },
  {
    label: "PE exam data freshness and simplification",
    checks: [
      buildCheck(
        "PE exam source snapshots pass freshness, year, and minimum volume gates",
        peExamSourceStatus.ok,
        peExamSourceStatus.failures.map((failure) => failure.label).join(", "),
      ),
      buildCheck(
        "Read-only data readiness command exists and is wired into campaign checks",
        Boolean(scripts["pe-exam:data:readiness"])
          && includesAll("scripts/report-pe-exam-data-readiness.mjs", ["buildPeExamSourceStatus", "Next commands", "sourceStatusSynced"])
          && includesAll("scripts/check-rp-campaign-readiness.mjs", ["PE exam data readiness report", "pe-exam:data:readiness"]),
      ),
      buildCheck(
        "Refresh and verify commands cover source freshness and university coverage",
        Boolean(scripts["pe-exam:data:refresh"])
          && Boolean(scripts["pe-exam:data:verify"])
          && Boolean(scripts["pe-exam:data:audit"])
          && includesAll("scripts/refresh-pe-exam-data.mjs", ["check-pe-exam-data-freshness.mjs", "audit-pe-exam-university-coverage.mjs"]),
      ),
      buildCheck(
        "Scheduled maintenance proposes reviewed snapshot updates without automatic deployment",
        Boolean(scripts["pe-exam:data:automation-policy"])
          && includesAll(".github/workflows/pe-exam-data-maintenance.yml", [
            "schedule:",
            "workflow_dispatch:",
            "npm run pe-exam:data:refresh",
            "npm run build",
            "automation/pe-exam-data-refresh",
            "gh pr create",
          ])
          && includesAll("docs/RP_PE_EXAM_DATA_AUTOMATION.md", ["never deploys or merges automatically", "Before merging"]),
      ),
      buildCheck(
        "System status exposes PE data readiness",
        includesAll("app/api/rp/system-status/route.js", ["buildPeExamDataStatus", "peExamData", "pe_exam_data_not_fresh"]),
      ),
    ],
    productionEvidence: [
      "npm.cmd run pe-exam:data:readiness reports ready=true immediately before admission-season publishing.",
      "After deployment, staff-only /api/rp/system-status reports peExamData.ok=true.",
      "The scheduled or manually dispatched refresh pull request is reviewed and merged when KUSF/ADIGA annual data changes.",
    ],
  },
  {
    label: "Traffic surge readiness",
    checks: [
      buildCheck(
        "High-traffic readiness is summarized by system status",
        includesAll("app/api/rp/system-status/route.js", [
          "buildHighTrafficReadiness",
          "highTrafficReadiness",
          "runtime_schema_sync_enabled",
          "shared_rate_limit_store_not_ready",
          "ai_usage_buckets_not_ready",
        ]),
      ),
      buildCheck(
        "Important public, auth, AI, staff, and status routes use shared rate limiting",
        rateLimitMissingRoutes.length === 0,
        rateLimitMissingRoutes.join(", "),
      ),
      buildCheck(
        "Request body limits and same-origin guards cover state-changing API routes",
        sameOriginMissingRoutes.length === 0 && sizeGuardMissingRoutes.length === 0,
        [
          sameOriginMissingRoutes.length ? `same-origin missing: ${sameOriginMissingRoutes.join(", ")}` : "",
          sizeGuardMissingRoutes.length ? `size guard missing: ${sizeGuardMissingRoutes.join(", ")}` : "",
        ].filter(Boolean).join(" / "),
      ),
      buildCheck(
        "Production public, status, release, Vercel, and campaign gates exist",
        Boolean(scripts["ops:campaign:check"])
          && Boolean(scripts["ops:public:check"])
          && Boolean(scripts["ops:status:check"])
          && Boolean(scripts["ops:release:check"])
          && Boolean(scripts["ops:vercel:check"]),
      ),
      buildCheck(
        "Edge/firewall and outbound-timeout readiness are documented and audited",
        includesAll("docs/RP_VERCEL_FIREWALL_RULES.md", ["/api/auth/login", "/api/auth/identity-verification", "/api/rp/service-application", "/api/rp/pe-exam-ai-consult"])
          && includesAll("scripts/lib/rpVercelFirewallPolicy.mjs", [
            "RP_FIREWALL_REQUIRED_PATHS",
            "RP_FIREWALL_RATE_LIMIT_REQUIRED_PATHS",
            "analyzeRpFirewallConfig",
            "bot_protection",
          ])
          && includesAll("scripts/check-rp-vercel-production.mjs", [
            "analyzeRpFirewallConfig",
            "missingProtectedPaths",
            "missingRateLimitedPaths",
            "botProtectionActive",
          ])
          && includesAll("scripts/sync-rp-vercel-firewall.mjs", [
            "RP_VERCEL_FIREWALL_ALLOW_APPLY",
            "APPLY_RP_VERCEL_FIREWALL",
            "rules.insert",
            "managedRules.update",
          ])
          && Boolean(scripts["ops:firewall:policy"])
          && Boolean(scripts["ops:firewall:sync"])
          && includesAll("lib/rpOutboundFetch.js", ["fetchWithTimeout", "RP_OUTBOUND_FETCH_TIMEOUT_MS"]),
      ),
    ],
    productionEvidence: [
      "Production Vercel env, latest deployment, and deployed HEAD are verified with npm.cmd run ops:campaign:check -- --vercel.",
      "Public production smoke/security checks pass after deployment with npm.cmd run ops:public:check.",
      "Staff status strict check passes with npm.cmd run ops:campaign:check -- --security-strict.",
      "Vercel Firewall or equivalent edge controls are enabled before paid/admission traffic.",
    ],
  },
  {
    label: "Data scale management",
    checks: [
      buildCheck(
        "Migration gates cover tables, indexes, rate-limit, AI usage, security events, lockout, and retention",
        Boolean(scripts["db:migration:check"])
          && includesAll("scripts/check-rp-database-migration.mjs", [
            "rp_rate_limit_buckets",
            "rp_ai_usage_buckets",
            "rp_security_events",
            "requiredIndexes",
            "failed_login_count",
          ]),
      ),
      buildCheck(
        "Runtime schema sync can be disabled after migrations",
        includesAll("lib/rpDatabase.js", ["RP_DISABLE_RUNTIME_SCHEMA_SYNC", "isRuntimeSchemaSyncDisabled"])
          && includesAll("app/api/rp/system-status/route.js", ["runtimeSchemaSyncDisabled", "runtime_schema_sync_enabled"]),
      ),
      buildCheck(
        "Retention audit, indexes, and cron maintenance are available",
        Boolean(scripts["data:retention:audit"])
          && includesAll("database/migrations/20260702_retention_scale_indexes.sql", [
            "rp_service_applications_retention_idx",
            "rp_pe_exam_ai_consults_retention_idx",
            "rp_pe_exam_questions_retention_idx",
          ])
          && includesAll("app/api/rp/maintenance/retention/route.js", ["runDataRetention", "RP_RETENTION_CRON_APPLY", "CRON_SECRET"]),
      ),
      buildCheck(
        "Customer list access is paginated end to end",
        includesAll("app/api/rp/clients/route.js", ["DEFAULT_CLIENT_LIST_LIMIT", "MAX_CLIENT_LIST_LIMIT", "pagination", "nextOffset"])
          && includesAll("components/rp-consultation/RPClientManager.jsx", ["CLIENT_PAGE_SIZE", "handleLoadMoreClients", "clientPagination?.hasMore"])
          && includesAll("lib/rpDatabase.js", ["listDatabaseClients({ limit = 200, offset = 0 } = {})", "LIMIT $1 OFFSET $2"]),
      ),
      buildCheck(
        "System status reports pool, retention, and objective-level scale readiness",
        includesAll("app/api/rp/system-status/route.js", [
          "databasePool",
          "retentionCron",
          "dataScaleManagement",
          "retention_indexes_not_ready",
          "RP_DATABASE_POOL_MAX",
        ]),
      ),
    ],
    productionEvidence: [
      "All checked-in migrations are applied and npm.cmd run db:migration:check passes against production PostgreSQL.",
      "Production sets RP_DISABLE_RUNTIME_SCHEMA_SYNC=true after migration verification.",
      "npm.cmd run ops:campaign:check -- --database --retention-strict passes before major traffic.",
      "Retention apply mode is used only after backup/restore readiness and deletion approval.",
    ],
  },
];

console.log("RePERFORMANCE objective readiness evidence report");
console.log("This is a local evidence check. Production evidence listed below must still be verified separately.");

let totalChecks = 0;
let passedChecks = 0;

for (const objective of objectives) {
  const objectiveOk = allOk(objective.checks);
  console.log(`\n[${objectiveOk ? "OK" : "FAIL"}] ${objective.label}`);

  for (const check of objective.checks) {
    totalChecks += 1;
    if (check.ok) passedChecks += 1;
    console.log(`- ${check.ok ? "OK" : "FAIL"} ${check.name}${check.detail ? ` (${check.detail})` : ""}`);
  }

  console.log("  Production evidence still required:");
  for (const item of objective.productionEvidence) {
    console.log(`  - ${item}`);
  }
}

console.log(`\nSummary: ${passedChecks}/${totalChecks} local objective checks passed`);
console.log("Completion note: do not treat this goal as complete until the production evidence above is verified.");

if (passedChecks !== totalChecks) {
  process.exitCode = 1;
}
