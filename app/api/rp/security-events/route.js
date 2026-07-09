import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  ADMIN_COOKIE_NAME,
  hasStaffAccess,
  verifyAdminSessionCookie,
} from '../../../../lib/rpAdminAuth';
import {
  isDatabaseConfigured,
  listDatabaseSecurityEvents,
} from '../../../../lib/rpDatabase';
import { getSafePublicErrorMessage } from '../../../../lib/rpPublicErrors';
import { buildRateLimitResponse, checkSharedRequestRateLimit } from '../../../../lib/rpRateLimit';

export const dynamic = 'force-dynamic';

const SECURITY_EVENTS_LIMIT = 60;
const SECURITY_EVENTS_IP_LIMIT = 180;
const SECURITY_EVENTS_WINDOW_MS = 10 * 60 * 1000;

function numberParam(url, key, fallback) {
  const parsed = Number(url.searchParams.get(key));
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function requireStaffSession() {
  const cookieStore = await cookies();
  const session = await verifyAdminSessionCookie(cookieStore.get(ADMIN_COOKIE_NAME)?.value);

  if (!session) {
    return {
      response: NextResponse.json({ ok: false, error: 'Staff login required.' }, { status: 401 }),
    };
  }

  if (!hasStaffAccess(session)) {
    return {
      response: NextResponse.json({ ok: false, error: 'Staff permission required.' }, { status: 403 }),
    };
  }

  return { session };
}

export async function GET(request) {
  const { session, response } = await requireStaffSession();
  if (response) return response;

  const retryAfterSeconds = await checkSharedRequestRateLimit({
    request,
    scope: 'rp-security-events:list',
    identifier: session.sub,
    limit: SECURITY_EVENTS_LIMIT,
    ipLimit: SECURITY_EVENTS_IP_LIMIT,
    windowMs: SECURITY_EVENTS_WINDOW_MS,
  });
  if (retryAfterSeconds) return buildRateLimitResponse(retryAfterSeconds);

  if (!isDatabaseConfigured()) {
    return NextResponse.json({
      ok: false,
      setupRequired: true,
      error: 'DATABASE_URL or RP_DATABASE_URL is required.',
      events: [],
      summary: [],
      ipPrefixes: [],
      count: 0,
    }, { status: 503 });
  }

  try {
    const url = new URL(request.url);
    const result = await listDatabaseSecurityEvents({
      limit: numberParam(url, 'limit', 80),
      windowHours: numberParam(url, 'windowHours', 24),
      eventType: url.searchParams.get('eventType') || '',
      outcome: url.searchParams.get('outcome') || '',
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: getSafePublicErrorMessage(error, 'Security events are temporarily unavailable.'),
        events: [],
        summary: [],
        ipPrefixes: [],
        count: 0,
      },
      { status: 500 },
    );
  }
}
