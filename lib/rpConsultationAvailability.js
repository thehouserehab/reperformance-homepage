export const FLEXIBLE_CONSULTATION_SLOT_ID = 'flexible';
export const CONSULTATION_TIME_ZONE = 'Asia/Seoul';
export const CONSULTATION_SLOT_DURATION_MINUTES = 30;
export const CONSULTATION_OPEN_HOUR = 9;
export const CONSULTATION_CLOSE_HOUR = 22;
export const CONSULTATION_BUSINESS_DAYS = [1, 2, 3, 4, 5];

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
    timeZone: CONSULTATION_TIME_ZONE,
    slotDurationMinutes: CONSULTATION_SLOT_DURATION_MINUTES,
    openHour: CONSULTATION_OPEN_HOUR,
    closeHour: CONSULTATION_CLOSE_HOUR,
    businessDays: [...CONSULTATION_BUSINESS_DAYS],
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

function getSeoulDateParts(value) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CONSULTATION_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(value));
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function getSeoulDateKey(value) {
  const parts = getSeoulDateParts(value);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function addDateKeyDays(dateKey, days) {
  const base = new Date(`${dateKey}T12:00:00+09:00`);
  base.setUTCDate(base.getUTCDate() + days);
  return getSeoulDateKey(base);
}

function getDateKeyIsoDay(dateKey) {
  return new Date(`${dateKey}T12:00:00+09:00`).getUTCDay();
}

function buildDefaultSlotId(dateKey, hour, minute) {
  return `AUTO-${dateKey.replace(/-/g, '')}-${String(hour).padStart(2, '0')}${String(minute).padStart(2, '0')}`;
}

export function isDefaultConsultationSlotId(value) {
  return /^AUTO-\d{8}-(?:0\d|1\d|2[0-1])(?:00|30)$/.test(cleanValue(value));
}

export function buildDefaultConsultationSlots({ now = new Date(), policy = getConsultationAvailabilityPolicy() } = {}) {
  const range = getConsultationAvailabilityRange(now, policy);
  const fromMs = new Date(range.from).getTime();
  const toMs = new Date(range.to).getTime();
  let dateKey = getSeoulDateKey(range.from);
  const lastDateKey = getSeoulDateKey(range.to);
  const slots = [];

  while (dateKey <= lastDateKey) {
    const isoDay = getDateKeyIsoDay(dateKey);
    if (CONSULTATION_BUSINESS_DAYS.includes(isoDay)) {
      for (let hour = CONSULTATION_OPEN_HOUR; hour < CONSULTATION_CLOSE_HOUR; hour += 1) {
        for (const minute of [0, 30]) {
          const startsAt = new Date(
            `${dateKey}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+09:00`,
          );
          const startsAtMs = startsAt.getTime();
          if (startsAtMs < fromMs || startsAtMs > toMs) continue;

          slots.push({
            id: buildDefaultSlotId(dateKey, hour, minute),
            startsAt: startsAt.toISOString(),
            endsAt: new Date(startsAtMs + CONSULTATION_SLOT_DURATION_MINUTES * 60 * 1000).toISOString(),
            isOpen: true,
          });
        }
      }
    }
    dateKey = addDateKeyDays(dateKey, 1);
  }

  return slots;
}

function assertConsultationBusinessWindow(startsAt, endsAt) {
  const startParts = getSeoulDateParts(startsAt);
  const endParts = getSeoulDateParts(endsAt);
  const dateKey = `${startParts.year}-${startParts.month}-${startParts.day}`;
  const endDateKey = `${endParts.year}-${endParts.month}-${endParts.day}`;
  const isoDay = getDateKeyIsoDay(dateKey);
  const startMinutes = Number(startParts.hour) * 60 + Number(startParts.minute);
  const endMinutes = Number(endParts.hour) * 60 + Number(endParts.minute);

  if (!CONSULTATION_BUSINESS_DAYS.includes(isoDay) || dateKey !== endDateKey) {
    throw new Error('상담 예약은 월요일부터 금요일까지만 가능합니다.');
  }
  if (
    startMinutes < CONSULTATION_OPEN_HOUR * 60
    || endMinutes > CONSULTATION_CLOSE_HOUR * 60
    || ![0, 30].includes(Number(startParts.minute))
  ) {
    throw new Error('상담 예약은 평일 09:00~22:00 사이의 30분 단위로 설정해 주세요.');
  }
}

export function normalizeConsultationSlotWindow(input = {}) {
  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(input.endsAt);

  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    throw new Error('예약 시작 시간과 종료 시간을 확인해 주세요.');
  }

  const durationMinutes = Math.round((endsAt.getTime() - startsAt.getTime()) / 60000);
  if (durationMinutes !== CONSULTATION_SLOT_DURATION_MINUTES) {
    throw new Error(`상담 가능 시간은 ${CONSULTATION_SLOT_DURATION_MINUTES}분으로 설정해 주세요.`);
  }

  assertConsultationBusinessWindow(startsAt, endsAt);

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
