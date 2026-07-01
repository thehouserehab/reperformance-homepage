import crypto from 'node:crypto';
import { isDatabaseConfigured, recordDatabaseSecurityEvent } from './rpDatabase';
import { getClientIp } from './rpRateLimit';

const SENSITIVE_KEY_PATTERN = /password|secret|token|code|hash|cookie|session/i;

function cleanValue(value) {
  return String(value || '').trim();
}

function getHashSecret() {
  return cleanValue(
    process.env.RP_SECURITY_EVENT_SECRET
      || process.env.RP_ADMIN_SESSION_SECRET
      || process.env.RP_API_SECRET
      || process.env.RP_PASSWORD_HASH_SECRET,
  );
}

function hashValue(value) {
  const normalized = cleanValue(value).toLowerCase();
  const secret = getHashSecret();
  if (!normalized || !secret) return '';
  return crypto.createHmac('sha256', secret).update(normalized).digest('base64url');
}

function getIpPrefix(ip) {
  const value = cleanValue(ip);
  if (!value || value === 'unknown') return '';

  if (value.includes(':')) {
    return value.split(':').slice(0, 3).filter(Boolean).join(':');
  }

  const parts = value.split('.');
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.0.0`;
  return '';
}

function sanitizeMetadataValue(value, depth = 0) {
  if (depth > 2) return '[truncated]';
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') return cleanValue(value).slice(0, 240);
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitizeMetadataValue(item, depth + 1));
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .slice(0, 30)
        .filter(([key]) => !SENSITIVE_KEY_PATTERN.test(key))
        .map(([key, item]) => [cleanValue(key).slice(0, 80), sanitizeMetadataValue(item, depth + 1)]),
    );
  }
  return cleanValue(value).slice(0, 240);
}

function getRouteFromRequest(request) {
  try {
    const url = new URL(request.url);
    return url.pathname;
  } catch (_) {
    return '';
  }
}

export function getSecuritySubjectHash(value) {
  return hashValue(value);
}

export async function recordSecurityEvent({
  request,
  eventType,
  outcome,
  actor = '',
  target = '',
  route = '',
  metadata = {},
} = {}) {
  if (!isDatabaseConfigured()) return null;

  try {
    const ip = request ? getClientIp(request) : '';
    const userAgent = request?.headers?.get('user-agent') || '';

    return await recordDatabaseSecurityEvent({
      eventType,
      outcome,
      actorHash: hashValue(actor),
      targetHash: hashValue(target),
      ipHash: hashValue(ip),
      ipPrefix: getIpPrefix(ip),
      userAgent,
      route: route || (request ? getRouteFromRequest(request) : ''),
      metadata: sanitizeMetadataValue(metadata) || {},
    });
  } catch (_) {
    return null;
  }
}
