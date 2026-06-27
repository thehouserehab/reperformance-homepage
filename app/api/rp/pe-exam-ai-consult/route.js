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

function extractNumbers(value) {
  const matches = String(value || '')
    .replace(/,/g, '')
    .match(/\d+(?:\.\d+)?/g);

  return matches?.map((item) => Number(item)).filter((item) => Number.isFinite(item)) || [];
}

function firstNumber(value) {
  return extractNumbers(value)[0];
}

function includesAny(value, words) {
  const text = String(value || '').toLowerCase();
  return words.some((word) => text.includes(word.toLowerCase()));
}

function getGradeDirection(request) {
  const schoolGradeNumber = firstNumber(request.schoolGrade);
  const mockNumbers = extractNumbers(request.mockExam);
  const hasMock = mockNumbers.length > 0;

  if (request.admissionTrack === '수시') {
    if (schoolGradeNumber && schoolGradeNumber <= 2.5) {
      return '수시는 학생부 경쟁력이 있는 편입니다. 실기 배점이 큰 대학과 수능최저 유무를 함께 좁혀봅니다.';
    }

    if (schoolGradeNumber && schoolGradeNumber <= 4) {
      return '수시는 학생부와 실기 균형을 함께 봐야 합니다. 전형별 실기 반영률과 수능최저 부담을 나누어 확인합니다.';
    }

    return '수시 준비생은 내신 평균, 비교과, 수능최저 가능성을 먼저 정리해야 합니다. 희망 대학별 학생부 반영 방식 확인이 우선입니다.';
  }

  if (request.admissionTrack === '정시') {
    if (hasMock && mockNumbers.every((score) => score <= 3)) {
      return '정시는 수능 기반 후보군을 넓게 볼 수 있습니다. 실기 반영률이 높은 대학과 수능 반영 영역 조합을 함께 비교합니다.';
    }

    if (hasMock) {
      return '정시는 수능 보완과 실기 득점 전략을 같이 잡아야 합니다. 반영 영역 수가 적거나 실기 비중이 높은 대학을 우선 비교합니다.';
    }

    return '정시 준비생은 모의고사 등급과 실기 기록을 함께 입력하면 후보 대학을 더 정확히 좁힐 수 있습니다.';
  }

  if (schoolGradeNumber || hasMock) {
    return '수시와 정시 중 한쪽을 확정하기보다, 학생부와 모의고사 중 더 강한 축을 기준으로 전형을 나누어 비교합니다.';
  }

  return '성적 입력이 부족합니다. 내신 평균과 최근 모의고사 등급을 추가하면 수시·정시 우선순위를 더 뚜렷하게 정리할 수 있습니다.';
}

function getPracticalDirection(request) {
  const records = request.practicalRecords;

  if (!records) {
    return '실기 기록이 아직 없어 대학별 종목 기준과 현재 기록의 차이를 계산하기 어렵습니다. 제멀, 왕복달리기, 메디신볼처럼 종목별 기록을 나누어 적어주세요.';
  }

  const jumpRecord = includesAny(records, ['제멀', '제자리멀리', '멀리뛰기'])
    ? firstNumber(records.match(/(?:제멀|제자리멀리뛰기|멀리뛰기)[^\d]*(\d+(?:\.\d+)?)/i)?.[1] || '')
    : undefined;
  const shuttleRecord = includesAny(records, ['10m', '왕복'])
    ? firstNumber(records.match(/(?:10m|왕복)[^\d]*(\d+(?:\.\d+)?)/i)?.[1] || '')
    : undefined;
  const medBallRecord = includesAny(records, ['메디신', 'medicine'])
    ? firstNumber(records.match(/(?:메디신볼|메디신|medicine)[^\d]*(\d+(?:\.\d+)?)/i)?.[1] || '')
    : undefined;

  const comments = [];

  if (jumpRecord) {
    if (jumpRecord >= 270) comments.push('제자리멀리뛰기는 강점으로 활용할 수 있는 기록입니다.');
    else if (jumpRecord >= 240) comments.push('제자리멀리뛰기는 지원 대학 기준표와 비교해 보완 폭을 정해야 합니다.');
    else comments.push('제자리멀리뛰기는 우선 보완 종목으로 잡는 편이 좋습니다.');
  }

  if (shuttleRecord) {
    if (shuttleRecord <= 8.3) comments.push('10m 왕복달리기는 좋은 출발점입니다.');
    else if (shuttleRecord <= 8.9) comments.push('10m 왕복달리기는 스타트와 전환 동작을 중점 보완합니다.');
    else comments.push('10m 왕복달리기는 감점 폭이 커질 수 있어 우선순위를 높입니다.');
  }

  if (medBallRecord) {
    if (medBallRecord >= 10) comments.push('메디신볼은 강점 종목 후보입니다.');
    else comments.push('메디신볼은 상체 파워와 던지는 각도 교정이 필요합니다.');
  }

  if (comments.length) return comments.join(' ');

  return '실기 기록은 입력되었습니다. 대학별 상세 페이지의 종목 기준표와 비교해 강점 종목, 보완 종목, 위험 종목으로 나누어 봅니다.';
}

