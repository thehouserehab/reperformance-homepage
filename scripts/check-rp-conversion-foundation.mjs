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

const attributionModule = await importSource('lib/rpAttribution.js');
const workflowModule = await importSource('lib/rpClientWorkflow.js');

const attribution = attributionModule.normalizeAttribution({
  attributionSessionId: 'session-1234567890',
  attributionFirstSource: 'Instagram<script>',
  attributionFirstMedium: 'Reels',
  attributionFirstLandingPath: '/services/pe-exam?private=value',
  attributionPartnerCode: 'MAX',
  attributionMaxAffiliation: 'yes',
});

assert.equal(attribution.firstSource, 'instagramscript');
assert.equal(attribution.firstLandingPath, '/services/pe-exam');
assert.equal(attributionModule.getAttributionRouteLabel(attribution), 'MAX 체대입시 연계');
assert.equal(
  attributionModule.normalizeConversionEvent({
    eventName: 'application_submitted',
    pagePath: '/apply',
    applicationId: 'APP-20260713-ABCD',
    attribution,
  }).applicationId,
  'APP-20260713-ABCD',
);
assert.equal(attributionModule.normalizeConversionEvent({ eventName: 'unknown', attribution }), null);

const workflow = workflowModule.normalizeClientWorkflow({
  contactStatus: '재연락 예정',
  visitStatus: '일정 협의 중',
  scheduledVisitAt: '2026-07-20T10:00:00+09:00',
  nextAction: '전화 확인',
  nextActionAt: '2026-07-19T18:00:00+09:00',
});
assert.equal(workflow.contactStatus, '재연락 예정');
assert.equal(workflow.visitStatus, '일정 협의 중');
assert.equal(workflow.scheduledVisitAt, '2026-07-20T01:00:00.000Z');
assert.throws(() => workflowModule.normalizeClientWorkflow({ contactStatus: '임의 상태' }));
assert.throws(() => workflowModule.normalizeClientWorkflow({ contactStatus: '재연락 예정' }));
assert.throws(() => workflowModule.normalizeClientWorkflow({ visitStatus: '방문 예약 완료' }));

const migration = read('database/migrations/20260713_conversion_foundation.sql');
const conversionTableSql = migration.match(/CREATE TABLE IF NOT EXISTS rp_conversion_events \(([\s\S]*?)\);/)?.[1] || '';
assert.ok(conversionTableSql, 'rp_conversion_events migration is required');
for (const forbiddenColumn of ['name', 'phone', 'ip_address', 'user_agent', 'form_payload']) {
  const columnPattern = new RegExp(`^\\s*${forbiddenColumn}\\s+`, 'm');
  assert.ok(!columnPattern.test(conversionTableSql), `conversion events must not store ${forbiddenColumn}`);
}

const tracker = read('components/conversion/RPConversionTracker.jsx');
assert.ok(tracker.includes('window.sessionStorage'), 'session-scoped attribution storage is required');
assert.ok(!tracker.includes('window.localStorage'), 'persistent localStorage tracking is not allowed');
assert.ok(!tracker.includes('document.cookie'), 'tracking cookies are not allowed');

const serviceApplicationRoute = read('app/api/rp/service-application/route.js');
assert.ok(serviceApplicationRoute.includes("contactStatus: '연락 대기'"));
assert.ok(
  serviceApplicationRoute.includes("visitStatus: consultationSlot ? '예약 승인 대기' : '일정 협의 중'"),
  'applications must enter the reservation confirmation or schedule coordination workflow',
);
assert.ok(serviceApplicationRoute.includes("eventName: 'application_submitted'"));

console.log('RePERFORMANCE conversion foundation checks passed.');
