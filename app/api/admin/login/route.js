import { NextResponse } from 'next/server';
import {
  ADMIN_COOKIE_NAME,
  createAdminSession,
  getAdminCookieOptions,
  hasStaffRole,
  sanitizeAdminNext,
} from '../../../../lib/rpAdminAuth';
import { findAuthAccountFromStores } from '../../../../lib/rpAuthStores';
import { buildRateLimitResponse, checkSharedRequestRateLimit } from '../../../../lib/rpRateLimit';
import {
  buildForbiddenOriginResponse,
  buildRequestTooLargeResponse,
  checkSameOriginRequest,
  checkRequestBodySize,
  REQUEST_SIZE_LIMITS,
} from '../../../../lib/rpRequestGuards';

const ADMIN_LOGIN_WINDOW_MS = 15 * 60 * 1000;
const ADMIN_LOGIN_ATTEMPT_LIMIT = 10;
const ADMIN_LOGIN_IP_LIMIT = 30;

async function readLoginPayload(request) {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    const payload = await request.json().catch(() => ({}));
    return {
      username: payload.username || payload.email || '',
      password: payload.password || '',
      next: payload.next || '',
    };
  }

  const formData = await request.formData();
  return {
    username: formData.get('username') || formData.get('email') || '',
    password: formData.get('password') || '',
    next: formData.get('next') || '',
  };
}

function redirectToLogin(request, next, error = 'invalid') {
  const loginUrl = new URL('/admin/login', request.url);
  loginUrl.searchParams.set('error', error);
  loginUrl.searchParams.set('next', sanitizeAdminNext(next));
  return NextResponse.redirect(loginUrl, { status: 303 });
}

function wantsJson(request) {
  const accept = request.headers.get('accept') || '';
  const contentType = request.headers.get('content-type') || '';
  return accept.includes('application/json') || contentType.includes('application/json');
}

export async function POST(request) {
  const originCheck = checkSameOriginRequest(request);
  if (!originCheck.ok) return buildForbiddenOriginResponse();

  const sizeCheck = checkRequestBodySize(request, REQUEST_SIZE_LIMITS.tiny);
  if (!sizeCheck.ok) return buildRequestTooLargeResponse(sizeCheck.maxBytes);

  const payload = await readLoginPayload(request);
  const nextPath = sanitizeAdminNext(payload.next);
  const retryAfterSeconds = await checkSharedRequestRateLimit({
    request,
    scope: 'admin-login',
    identifier: payload.username,
    limit: ADMIN_LOGIN_ATTEMPT_LIMIT,
    ipLimit: ADMIN_LOGIN_IP_LIMIT,
    windowMs: ADMIN_LOGIN_WINDOW_MS,
  });

  if (retryAfterSeconds) {
    if (wantsJson(request)) return buildRateLimitResponse(retryAfterSeconds);
    return redirectToLogin(request, nextPath, 'rate-limited');
  }

  const account = await findAuthAccountFromStores(payload.username, payload.password);

  if (!account) return redirectToLogin(request, nextPath, 'invalid');
  if (!hasStaffRole(account.role)) return redirectToLogin(request, nextPath, 'forbidden');

  let session;
  try {
    session = await createAdminSession(account);
  } catch (_) {
    return redirectToLogin(request, nextPath, 'config');
  }

  const response = NextResponse.redirect(new URL(nextPath, request.url), { status: 303 });
  response.cookies.set(ADMIN_COOKIE_NAME, session, getAdminCookieOptions());

  return response;
}
