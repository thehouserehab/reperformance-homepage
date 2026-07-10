import { NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, hasStaffAccess, verifyAdminSessionCookie } from './lib/rpAdminAuth';
import { buildForbiddenOriginResponse, checkSameOriginRequest } from './lib/rpRequestGuards';

function isProtectedAdminPath(pathname) {
  return pathname.startsWith('/admin') && !pathname.startsWith('/admin/login');
}

function isProtectedAccountPath(pathname) {
  return pathname.startsWith('/account');
}

function isProtectedApiPath(pathname) {
  return pathname.startsWith('/api/rp/clients')
    || pathname.startsWith('/api/rp/auth-accounts')
    || pathname.startsWith('/api/rp/consultation-summary')
    || pathname.startsWith('/api/rp/security-events')
    || pathname.startsWith('/api/rp/system-status');
}

function isStateChangingMethod(method) {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(String(method || '').toUpperCase());
}

function buildStaffLoginUrl(request, error) {
  const loginUrl = new URL('/admin/login', request.url);
  loginUrl.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);
  if (error) loginUrl.searchParams.set('error', error);
  return loginUrl;
}

function buildPublicLoginUrl(request) {
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return loginUrl;
}

function unauthorizedJson(error, status) {
  return NextResponse.json({ ok: false, error, clients: [] }, { status });
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  if (isProtectedApiPath(pathname) && isStateChangingMethod(request.method)) {
    const originCheck = checkSameOriginRequest(request);
    if (!originCheck.ok) return buildForbiddenOriginResponse();
  }

  const cookieValue = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const session = await verifyAdminSessionCookie(cookieValue);
  const canUseStaffArea = hasStaffAccess(session);

  if (pathname.startsWith('/admin/login')) {
    if (canUseStaffArea) return NextResponse.redirect(new URL('/admin', request.url));
    return NextResponse.next();
  }

  if (pathname === '/login') {
    if (session) return NextResponse.redirect(new URL(canUseStaffArea ? '/admin' : '/account', request.url));
    return NextResponse.next();
  }

  if (!isProtectedAdminPath(pathname) && !isProtectedAccountPath(pathname) && !isProtectedApiPath(pathname)) {
    return NextResponse.next();
  }

  if (isProtectedAccountPath(pathname)) {
    if (session) return NextResponse.next();
    return NextResponse.redirect(buildPublicLoginUrl(request));
  }

  if (canUseStaffArea) return NextResponse.next();

  if (isProtectedApiPath(pathname)) {
    return unauthorizedJson(
      session ? '관리자 또는 트레이너 권한이 필요합니다.' : '관리자 로그인이 필요합니다.',
      session ? 403 : 401,
    );
  }

  return NextResponse.redirect(buildStaffLoginUrl(request, session ? 'forbidden' : undefined));
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/account/:path*',
    '/login',
    '/api/rp/clients/:path*',
    '/api/rp/auth-accounts/:path*',
    '/api/rp/consultation-summary/:path*',
    '/api/rp/security-events/:path*',
    '/api/rp/system-status/:path*',
  ],
};
