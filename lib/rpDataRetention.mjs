export const RETENTION_CONFIRM_TOKEN = 'APPLY_RP_RETENTION';

function cleanValue(value) {
  return String(value || '').trim();
}

function toPositiveInteger(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
}

function getDatabaseUrl() {
  return cleanValue(process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.RP_DATABASE_URL);
}

function getSslConfig(databaseUrl) {
  const sslMode = cleanValue(process.env.RP_DATABASE_SSL).toLowerCase();
  const lowerUrl = String(databaseUrl || '').toLowerCase();

  if (sslMode === 'false') return false;
  if (lowerUrl.includes('sslmode=disable')) return false;
  if (lowerUrl.includes('localhost') || lowerUrl.includes('127.0.0.1')) return false;
  return { rejectUnauthorized: false };
}

function cutoffDate(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export function buildRetentionPlan(options = {}) {
  const applicationPayloadDays = toPositiveInteger(options.applicationPayloadDays, 365);
  const aiConsultDays = toPositiveInteger(options.aiConsultDays, 365);
  const questionDays = toPositiveInteger(options.questionDays, 730);
  const rateLimitDays = toPositiveInteger(options.rateLimitDays, 7);
  const aiUsageDays = toPositiveInteger(options.aiUsageDays, 400);
  const securityEventDays = toPositiveInteger(options.securityEventDays, 400);
  const conversionEventDays = toPositiveInteger(options.conversionEventDays, 400);

  return [
    {
      key: 'serviceApplicationPayloads',
      table: 'rp_service_applications',
      description: `Prune broad service application payloads older than ${applicationPayloadDays} days while keeping indexed columns.`,
      countSql: `
        SELECT COUNT(*)::int AS count
        FROM rp_service_applications
        WHERE created_at < $1::timestamptz
          AND COALESCE(payload->>'retention', '') NOT IN ('payload_pruned', 'minimized_on_write')
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
          AND COALESCE(payload->>'retention', '') NOT IN ('payload_pruned', 'minimized_on_write')
      `,
      params: [cutoffDate(applicationPayloadDays)],
    },
    {
      key: 'peExamAiConsultPayloads',
      table: 'rp_pe_exam_ai_consults',
      description: `Prune PE exam AI raw payloads and conversation records older than ${aiConsultDays} days while keeping summary columns.`,
      countSql: `
        SELECT COUNT(*)::int AS count
        FROM rp_pe_exam_ai_consults
        WHERE created_at < $1::timestamptz
          AND (
            COALESCE(payload->>'retention', '') NOT IN ('payload_pruned', 'minimized_on_write')
            OR COALESCE(conversation_record->>'retention', '') NOT IN ('payload_pruned', 'minimized_on_write')
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
            COALESCE(payload->>'retention', '') NOT IN ('payload_pruned', 'minimized_on_write')
            OR COALESCE(conversation_record->>'retention', '') NOT IN ('payload_pruned', 'minimized_on_write')
          )
      `,
      params: [cutoffDate(aiConsultDays)],
    },
    {
      key: 'peExamQuestionPayloads',
      table: 'rp_pe_exam_questions',
      description: `Prune broad PE exam question payloads older than ${questionDays} days while keeping indexed columns and question text.`,
      countSql: `
        SELECT COUNT(*)::int AS count
        FROM rp_pe_exam_questions
        WHERE created_at < $1::timestamptz
          AND COALESCE(payload->>'retention', '') NOT IN ('payload_pruned', 'minimized_on_write')
      `,
      applySql: `
        UPDATE rp_pe_exam_questions
        SET payload = jsonb_build_object(
              'retention', 'payload_pruned',
              'kind', 'pe_exam_question',
              'prunedAt', NOW(),
              'questionId', id
            ),
            updated_at = NOW()
        WHERE created_at < $1::timestamptz
          AND COALESCE(payload->>'retention', '') NOT IN ('payload_pruned', 'minimized_on_write')
      `,
      params: [cutoffDate(questionDays)],
    },
    {
      key: 'peExamQuestionRecords',
      table: 'rp_pe_exam_questions',
      description: `Count PE exam question records older than ${questionDays} days for manual retention review.`,
      countSql: `
        SELECT COUNT(*)::int AS count
        FROM rp_pe_exam_questions
        WHERE created_at < $1::timestamptz
      `,
      applySql: '',
      params: [cutoffDate(questionDays)],
    },
    {
      key: 'expiredRateLimitBuckets',
      table: 'rp_rate_limit_buckets',
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
      key: 'oldAiUsageBuckets',
      table: 'rp_ai_usage_buckets',
      description: `Delete AI usage accounting buckets older than ${aiUsageDays} days.`,
      countSql: `
        SELECT COUNT(*)::int AS count
        FROM rp_ai_usage_buckets
        WHERE usage_date < $1::date
      `,
      applySql: `
        DELETE FROM rp_ai_usage_buckets
        WHERE usage_date < $1::date
      `,
      params: [cutoffDate(aiUsageDays).slice(0, 10)],
    },
    {
      key: 'oldSecurityEvents',
      table: 'rp_security_events',
      description: `Delete hashed security event records older than ${securityEventDays} days.`,
      countSql: `
        SELECT COUNT(*)::int AS count
        FROM rp_security_events
        WHERE created_at < $1::timestamptz
      `,
      applySql: `
        DELETE FROM rp_security_events
        WHERE created_at < $1::timestamptz
      `,
      params: [cutoffDate(securityEventDays)],
    },
    {
      key: 'oldConversionEvents',
      table: 'rp_conversion_events',
      description: `Delete privacy-minimized conversion events older than ${conversionEventDays} days.`,
      countSql: `
        SELECT COUNT(*)::int AS count
        FROM rp_conversion_events
        WHERE created_at < $1::timestamptz
      `,
      applySql: `
        DELETE FROM rp_conversion_events
        WHERE created_at < $1::timestamptz
      `,
      params: [cutoffDate(conversionEventDays)],
    },
    {
      key: 'legacyPlainPasswords',
      table: 'rp_auth_accounts',
      description: 'Clear legacy plaintext passwords when a password hash already exists.',
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
  const result = await client.query('SELECT to_regclass($1) AS table_name', [`public.${table}`]);
  return Boolean(result.rows[0]?.table_name);
}

export async function runDataRetention({ apply = false, plan = buildRetentionPlan() } = {}) {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) return { connected: false, rows: [] };

  const pg = await import('pg');
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
  let committed = false;

  try {
    if (apply) await client.query('BEGIN');

    for (const item of plan) {
      if (!(await tableExists(client, item.table))) {
        rows.push({ ...item, exists: false, count: null, applied: false, affected: 0 });
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

    if (apply) {
      await client.query('COMMIT');
      committed = true;
    }
  } catch (error) {
    if (apply && !committed) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {}
    }
    throw error;
  } finally {
    client.release();
    await pool.end();
  }

  return { connected: true, rows };
}

export function summarizeRetentionResult(result, plan = buildRetentionPlan()) {
  const planByKey = new Map(plan.map((item) => [item.key, item]));
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

  return {
    connected: result.connected,
    rows,
    candidates: rows.reduce((sum, row) => sum + (Number(row.count) || 0), 0),
    prunableCandidates: rows.reduce((sum, row) => {
      const planItem = planByKey.get(row.key);
      return sum + (planItem?.applySql ? Number(row.count) || 0 : 0);
    }, 0),
    reviewOnlyCandidates: rows.reduce((sum, row) => {
      const planItem = planByKey.get(row.key);
      return sum + (planItem?.applySql ? 0 : Number(row.count) || 0);
    }, 0),
    affected: rows.reduce((sum, row) => sum + (Number(row.affected) || 0), 0),
    missingTables: rows.filter((row) => row.exists === false).map((row) => row.table),
  };
}
