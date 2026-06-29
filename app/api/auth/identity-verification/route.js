import {
  requestIdentityCode,
  verifyIdentityCode,
} from '../../../../lib/rpIdentityVerification';

export const dynamic = 'force-dynamic';

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
      const result = await requestIdentityCode(payload);
      return Response.json({ ok: true, ...result });
    }

    if (action === 'verify-code') {
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
