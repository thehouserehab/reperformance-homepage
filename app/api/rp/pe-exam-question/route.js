import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME } from '../../../../lib/rpAdminAuth';
import { verifyActiveSessionCookie } from '../../../../lib/rpSessionAuth';
import {
  isDatabaseConfigured,
  savePeExamQuestion,
} from '../../../../lib/rpDatabase';
import { getPublicErrorStatus, getSafePublicErrorMessage } from '../../../../lib/rpPublicErrors';
import { buildRateLimitResponse, checkSharedRequestRateLimit } from '../../../../lib/rpRateLimit';
import {
  buildForbiddenOriginResponse,
  buildRequestTooLargeResponse,
  checkSameOriginRequest,
  checkRequestBodySize,
  REQUEST_SIZE_LIMITS,
} from '../../../../lib/rpRequestGuards';

export const dynamic = 'force-dynamic';

const QUESTION_WINDOW_MS = 60 * 60 * 1000;
const QUESTION_LIMIT = 12;
const QUESTION_IP_LIMIT = 80;

function cleanValue(value) {
  return String(value || '').trim();
}

function wantsJson(request) {
  const accept = request.headers.get('accept') || '';
  const contentType = request.headers.get('content-type') || '';
  return accept.includes('application/json') || contentType.includes('application/json');
}

function redirectTo(request, status) {
  const url = new URL('/pe-exam/faq', request.url);
  url.searchParams.set('question', status);
  return NextResponse.redirect(url, 303);
}

function redirectToLogin(request) {
  const url = new URL('/login', request.url);
  url.searchParams.set('next', '/pe-exam/faq');
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

function buildQuestion(payload = {}, session) {
  const questionText = cleanValue(payload.questionText);

  if (!questionText) {
    const error = new Error('질문 내용을 입력해 주세요.');
    error.status = 400;
    throw error;
  }

  if (questionText.length > 4000) {
    const error = new Error('질문은 4000자 이내로 입력해 주세요.');
    error.status = 400;
    throw error;
  }

  return {
    username: session.sub,
    memberName: session.name,
    role: session.role,
    questionType: cleanValue(payload.questionType) || '기타',
    admissionTrack: cleanValue(payload.admissionTrack) || '공통',
    targetUniversity: cleanValue(payload.targetUniversity),
    questionText,
    source: 'pe-exam-faq',
  };
}

export async function POST(request) {
  const jsonMode = wantsJson(request);
  const originCheck = checkSameOriginRequest(request);
  if (!originCheck.ok) return buildForbiddenOriginResponse();

  const sizeCheck = checkRequestBodySize(request, REQUEST_SIZE_LIMITS.small);
  if (!sizeCheck.ok) return buildRequestTooLargeResponse(sizeCheck.maxBytes);

  const cookieStore = await cookies();
  const session = await verifyActiveSessionCookie(cookieStore.get(ADMIN_COOKIE_NAME)?.value);

  if (!session) {
    if (jsonMode) return NextResponse.json({ ok: false, error: '로그인이 필요합니다.' }, { status: 401 });
    return redirectToLogin(request);
  }

  try {
    const retryAfterSeconds = await checkSharedRequestRateLimit({
      request,
      scope: 'pe-exam-question-submit',
      identifier: session.sub,
      limit: QUESTION_LIMIT,
      ipLimit: QUESTION_IP_LIMIT,
      windowMs: QUESTION_WINDOW_MS,
    });
    if (retryAfterSeconds) return buildRateLimitResponse(retryAfterSeconds);

    if (!isDatabaseConfigured()) {
      if (jsonMode) {
        return NextResponse.json({ ok: false, error: '질문 저장소 설정이 아직 완료되지 않았습니다.' }, { status: 503 });
      }

      return redirectTo(request, 'setup');
    }

    const payload = await readPayload(request);
    const question = buildQuestion(payload, session);
    const result = await savePeExamQuestion(question);

    if (jsonMode) return NextResponse.json({ ok: true, ...result });

    return redirectTo(request, 'success');
  } catch (error) {
    if (jsonMode) {
      return NextResponse.json(
        { ok: false, error: getSafePublicErrorMessage(error, '질문 저장 중 오류가 발생했습니다.') },
        { status: getPublicErrorStatus(error) },
      );
    }

    return redirectTo(request, error?.status === 400 ? 'invalid' : 'error');
  }
}
