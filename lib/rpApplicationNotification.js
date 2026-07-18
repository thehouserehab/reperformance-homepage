import crypto from 'node:crypto';
import { fetchWithTimeout } from './rpOutboundFetch.js';

function cleanValue(value) {
  return String(value || '').trim();
}

function getNotificationUrl() {
  return cleanValue(process.env.RP_APPLICATION_NOTIFICATION_WEBHOOK_URL);
}

function getNotificationSecret() {
  return cleanValue(process.env.RP_APPLICATION_NOTIFICATION_WEBHOOK_SECRET);
}

function getSiteUrl() {
  return cleanValue(
    process.env.RP_SITE_URL
    || process.env.NEXT_PUBLIC_SITE_URL
    || 'https://reperformance.the-house-exercise.com',
  ).replace(/\/$/, '');
}

function maskName(value) {
  const name = cleanValue(value);
  if (!name) return '신청자';
  if (name.length === 1) return `${name}*`;
  return `${name.slice(0, 1)}${'*'.repeat(Math.min(2, name.length - 1))}`;
}

function formatSeoulDateTime(value) {
  if (!value) return '일정 협의 요청';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '일정 협의 요청';
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function getApplicationNotificationStatus() {
  return {
    configured: Boolean(getNotificationUrl()),
    signed: Boolean(getNotificationSecret()),
  };
}

export async function sendApplicationNotification(application = {}) {
  const webhookUrl = getNotificationUrl();
  if (!webhookUrl) return { ok: true, skipped: true, reason: 'not_configured' };

  const requestedVisitAt = application.consultationSlot?.startsAt || null;
  const visitLabel = formatSeoulDateTime(requestedVisitAt);
  const adminUrl = `${getSiteUrl()}/admin/clients`;
  const payload = {
    event: 'service_application.created',
    occurredAt: new Date().toISOString(),
    text: [
      '[RePERFORMANCE] 신규 상담 신청',
      `서비스: ${cleanValue(application.serviceLabel) || '확인 필요'}`,
      `신청자: ${maskName(application.name)}`,
      `희망 시간: ${visitLabel}`,
      `관리: ${adminUrl}`,
    ].join('\n'),
    application: {
      id: cleanValue(application.id),
      clientId: cleanValue(application.clientId),
      service: cleanValue(application.selectedService),
      serviceLabel: cleanValue(application.serviceLabel),
      applicantNameMasked: maskName(application.name),
      requestedVisitAt,
      visitLabel,
      scheduleCoordinationRequested: !requestedVisitAt,
    },
    adminUrl,
  };
  const body = JSON.stringify(payload);
  const timestamp = String(Date.now());
  const secret = getNotificationSecret();
  const signature = secret
    ? crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')
    : '';
  const response = await fetchWithTimeout(
    webhookUrl,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'RePERFORMANCE-Application-Notification/1.0',
        ...(signature ? {
          'X-RP-Webhook-Timestamp': timestamp,
          'X-RP-Webhook-Signature': `sha256=${signature}`,
        } : {}),
      },
      body,
      cache: 'no-store',
      redirect: 'error',
    },
    {
      envKey: 'RP_APPLICATION_NOTIFICATION_TIMEOUT_MS',
      fallbackMs: 5000,
      minMs: 1000,
      maxMs: 15000,
    },
  );

  if (!response.ok) {
    throw new Error(`Application notification webhook returned HTTP ${response.status}.`);
  }

  return { ok: true, skipped: false };
}
