import { spawnSync } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const args = new Set(process.argv.slice(2));
const includeBuild = args.has("--build");
const includeTypecheck = args.has("--typecheck");
const includeVercel = args.has("--vercel");
const includeDatabase = args.has("--database");
const includePublic = args.has("--public");
const includeRetentionStrict = args.has("--retention-strict");
const includeSecurityStrict = args.has("--security-strict");
const includeRelease = args.has("--release") || args.has("--predeploy");
const includeStatus = args.has("--status") || args.has("--system-status") || includeSecurityStrict;

const retentionCommand = [npmCommand, "run", "data:retention:audit"];

if (includeRetentionStrict) {
  retentionCommand.push("--", "--require-database", "--require-tables", "--max-prunable-candidates=0");
}

const steps = [
  {
    name: "Objective readiness evidence report",
    command: [npmCommand, "run", "ops:objective:check"],
  },
  {
    name: "Repo operational readiness",
    command: [npmCommand, "run", "ops:audit"],
  },
  {
    name: "PE exam data automation policy",
    command: [npmCommand, "run", "pe-exam:data:automation-policy"],
  },
  {
    name: "Public load-test safety policy",
    command: [npmCommand, "run", "ops:load:policy"],
  },
  {
    name: "Vercel Firewall policy fixtures",
    command: [npmCommand, "run", "ops:firewall:policy"],
  },
  {
    name: "Sensitive data exposure static gate",
    command: [npmCommand, "run", "ops:sensitive:check"],
  },
  {
    name: includeRetentionStrict ? "Data retention strict production gate" : "Data retention dry-run",
    command: retentionCommand,
  },
  {
    name: "PE exam data readiness report",
    command: [npmCommand, "run", "pe-exam:data:readiness"],
  },
  {
    name: "PE exam source snapshot gates",
    command: [npmCommand, "run", "pe-exam:data:verify"],
  },
];

if (includeRelease) {
  steps.push({
    name: "Local release git state",
    command: [npmCommand, "run", "ops:release:check"],
  });
}

if (includeBuild) {
  steps.push({
    name: "Production build",
    command: [npmCommand, "run", "build"],
  });
}

if (includeTypecheck) {
  steps.push({
    name: "TypeScript check",
    command: [npmCommand, "run", "typecheck"],
  });
}

if (includeDatabase) {
  steps.push({
    name: "Database migration gates",
    command: [npmCommand, "run", "db:migration:check"],
  });
}

if (includeVercel) {
  steps.push({
    name: "Vercel production gates",
    command: [npmCommand, "run", "ops:vercel:check", "--", "--require-commit-match"],
  });
}

if (includePublic) {
  steps.push({
    name: "Public production smoke and security gates",
    command: [npmCommand, "run", "ops:public:check"],
  });
}

if (includeStatus) {
  const statusCommand = [npmCommand, "run", "ops:status:check"];
  if (includeSecurityStrict) {
    statusCommand.push("--", "--security-strict");
  }

  steps.push({
    name: includeSecurityStrict
      ? "Production system-status readiness gates with security strict mode"
      : "Production system-status readiness gates",
    command: statusCommand,
  });
}

function formatCommand(command) {
  return command.join(" ");
}

function runStep(step) {
  console.log(`\n[check] ${step.name}`);
  console.log(`$ ${formatCommand(step.command)}`);
  const result = process.platform === "win32"
    ? spawnSync(formatCommand(step.command), {
      stdio: "inherit",
      shell: true,
    })
    : spawnSync(step.command[0], step.command.slice(1), {
      stdio: "inherit",
      shell: false,
    });

  if (result.error) {
    console.error(`[fail] ${step.name}: ${result.error.message}`);
    return false;
  }

  if (result.status !== 0) {
    console.error(`[fail] ${step.name}: exited with status ${result.status}`);
    return false;
  }

  console.log(`[ok] ${step.name}`);
  return true;
}

