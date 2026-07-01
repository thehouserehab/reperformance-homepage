import process from "node:process";

const CONFIRM_TOKEN = "APPLY_RP_RETENTION";

function cleanValue(value) {
  return String(value || "").trim();
}

function getArgValue(name, fallback = "") {
  const prefix = `--${name}=`;
  const match = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  if (!match) return fallback;
  return match.slice(prefix.length);
}

function getNumberArg(name, fallback) {
  const value = Number(getArgValue(name, ""));
  return Number.isFinite(value) && value > 0 ? value : fallback;
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

function cutoffDate(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function buildPlan() {
  const applicationPayloadDays = getNumberArg("application-payload-days", 365);
  const aiConsultDays = getNumberArg("ai-consult-days", 365);
  const questionDays = getNumberArg("question-days", 730);
  const rateLimitDays = getNumberArg("rate-limit-days", 7);

  return [
    {
      key: "serviceApplicationPayloads",
      table: "rp_service_applications",
      description: `Prune broad service application payloads older than ${applicationPayloadDays} days while keeping indexed columns.`,
      countSql: `
        SELECT COUNT(*)::int AS count
        FROM rp_service_applications
        WHERE created_at < $1::timestamptz
          AND COALESCE(payload->>'retention', '') <> 'payload_pruned'
      `,
      applySql: `
        UPDATE rp_service_applications
        SET payload = jsonb_build_object(
              'retention', 'payload_pruned',
              'kind', 'service_application',
              'prunedAt', NOW(),
              'applicationId', id,
              'clientId', client_id
            ),
            updated_at = NOW()
        WHERE created_at < $1::timestamptz
          AND COALESCE(payload->>'retention', '') <> 'payload_pruned'
      `,
      params: [cutoffDate(applicationPayloadDays)],
    },
    {
      key: "peExamAiConsultPayloads",
      table: "rp_pe_exam_ai_consults",
      description: `Prune PE exam AI raw payloads and conversation records older than ${aiConsultDays} days while keeping summary columns.`,
      countSql: `
        SELECT COUNT(*)::int AS count
        FROM rp_pe_exam_ai_consults
        WHERE created_at < $1::timestamptz
          AND (
            COALESCE(payload->>'retention', '') <> 'payload_pruned'
            OR COALESCE(conversation_record->>'retention', '') <> 'payload_pruned'
          )
      `,
      applySql: `
        UPDATE rp_pe_exam_ai_consults
        SET payload = jsonb_build_object(
              'retention', 'payload_pruned',
              'kind', 'pe_exam_ai_consult_payload',
              'prunedAt', NOW(),
              'consultId', id
            ),
            conversation_record = jsonb_build_object(
              'retention', 'payload_pruned',
              'kind', 'pe_exam_ai_conversation',
              'prunedAt', NOW(),
              'consultId', id
            ),
            updated_at = NOW()
        WHERE created_at < $1::timestamptz
          AND (
            COALESCE(payload->>'retention', '') <> 'payload_pruned'
            OR COALESCE(conversation_record->>'retention', '') <> 'payload_pruned'
          )
      `,
      params: [cutoffDate(aiConsultDays)],
    },
    {
      key: "peExamQuestions",
      table: "rp_pe_exam_questions",
      description: `Count PE exam question records older than ${questionDays} days for manual retention review.`,
      countSql: `
        SELECT COUNT(*)::int AS count
        FROM rp_pe_exam_questions
        WHERE created_at < $1::timestamptz
      `,
      applySql: "",
      params: [cutoffDate(questionDays)],
    },
    {
      key: "expiredRateLimitBuckets",
      table: "rp_rate_limit_buckets",
      description: `Delete expired rate limit buckets older than ${rateLimitDays} days.`,
      countSql: `
        SELECT COUNT(*)::int AS count
        FROM rp_rate_limit_buckets
        WHERE expires_at < $1::timestamptz
      `,
      applySql: `
        DELETE FROM rp_rate_limit_buckets
        WHERE expires_at < $1::timestamptz
      `,
      params: [cutoffDate(rateLimitDays)],
    },
    {
      key: "legacyPlainPasswords",
      table: "rp_auth_accounts",
      description: "Clear legacy plaintext passwords when a password hash already exists.",
      countSql: `
        SELECT COUNT(*)::int AS count
        FROM rp_auth_accounts
        WHERE password_hash IS NOT NULL
          AND password_plain IS NOT NULL
          AND password_plain <> ''
      `,
      applySql: `
        UPDATE rp_auth_accounts
        SET password_plain = NULL,
            updated_at = NOW()
        WHERE password_hash IS NOT NULL
          AND password_plain IS NOT NULL
          AND password_plain <> ''
      `,
      params: [],
    },
  ];
}

async function tableExists(client, table) {
  const result = await client.query("SELECT to_regclass($1) AS table_name", [`public.${table}`]);
  return Boolean(result.rows[0]?.table_name);
}

async function runDatabaseAudit(plan, apply) {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) return { connected: false, rows: [] };

  const pg = await import("pg");
  const Pool = pg.Pool || pg.default?.Pool;
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 1,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
    ssl: getSslConfig(databaseUrl),
  });

  const client = await pool.connect();
  const rows = [];

  try {
    for (const item of plan) {
      if (!(await tableExists(client, item.table))) {
        rows.push({ ...item, exists: false, count: null, applied: false });
        continue;
      }

      const countResult = await client.query(item.countSql, item.params);
      const count = Number(countResult.rows[0]?.count || 0);
      let applied = false;
      let affected = 0;

      if (apply && item.applySql && count > 0) {
        const applyResult = await client.query(item.applySql, item.params);
        applied = true;
        affected = Number(applyResult.rowCount || 0);
      }

      rows.push({ ...item, exists: true, count, applied, affected });
    }
  } finally {
    client.release();
    await pool.end();
  }

  return { connected: true, rows };
}

