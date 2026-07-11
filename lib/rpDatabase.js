import { exposePublicError } from './rpPublicErrors.js';
import { assertStrongProductionSecret, safeEqual } from './rpSecurity.js';
import { normalizeAttribution, normalizeConversionEvent } from './rpAttribution.js';
import { normalizeClientWorkflow } from './rpClientWorkflow.js';
import {
  CONSULTATION_SLOT_BLOCKING_VISIT_STATUSES,
  getConsultationAvailabilityRange,
  normalizeConsultationActivityPreference,
  normalizeConsultationSlotId,
  normalizeConsultationSlotWindow,
} from './rpConsultationAvailability.js';

const ACTIVE_STATUS_VALUES = new Set([
  'active',
  'approved',
  'enabled',
  'true',
  '1',
  '활성',
  '승인',
  '승인완료',
  '사용',
  '사용중',
]);

const STAFF_PENDING_STATUS = '승인 대기';
const MEMBER_ACTIVE_STATUS = '활성';

const ROLE_LABELS = {
  owner: '대표 관리자',
  admin: '관리자',
  trainer: '트레이너',
  member: '회원',
};

function cleanEnvValue(value) {
  const text = String(value || '').trim();
  const quote = String.fromCharCode(34);

  if ((text.startsWith("'") && text.endsWith("'")) || (text.startsWith(quote) && text.endsWith(quote))) {
    return text.slice(1, -1).trim();
  }

  return text;
}

function getDatabaseUrl() {
  return cleanEnvValue(process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.RP_DATABASE_URL);
}

function getPasswordSecret() {
  return assertStrongProductionSecret(
    process.env.RP_PASSWORD_HASH_SECRET || process.env.RP_ADMIN_SESSION_SECRET || process.env.RP_API_SECRET,
    'RP_PASSWORD_HASH_SECRET or fallback signing secret',
  );
}

function normalizeToken(value) {
  return cleanEnvValue(value).toLowerCase().replace(/[\s_-]+/g, '');
}

function normalizePhone(value) {
  return cleanEnvValue(value).replace(/\D/g, '');
}

function normalizeEmail(value) {
  return cleanEnvValue(value).toLowerCase();
}

function normalizeIdentityMethod(value) {
  const method = normalizeToken(value);
  if (method === 'email' || method === '이메일') return 'email';
  if (method === 'kakao' || method === 'kakaotalk' || method === '카카오' || method === '카카오톡') return 'kakao';
  return 'phone';
}

function normalizeIdentityContact(method, value) {
  const normalizedMethod = normalizeIdentityMethod(method);
  if (normalizedMethod === 'phone') return normalizePhone(value);
  if (normalizedMethod === 'email') return normalizeEmail(value);
  return cleanEnvValue(value).toLowerCase();
}

function normalizeRole(role) {
  const value = normalizeToken(role);
  const roleMap = {
    owner: 'owner',
    대표: 'owner',
    대표관리자: 'owner',
    admin: 'admin',
    administrator: 'admin',
    manager: 'admin',
    관리자: 'admin',
    trainer: 'trainer',
    coach: 'trainer',
    트레이너: 'trainer',
    코치: 'trainer',
    member: 'member',
    client: 'member',
    user: 'member',
    회원: 'member',
  };

  return roleMap[value] || 'member';
}

function getRoleLabel(role) {
  return ROLE_LABELS[normalizeRole(role)] || ROLE_LABELS.member;
}

function normalizeStatus(value) {
  return normalizeToken(value);
}

function isApprovedAccount(account) {
  if (!account) return false;
  if (account.approved === false) return false;

  const status = normalizeStatus(account.status || account.accountStatus || account.account_status);
  if (status) return ACTIVE_STATUS_VALUES.has(status) || account.approved === true;

  return account.approved !== false;
}

function splitList(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map((item) => String(item).trim()).filter(Boolean);
  if (!value) return [];
  return String(value)
    .split(/[,/·|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toFiniteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function getValue(record, candidates) {
  if (!record) return '';

  for (const candidate of candidates) {
    if (record[candidate] !== undefined && record[candidate] !== null && record[candidate] !== '') return record[candidate];
  }

  return '';
}

function buildId(prefix) {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${stamp}-${random}`;
}

function getSslConfig(databaseUrl) {
  const sslMode = cleanEnvValue(process.env.RP_DATABASE_SSL).toLowerCase();
  const lowerUrl = String(databaseUrl || '').toLowerCase();

  if (sslMode === 'false') return false;
  if (lowerUrl.includes('sslmode=disable')) return false;
  if (lowerUrl.includes('localhost') || lowerUrl.includes('127.0.0.1')) return false;
  return { rejectUnauthorized: false };
}

const DATABASE_POOL_DEFAULT_MAX = 5;
const DATABASE_POOL_MIN_RECOMMENDED_MAX = 2;
const DATABASE_POOL_MAX_RECOMMENDED_MAX = 20;
const DATABASE_POOL_IDLE_TIMEOUT_MS = 30000;
const DATABASE_POOL_CONNECTION_TIMEOUT_MS = 10000;

function parsePositiveInteger(value, fallback) {
  const number = Number(cleanEnvValue(value));
  if (!Number.isInteger(number) || number <= 0) return fallback;
  return number;
}

export function getDatabasePoolConfig(databaseUrl = getDatabaseUrl()) {
  const explicitMaxValue = cleanEnvValue(process.env.RP_DATABASE_POOL_MAX);
  const explicitMax = Boolean(explicitMaxValue);
  const validMax = !explicitMax || parsePositiveInteger(explicitMaxValue, null) !== null;

  return {
    max: parsePositiveInteger(explicitMaxValue, DATABASE_POOL_DEFAULT_MAX),
    explicitMax,
    validMax,
    defaultMax: DATABASE_POOL_DEFAULT_MAX,
    minRecommendedMax: DATABASE_POOL_MIN_RECOMMENDED_MAX,
    maxRecommendedMax: DATABASE_POOL_MAX_RECOMMENDED_MAX,
    idleTimeoutMillis: DATABASE_POOL_IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: DATABASE_POOL_CONNECTION_TIMEOUT_MS,
    sslEnabled: databaseUrl ? getSslConfig(databaseUrl) !== false : null,
  };
}

let poolPromise;
async function getPool() {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) return null;

  const globalKey = '__rpManagedPostgresPool';
  if (globalThis[globalKey]) return globalThis[globalKey];

  if (!poolPromise) {
    poolPromise = (async () => {
      const pg = await import('pg');
      const Pool = pg.Pool || pg.default?.Pool;

      if (!Pool) throw new Error('PostgreSQL Pool을 불러올 수 없습니다. pg 패키지 설치를 확인해주세요.');

      const poolConfig = getDatabasePoolConfig(databaseUrl);

      return new Pool({
        connectionString: databaseUrl,
        max: poolConfig.max,
        idleTimeoutMillis: poolConfig.idleTimeoutMillis,
        connectionTimeoutMillis: poolConfig.connectionTimeoutMillis,
        ssl: getSslConfig(databaseUrl),
      });
    })();
  }

  try {
    globalThis[globalKey] = await poolPromise;
    return globalThis[globalKey];
  } catch (error) {
    poolPromise = null;
    throw error;
  }
}

export function isDatabaseConfigured() {
  return Boolean(getDatabaseUrl());
}

export function isDatabaseOnlyMode() {
  return cleanEnvValue(process.env.RP_DATA_SOURCE).toLowerCase() === 'database';
}

export function isRuntimeSchemaSyncDisabled() {
  const disabled = normalizeToken(process.env.RP_DISABLE_RUNTIME_SCHEMA_SYNC);
  const runtimeSync = normalizeToken(process.env.RP_RUNTIME_SCHEMA_SYNC);

  return ['true', '1', 'yes', 'on', 'disabled'].includes(disabled)
    || ['false', '0', 'no', 'off', 'disabled'].includes(runtimeSync);
}

const AUTH_VERIFIED_CONTACT_UNIQUE_INDEX = 'rp_auth_accounts_verified_contact_unique_idx';
const AUTH_ACCOUNT_LOCKOUT_INDEX = 'rp_auth_accounts_locked_until_idx';
const AUTH_SESSION_REQUIRED_COLUMNS = ['session_version', 'password_changed_at'];
const SCHEMA_REQUIRED_TABLES = [
  'rp_auth_accounts',
  'rp_clients',
  'rp_consultations',
  'rp_service_applications',
  'rp_pe_exam_questions',
  'rp_pe_exam_ai_consults',
  'rp_rate_limit_buckets',
  'rp_ai_usage_buckets',
  'rp_security_events',
  'rp_conversion_events',
  'rp_consultation_slots',
];
const SCHEMA_REQUIRED_INDEXES = [
  AUTH_VERIFIED_CONTACT_UNIQUE_INDEX,
  AUTH_ACCOUNT_LOCKOUT_INDEX,
  'rp_clients_name_idx',
  'rp_clients_phone_idx',
  'rp_consultations_client_id_idx',
  'rp_service_applications_client_id_idx',
  'rp_service_applications_phone_idx',
  'rp_service_applications_created_at_idx',
  'rp_service_applications_retention_idx',
  'rp_pe_exam_questions_username_idx',
  'rp_pe_exam_questions_created_at_idx',
  'rp_pe_exam_questions_retention_idx',
  'rp_pe_exam_ai_consults_username_idx',
  'rp_pe_exam_ai_consults_created_at_idx',
  'rp_pe_exam_ai_consults_retention_idx',
  'rp_rate_limit_buckets_expires_at_idx',
  'rp_ai_usage_buckets_usage_date_idx',
  'rp_security_events_created_at_idx',
  'rp_security_events_event_type_idx',
  'rp_security_events_target_hash_idx',
  'rp_security_events_ip_hash_idx',
  'rp_clients_contact_status_idx',
  'rp_clients_visit_status_idx',
  'rp_clients_next_action_at_idx',
  'rp_clients_first_source_idx',
  'rp_conversion_events_created_at_idx',
  'rp_conversion_events_name_created_at_idx',
  'rp_conversion_events_session_idx',
  'rp_conversion_events_source_idx',
  'rp_consultation_slots_starts_at_unique_idx',
  'rp_consultation_slots_open_starts_at_idx',
  'rp_clients_consultation_slot_id_idx',
  'rp_clients_active_consultation_slot_unique_idx',
];
const AI_USAGE_DAILY_ROUTE_KEY = '__all__';
const RETENTION_INDEXES = [
  'rp_service_applications_retention_idx',
  'rp_pe_exam_questions_retention_idx',
  'rp_pe_exam_ai_consults_retention_idx',
];
const SECURITY_EVENT_INDEXES = [
  'rp_security_events_created_at_idx',
  'rp_security_events_event_type_idx',
  'rp_security_events_target_hash_idx',
  'rp_security_events_ip_hash_idx',
];
const AUTH_LOCKOUT_DEFAULT_FAILURE_LIMIT = 8;
const AUTH_LOCKOUT_DEFAULT_WINDOW_SECONDS = 15 * 60;
const AUTH_LOCKOUT_DEFAULT_LOCK_SECONDS = 15 * 60;

function clampPositiveInteger(value, fallback, min, max) {
  const parsed = parsePositiveInteger(value, fallback);
  return Math.min(max, Math.max(min, parsed));
}

function isDisabledFlag(value) {
  return ['false', '0', 'no', 'off', 'disabled'].includes(normalizeToken(value));
}

export function getDatabaseAuthLockoutPolicy() {
  return {
    enabled: !isDisabledFlag(process.env.RP_AUTH_LOCKOUT_ENABLED),
    failureLimit: clampPositiveInteger(process.env.RP_AUTH_LOCKOUT_FAILURE_LIMIT, AUTH_LOCKOUT_DEFAULT_FAILURE_LIMIT, 3, 20),
    windowSeconds: clampPositiveInteger(process.env.RP_AUTH_LOCKOUT_WINDOW_SECONDS, AUTH_LOCKOUT_DEFAULT_WINDOW_SECONDS, 60, 60 * 60),
    lockSeconds: clampPositiveInteger(process.env.RP_AUTH_LOCKOUT_SECONDS, AUTH_LOCKOUT_DEFAULT_LOCK_SECONDS, 60, 24 * 60 * 60),
    store: isDatabaseConfigured() ? 'postgres' : 'unavailable',
    failureCountColumn: 'rp_auth_accounts.failed_login_count',
    lockedUntilColumn: 'rp_auth_accounts.locked_until',
  };
}

export async function checkDatabaseSchemaReadiness() {
  const base = {
    checked: false,
    configured: isDatabaseConfigured(),
    authAccountsTableExists: false,
    verifiedContactUniqueIndexPresent: false,
    verifiedContactDuplicateGroups: null,
    verifiedContactUniquenessReady: false,
    requiredTables: SCHEMA_REQUIRED_TABLES,
    requiredIndexes: SCHEMA_REQUIRED_INDEXES,
    missingRequiredTables: SCHEMA_REQUIRED_TABLES,
    missingRequiredIndexes: SCHEMA_REQUIRED_INDEXES,
    allRequiredTablesPresent: false,
    allRequiredIndexesPresent: false,
    rateLimitBucketsReady: false,
    aiUsageBucketsReady: false,
    retentionIndexesReady: false,
    securityEventsReady: false,
    authLockoutReady: false,
    authSessionRevocationReady: false,
    missingAuthSessionColumns: AUTH_SESSION_REQUIRED_COLUMNS,
    error: null,
  };

  if (!base.configured) return base;

  try {
    const pool = await getPool();
    if (!pool) return { ...base, error: 'database_pool_unavailable' };

    const tableResult = await pool.query(
      `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = ANY($1::text[])
      `,
      [SCHEMA_REQUIRED_TABLES],
    );
    const existingTables = new Set(tableResult.rows.map((row) => row.table_name));
    const authAccountsTableExists = existingTables.has('rp_auth_accounts');

    const indexResult = await pool.query(
      `
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = ANY($1::text[])
      `,
      [SCHEMA_REQUIRED_INDEXES],
    );
    const existingIndexes = new Set(indexResult.rows.map((row) => row.indexname));
    const verifiedContactUniqueIndexPresent = existingIndexes.has(AUTH_VERIFIED_CONTACT_UNIQUE_INDEX);
    let authAccountColumns = new Set();
    if (authAccountsTableExists) {
      const authColumnResult = await pool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'rp_auth_accounts'
      `);
      authAccountColumns = new Set(authColumnResult.rows.map((row) => row.column_name));
    }
    const missingAuthSessionColumns = AUTH_SESSION_REQUIRED_COLUMNS.filter((column) => !authAccountColumns.has(column));

    let verifiedContactDuplicateGroups = null;
    if (authAccountsTableExists) {
      const duplicateResult = await pool.query(`
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
      `);
      verifiedContactDuplicateGroups = Number(duplicateResult.rows[0]?.count || 0);
    }

    const missingRequiredTables = SCHEMA_REQUIRED_TABLES.filter((table) => !existingTables.has(table));
    const missingRequiredIndexes = SCHEMA_REQUIRED_INDEXES.filter((index) => !existingIndexes.has(index));

    return {
      ...base,
      checked: true,
      authAccountsTableExists,
      verifiedContactUniqueIndexPresent,
      verifiedContactDuplicateGroups,
      verifiedContactUniquenessReady: authAccountsTableExists
        && verifiedContactUniqueIndexPresent
        && verifiedContactDuplicateGroups === 0,
      missingRequiredTables,
      missingRequiredIndexes,
      allRequiredTablesPresent: missingRequiredTables.length === 0,
      allRequiredIndexesPresent: missingRequiredIndexes.length === 0,
      rateLimitBucketsReady: existingTables.has('rp_rate_limit_buckets')
        && existingIndexes.has('rp_rate_limit_buckets_expires_at_idx'),
      aiUsageBucketsReady: existingTables.has('rp_ai_usage_buckets')
        && existingIndexes.has('rp_ai_usage_buckets_usage_date_idx'),
      retentionIndexesReady: RETENTION_INDEXES.every((index) => existingIndexes.has(index)),
      securityEventsReady: existingTables.has('rp_security_events')
        && SECURITY_EVENT_INDEXES.every((index) => existingIndexes.has(index)),
      authLockoutReady: authAccountsTableExists && existingIndexes.has(AUTH_ACCOUNT_LOCKOUT_INDEX),
      authSessionRevocationReady: authAccountsTableExists && missingAuthSessionColumns.length === 0,
      missingAuthSessionColumns,
    };
  } catch (_) {
    return { ...base, checked: true, error: 'schema_check_failed' };
  }
}

