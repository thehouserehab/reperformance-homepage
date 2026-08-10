import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  ADMIN_COOKIE_NAME,
  hasStaffRole,
} from '../../../../lib/rpAdminAuth';
import {
  getApplicationNotificationStatus,
  sendApplicationNotification,
} from '../../../../lib/rpApplicationNotification';
import { buildRateLimitResponse, checkSharedRequestRateLimit } from '../../../../lib/rpRateLimit';
import {
  buildForbiddenOriginResponse,
  checkSameOriginRequest,
} from '../../../../lib/rpRequestGuards';
import { recordSecurityEvent } from '../../../../lib/rpSecurityEvents';
import { verifyActiveSessionCookie } from '../../../../lib/rpSessionAuth';

export const dynamic = 'force-dynamic';

const TEST_WINDOW_MS = 60 * 60 * 1000;
const TEST_LIMIT = 5;

function redirectToAdmin(request, result) {
  const url = new URL('/admin', request.url);
  url.searchParams.set('notificationTest', result);
  return NextResponse.redirect(url, 303);
}

export async function POST(request) {
  const originCheck = checkSameOriginRequest(request, { allowMissingOrigin: false });
  if (!originCheck.ok) return buildForbiddenOriginResponse();

  const cookieStore = await cookies();
  const session = await verifyActiveSessionCookie(cookieStore.get(ADMIN_COOKIE_NAME)?.value);

  if (!session) return NextResponse.json({ ok: false, error: '로그인이 필요합니다.' }, { status: 401 });
  if (!hasStaffRole(session.role)) {
    return NextResponse.json({ ok: false, error: '알림 테스트 권한이 없습니다.' }, { status: 403 });
  }

  const retryAfterSeconds = await checkSharedRequestRateLimit({
    request,
    scope: 'application-notification-test',
    identifier: session.sub,
    limit: TEST_LIMIT,
    ipLimit: TEST_LIMIT * 2,
    windowMs: TEST_WINDOW_MS,
  });
  if (retryAfterSeconds) {
    return buildRateLimitResponse(retryAfterSeconds, '테스트 알림은 시간당 5회까지만 보낼 수 있습니다.');
  }

  const status = getApplicationNotificationStatus();
  if (!status.configured) {
    await recordSecurityEvent({
      request,
      eventType: 'application_notification_test',
      outcome: 'not_configured',
      actor: session.sub,
      metadata: { provider: status.provider },
    });
    return redirectToAdmin(request, 'not-configured');
  }

  try {
    const result = await sendApplicationNotification({
      id: `manual-notification-test-${Date.now()}`,
      clientId: 'manual-notification-test',
      name: '테스트',
      selectedService: 'notification-test',
      serviceLabel: 'Gmail 알림 연동 테스트',
      consultationSlot: null,
    });

    if (!result.ok || result.skipped) throw new Error('Notification provider did not confirm delivery.');

    await recordSecurityEvent({
      request,
      eventType: 'application_notification_test',
      outcome: 'success',
      actor: session.sub,
      metadata: { provider: result.provider },
    });
    return redirectToAdmin(request, 'sent');
  } catch (_) {
    await recordSecurityEvent({
      request,
      eventType: 'application_notification_test',
      outcome: 'failed',
      actor: session.sub,
      metadata: { provider: status.provider },
    });
    return redirectToAdmin(request, 'failed');
  }
}
