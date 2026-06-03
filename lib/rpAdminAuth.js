import { findSheetAuthAccount } from './rpSheetAuthStore';

export const ADMIN_COOKIE_NAME = 'rp_admin_session';
export const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 12;

export const STAFF_ROLES = ['owner', 'admin', 'trainer'];
export const ROLE_LABELS = {
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

function getAdminSecret() {
  return cleanEnvValue(process.env.RP_ADMIN_SESSION_SECRET || process.env.RP_API_SECRET);
}

function getAuthUsersRaw() {
  return cleanEnvValue(process.env.RP_AUTH_USERS);
}

function getAdminUsersRaw() {
  return cleanEnvValue(process.env.RP_ADMIN_USERS);
}

function getTrainerUsersRaw() {
  return cleanEnvValue(process.env.RP_TRAINER_USERS);
}

export function normalizeRole(role) {
  const value = cleanEnvValue(role).toLowerCase();
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

export function getRoleLabel(role) {
  return ROLE_LABELS[normalizeRole(role)] || ROLE_LABELS.member;
}

function toAccount(username, password, extra = {}, defaultRole = 'member') {
  const normalizedUsername = cleanEnvValue(username);
  const normalizedPassword = cleanEnvValue(password);

  if (!normalizedUsername || !normalizedPassword) return null;

  const role = normalizeRole(extra.role || extra.permission || extra.type || defaultRole);

  return {
    username: normalizedUsername,
    password: normalizedPassword,
    name: cleanEnvValue(extra.name) || cleanEnvValue(extra.displayName) || normalizedUsername,
    role,
  };
}

function pushAccountsFromRaw(accounts, raw, defaultRole) {
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      parsed.forEach((item) => {
        if (typeof item === 'string') {
          const [username, ...passwordParts] = item.split(':');
          const account = toAccount(username, passwordParts.join(':'), {}, defaultRole);
          if (account) accounts.push(account);
          return;
        }

        const account = toAccount(item.username || item.email || item.id, item.password, item, defaultRole);
        if (account) accounts.push(account);
      });
      return;
    }

    if (parsed && typeof parsed === 'object') {
      Object.entries(parsed).forEach(([username, value]) => {
        const account = typeof value === 'string'
          ? toAccount(username, value, {}, defaultRole)
          : toAccount(username, value?.password, value || {}, defaultRole);
        if (account) accounts.push(account);
      });
      return;
    }
  } catch (_) {
    raw
      .split(/[\n,;]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((item) => {
        const [username, ...passwordParts] = item.split(':');
        const account = toAccount(username, passwordParts.join(':'), {}, defaultRole);
        if (account) accounts.push(account);
      });
  }
}

function dedupeAccounts(accounts) {
  const seen = new Set();
  return accounts.filter((account) => {
    const key = account.username.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function getAuthAccounts() {
  const accounts = [];

  pushAccountsFromRaw(accounts, getAuthUsersRaw(), 'member');
  pushAccountsFromRaw(accounts, getAdminUsersRaw(), 'admin');
  pushAccountsFromRaw(accounts, getTrainerUsersRaw(), 'trainer');

  const fallbackAdmin = toAccount(process.env.RP_ADMIN_USERNAME, process.env.RP_ADMIN_PASSWORD, {
    name: process.env.RP_ADMIN_NAME,
    role: process.env.RP_ADMIN_ROLE || 'admin',
  }, 'admin');

  if (fallbackAdmin) accounts.push(fallbackAdmin);

  const fallbackTrainer = toAccount(process.env.RP_TRAINER_USERNAME, process.env.RP_TRAINER_PASSWORD, {
    name: process.env.RP_TRAINER_NAME,
    role: 'trainer',
  }, 'trainer');

  if (fallbackTrainer) accounts.push(fallbackTrainer);

  return dedupeAccounts(accounts);
}

export function getAdminAccounts() {
  return getAuthAccounts().filter((account) => hasStaffRole(account.role));
}

export function findAuthAccount(username, password) {
  const normalizedUsername = cleanEnvValue(username).toLowerCase();
  const normalizedPassword = cleanEnvValue(password);

  if (!normalizedUsername || !normalizedPassword) return null;

  return getAuthAccounts().find((account) => (
    account.username.toLowerCase() === normalizedUsername && account.password === normalizedPassword
  )) || null;
}

export async function findAuthAccountFromStores(username, password) {
  const envAccount = findAuthAccount(username, password);
  if (envAccount) return envAccount;

  return findSheetAuthAccount(username, password);
}

export function findAdminAccount(username, password) {
  const account = findAuthAccount(username, password);
  return account && hasStaffRole(account.role) ? account : null;
}

export async function findAdminAccountFromStores(username, password) {
  const account = await findAuthAccountFromStores(username, password);
  return account && hasStaffRole(account.role) ? account : null;
}

export function hasStaffRole(role) {
  return STAFF_ROLES.includes(normalizeRole(role));
}

export function hasStaffAccess(session) {
  return Boolean(session?.sub && hasStaffRole(session.role));
}

function bytesToBase64Url(bytes) {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value) {
  const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function textToBase64Url(text) {
  return bytesToBase64Url(new TextEncoder().encode(text));
}

function base64UrlToText(value) {
  return new TextDecoder().decode(base64UrlToBytes(value));
}

async function sign(payloadPart) {
  const secret = getAdminSecret();

  if (!secret) {
    throw new Error('RP_ADMIN_SESSION_SECRET 또는 RP_API_SECRET 환경변수가 필요합니다.');
  }

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadPart));
  return bytesToBase64Url(new Uint8Array(signature));
}

export async function createAdminSession(account) {
  const now = Math.floor(Date.now() / 1000);
  const role = normalizeRole(account.role);
  const payload = {
    sub: account.username,
    name: account.name || account.username,
    role,
    roleLabel: getRoleLabel(role),
    iat: now,
    exp: now + ADMIN_SESSION_TTL_SECONDS,
  };
  const payloadPart = textToBase64Url(JSON.stringify(payload));
  const signature = await sign(payloadPart);

  return `${payloadPart}.${signature}`;
}

export async function verifyAdminSessionCookie(cookieValue) {
  if (!cookieValue || !String(cookieValue).includes('.')) return null;

  const [payloadPart, signature] = String(cookieValue).split('.');
  if (!payloadPart || !signature) return null;

  let expectedSignature;
  try {
    expectedSignature = await sign(payloadPart);
  } catch (_) {
    return null;
  }

  if (expectedSignature !== signature) return null;

  try {
    const payload = JSON.parse(base64UrlToText(payloadPart));
    const now = Math.floor(Date.now() / 1000);

    if (!payload?.sub || !payload?.exp || Number(payload.exp) <= now) return null;

    return {
      ...payload,
      role: normalizeRole(payload.role),
      roleLabel: getRoleLabel(payload.role),
    };
  } catch (_) {
    return null;
  }
}

export function getAdminCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ADMIN_SESSION_TTL_SECONDS,
  };
}

export function sanitizeAdminNext(value) {
  const next = cleanEnvValue(value);

  if (next.startsWith('/admin') && !next.startsWith('/admin/login')) return next;

  return '/admin';
}
