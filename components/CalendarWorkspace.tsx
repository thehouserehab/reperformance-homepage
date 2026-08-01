"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bot,
  CalendarPlus,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Sparkles,
} from "lucide-react";
import type { CalendarAssistantResult, CalendarDraft } from "@/lib/calendarAssistant";
import { formatKoreanScheduleDateTime, formatKoreanScheduleTime } from "@/lib/dateFormatting";
import type { CalendarCategory, TaskKind } from "@/lib/types";
import { useAppState } from "./AppStateProvider";

type CalendarView = "week" | "month";
type CalendarRole = "student" | "coach";

const categoryLabels: Record<CalendarCategory, string> = {
  study: "학업",
  training: "실기",
  exam: "시험",
  consultation: "상담",
  recovery: "회복",
};

const taskKindLabels: Record<TaskKind, string> = {
  study: "학업",
  training: "실기",
  recovery: "회복",
};

const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateFromKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function getMonthCells(month: Date) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const lastDate = new Date(year, monthIndex + 1, 0).getDate();
  const previousLastDate = new Date(year, monthIndex, 0).getDate();

  return Array.from({ length: 42 }, (_, index) => {
    const dayOffset = index - firstDay + 1;
    if (dayOffset < 1) {
      return { date: new Date(year, monthIndex - 1, previousLastDate + dayOffset), current: false };
    }
    if (dayOffset > lastDate) {
      return { date: new Date(year, monthIndex + 1, dayOffset - lastDate), current: false };
    }
    return { date: new Date(year, monthIndex, dayOffset), current: true };
  });
}

function getWeekCells(anchor: Date) {
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - anchor.getDay());
  return Array.from({ length: 7 }, (_, index) => ({
    date: new Date(start.getFullYear(), start.getMonth(), start.getDate() + index),
    current: true,
  }));
}

function formatWeekTitle(cells: Array<{ date: Date }>) {
  const start = cells[0].date;
  const end = cells[cells.length - 1].date;
  if (start.getFullYear() !== end.getFullYear()) {
    return `${start.getFullYear()}년 ${start.getMonth() + 1}월 ${start.getDate()}일 - ${end.getFullYear()}년 ${end.getMonth() + 1}월 ${end.getDate()}일`;
  }
  if (start.getMonth() !== end.getMonth()) {
    return `${start.getFullYear()}년 ${start.getMonth() + 1}월 ${start.getDate()}일 - ${end.getMonth() + 1}월 ${end.getDate()}일`;
  }
  return `${start.getFullYear()}년 ${start.getMonth() + 1}월 ${start.getDate()}일 - ${end.getDate()}일`;
}

