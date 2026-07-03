export const MIN_PRODUCTION_SECRET_LENGTH = 32;

const PLACEHOLDER_SECRET_PATTERN = /change.?this|changeme|replace.?me|example|sample|placeholder|dummy|default|development|testing/i;
const COMMON_WEAK_SECRETS = new Set([
  'admin',
  'password',
  'secret',
  'test',
  'dev',
  'demo',
  '1234',
  '123456',
  '12345678',
  'qwerty',
]);

function cleanSecret(value) {
  return String(value || '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .trim();
}

function isProductionRuntime() {
  return process.env.NODE_ENV === 'production';
}

function isPlaceholderSecret(secret) {
  const normalized = cleanSecret(secret).toLowerCase().replace(/[\s_-]+/g, '');
  if (!normalized) return false;
  return COMMON_WEAK_SECRETS.has(normalized) || PLACEHOLDER_SECRET_PATTERN.test(secret);
}

export function getProductionSecretStatus(secret, { minLength = MIN_PRODUCTION_SECRET_LENGTH } = {}) {
  const cleaned = cleanSecret(secret);
  const configured = Boolean(cleaned);
  const meetsMinimumLength = !configured || cleaned.length >= minLength;
  const placeholderLike = configured && isPlaceholderSecret(cleaned);

  return {
    configured,
    productionEnforced: isProductionRuntime(),
    minLength,
    meetsMinimumLength,
    placeholderLike,
    strong: configured && meetsMinimumLength && !placeholderLike,
  };
}

export function assertStrongProductionSecret(secret, label, options = {}) {
  const cleaned = cleanSecret(secret);
  if (!cleaned || !isProductionRuntime()) return cleaned;

  const status = getProductionSecretStatus(cleaned, options);
  if (!status.strong) {
    throw new Error(`${label} must be a non-placeholder secret with at least ${status.minLength} characters in production.`);
  }

  return cleaned;
}

export function safeEqual(left, right) {
  const leftBytes = new TextEncoder().encode(String(left || ''));
  const rightBytes = new TextEncoder().encode(String(right || ''));

  if (!leftBytes.length || !rightBytes.length) return false;

  let diff = leftBytes.length ^ rightBytes.length;
  const maxLength = Math.max(leftBytes.length, rightBytes.length);

  for (let index = 0; index < maxLength; index += 1) {
    diff |= leftBytes[index % leftBytes.length] ^ rightBytes[index % rightBytes.length];
  }

  return diff === 0;
}
