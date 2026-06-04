import { NextResponse } from 'next/server';
import {
  ADMIN_COOKIE_NAME,
  createAdminSession,
  getAdminCookieOptions,
  hasStaffRole,
  sanitizeAdminNext,
} from '../../../../lib/rpAdminAuth';
import { findAuthAccountFromStores } from '../../../../lib/rpAuthStores';

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

export async function POST(request) {
  const payload = await readLoginPayload(request);
  const nextPath = sanitizeAdminNext(payload.next);
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
