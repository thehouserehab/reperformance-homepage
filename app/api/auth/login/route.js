import { NextResponse } from 'next/server';
import {
  ADMIN_COOKIE_NAME,
  createAdminSession,
  getAdminCookieOptions,
  hasStaffRole,
} from '../../../../lib/rpAdminAuth';
import { findAuthAccountFromStores } from '../../../../lib/rpAuthStores';
import { buildRateLimitResponse, checkSharedRequestRateLimit } from '../../../../lib/rpRateLimit';
import {
  buildRequestTooLargeResponse,
  checkRequestBodySize,
  REQUEST_SIZE_LIMITS,
} from '../../../../lib/rpRequestGuards';

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_ATTEMPT_LIMIT = 12;
const LOGIN_IP_LIMIT = 40;

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

function getSafeRelativeNext(value) {
  const next = String(value || '').trim();

  if (!next.startsWith('/') || next.startsWith('//')) return '';

  try {
    const url = new URL(next, 'https://reperformance.local');
    if (url.origin !== 'https://reperformance.local') return '';

    return `${url.pathname}${url.search}${url.hash}`;
  } catch (_) {
    return '';
  }
}

function isSamePathOrChildQuery(next, pathname) {
  return next === pathname || next.startsWith(`${pathname}?`) || next.startsWith(`${pathname}#`);
}

function sanitizeNext(value, account) {
  const next = getSafeRelativeNext(value);

  if (next.startsWith('/admin') && hasStaffRole(account?.role)) return next;
  if (next.startsWith('/account')) return next;
  if (isSamePathOrChildQuery(next, '/pe-exam/faq')) return next;
  if (isSamePathOrChildQuery(next, '/pe-exam/ai-consult')) return next;

  return hasStaffRole(account?.role) ? '/admin' : '/account';
}

function redirectToLogin(request, next, error = 'invalid') {
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('error', error);
  if (next) loginUrl.searchParams.set('next', next);
  return NextResponse.redirect(loginUrl, { status: 303 });
}

function wantsJson(request) {
  const accept = request.headers.get('accept') || '';
  const contentType = request.headers.get('content-type') || '';
  return accept.includes('application/json') || contentType.includes('application/json');
}

export async function POST(request) {
  const sizeCheck = checkRequestBodySize(request, REQUEST_SIZE_LIMITS.tiny);
  if (!sizeCheck.ok) return buildRequestTooLargeResponse(sizeCheck.maxBytes);

  const payload = await readLoginPayload(request);
  const retryAfterSeconds = await checkSharedRequestRateLimit({
    request,
    scope: 'auth-login',
    identifier: payload.username,
    limit: LOGIN_ATTEMPT_LIMIT,
    ipLimit: LOGIN_IP_LIMIT,
    windowMs: LOGIN_WINDOW_MS,
  });

  if (retryAfterSeconds) {
    if (wantsJson(request)) return buildRateLimitResponse(retryAfterSeconds);
    return redirectToLogin(request, payload.next, 'rate-limited');
  }

  const account = await findAuthAccountFromStores(payload.username, payload.password);

  if (!account) return redirectToLogin(request, payload.next, 'invalid');

  let session;
  try {
    session = await createAdminSession(account);
  } catch (_) {
    return redirectToLogin(request, payload.next, 'config');
  }

  const nextPath = sanitizeNext(payload.next, account);
  const response = NextResponse.redirect(new URL(nextPath, request.url), { status: 303 });
  response.cookies.set(ADMIN_COOKIE_NAME, session, getAdminCookieOptions());

  return response;
}
