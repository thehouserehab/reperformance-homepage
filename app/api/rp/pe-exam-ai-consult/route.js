import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, verifyAdminSessionCookie } from '../../../../lib/rpAdminAuth';
import {
  isDatabaseConfigured,
  savePeExamAiConsultRequest,
} from '../../../../lib/rpDatabase';

export const dynamic = 'force-dynamic';

function cleanValue(value) {
  return String(value || '').trim();
}

function wantsJson(request) {
  const accept = request.headers.get('accept') || '';
  const contentType = request.headers.get('content-type') || '';
  return accept.includes('application/json') || contentType.includes('application/json');
}

function redirectTo(request, status) {
  const url = new URL('/pe-exam/ai-consult', request.url);
  url.searchParams.set('request', status);
  return NextResponse.redirect(url, 303);
}

function redirectToLogin(request) {
  const url = new URL('/login', request.url);
  url.searchParams.set('next', '/pe-exam/ai-consult');
  return NextResponse.redirect(url, 303);
}

async function readPayload(request) {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return request.json().catch(() => ({}));
  }

  const formData = await request.formData();
  const payload = {};

  for (const key of new Set(formData.keys())) {
    payload[key] = cleanValue(formData.get(key));
  }

  return payload;
}

function buildRequest(payload = {}, session) {
  const targetUniversity = cleanValue(payload.targetUniversity);
  const practicalRecords = cleanValue(payload.practicalRecords);
  const questionFocus = cleanValue(payload.questionFocus);

  if (!targetUniversity && !practicalRecords && !questionFocus) {
    const error = new Error('희망 대학, 실기 기록, 상담 목표 중 하나 이상은 입력해주세요.');
    error.status = 400;
    throw error;
  }

  return {
    username: session.sub,
    memberName: session.name,
    role: session.role,
    gradeLevel: cleanValue(payload.gradeLevel),
    admissionTrack: cleanValue(payload.admissionTrack) || '공통',
    targetUniversity,
    targetDepartment: cleanValue(payload.targetDepartment),
    schoolGrade: cleanValue(payload.schoolGrade),
    mockExam: cleanValue(payload.mockExam),
    practicalRecords,
    trainingContext: cleanValue(payload.trainingContext),
    injuryNote: cleanValue(payload.injuryNote),
    questionFocus,
    aiStatus: '도입 예정',
    source: 'pe-exam-ai-consult',
  };
}

export async function POST(request) {
  const jsonMode = wantsJson(request);
  const cookieStore = await cookies();
  const session = await verifyAdminSessionCookie(cookieStore.get(ADMIN_COOKIE_NAME)?.value);

  if (!session) {
    if (jsonMode) return NextResponse.json({ ok: false, error: '로그인이 필요합니다.' }, { status: 401 });
    return redirectToLogin(request);
  }

  try {
    if (!isDatabaseConfigured()) {
      if (jsonMode) {
        return NextResponse.json({ ok: false, error: 'DATABASE_URL 또는 RP_DATABASE_URL 환경변수가 필요합니다.' }, { status: 503 });
      }

      return redirectTo(request, 'setup');
    }

    const payload = await readPayload(request);
    const consultRequest = buildRequest(payload, session);
    const result = await savePeExamAiConsultRequest(consultRequest);

    if (jsonMode) return NextResponse.json({ ok: true, ...result });

    return redirectTo(request, 'success');
  } catch (error) {
    if (jsonMode) {
      return NextResponse.json(
        { ok: false, error: error?.message || 'AI 상담 사전 입력 저장 중 오류가 발생했습니다.' },
        { status: error?.status || 500 },
      );
    }

    return redirectTo(request, error?.status === 400 ? 'invalid' : 'error');
  }
}
