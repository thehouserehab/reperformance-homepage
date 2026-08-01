import type { CalendarCategory, CalendarEvent } from "./types";

export type CalendarDraft = Omit<CalendarEvent, "id" | "source">;

export type CalendarAssistantResult = {
  draft: CalendarDraft | null;
  summary: string;
  missing: ("date" | "time")[];
};

const weekdayMap: Record<string, number> = {
  일요일: 0,
  월요일: 1,
  화요일: 2,
  수요일: 3,
  목요일: 4,
  금요일: 5,
  토요일: 6,
};

function getKoreanDate(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { year: Number(value.year), month: Number(value.month), day: Number(value.day) };
}

function addDays(date: { year: number; month: number; day: number }, days: number) {
  const next = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1, day: next.getUTCDate() };
}

function resolveDate(text: string, now: Date) {
  const base = getKoreanDate(now);
  const explicit = text.match(/(?:(\d{4})년\s*)?(\d{1,2})월\s*(\d{1,2})일/);
  if (explicit) {
    return {
      year: explicit[1] ? Number(explicit[1]) : base.year,
      month: Number(explicit[2]),
      day: Number(explicit[3]),
    };
  }
  if (text.includes("모레")) return addDays(base, 2);
  if (text.includes("내일")) return addDays(base, 1);
  if (text.includes("오늘")) return base;

  const weekday = Object.entries(weekdayMap).find(([label]) => text.includes(label));
  if (weekday) {
    const current = new Date(Date.UTC(base.year, base.month - 1, base.day)).getUTCDay();
    let offset = (weekday[1] - current + 7) % 7;
    if (text.includes("다음 주")) offset += offset === 0 ? 7 : 7;
    else if (offset === 0) offset = 7;
    return addDays(base, offset);
  }
  return null;
}

function resolveTime(text: string) {
  const matched = text.match(/(오전|오후)?\s*(\d{1,2})시(?:\s*(\d{1,2})분)?/);
  if (!matched) return null;
  let hour = Number(matched[2]);
  const minute = Number(matched[3] ?? 0);
  if (matched[1] === "오후" && hour < 12) hour += 12;
  if (matched[1] === "오전" && hour === 12) hour = 0;
  if (!matched[1] && hour < 7) hour += 12;
  if (hour > 23 || minute > 59) return null;
  return { hour, minute, raw: matched[0] };
}

function resolveDuration(text: string, timeRaw?: string) {
  const remaining = timeRaw ? text.replace(timeRaw, "") : text;
  const hours = remaining.match(/(\d{1,2})시간/);
  const minutes = remaining.match(/(\d{1,3})분/);
  const total = Number(hours?.[1] ?? 0) * 60 + Number(minutes?.[1] ?? 0);
  return total > 0 && total <= 720 ? total : 60;
}

function resolveCategory(text: string): CalendarCategory {
  if (/실기|운동|훈련|PT|수업/.test(text)) return "training";
  if (/시험|모의고사|평가|테스트/.test(text)) return "exam";
  if (/상담|미팅|면담/.test(text)) return "consultation";
  if (/회복|스트레칭|휴식|병원/.test(text)) return "recovery";
  return "study";
}

function resolveTitle(text: string, category: CalendarCategory) {
  const cleaned = text
    .replace(/(?:(\d{4})년\s*)?\d{1,2}월\s*\d{1,2}일/g, "")
    .replace(/오늘|내일|모레|다음 주|이번 주/g, "")
    .replace(/일요일|월요일|화요일|수요일|목요일|금요일|토요일/g, "")
    .replace(/(오전|오후)?\s*\d{1,2}시(?:\s*\d{1,2}분)?/g, "")
    .replace(/\d{1,2}시간|\d{1,3}분/g, "")
    .replace(/캘린더에|일정으로|일정|등록|추가|잡아|넣어|만들어|해줘|해주세요|동안/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(에|에다가|으로)\s*/, "")
    .trim();
  if (cleaned) return cleaned.slice(0, 60);
  return {
    study: "공부 일정",
    training: "실기 훈련",
    exam: "시험",
    consultation: "상담",
    recovery: "회복 일정",
  }[category];
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function parseCalendarRequest(text: string, now = new Date()): CalendarAssistantResult {
  const normalized = text.trim();
  const date = resolveDate(normalized, now);
  const time = resolveTime(normalized);
  const missing: ("date" | "time")[] = [];
  if (!date) missing.push("date");
  if (!time) missing.push("time");
  if (!date || !time) {
    const labels = missing.map((item) => (item === "date" ? "날짜" : "시간"));
    return { draft: null, summary: `${labels.join("와 ")}을 더 알려주세요.`, missing };
  }

  const duration = resolveDuration(normalized, time.raw);
  const startUtc = Date.UTC(date.year, date.month - 1, date.day, time.hour - 9, time.minute);
  const end = new Date(startUtc + duration * 60_000);
  const startsAt = `${date.year}-${pad(date.month)}-${pad(date.day)}T${pad(time.hour)}:${pad(time.minute)}:00+09:00`;
  const endParts = getKoreanDate(end);
  const endClock = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(end);
  const [endHour, endMinute] = endClock.split(":").map(Number);
  const endsAt = `${endParts.year}-${pad(endParts.month)}-${pad(endParts.day)}T${pad(endHour)}:${pad(endMinute)}:00+09:00`;
  const category = resolveCategory(normalized);
  const title = resolveTitle(normalized, category);

  return {
    draft: { title, startsAt, endsAt, category, note: "일정 도우미가 요청 문장에서 정리한 초안" },
    summary: `${date.month}월 ${date.day}일 ${pad(time.hour)}:${pad(time.minute)}, ${duration}분 일정으로 정리했습니다.`,
    missing,
  };
}
