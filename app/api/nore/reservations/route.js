import { NextResponse } from 'next/server';
import { callNoreReservationAction } from '../../../../lib/noreClient';

export const dynamic = 'force-dynamic';

function normalizeSlots(data) {
  const raw = data?.slots || data?.data?.slots || data?.recommendations || data?.data?.recommendations || [];
  if (!Array.isArray(raw)) return [];

  return raw.map((slot) => {
    if (typeof slot === 'string') return { label: slot, value: slot };

    return {
      label: slot.label || [slot.date, slot.startTime || slot.start, slot.endTime || slot.end].filter(Boolean).join(' '),
      value: slot.value || slot.id || '',
      date: slot.date || '',
      startTime: slot.startTime || slot.start || '',
      endTime: slot.endTime || slot.end || '',
      memo: slot.memo || slot.reason || '',
    };
  });
}

export async function GET(request) {
  const url = new URL(request.url);
  const payload = {
    serviceType: url.searchParams.get('serviceType') || '',
    preferredDate: url.searchParams.get('preferredDate') || '',
    preferredTime: url.searchParams.get('preferredTime') || '',
    coachId: url.searchParams.get('coachId') || '',
  };

  try {
    const result = await callNoreReservationAction('recommendSlots', payload);
    return NextResponse.json({ ok: true, status: result.status, slots: normalizeSlots(result.data), data: result.data });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || 'NORE 예약 추천 요청 중 오류가 발생했습니다.',
        detail: error?.data || null,
      },
      { status: error?.status || 500 },
    );
  }
}

export async function POST(request) {
  try {
    const payload = await request.json().catch(() => ({}));
    const action = payload.action || 'recommendSlots';
    const result = await callNoreReservationAction(action, payload);

    return NextResponse.json({
      ok: true,
      action,
      status: result.status,
      slots: action === 'recommendSlots' ? normalizeSlots(result.data) : [],
      data: result.data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || 'NORE 예약 연동 요청 중 오류가 발생했습니다.',
        detail: error?.data || null,
      },
      { status: error?.status || 500 },
    );
  }
}
