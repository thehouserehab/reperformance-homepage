function cleanValue(value) {
  return String(value || "").trim();
}

function hasArg(name) {
  return process.argv.includes(`--${name}`);
}

function getDatabaseUrl() {
  return cleanValue(process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.RP_DATABASE_URL);
}

function getSslConfig(databaseUrl) {
  const sslMode = cleanValue(process.env.RP_DATABASE_SSL).toLowerCase();
  const lowerUrl = String(databaseUrl || "").toLowerCase();

  if (sslMode === "false") return false;
  if (lowerUrl.includes("sslmode=disable")) return false;
  if (lowerUrl.includes("localhost") || lowerUrl.includes("127.0.0.1")) return false;
  return { rejectUnauthorized: false };
}

const requiredTables = [
  "rp_auth_accounts",
  "rp_clients",
  "rp_consultations",
  "rp_service_applications",
  "rp_pe_exam_questions",
  "rp_pe_exam_ai_consults",
  "rp_rate_limit_buckets",
  "rp_ai_usage_buckets",
  "rp_security_events",
  "rp_conversion_events",
  "rp_consultation_slots",
];

const requiredColumns = {
  rp_auth_accounts: [
    "id",
    "username",
    "username_key",
    "password_hash",
    "password_plain",
    "email",
    "kakao_id",
    "verification_method",
    "verified_contact",
    "role",
    "ai_approved",
    "ai_approved_at",
    "ai_approved_by",
    "ai_daily_limit",
    "failed_login_count",
    "failed_login_window_started_at",
    "locked_until",
    "session_version",
    "password_changed_at",
    "created_at",
    "updated_at",
  ],
  rp_clients: [
    "id",
    "name",
    "phone",
    "parq_yes_items",
    "purpose",
    "pain_areas",
    "contact_status",
    "visit_status",
    "scheduled_visit_at",
    "last_contacted_at",
    "next_action",
    "next_action_at",
    "follow_up_reason",
    "first_source",
    "first_medium",
    "first_campaign",
    "first_landing_path",
    "latest_source",
    "latest_medium",
    "latest_campaign",
    "application_referrer_path",
    "campaign_code",
    "referral_code",
    "partner_code",
    "qr_code",
    "max_affiliation",
    "consultation_slot_id",
    "consultation_activity_preference",
    "created_at",
    "updated_at",
  ],
  rp_consultations: [
    "id",
    "client_id",
    "client_name",
    "record",
    "saved_at",
    "created_at",
  ],
  rp_service_applications: [
    "id",
    "client_id",
    "name",
    "phone",
    "payload",
    "created_at",
    "updated_at",
  ],
  rp_pe_exam_questions: [
    "id",
    "username",
    "question_text",
    "answer_status",
    "payload",
    "created_at",
    "updated_at",
  ],
  rp_pe_exam_ai_consults: [
    "id",
    "username",
    "target_university_id",
    "target_university_href",
    "consultation_summary",
    "conversation_record",
    "payload",
    "created_at",
    "updated_at",
  ],
  rp_rate_limit_buckets: [
    "rate_key",
    "window_start",
    "hit_count",
    "expires_at",
    "updated_at",
  ],
  rp_ai_usage_buckets: [
    "subject_key",
    "route_key",
    "usage_date",
    "request_count",
    "token_estimate",
    "updated_at",
  ],
  rp_security_events: [
    "id",
    "event_type",
    "outcome",
    "actor_hash",
    "target_hash",
    "ip_hash",
    "ip_prefix",
    "user_agent",
    "route",
    "metadata",
    "created_at",
  ],
  rp_conversion_events: [
    "id",
    "anonymous_session_id",
    "event_name",
    "page_path",
    "service_key",
    "application_id",
    "first_source",
    "first_medium",
    "first_campaign",
    "first_landing_path",
    "latest_source",
    "latest_medium",
    "latest_campaign",
    "utm_content",
    "campaign_code",
    "referral_code",
    "partner_code",
    "qr_code",
    "referrer_host",
    "max_affiliation",
    "created_at",
  ],
  rp_consultation_slots: [
    "id",
    "starts_at",
    "ends_at",
    "is_open",
    "created_by",
    "created_at",
    "updated_at",
  ],
};