function printStaticPlan(plan) {
  console.log("\nStatic retention plan:");
  for (const item of plan) {
    console.log(`- ${item.key}: ${item.description}`);
    if (item.applySql) console.log(`  apply: ${item.applySql.trim().replace(/\s+/g, " ")}`);
    else console.log("  apply: manual review only");
  }
}

function printResult(result, plan, apply) {
  console.log("RePERFORMANCE data retention audit");
  console.log(`mode: ${apply ? "apply" : "dry-run"}`);

  if (!result.connected) {
    console.log("database: not configured; showing static plan only");
    printStaticPlan(plan);
    return;
  }

  console.log("database: connected");
  for (const row of result.rows) {
    if (!row.exists) {
      console.log(`MISS ${row.key}: table ${row.table} does not exist`);
      continue;
    }
    const suffix = row.applied ? `, affected=${row.affected}` : "";
    console.log(`OK ${row.key}: candidates=${row.count}${suffix}`);
  }
}

function printJson(result, plan, apply) {
  const rows = result.connected
    ? result.rows.map((row) => ({
        key: row.key,
        table: row.table,
        exists: row.exists,
        count: row.count,
        applied: row.applied,
        affected: row.affected || 0,
      }))
    : plan.map((item) => ({
        key: item.key,
        table: item.table,
        exists: null,
        count: null,
        applied: false,
        affected: 0,
      }));

  console.log(JSON.stringify({ ok: true, mode: apply ? "apply" : "dry-run", connected: result.connected, rows }, null, 2));
}

if (hasArg("help")) {
  console.log(`Usage:
  node scripts/audit-rp-data-retention.mjs
  node scripts/audit-rp-data-retention.mjs --application-payload-days=365 --ai-consult-days=365
  RP_RETENTION_ALLOW_APPLY=true node scripts/audit-rp-data-retention.mjs --apply --confirm=${CONFIRM_TOKEN}`);
  process.exit(0);
}

const plan = buildPlan();
const apply = hasArg("apply");
const json = hasArg("json");
const confirm = getArgValue("confirm", "");

if (apply && (process.env.RP_RETENTION_ALLOW_APPLY !== "true" || confirm !== CONFIRM_TOKEN)) {
  console.error(`Refusing to apply retention changes. Set RP_RETENTION_ALLOW_APPLY=true and pass --confirm=${CONFIRM_TOKEN}.`);
  process.exit(1);
}

try {
  const result = await runDatabaseAudit(plan, apply);
  if (json) printJson(result, plan, apply);
  else printResult(result, plan, apply);
} catch (error) {
  console.error(`Retention audit failed: ${error?.message || error}`);
  process.exit(1);
}