async function queryDatabase(sql, params = []) {
  const pool = await getPool();
  if (!pool) throw new Error('DATABASE_URL 또는 RP_DATABASE_URL 환경변수가 필요합니다.');
  await ensureDatabaseSchema();
  return pool.query(sql, params);
}

let schemaPromise;
export async function ensureDatabaseSchema() {
  if (isRuntimeSchemaSyncDisabled()) return;

  const pool = await getPool();
  if (!pool) throw new Error('DATABASE_URL 또는 RP_DATABASE_URL 환경변수가 필요합니다.');
  if (schemaPromise) return schemaPromise;

  schemaPromise = (async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rp_auth_accounts (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        username_key TEXT NOT NULL UNIQUE,
        password_hash TEXT,
        password_plain TEXT,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        kakao_id TEXT,
        verification_method TEXT,
        verified_contact TEXT,
        role TEXT NOT NULL DEFAULT 'member',
        role_label TEXT,
        status TEXT,
        account_status TEXT,
        approved BOOLEAN NOT NULL DEFAULT FALSE,
        ai_approved BOOLEAN NOT NULL DEFAULT FALSE,
        ai_approved_at TIMESTAMPTZ,
        ai_approved_by TEXT,
        ai_daily_limit INTEGER,
        failed_login_count INTEGER NOT NULL DEFAULT 0,
        failed_login_window_started_at TIMESTAMPTZ,
        locked_until TIMESTAMPTZ,
        session_version BIGINT NOT NULL DEFAULT 1,
        password_changed_at TIMESTAMPTZ,
        requested_at TIMESTAMPTZ DEFAULT NOW(),
        approved_at TIMESTAMPTZ,
        message TEXT,
        source TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS rp_clients (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT,
        birth TEXT,
        gender TEXT,
        route TEXT,
        member_type TEXT,
        status TEXT,
        coach_name TEXT,
        parq_status TEXT,
        parq_yes_items JSONB NOT NULL DEFAULT '[]'::jsonb,
        goal TEXT,
        purpose JSONB NOT NULL DEFAULT '[]'::jsonb,
        pain_areas JSONB NOT NULL DEFAULT '[]'::jsonb,
        pain_score INTEGER NOT NULL DEFAULT 0,
        concern TEXT,
        total_sessions INTEGER NOT NULL DEFAULT 0,
        remaining_sessions INTEGER NOT NULL DEFAULT 0,
        contact_status TEXT NOT NULL DEFAULT '연락 대기',
        visit_status TEXT NOT NULL DEFAULT '미정',
        scheduled_visit_at TIMESTAMPTZ,
        last_contacted_at TIMESTAMPTZ,
        next_action TEXT,
        next_action_at TIMESTAMPTZ,
        follow_up_reason TEXT,
        first_source TEXT,
        first_medium TEXT,
        first_campaign TEXT,
        first_landing_path TEXT,
        latest_source TEXT,
        latest_medium TEXT,
        latest_campaign TEXT,
        application_referrer_path TEXT,
        campaign_code TEXT,
        referral_code TEXT,
        partner_code TEXT,
        qr_code TEXT,
        max_affiliation BOOLEAN NOT NULL DEFAULT FALSE,
        consultation_slot_id TEXT,
        consultation_activity_preference TEXT,
        source TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS rp_consultations (
        id BIGSERIAL PRIMARY KEY,
        client_id TEXT,
        client_name TEXT,
        consultation_date TEXT,
        consultation_status TEXT,
        record JSONB NOT NULL,
        saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query('ALTER TABLE rp_auth_accounts ADD COLUMN IF NOT EXISTS email TEXT');
    await pool.query('ALTER TABLE rp_auth_accounts ADD COLUMN IF NOT EXISTS kakao_id TEXT');
    await pool.query('ALTER TABLE rp_auth_accounts ADD COLUMN IF NOT EXISTS verification_method TEXT');
    await pool.query('ALTER TABLE rp_auth_accounts ADD COLUMN IF NOT EXISTS verified_contact TEXT');
    await pool.query('ALTER TABLE rp_auth_accounts ADD COLUMN IF NOT EXISTS ai_approved BOOLEAN NOT NULL DEFAULT FALSE');
    await pool.query('ALTER TABLE rp_auth_accounts ADD COLUMN IF NOT EXISTS ai_approved_at TIMESTAMPTZ');
    await pool.query('ALTER TABLE rp_auth_accounts ADD COLUMN IF NOT EXISTS ai_approved_by TEXT');
    await pool.query('ALTER TABLE rp_auth_accounts ADD COLUMN IF NOT EXISTS ai_daily_limit INTEGER');
    await pool.query('ALTER TABLE rp_auth_accounts ADD COLUMN IF NOT EXISTS failed_login_count INTEGER NOT NULL DEFAULT 0');
    await pool.query('ALTER TABLE rp_auth_accounts ADD COLUMN IF NOT EXISTS failed_login_window_started_at TIMESTAMPTZ');
    await pool.query('ALTER TABLE rp_auth_accounts ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ');
    await pool.query('ALTER TABLE rp_auth_accounts ADD COLUMN IF NOT EXISTS session_version BIGINT NOT NULL DEFAULT 1');
    await pool.query('ALTER TABLE rp_auth_accounts ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ');
    await pool.query("ALTER TABLE rp_clients ADD COLUMN IF NOT EXISTS contact_status TEXT NOT NULL DEFAULT '연락 대기'");
    await pool.query("ALTER TABLE rp_clients ADD COLUMN IF NOT EXISTS visit_status TEXT NOT NULL DEFAULT '미정'");
    await pool.query('ALTER TABLE rp_clients ADD COLUMN IF NOT EXISTS scheduled_visit_at TIMESTAMPTZ');
    await pool.query('ALTER TABLE rp_clients ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ');
    await pool.query('ALTER TABLE rp_clients ADD COLUMN IF NOT EXISTS next_action TEXT');
    await pool.query('ALTER TABLE rp_clients ADD COLUMN IF NOT EXISTS next_action_at TIMESTAMPTZ');
    await pool.query('ALTER TABLE rp_clients ADD COLUMN IF NOT EXISTS follow_up_reason TEXT');
    await pool.query('ALTER TABLE rp_clients ADD COLUMN IF NOT EXISTS first_source TEXT');
    await pool.query('ALTER TABLE rp_clients ADD COLUMN IF NOT EXISTS first_medium TEXT');
    await pool.query('ALTER TABLE rp_clients ADD COLUMN IF NOT EXISTS first_campaign TEXT');
    await pool.query('ALTER TABLE rp_clients ADD COLUMN IF NOT EXISTS first_landing_path TEXT');
    await pool.query('ALTER TABLE rp_clients ADD COLUMN IF NOT EXISTS latest_source TEXT');
    await pool.query('ALTER TABLE rp_clients ADD COLUMN IF NOT EXISTS latest_medium TEXT');
    await pool.query('ALTER TABLE rp_clients ADD COLUMN IF NOT EXISTS latest_campaign TEXT');
    await pool.query('ALTER TABLE rp_clients ADD COLUMN IF NOT EXISTS application_referrer_path TEXT');
    await pool.query('ALTER TABLE rp_clients ADD COLUMN IF NOT EXISTS campaign_code TEXT');
    await pool.query('ALTER TABLE rp_clients ADD COLUMN IF NOT EXISTS referral_code TEXT');
    await pool.query('ALTER TABLE rp_clients ADD COLUMN IF NOT EXISTS partner_code TEXT');
    await pool.query('ALTER TABLE rp_clients ADD COLUMN IF NOT EXISTS qr_code TEXT');
    await pool.query('ALTER TABLE rp_clients ADD COLUMN IF NOT EXISTS max_affiliation BOOLEAN NOT NULL DEFAULT FALSE');
    await pool.query('ALTER TABLE rp_clients ADD COLUMN IF NOT EXISTS consultation_slot_id TEXT');
    await pool.query('ALTER TABLE rp_clients ADD COLUMN IF NOT EXISTS consultation_activity_preference TEXT');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS rp_pe_exam_questions (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        member_name TEXT,
        role TEXT,
        question_type TEXT,
        admission_track TEXT,
        target_university TEXT,
        question_text TEXT NOT NULL,
        answer_status TEXT NOT NULL DEFAULT '접수',
        source TEXT,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS rp_pe_exam_ai_consults (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        member_name TEXT,
        role TEXT,
        grade_level TEXT,
        admission_track TEXT,
        target_university TEXT,
        target_university_id TEXT,
        target_university_region TEXT,
        target_university_area TEXT,
        target_university_school_type TEXT,
        target_university_slug TEXT,
        target_university_href TEXT,
        target_department TEXT,
        school_grade TEXT,
        mock_exam TEXT,
        practical_records TEXT,
        training_context TEXT,
        injury_note TEXT,
        question_focus TEXT,
        ai_status TEXT NOT NULL DEFAULT '검토 예정',
        source TEXT,
        consultation_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
        conversation_record JSONB NOT NULL DEFAULT '{}'::jsonb,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS rp_rate_limit_buckets (
        rate_key TEXT NOT NULL,
        window_start TIMESTAMPTZ NOT NULL,
        hit_count INTEGER NOT NULL DEFAULT 0,
        expires_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (rate_key, window_start)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS rp_ai_usage_buckets (
        subject_key TEXT NOT NULL,
        route_key TEXT NOT NULL,
        usage_date DATE NOT NULL,
        request_count INTEGER NOT NULL DEFAULT 0,
        token_estimate INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (subject_key, route_key, usage_date)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS rp_security_events (
        id BIGSERIAL PRIMARY KEY,
        event_type TEXT NOT NULL,
        outcome TEXT NOT NULL,
        actor_hash TEXT,
        target_hash TEXT,
        ip_hash TEXT,
        ip_prefix TEXT,
        user_agent TEXT,
        route TEXT,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rp_conversion_events (
        id TEXT PRIMARY KEY,
        anonymous_session_id TEXT NOT NULL,
        event_name TEXT NOT NULL,
        page_path TEXT,
        service_key TEXT,
        application_id TEXT,
        first_source TEXT,
        first_medium TEXT,
        first_campaign TEXT,
        first_landing_path TEXT,
        latest_source TEXT,
        latest_medium TEXT,
        latest_campaign TEXT,
        utm_content TEXT,
        campaign_code TEXT,
        referral_code TEXT,
        partner_code TEXT,
        qr_code TEXT,
        referrer_host TEXT,
        max_affiliation BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rp_consultation_slots (
        id TEXT PRIMARY KEY,
        starts_at TIMESTAMPTZ NOT NULL,
        ends_at TIMESTAMPTZ NOT NULL,
        is_open BOOLEAN NOT NULL DEFAULT TRUE,
        created_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT rp_consultation_slots_valid_window CHECK (ends_at > starts_at)
      )
    `);
    await pool.query('ALTER TABLE rp_pe_exam_ai_consults ADD COLUMN IF NOT EXISTS target_university_id TEXT');
    await pool.query('ALTER TABLE rp_pe_exam_ai_consults ADD COLUMN IF NOT EXISTS target_university_region TEXT');
    await pool.query('ALTER TABLE rp_pe_exam_ai_consults ADD COLUMN IF NOT EXISTS target_university_area TEXT');
    await pool.query('ALTER TABLE rp_pe_exam_ai_consults ADD COLUMN IF NOT EXISTS target_university_school_type TEXT');
    await pool.query('ALTER TABLE rp_pe_exam_ai_consults ADD COLUMN IF NOT EXISTS target_university_slug TEXT');
    await pool.query('ALTER TABLE rp_pe_exam_ai_consults ADD COLUMN IF NOT EXISTS target_university_href TEXT');
    await pool.query(
      "ALTER TABLE rp_pe_exam_ai_consults ADD COLUMN IF NOT EXISTS consultation_summary JSONB NOT NULL DEFAULT '{}'::jsonb",
    );
    await pool.query(
      "ALTER TABLE rp_pe_exam_ai_consults ADD COLUMN IF NOT EXISTS conversation_record JSONB NOT NULL DEFAULT '{}'::jsonb",
    );

    await pool.query('CREATE INDEX IF NOT EXISTS rp_clients_name_idx ON rp_clients (name)');
    await pool.query('CREATE INDEX IF NOT EXISTS rp_auth_accounts_locked_until_idx ON rp_auth_accounts (locked_until) WHERE locked_until IS NOT NULL');
    await pool.query('CREATE INDEX IF NOT EXISTS rp_consultations_client_id_idx ON rp_consultations (client_id)');
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS rp_auth_accounts_verified_contact_unique_idx
      ON rp_auth_accounts (
        LOWER(TRIM(verification_method)),
        LOWER(TRIM(verified_contact))
      )
      WHERE COALESCE(TRIM(verification_method), '') <> ''
        AND COALESCE(TRIM(verified_contact), '') <> ''
    `);
    await pool.query('CREATE INDEX IF NOT EXISTS rp_pe_exam_questions_username_idx ON rp_pe_exam_questions (username)');
    await pool.query('CREATE INDEX IF NOT EXISTS rp_pe_exam_questions_created_at_idx ON rp_pe_exam_questions (created_at DESC)');
    await pool.query('CREATE INDEX IF NOT EXISTS rp_pe_exam_ai_consults_username_idx ON rp_pe_exam_ai_consults (username)');
    await pool.query('CREATE INDEX IF NOT EXISTS rp_pe_exam_ai_consults_created_at_idx ON rp_pe_exam_ai_consults (created_at DESC)');
    await pool.query('CREATE INDEX IF NOT EXISTS rp_rate_limit_buckets_expires_at_idx ON rp_rate_limit_buckets (expires_at)');
    await pool.query('CREATE INDEX IF NOT EXISTS rp_ai_usage_buckets_usage_date_idx ON rp_ai_usage_buckets (usage_date DESC)');
    await pool.query('CREATE INDEX IF NOT EXISTS rp_security_events_created_at_idx ON rp_security_events (created_at DESC)');
    await pool.query('CREATE INDEX IF NOT EXISTS rp_security_events_event_type_idx ON rp_security_events (event_type, created_at DESC)');
    await pool.query('CREATE INDEX IF NOT EXISTS rp_security_events_target_hash_idx ON rp_security_events (target_hash, created_at DESC)');
    await pool.query('CREATE INDEX IF NOT EXISTS rp_security_events_ip_hash_idx ON rp_security_events (ip_hash, created_at DESC)');
    await pool.query('CREATE INDEX IF NOT EXISTS rp_clients_contact_status_idx ON rp_clients (contact_status, updated_at DESC)');
    await pool.query('CREATE INDEX IF NOT EXISTS rp_clients_visit_status_idx ON rp_clients (visit_status, updated_at DESC)');
    await pool.query('CREATE INDEX IF NOT EXISTS rp_clients_next_action_at_idx ON rp_clients (next_action_at) WHERE next_action_at IS NOT NULL');
    await pool.query('CREATE INDEX IF NOT EXISTS rp_clients_first_source_idx ON rp_clients (first_source, created_at DESC)');
    await pool.query('CREATE INDEX IF NOT EXISTS rp_conversion_events_created_at_idx ON rp_conversion_events (created_at DESC)');
    await pool.query('CREATE INDEX IF NOT EXISTS rp_conversion_events_name_created_at_idx ON rp_conversion_events (event_name, created_at DESC)');
    await pool.query('CREATE INDEX IF NOT EXISTS rp_conversion_events_session_idx ON rp_conversion_events (anonymous_session_id, created_at DESC)');
    await pool.query('CREATE INDEX IF NOT EXISTS rp_conversion_events_source_idx ON rp_conversion_events (latest_source, created_at DESC)');
    await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS rp_consultation_slots_starts_at_unique_idx ON rp_consultation_slots (starts_at)');
    await pool.query('CREATE INDEX IF NOT EXISTS rp_consultation_slots_open_starts_at_idx ON rp_consultation_slots (is_open, starts_at)');
    await pool.query('CREATE INDEX IF NOT EXISTS rp_clients_consultation_slot_id_idx ON rp_clients (consultation_slot_id) WHERE consultation_slot_id IS NOT NULL');
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS rp_clients_active_consultation_slot_unique_idx
      ON rp_clients (consultation_slot_id)
      WHERE consultation_slot_id IS NOT NULL
        AND visit_status IN ('예약 승인 대기', '일정 협의 중', '방문 예약 완료', '방문 전 확인')
    `);
  })();

  try {
    await schemaPromise;
  } catch (error) {
    schemaPromise = null;
    throw error;
  }

  return schemaPromise;
}

export async function checkDatabaseRateLimit(key, limit, windowMs) {
  if (!isDatabaseConfigured()) return null;

  const rateKey = cleanEnvValue(key).toLowerCase().slice(0, 512);
  const maxHits = Math.max(1, Number(limit) || 1);
  const normalizedWindowMs = Math.max(1000, Number(windowMs) || 1000);
  if (!rateKey) return null;

  const nowMs = Date.now();
  const windowStartMs = Math.floor(nowMs / normalizedWindowMs) * normalizedWindowMs;
  const windowEndMs = windowStartMs + normalizedWindowMs;
  const result = await queryDatabase(
    `INSERT INTO rp_rate_limit_buckets (
        rate_key,
        window_start,
        hit_count,
        expires_at,
        updated_at
      )
      VALUES ($1, $2::timestamptz, 1, $3::timestamptz, NOW())
      ON CONFLICT (rate_key, window_start)
      DO UPDATE SET
        hit_count = rp_rate_limit_buckets.hit_count + 1,
        expires_at = EXCLUDED.expires_at,
        updated_at = NOW()
      RETURNING hit_count`,
    [rateKey, new Date(windowStartMs).toISOString(), new Date(windowEndMs).toISOString()],
  );

  if (Math.random() < 0.02) {
    queryDatabase("DELETE FROM rp_rate_limit_buckets WHERE expires_at < NOW() - INTERVAL '5 minutes'").catch(() => {});
  }

  const hitCount = Number(result.rows[0]?.hit_count || 0);
  if (hitCount <= maxHits) return 0;

  return Math.max(1, Math.ceil((windowEndMs - nowMs) / 1000));
}

export async function recordDatabaseSecurityEvent(event = {}) {
  if (!isDatabaseConfigured()) return null;

  const eventType = cleanEnvValue(event.eventType).toLowerCase().slice(0, 120);
  const outcome = cleanEnvValue(event.outcome).toLowerCase().slice(0, 80);
  if (!eventType || !outcome) return null;

  const metadata = event.metadata && typeof event.metadata === 'object' && !Array.isArray(event.metadata)
    ? event.metadata
    : {};

  const result = await queryDatabase(
    `INSERT INTO rp_security_events (
        event_type,
        outcome,
        actor_hash,
        target_hash,
        ip_hash,
        ip_prefix,
        user_agent,
        route,
        metadata
      )
      VALUES ($1, $2, NULLIF($3, ''), NULLIF($4, ''), NULLIF($5, ''), NULLIF($6, ''), NULLIF($7, ''), NULLIF($8, ''), $9::jsonb)
      RETURNING id, created_at`,
    [
      eventType,
      outcome,
      cleanEnvValue(event.actorHash).slice(0, 120),
      cleanEnvValue(event.targetHash).slice(0, 120),
      cleanEnvValue(event.ipHash).slice(0, 120),
      cleanEnvValue(event.ipPrefix).slice(0, 80),
      cleanEnvValue(event.userAgent).slice(0, 240),
      cleanEnvValue(event.route).slice(0, 240),
      JSON.stringify(metadata),
    ],
  );

  return result.rows[0] || null;
}

function clampInteger(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function shortHash(value) {
  return cleanEnvValue(value).slice(0, 16);
}

function sanitizeSecurityEventMetadata(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value)
      .slice(0, 24)
      .map(([key, item]) => {
        if (item === null || item === undefined) return [cleanEnvValue(key).slice(0, 80), null];
        if (typeof item === 'boolean') return [cleanEnvValue(key).slice(0, 80), item];
        if (typeof item === 'number') return [cleanEnvValue(key).slice(0, 80), Number.isFinite(item) ? item : null];
        if (typeof item === 'string') return [cleanEnvValue(key).slice(0, 80), cleanEnvValue(item).slice(0, 160)];
        return [cleanEnvValue(key).slice(0, 80), '[redacted]'];
      }),
  );
}

function mapSecurityEventRow(row) {
  if (!row) return null;

  return {
    id: String(row.id || ''),
    eventType: String(row.event_type || ''),
    outcome: String(row.outcome || ''),
    actorHashPrefix: shortHash(row.actor_hash),
    targetHashPrefix: shortHash(row.target_hash),
    ipHashPrefix: shortHash(row.ip_hash),
    ipPrefix: String(row.ip_prefix || ''),
    route: String(row.route || ''),
    userAgent: String(row.user_agent || '').slice(0, 160),
    metadata: sanitizeSecurityEventMetadata(row.metadata),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : '',
  };
}

export async function listDatabaseSecurityEvents({
  limit = 80,
  windowHours = 24,
  eventType = '',
  outcome = '',
} = {}) {
  if (!isDatabaseConfigured()) {
    return {
      events: [],
      summary: [],
      ipPrefixes: [],
      count: 0,
      windowHours: clampInteger(windowHours, 24, 1, 24 * 30),
    };
  }

  const safeLimit = clampInteger(limit, 80, 1, 200);
  const safeWindowHours = clampInteger(windowHours, 24, 1, 24 * 30);
  const filters = ['created_at >= NOW() - ($1::int * INTERVAL \'1 hour\')'];
  const params = [safeWindowHours];

  const normalizedEventType = cleanEnvValue(eventType).toLowerCase().slice(0, 120);
  if (normalizedEventType) {
    params.push(normalizedEventType);
    filters.push(`event_type = $${params.length}`);
  }

  const normalizedOutcome = cleanEnvValue(outcome).toLowerCase().slice(0, 80);
  if (normalizedOutcome) {
    params.push(normalizedOutcome);
    filters.push(`outcome = $${params.length}`);
  }

  const whereSql = filters.join(' AND ');
  const eventParams = [...params, safeLimit];

  const [eventsResult, summaryResult, ipPrefixResult, countResult] = await Promise.all([
    queryDatabase(
      `SELECT
          id,
          event_type,
          outcome,
          actor_hash,
          target_hash,
          ip_hash,
          ip_prefix,
          user_agent,
          route,
          metadata,
          created_at
        FROM rp_security_events
        WHERE ${whereSql}
        ORDER BY created_at DESC
        LIMIT $${eventParams.length}`,
      eventParams,
    ),
    queryDatabase(
      `SELECT
          event_type,
          outcome,
          COUNT(*)::int AS count,
          MAX(created_at) AS last_seen_at
        FROM rp_security_events
        WHERE ${whereSql}
        GROUP BY event_type, outcome
        ORDER BY count DESC, last_seen_at DESC
        LIMIT 20`,
      params,
    ),
    queryDatabase(
      `SELECT
          ip_prefix,
          COUNT(*)::int AS count,
          MAX(created_at) AS last_seen_at
        FROM rp_security_events
        WHERE ${whereSql}
          AND ip_prefix IS NOT NULL
          AND ip_prefix <> ''
        GROUP BY ip_prefix
        ORDER BY count DESC, last_seen_at DESC
        LIMIT 12`,
      params,
    ),
    queryDatabase(
      `SELECT COUNT(*)::int AS count
       FROM rp_security_events
       WHERE ${whereSql}`,
      params,
    ),
  ]);

  return {
    events: eventsResult.rows.map(mapSecurityEventRow).filter(Boolean),
    summary: summaryResult.rows.map((row) => ({
      eventType: String(row.event_type || ''),
      outcome: String(row.outcome || ''),
      count: Number(row.count || 0),
      lastSeenAt: row.last_seen_at ? new Date(row.last_seen_at).toISOString() : '',
    })),
    ipPrefixes: ipPrefixResult.rows.map((row) => ({
      ipPrefix: String(row.ip_prefix || ''),
      count: Number(row.count || 0),
      lastSeenAt: row.last_seen_at ? new Date(row.last_seen_at).toISOString() : '',
    })),
    count: Number(countResult.rows[0]?.count || 0),
    windowHours: safeWindowHours,
  };
}

function bytesToBase64Url(bytes) {
  return Buffer.from(bytes)
    .toString('base64')
    .replace(/[+]/g, '-')
    .replace(/[/]/g, '_')
    .replace(/=+$/g, '');
}

async function hashDatabasePassword(password) {
  const normalizedPassword = cleanEnvValue(password);
  const secret = getPasswordSecret();

  if (!normalizedPassword) throw new Error('비밀번호가 필요합니다.');
  if (!secret) throw new Error('RP_PASSWORD_HASH_SECRET 또는 RP_ADMIN_SESSION_SECRET 환경변수가 필요합니다.');

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`rp-auth:${normalizedPassword}`));
  return bytesToBase64Url(new Uint8Array(signature));
}

function sanitizeAccount(account) {
  return {
    username: account.username,
    name: account.name || account.username,
    role: normalizeRole(account.role),
    phone: account.phone || '',
    email: account.email || '',
    kakaoId: account.kakao_id || account.kakaoId || '',
    authSource: 'database',
    sessionVersion: Math.max(1, Number(account.session_version || account.sessionVersion || 1)),
  };
}

function mapAuthAccountAccessRow(row) {
  if (!row) return null;

  return {
    id: String(row.id || ''),
    username: String(row.username || ''),
    usernameKey: String(row.username_key || '').toLowerCase(),
    name: String(row.name || row.username || ''),
    role: normalizeRole(row.role),
    roleLabel: String(row.role_label || getRoleLabel(row.role)),
    status: String(row.status || ''),
    accountStatus: String(row.account_status || ''),
    approved: Boolean(row.approved),
    sessionVersion: Math.max(1, Number(row.session_version || 1)),
    passwordChangedAt: row.password_changed_at ? new Date(row.password_changed_at).toISOString() : '',
    aiApproved: Boolean(row.ai_approved),
    aiApprovedAt: row.ai_approved_at ? new Date(row.ai_approved_at).toISOString() : '',
    aiApprovedBy: String(row.ai_approved_by || ''),
    aiDailyLimit: Number(row.ai_daily_limit) > 0 ? Number(row.ai_daily_limit) : null,
    aiUsageToday: Number(row.ai_usage_today || 0),
    phone: String(row.phone || ''),
    email: String(row.email || ''),
    kakaoId: String(row.kakao_id || ''),
    verificationMethod: String(row.verification_method || ''),
    verifiedContact: String(row.verified_contact || ''),
    requestedAt: row.requested_at ? new Date(row.requested_at).toISOString() : '',
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : '',
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : '',
  };
}

export function getKstDateKey(date = new Date()) {
  const source = date instanceof Date ? date : new Date(date);
  return new Date(source.getTime() + (9 * 60 * 60 * 1000)).toISOString().slice(0, 10);
}

export async function findDatabaseAuthAccountAccess(username) {
  if (!isDatabaseConfigured()) return null;

  const normalizedUsername = cleanEnvValue(username).toLowerCase();
  if (!normalizedUsername) return null;

  const result = await queryDatabase(
    `SELECT *
     FROM rp_auth_accounts
     WHERE username_key = $1
     LIMIT 1`,
    [normalizedUsername],
  );

  return mapAuthAccountAccessRow(result.rows[0]);
}

export function isDatabaseAuthAccountAccessActive(account) {
  return isApprovedAccount(account);
}

export async function listDatabaseAuthAccounts({ limit = 200 } = {}) {
  if (!isDatabaseConfigured()) return [];

  const usageDate = getKstDateKey();
  const safeLimit = Math.min(500, Math.max(1, Number(limit) || 200));
  const result = await queryDatabase(
    `SELECT
        account.*,
        COALESCE(
          (
            SELECT usage.request_count
            FROM rp_ai_usage_buckets usage
            WHERE usage.subject_key = account.username_key
              AND usage.route_key = $3
              AND usage.usage_date = $1::date
            LIMIT 1
          ),
          (
            SELECT SUM(usage.request_count)
            FROM rp_ai_usage_buckets usage
            WHERE usage.subject_key = account.username_key
              AND usage.route_key <> $3
              AND usage.usage_date = $1::date
          ),
          0
        )::int AS ai_usage_today
      FROM rp_auth_accounts account
      ORDER BY account.created_at DESC
      LIMIT $2`,
    [usageDate, safeLimit, AI_USAGE_DAILY_ROUTE_KEY],
  );

  return result.rows.map(mapAuthAccountAccessRow).filter(Boolean);
}

function hasOwnValue(source, key) {
  return Object.prototype.hasOwnProperty.call(source || {}, key);
}

function normalizeOptionalPositiveInteger(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;

  return Math.floor(parsed);
}

export async function updateDatabaseAuthAccountAiAccess(username, updates = {}, actor = '') {
  if (!isDatabaseConfigured()) throw new Error('DATABASE_URL or RP_DATABASE_URL is required.');

  const normalizedUsername = cleanEnvValue(username).toLowerCase();
  if (!normalizedUsername) throw new Error('Username is required.');

  const hasAiApprovedUpdate = hasOwnValue(updates, 'aiApproved');
  const hasAiDailyLimitUpdate = hasOwnValue(updates, 'aiDailyLimit');

  if (!hasAiApprovedUpdate && !hasAiDailyLimitUpdate) {
    throw new Error('AI access update is required.');
  }

  const nextAiApproved = Boolean(updates.aiApproved);
  const nextAiDailyLimit = normalizeOptionalPositiveInteger(updates.aiDailyLimit);

  const result = await queryDatabase(
    `UPDATE rp_auth_accounts
      SET ai_approved = CASE WHEN $2 THEN $3 ELSE ai_approved END,
          ai_approved_at = CASE
            WHEN $2 AND $3 THEN COALESCE(ai_approved_at, NOW())
            WHEN $2 AND NOT $3 THEN NULL
            ELSE ai_approved_at
          END,
          ai_approved_by = CASE
            WHEN $2 AND $3 THEN NULLIF($6, '')
            WHEN $2 AND NOT $3 THEN NULL
            ELSE ai_approved_by
          END,
          ai_daily_limit = CASE WHEN $4 THEN $5 ELSE ai_daily_limit END,
          updated_at = NOW()
      WHERE username_key = $1
      RETURNING *`,
    [
      normalizedUsername,
      hasAiApprovedUpdate,
      nextAiApproved,
      hasAiDailyLimitUpdate,
      nextAiDailyLimit,
      cleanEnvValue(actor),
    ],
  );

  return mapAuthAccountAccessRow(result.rows[0]);
}

export async function updateDatabaseAuthAccountAiApproval(username, approved, actor = '') {
  return updateDatabaseAuthAccountAiAccess(username, { aiApproved: Boolean(approved) }, actor);
}

export async function consumeDatabaseAiUsage({
  username,
  routeKey,
  limit,
  usageDate = getKstDateKey(),
  tokenEstimate = 0,
} = {}) {
  if (!isDatabaseConfigured()) throw new Error('DATABASE_URL or RP_DATABASE_URL is required.');

  const subjectKey = cleanEnvValue(username).toLowerCase();
  const normalizedRouteKey = cleanEnvValue(routeKey).toLowerCase().slice(0, 160);
  const usageRouteKey = normalizedRouteKey === AI_USAGE_DAILY_ROUTE_KEY ? 'ai-service' : normalizedRouteKey;
  const maxRequests = Math.max(1, Math.floor(Number(limit) || 1));
  const safeTokenEstimate = Math.max(0, Math.floor(Number(tokenEstimate) || 0));

  if (!subjectKey) throw new Error('AI usage subject is required.');
  if (!usageRouteKey) throw new Error('AI usage route is required.');

  const result = await queryDatabase(
    `WITH daily_usage AS (
        INSERT INTO rp_ai_usage_buckets (
          subject_key,
          route_key,
          usage_date,
          request_count,
          token_estimate,
          updated_at
        )
        VALUES ($1, $2, $4::date, 1, $6, NOW())
        ON CONFLICT (subject_key, route_key, usage_date)
        DO UPDATE SET
          request_count = rp_ai_usage_buckets.request_count + 1,
          token_estimate = rp_ai_usage_buckets.token_estimate + EXCLUDED.token_estimate,
          updated_at = NOW()
        WHERE rp_ai_usage_buckets.request_count < $5
        RETURNING request_count, token_estimate
      ),
      route_usage AS (
        INSERT INTO rp_ai_usage_buckets (
          subject_key,
          route_key,
          usage_date,
          request_count,
          token_estimate,
          updated_at
        )
        SELECT $1, $3, $4::date, 1, $6, NOW()
        FROM daily_usage
        ON CONFLICT (subject_key, route_key, usage_date)
        DO UPDATE SET
          request_count = rp_ai_usage_buckets.request_count + 1,
          token_estimate = rp_ai_usage_buckets.token_estimate + EXCLUDED.token_estimate,
          updated_at = NOW()
        RETURNING request_count, token_estimate
      )
      SELECT
        daily_usage.request_count AS daily_request_count,
        daily_usage.token_estimate AS daily_token_estimate,
        route_usage.request_count AS route_request_count,
        route_usage.token_estimate AS route_token_estimate
      FROM daily_usage
      LEFT JOIN route_usage ON TRUE`,
    [
      subjectKey,
      AI_USAGE_DAILY_ROUTE_KEY,
      usageRouteKey,
      usageDate,
      maxRequests,
      safeTokenEstimate,
    ],
  );

  const row = result.rows[0];
  if (row) {
    const dailyCount = Number(row.daily_request_count || 0);

    return {
      allowed: true,
      count: dailyCount,
      routeCount: Number(row.route_request_count || 0),
      tokenEstimate: Number(row.daily_token_estimate || 0),
      routeTokenEstimate: Number(row.route_token_estimate || 0),
      limit: maxRequests,
      usageDate,
      remaining: Math.max(0, maxRequests - dailyCount),
    };
  }

  const current = await queryDatabase(
    `SELECT request_count, token_estimate
     FROM rp_ai_usage_buckets
     WHERE subject_key = $1
       AND route_key = $2
       AND usage_date = $3::date
     LIMIT 1`,
    [subjectKey, AI_USAGE_DAILY_ROUTE_KEY, usageDate],
  );
  const currentRow = current.rows[0] || {};

  return {
    allowed: false,
    count: Number(currentRow.request_count || maxRequests),
    tokenEstimate: Number(currentRow.token_estimate || 0),
    limit: maxRequests,
    usageDate,
    remaining: 0,
  };
}

async function migratePlainDatabasePassword(account, normalizedPassword) {
  const passwordHash = await hashDatabasePassword(normalizedPassword);
  const result = await queryDatabase(
    `UPDATE rp_auth_accounts
      SET password_hash = $2,
          password_plain = NULL,
          session_version = COALESCE(session_version, 1) + 1,
          password_changed_at = NOW(),
          updated_at = NOW()
      WHERE username_key = $1
        AND password_plain = $3
      RETURNING *`,
    [account.username_key, passwordHash, account.password_plain],
  );

  return result.rows[0] || { ...account, password_hash: passwordHash, password_plain: null };
}

function toIsoTimestamp(value) {
  if (!value) return '';
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : '';
}

function isDatabaseAccountLocked(account, policy = getDatabaseAuthLockoutPolicy()) {
  if (!policy.enabled) return false;
  const lockedUntilTime = Date.parse(account?.locked_until);
  return Number.isFinite(lockedUntilTime) && lockedUntilTime > Date.now();
}

async function resetDatabaseAuthLoginFailure(account) {
  if (!account?.username_key) return account;

  try {
    const result = await queryDatabase(
      `UPDATE rp_auth_accounts
        SET failed_login_count = 0,
            failed_login_window_started_at = NULL,
            locked_until = NULL,
            updated_at = NOW()
        WHERE username_key = $1
        RETURNING *`,
      [account.username_key],
    );

    return result.rows[0] || account;
  } catch (_) {
    return account;
  }
}

async function recordDatabaseAuthLoginFailure(account) {
  const policy = getDatabaseAuthLockoutPolicy();
  if (!policy.enabled || !account?.username_key) {
    return {
      failedLoginCount: Number(account?.failed_login_count || 0),
      lockedUntil: toIsoTimestamp(account?.locked_until),
      locked: false,
    };
  }

  try {
    const result = await queryDatabase(
      `WITH next_failure AS (
          SELECT
            CASE
              WHEN failed_login_window_started_at IS NULL
                OR failed_login_window_started_at < NOW() - ($3::int * INTERVAL '1 second')
              THEN 1
              ELSE COALESCE(failed_login_count, 0) + 1
            END AS next_failed_login_count
          FROM rp_auth_accounts
          WHERE username_key = $1
          LIMIT 1
        )
        UPDATE rp_auth_accounts account
        SET failed_login_count = next_failure.next_failed_login_count,
            failed_login_window_started_at = CASE
              WHEN account.failed_login_window_started_at IS NULL
                OR account.failed_login_window_started_at < NOW() - ($3::int * INTERVAL '1 second')
              THEN NOW()
              ELSE account.failed_login_window_started_at
            END,
            locked_until = CASE
              WHEN next_failure.next_failed_login_count >= $2
              THEN NOW() + ($4::int * INTERVAL '1 second')
              ELSE account.locked_until
            END,
            updated_at = NOW()
        FROM next_failure
        WHERE account.username_key = $1
        RETURNING account.failed_login_count, account.locked_until`,
      [account.username_key, policy.failureLimit, policy.windowSeconds, policy.lockSeconds],
    );
    const row = result.rows[0] || {};
    const lockedUntil = toIsoTimestamp(row.locked_until);

    return {
      failedLoginCount: Number(row.failed_login_count || 0),
      lockedUntil,
      locked: Boolean(lockedUntil && Date.parse(lockedUntil) > Date.now()),
    };
  } catch (_) {
    return {
      failedLoginCount: Number(account?.failed_login_count || 0),
      lockedUntil: toIsoTimestamp(account?.locked_until),
      locked: false,
    };
  }
}

export async function verifyDatabaseAuthAccount(username, password) {
  if (!isDatabaseConfigured()) {
    return { account: null, accountFound: false, source: 'database', reason: 'database_not_configured' };
  }

  const normalizedUsername = cleanEnvValue(username).toLowerCase();
  const normalizedPassword = cleanEnvValue(password);
  if (!normalizedUsername || !normalizedPassword) {
    return { account: null, accountFound: false, source: 'database', reason: 'missing_credentials' };
  }

  const result = await queryDatabase(
    `SELECT * FROM rp_auth_accounts WHERE username_key = $1 LIMIT 1`,
    [normalizedUsername],
  );
  const account = result.rows[0];

  if (!account) {
    return { account: null, accountFound: false, source: 'database', reason: 'invalid_credentials' };
  }

  if (!isApprovedAccount(account)) {
    return { account: null, accountFound: true, source: 'database', reason: 'not_approved' };
  }

  if (isDatabaseAccountLocked(account)) {
    return {
      account: null,
      accountFound: true,
      source: 'database',
      reason: 'locked',
      failedLoginCount: Number(account.failed_login_count || 0),
      lockedUntil: toIsoTimestamp(account.locked_until),
    };
  }

  if (account.password_hash) {
    const attemptedHash = await hashDatabasePassword(normalizedPassword).catch(() => '');
    if (safeEqual(attemptedHash, account.password_hash)) {
      const resetAccount = await resetDatabaseAuthLoginFailure(account);
      return {
        account: sanitizeAccount(resetAccount),
        accountFound: true,
        source: 'database',
        reason: 'success',
      };
    }
  }

  if (safeEqual(account.password_plain, normalizedPassword)) {
    const migratedAccount = await migratePlainDatabasePassword(account, normalizedPassword).catch(() => account);
    const resetAccount = await resetDatabaseAuthLoginFailure(migratedAccount);
    return {
      account: sanitizeAccount(resetAccount),
      accountFound: true,
      source: 'database',
      reason: 'success',
    };
  }

  const failure = await recordDatabaseAuthLoginFailure(account);
  return {
    account: null,
    accountFound: true,
    source: 'database',
    reason: failure.locked ? 'locked_after_failure' : 'invalid_credentials',
    failedLoginCount: failure.failedLoginCount,
    lockedUntil: failure.lockedUntil,
  };
}

export async function findDatabaseAuthAccount(username, password) {
  const result = await verifyDatabaseAuthAccount(username, password);
  return result.account;
}

export async function findDatabaseAuthAccountByIdentity(name, contact, method = 'phone') {
  if (!isDatabaseConfigured()) return null;

  const normalizedName = cleanEnvValue(name).toLowerCase();
  const normalizedMethod = normalizeIdentityMethod(method);
  const normalizedContact = normalizeIdentityContact(normalizedMethod, contact);
  if (!normalizedName || !normalizedContact) return null;

  const contactWhere = normalizedMethod === 'email'
    ? `(LOWER(TRIM(COALESCE(email, ''))) = $2
        OR LOWER(TRIM(username)) = $2
        OR LOWER(TRIM(COALESCE(verified_contact, ''))) = $2)`
    : normalizedMethod === 'kakao'
      ? `(LOWER(TRIM(COALESCE(kakao_id, ''))) = $2
          OR LOWER(TRIM(COALESCE(verified_contact, ''))) = $2)`
      : `(regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') = $2
          OR regexp_replace(COALESCE(verified_contact, ''), '[^0-9]', '', 'g') = $2)`;

  const result = await queryDatabase(
    `SELECT * FROM rp_auth_accounts
      WHERE LOWER(TRIM(name)) = $1
        AND ${contactWhere}
      ORDER BY updated_at DESC
      LIMIT 5`,
    [normalizedName, normalizedContact],
  );
  const account = result.rows.find(isApprovedAccount);
  return account ? sanitizeAccount(account) : null;
}

export async function updateDatabaseAuthAccountPassword(username, password) {
  if (!isDatabaseConfigured()) throw new Error('DATABASE_URL 또는 RP_DATABASE_URL 환경변수가 필요합니다.');

  const normalizedUsername = cleanEnvValue(username).toLowerCase();
  const normalizedPassword = cleanEnvValue(password);
  if (!normalizedUsername || !normalizedPassword) throw new Error('아이디와 새 비밀번호가 필요합니다.');

  const passwordHash = await hashDatabasePassword(normalizedPassword);
  const result = await queryDatabase(
    `UPDATE rp_auth_accounts
      SET password_hash = $2,
          password_plain = NULL,
          session_version = COALESCE(session_version, 1) + 1,
          password_changed_at = NOW(),
          updated_at = NOW()
      WHERE username_key = $1
      RETURNING *`,
    [normalizedUsername, passwordHash],
  );
  const account = result.rows[0];
  if (!account || !isApprovedAccount(account)) return null;
  const resetAccount = await resetDatabaseAuthLoginFailure(account);
  return sanitizeAccount(resetAccount);
}

export async function revokeDatabaseAuthAccountSessions(username) {
  if (!isDatabaseConfigured()) throw new Error('DATABASE_URL 또는 RP_DATABASE_URL 환경변수가 필요합니다.');

  const normalizedUsername = cleanEnvValue(username).toLowerCase();
  if (!normalizedUsername) throw new Error('아이디가 필요합니다.');

  const result = await queryDatabase(
    `UPDATE rp_auth_accounts
      SET session_version = COALESCE(session_version, 1) + 1,
          updated_at = NOW()
      WHERE username_key = $1
      RETURNING *`,
    [normalizedUsername],
  );

  return mapAuthAccountAccessRow(result.rows[0]);
}

function buildSignupPayload(record) {
  const role = normalizeRole(record.requestedRole || record.role);
  const requestedAt = record.requestedAt || new Date().toISOString();
  const activeMember = role === 'member';
  const username = cleanEnvValue(record.username);
  const verificationMethod = normalizeIdentityMethod(record.verificationMethod);
  const verifiedContact = normalizeIdentityContact(
    verificationMethod,
    record.verifiedContact || record.verificationContact || record.phone || record.email || record.kakaoId,
  );
  const email = normalizeEmail(record.email || (verificationMethod === 'email' ? verifiedContact : ''));
  const phone = cleanEnvValue(record.phone || (verificationMethod === 'phone' ? verifiedContact : ''));
  const kakaoId = cleanEnvValue(record.kakaoId || record.kakaoTalkId || (verificationMethod === 'kakao' ? verifiedContact : ''));

  return {
    id: record.id || buildId('AUTH'),
    username,
    usernameKey: username.toLowerCase(),
    passwordHash: record.passwordHash,
    name: cleanEnvValue(record.name),
    phone,
    email,
    kakaoId,
    verificationMethod,
    verifiedContact,
    role,
    roleLabel: getRoleLabel(role),
    status: activeMember ? MEMBER_ACTIVE_STATUS : STAFF_PENDING_STATUS,
    accountStatus: activeMember ? 'active' : 'pending_approval',
    approved: activeMember,
    requestedAt,
    approvedAt: activeMember ? requestedAt : null,
    message: cleanEnvValue(record.message),
    source: 'reperformance-homepage-signup',
  };
}

function isUniqueViolation(error) {
  return error?.code === '23505'
    || error?.constraint === 'rp_auth_accounts_verified_contact_unique_idx'
    || String(error?.message || '').toLowerCase().includes('duplicate key');
}

async function assertVerifiedContactAvailable(account) {
  if (!account.verificationMethod || !account.verifiedContact) return;

  const existing = await queryDatabase(
    `SELECT username
      FROM rp_auth_accounts
      WHERE LOWER(TRIM(COALESCE(verification_method, ''))) = LOWER(TRIM($1))
        AND LOWER(TRIM(COALESCE(verified_contact, ''))) = LOWER(TRIM($2))
      LIMIT 1`,
    [account.verificationMethod, account.verifiedContact],
  );

  if (existing.rows[0]) {
    throw exposePublicError('이미 가입된 인증 연락처입니다. 계정 찾기를 이용해 주세요.', 409);
  }
}

export async function saveDatabaseAuthSignup(record) {
  if (!isDatabaseConfigured()) throw new Error('DATABASE_URL 또는 RP_DATABASE_URL 환경변수가 필요합니다.');

  const passwordHash = record.passwordHash || await hashDatabasePassword(record.password);
  const account = buildSignupPayload({ ...record, passwordHash });

  if (!account.username || !account.name || !account.verifiedContact) {
    throw exposePublicError('이름, 아이디, 연락처는 필수입니다.');
  }

  await assertVerifiedContactAvailable(account);

  let result;
  try {
    result = await queryDatabase(
      `INSERT INTO rp_auth_accounts (
        id, username, username_key, password_hash, name, phone, email, kakao_id,
        verification_method, verified_contact, role, role_label, status,
        account_status, approved, requested_at, approved_at, message, source, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW())
      ON CONFLICT (username_key) DO NOTHING
      RETURNING *`,
      [
        account.id,
        account.username,
        account.usernameKey,
        account.passwordHash,
        account.name,
        account.phone,
        account.email,
        account.kakaoId,
        account.verificationMethod,
        account.verifiedContact,
        account.role,
        account.roleLabel,
        account.status,
        account.accountStatus,
        account.approved,
        account.requestedAt,
        account.approvedAt,
        account.message,
        account.source,
      ],
    );
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw exposePublicError('이미 가입된 아이디 또는 인증 연락처입니다. 계정 찾기를 이용해 주세요.', 409);
    }
    throw error;
  }

  if (!result.rows[0]) throw exposePublicError('이미 사용 중인 아이디입니다.', 409);

  return { ok: true, action: 'database', account: sanitizeAccount(result.rows[0]), autoApproved: account.approved };
}

function normalizeJsonArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return splitList(value);
  return [];
}

function normalizeJsonObject(value, fallback = {}) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch (_) {}
  }
  return fallback;
}

function normalizeTimestamp(value) {
  if (!value) return '';

  try {
    return new Date(value).toISOString();
  } catch (_) {
    return '';
  }
}

function mapClientRow(row) {
  if (!row) return null;

  return {
    id: String(row.id),
    name: String(row.name || ''),
    phone: String(row.phone || ''),
    birth: String(row.birth || ''),
    gender: String(row.gender || ''),
    route: String(row.route || ''),
    memberType: String(row.member_type || ''),
    status: String(row.status || '상담 전'),
    coachName: String(row.coach_name || '정우현'),
    parqStatus: String(row.parq_status || '확인 필요'),
    parqYesItems: normalizeJsonArray(row.parq_yes_items),
    goal: String(row.goal || ''),
    purpose: normalizeJsonArray(row.purpose),
    painAreas: normalizeJsonArray(row.pain_areas),
    painScore: Number(row.pain_score) || 0,
    concern: String(row.concern || ''),
    totalSessions: Number(row.total_sessions) || 0,
    remainingSessions: Number(row.remaining_sessions) || 0,
    contactStatus: String(row.contact_status || '연락 대기'),
    visitStatus: String(row.visit_status || '미정'),
    scheduledVisitAt: normalizeTimestamp(row.scheduled_visit_at),
    lastContactedAt: normalizeTimestamp(row.last_contacted_at),
    nextAction: String(row.next_action || ''),
    nextActionAt: normalizeTimestamp(row.next_action_at),
    followUpReason: String(row.follow_up_reason || ''),
    firstSource: String(row.first_source || ''),
    firstMedium: String(row.first_medium || ''),
    firstCampaign: String(row.first_campaign || ''),
    firstLandingPath: String(row.first_landing_path || ''),
    latestSource: String(row.latest_source || ''),
    latestMedium: String(row.latest_medium || ''),
    latestCampaign: String(row.latest_campaign || ''),
    applicationReferrerPath: String(row.application_referrer_path || ''),
    campaignCode: String(row.campaign_code || ''),
    referralCode: String(row.referral_code || ''),
    partnerCode: String(row.partner_code || ''),
    qrCode: String(row.qr_code || ''),
    maxAffiliation: Boolean(row.max_affiliation),
    consultationSlotId: String(row.consultation_slot_id || ''),
    consultationActivityPreference: String(row.consultation_activity_preference || ''),
    source: String(row.source || ''),
    createdAt: normalizeTimestamp(row.created_at),
    updatedAt: normalizeTimestamp(row.updated_at),
  };
}

export async function listDatabaseClients({ limit = 200, offset = 0 } = {}) {
  if (!isDatabaseConfigured()) return [];

  const safeLimit = clampInteger(limit, 200, 1, 1000);
  const safeOffset = clampInteger(offset, 0, 0, 1000000);
  const result = await queryDatabase(
    `SELECT * FROM rp_clients ORDER BY updated_at DESC, created_at DESC LIMIT $1 OFFSET $2`,
    [safeLimit, safeOffset],
  );
  return result.rows.map(mapClientRow).filter(Boolean);
}

function mapConsultationSlotRow(row, { includeBooking = false } = {}) {
  if (!row) return null;

  const slot = {
    id: String(row.id || ''),
    startsAt: normalizeTimestamp(row.starts_at),
    endsAt: normalizeTimestamp(row.ends_at),
    isOpen: Boolean(row.is_open),
  };

  if (!includeBooking) return slot;

  return {
    ...slot,
    createdBy: String(row.created_by || ''),
    bookedClientId: String(row.booked_client_id || ''),
    bookedClientName: String(row.booked_client_name || ''),
    bookedVisitStatus: String(row.booked_visit_status || ''),
    createdAt: normalizeTimestamp(row.created_at),
    updatedAt: normalizeTimestamp(row.updated_at),
  };
}

export async function listPublicDatabaseConsultationSlots({ now = new Date(), limit = 120 } = {}) {
  if (!isDatabaseConfigured()) return [];
  const range = getConsultationAvailabilityRange(now);
  const safeLimit = clampInteger(limit, 120, 1, 240);
  const result = await queryDatabase(
    `SELECT s.id, s.starts_at, s.ends_at, s.is_open
     FROM rp_consultation_slots s
     WHERE s.is_open = TRUE
       AND s.starts_at >= $1
       AND s.starts_at <= $2
       AND NOT EXISTS (
         SELECT 1
         FROM rp_clients c
         WHERE c.consultation_slot_id = s.id
           AND c.visit_status = ANY($3::text[])
       )
     ORDER BY s.starts_at ASC
     LIMIT $4`,
    [range.from, range.to, CONSULTATION_SLOT_BLOCKING_VISIT_STATUSES, safeLimit],
  );

  return result.rows.map((row) => mapConsultationSlotRow(row)).filter(Boolean);
}

export async function getAvailableDatabaseConsultationSlot(slotId, { now = new Date() } = {}) {
  if (!isDatabaseConfigured()) return null;
  const id = normalizeConsultationSlotId(slotId);
  if (!id) return null;
  const range = getConsultationAvailabilityRange(now);
  const result = await queryDatabase(
    `SELECT s.id, s.starts_at, s.ends_at, s.is_open
     FROM rp_consultation_slots s
     WHERE s.id = $1
       AND s.is_open = TRUE
       AND s.starts_at >= $2
       AND s.starts_at <= $3
       AND NOT EXISTS (
         SELECT 1
         FROM rp_clients c
         WHERE c.consultation_slot_id = s.id
           AND c.visit_status = ANY($4::text[])
       )
     LIMIT 1`,
    [id, range.from, range.to, CONSULTATION_SLOT_BLOCKING_VISIT_STATUSES],
  );

  return mapConsultationSlotRow(result.rows[0]);
}

export async function listAdminDatabaseConsultationSlots({ now = new Date(), limit = 240 } = {}) {
  if (!isDatabaseConfigured()) return [];
  const base = now instanceof Date ? now : new Date(now);
  const from = new Date(base.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const to = new Date(base.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();
  const safeLimit = clampInteger(limit, 240, 1, 500);
  const result = await queryDatabase(
    `SELECT
       s.*,
       booking.id AS booked_client_id,
       booking.name AS booked_client_name,
       booking.visit_status AS booked_visit_status
     FROM rp_consultation_slots s
     LEFT JOIN LATERAL (
       SELECT c.id, c.name, c.visit_status
       FROM rp_clients c
       WHERE c.consultation_slot_id = s.id
         AND c.visit_status = ANY($1::text[])
       ORDER BY c.updated_at DESC
       LIMIT 1
     ) booking ON TRUE
     WHERE s.starts_at >= $2
       AND s.starts_at <= $3
     ORDER BY s.starts_at ASC
     LIMIT $4`,
    [CONSULTATION_SLOT_BLOCKING_VISIT_STATUSES, from, to, safeLimit],
  );

  return result.rows.map((row) => mapConsultationSlotRow(row, { includeBooking: true })).filter(Boolean);
}

export async function createDatabaseConsultationSlot(input = {}) {
  if (!isDatabaseConfigured()) throw new Error('DATABASE_URL 또는 RP_DATABASE_URL 환경변수가 필요합니다.');
  const window = normalizeConsultationSlotWindow(input);
  const startsAtMs = new Date(window.startsAt).getTime();
  const nowMs = Date.now();

  if (startsAtMs <= nowMs) throw new Error('지난 시간에는 상담 가능 시간을 열 수 없습니다.');
  if (startsAtMs > nowMs + 180 * 24 * 60 * 60 * 1000) {
    throw new Error('상담 가능 시간은 180일 이내로 등록해 주세요.');
  }

  const result = await queryDatabase(
    `INSERT INTO rp_consultation_slots (id, starts_at, ends_at, is_open, created_by, updated_at)
     VALUES ($1, $2, $3, TRUE, $4, NOW())
     RETURNING *`,
    [buildId('SLOT'), window.startsAt, window.endsAt, cleanEnvValue(input.createdBy).slice(0, 120)],
  );

  return mapConsultationSlotRow(result.rows[0], { includeBooking: true });
}

export async function updateDatabaseConsultationSlotAvailability(slotId, isOpen) {
  if (!isDatabaseConfigured()) throw new Error('DATABASE_URL 또는 RP_DATABASE_URL 환경변수가 필요합니다.');
  const id = normalizeConsultationSlotId(slotId);
  if (!id) throw new Error('상담 가능 시간 ID를 확인해 주세요.');

  const result = await queryDatabase(
    `UPDATE rp_consultation_slots
     SET is_open = $2, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, Boolean(isOpen)],
  );

  if (!result.rows[0]) throw new Error('상담 가능 시간을 찾을 수 없습니다.');
  return mapConsultationSlotRow(result.rows[0], { includeBooking: true });
}

export function isDatabaseConsultationSlotConflict(error) {
  return error?.code === '23505'
    && ['rp_clients_active_consultation_slot_unique_idx', 'rp_consultation_slots_starts_at_unique_idx'].includes(error?.constraint);
}

export function normalizeDatabaseClient(input = {}) {
  const id = cleanEnvValue(input.id || input.clientId || input.memberId || getValue(input, ['회원ID'])) || buildId('RP');
  const name = cleanEnvValue(input.name || input.clientName || input.memberName || getValue(input, ['회원명', '이름']));
  const hasAttribution = Boolean(
    input.attribution
    || input.firstSource
    || input.latestSource
    || input.campaignCode
    || input.referralCode
    || input.partnerCode
    || input.qrCode,
  );
  const attribution = hasAttribution ? normalizeAttribution(input.attribution || input) : null;
  const workflow = normalizeClientWorkflow(input);

  if (!name) throw new Error('고객 이름은 필수입니다.');

  return {
    id,
    name,
    phone: cleanEnvValue(input.phone || getValue(input, ['연락처', '전화번호'])),
    birth: cleanEnvValue(input.birth || getValue(input, ['생년월일'])),
    gender: cleanEnvValue(input.gender || getValue(input, ['성별'])),
    route: cleanEnvValue(input.route || getValue(input, ['유입경로', '방문경로'])) || '관리자 직접 추가',
    memberType: cleanEnvValue(input.memberType || getValue(input, ['회원구분', '구분'])),
    status: cleanEnvValue(input.status || getValue(input, ['회원상태', '상태'])) || '상담 전',
    coachName: cleanEnvValue(input.coachName || input.coach || getValue(input, ['담당코치', '담당자'])) || '정우현',
    parqStatus: cleanEnvValue(input.parqStatus || input.PARQ || getValue(input, ['PAR-Q'])) || '미작성',
    parqYesItems: splitList(input.parqYesItems || getValue(input, ['PAR-Q 예항목'])),
    goal: cleanEnvValue(input.goal || getValue(input, ['목표', '운동목표'])),
    purpose: splitList(input.purpose || input.purposes || getValue(input, ['방문목적', '목적'])),
    painAreas: splitList(input.painAreas || input.painArea || getValue(input, ['불편부위', '통증부위'])),
    painScore: Math.min(10, Math.max(0, toFiniteNumber(input.painScore || getValue(input, ['통증강도'])))),
    concern: cleanEnvValue(input.concern || input.caution || input.memo || getValue(input, ['주의사항', '메모'])),
    totalSessions: Math.max(0, toFiniteNumber(input.totalSessions || getValue(input, ['총회차']))),
    remainingSessions: Math.max(0, toFiniteNumber(input.remainingSessions || getValue(input, ['잔여회차']))),
    ...workflow,
    firstSource: attribution?.firstSource || null,
    firstMedium: attribution?.firstMedium || null,
    firstCampaign: attribution?.firstCampaign || null,
    firstLandingPath: attribution?.firstLandingPath || null,
    latestSource: attribution?.latestSource || null,
    latestMedium: attribution?.latestMedium || null,
    latestCampaign: attribution?.latestCampaign || null,
    applicationReferrerPath: attribution?.applicationReferrerPath || null,
    campaignCode: attribution?.campaignCode || null,
    referralCode: attribution?.referralCode || null,
    partnerCode: attribution?.partnerCode || null,
    qrCode: attribution?.qrCode || null,
    maxAffiliation: Boolean(attribution?.maxAffiliation),
    consultationSlotId: normalizeConsultationSlotId(input.consultationSlotId) || null,
    consultationActivityPreference: normalizeConsultationActivityPreference(input.consultationActivityPreference) || null,
    source: cleanEnvValue(input.source) || 'reperformance-database',
  };
}

export async function saveDatabaseClient(input) {
  if (!isDatabaseConfigured()) throw new Error('DATABASE_URL 또는 RP_DATABASE_URL 환경변수가 필요합니다.');
  const client = normalizeDatabaseClient(input);

  const result = await queryDatabase(
    `INSERT INTO rp_clients (
      id, name, phone, birth, gender, route, member_type, status, coach_name, parq_status,
      parq_yes_items, goal, purpose, pain_areas, pain_score, concern, total_sessions,
      remaining_sessions, source, contact_status, visit_status, scheduled_visit_at, last_contacted_at,
      next_action, next_action_at, follow_up_reason, first_source, first_medium, first_campaign,
      first_landing_path, latest_source, latest_medium, latest_campaign, application_referrer_path,
      campaign_code, referral_code, partner_code, qr_code, max_affiliation,
      consultation_slot_id, consultation_activity_preference, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11::jsonb, $12, $13::jsonb, $14::jsonb, $15, $16, $17, $18, $19, $20,
      $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
      $31, $32, $33, $34, $35, $36, $37, $38, $39,
      $40, $41, NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      phone = EXCLUDED.phone,
      birth = EXCLUDED.birth,
      gender = EXCLUDED.gender,
      route = EXCLUDED.route,
      member_type = EXCLUDED.member_type,
      status = EXCLUDED.status,
      coach_name = EXCLUDED.coach_name,
      parq_status = EXCLUDED.parq_status,
      parq_yes_items = EXCLUDED.parq_yes_items,
      goal = EXCLUDED.goal,
      purpose = EXCLUDED.purpose,
      pain_areas = EXCLUDED.pain_areas,
      pain_score = EXCLUDED.pain_score,
      concern = EXCLUDED.concern,
      total_sessions = EXCLUDED.total_sessions,
      remaining_sessions = EXCLUDED.remaining_sessions,
      source = EXCLUDED.source,
      contact_status = EXCLUDED.contact_status,
      visit_status = EXCLUDED.visit_status,
      scheduled_visit_at = EXCLUDED.scheduled_visit_at,
      last_contacted_at = COALESCE(EXCLUDED.last_contacted_at, rp_clients.last_contacted_at),
      next_action = EXCLUDED.next_action,
      next_action_at = EXCLUDED.next_action_at,
      follow_up_reason = EXCLUDED.follow_up_reason,
      first_source = COALESCE(rp_clients.first_source, EXCLUDED.first_source),
      first_medium = COALESCE(rp_clients.first_medium, EXCLUDED.first_medium),
      first_campaign = COALESCE(rp_clients.first_campaign, EXCLUDED.first_campaign),
      first_landing_path = COALESCE(rp_clients.first_landing_path, EXCLUDED.first_landing_path),
      latest_source = COALESCE(EXCLUDED.latest_source, rp_clients.latest_source),
      latest_medium = COALESCE(EXCLUDED.latest_medium, rp_clients.latest_medium),
      latest_campaign = COALESCE(EXCLUDED.latest_campaign, rp_clients.latest_campaign),
      application_referrer_path = COALESCE(EXCLUDED.application_referrer_path, rp_clients.application_referrer_path),
      campaign_code = COALESCE(EXCLUDED.campaign_code, rp_clients.campaign_code),
      referral_code = COALESCE(EXCLUDED.referral_code, rp_clients.referral_code),
      partner_code = COALESCE(EXCLUDED.partner_code, rp_clients.partner_code),
      qr_code = COALESCE(EXCLUDED.qr_code, rp_clients.qr_code),
      max_affiliation = CASE WHEN EXCLUDED.first_source IS NULL THEN rp_clients.max_affiliation ELSE EXCLUDED.max_affiliation END,
      consultation_slot_id = EXCLUDED.consultation_slot_id,
      consultation_activity_preference = EXCLUDED.consultation_activity_preference,
      updated_at = NOW()
    RETURNING *`,
    [
      client.id,
      client.name,
      client.phone,
      client.birth,
      client.gender,
      client.route,
      client.memberType,
      client.status,
      client.coachName,
      client.parqStatus,
      JSON.stringify(client.parqYesItems),
      client.goal,
      JSON.stringify(client.purpose),
      JSON.stringify(client.painAreas),
      client.painScore,
      client.concern,
      client.totalSessions,
      client.remainingSessions,
      client.source,
      client.contactStatus,
      client.visitStatus,
      client.scheduledVisitAt,
      null,
      client.nextAction,
      client.nextActionAt,
      client.followUpReason,
      client.firstSource,
      client.firstMedium,
      client.firstCampaign,
      client.firstLandingPath,
      client.latestSource,
      client.latestMedium,
      client.latestCampaign,
      client.applicationReferrerPath,
      client.campaignCode,
      client.referralCode,
      client.partnerCode,
      client.qrCode,
      client.maxAffiliation,
      client.consultationSlotId,
      client.consultationActivityPreference,
    ],
  );

  return { ok: true, action: 'database', client: mapClientRow(result.rows[0]), record: client };
}

export async function updateDatabaseClientWorkflow(clientId, input = {}) {
  if (!isDatabaseConfigured()) throw new Error('DATABASE_URL 또는 RP_DATABASE_URL 환경변수가 필요합니다.');
  const id = cleanEnvValue(clientId);
  if (!id) throw new Error('고객 ID가 필요합니다.');

  const workflow = normalizeClientWorkflow(input);
  const result = await queryDatabase(
    `UPDATE rp_clients
     SET contact_status = $2,
         visit_status = $3,
         scheduled_visit_at = $4,
         consultation_slot_id = CASE
           WHEN consultation_slot_id IS NULL OR $4 IS NULL THEN NULL
           WHEN EXISTS (
             SELECT 1
             FROM rp_consultation_slots slot
             WHERE slot.id = consultation_slot_id
               AND slot.starts_at = $4
           ) THEN consultation_slot_id
           ELSE NULL
         END,
         last_contacted_at = CASE
           WHEN $2 = '연락 완료' AND contact_status <> '연락 완료' THEN NOW()
           ELSE last_contacted_at
         END,
         next_action = $5,
         next_action_at = $6,
         follow_up_reason = $7,
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      id,
      workflow.contactStatus,
      workflow.visitStatus,
      workflow.scheduledVisitAt,
      workflow.nextAction,
      workflow.nextActionAt,
      workflow.followUpReason,
    ],
  );

  if (!result.rows[0]) throw new Error('고객을 찾을 수 없습니다.');
  return { ok: true, action: 'database-workflow-update', client: mapClientRow(result.rows[0]) };
}

export async function recordDatabaseConversionEvent(input = {}) {
  if (!isDatabaseConfigured()) return { ok: false, skipped: true };
  const event = normalizeConversionEvent(input);
  if (!event) throw new Error('유효하지 않은 전환 이벤트입니다.');

  await queryDatabase(
    `INSERT INTO rp_conversion_events (
      id, anonymous_session_id, event_name, page_path, service_key, application_id,
      first_source, first_medium, first_campaign, first_landing_path,
      latest_source, latest_medium, latest_campaign, utm_content,
      campaign_code, referral_code, partner_code, qr_code, referrer_host, max_affiliation
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10,
      $11, $12, $13, $14,
      $15, $16, $17, $18, $19, $20
    )`,
    [
      event.id || buildId('EVT'),
      event.sessionId,
      event.eventName,
      event.pagePath,
      event.serviceKey || null,
      event.applicationId || null,
      event.firstSource,
      event.firstMedium,
      event.firstCampaign || null,
      event.firstLandingPath,
      event.latestSource,
      event.latestMedium,
      event.latestCampaign || null,
      event.utmContent || null,
      event.campaignCode || null,
      event.referralCode || null,
      event.partnerCode || null,
      event.qrCode || null,
      event.referrerHost || null,
      event.maxAffiliation,
    ],
  );

  return { ok: true };
}

function normalizePeExamQuestion(input = {}) {
  const username = cleanEnvValue(input.username || input.userId || input.memberId);
  const questionText = cleanEnvValue(input.questionText || input.question || input.message);

  if (!username) throw new Error('로그인 계정 정보가 필요합니다.');
  if (!questionText) throw new Error('질문 내용을 입력해주세요.');

  return {
    id: cleanEnvValue(input.id) || buildId('PEQ'),
    username,
    memberName: cleanEnvValue(input.memberName || input.name),
    role: normalizeRole(input.role),
    questionType: cleanEnvValue(input.questionType) || '기타',
    admissionTrack: cleanEnvValue(input.admissionTrack) || '공통',
    targetUniversity: cleanEnvValue(input.targetUniversity),
    questionText,
    answerStatus: cleanEnvValue(input.answerStatus) || '접수',
    source: cleanEnvValue(input.source) || 'pe-exam-faq',
  };
}

function buildMinimizedPeExamQuestionPayload(question) {
  return {
    retention: 'minimized_on_write',
    kind: 'pe_exam_question',
    schemaVersion: 2,
    questionId: question.id,
    source: question.source,
    answerStatus: question.answerStatus,
    questionType: question.questionType,
    admissionTrack: question.admissionTrack,
    target: {
      hasUniversity: Boolean(question.targetUniversity),
    },
    fieldLengths: {
      targetUniversity: question.targetUniversity.length,
      questionText: question.questionText.length,
    },
    savedAt: new Date().toISOString(),
  };
}

export async function savePeExamQuestion(input) {
  if (!isDatabaseConfigured()) throw new Error('DATABASE_URL 또는 RP_DATABASE_URL 환경변수가 필요합니다.');
  const question = normalizePeExamQuestion(input);
  const storedPayload = buildMinimizedPeExamQuestionPayload(question);

  const result = await queryDatabase(
    `INSERT INTO rp_pe_exam_questions (
      id, username, member_name, role, question_type, admission_track, target_university,
      question_text, answer_status, source, payload, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7,
      $8, $9, $10, $11::jsonb, NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      username = EXCLUDED.username,
      member_name = EXCLUDED.member_name,
      role = EXCLUDED.role,
      question_type = EXCLUDED.question_type,
      admission_track = EXCLUDED.admission_track,
      target_university = EXCLUDED.target_university,
      question_text = EXCLUDED.question_text,
      answer_status = EXCLUDED.answer_status,
      source = EXCLUDED.source,
      payload = EXCLUDED.payload,
      updated_at = NOW()
    RETURNING *`,
    [
      question.id,
      question.username,
      question.memberName,
      question.role,
      question.questionType,
      question.admissionTrack,
      question.targetUniversity,
      question.questionText,
      question.answerStatus,
      question.source,
      JSON.stringify(storedPayload),
    ],
  );

  return { ok: true, action: 'database', question: result.rows[0], record: question };
}

function normalizePeExamAiConsultRequest(input = {}) {
  const username = cleanEnvValue(input.username || input.userId || input.memberId);
  const targetUniversity = cleanEnvValue(input.targetUniversity);
  const practicalRecords = cleanEnvValue(input.practicalRecords);
  const questionFocus = cleanEnvValue(input.questionFocus || input.questionText || input.message);

  if (!username) throw new Error('로그인 계정 정보가 필요합니다.');
  if (!targetUniversity && !practicalRecords && !questionFocus) {
    throw new Error('희망 대학, 실기 기록, 상담 목표 중 하나 이상을 입력해주세요.');
  }

  return {
    id: cleanEnvValue(input.id) || buildId('PEAI'),
    username,
    memberName: cleanEnvValue(input.memberName || input.name),
    role: normalizeRole(input.role),
    gradeLevel: cleanEnvValue(input.gradeLevel),
    admissionTrack: cleanEnvValue(input.admissionTrack) || '공통',
    targetUniversity,
    targetUniversityId: cleanEnvValue(input.targetUniversityId),
    targetUniversityRegion: cleanEnvValue(input.targetUniversityRegion),
    targetUniversityArea: cleanEnvValue(input.targetUniversityArea),
    targetUniversitySchoolType: cleanEnvValue(input.targetUniversitySchoolType),
    targetUniversitySlug: cleanEnvValue(input.targetUniversitySlug),
    targetUniversityHref: cleanEnvValue(input.targetUniversityHref),
    targetDepartment: cleanEnvValue(input.targetDepartment),
    schoolGrade: cleanEnvValue(input.schoolGrade),
    mockExam: cleanEnvValue(input.mockExam),
    practicalRecords,
    trainingContext: cleanEnvValue(input.trainingContext),
    injuryNote: cleanEnvValue(input.injuryNote),
    questionFocus,
    aiStatus: cleanEnvValue(input.aiStatus) || '검토 예정',
    source: cleanEnvValue(input.source) || 'pe-exam-ai-consult',
    consultationSummary: normalizeJsonObject(input.consultationSummary || input.guidance),
    conversationRecord: normalizeJsonObject(input.conversationRecord),
  };
}

function buildMinimizedPeExamAiConsultPayload(request) {
  const summary = normalizeJsonObject(request.consultationSummary);

  return {
    retention: 'minimized_on_write',
    kind: 'pe_exam_ai_consult',
    schemaVersion: 2,
    consultId: request.id,
    source: request.source,
    aiStatus: request.aiStatus,
    admissionTrack: request.admissionTrack,
    target: {
      hasUniversity: Boolean(request.targetUniversity),
      hasDepartment: Boolean(request.targetDepartment),
      universityId: request.targetUniversityId || null,
      universityRegion: request.targetUniversityRegion || null,
      universitySchoolType: request.targetUniversitySchoolType || null,
      universitySlug: request.targetUniversitySlug || null,
    },
    fieldLengths: {
      targetUniversity: request.targetUniversity.length,
      targetDepartment: request.targetDepartment.length,
      schoolGrade: request.schoolGrade.length,
      mockExam: request.mockExam.length,
      practicalRecords: request.practicalRecords.length,
      trainingContext: request.trainingContext.length,
      injuryNote: request.injuryNote.length,
      questionFocus: request.questionFocus.length,
    },
    summary: {
      hasSummary: Boolean(summary.summary),
      cardCount: Array.isArray(summary.cards) ? summary.cards.length : 0,
      nextStepCount: Array.isArray(summary.nextSteps) ? summary.nextSteps.length : 0,
    },
    savedAt: new Date().toISOString(),
  };
}

function buildMinimizedPeExamAiConversationRecord(request) {
  const summary = normalizeJsonObject(request.consultationSummary);

  return {
    retention: 'minimized_on_write',
    kind: 'pe_exam_ai_conversation',
    schemaVersion: 2,
    consultId: request.id,
    source: request.source,
    studentInput: {
      hasTargetUniversity: Boolean(request.targetUniversity),
      hasSchoolGrade: Boolean(request.schoolGrade),
      hasMockExam: Boolean(request.mockExam),
      hasPracticalRecords: Boolean(request.practicalRecords),
      hasTrainingContext: Boolean(request.trainingContext),
      hasInjuryNote: Boolean(request.injuryNote),
      hasQuestionFocus: Boolean(request.questionFocus),
    },
    assistantOutput: {
      hasSummary: Boolean(summary.summary),
      cardCount: Array.isArray(summary.cards) ? summary.cards.length : 0,
      nextStepCount: Array.isArray(summary.nextSteps) ? summary.nextSteps.length : 0,
    },
    savedAt: new Date().toISOString(),
  };
}

export async function savePeExamAiConsultRequest(input) {
  if (!isDatabaseConfigured()) throw new Error('DATABASE_URL 또는 RP_DATABASE_URL 환경변수가 필요합니다.');
  const request = normalizePeExamAiConsultRequest(input);
  const storedPayload = buildMinimizedPeExamAiConsultPayload(request);
  const storedConversationRecord = buildMinimizedPeExamAiConversationRecord(request);

  const result = await queryDatabase(
    `INSERT INTO rp_pe_exam_ai_consults (
      id, username, member_name, role, grade_level, admission_track,
      target_university, target_university_id, target_university_region, target_university_area,
      target_university_school_type, target_university_slug, target_university_href,
      target_department, school_grade, mock_exam,
      practical_records, training_context, injury_note, question_focus,
      ai_status, source, consultation_summary, conversation_record, payload, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10,
      $11, $12, $13,
      $14, $15, $16,
      $17, $18, $19, $20,
      $21, $22, $23::jsonb, $24::jsonb, $25::jsonb, NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      username = EXCLUDED.username,
      member_name = EXCLUDED.member_name,
      role = EXCLUDED.role,
      grade_level = EXCLUDED.grade_level,
      admission_track = EXCLUDED.admission_track,
      target_university = EXCLUDED.target_university,
      target_university_id = EXCLUDED.target_university_id,
      target_university_region = EXCLUDED.target_university_region,
      target_university_area = EXCLUDED.target_university_area,
      target_university_school_type = EXCLUDED.target_university_school_type,
      target_university_slug = EXCLUDED.target_university_slug,
      target_university_href = EXCLUDED.target_university_href,
      target_department = EXCLUDED.target_department,
      school_grade = EXCLUDED.school_grade,
      mock_exam = EXCLUDED.mock_exam,
      practical_records = EXCLUDED.practical_records,
      training_context = EXCLUDED.training_context,
      injury_note = EXCLUDED.injury_note,
      question_focus = EXCLUDED.question_focus,
      ai_status = EXCLUDED.ai_status,
      source = EXCLUDED.source,
      consultation_summary = EXCLUDED.consultation_summary,
      conversation_record = EXCLUDED.conversation_record,
      payload = EXCLUDED.payload,
      updated_at = NOW()
    RETURNING *`,
    [
      request.id,
      request.username,
      request.memberName,
      request.role,
      request.gradeLevel,
      request.admissionTrack,
      request.targetUniversity,
      request.targetUniversityId,
      request.targetUniversityRegion,
      request.targetUniversityArea,
      request.targetUniversitySchoolType,
      request.targetUniversitySlug,
      request.targetUniversityHref,
      request.targetDepartment,
      request.schoolGrade,
      request.mockExam,
      request.practicalRecords,
      request.trainingContext,
      request.injuryNote,
      request.questionFocus,
      request.aiStatus,
      request.source,
      JSON.stringify(request.consultationSummary),
      JSON.stringify(storedConversationRecord),
      JSON.stringify(storedPayload),
    ],
  );

  return { ok: true, action: 'database', request: result.rows[0], record: request };
}

function mapPeExamAiConsultRow(row) {
  if (!row) return null;

  const payload = normalizeJsonObject(row.payload);
  const consultationSummary = normalizeJsonObject(row.consultation_summary || payload.consultationSummary || payload.guidance);
  const conversationRecord = normalizeJsonObject(row.conversation_record || payload.conversationRecord);

  return {
    id: String(row.id || ''),
    username: String(row.username || ''),
    memberName: String(row.member_name || ''),
    role: String(row.role || ''),
    gradeLevel: String(row.grade_level || ''),
    admissionTrack: String(row.admission_track || ''),
    targetUniversity: String(row.target_university || ''),
    targetUniversityId: String(row.target_university_id || ''),
    targetUniversityRegion: String(row.target_university_region || ''),
    targetUniversityArea: String(row.target_university_area || ''),
    targetUniversitySchoolType: String(row.target_university_school_type || ''),
    targetUniversitySlug: String(row.target_university_slug || ''),
    targetUniversityHref: String(row.target_university_href || ''),
    targetDepartment: String(row.target_department || ''),
    schoolGrade: String(row.school_grade || ''),
    mockExam: String(row.mock_exam || ''),
    practicalRecords: String(row.practical_records || ''),
    trainingContext: String(row.training_context || ''),
    injuryNote: String(row.injury_note || ''),
    questionFocus: String(row.question_focus || ''),
    aiStatus: String(row.ai_status || ''),
    source: String(row.source || ''),
    consultationSummary,
    conversationRecord,
    payload,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : '',
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : '',
  };
}

export async function listPeExamAiConsultRequests({ limit = 30, username = '' } = {}) {
  if (!isDatabaseConfigured()) return [];

  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 30));
  const trimmedUsername = cleanEnvValue(username);
  const params = trimmedUsername ? [trimmedUsername, safeLimit] : [safeLimit];
  const where = trimmedUsername ? 'WHERE username = $1' : '';
  const limitParam = trimmedUsername ? '$2' : '$1';
  const result = await queryDatabase(
    `SELECT * FROM rp_pe_exam_ai_consults
     ${where}
     ORDER BY created_at DESC
     LIMIT ${limitParam}`,
    params,
  );

  return result.rows.map(mapPeExamAiConsultRow).filter(Boolean);
}

export async function saveDatabaseConsultation(record = {}) {
  if (!isDatabaseConfigured()) throw new Error('DATABASE_URL 또는 RP_DATABASE_URL 환경변수가 필요합니다.');

  const clientId = cleanEnvValue(record.clientId || record.memberId || record.id);
  const clientName = cleanEnvValue(record.clientName || record.memberName || record.name);
  const consultationDate = cleanEnvValue(record.consultationDate) || new Date().toISOString().slice(0, 10);
  const consultationStatus = cleanEnvValue(record.consultationStatus) || '상담 대기';

  await queryDatabase(
    `INSERT INTO rp_consultations (client_id, client_name, consultation_date, consultation_status, record, saved_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, NOW())`,
    [clientId, clientName, consultationDate, consultationStatus, JSON.stringify(record)],
  );

  if (clientId && clientName) {
    await queryDatabase(
      `UPDATE rp_clients
       SET status = COALESCE(NULLIF($2, ''), status),
           goal = COALESCE(NULLIF($3, ''), goal),
           pain_score = COALESCE($4, pain_score),
           updated_at = NOW()
       WHERE id = $1`,
      [clientId, consultationStatus, cleanEnvValue(record.memberGoal), Number(record.painScore) || null],
    );
  }

  return { ok: true, action: 'database' };
}
