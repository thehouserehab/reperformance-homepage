const DEFAULT_OUTBOUND_FETCH_TIMEOUT_MS = 10000;
const MIN_OUTBOUND_FETCH_TIMEOUT_MS = 1000;
const MAX_OUTBOUND_FETCH_TIMEOUT_MS = 60000;

function cleanEnvValue(value) {
  return String(value || '').trim();
}

function parsePositiveInteger(value) {
  const parsed = Number(cleanEnvValue(value));
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor(parsed);
}

export function getOutboundFetchTimeoutMs(options = {}) {
  const envKey = options.envKey || 'RP_OUTBOUND_FETCH_TIMEOUT_MS';
  const fallbackMs = parsePositiveInteger(options.fallbackMs) || DEFAULT_OUTBOUND_FETCH_TIMEOUT_MS;
  const minMs = parsePositiveInteger(options.minMs) || MIN_OUTBOUND_FETCH_TIMEOUT_MS;
  const maxMs = parsePositiveInteger(options.maxMs) || MAX_OUTBOUND_FETCH_TIMEOUT_MS;
  const envMs = parsePositiveInteger(process.env[envKey] || process.env.RP_OUTBOUND_FETCH_TIMEOUT_MS);
  const selectedMs = envMs || fallbackMs;

  return Math.min(Math.max(selectedMs, minMs), maxMs);
}

export async function fetchWithTimeout(resource, init = {}, options = {}) {
  const timeoutMs = getOutboundFetchTimeoutMs(options);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  timeout.unref?.();

  try {
    return await fetch(resource, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted) {
      const timeoutError = new Error(`Outbound request timed out after ${timeoutMs}ms.`);
      timeoutError.name = 'AbortError';
      throw timeoutError;
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
