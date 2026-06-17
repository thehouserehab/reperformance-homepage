import { NextResponse } from 'next/server';
import { sendNoreNutritionFeedback } from '../../../../lib/noreClient';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const payload = await request.json().catch(() => ({}));
    const feedback = String(payload.feedback || payload.editedFeedback || '').trim();

    if (!feedback) {
      return NextResponse.json({ ok: false, error: '전송할 피드백 내용을 입력해주세요.' }, { status: 400 });
    }

    const result = await sendNoreNutritionFeedback({
      analysisId: payload.analysisId || '',
      memberReference: payload.memberReference || '',
      workspace: payload.workspace || 'member',
      feedback,
      coachMemo: payload.coachMemo || '',
    });

    return NextResponse.json({ ok: true, status: result.status, data: result.data });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || 'NORE 피드백 전송 중 오류가 발생했습니다.',
        detail: error?.data || null,
      },
      { status: error?.status || 500 },
    );
  }
}
