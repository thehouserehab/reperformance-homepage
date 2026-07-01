import { checkDatabaseRateLimit } from './rpDatabase';

function cleanValue(value) {
  return String(value || '').trim();
}

export function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for') || '';
  return forwarded.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

function getRateLimitStore() {
  const globalKey = '__rpHomepageRateLimit';
  if (!globalThis[globalKey]) globalThis[globalKey] = new Map();
  return globalThis[globalKey];
}

export function getRateLimitKey(scope, value) {
  return `${cleanValue(scope)}:${cleanValue(value).toLowerCase()}`;
}

export function checkRateLimit(key, limit, windowMs) {
  const store = getRateLimitStore();
  const now = Date.now();
  const recent = (store.get(key) || []).filter((timestamp) => now - timestamp < windowMs);

  if (recent.length >= limit) {
    const retryAt = recent[0] + windowMs;
    store.set(key, recent);
    return Math.max(1, Math.ceil((retryAt - now) / 1000));
  }

  recent.push(now);
  store.set(key, recent);

  if (store.size > 2000) {
    for (const [storedKey, timestamps] of store.entries()) {
      const active = timestamps.filter((timestamp) => now - timestamp < windowMs);
      if (active.length) store.set(storedKey, active);
      else store.delete(storedKey);
    }
  }

  return 0;
}

export function buildRateLimitResponse(retryAfterSeconds, message) {
  return Response.json(
    {
      ok: false,
      error: message || `요청이 너무 많습니다. ${Math.ceil(retryAfterSeconds / 60)}분 후 다시 시도해주세요.`,
      retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSeconds),
      },
    },
  );
}

export function checkRequestRateLimit({
  request,
  scope,
  identifier = '',
  limit,
  windowMs,
  ipLimit,
  identifierLimit,
}) {
  const clientIp = getClientIp(request);
  const id = cleanValue(identifier);
  const ipRetryAfterSeconds = checkRateLimit(
    getRateLimitKey(`${scope}:ip`, clientIp),
    ipLimit || limit,
    windowMs,
  );

  if (ipRetryAfterSeconds) return ipRetryAfterSeconds;
  if (!id) return 0;

  return checkRateLimit(
    getRateLimitKey(`${scope}:id`, id),
    identifierLimit || limit,
    windowMs,
  );
}

async function checkSharedRateLimit(key, limit, windowMs) {
  try {
    const databaseRetryAfterSeconds = await checkDatabaseRateLimit(key, limit, windowMs);
    if (databaseRetryAfterSeconds !== null && databaseRetryAfterSeconds !== undefined) {
      return databaseRetryAfterSeconds;
    }
  } catch (_) {
    // Keep the public flow available if the shared store is temporarily unavailable.
  }

  return checkRateLimit(key, limit, windowMs);
}

export async function checkSharedRequestRateLimit({
  request,
  scope,
  identifier = '',
  limit,
  windowMs,
  ipLimit,
  identifierLimit,
}) {
  const clientIp = getClientIp(request);
  const id = cleanValue(identifier);
  const ipRetryAfterSeconds = await checkSharedRateLimit(
    getRateLimitKey(`${scope}:ip`, clientIp),
    ipLimit || limit,
    windowMs,
  );

  if (ipRetryAfterSeconds) return ipRetryAfterSeconds;
  if (!id) return 0;

  return checkSharedRateLimit(
    getRateLimitKey(`${scope}:id`, id),
    identifierLimit || limit,
    windowMs,
  );
}
