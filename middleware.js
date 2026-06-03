import { NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, hasStaffAccess, verifyAdminSessionCookie } from './lib/rpAdminAuth';

function isProtectedAdminPath(pathname) {
  return pathname.startsWith('/admin') && !pathname.startsWith('/admin/login');
}

function isProtectedApiPath(pathname) {
  return pathname.startsWith('/api/rp/clients');
}

function buildLoginUrl(request, error) {
  const loginUrl = new URL('/admin/login', request.url);
  loginUrl.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);
  if (error) loginUrl.searchParams.set('error', error);
  return loginUrl;
}

function unauthorizedJson(error, status) {
  return NextResponse.json({ ok: false, error, clients: [] }, { status });
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const cookieValue = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const session = await verifyAdminSessionCookie(cookieValue);
  const canUseStaffArea = hasStaffAccess(session);

  if (pathname.startsWith('/admin/login')) {
    if (canUseStaffArea) return NextResponse.redirect(new URL('/admin', request.url));
    return NextResponse.next();
  }

  if (!isProtectedAdminPath(pathname) && !isProtectedApiPath(pathname)) {
    return NextResponse.next();
  }

  if (canUseStaffArea) return NextResponse.next();

  if (isProtectedApiPath(pathname)) {
    return unauthorizedJson(
      session ? '관리자 또는 트레이너 권한이 필요합니다.' : '관리자 로그인이 필요합니다.',
      session ? 403 : 401,
    );
  }

  return NextResponse.redirect(buildLoginUrl(request, session ? 'forbidden' : undefined));
}

export const config = {
  matcher: ['/admin/:path*', '/api/rp/clients/:path*'],
};
