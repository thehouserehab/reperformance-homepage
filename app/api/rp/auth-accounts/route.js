import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  ADMIN_COOKIE_NAME,
  hasStaffAccess,
  verifyAdminSessionCookie,
} from '../../../../lib/rpAdminAuth';
import {
  isDatabaseConfigured,
  listDatabaseAuthAccounts,
  updateDatabaseAuthAccountAiApproval,
} from '../../../../lib/rpDatabase';
import { buildRateLimitResponse, checkSharedRequestRateLimit } from '../../../../lib/rpRateLimit';
import {
  buildForbiddenOriginResponse,
  buildRequestTooLargeResponse,
  checkSameOriginRequest,
  checkRequestBodySize,
  REQUEST_SIZE_LIMITS,
} from '../../../../lib/rpRequestGuards';

export const dynamic = 'force-dynamic';

const ACCOUNT_READ_LIMIT = 80;
const ACCOUNT_WRITE_LIMIT = 40;
const ACCOUNT_WINDOW_MS = 10 * 60 * 1000;

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

async function checkAccountLimit(request, session, action) {
  const retryAfterSeconds = await checkSharedRequestRateLimit({
    request,
    scope: `rp-auth-accounts:${action}`,
    identifier: session.sub,
    limit: action === 'write' ? ACCOUNT_WRITE_LIMIT : ACCOUNT_READ_LIMIT,
    ipLimit: action === 'write' ? ACCOUNT_WRITE_LIMIT * 2 : ACCOUNT_READ_LIMIT * 2,
    windowMs: ACCOUNT_WINDOW_MS,
  });

  return retryAfterSeconds
    ? buildRateLimitResponse(retryAfterSeconds, 'Too many account management requests. Please try again later.')
    : null;
}

export async function GET(request) {
  const { session, response } = await requireStaffSession();
  if (response) return response;

  const limited = await checkAccountLimit(request, session, 'read');
  if (limited) return limited;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({
      ok: false,
      setupRequired: true,
      error: 'DATABASE_URL or RP_DATABASE_URL is required.',
      accounts: [],
    }, { status: 503 });
  }

  const accounts = await listDatabaseAuthAccounts();
  return NextResponse.json({ ok: true, accounts, count: accounts.length });
}

export async function PATCH(request) {
  const originCheck = checkSameOriginRequest(request);
  if (!originCheck.ok) return buildForbiddenOriginResponse();

  const sizeCheck = checkRequestBodySize(request, REQUEST_SIZE_LIMITS.small);
  if (!sizeCheck.ok) return buildRequestTooLargeResponse(sizeCheck.maxBytes);

  const { session, response } = await requireStaffSession();
  if (response) return response;

  const limited = await checkAccountLimit(request, session, 'write');
  if (limited) return limited;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({
      ok: false,
      setupRequired: true,
      error: 'DATABASE_URL or RP_DATABASE_URL is required.',
    }, { status: 503 });
  }

  const payload = await request.json().catch(() => ({}));
  const username = String(payload.username || '').trim();

  if (!username) {
    return NextResponse.json({ ok: false, error: 'username is required.' }, { status: 400 });
  }

  const account = await updateDatabaseAuthAccountAiApproval(username, Boolean(payload.aiApproved), session.sub);

  if (!account) {
    return NextResponse.json({ ok: false, error: 'Account not found.' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, account });
}
