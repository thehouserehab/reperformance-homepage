import { shouldSendGoogleDriveSecretInQuery } from './rpGoogleDriveBackup';
import { fetchWithTimeout } from './rpOutboundFetch.js';
import { getSafeLogErrorDetail } from './rpPublicErrors.js';
import { assertStrongProductionSecret, safeEqual } from './rpSecurity.js';

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

const INACTIVE_STATUS_VALUES = new Set([
  'pending',
  'pendingapproval',
  'review',
  'disabled',
  'false',
  '0',
  '승인대기',
  '대기',
  '심사중',
  '미승인',
  '비활성',
]);

const ROLE_LABELS = {
  owner: '대표 관리자',
  admin: '관리자',
  trainer: '트레이너',
  member: '회원',
};

function cleanEnvValue(value) {
  return String(value || '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .trim();
}

function extractUrl(value) {
  const cleaned = cleanEnvValue(value);
  const match = cleaned.match(/https?:\/\/[^\s'"]+/);
  return match ? match[0] : cleaned;
}

function getAuthWebAppUrl() {
  return extractUrl(process.env.RP_AUTH_WEBAPP_URL || process.env.RP_SIGNUP_WEBAPP_URL || process.env.RP_SHEETS_WEBAPP_URL);
}

function getApiSecret() {
  return cleanEnvValue(process.env.RP_API_SECRET);
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
  if (method === 'email') return 'email';
  if (method === 'kakao' || method === 'kakaotalk' || method === '카카오' || method === '카카오톡') return 'kakao';
  return 'phone';
}

function normalizeIdentityContact(method, value) {
  const normalizedMethod = normalizeIdentityMethod(method);
  if (normalizedMethod === 'phone') return normalizePhone(value);
  if (normalizedMethod === 'email') return normalizeEmail(value);
  return cleanEnvValue(value).toLowerCase();
}

export function normalizeSheetRole(role) {
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

export function getSheetRoleLabel(role) {
  return ROLE_LABELS[normalizeSheetRole(role)] || ROLE_LABELS.member;
}

function normalizeStatus(value) {
  return normalizeToken(value);
}

function normalizeKey(key) {
  return String(key || '').replace(/\s+/g, '').trim();
}

function getValue(record, candidates) {
  if (!record) return '';

  for (const candidate of candidates) {
    if (record[candidate] !== undefined && record[candidate] !== null && record[candidate] !== '') return record[candidate];
  }

  const normalizedRecord = Object.fromEntries(Object.entries(record).map(([key, value]) => [normalizeKey(key), value]));

  for (const candidate of candidates) {
    const normalized = normalizeKey(candidate);
    if (normalizedRecord[normalized] !== undefined && normalizedRecord[normalized] !== null && normalizedRecord[normalized] !== '') return normalizedRecord[normalized];
  }

  return '';
}

function rowsToObjects(rows) {
  if (!Array.isArray(rows) || !Array.isArray(rows[0])) return [];

  const headerIndex = rows.findIndex((row) => row.some((cell) => normalizeKey(cell)));
  if (headerIndex === -1) return [];

  const headers = rows[headerIndex];
  return rows.slice(headerIndex + 1).map((row) => {
    const record = {};
    headers.forEach((header, index) => {
      if (header) record[header] = row[index] || '';
    });
    return record;
  });
}

function parseApproval(value) {
  if (value === true) return true;
  if (value === false) return false;
  const normalized = normalizeStatus(value);
  if (!normalized) return null;
  if (ACTIVE_STATUS_VALUES.has(normalized) || ['yes', 'y'].includes(normalized)) return true;
  if (INACTIVE_STATUS_VALUES.has(normalized) || ['no', 'n'].includes(normalized)) return false;
  return null;
}

function normalizeAccount(record, index = 0) {
  const username = cleanEnvValue(getValue(record, [
    'username',
    'email',
    'id',
    'accountId',
    'loginId',
    '아이디',
    '이메일',
    '계정',
    '계정ID',
    '로그인ID',
  ]));

  if (!username) return null;

  const role = normalizeSheetRole(getValue(record, [
    'role',
    'requestedRole',
    'permission',
    'type',
    '역할',
    '권한',
    '신청역할',
  ]));

  return {
    id: cleanEnvValue(getValue(record, ['id', 'accountId', '계정ID'])) || `AUTH-${String(index + 1).padStart(4, '0')}`,
    username,
    password: cleanEnvValue(getValue(record, ['password', 'plainPassword', '비밀번호'])),
    passwordHash: cleanEnvValue(getValue(record, ['passwordHash', 'password_hash', 'passwordDigest', '비밀번호해시'])),
    name: cleanEnvValue(getValue(record, ['name', 'displayName', '이름', '회원명'])) || username,
    phone: cleanEnvValue(getValue(record, ['phone', 'tel', '연락처', '전화번호'])),
    email: cleanEnvValue(getValue(record, ['email', 'mail', '이메일'])) || (username.includes('@') ? username : ''),
    kakaoId: cleanEnvValue(getValue(record, ['kakaoId', 'kakao', 'kakaoTalkId', '카카오톡ID', '카카오ID'])),
    verificationMethod: cleanEnvValue(getValue(record, ['verificationMethod', '본인인증수단', '인증수단'])),
    verifiedContact: cleanEnvValue(getValue(record, ['verifiedContact', 'verificationContact', '본인인증연락처', '인증연락처'])),
    role,
    roleLabel: getSheetRoleLabel(role),
    status: cleanEnvValue(getValue(record, ['status', 'accountStatus', 'approvalStatus', '상태', '계정상태', '승인상태'])),
    approved: getValue(record, ['approved', 'isApproved', '승인', '승인여부']),
  };
}

function normalizeAccounts(data) {
  let raw = [];

  if (Array.isArray(data?.accounts)) raw = data.accounts;
  else if (Array.isArray(data?.authAccounts)) raw = data.authAccounts;
  else if (Array.isArray(data?.users)) raw = data.users;
  else if (Array.isArray(data?.members)) raw = data.members;
  else if (Array.isArray(data?.data)) raw = data.data;
  else if (Array.isArray(data?.rows)) raw = data.rows;

  if (!raw.length) return [];
  if (Array.isArray(raw[0])) return rowsToObjects(raw).map(normalizeAccount).filter(Boolean);
  return raw.map(normalizeAccount).filter(Boolean);
}

function isApprovedAccount(account) {
  if (!account) return false;

  const approved = parseApproval(account.approved);
  if (approved === false) return false;

  const status = normalizeStatus(account.status);
  if (status) return ACTIVE_STATUS_VALUES.has(status) || approved === true;

  return approved !== false;
}

function bytesToBase64Url(bytes) {
  let base64;

  if (typeof btoa === 'function') {
    let binary = '';
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    base64 = btoa(binary);
  } else {
    base64 = Buffer.from(bytes).toString('base64');
  }

  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export async function hashSheetPassword(password) {
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

function buildScriptUrl(action) {
  const webAppUrl = getAuthWebAppUrl();
  const apiSecret = getApiSecret();

  if (!webAppUrl || !/^https?:\/\//i.test(webAppUrl)) {
    throw new Error('RP_AUTH_WEBAPP_URL, RP_SIGNUP_WEBAPP_URL 또는 RP_SHEETS_WEBAPP_URL 환경변수가 필요합니다.');
  }

  const url = new URL(webAppUrl);
  url.searchParams.set('action', action);

  if (apiSecret && shouldSendGoogleDriveSecretInQuery()) {
    url.searchParams.set('secret', apiSecret);
    url.searchParams.set('apiSecret', apiSecret);
    url.searchParams.set('token', apiSecret);
  }

  return url.toString();
}

async function parseScriptResponse(response) {
  const text = await response.text();

  if (/<!doctype html|<html/i.test(text)) {
    return { ok: false, error: 'Apps Script 응답이 HTML입니다. 웹 앱 배포 URL과 접근 권한을 확인해주세요.', raw: text.slice(0, 250) };
  }

  try {
    return JSON.parse(text);
  } catch (_) {
    return { ok: response.ok, raw: text.slice(0, 300) };
  }
}

async function callAuthScript(action, payload = {}, options = {}) {
  const apiSecret = getApiSecret();
  const method = options.method || 'POST';
  const fetchOptions = { method, cache: 'no-store', redirect: 'follow', headers: {} };

  if (apiSecret) {
    fetchOptions.headers['X-RP-API-Secret'] = apiSecret;
    fetchOptions.headers.Authorization = `Bearer ${apiSecret}`;
  }

  if (method !== 'GET') {
    fetchOptions.headers['Content-Type'] = 'text/plain;charset=utf-8';
    fetchOptions.body = JSON.stringify({ ...payload, action, secret: apiSecret, apiSecret, token: apiSecret });
  }

  const response = await fetchWithTimeout(buildScriptUrl(action), fetchOptions, {
    envKey: 'RP_AUTH_SCRIPT_FETCH_TIMEOUT_MS',
    fallbackMs: 8000,
    maxMs: 30000,
  });
  const data = await parseScriptResponse(response);

  if (!response.ok || data?.ok === false) {
    throw new Error(data?.error || data?.raw || `Apps Script 요청 실패: ${response.status}`);
  }

  return data;
}

export async function listSheetAuthAccounts() {
  if (!getAuthWebAppUrl()) return [];

  const attempts = [
    { action: 'getAuthAccounts', method: 'GET' },
    { action: 'listAuthAccounts', method: 'GET' },
    { action: 'getAccounts', method: 'GET' },
    { action: 'listAccounts', method: 'GET' },
    { action: 'getAuthAccounts', method: 'POST' },
    { action: 'listAuthAccounts', method: 'POST' },
  ];
  const errors = [];

  for (const attempt of attempts) {
    try {
      const data = await callAuthScript(attempt.action, { action: attempt.action }, { method: attempt.method });
      const accounts = normalizeAccounts(data);
      if (accounts.length) return accounts;
      errors.push(`${attempt.method} ${attempt.action}: 0 accounts`);
    } catch (error) {
      const detail = getSafeLogErrorDetail(error, 'auth_account_lookup_failed');
      errors.push(`${attempt.method} ${attempt.action}: ${detail.message}`);
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    console.warn(`RePERFORMANCE auth account lookup failed: ${errors.slice(0, 3).join(' / ')}`);
  }

  return [];
}

export async function findSheetAuthAccount(username, password) {
  const normalizedUsername = cleanEnvValue(username).toLowerCase();
  const normalizedPassword = cleanEnvValue(password);

  if (!normalizedUsername || !normalizedPassword || !getAuthWebAppUrl()) return null;

  const accounts = await listSheetAuthAccounts();
  const account = accounts.find((item) => item.username.toLowerCase() === normalizedUsername);

  if (!account || !isApprovedAccount(account)) return null;

  if (account.passwordHash) {
    const attemptedHash = await hashSheetPassword(normalizedPassword).catch(() => '');
    if (safeEqual(attemptedHash, account.passwordHash)) return sanitizeAccount(account);
  }

  if (safeEqual(account.password, normalizedPassword)) return sanitizeAccount(account);

  return null;
}

export async function findSheetAuthAccountByIdentity(name, contact, method = 'phone') {
  const normalizedName = cleanEnvValue(name).toLowerCase();
  const normalizedMethod = normalizeIdentityMethod(method);
  const normalizedContact = normalizeIdentityContact(normalizedMethod, contact);
  if (!normalizedName || !normalizedContact || !getAuthWebAppUrl()) return null;

  const accounts = await listSheetAuthAccounts();
  const account = accounts.find((item) => (
    cleanEnvValue(item.name).toLowerCase() === normalizedName &&
    normalizeIdentityContact(
      normalizedMethod,
      normalizedMethod === 'email'
        ? item.email || item.username
        : normalizedMethod === 'kakao'
          ? item.kakaoId || item.kakao
          : item.phone || item.verifiedContact,
    ) === normalizedContact &&
    isApprovedAccount(item)
  ));

  return account ? sanitizeAccount(account) : null;
}

function sanitizeAccount(account) {
  return {
    username: account.username,
    name: account.name || account.username,
    role: normalizeSheetRole(account.role),
    phone: account.phone || '',
    email: account.email || '',
    kakaoId: account.kakaoId || '',
  };
}

function buildSignupPayload(record) {
  const role = normalizeSheetRole(record.requestedRole || record.role);
  const requestedAt = record.requestedAt || new Date().toISOString();
  const activeMember = role === 'member';
  const verificationMethod = normalizeIdentityMethod(record.verificationMethod);
  const verifiedContact = normalizeIdentityContact(
    verificationMethod,
    record.verifiedContact || record.verificationContact || record.phone || record.email || record.kakaoId,
  );
  const email = normalizeEmail(record.email || (verificationMethod === 'email' ? verifiedContact : ''));
  const phone = cleanEnvValue(record.phone || (verificationMethod === 'phone' ? verifiedContact : ''));
  const kakaoId = cleanEnvValue(record.kakaoId || record.kakaoTalkId || (verificationMethod === 'kakao' ? verifiedContact : ''));

  return {
    id: record.id || `SIGNUP-${Date.now()}`,
    requestedAt,
    requestedDate: record.requestedDate || requestedAt.slice(0, 10),
    approvedAt: activeMember ? requestedAt : '',
    status: activeMember ? '활성' : '승인 대기',
    accountStatus: activeMember ? 'active' : 'pending_approval',
    approved: activeMember,
    autoApproved: activeMember,
    approvalRequired: !activeMember,
    name: cleanEnvValue(record.name),
    username: cleanEnvValue(record.username),
    phone,
    email,
    kakaoId,
    verificationMethod,
    verifiedContact,
    role,
    roleLabel: getSheetRoleLabel(role),
    requestedRole: role,
    requestedRoleLabel: getSheetRoleLabel(role),
    message: cleanEnvValue(record.message),
    passwordHash: record.passwordHash,
    source: 'reperformance-homepage-signup',
  };
}

async function saveWithAttempts(attempts, account) {
  const errors = [];

  for (const action of attempts) {
    try {
      const data = await callAuthScript(action, { action, account, request: account });
      if (data?.ok !== false) return { ok: true, action, data };
      errors.push(`${action}: ${data?.error || 'not ok'}`);
    } catch (error) {
      const detail = getSafeLogErrorDetail(error, 'auth_account_lookup_failed');
      errors.push(`${action}: ${detail.message}`);
    }
  }

  throw new Error(errors.slice(0, 4).join(' / '));
}

function buildConsultationFallbackRecord(account) {
  return {
    recordType: 'accountSignup',
    consultationDate: account.requestedDate,
    consultationStatus: account.status,
    clientId: account.id,
    clientName: account.name,
    memberGoal: `${account.roleLabel} 계정 신청`,
    coachGoal: account.approvalRequired ? '계정 승인 여부 확인 필요' : '자동 회원가입 완료',
    nextAction: account.approvalRequired ? '계정 승인 검토' : '회원 계정 사용 가능',
    consultationResult: account.status,
    coachMemo: account.message,
    internalJudgment: `희망 아이디: ${account.username} / 연락처: ${account.phone} / 역할: ${account.roleLabel}`,
    signupRequest: account,
  };
}

async function savePendingSignup(account) {
  const attempts = ['saveSignupRequest', 'saveAccountSignup', 'saveSignup'];

  try {
    return await saveWithAttempts(attempts, account);
  } catch (_) {
    const fallback = buildConsultationFallbackRecord(account);
    const data = await callAuthScript('saveConsultation', { action: 'saveConsultation', record: fallback });
    return { ok: true, action: 'saveConsultation', data };
  }
}

export async function saveSheetAuthSignup(record) {
  if (!getAuthWebAppUrl()) {
    throw new Error('자동 회원가입 저장을 위한 Apps Script 웹 앱 URL이 필요합니다.');
  }

  const passwordHash = record.passwordHash || await hashSheetPassword(record.password);
  const account = buildSignupPayload({ ...record, passwordHash });

  if (!account.username || !account.name || !account.verifiedContact) {
    throw new Error('이름, 아이디, 연락처는 필수입니다.');
  }

  if (account.role === 'member') {
    const result = await saveWithAttempts(['createAuthAccount', 'saveAuthAccount', 'upsertAuthAccount', 'saveMemberAccount'], account);
    return { ...result, account: sanitizeAccount(account), autoApproved: true };
  }

  const result = await savePendingSignup(account);
  return { ...result, account: sanitizeAccount(account), autoApproved: false };
}
