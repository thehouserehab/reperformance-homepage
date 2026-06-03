import { NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, verifyAdminSessionCookie } from './lib/rpAdminAuth';

function isProtectedAdminPath(pathname) {
  return pathname.startsWith('/admin') && !pathname.startsWith('/admin/login');
}

function isProtectedApiPath(pathname) {
  return pathname.startsWith('/api/rp/clients');
}

function buildLoginUrl(request) {
  const loginUrl = new URL('/admin/login', request.url);
  loginUrl.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return loginUrl;
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const cookieValue = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const session = await verifyAdminSessionCookie(cookieValue);

  if (pathname.startsWith('/admin/login')) {
    if (session) return NextResponse.redirect(new URL('/admin', request.url));
    return NextResponse.next();
  }

  if (!isProtectedAdminPath(pathname) && !isProtectedApiPath(pathname)) {
    return NextResponse.next();
  }

  if (session) return NextResponse.next();

  if (isProtectedApiPath(pathname)) {
    return NextResponse.json(
      { ok: false, error: '관리자 로그인이 필요합니다.', clients: [] },
      { status: 401 },
    );
  }

  return NextResponse.redirect(buildLoginUrl(request));
}

export const config = {
  matcher: ['/admin/:path*', '/api/rp/clients/:path*'],
};
