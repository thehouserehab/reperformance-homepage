import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  ADMIN_COOKIE_NAME,
  hasStaffRole,
  verifyAdminSessionCookie,
} from '../../../../lib/rpAdminAuth';
import { buildRateLimitResponse, checkSharedRequestRateLimit } from '../../../../lib/rpRateLimit';
import {
  buildForbiddenOriginResponse,
  buildRequestTooLargeResponse,
  checkSameOriginRequest,
  checkRequestBodySize,
  REQUEST_SIZE_LIMITS,
} from '../../../../lib/rpRequestGuards';

export const dynamic = 'force-dynamic';

const SUMMARY_WINDOW_MS = 60 * 60 * 1000;
const SUMMARY_LIMIT = 30;
const SUMMARY_IP_LIMIT = 120;

function cleanText(value) {
  return String(value || '').trim();
}

function formatList(value, fallback = '없음') {
  if (Array.isArray(value) && value.length) return value.join(', ');
  if (typeof value === 'string' && value.trim()) return value.trim();
  return fallback;
}

function isPeExamClient(client, record) {
  const text = [
    client?.memberType,
    client?.goal,
    record?.memberGoal,
    record?.coachGoal,
    formatList(client?.purpose, ''),
    formatList(record?.purposes, ''),
  ].join(' ');

  return text.includes('체대입시') || text.includes('입시');
}

function formatPeExamHeadline(record) {
  return [
    record?.peExamTargetUniversities || '희망 대학 미입력',
    record?.peExamTargetDepartment || '목표 학과 미입력',
    formatList(record?.peExamPracticalEvents, '실기 종목 미입력'),
  ].join(' · ');
}

function fallbackClientSummary(client, record, phase) {
  if (isPeExamClient(client, record)) {
    return [
      `${client?.name || '회원'}님은 체대입시 준비를 위해 운동 관리와 입시 상담을 함께 진행합니다.`,
      `현재 목표는 ${formatPeExamHeadline(record)} 기준으로 정리 중입니다.`,
      `실기 준비는 ${record?.peExamTrainingFocus || record?.coachGoal || '부족한 체력 요소와 종목별 기록을 확인한 뒤'} 단계적으로 보완합니다.`,
      `다음 단계는 ${record?.nextAction || '실기 기록 측정과 지원 전략 상담'}입니다.`,
    ].join('\n');
  }

  const painAreas = formatList(record?.painAreas, '특이 불편 부위 없음');
  return [
    `${client?.name || '회원'}님은 ${record?.memberGoal || client?.goal || '운동 목표 확인'}을 중심으로 상담을 진행 중입니다.`,
    `현재 확인된 불편감은 ${painAreas}이며 통증 강도는 ${record?.painScore || 0}/10입니다.`,
    `초기 운동 방향은 ${phase?.clientLabel || '움직임 안정화 단계'}를 기준으로 안전한 범위에서 시작합니다.`,
    `다음 단계는 ${record?.nextAction || '초기 평가 예약'}입니다.`,
  ].join('\n');
}

function fallbackCoachSummary(client, record, phase) {
  const peExamLines = isPeExamClient(client, record) ? [
    `- 체대입시 목표: ${formatPeExamHeadline(record)}`,
    `- 현재 실기 기록: ${record?.peExamRecordStatus || '미입력'}`,
    `- 내신/수능 상태: ${record?.peExamAcademicStatus || '미입력'}`,
    `- 입시 상담 주제: ${formatList(record?.peExamConsultingTopics, '미입력')}`,
    `- 원서 전략: ${record?.peExamApplicationStrategy || '미입력'}`,
  ] : [];

  return [
    '코치 상담 요약',
    `- 회원 목표: ${record?.memberGoal || client?.goal || '미입력'}`,
    `- 코치 목표: ${record?.coachGoal || '미입력'}`,
    ...peExamLines,
    `- 불편 부위: ${formatList(record?.painAreas, '특이사항 없음')}`,
    `- 통증 강도: ${record?.painScore || 0}/10`,
    `- PAR-Q: ${client?.parqStatus || '확인 필요'} / ${formatList(client?.parqYesItems, '예 체크 항목 없음')}`,
    `- 권장 단계: ${phase?.label || '미선택'} ${phase?.clientLabel ? `· ${phase.clientLabel}` : ''}`,
    `- 다음 액션: ${record?.nextAction || '미입력'}`,
  ].join('\n');
}

function extractResponseText(data) {
  if (typeof data?.output_text === 'string') return data.output_text;

  const parts = [];
  if (Array.isArray(data?.output)) {
    data.output.forEach((item) => {
      if (Array.isArray(item?.content)) {
        item.content.forEach((content) => {
          if (content?.type === 'output_text' && content?.text) parts.push(content.text);
          if (content?.type === 'text' && content?.text) parts.push(content.text);
        });
      }
    });
  }

  return parts.join('\n').trim();
}

function parseJsonObject(text) {
  const cleaned = cleanText(text).replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch (_) {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch (_) {}
    }
  }

  return null;
}

