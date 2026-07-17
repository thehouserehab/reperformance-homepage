export const FLEXIBLE_CONSULTATION_SLOT_ID = 'flexible';

export const CONSULTATION_ACTIVITY_OPTIONS = [
  {
    value: 'consultation-only',
    label: '상담만 희망',
    description: '현재 상태와 목표를 정리하고 프로그램 안내를 받습니다.',
  },
  {
    value: 'consultation-and-light-exercise',
    label: '가벼운 평가와 간단한 운동 희망',
    description: '상담과 함께 가능한 범위에서 움직임을 확인하고 간단한 운동을 진행합니다.',
  },
];

export const CONSULTATION_SLOT_BLOCKING_VISIT_STATUSES = [
  '예약 승인 대기',
  '일정 협의 중',
  '방문 예약 완료',
  '방문 전 확인',
];

const DEFAULT_MIN_LEAD_HOURS = 4;
const DEFAULT_HORIZON_DAYS = 45;

function cleanValue(value) {
  return String(value || '').trim();
}

function clampInteger(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

export function getConsultationAvailabilityPolicy(env = process.env) {
  return {
    minLeadHours: clampInteger(env.RP_CONSULTATION_MIN_LEAD_HOURS, DEFAULT_MIN_LEAD_HOURS, 1, 72),
    horizonDays: clampInteger(env.RP_CONSULTATION_HORIZON_DAYS, DEFAULT_HORIZON_DAYS, 7, 90),
  };
}

export function normalizeConsultationActivityPreference(value) {
  const normalized = cleanValue(value);
  return CONSULTATION_ACTIVITY_OPTIONS.some((option) => option.value === normalized) ? normalized : '';
}

export function getConsultationActivityLabel(value) {
  return CONSULTATION_ACTIVITY_OPTIONS.find((option) => option.value === value)?.label || '';
}

export function normalizeConsultationSlotId(value) {
  const normalized = cleanValue(value);
  if (normalized === FLEXIBLE_CONSULTATION_SLOT_ID) return normalized;
  return /^[A-Za-z0-9_-]{8,80}$/.test(normalized) ? normalized : '';
}

export function normalizeConsultationSlotWindow(input = {}) {
  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(input.endsAt);

  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    throw new Error('예약 시작 시간과 종료 시간을 확인해 주세요.');
  }

  const durationMinutes = Math.round((endsAt.getTime() - startsAt.getTime()) / 60000);
  if (durationMinutes < 15 || durationMinutes > 180) {
    throw new Error('상담 가능 시간은 15분 이상 180분 이하로 설정해 주세요.');
  }

  return {
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    durationMinutes,
  };
}

export function getConsultationAvailabilityRange(now = new Date(), policy = getConsultationAvailabilityPolicy()) {
  const base = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(base.getTime())) throw new Error('예약 가능 시간 기준일이 올바르지 않습니다.');

  return {
    from: new Date(base.getTime() + policy.minLeadHours * 60 * 60 * 1000).toISOString(),
    to: new Date(base.getTime() + policy.horizonDays * 24 * 60 * 60 * 1000).toISOString(),
  };
}
