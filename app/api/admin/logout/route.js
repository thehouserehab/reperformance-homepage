import { NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME } from '../../../../lib/rpAdminAuth';
import {
  buildForbiddenOriginResponse,
  checkSameOriginRequest,
} from '../../../../lib/rpRequestGuards';

function clearSession(response) {
  response.cookies.set(ADMIN_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}

export async function POST(request) {
  const originCheck = checkSameOriginRequest(request);
  if (!originCheck.ok) return buildForbiddenOriginResponse();

  return clearSession(NextResponse.redirect(new URL('/admin/login', request.url), { status: 303 }));
}

export async function GET(request) {
  return clearSession(NextResponse.redirect(new URL('/admin/login', request.url), { status: 303 }));
}