function buildPrompt(client, record, phase) {
  const peExamClient = isPeExamClient(client, record);

  return JSON.stringify({
    task: peExamClient
      ? 'RePERFORMANCE 체대입시생 상담 내용을 바탕으로 고객용 짧은 요약과 코치용 내부 요약을 작성합니다. 운동 관리와 입시 상담을 함께 정리하되, 합격 보장이나 의료 진단처럼 표현하지 않습니다.'
      : 'RePERFORMANCE 운동 상담 내용을 바탕으로 고객용 짧은 요약과 코치용 내부 요약을 작성합니다. 의료 진단처럼 표현하지 말고, 운동 상담 보조 정보로만 정리합니다.',
    requiredOutput: {
      clientSummary: peExamClient
        ? '고객에게 보여줄 수 있는 한국어 3~4문장. 체대입시 운동 준비와 입시상담 방향을 함께 설명. 쉽고 안심되는 표현. 합격 보장, 내부 판단, 위험한 단정, 진단명 금지.'
        : '고객에게 보여줄 수 있는 한국어 3~4문장. 쉽고 안심되는 표현. 내부 판단, 위험한 단정, 진단명 금지.',
      coachSummary: peExamClient
        ? '코치가 참고할 한국어 bullet 6~8개. 실기 기록, 부족 체력, 내신/수능, 지원전략, 부상관리, 다음 액션 포함.'
        : '코치가 참고할 한국어 bullet 5~7개. 확인할 질문, 주의점, 다음 액션 포함.',
    },
    client: {
      id: client?.id,
      name: client?.name,
      memberType: client?.memberType,
      status: client?.status,
      parqStatus: client?.parqStatus,
      parqYesItems: client?.parqYesItems || [],
      existingGoal: client?.goal,
      existingConcern: client?.concern,
    },
    consultation: {
      memberGoal: record?.memberGoal,
      coachGoal: record?.coachGoal,
      purposes: record?.purposes || [],
      painAreas: record?.painAreas || [],
      painScore: record?.painScore,
      symptomMoves: record?.symptomMoves,
      weeklyFrequency: record?.weeklyFrequency,
      selectedPhase: phase?.label,
      selectedPhaseClientLabel: phase?.clientLabel,
      recommendedProgram: record?.recommendedProgram,
      consultationResult: record?.consultationResult,
      nextAction: record?.nextAction,
      internalJudgment: record?.internalJudgment,
      peExam: peExamClient ? {
        targetUniversities: record?.peExamTargetUniversities,
        targetDepartment: record?.peExamTargetDepartment,
        academicStatus: record?.peExamAcademicStatus,
        practicalEvents: record?.peExamPracticalEvents || [],
        recordStatus: record?.peExamRecordStatus,
        trainingFocus: record?.peExamTrainingFocus,
        consultingTopics: record?.peExamConsultingTopics || [],
        applicationStrategy: record?.peExamApplicationStrategy,
      } : null,
    },
  });
}

async function callOpenAI({ client, record, phase }) {
  const apiKey = cleanText(process.env.OPENAI_API_KEY);
  if (!apiKey) return null;

  const model = cleanText(process.env.OPENAI_MODEL) || 'gpt-5.4-mini';
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      store: false,
      max_output_tokens: 700,
      instructions: 'You are a Korean exercise consultation assistant for RePERFORMANCE. Return only a valid JSON object with clientSummary and coachSummary string fields. Do not diagnose or claim medical certainty.',
      input: buildPrompt(client, record, phase),
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.error) {
    throw new Error(data?.error?.message || `OpenAI 요청 실패: ${response.status}`);
  }

  const outputText = extractResponseText(data);
  const parsed = parseJsonObject(outputText);

  return {
    model,
    rawText: outputText,
    clientSummary: cleanText(parsed?.clientSummary),
    coachSummary: cleanText(parsed?.coachSummary),
  };
}

export async function POST(request) {
  const originCheck = checkSameOriginRequest(request);
  if (!originCheck.ok) return buildForbiddenOriginResponse();

  const sizeCheck = checkRequestBodySize(request, REQUEST_SIZE_LIMITS.medium);
  if (!sizeCheck.ok) return buildRequestTooLargeResponse(sizeCheck.maxBytes);

  const cookieStore = await cookies();
  const session = await verifyAdminSessionCookie(cookieStore.get(ADMIN_COOKIE_NAME)?.value);

  if (!session) return NextResponse.json({ ok: false, error: '로그인이 필요합니다.' }, { status: 401 });
  if (!hasStaffRole(session.role)) return NextResponse.json({ ok: false, error: '상담 요약 권한이 없습니다.' }, { status: 403 });

  const retryAfterSeconds = await checkSharedRequestRateLimit({
    request,
    scope: 'consultation-summary',
    identifier: session.sub,
    limit: SUMMARY_LIMIT,
    ipLimit: SUMMARY_IP_LIMIT,
    windowMs: SUMMARY_WINDOW_MS,
  });
  if (retryAfterSeconds) return buildRateLimitResponse(retryAfterSeconds);

  const payload = await request.json().catch(() => ({}));
  const { client, record, phase } = payload;
  const fallback = {
    clientSummary: fallbackClientSummary(client, record, phase),
    coachSummary: fallbackCoachSummary(client, record, phase),
  };

  try {
    const ai = await callOpenAI({ client, record, phase });

    if (!ai) {
      return NextResponse.json({ ok: true, source: 'fallback', ...fallback, warning: 'OPENAI_API_KEY가 설정되지 않아 기본 요약을 사용했습니다.' });
    }

    return NextResponse.json({
      ok: true,
      source: 'openai',
      model: ai.model,
      clientSummary: ai.clientSummary || fallback.clientSummary,
      coachSummary: ai.coachSummary || ai.rawText || fallback.coachSummary,
    });
  } catch (error) {
    return NextResponse.json({
      ok: true,
      source: 'fallback',
      ...fallback,
      warning: error?.message || 'AI 요약 생성 중 오류가 발생해 기본 요약을 사용했습니다.',
    });
  }
}
