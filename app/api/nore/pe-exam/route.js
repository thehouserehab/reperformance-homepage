import { NextResponse } from 'next/server';
import { requestNorePeExamPlan, saveNorePeExamProfile } from '../../../../lib/noreClient';

export const dynamic = 'force-dynamic';

function normalizePlan(data) {
  const raw = data?.plan || data?.data?.plan || data?.data || data || {};
  const schedule = raw.schedule || raw.scheduleItems || raw.calendar || [];

  return {
    suggestion: raw.suggestion || raw.feedback || raw.summary || '',
    caution: raw.caution || raw.note || '',
    schedule: Array.isArray(schedule) ? schedule : [],
    raw,
  };
}

export async function POST(request) {
  try {
    const payload = await request.json().catch(() => ({}));
    const action = payload.action || 'saveAndSuggest';
    const profile = {
      workspace: 'pe-exam',
      targetUniversities: payload.targetUniversities || '',
      practicalRecords: payload.practicalRecords || '',
      trainingPlan: payload.trainingPlan || '',
      conditionCheck: payload.conditionCheck || '',
      admissionSchedule: payload.admissionSchedule || '',
    };

    if (action === 'saveProfile') {
      const result = await saveNorePeExamProfile(profile);
      return NextResponse.json({ ok: true, action, status: result.status, data: result.data });
    }

    if (action === 'requestPlan') {
      const result = await requestNorePeExamPlan(profile);
      return NextResponse.json({ ok: true, action, status: result.status, plan: normalizePlan(result.data), data: result.data });
    }

    const [profileResult, planResult] = await Promise.all([
      saveNorePeExamProfile(profile),
      requestNorePeExamPlan(profile),
    ]);

    return NextResponse.json({
      ok: true,
      action: 'saveAndSuggest',
      profileStatus: profileResult.status,
      planStatus: planResult.status,
      plan: normalizePlan(planResult.data),
      data: {
        profile: profileResult.data,
        plan: planResult.data,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || 'NORE 체대입시 연동 요청 중 오류가 발생했습니다.',
        detail: error?.data || null,
      },
      { status: error?.status || 500 },
    );
  }
}
