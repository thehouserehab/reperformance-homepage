import { NextResponse } from 'next/server';
import { analyzeNoreMealPhoto } from '../../../../lib/noreClient';

export const dynamic = 'force-dynamic';

function normalizeAnalysis(data) {
  const raw = data?.analysis || data?.data?.analysis || data?.data || data || {};
  const macros = raw.macros || raw.nutrients || {};

  return {
    analysisId: raw.analysisId || raw.id || data?.id || '',
    calories: raw.calories ?? raw.kcal ?? raw.totalCalories ?? null,
    carbohydrates: raw.carbohydrates ?? raw.carbs ?? macros.carbohydrates ?? macros.carbs ?? null,
    protein: raw.protein ?? macros.protein ?? null,
    fat: raw.fat ?? macros.fat ?? null,
    draftFeedback: raw.draftFeedback || raw.feedbackDraft || raw.recommendation || raw.feedback || '',
    items: Array.isArray(raw.items) ? raw.items : [],
    raw,
  };
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const photo = formData.get('photo');

    if (!photo || typeof photo.arrayBuffer !== 'function' || !photo.size) {
      return NextResponse.json({ ok: false, error: '분석할 음식 사진을 업로드해주세요.' }, { status: 400 });
    }

    const result = await analyzeNoreMealPhoto(formData);

    return NextResponse.json({
      ok: true,
      status: result.status,
      analysis: normalizeAnalysis(result.data),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || 'NORE 식단 분석 요청 중 오류가 발생했습니다.',
        detail: error?.data || null,
      },
      { status: error?.status || 500 },
    );
  }
}
