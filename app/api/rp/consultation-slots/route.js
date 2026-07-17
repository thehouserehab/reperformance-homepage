import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  ADMIN_COOKIE_NAME,
  hasStaffAccess,
  verifyAdminSessionCookie,
} from '../../../../lib/rpAdminAuth';
import {
  createDatabaseConsultationSlot,
  isDatabaseConfigured,
  isDatabaseConsultationSlotConflict,
  listAdminDatabaseConsultationSlots,
  listPublicDatabaseConsultationSlots,
  updateDatabaseConsultationSlotAvailability,
} from '../../../../lib/rpDatabase';
import { getConsultationAvailabilityPolicy } from '../../../../lib/rpConsultationAvailability';
import { buildRateLimitResponse, checkSharedRequestRateLimit } from '../../../../lib/rpRateLimit';
import {
  buildForbiddenOriginResponse,
  buildRequestTooLargeResponse,
  checkSameOriginRequest,
  checkRequestBodySize,
  REQUEST_SIZE_LIMITS,
} from '../../../../lib/rpRequestGuards';

export const dynamic = 'force-dynamic';

const READ_LIMIT = 120;
const WRITE_LIMIT = 80;
const WINDOW_MS = 15 * 60 * 1000;

async function requireStaffSession() {
  const cookieStore = await cookies();
  const session = await verifyAdminSessionCookie(cookieStore.get(ADMIN_COOKIE_NAME)?.value);

  if (!session) {
    return { response: NextResponse.json({ ok: false, error: '관리자 로그인이 필요합니다.' }, { status: 401 }) };
  }

  if (!hasStaffAccess(session)) {
    return { response: NextResponse.json({ ok: false, error: '관리자 또는 트레이너 권한이 필요합니다.' }, { status: 403 }) };
  }

  return { session };
}

async function checkLimit(request, action, identifier = '') {
  const retryAfterSeconds = await checkSharedRequestRateLimit({
    request,
    scope: `rp-consultation-slots:${action}`,
    identifier,
    limit: action === 'write' ? WRITE_LIMIT : READ_LIMIT,
    ipLimit: action === 'write' ? WRITE_LIMIT * 2 : READ_LIMIT,
    windowMs: WINDOW_MS,
  });

  return retryAfterSeconds
    ? buildRateLimitResponse(retryAfterSeconds, '예약 가능 시간 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.')
    : null;
}

export async function GET(request) {
  const url = new URL(request.url);
  const adminView = url.searchParams.get('view') === 'admin';

  if (adminView) {
    const auth = await requireStaffSession();
    if (auth.response) return auth.response;
    const limited = await checkLimit(request, 'read', auth.session.sub);
    if (limited) return limited;

    if (!isDatabaseConfigured()) {
      return NextResponse.json({ ok: false, setupRequired: true, slots: [], error: 'PostgreSQL 연결이 필요합니다.' });
    }

    try {
      const slots = await listAdminDatabaseConsultationSlots();
      return NextResponse.json({ ok: true, slots, count: slots.length });
    } catch (error) {
      return NextResponse.json({ ok: false, slots: [], error: error?.message || '예약 가능 시간을 불러오지 못했습니다.' }, { status: 500 });
    }
  }

  const limited = await checkLimit(request, 'read');
  if (limited) return limited;
  const policy = getConsultationAvailabilityPolicy();

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: true, slots: [], policy, availabilityConfigured: false });
  }

  try {
    const slots = await listPublicDatabaseConsultationSlots();
    return NextResponse.json({ ok: true, slots, count: slots.length, policy, availabilityConfigured: true });
  } catch (_) {
    return NextResponse.json(
      { ok: false, slots: [], policy, error: '예약 가능 시간을 불러오지 못했습니다. 일정 협의 요청을 선택해 주세요.' },
      { status: 503 },
    );
  }
}

export async function POST(request) {
  const originCheck = checkSameOriginRequest(request);
  if (!originCheck.ok) return buildForbiddenOriginResponse();
  const sizeCheck = checkRequestBodySize(request, REQUEST_SIZE_LIMITS.small);
  if (!sizeCheck.ok) return buildRequestTooLargeResponse(sizeCheck.maxBytes);

  const auth = await requireStaffSession();
  if (auth.response) return auth.response;
  const limited = await checkLimit(request, 'write', auth.session.sub);
  if (limited) return limited;

  try {
    const payload = await request.json().catch(() => ({}));
    const slot = await createDatabaseConsultationSlot({
      startsAt: payload.startsAt,
      endsAt: payload.endsAt,
      createdBy: auth.session.sub,
    });
    return NextResponse.json({ ok: true, slot }, { status: 201 });
  } catch (error) {
    const duplicate = isDatabaseConsultationSlotConflict(error);
    return NextResponse.json(
      { ok: false, error: duplicate ? '같은 시작 시간의 상담 가능 시간이 이미 있습니다.' : error?.message || '예약 가능 시간을 추가하지 못했습니다.' },
      { status: duplicate ? 409 : 400 },
    );
  }
}

export async function PATCH(request) {
  const originCheck = checkSameOriginRequest(request);
  if (!originCheck.ok) return buildForbiddenOriginResponse();
  const sizeCheck = checkRequestBodySize(request, REQUEST_SIZE_LIMITS.small);
  if (!sizeCheck.ok) return buildRequestTooLargeResponse(sizeCheck.maxBytes);

  const auth = await requireStaffSession();
  if (auth.response) return auth.response;
  const limited = await checkLimit(request, 'write', auth.session.sub);
  if (limited) return limited;

  try {
    const payload = await request.json().catch(() => ({}));
    if (typeof payload.isOpen !== 'boolean') throw new Error('공개 여부를 확인해 주세요.');
    const slot = await updateDatabaseConsultationSlotAvailability(payload.slotId, payload.isOpen);
    return NextResponse.json({ ok: true, slot });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error?.message || '예약 가능 시간 상태를 변경하지 못했습니다.' }, { status: 400 });
  }
}
