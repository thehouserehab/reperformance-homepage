/**
 * RePERFORMANCE consultation application Gmail notification bridge.
 *
 * Script Properties:
 * - RP_APPLICATION_NOTIFICATION_SECRET: random value with at least 32 characters
 * - RP_NOTIFICATION_EMAIL: recipient Gmail or Google Workspace address
 *
 * Deploy as a Web App that executes as the owner and is accessible to anyone.
 * Requests are authenticated by the secret stored only in Script Properties and Vercel.
 */

var RP_NOTIFICATION_EVENT = 'service_application.created';
var RP_NOTIFICATION_CACHE_SECONDS = 21600;

function getNotificationConfig_() {
  var properties = PropertiesService.getScriptProperties();
  return {
    secret: String(properties.getProperty('RP_APPLICATION_NOTIFICATION_SECRET') || '').trim(),
    recipient: String(properties.getProperty('RP_NOTIFICATION_EMAIL') || '').trim().toLowerCase()
  };
}

function verifyRpNotificationSetup() {
  var config = getNotificationConfig_();
  if (config.secret.length < 32) {
    throw new Error('RP_APPLICATION_NOTIFICATION_SECRET must contain at least 32 characters.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.recipient)) {
    throw new Error('RP_NOTIFICATION_EMAIL must be a valid email address.');
  }
  return {
    ok: true,
    secretConfigured: true,
    recipientMasked: config.recipient.replace(/^(.{1,2}).*(@.*)$/, '$1***$2')
  };
}

function sendRpNotificationTest() {
  verifyRpNotificationSetup();
  return sendApplicationNotification_({
    event: RP_NOTIFICATION_EVENT,
    adminUrl: 'https://reperformance.the-house-exercise.com/admin/clients',
    application: {
      id: 'notification-test-' + new Date().getTime(),
      serviceLabel: 'Gmail 알림 연동 테스트',
      applicantNameMasked: '테**',
      visitLabel: '테스트 일정 / 실제 상담 신청 아님'
    }
  });
}

function doPost(e) {
  try {
    var body = e && e.postData && e.postData.contents
      ? JSON.parse(e.postData.contents)
      : {};
    var config = getNotificationConfig_();
    assertAuthorized_(body.token, config.secret);

    if (body.action !== 'sendApplicationNotification') {
      throw new Error('Unsupported notification action.');
    }

    return json_({
      ok: true,
      result: sendApplicationNotification_(body.payload || {})
    });
  } catch (error) {
    console.error('RePERFORMANCE notification request failed.');
    return json_({ ok: false, error: 'Notification request failed.' });
  }
}

function assertAuthorized_(providedToken, expectedToken) {
  if (!expectedToken || expectedToken.length < 32) {
    throw new Error('Notification secret is not configured.');
  }
  if (!providedToken || String(providedToken) !== expectedToken) {
    throw new Error('Unauthorized notification request.');
  }
}

function cleanNotificationText_(value, maxLength) {
  return String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength || 200);
}

function sendApplicationNotification_(payload) {
  if (!payload || payload.event !== RP_NOTIFICATION_EVENT) {
    throw new Error('Unsupported application notification event.');
  }

  var config = getNotificationConfig_();
  if (!config.recipient) throw new Error('Notification recipient is not configured.');

  var application = payload.application || {};
  var applicationId = cleanNotificationText_(application.id, 80);
  var cacheKey = applicationId ? 'rp-notification-' + applicationId : '';
  var cache = CacheService.getScriptCache();
  var lock = LockService.getScriptLock();

  lock.waitLock(5000);
  try {
    if (cacheKey && cache.get(cacheKey) === 'sent') {
      return { delivered: true, duplicate: true, channel: 'gmail' };
    }

    var serviceLabel = cleanNotificationText_(application.serviceLabel, 80) || '서비스 확인 필요';
    var applicantName = cleanNotificationText_(application.applicantNameMasked, 30) || '신청자';
    var visitLabel = cleanNotificationText_(application.visitLabel, 80) || '일정 협의 요청';
    var adminUrl = cleanNotificationText_(payload.adminUrl, 300);
    var subject = '[RePERFORMANCE] ' + serviceLabel + ' 신규 상담 신청';
    var message = [
      'RePERFORMANCE 홈페이지에 신규 상담 신청이 저장되었습니다.',
      '',
      '서비스: ' + serviceLabel,
      '신청자: ' + applicantName,
      '희망 시간: ' + visitLabel,
      '',
      '관리자 화면에서 연락처와 신청 내용을 확인하세요.',
      adminUrl,
      '',
      '보안을 위해 이 메일에는 전화번호, 건강정보, 성적, 실기 기록을 포함하지 않습니다.'
    ].join('\n');

    MailApp.sendEmail({
      to: config.recipient,
      subject: subject,
      body: message,
      name: 'RePERFORMANCE 홈페이지'
    });

    if (cacheKey) cache.put(cacheKey, 'sent', RP_NOTIFICATION_CACHE_SECONDS);
    return { delivered: true, duplicate: false, channel: 'gmail' };
  } finally {
    lock.releaseLock();
  }
}

function json_(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