const requiredIndexes = [
  "rp_auth_accounts_verified_contact_unique_idx",
  "rp_auth_accounts_locked_until_idx",
  "rp_clients_name_idx",
  "rp_clients_phone_idx",
  "rp_consultations_client_id_idx",
  "rp_service_applications_client_id_idx",
  "rp_service_applications_phone_idx",
  "rp_service_applications_created_at_idx",
  "rp_service_applications_retention_idx",
  "rp_pe_exam_questions_username_idx",
  "rp_pe_exam_questions_created_at_idx",
  "rp_pe_exam_questions_retention_idx",
  "rp_pe_exam_ai_consults_username_idx",
  "rp_pe_exam_ai_consults_created_at_idx",
  "rp_pe_exam_ai_consults_retention_idx",
  "rp_rate_limit_buckets_expires_at_idx",
  "rp_ai_usage_buckets_usage_date_idx",
  "rp_security_events_created_at_idx",
  "rp_security_events_event_type_idx",
  "rp_security_events_target_hash_idx",
  "rp_security_events_ip_hash_idx",
  "rp_clients_contact_status_idx",
  "rp_clients_visit_status_idx",
  "rp_clients_next_action_at_idx",
  "rp_clients_first_source_idx",
  "rp_conversion_events_created_at_idx",
  "rp_conversion_events_name_created_at_idx",
  "rp_conversion_events_session_idx",
  "rp_conversion_events_source_idx",
  "rp_consultation_slots_starts_at_unique_idx",
  "rp_consultation_slots_open_starts_at_idx",
  "rp_clients_consultation_slot_id_idx",
  "rp_clients_active_consultation_slot_unique_idx",
];

const results = [];

function addResult(area, name, ok, detail = "") {
  results.push({ area, name, ok: Boolean(ok), detail });
}

async function getPool() {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) return null;

  const pg = await import("pg");
  const Pool = pg.Pool || pg.default?.Pool;
  return new Pool({
    connectionString: databaseUrl,
    max: 1,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
    ssl: getSslConfig(databaseUrl),
  });
}

async function tableExists(client, table) {
  const result = await client.query("SELECT to_regclass($1) AS table_name", [`public.${table}`]);
  return Boolean(result.rows[0]?.table_name);
}

