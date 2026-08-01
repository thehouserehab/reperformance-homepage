"use client";

import { useMemo, useState } from "react";
import { Bot, CalendarPlus, Check, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import type { CalendarAssistantResult, CalendarDraft } from "@/lib/calendarAssistant";
import { formatKoreanScheduleDateTime, formatKoreanScheduleTime } from "@/lib/dateFormatting";
import type { CalendarCategory } from "@/lib/types";
import { useAppState } from "./AppStateProvider";

const categoryLabels: Record<CalendarCategory, string> = {
  study: "학업",
  training: "실기",
  exam: "시험",
  consultation: "상담",
  recovery: "회복",
};

const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getMonthCells(month: Date) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const lastDate = new Date(year, monthIndex + 1, 0).getDate();
  const previousLastDate = new Date(year, monthIndex, 0).getDate();
  return Array.from({ length: 42 }, (_, index) => {
    const dayOffset = index - firstDay + 1;
    if (dayOffset < 1) return { date: new Date(year, monthIndex - 1, previousLastDate + dayOffset), current: false };
    if (dayOffset > lastDate) return { date: new Date(year, monthIndex + 1, dayOffset - lastDate), current: false };
    return { date: new Date(year, monthIndex, dayOffset), current: true };
  });
}

export function CalendarWorkspace() {
  const { state, addCalendarEvent } = useAppState();
  const [visibleMonth, setVisibleMonth] = useState(new Date(2026, 7, 1));
  const [selectedDate, setSelectedDate] = useState("2026-08-01");
  const [message, setMessage] = useState("내일 오후 6시에 수학 오답 정리 50분 등록해줘");
  const [draft, setDraft] = useState<CalendarDraft | null>(null);
  const [assistantText, setAssistantText] = useState("");
  const [pending, setPending] = useState(false);

  const cells = useMemo(() => getMonthCells(visibleMonth), [visibleMonth]);
  const selectedEvents = state.calendarEvents.filter((event) => event.startsAt.slice(0, 10) === selectedDate);

  const requestDraft = async () => {
    setPending(true);
    setDraft(null);
    setAssistantText("");
    try {
      const response = await fetch("/api/calendar/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const result = (await response.json()) as CalendarAssistantResult & { error?: string };
      if (!response.ok) throw new Error(result.error ?? "일정을 정리하지 못했습니다.");
      setAssistantText(result.summary);
      setDraft(result.draft);
    } catch (error) {
      setAssistantText(error instanceof Error ? error.message : "일정을 정리하지 못했습니다.");
    } finally {
      setPending(false);
    }
  };

  const confirmDraft = () => {
    if (!draft) return;
    addCalendarEvent({ ...draft, id: crypto.randomUUID(), source: "assistant" });
    const date = draft.startsAt.slice(0, 10);
    const [year, month] = date.split("-").map(Number);
    setSelectedDate(date);
    setVisibleMonth(new Date(year, month - 1, 1));
    setAssistantText("캘린더에 등록했습니다.");
    setDraft(null);
  };

  return (
    <div className="calendar-layout">
      <section className="calendar-panel" aria-labelledby="calendar-title">
        <div className="calendar-toolbar">
          <div>
            <p className="section-kicker">MY CALENDAR</p>
            <h2 id="calendar-title">{visibleMonth.getFullYear()}년 {visibleMonth.getMonth() + 1}월</h2>
          </div>
          <div>
            <button type="button" className="icon-button secondary" onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))} aria-label="이전 달" title="이전 달">
              <ChevronLeft aria-hidden="true" size={20} />
            </button>
            <button type="button" className="icon-button secondary" onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))} aria-label="다음 달" title="다음 달">
              <ChevronRight aria-hidden="true" size={20} />
            </button>
          </div>
        </div>

        <div className="calendar-weekdays" aria-hidden="true">
          {weekdays.map((day) => <span key={day}>{day}</span>)}
        </div>
        <div className="calendar-grid">
          {cells.map(({ date, current }) => {
            const key = dateKey(date);
            const eventCategories = Array.from(new Set(state.calendarEvents.filter((event) => event.startsAt.slice(0, 10) === key).map((event) => event.category)));
            return (
              <button
                type="button"
                key={key}
                className={`${current ? "" : "outside"} ${selectedDate === key ? "selected" : ""}`}
                onClick={() => setSelectedDate(key)}
                aria-label={`${date.getMonth() + 1}월 ${date.getDate()}일${eventCategories.length ? `, 일정 ${eventCategories.length}종류` : ""}`}
              >
                <span>{date.getDate()}</span>
                <i>
                  {eventCategories.slice(0, 3).map((category) => <b key={category} className={category} />)}
                </i>
              </button>
            );
          })}
        </div>

        <div className="day-agenda">
          <div className="section-heading-row compact">
            <h3>{Number(selectedDate.slice(5, 7))}월 {Number(selectedDate.slice(8, 10))}일</h3>
            <span>{selectedEvents.length}개 일정</span>
          </div>
          {selectedEvents.length ? selectedEvents.map((event) => (
            <article key={event.id} className={`agenda-row ${event.category}`}>
              <time>{formatKoreanScheduleTime(event.startsAt)}</time>
              <div>
                <span>{categoryLabels[event.category]} · {event.source === "assistant" ? "일정 도우미" : event.source === "coach" ? "코치" : "직접 등록"}</span>
                <strong>{event.title}</strong>
                {event.note && <p>{event.note}</p>}
              </div>
            </article>
          )) : <p className="empty-state">등록된 일정이 없습니다.</p>}
        </div>
      </section>

      <section className="assistant-panel" aria-labelledby="assistant-title">
        <div className="assistant-heading">
          <span><Bot aria-hidden="true" size={22} /></span>
          <div>
            <p className="section-kicker">SCHEDULE ASSISTANT</p>
            <h2 id="assistant-title">일정 도우미</h2>
          </div>
        </div>
        <label className="assistant-input">
          <span>등록할 일정</span>
          <textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={240} rows={4} />
        </label>
        <button type="button" className="assistant-action" onClick={requestDraft} disabled={pending || message.trim().length < 2}>
          <Sparkles aria-hidden="true" size={18} />
          {pending ? "정리 중" : "일정 초안 만들기"}
        </button>

        {assistantText && (
          <div className="assistant-result" aria-live="polite">
            <p>{assistantText}</p>
            {draft && (
              <div className="draft-event">
                <span>{categoryLabels[draft.category]}</span>
                <strong>{draft.title}</strong>
                <time>{formatKoreanScheduleDateTime(draft.startsAt)}</time>
                <button type="button" onClick={confirmDraft}>
                  <Check aria-hidden="true" size={18} /> 이 일정 등록
                </button>
              </div>
            )}
          </div>
        )}

        <div className="assistant-boundary">
          <CalendarPlus aria-hidden="true" size={20} />
          <p>일정은 학생이 확인한 뒤 등록됩니다. 성적·건강·상담 원문은 일정 요청에 넣지 않습니다.</p>
        </div>
      </section>
    </div>
  );
}