export function CalendarWorkspace({ role }: { role: CalendarRole }) {
  const { state, addCalendarEvent, toggleTask } = useAppState();
  const [visibleMonth, setVisibleMonth] = useState(new Date(2026, 7, 1));
  const [selectedDate, setSelectedDate] = useState("2026-08-01");
  const [calendarView, setCalendarView] = useState<CalendarView>("month");
  const [message, setMessage] = useState("내일 오후 6시에 수학 오답 정리 50분 등록해줘");
  const [draft, setDraft] = useState<CalendarDraft | null>(null);
  const [assistantText, setAssistantText] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(max-width: 640px)").matches) setCalendarView("week");
  }, []);

  const eventsByDate = useMemo(() => {
    const grouped = new Map<string, typeof state.calendarEvents>();
    for (const event of state.calendarEvents) {
      const key = event.startsAt.slice(0, 10);
      grouped.set(key, [...(grouped.get(key) ?? []), event]);
    }
    return grouped;
  }, [state.calendarEvents]);

  const monthCells = useMemo(() => getMonthCells(visibleMonth), [visibleMonth]);
  const weekCells = useMemo(() => getWeekCells(dateFromKey(selectedDate)), [selectedDate]);
  const displayCells = calendarView === "month" ? monthCells : weekCells;
  const selectedEvents = eventsByDate.get(selectedDate) ?? [];
  const completedTasks = state.tasks.filter((task) => task.completed).length;
  const calendarTitle = calendarView === "month"
    ? `${visibleMonth.getFullYear()}년 ${visibleMonth.getMonth() + 1}월`
    : formatWeekTitle(weekCells);

  const moveCalendar = (direction: -1 | 1) => {
    if (calendarView === "month") {
      const next = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + direction, 1);
      setVisibleMonth(next);
      setSelectedDate(dateKey(next));
      return;
    }

    const selected = dateFromKey(selectedDate);
    const next = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate() + direction * 7);
    setSelectedDate(dateKey(next));
    setVisibleMonth(new Date(next.getFullYear(), next.getMonth(), 1));
  };

  const selectCalendarDate = (date: Date, current: boolean) => {
    setSelectedDate(dateKey(date));
    if (calendarView === "month" && !current) {
      setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    }
  };

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
      <section className="calendar-today-panel" aria-labelledby="calendar-today-title">
        <div className="calendar-section-heading">
          <div>
            <p className="section-kicker">TODAY PLAN</p>
            <h2 id="calendar-today-title">오늘 할 일</h2>
          </div>
          <strong>{completedTasks}/{state.tasks.length}</strong>
        </div>
        <div className="calendar-task-list">
          {state.tasks.map((task) => {
            const content = (
              <>
                <span className="calendar-task-check" aria-hidden="true">
                  {task.completed ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                </span>
                <span className="calendar-task-copy">
                  <small>{task.scheduledTime} · {taskKindLabels[task.kind]} · {task.assignedBy === "coach" ? "코치" : "직접"}</small>
                  <strong>{task.title}</strong>
                  <span>{task.detail}</span>
                </span>
                <b>{task.durationMinutes}분</b>
              </>
            );

            return role === "student" ? (
              <button
                type="button"
                key={task.id}
                className={task.completed ? "completed" : undefined}
                onClick={() => toggleTask(task.id)}
                aria-pressed={task.completed}
                aria-label={`${task.title}, ${task.completed ? "완료 취소" : "완료 처리"}`}
              >
                {content}
              </button>
            ) : (
              <article key={task.id} className={task.completed ? "completed" : undefined}>
                {content}
              </article>
            );
          })}
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
          <textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={240} rows={2} />
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

      <section className="calendar-panel" aria-labelledby="calendar-title">
        <div className="calendar-view-switcher" role="group" aria-label="캘린더 보기 방식">
          <button
            type="button"
            className={calendarView === "week" ? "active" : undefined}
            aria-pressed={calendarView === "week"}
            onClick={() => setCalendarView("week")}
          >
            주간
          </button>
          <button
            type="button"
            className={calendarView === "month" ? "active" : undefined}
            aria-pressed={calendarView === "month"}
            onClick={() => setCalendarView("month")}
          >
            월간
          </button>
        </div>

        <div className="calendar-toolbar">
          <div>
            <p className="section-kicker">MY CALENDAR</p>
            <h2 id="calendar-title">{calendarTitle}</h2>
          </div>
          <div>
            <button type="button" className="icon-button secondary" onClick={() => moveCalendar(-1)} aria-label={`이전 ${calendarView === "month" ? "달" : "주"}`} title={`이전 ${calendarView === "month" ? "달" : "주"}`}>
              <ChevronLeft aria-hidden="true" size={20} />
            </button>
            <button type="button" className="icon-button secondary" onClick={() => moveCalendar(1)} aria-label={`다음 ${calendarView === "month" ? "달" : "주"}`} title={`다음 ${calendarView === "month" ? "달" : "주"}`}>
              <ChevronRight aria-hidden="true" size={20} />
            </button>
          </div>
        </div>

        <div className="calendar-weekdays" aria-hidden="true">
          {weekdays.map((day) => <span key={day}>{day}</span>)}
        </div>
        <div className={`calendar-grid ${calendarView}`}>
          {displayCells.map(({ date, current }) => {
            const key = dateKey(date);
            const eventCategories = Array.from(new Set((eventsByDate.get(key) ?? []).map((event) => event.category)));
            return (
              <button
                type="button"
                key={key}
                className={`${current ? "" : "outside"} ${selectedDate === key ? "selected" : ""}`}
                onClick={() => selectCalendarDate(date, current)}
                aria-pressed={selectedDate === key}
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
    </div>
  );
}
