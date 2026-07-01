import { safeEqual } from './rpSecurity';

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
  return cleanEnvValue(process.env.RP_PASSWORD_HASH_SECRET || process.env.RP_ADMIN_SESSION_SECRET || process.env.RP_API_SECRET);
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

  const status = normalizeStatus(account.status || account.account_status);
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

      return new Pool({
        connectionString: databaseUrl,
        max: Number(process.env.RP_DATABASE_POOL_MAX) || 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
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

async function queryDatabase(sql, params = []) {
  const pool = await getPool();
  if (!pool) throw new Error('DATABASE_URL 또는 RP_DATABASE_URL 환경변수가 필요합니다.');
  await ensureDatabaseSchema();
  return pool.query(sql, params);
}

let schemaPromise;
export async function ensureDatabaseSchema() {
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
    await pool.query('CREATE INDEX IF NOT EXISTS rp_consultations_client_id_idx ON rp_consultations (client_id)');
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

export async function listDatabaseAuthAccounts({ limit = 200 } = {}) {
  if (!isDatabaseConfigured()) return [];

  const usageDate = getKstDateKey();
  const safeLimit = Math.min(500, Math.max(1, Number(limit) || 200));
  const result = await queryDatabase(
    `SELECT
        account.*,
        COALESCE((
          SELECT SUM(usage.request_count)
          FROM rp_ai_usage_buckets usage
          WHERE usage.subject_key = account.username_key
            AND usage.usage_date = $1::date
        ), 0)::int AS ai_usage_today
      FROM rp_auth_accounts account
      ORDER BY account.created_at DESC
      LIMIT $2`,
    [usageDate, safeLimit],
  );

  return result.rows.map(mapAuthAccountAccessRow).filter(Boolean);
}

export async function updateDatabaseAuthAccountAiApproval(username, approved, actor = '') {
  if (!isDatabaseConfigured()) throw new Error('DATABASE_URL or RP_DATABASE_URL is required.');

  const normalizedUsername = cleanEnvValue(username).toLowerCase();
  if (!normalizedUsername) throw new Error('Username is required.');

  const result = await queryDatabase(
    `UPDATE rp_auth_accounts
      SET ai_approved = $2,
          ai_approved_at = CASE WHEN $2 THEN NOW() ELSE NULL END,
          ai_approved_by = CASE WHEN $2 THEN NULLIF($3, '') ELSE NULL END,
          updated_at = NOW()
      WHERE username_key = $1
      RETURNING *`,
    [normalizedUsername, Boolean(approved), cleanEnvValue(actor)],
  );

  return mapAuthAccountAccessRow(result.rows[0]);
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
  const maxRequests = Math.max(1, Math.floor(Number(limit) || 1));
  const safeTokenEstimate = Math.max(0, Math.floor(Number(tokenEstimate) || 0));

  if (!subjectKey) throw new Error('AI usage subject is required.');
  if (!normalizedRouteKey) throw new Error('AI usage route is required.');

  const result = await queryDatabase(
    `INSERT INTO rp_ai_usage_buckets (
        subject_key,
        route_key,
        usage_date,
        request_count,
        token_estimate,
        updated_at
      )
      VALUES ($1, $2, $3::date, 1, $5, NOW())
      ON CONFLICT (subject_key, route_key, usage_date)
      DO UPDATE SET
        request_count = rp_ai_usage_buckets.request_count + 1,
        token_estimate = rp_ai_usage_buckets.token_estimate + EXCLUDED.token_estimate,
        updated_at = NOW()
      WHERE rp_ai_usage_buckets.request_count < $4
      RETURNING request_count, token_estimate`,
    [subjectKey, normalizedRouteKey, usageDate, maxRequests, safeTokenEstimate],
  );

  const row = result.rows[0];
  if (row) {
    return {
      allowed: true,
      count: Number(row.request_count || 0),
      tokenEstimate: Number(row.token_estimate || 0),
      limit: maxRequests,
      usageDate,
      remaining: Math.max(0, maxRequests - Number(row.request_count || 0)),
    };
  }

  const current = await queryDatabase(
    `SELECT request_count, token_estimate
     FROM rp_ai_usage_buckets
     WHERE subject_key = $1
       AND route_key = $2
       AND usage_date = $3::date
     LIMIT 1`,
    [subjectKey, normalizedRouteKey, usageDate],
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
          updated_at = NOW()
      WHERE username_key = $1
        AND password_plain = $3
      RETURNING *`,
    [account.username_key, passwordHash, account.password_plain],
  );

  return result.rows[0] || { ...account, password_hash: passwordHash, password_plain: null };
}

export async function findDatabaseAuthAccount(username, password) {
  if (!isDatabaseConfigured()) return null;

  const normalizedUsername = cleanEnvValue(username).toLowerCase();
  const normalizedPassword = cleanEnvValue(password);
  if (!normalizedUsername || !normalizedPassword) return null;

  const result = await queryDatabase(
    `SELECT * FROM rp_auth_accounts WHERE username_key = $1 LIMIT 1`,
    [normalizedUsername],
  );
  const account = result.rows[0];

  if (!account || !isApprovedAccount(account)) return null;

  if (account.password_hash) {
    const attemptedHash = await hashDatabasePassword(normalizedPassword).catch(() => '');
    if (safeEqual(attemptedHash, account.password_hash)) return sanitizeAccount(account);
  }

  if (safeEqual(account.password_plain, normalizedPassword)) {
    const migratedAccount = await migratePlainDatabasePassword(account, normalizedPassword).catch(() => account);
    return sanitizeAccount(migratedAccount);
  }

  return null;
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
          updated_at = NOW()
      WHERE username_key = $1
      RETURNING *`,
    [normalizedUsername, passwordHash],
  );
  const account = result.rows[0];
  if (!account || !isApprovedAccount(account)) return null;
  return sanitizeAccount(account);
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

export async function saveDatabaseAuthSignup(record) {
  if (!isDatabaseConfigured()) throw new Error('DATABASE_URL 또는 RP_DATABASE_URL 환경변수가 필요합니다.');

  const passwordHash = record.passwordHash || await hashDatabasePassword(record.password);
  const account = buildSignupPayload({ ...record, passwordHash });

  if (!account.username || !account.name || !account.verifiedContact) {
    throw new Error('이름, 아이디, 연락처는 필수입니다.');
  }

  const result = await queryDatabase(
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

  if (!result.rows[0]) throw new Error('이미 사용 중인 아이디입니다.');

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
  };
}

export async function listDatabaseClients() {
  if (!isDatabaseConfigured()) return [];

  const result = await queryDatabase(
    `SELECT * FROM rp_clients ORDER BY updated_at DESC, created_at DESC`,
  );
  return result.rows.map(mapClientRow).filter(Boolean);
}

export function normalizeDatabaseClient(input = {}) {
  const id = cleanEnvValue(input.id || input.clientId || input.memberId || getValue(input, ['회원ID'])) || buildId('RP');
  const name = cleanEnvValue(input.name || input.clientName || input.memberName || getValue(input, ['회원명', '이름']));

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
      remaining_sessions, source, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11::jsonb, $12, $13::jsonb, $14::jsonb, $15, $16, $17, $18, $19, NOW()
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
    ],
  );

  return { ok: true, action: 'database', client: mapClientRow(result.rows[0]), record: client };
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

export async function savePeExamQuestion(input) {
  if (!isDatabaseConfigured()) throw new Error('DATABASE_URL 또는 RP_DATABASE_URL 환경변수가 필요합니다.');
  const question = normalizePeExamQuestion(input);

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
      JSON.stringify({ ...question, ...input, savedAt: new Date().toISOString() }),
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

export async function savePeExamAiConsultRequest(input) {
  if (!isDatabaseConfigured()) throw new Error('DATABASE_URL 또는 RP_DATABASE_URL 환경변수가 필요합니다.');
  const request = normalizePeExamAiConsultRequest(input);

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
      JSON.stringify(request.conversationRecord),
      JSON.stringify({ ...request, ...input, savedAt: new Date().toISOString() }),
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
