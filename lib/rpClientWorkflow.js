export const CLIENT_CONTACT_STATUSES = ['연락 대기', '연락 완료', '연락 불가', '재연락 예정'];

export const CLIENT_VISIT_STATUSES = [
  '미정',
  '예약 승인 대기',
  '일정 협의 중',
  '방문 예약 완료',
  '방문 전 확인',
  '방문 완료',
  '예약 변경',
  '예약 취소',
  '노쇼',
];

const CONTACT_STATUS_SET = new Set(CLIENT_CONTACT_STATUSES);
const VISIT_STATUS_SET = new Set(CLIENT_VISIT_STATUSES);

function cleanLimitedValue(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

function normalizeOptionalDate(value, fieldLabel) {
  const text = String(value || '').trim();
  if (!text) return null;

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) throw new Error(`${fieldLabel} 형식을 확인해 주세요.`);
  return parsed.toISOString();
}

export function normalizeClientWorkflow(input = {}) {
  const contactStatus = cleanLimitedValue(input.contactStatus, 40) || '연락 대기';
  const visitStatus = cleanLimitedValue(input.visitStatus, 40) || '미정';

  if (!CONTACT_STATUS_SET.has(contactStatus)) throw new Error('지원하지 않는 연락 상태입니다.');
  if (!VISIT_STATUS_SET.has(visitStatus)) throw new Error('지원하지 않는 방문 상태입니다.');

  const scheduledVisitAt = normalizeOptionalDate(input.scheduledVisitAt, '방문 예정일');
  const nextAction = cleanLimitedValue(input.nextAction, 300);
  const nextActionAt = normalizeOptionalDate(input.nextActionAt, '다음 행동 예정일');

  if (['방문 예약 완료', '방문 전 확인'].includes(visitStatus) && !scheduledVisitAt) {
    throw new Error(`${visitStatus} 상태에는 방문 예정일이 필요합니다.`);
  }
  if (contactStatus === '재연락 예정' && (!nextAction || !nextActionAt)) {
    throw new Error('재연락 예정 상태에는 다음 행동과 예정일이 필요합니다.');
  }

  return {
    contactStatus,
    visitStatus,
    scheduledVisitAt,
    nextAction,
    nextActionAt,
    followUpReason: cleanLimitedValue(input.followUpReason, 600),
  };
}
