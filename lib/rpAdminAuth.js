export const ADMIN_COOKIE_NAME = 'rp_admin_session';
export const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 12;

function cleanEnvValue(value) {
  return String(value || '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .trim();
}

function getAdminSecret() {
  return cleanEnvValue(process.env.RP_ADMIN_SESSION_SECRET || process.env.RP_API_SECRET);
}

function getAdminUsersRaw() {
  return cleanEnvValue(process.env.RP_ADMIN_USERS);
}

function toAccount(username, password, extra = {}) {
  const normalizedUsername = cleanEnvValue(username);
  const normalizedPassword = cleanEnvValue(password);

  if (!normalizedUsername || !normalizedPassword) return null;

  return {
    username: normalizedUsername,
    password: normalizedPassword,
    name: cleanEnvValue(extra.name) || normalizedUsername,
    role: cleanEnvValue(extra.role) || 'admin',
  };
}

export function getAdminAccounts() {
  const accounts = [];
  const raw = getAdminUsersRaw();

  if (raw) {
    try {
      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed)) {
        parsed.forEach((item) => {
          if (typeof item === 'string') {
            const [username, ...passwordParts] = item.split(':');
            const account = toAccount(username, passwordParts.join(':'));
            if (account) accounts.push(account);
            return;
          }

          const account = toAccount(item.username || item.email || item.id, item.password, item);
          if (account) accounts.push(account);
        });
      } else if (parsed && typeof parsed === 'object') {
        Object.entries(parsed).forEach(([username, value]) => {
          const account = typeof value === 'string'
            ? toAccount(username, value)
            : toAccount(username, value?.password, value || {});
          if (account) accounts.push(account);
        });
      }
    } catch (_) {
      raw
        .split(/[\n,;]/)
        .map((item) => item.trim())
        .filter(Boolean)
        .forEach((item) => {
          const [username, ...passwordParts] = item.split(':');
          const account = toAccount(username, passwordParts.join(':'));
          if (account) accounts.push(account);
        });
    }
  }

  const fallbackAccount = toAccount(process.env.RP_ADMIN_USERNAME, process.env.RP_ADMIN_PASSWORD, {
    name: process.env.RP_ADMIN_NAME,
  });

  if (fallbackAccount) accounts.push(fallbackAccount);

  return accounts;
}

export function findAdminAccount(username, password) {
  const normalizedUsername = cleanEnvValue(username).toLowerCase();
  const normalizedPassword = cleanEnvValue(password);

  if (!normalizedUsername || !normalizedPassword) return null;

  return getAdminAccounts().find((account) => (
    account.username.toLowerCase() === normalizedUsername && account.password === normalizedPassword
  )) || null;
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
  const payload = {
    sub: account.username,
    name: account.name || account.username,
    role: account.role || 'admin',
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

    return payload;
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
