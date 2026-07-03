const INTERNAL_ERROR_PATTERN = /DATABASE_URL|POSTGRES_URL|RP_[A-Z0-9_]+|OPENAI|Apps Script|PostgreSQL|SQL|Pool|ECONN|ENOTFOUND|fetch failed|secret|token|HMAC|webhook|environment variable|missing/i;

function cleanMessage(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, 300);
}

function normalizeStatus(status, fallback = 500) {
  const parsed = Number(status);
  if (!Number.isFinite(parsed) || parsed < 400 || parsed > 599) return fallback;
  return Math.floor(parsed);
}

export function exposePublicError(message, status = 400) {
  const error = new Error(message);
  error.status = normalizeStatus(status, 400);
  error.expose = true;
  return error;
}

export function getPublicErrorStatus(error, fallback = 500) {
  return normalizeStatus(error?.status, fallback);
}

export function getSafePublicErrorMessage(error, fallback) {
  const status = getPublicErrorStatus(error);
  const message = cleanMessage(error?.message);

  if (
    message
    && (error?.expose === true || (status >= 400 && status < 500))
    && !INTERNAL_ERROR_PATTERN.test(message)
  ) {
    return message;
  }

  return fallback;
}
