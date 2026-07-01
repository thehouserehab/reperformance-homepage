export const REQUEST_SIZE_LIMITS = {
  tiny: 8 * 1024,
  small: 16 * 1024,
  medium: 64 * 1024,
  large: 128 * 1024,
};

export function getRequestContentLength(request) {
  const header = request.headers.get('content-length');
  const size = Number(header);
  return Number.isFinite(size) && size >= 0 ? size : null;
}

export function checkRequestBodySize(request, maxBytes) {
  const size = getRequestContentLength(request);
  if (size === null) return { ok: true, size: null, maxBytes };
  return { ok: size <= maxBytes, size, maxBytes };
}

export function buildRequestTooLargeResponse(maxBytes) {
  return Response.json(
    {
      ok: false,
      error: `요청 본문이 너무 큽니다. ${Math.floor(maxBytes / 1024)}KB 이내로 다시 시도해주세요.`,
      maxBytes,
    },
    { status: 413 },
  );
}

function cleanValue(value) {
  return String(value || '').trim();
}

function splitCsv(value) {
  return cleanValue(value)
    .split(',')
    .map((item) => cleanValue(item))
    .filter(Boolean);
}

function normalizeOrigin(value) {
  const text = cleanValue(value);
  if (!text) return '';

  try {
    const url = new URL(text.includes('://') ? text : `https://${text}`);
    return url.origin;
  } catch (_) {
    return '';
  }
}

function addOrigin(origins, value) {
  const origin = normalizeOrigin(value);
  if (origin) origins.add(origin);
}

export function getAllowedRequestOrigins(request) {
  const origins = new Set();

  addOrigin(origins, request.url);
  addOrigin(origins, process.env.NEXT_PUBLIC_SITE_URL);
  addOrigin(origins, process.env.RP_SITE_URL);
  addOrigin(origins, process.env.VERCEL_URL);

  for (const origin of splitCsv(process.env.RP_ALLOWED_ORIGINS)) {
    addOrigin(origins, origin);
  }

  return origins;
}

export function checkSameOriginRequest(request, options = {}) {
  const allowMissingOrigin = options.allowMissingOrigin !== false;
  const allowedOrigins = getAllowedRequestOrigins(request);
  const originHeader = request.headers.get('origin');

  if (originHeader) {
    const origin = normalizeOrigin(originHeader);
    return {
      ok: Boolean(origin && allowedOrigins.has(origin)),
      origin,
      reason: 'origin',
      allowedOrigins: Array.from(allowedOrigins),
    };
  }

  const refererHeader = request.headers.get('referer');
  if (refererHeader) {
    const origin = normalizeOrigin(refererHeader);
    return {
      ok: Boolean(origin && allowedOrigins.has(origin)),
      origin,
      reason: 'referer',
      allowedOrigins: Array.from(allowedOrigins),
    };
  }

  return {
    ok: allowMissingOrigin,
    origin: '',
    reason: 'missing-origin',
    allowedOrigins: Array.from(allowedOrigins),
  };
}

export function buildForbiddenOriginResponse() {
  return Response.json(
    {
      ok: false,
      error: 'Request origin is not allowed.',
    },
    { status: 403 },
  );
}
