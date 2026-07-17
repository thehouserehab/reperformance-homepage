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
  endsAt: '2026-07-20T02:00:00.000Z',
});
assert.equal(window.durationMinutes, 60);
assert.throws(() => availability.normalizeConsultationSlotWindow({
  startsAt: '2026-07-20T01:00:00.000Z',
  endsAt: '2026-07-20T01:05:00.000Z',
}));

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

const slotRoute = read('app/api/rp/consultation-slots/route.js');
assert.ok(slotRoute.includes('checkSameOriginRequest'));
assert.ok(slotRoute.includes('requireStaffSession'));
assert.ok(slotRoute.includes('listPublicDatabaseConsultationSlots'));

const applicationRoute = read('app/api/rp/service-application/route.js');
assert.ok(applicationRoute.includes("visitStatus: consultationSlot ? '예약 승인 대기' : '일정 협의 중'"));
assert.ok(applicationRoute.includes("error.code = 'CONSULTATION_SLOT_UNAVAILABLE'"));
assert.ok(applicationRoute.includes('consultationActivityPreference'));

for (const source of [
  read('app/api/rp/consultation-slots/route.js'),
  read('lib/rpConsultationAvailability.js'),
  migration,
]) {
  assert.ok(!/nore.*(?:api|webhook|fetch)|(?:api|webhook|fetch).*nore/i.test(source), 'booking must not integrate with NORE');
}

console.log('RePERFORMANCE consultation booking checks passed.');
