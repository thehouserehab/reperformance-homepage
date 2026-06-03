import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const DEFAULT_STATUS = '승인 대기';
const ROLE_LABELS = {
  member: '회원',
  trainer: '트레이너',
  admin: '관리자',
};

function cleanEnvValue(value) {
  return String(value || '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .trim();
}

function extractUrl(value) {
  const cleaned = cleanEnvValue(value);
  const match = cleaned.match(/https?:\/\/[^\s'"]+/);
  return match ? match[0] : cleaned;
}

function getConfig() {
  return {
    webAppUrl: extractUrl(process.env.RP_SIGNUP_WEBAPP_URL || process.env.RP_SHEETS_WEBAPP_URL),
    apiSecret: cleanEnvValue(process.env.RP_API_SECRET),
  };
}

function normalizeRole(value) {
  const role = cleanEnvValue(value).toLowerCase();
  if (['admin', 'administrator', 'manager', '관리자'].includes(role)) return 'admin';
  if (['trainer', 'coach', '트레이너', '코치'].includes(role)) return 'trainer';
  return 'member';
}

async function readPayload(request) {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    const payload = await request.json().catch(() => ({}));
    return {
      name: payload.name,
      username: payload.username || payload.email,
      phone: payload.phone,
      requestedRole: payload.requestedRole || payload.role,
      message: payload.message,
    };
  }

  const formData = await request.formData();
  return {
    name: formData.get('name'),
    username: formData.get('username') || formData.get('email'),
    phone: formData.get('phone'),
    requestedRole: formData.get('requestedRole') || formData.get('role'),
    message: formData.get('message'),
  };
}

function buildScriptUrl(webAppUrl, action, apiSecret) {
  const normalizedUrl = extractUrl(webAppUrl);

  if (!normalizedUrl || !/^https?:\/\//i.test(normalizedUrl)) {
    throw new Error('RP_SIGNUP_WEBAPP_URL 또는 RP_SHEETS_WEBAPP_URL 환경변수가 필요합니다.');
  }

  const url = new URL(normalizedUrl);
  url.searchParams.set('action', action);

  if (apiSecret) {
    url.searchParams.set('secret', apiSecret);
    url.searchParams.set('apiSecret', apiSecret);
    url.searchParams.set('token', apiSecret);
  }

  return url.toString();
}

async function parseResponse(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (_) {
    return { ok: response.ok, raw: text.slice(0, 300) };
  }
}

function buildConsultationFallbackRecord(record) {
  return {
    recordType: 'accountSignup',
    consultationDate: record.requestedDate,
    consultationStatus: DEFAULT_STATUS,
    clientId: record.id,
    clientName: record.name,
    memberGoal: `${record.requestedRoleLabel} 계정 신청`,
    coachGoal: '계정 승인 여부 확인 필요',
    nextAction: '계정 승인 검토',
    consultationResult: DEFAULT_STATUS,
    coachMemo: record.message,
    internalJudgment: `희망 아이디: ${record.username} / 연락처: ${record.phone}`,
    signupRequest: record,
  };
}

async function callSheetsSignup(record) {
  const { webAppUrl, apiSecret } = getConfig();
  const attempts = [
    { action: 'saveSignupRequest', payload: { action: 'saveSignupRequest', request: record } },
    { action: 'saveAccountSignup', payload: { action: 'saveAccountSignup', request: record } },
    { action: 'saveSignup', payload: { action: 'saveSignup', request: record } },
    { action: 'saveConsultation', payload: { action: 'saveConsultation', record: buildConsultationFallbackRecord(record) } },
  ];
  const errors = [];

  for (const attempt of attempts) {
    try {
      const payload = { ...attempt.payload, secret: apiSecret, apiSecret, token: apiSecret };
      const response = await fetch(buildScriptUrl(webAppUrl, attempt.action, apiSecret), {
        method: 'POST',
        cache: 'no-store',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      });
      const data = await parseResponse(response);

      if (response.ok && data?.ok !== false) {
        return { ok: true, action: attempt.action, data };
      }

      errors.push(`${attempt.action}: ${data?.error || data?.raw || response.status}`);
    } catch (error) {
      errors.push(`${attempt.action}: ${error?.message || 'unknown error'}`);
    }
  }

  throw new Error(errors.slice(0, 4).join(' / '));
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

export async function POST(request) {
  const wantsJson = (request.headers.get('content-type') || '').includes('application/json');
  const payload = await readPayload(request);
  const role = normalizeRole(payload.requestedRole);
  const record = {
    id: `SIGNUP-${Date.now()}`,
    requestedAt: new Date().toISOString(),
    requestedDate: new Date().toISOString().slice(0, 10),
    status: DEFAULT_STATUS,
    name: cleanEnvValue(payload.name),
    username: cleanEnvValue(payload.username),
    phone: cleanEnvValue(payload.phone),
    requestedRole: role,
    requestedRoleLabel: ROLE_LABELS[role] || ROLE_LABELS.member,
    message: cleanEnvValue(payload.message),
  };

  if (!record.name || !record.username || !record.phone) {
    if (wantsJson) return jsonResponse({ ok: false, error: '이름, 아이디, 연락처는 필수입니다.' }, 400);
    return buildRedirect(request, 'invalid', role);
  }

  try {
    const result = await callSheetsSignup(record);
    if (wantsJson) return jsonResponse({ ok: true, record, result });
    return buildRedirect(request, 'success', role);
  } catch (error) {
    if (wantsJson) return jsonResponse({ ok: false, error: error?.message || '가입 신청 저장 중 오류가 발생했습니다.' }, 500);
    return buildRedirect(request, 'error', role);
  }
}
