import type { AppState } from "./types";

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_DATE_PREFIX_PATTERN = /^(\d{4}-\d{2}-\d{2})(.*)$/;

export const KOREAN_TIME_ZONE = "Asia/Seoul";
export const PROTOTYPE_REFERENCE_DATE = "2026-08-02";

function dateKeyToUtcMilliseconds(dateKey: string) {
  const matched = DATE_KEY_PATTERN.exec(dateKey);
  if (!matched) return null;

  const year = Number(matched[1]);
  const month = Number(matched[2]);
  const day = Number(matched[3]);
  const timestamp = Date.UTC(year, month - 1, day);
  const parsed = new Date(timestamp);

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return timestamp;
}

function utcMillisecondsToDateKey(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

export function isDateKey(value: string) {
  return dateKeyToUtcMilliseconds(value) !== null;
}

export function getKoreanTodayDateKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: KOREAN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const dateKey = `${values.year}-${values.month}-${values.day}`;

  if (!isDateKey(dateKey)) {
    throw new RangeError("한국 시간 기준 날짜를 계산할 수 없습니다.");
  }

  return dateKey;
}

export function getDayOffset(fromDateKey: string, toDateKey: string) {
  const from = dateKeyToUtcMilliseconds(fromDateKey);
  const to = dateKeyToUtcMilliseconds(toDateKey);

  if (from === null || to === null) {
    throw new RangeError("날짜 키는 YYYY-MM-DD 형식의 유효한 날짜여야 합니다.");
  }

  return Math.round((to - from) / DAY_IN_MILLISECONDS);
}

export function shiftDateKey(dateKey: string, dayOffset: number) {
  const timestamp = dateKeyToUtcMilliseconds(dateKey);
  if (timestamp === null || !Number.isInteger(dayOffset)) return dateKey;
  return utcMillisecondsToDateKey(timestamp + dayOffset * DAY_IN_MILLISECONDS);
}

export function shiftIsoDatePrefix(value: string, dayOffset: number) {
  const matched = ISO_DATE_PREFIX_PATTERN.exec(value);
  if (!matched) return value;

  const shiftedDate = shiftDateKey(matched[1], dayOffset);
  if (shiftedDate === matched[1] && !isDateKey(matched[1])) return value;
  return `${shiftedDate}${matched[2]}`;
}

export function rebaseAppStateDates(
  state: AppState,
  fromDateKey: string,
  toDateKey: string
): AppState {
  const dayOffset = getDayOffset(fromDateKey, toDateKey);

  return {
    ...state,
    scheduleDate: toDateKey,
    guardianPermissions: { ...state.guardianPermissions },
    tasks: state.tasks.map((task) => ({
      ...task,
      scheduledDate: shiftDateKey(task.scheduledDate, dayOffset),
    })),
    studySessions: state.studySessions.map((session) => ({
      ...session,
      completedAt: shiftIsoDatePrefix(session.completedAt, dayOffset),
    })),
    recordItems: state.recordItems.map((item) => ({ ...item })),
    studentRecords: state.studentRecords.map((record) => ({
      ...record,
      recordedAt: shiftIsoDatePrefix(record.recordedAt, dayOffset),
    })),
    calendarEvents: state.calendarEvents.map((event) => ({
      ...event,
      startsAt: shiftIsoDatePrefix(event.startsAt, dayOffset),
      endsAt: shiftIsoDatePrefix(event.endsAt, dayOffset),
    })),
    condition: {
      ...state.condition,
      checkedAt: state.condition.checkedAt
        ? shiftIsoDatePrefix(state.condition.checkedAt, dayOffset)
        : null,
    },
    guardianMessages: state.guardianMessages.map((message) => ({
      ...message,
      sentAt: shiftIsoDatePrefix(message.sentAt, dayOffset),
    })),
    coachConversation: state.coachConversation.map((message) => ({
      ...message,
      sentAt: shiftIsoDatePrefix(message.sentAt, dayOffset),
      attachments: message.attachments.map((attachment) => ({
        ...attachment,
        createdAt: shiftIsoDatePrefix(attachment.createdAt, dayOffset),
      })),
    })),
  };
}

export function alignAppStateWithToday(state: AppState, todayDateKey: string) {
  if (!isDateKey(todayDateKey)) {
    throw new RangeError("오늘 날짜는 YYYY-MM-DD 형식의 유효한 날짜여야 합니다.");
  }

  if (state.scheduleDate === PROTOTYPE_REFERENCE_DATE) {
    return rebaseAppStateDates(state, PROTOTYPE_REFERENCE_DATE, todayDateKey);
  }

  return { ...state, scheduleDate: todayDateKey };
}
