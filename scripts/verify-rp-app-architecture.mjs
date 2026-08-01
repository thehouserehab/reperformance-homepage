import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const migrationsDir = join(root, "database", "migrations");

const expectedMigrations = [
  "0001_identity_and_relationships.sql",
  "0002_student_workflows.sql",
  "0003_messaging_ai_and_audit.sql",
  "0004_authorization_rls.sql",
];

const expectedTables = [
  "rp_users",
  "rp_user_roles",
  "rp_student_profiles",
  "rp_coach_profiles",
  "rp_guardian_profiles",
  "rp_coach_student_links",
  "rp_guardian_student_links",
  "rp_guardian_sharing_preferences",
  "rp_tasks",
  "rp_condition_checks",
  "rp_study_sessions",
  "rp_academic_snapshots",
  "rp_practical_records",
  "rp_calendar_events",
  "rp_admission_profiles",
  "rp_contract_status_summaries",
  "rp_conversations",
  "rp_conversation_participants",
  "rp_messages",
  "rp_message_receipts",
  "rp_ai_access_grants",
  "rp_ai_usage_daily",
  "rp_ai_requests",
  "rp_consents",
  "rp_audit_events",
];

const expectedDocuments = [
  "docs/ROLE_PERMISSION_MATRIX.md",
  "docs/INFORMATION_ARCHITECTURE.md",
  "docs/DATA_MODEL.md",
  "docs/CORE_WORKFLOWS.md",
  "docs/AUTHORIZATION_DESIGN.md",
  "database/README.md",
];

const expectedRoutes = [
  "app/student/page.tsx",
  "app/student/records/page.tsx",
  "app/student/consultation/page.tsx",
  "app/student/messages/page.tsx",
  "app/student/privacy/page.tsx",
  "app/calendar/page.tsx",
  "app/coach/page.tsx",
  "app/coach/records/page.tsx",
  "app/coach/messages/page.tsx",
  "app/coach/calendar/page.tsx",
  "app/guardian/page.tsx",
  "app/guardian/summary/page.tsx",
  "app/admin/page.tsx",
  "app/admin/relations/page.tsx",
  "app/admin/ai/page.tsx",
  "app/admin/audit/page.tsx",
];

const failures = [];

function fail(message) {
  failures.push(message);
}

function read(relativePath) {
  const absolutePath = join(root, relativePath);
  if (!existsSync(absolutePath)) {
    fail(`Missing required file: ${relativePath}`);
    return "";
  }
  return readFileSync(absolutePath, "utf8");
}

const migrationFiles = existsSync(migrationsDir)
  ? readdirSync(migrationsDir).filter((file) => file.endsWith(".sql")).sort()
  : [];

if (JSON.stringify(migrationFiles) !== JSON.stringify(expectedMigrations)) {
  fail(`Migration order mismatch: ${migrationFiles.join(", ") || "none"}`);
}

const migrationSql = expectedMigrations
  .map((file) => {
    const sql = read(`database/migrations/${file}`);
    if (!/^\s*BEGIN;/i.test(sql) || !/COMMIT;\s*$/i.test(sql)) {
      fail(`${file} must be wrapped in BEGIN/COMMIT`);
    }
    return sql;
  })
  .join("\n");

for (const table of expectedTables) {
  if (!new RegExp(`CREATE\\s+TABLE\\s+${table}\\b`, "i").test(migrationSql)) {
    fail(`Missing table definition: ${table}`);
  }

  if (!new RegExp(`ALTER\\s+TABLE\\s+${table}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`, "i").test(migrationSql)) {
    fail(`RLS is not enabled: ${table}`);
  }
}

const forbiddenColumnPattern = /\b(password|password_hash|oauth_token|refresh_token)\s+(text|bytea|varchar)/i;
if (forbiddenColumnPattern.test(migrationSql)) {
  fail("Migration contains a forbidden credential column");
}

if (/\brp_nore\b|\bnore_/i.test(migrationSql)) {
  fail("Migration must not contain NORE integration identifiers");
}

const messageBlock = migrationSql.match(/CREATE TABLE rp_messages\s*\(([\s\S]*?)\n\);/i)?.[1] ?? "";
if (!/body_ciphertext\s+bytea\s+NOT\s+NULL/i.test(messageBlock)) {
  fail("Messages must use body_ciphertext bytea");
}
if (/\bbody\s+(text|varchar)/i.test(messageBlock)) {
  fail("Messages must not contain a plaintext body column");
}

const aiRequestBlock = migrationSql.match(/CREATE TABLE rp_ai_requests\s*\(([\s\S]*?)\n\);/i)?.[1] ?? "";
if (/\b(prompt|response|student_record|health_detail)\b/i.test(aiRequestBlock)) {
  fail("AI request table contains a forbidden raw-content column");
}

for (const helperFunction of [
  "rp_current_user_id",
  "rp_is_student_owner",
  "rp_is_active_coach",
  "rp_guardian_can_view",
  "rp_is_conversation_participant",
  "rp_create_conversation",
  "rp_create_message_receipts",
  "rp_reserve_ai_usage",
]) {
  if (!new RegExp(`FUNCTION\\s+${helperFunction}\\b`, "i").test(migrationSql)) {
    fail(`Missing authorization helper: ${helperFunction}`);
  }
}

if (!/CREATE\s+TRIGGER\s+rp_messages_create_receipts\b/i.test(migrationSql)) {
  fail("Message receipt trigger is missing");
}

for (const relativePath of [...expectedDocuments, ...expectedRoutes]) {
  read(relativePath);
}

const policySource = read("lib/authorizationPolicy.ts");
for (const policyExport of [
  "getStudentDataAccess",
  "canWriteStudentData",
  "canAccessConversation",
  "canManageOperations",
  "getAiAccess",
]) {
  if (!policySource.includes(`export function ${policyExport}`)) {
    fail(`Missing server policy export: ${policyExport}`);
  }
}

const permissionDocument = read("docs/ROLE_PERMISSION_MATRIX.md");
if (!permissionDocument.includes("학부모 기본 권한은 `코치에게 문의` 한 가지")) {
  fail("Guardian default permission decision is missing");
}
if (!permissionDocument.includes("NORE API, webhook, 자동 전송")) {
  fail("NORE separation decision is missing");
}

if (failures.length > 0) {
  console.error("RP APP architecture verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `RP APP architecture verified: ${expectedMigrations.length} migrations, ${expectedTables.length} RLS tables, ${expectedRoutes.length} routes.`
);
