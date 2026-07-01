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
