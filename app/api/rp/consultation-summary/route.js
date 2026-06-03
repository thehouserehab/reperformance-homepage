import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function cleanText(value) {
  return String(value || '').trim();
}

function formatList(value, fallback = '없음') {
  if (Array.isArray(value) && value.length) return value.join(', ');
  if (typeof value === 'string' && value.trim()) return value.trim();
  return fallback;
}

function fallbackClientSummary(client, record, phase) {
  const painAreas = formatList(record?.painAreas, '특이 불편 부위 없음');
  return [
    `${client?.name || '회원'}님은 ${record?.memberGoal || client?.goal || '운동 목표 확인'}을 중심으로 상담을 진행 중입니다.`,
    `현재 확인된 불편감은 ${painAreas}이며 통증 강도는 ${record?.painScore || 0}/10입니다.`,
    `초기 운동 방향은 ${phase?.clientLabel || '움직임 안정화 단계'}를 기준으로 안전한 범위에서 시작합니다.`,
    `다음 단계는 ${record?.nextAction || '초기 평가 예약'}입니다.`,
  ].join('\n');
}

function fallbackCoachSummary(client, record, phase) {
  return [
    '코치 상담 요약',
    `- 회원 목표: ${record?.memberGoal || client?.goal || '미입력'}`,
    `- 코치 목표: ${record?.coachGoal || '미입력'}`,
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
  return JSON.stringify({
    task: 'RePERFORMANCE 운동 상담 내용을 바탕으로 고객용 짧은 요약과 코치용 내부 요약을 작성합니다. 의료 진단처럼 표현하지 말고, 운동 상담 보조 정보로만 정리합니다.',
    requiredOutput: {
      clientSummary: '고객에게 보여줄 수 있는 한국어 3~4문장. 쉽고 안심되는 표현. 내부 판단, 위험한 단정, 진단명 금지.',
      coachSummary: '코치가 참고할 한국어 bullet 5~7개. 확인할 질문, 주의점, 다음 액션 포함.',
    },
    client: {
      id: client?.id,
      name: client?.name,
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
