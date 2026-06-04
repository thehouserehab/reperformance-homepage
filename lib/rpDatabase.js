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

  if ((text.startsWith('\'') && text.endsWith('\'')) || (text.startsWith(quote) && text.endsWith(quote))) {
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

      if (!Pool) throw new Error('PostgreSQL Pool을 불러올 수 없습니다. pg 패키지 설치를 확인해 주세요.');

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
        role TEXT NOT NULL DEFAULT 'member',
        role_label TEXT,
        status TEXT,
        account_status TEXT,
        approved BOOLEAN NOT NULL DEFAULT FALSE,
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

    await pool.query('CREATE INDEX IF NOT EXISTS rp_clients_name_idx ON rp_clients (name)');
    await pool.query('CREATE INDEX IF NOT EXISTS rp_consultations_client_id_idx ON rp_consultations (client_id)');
  })();

  try {
    await schemaPromise;
  } catch (error) {
    schemaPromise = null;
    throw error;
  }

  return schemaPromise;
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
  };
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
    if (attemptedHash && attemptedHash === account.password_hash) return sanitizeAccount(account);
  }

  if (account.password_plain && account.password_plain === normalizedPassword) return sanitizeAccount(account);

  return null;
}

function buildSignupPayload(record) {
  const role = normalizeRole(record.requestedRole || record.role);
  const requestedAt = record.requestedAt || new Date().toISOString();
  const activeMember = role === 'member';
  const username = cleanEnvValue(record.username);

  return {
    id: record.id || buildId('AUTH'),
    username,
    usernameKey: username.toLowerCase(),
    passwordHash: record.passwordHash,
    name: cleanEnvValue(record.name),
    phone: cleanEnvValue(record.phone),
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

  if (!account.username || !account.name || !account.phone) {
    throw new Error('이름, 아이디, 연락처는 필수입니다.');
  }

  await queryDatabase(
    `INSERT INTO rp_auth_accounts (
      id, username, username_key, password_hash, name, phone, role, role_label, status,
      account_status, approved, requested_at, approved_at, message, source, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
    ON CONFLICT (username_key) DO UPDATE SET
      username = EXCLUDED.username,
      password_hash = EXCLUDED.password_hash,
      name = EXCLUDED.name,
      phone = EXCLUDED.phone,
      role = EXCLUDED.role,
      role_label = EXCLUDED.role_label,
      status = EXCLUDED.status,
      account_status = EXCLUDED.account_status,
      approved = EXCLUDED.approved,
      approved_at = EXCLUDED.approved_at,
      message = EXCLUDED.message,
      source = EXCLUDED.source,
      updated_at = NOW()`,
    [
      account.id,
      account.username,
      account.usernameKey,
      account.passwordHash,
      account.name,
      account.phone,
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

  return { ok: true, action: 'database', account: sanitizeAccount(account), autoApproved: account.approved };
}

function normalizeJsonArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return splitList(value);
  return [];
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

export async function saveDatabaseConsultation(record = {}) {
  if (!isDatabaseConfigured()) throw new Error('DATABASE_URL 또는 RP_DATABASE_URL 환경변수가 필요합니다.');

  const clientId = cleanEnvValue(record.clientId || record.memberId || record.id);
  const clientName = cleanEnvValue(record.clientName || record.memberName || record.name);
  const consultationDate = cleanEnvValue(record.consultationDate) || new Date().toISOString().slice(0, 10);
  const consultationStatus = cleanEnvValue(record.consultationStatus) || '상담 저장';

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
