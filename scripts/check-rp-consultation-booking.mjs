import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

async function importSource(relativePath) {
  const source = read(relativePath);
  const url = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
  return import(url);
}

const availability = await importSource('lib/rpConsultationAvailability.js');

assert.equal(availability.normalizeConsultationActivityPreference('consultation-only'), 'consultation-only');
assert.equal(
  availability.normalizeConsultationActivityPreference('consultation-and-light-exercise'),
  'consultation-and-light-exercise',
);
assert.equal(availability.normalizeConsultationActivityPreference('full-training-session'), '');
assert.equal(availability.normalizeConsultationSlotId('flexible'), 'flexible');
assert.equal(availability.normalizeConsultationSlotId('SLOT-20260714-ABCD'), 'SLOT-20260714-ABCD');
assert.equal(availability.normalizeConsultationSlotId('../private'), '');

const window = availability.normalizeConsultationSlotWindow({
  startsAt: '2026-07-20T01:00:00.000Z',
  endsAt: '2026-07-20T01:30:00.000Z',
});
assert.equal(window.durationMinutes, 30);
assert.throws(() => availability.normalizeConsultationSlotWindow({
  startsAt: '2026-07-20T01:00:00.000Z',
  endsAt: '2026-07-20T02:00:00.000Z',
}));
assert.throws(() => availability.normalizeConsultationSlotWindow({
  startsAt: '2026-07-19T01:00:00.000Z',
  endsAt: '2026-07-19T01:30:00.000Z',
}));
assert.throws(() => availability.normalizeConsultationSlotWindow({
  startsAt: '2026-07-20T00:15:00.000Z',
  endsAt: '2026-07-20T00:45:00.000Z',
}));

const generatedSlots = availability.buildDefaultConsultationSlots({
  now: new Date('2026-07-19T00:00:00.000Z'),
});
assert.ok(generatedSlots.length > 0, 'weekday default consultation slots must be generated');
assert.ok(generatedSlots.every((slot) => slot.id.startsWith('AUTO-')));
assert.ok(generatedSlots.every((slot) => (
  new Date(slot.endsAt).getTime() - new Date(slot.startsAt).getTime()
) === 30 * 60 * 1000));

const migration = read('database/migrations/20260714_consultation_availability.sql');
for (const fragment of [
  'CREATE TABLE IF NOT EXISTS rp_consultation_slots',
  'consultation_slot_id',
  'consultation_activity_preference',
  'rp_clients_active_consultation_slot_unique_idx',
]) {
  assert.ok(migration.includes(fragment), `booking migration must include ${fragment}`);
}

const bookingFields = read('app/apply/ConsultationBookingFields.jsx');
assert.ok(bookingFields.includes('name="consultationSlotId"'));
assert.ok(bookingFields.includes('name="consultationActivityPreference"'));
assert.ok(bookingFields.includes('required'));
assert.ok(bookingFields.includes('/api/rp/consultation-slots'));
assert.ok(bookingFields.includes('bookingCalendar'));
assert.ok(bookingFields.includes('30분'));

const serviceFields = read('app/apply/ApplicationServiceFields.jsx');
assert.ok(serviceFields.includes("selectedService === 'pe-exam'"));
assert.ok(serviceFields.includes('name="peExamTargetUniversities"'));
assert.ok(serviceFields.includes('모두 선택 입력'));
assert.ok(!serviceFields.includes('체대입시 정보가 필요하지 않습니다'));

const parqFields = read('app/apply/ParqSafetyScreening.jsx');
assert.ok(parqFields.includes('name="parqScreening"'));
assert.ok(parqFields.includes("screening === 'review'"));

const slotRoute = read('app/api/rp/consultation-slots/route.js');
assert.ok(slotRoute.includes('checkSameOriginRequest'));
assert.ok(slotRoute.includes('requireStaffSession'));
assert.ok(slotRoute.includes('listPublicDatabaseConsultationSlots'));

const applicationRoute = read('app/api/rp/service-application/route.js');
assert.ok(applicationRoute.includes("visitStatus: consultationSlot ? '예약 승인 대기' : '일정 협의 중'"));
assert.ok(applicationRoute.includes("error.code = 'CONSULTATION_SLOT_UNAVAILABLE'"));
assert.ok(applicationRoute.includes('consultationActivityPreference'));
assert.ok(applicationRoute.includes("parqScreening === 'review'"));
assert.ok(applicationRoute.includes("selectedService === 'pe-exam'"));
assert.ok(applicationRoute.includes('sendApplicationNotification'));

const databaseSource = read('lib/rpDatabase.js');
assert.ok(databaseSource.includes("INTERVAL '30 minutes'"));
assert.ok(databaseSource.includes("TIME '09:00'"));
assert.ok(databaseSource.includes("TIME '22:00'"));
assert.ok(databaseSource.includes('rp_clients_active_consultation_slot_unique_idx'));

const notificationSource = read('lib/rpApplicationNotification.js');
assert.ok(notificationSource.includes('RP_APPLICATION_NOTIFICATION_WEBHOOK_URL'));
assert.ok(notificationSource.includes('RP_APPLICATION_NOTIFICATION_GOOGLE_SCRIPT_URL'));
assert.ok(notificationSource.includes("action: 'sendApplicationNotification'"));
assert.ok(notificationSource.includes('RP_API_SECRET'));
assert.ok(notificationSource.includes('applicantNameMasked'));
assert.ok(!notificationSource.includes('application.phone'));
assert.ok(!notificationSource.includes('parqYesItems'));
assert.ok(!notificationSource.includes('peExamMemo'));

const appsScriptSource = read('integrations/google-apps-script/Code.gs');
assert.ok(appsScriptSource.includes("action === 'sendApplicationNotification'"));
assert.ok(appsScriptSource.includes("getProperty('RP_NOTIFICATION_EMAIL')"));
assert.ok(appsScriptSource.includes('MailApp.sendEmail'));
assert.ok(appsScriptSource.includes('verifyRpNotificationSetup'));
assert.ok(appsScriptSource.includes('sendRpNotificationTest'));
assert.ok(appsScriptSource.includes('request body omitted'));
assert.ok(!appsScriptSource.includes('DEFAULT_SECRET'));
assert.ok(!appsScriptSource.includes("logApi_('POST', 'ERROR', err.message, e && e.postData"));

const notificationCheckSource = read('scripts/check-rp-application-notification.mjs');
assert.ok(notificationCheckSource.includes('RP_APPLICATION_NOTIFICATION_TEST_CONFIRM'));
assert.ok(notificationCheckSource.includes('SEND_ONE_MASKED_TEST'));
assert.ok(!notificationCheckSource.includes('phone'));
assert.ok(!notificationCheckSource.includes('parq'));

for (const source of [
  read('app/api/rp/consultation-slots/route.js'),
  read('lib/rpConsultationAvailability.js'),
  notificationSource,
  appsScriptSource,
  migration,
]) {
  assert.ok(!/nore.*(?:api|webhook|fetch)|(?:api|webhook|fetch).*nore/i.test(source), 'booking must not integrate with NORE');
}

console.log('RePERFORMANCE consultation booking checks passed.');
