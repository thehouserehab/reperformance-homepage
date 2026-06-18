import { NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, createAdminSession, getAdminCookieOptions } from '../../../../lib/rpAdminAuth';
import { getSheetRoleLabel, normalizeSheetRole, saveSheetAuthSignup } from '../../../../lib/rpSheetAuthStore';
import { isDatabaseConfigured, isDatabaseOnlyMode, saveDatabaseAuthSignup } from '../../../../lib/rpDatabase';

export const dynamic = 'force-dynamic';

const MEMBER_ACTIVE_STATUS = '활성';
const STAFF_PENDING_STATUS = '승인 대기';

function cleanEnvValue(value) {
  return String(value || '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .trim();
}

async function readPayload(request) {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    const payload = await request.json().catch(() => ({}));
    return {
      name: payload.name,
      username: payload.username || payload.email,
      phone: payload.phone,
      password: payload.password,
      passwordConfirm: payload.passwordConfirm || payload.confirmPassword,
      requestedRole: payload.requestedRole || payload.role,
      message: payload.message,
    };
  }

  const formData = await request.formData();
  return {
    name: formData.get('name'),
    username: formData.get('username') || formData.get('email'),
    phone: formData.get('phone'),
    password: formData.get('password'),
    passwordConfirm: formData.get('passwordConfirm') || formData.get('confirmPassword'),
    requestedRole: formData.get('requestedRole') || formData.get('role'),
    message: formData.get('message'),
  };
}

function buildRedirect(request, status, role) {
  const url = new URL('/signup', request.url);
  url.searchParams.set('status', status);
  if (role) url.searchParams.set('role', role);
  return NextResponse.redirect(url, { status: 303 });
}

function jsonResponse(payload, status = 200) {
  return NextResponse.json(payload, { status });
}

function buildSafeRecord(record) {
  const { password, passwordConfirm, ...safeRecord } = record;
  return safeRecord;
}

async function saveAuthSignup(record) {
  if (isDatabaseConfigured()) {
    try {
      return await saveDatabaseAuthSignup(record);
    } catch (error) {
      if (isDatabaseOnlyMode()) throw error;
    }
  }

  return saveSheetAuthSignup(record);
}

function getFailureStatus(error) {
  const message = String(error?.message || '');
  if (
    message.includes('Apps Script')
    || message.includes('웹앱 URL')
    || message.includes('자동 회원가입')
    || message.includes('DATABASE_URL')
    || message.includes('RP_DATABASE_URL')
    || message.includes('RP_PASSWORD_HASH_SECRET')
    || message.includes('RP_ADMIN_SESSION_SECRET')
  ) return 'setup';
  return 'error';
}

async function buildSessionResponse(request, account) {
  const session = await createAdminSession(account);
  const response = NextResponse.redirect(new URL('/account?signup=created', request.url), { status: 303 });
  response.cookies.set(ADMIN_COOKIE_NAME, session, getAdminCookieOptions());
  return response;
}

export async function POST(request) {
  const wantsJson = (request.headers.get('content-type') || '').includes('application/json');
  const payload = await readPayload(request);
  const role = normalizeSheetRole(payload.requestedRole);
  const roleLabel = getSheetRoleLabel(role);
  const now = new Date().toISOString();
  const isMember = role === 'member';
  const record = {
    id: `SIGNUP-${Date.now()}`,
    requestedAt: now,
    requestedDate: now.slice(0, 10),
    status: isMember ? MEMBER_ACTIVE_STATUS : STAFF_PENDING_STATUS,
    accountStatus: isMember ? 'active' : 'pending_approval',
    name: cleanEnvValue(payload.name),
    username: cleanEnvValue(payload.username),
    phone: cleanEnvValue(payload.phone),
    password: cleanEnvValue(payload.password),
    passwordConfirm: cleanEnvValue(payload.passwordConfirm),
    requestedRole: role,
    requestedRoleLabel: roleLabel,
    role,
    roleLabel,
    message: cleanEnvValue(payload.message),
    autoApproved: isMember,
    approvalRequired: !isMember,
  };

  if (!record.name || !record.username || !record.phone || !record.password) {
    if (wantsJson) return jsonResponse({ ok: false, error: '이름, 아이디, 연락처, 비밀번호는 필수입니다.' }, 400);
    return buildRedirect(request, 'invalid', role);
  }

  if (record.password.length < 6) {
    if (wantsJson) return jsonResponse({ ok: false, error: '비밀번호는 6자 이상이어야 합니다.' }, 400);
    return buildRedirect(request, 'invalid', role);
  }

  if (record.passwordConfirm && record.password !== record.passwordConfirm) {
    if (wantsJson) return jsonResponse({ ok: false, error: '비밀번호 확인이 일치하지 않습니다.' }, 400);
    return buildRedirect(request, 'invalid', role);
  }

  try {
    const result = await saveAuthSignup(record);
    const safeRecord = buildSafeRecord(record);

    if (isMember) {
      const account = result.account || { username: record.username, name: record.name, role: 'member' };

      if (wantsJson) {
        const response = jsonResponse({ ok: true, autoApproved: true, record: safeRecord, result });
        const session = await createAdminSession(account);
        response.cookies.set(ADMIN_COOKIE_NAME, session, getAdminCookieOptions());
        return response;
      }

      return buildSessionResponse(request, account);
    }

    if (wantsJson) return jsonResponse({ ok: true, autoApproved: false, pendingApproval: true, record: safeRecord, result });
    return buildRedirect(request, 'pending', role);
  } catch (error) {
    const status = getFailureStatus(error);
    if (wantsJson) return jsonResponse({ ok: false, error: error?.message || '가입 처리 중 오류가 발생했습니다.' }, 500);
    return buildRedirect(request, status, role);
  }
}
