import {
  getIdentityContactFromPayload,
  requestIdentityCode,
  verifyIdentityCode,
} from '../../../../lib/rpIdentityVerification';
import { buildRateLimitResponse, checkRequestRateLimit } from '../../../../lib/rpRateLimit';

export const dynamic = 'force-dynamic';

const CODE_REQUEST_WINDOW_MS = 15 * 60 * 1000;
const CODE_REQUEST_LIMIT = 5;
const CODE_REQUEST_IP_LIMIT = 30;
const CODE_VERIFY_WINDOW_MS = 5 * 60 * 1000;
const CODE_VERIFY_LIMIT = 8;
const CODE_VERIFY_IP_LIMIT = 50;

async function readPayload(request) {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return request.json().catch(() => ({}));

  const formData = await request.formData();
  return Object.fromEntries(formData.entries());
}

export async function POST(request) {
  try {
    const payload = await readPayload(request);
    const action = String(payload.action || '').trim();

    if (action === 'request-code') {
      const { method, contact } = getIdentityContactFromPayload(payload);
      const retryAfterSeconds = checkRequestRateLimit({
        request,
        scope: 'identity-code-request',
        identifier: `${payload.purpose || 'signup'}:${method}:${contact}`,
        limit: CODE_REQUEST_LIMIT,
        ipLimit: CODE_REQUEST_IP_LIMIT,
        windowMs: CODE_REQUEST_WINDOW_MS,
      });

      if (retryAfterSeconds) return buildRateLimitResponse(retryAfterSeconds);

      const result = await requestIdentityCode(payload);
      return Response.json({ ok: true, ...result });
    }

    if (action === 'verify-code') {
      const retryAfterSeconds = checkRequestRateLimit({
        request,
        scope: 'identity-code-verify',
        identifier: String(payload.verificationToken || '').slice(0, 32),
        limit: CODE_VERIFY_LIMIT,
        ipLimit: CODE_VERIFY_IP_LIMIT,
        windowMs: CODE_VERIFY_WINDOW_MS,
      });

      if (retryAfterSeconds) return buildRateLimitResponse(retryAfterSeconds);

      const result = await verifyIdentityCode(payload);
      return Response.json({ ok: true, ...result });
    }

    return Response.json({ ok: false, error: '지원하지 않는 요청입니다.' }, { status: 400 });
  } catch (error) {
    return Response.json(
      { ok: false, error: error?.message || '본인 인증 처리 중 오류가 발생했습니다.' },
      { status: error?.status || 500 },
    );
  }
}