async function getColumns(client, table) {
  const result = await client.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
    `,
    [table],
  );
  return new Set(result.rows.map((row) => row.column_name));
}

async function getIndexes(client) {
  const result = await client.query(
    `
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = ANY($1::text[])
    `,
    [requiredIndexes],
  );
  return new Set(result.rows.map((row) => row.indexname));
}

async function countIfPossible(client, sql) {
  try {
    const result = await client.query(sql);
    return Number(result.rows[0]?.count || 0);
  } catch (_) {
    return null;
  }
}

async function checkDatabase(client) {
  const existingTables = new Set();

  for (const table of requiredTables) {
    const exists = await tableExists(client, table);
    addResult("tables", `${table} exists`, exists);
    if (exists) existingTables.add(table);
  }

  for (const [table, columns] of Object.entries(requiredColumns)) {
    if (!existingTables.has(table)) {
      addResult("columns", `${table} required columns`, false, "table missing");
      continue;
    }

    const existingColumns = await getColumns(client, table);
    const missing = columns.filter((column) => !existingColumns.has(column));
    addResult("columns", `${table} required columns`, missing.length === 0, missing.length ? `missing: ${missing.join(", ")}` : `${columns.length} columns`);
  }

  const existingIndexes = await getIndexes(client);
  const missingIndexes = requiredIndexes.filter((index) => !existingIndexes.has(index));
  addResult("indexes", "Required migration indexes exist", missingIndexes.length === 0, missingIndexes.length ? `missing: ${missingIndexes.join(", ")}` : `${requiredIndexes.length} indexes`);

  if (existingTables.has("rp_auth_accounts")) {
    const legacyPlainCount = await countIfPossible(
      client,
      `
        SELECT COUNT(*)::int AS count
        FROM rp_auth_accounts
        WHERE password_hash IS NOT NULL
          AND password_plain IS NOT NULL
          AND password_plain <> ''
      `,
    );
    addResult("data", "Legacy plaintext passwords with hashes are cleared", legacyPlainCount === 0, legacyPlainCount === null ? "count unavailable" : `count=${legacyPlainCount}`);

    const duplicateVerifiedContactGroups = await countIfPossible(
      client,
      `
        SELECT COUNT(*)::int AS count
        FROM (
          SELECT
            LOWER(TRIM(verification_method)) AS method_key,
            LOWER(TRIM(verified_contact)) AS contact_key
          FROM rp_auth_accounts
          WHERE COALESCE(TRIM(verification_method), '') <> ''
            AND COALESCE(TRIM(verified_contact), '') <> ''
          GROUP BY 1, 2
          HAVING COUNT(*) > 1
        ) duplicate_contacts
      `,
    );
    addResult(
      "data",
      "Auth verified contact duplicates are resolved",
      duplicateVerifiedContactGroups === 0,
      duplicateVerifiedContactGroups === null ? "count unavailable" : `duplicateGroups=${duplicateVerifiedContactGroups}`,
    );

    const invalidSessionVersionCount = await countIfPossible(
      client,
      `
        SELECT COUNT(*)::int AS count
        FROM rp_auth_accounts
        WHERE session_version IS NULL OR session_version < 1
      `,
    );
    addResult(
      "data",
      "Auth session versions are initialized",
      invalidSessionVersionCount === 0,
      invalidSessionVersionCount === null ? "count unavailable" : `invalidSessionVersions=${invalidSessionVersionCount}`,
    );
  }

  if (existingTables.has("rp_rate_limit_buckets")) {
    const expiredBucketCount = await countIfPossible(
      client,
      `
        SELECT COUNT(*)::int AS count
        FROM rp_rate_limit_buckets
        WHERE expires_at < NOW() - INTERVAL '7 days'
      `,
    );
    addResult("data", "Expired rate-limit buckets are under review", expiredBucketCount !== null, expiredBucketCount === null ? "count unavailable" : `expiredOlderThan7Days=${expiredBucketCount}`);
  }

  if (existingTables.has("rp_ai_usage_buckets")) {
    const oldAiUsageBucketCount = await countIfPossible(
      client,
      `
        SELECT COUNT(*)::int AS count
        FROM rp_ai_usage_buckets
        WHERE usage_date < (CURRENT_DATE - INTERVAL '400 days')::date
      `,
    );
    addResult("data", "Old AI usage buckets are under retention review", oldAiUsageBucketCount !== null, oldAiUsageBucketCount === null ? "count unavailable" : `olderThan400Days=${oldAiUsageBucketCount}`);
  }
}

function printResults() {
  const byArea = new Map();
  for (const result of results) {
    if (!byArea.has(result.area)) byArea.set(result.area, []);
    byArea.get(result.area).push(result);
  }

  console.log("RePERFORMANCE database migration check");
  for (const [area, areaResults] of byArea.entries()) {
    console.log(`\n[${area}]`);
    for (const result of areaResults) {
      console.log(`${result.ok ? "OK" : "FAIL"} ${result.name}${result.detail ? ` (${result.detail})` : ""}`);
    }
  }

  const failed = results.filter((result) => !result.ok);
  console.log(`\nSummary: ${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) process.exitCode = 1;
}

async function main() {
  const allowMissingDatabase = hasArg("allow-missing-database");
  const pool = await getPool();

  if (!pool) {
    console.log("RePERFORMANCE database migration check");
    console.log("No DATABASE_URL, POSTGRES_URL, or RP_DATABASE_URL is configured.");
    console.log("Set one of those variables to verify the production PostgreSQL schema.");
    console.log("Use --allow-missing-database only for local script wiring checks.");
    process.exitCode = allowMissingDatabase ? 0 : 1;
    return;
  }

  const client = await pool.connect();
  try {
    await checkDatabase(client);
  } finally {
    client.release();
    await pool.end();
  }

  printResults();
}

main().catch((error) => {
  console.error(`Database migration check failed: ${error?.message || error}`);
  process.exit(1);
});
