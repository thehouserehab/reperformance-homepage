import { NextResponse } from 'next/server';
import { isDatabaseConfigured, recordDatabaseConversionEvent } from '../../../../lib/rpDatabase';
import { normalizeConversionEvent } from '../../../../lib/rpAttribution';
import { buildRateLimitResponse, checkSharedRequestRateLimit } from '../../../../lib/rpRateLimit';
import {
  buildForbiddenOriginResponse,
  buildRequestTooLargeResponse,
  checkSameOriginRequest,
  checkRequestBodySize,
  REQUEST_SIZE_LIMITS,
} from '../../../../lib/rpRequestGuards';

export const dynamic = 'force-dynamic';

const EVENT_WINDOW_MS = 15 * 60 * 1000;
const EVENT_SESSION_LIMIT = 120;
const EVENT_IP_LIMIT = 360;

export async function POST(request) {
  const originCheck = checkSameOriginRequest(request);
  if (!originCheck.ok) return buildForbiddenOriginResponse();

  const sizeCheck = checkRequestBodySize(request, REQUEST_SIZE_LIMITS.small);
  if (!sizeCheck.ok) return buildRequestTooLargeResponse(sizeCheck.maxBytes);

  if (!isDatabaseConfigured()) {
    return new NextResponse(null, { status: 204 });
  }

  const payload = await request.json().catch(() => ({}));
  const event = normalizeConversionEvent(payload);
  if (!event) {
    return NextResponse.json({ ok: false, error: 'Invalid conversion event.' }, { status: 400 });
  }

  const retryAfterSeconds = await checkSharedRequestRateLimit({
    request,
    scope: 'conversion-events',
    identifier: event.sessionId,
    limit: EVENT_SESSION_LIMIT,
    ipLimit: EVENT_IP_LIMIT,
    windowMs: EVENT_WINDOW_MS,
  });

  if (retryAfterSeconds) {
    return buildRateLimitResponse(retryAfterSeconds, 'Too many conversion events.');
  }

  try {
    await recordDatabaseConversionEvent(event);
    return NextResponse.json({ ok: true });
  } catch (_) {
    return NextResponse.json({ ok: false, error: 'Conversion event could not be stored.' }, { status: 500 });
  }
}