console.log("RePERFORMANCE campaign readiness check");
console.log("Use --build --typecheck for final pre-deploy verification.");
console.log("Use --database with DATABASE_URL, POSTGRES_URL, or RP_DATABASE_URL to verify production migration state.");
console.log("Use --vercel with VERCEL_TOKEN for production Vercel gates and deployed HEAD matching.");
console.log("Use npm.cmd run ops:firewall:sync for a token-backed dry-run of missing edge controls.");
console.log("Use --public to verify public production URLs without Vercel secrets.");
console.log("Use --status with RP_SYSTEM_STATUS_COOKIE or RP_ADMIN_SESSION_COOKIE to verify staff-only system readiness.");
console.log("Use --security-strict with a staff cookie before paid/admission traffic to require securityMonitoring.status=normal.");
console.log("Use --retention-strict with a production database URL to require retention tables and zero auto-prunable candidates.");
console.log("Use --release before deployment to require a clean main branch synchronized with upstream.");

let ok = true;
for (const step of steps) {
  ok = runStep(step) && ok;
  if (!ok) break;
}

if (!ok) {
  process.exitCode = 1;
} else {
  console.log("\nAutomated checks passed.");
}

console.log(`
Manual gates before a high-traffic campaign:
- Before deployment, run npm.cmd run ops:campaign:check -- --build --typecheck --release from a clean local main branch synchronized with origin/main.
- Apply all checked-in SQL files in database/migrations with npm.cmd run db:migration:apply -- --confirm=APPLY_RP_DB_MIGRATION and confirm no pending migration drift.
- Run npm.cmd run db:migration:check against production PostgreSQL.
- Verify /api/rp/system-status with a staff session in production, or run npm.cmd run ops:campaign:check -- --status with RP_SYSTEM_STATUS_COOKIE.
- For paid/admission campaigns, run npm.cmd run ops:campaign:check -- --security-strict with RP_SYSTEM_STATUS_COOKIE so securityMonitoring.status=normal is enforced before traffic increases.
- Confirm Vercel Firewall or equivalent edge rules protect /api/auth/*, /api/rp/signup, /api/rp/service-application, /api/rp/pe-exam-question, /api/rp/pe-exam-ai-consult, /api/rp/clients, /api/rp/auth-accounts, and /api/rp/security-events.
- Confirm production DATABASE_URL or RP_DATABASE_URL is configured and connection limits match the managed PostgreSQL plan.
- Confirm production RP_DATA_SOURCE, RP_DISABLE_RUNTIME_SCHEMA_SYNC or RP_RUNTIME_SCHEMA_SYNC, RP_DATABASE_POOL_MAX, RP_SMS_WEBHOOK_URL or SMS_WEBHOOK_URL, NEXT_PUBLIC_SITE_URL or RP_SITE_URL, and RP_RATE_LIMIT_FAIL_CLOSED are configured for both production Vercel projects.
- Confirm RP_ALLOW_ENV_AUTH_ACCOUNTS remains unset or false unless a short emergency bootstrap window is intentionally open.
- Confirm CRON_SECRET or RP_MAINTENANCE_CRON_SECRET is configured for /api/rp/maintenance/retention in both production Vercel projects.
- Keep RP_RETENTION_CRON_APPLY disabled until backup/restore readiness and deletion approval are confirmed.
- Run npm.cmd run ops:campaign:check -- --retention-strict with a production database URL, then run retention apply mode only after backup and restore readiness is confirmed.
- Confirm Google Drive/Sheets backup remains disabled unless RP_GOOGLE_DRIVE_BACKUP_ENABLED=true, RP_API_SECRET, restore readiness, retention rules, and trusted staff-only sheet access are all confirmed.
- Confirm outbound timeout env vars remain conservative: RP_OUTBOUND_FETCH_TIMEOUT_MS, RP_GOOGLE_BACKUP_FETCH_TIMEOUT_MS, RP_AUTH_SCRIPT_FETCH_TIMEOUT_MS, RP_WEBHOOK_FETCH_TIMEOUT_MS, and RP_OPENAI_FETCH_TIMEOUT_MS.
- Confirm npm.cmd run pe-exam:data:readiness reports ready=true before publishing admission campaigns.
- Run npm.cmd run ops:public:check after deploy to verify public pages, security headers, unauthenticated API rejection, foreign-origin write rejection, and external management separation.
- Run npm.cmd run ops:load:test against the release build locally; use the confirmed, capped production probe only during an approved window.
- Monitor Vercel logs, 429 rate, 5xx rate, database connection timeouts, and backup failures during the campaign.
`);