function getTargetDirection(request) {
  if (!request.targetUniversity && !request.targetDepartment) {
    return '희망 대학이 비어 있습니다. 지역별 대학 목록에서 수시/정시 후보군을 3단계로 나누어 적어두면 상담 정확도가 올라갑니다.';
  }

  const target = [request.targetUniversity, request.targetDepartment].filter(Boolean).join(' ');
  return `${target} 기준으로 전형방법, 실기 종목, 전년도 입결을 먼저 확인합니다. 같은 대학도 수시와 정시의 판단 기준이 다르므로 상세 페이지를 각각 비교합니다.`;
}

function getConditionDirection(request) {
  if (request.injuryNote) {
    return '부상·컨디션 메모가 있어 기록 향상 계획보다 회복 가능 범위와 무리 없는 종목 선택을 먼저 확인합니다.';
  }

  if (request.trainingContext) {
    return '운동 가능 시간이 입력되었습니다. 남은 기간 안에서 기록 상승 폭이 큰 종목부터 훈련 우선순위를 정합니다.';
  }

  return '운동 가능 시간과 컨디션 정보가 부족합니다. 주당 훈련 가능 횟수와 통증 여부를 추가하면 계획을 더 현실적으로 잡을 수 있습니다.';
}

function buildDirectionGuide(request) {
  const trackLabel = request.admissionTrack && request.admissionTrack !== '공통' ? request.admissionTrack : '수시·정시';

  return {
    title: `${trackLabel} 준비 방향 가이드`,
    summary:
      '입력한 성적, 실기 기록, 희망 대학을 기준으로 지금 먼저 확인할 항목을 정리했습니다. 실제 AI 정밀 상담 도입 전에는 상담 준비용 방향 가이드로 사용합니다.',
    cards: [
      {
        label: '01',
        title: '성적 방향',
        text: getGradeDirection(request),
      },
      {
        label: '02',
        title: '실기 방향',
        text: getPracticalDirection(request),
      },
      {
        label: '03',
        title: '희망 대학 확인',
        text: getTargetDirection(request),
      },
      {
        label: '04',
        title: '훈련·컨디션',
        text: getConditionDirection(request),
      },
    ],
    nextSteps: [
      '희망 대학을 1순위·대안·안전 후보로 나누어 다시 입력합니다.',
      '대학별 상세 페이지에서 같은 전형의 실기 종목과 입결 행을 확인합니다.',
      '현재 기록과 기준 기록의 차이가 큰 종목을 우선 보완합니다.',
      '상담 신청 시 이 입력 내용을 기준으로 최종 지원 방향을 점검합니다.',
    ],
  };
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
    aiStatus: '방향 가이드 생성',
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
    const payload = await readPayload(request);
    const consultRequest = buildRequest(payload, session);
    const guidance = buildDirectionGuide(consultRequest);

    if (!isDatabaseConfigured()) {
      if (jsonMode) {
        return NextResponse.json(
          {
            ok: false,
            error: 'DATABASE_URL 또는 RP_DATABASE_URL 환경변수가 필요합니다.',
            guidance,
            setupRequired: true,
          },
        );
      }

      return redirectTo(request, 'setup');
    }

    const result = await savePeExamAiConsultRequest({ ...consultRequest, guidance });

    if (jsonMode) return NextResponse.json({ ok: true, guidance, ...result });

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
