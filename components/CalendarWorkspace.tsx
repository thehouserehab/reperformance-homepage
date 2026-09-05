"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Dumbbell,
  GraduationCap,
  HeartPulse,
  MessageCircle,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { formatKoreanScheduleTime } from "@/lib/dateFormatting";
import {
  sortTasks,
  toDateKey,
} from "@/lib/taskScheduling";
import type { AppTask, CalendarCategory, TaskKind } from "@/lib/types";
import { useAppState } from "./AppStateProvider";
import styles from "./CalendarWorkspace.module.css";

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
  study: "공부",
  training: "운동",
  recovery: "회복",
};

const taskKinds: TaskKind[] = ["study", "training", "recovery"];
const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

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

function TaskComposer({
  date,
  onAdd,
  onClose,
}: {
  date: string;
  onAdd: (task: Omit<AppTask, "id" | "completed">) => boolean;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<TaskKind>("study");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [scheduledTime, setScheduledTime] = useState("18:00");
  const [durationMinutes, setDurationMinutes] = useState(40);

  const submitTask = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    const saved = onAdd({
      title: trimmedTitle,
      detail: detail.trim(),
      kind,
      scheduledDate: date,
      scheduledTime,
      durationMinutes: Math.min(240, Math.max(5, durationMinutes)),
      assignedBy: "student",
    });
    if (saved) onClose();
  };

  return (
    <form className="task-composer" onSubmit={submitTask}>
      <div className="task-composer-fields">
        <label>
          <span>구분</span>
          <select value={kind} onChange={(event) => setKind(event.target.value as TaskKind)}>
            {taskKinds.map((item) => <option key={item} value={item}>{taskKindLabels[item]}</option>)}
          </select>
        </label>
        <label>
          <span>시간</span>
          <input type="time" value={scheduledTime} onChange={(event) => setScheduledTime(event.target.value)} required />
        </label>
        <label>
          <span>분</span>
          <input
            type="number"
            min="5"
            max="240"
            step="5"
            value={durationMinutes}
            onChange={(event) => setDurationMinutes(Number(event.target.value))}
            required
          />
        </label>
      </div>
      <label className="task-composer-title">
        <span>할 일</span>
        <input
          value={title}
          maxLength={60}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="예: 영어 오답 2문제 정리"
          autoFocus
          required
        />
      </label>
      <label className="task-composer-detail">
        <span>메모</span>
        <input
          value={detail}
          maxLength={100}
          onChange={(event) => setDetail(event.target.value)}
          placeholder="선택 사항"
        />
      </label>
      <div className="task-composer-actions">
        <button type="button" className="icon-button secondary" onClick={onClose} aria-label="할 일 추가 취소" title="취소">
          <X aria-hidden="true" size={18} />
        </button>
        <button type="submit" className="task-composer-submit">
          <Plus aria-hidden="true" size={17} /> 추가
        </button>
      </div>
    </form>
  );
}

export function CalendarWorkspace({ role }: { role: CalendarRole }) {
  const router = useRouter();
  const { state, hydrated, deleteCalendarEvent, addTask, deleteTask, toggleTask } = useAppState();
  const initialDate = dateFromKey(state.scheduleDate);
  const [visibleMonth, setVisibleMonth] = useState(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(state.scheduleDate);
  const [calendarView, setCalendarView] = useState<CalendarView>("month");
  const [calendarInitialized, setCalendarInitialized] = useState(false);
  const [taskComposerOpen, setTaskComposerOpen] = useState(false);

  useEffect(() => {
    if (!hydrated || calendarInitialized) return;
    const date = dateFromKey(state.scheduleDate);
    setSelectedDate(state.scheduleDate);
    setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    if (window.matchMedia("(max-width: 640px)").matches) setCalendarView("week");
    setCalendarInitialized(true);
  }, [calendarInitialized, hydrated, state.scheduleDate]);

  const tasksByDate = useMemo(() => {
    const grouped = new Map<string, AppTask[]>();
    for (const task of state.tasks) {
      grouped.set(task.scheduledDate, [...(grouped.get(task.scheduledDate) ?? []), task]);
    }
    return grouped;
  }, [state.tasks]);
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
  const selectedTasks = sortTasks(tasksByDate.get(selectedDate) ?? []);
  const calendarTitle = calendarView === "month"
    ? `${visibleMonth.getFullYear()}년 ${visibleMonth.getMonth() + 1}월`
    : formatWeekTitle(weekCells);

  const moveCalendar = (direction: -1 | 1) => {
    if (calendarView === "month") {
      const next = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + direction, 1);
      setVisibleMonth(next);
      setSelectedDate(toDateKey(next));
      return;
    }

    const selected = dateFromKey(selectedDate);
    const next = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate() + direction * 7);
    setSelectedDate(toDateKey(next));
    setVisibleMonth(new Date(next.getFullYear(), next.getMonth(), 1));
  };

  const selectCalendarDate = (date: Date, current: boolean) => {
    setSelectedDate(toDateKey(date));
    setTaskComposerOpen(false);
    if (calendarView === "month" && !current) {
      setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    }
  };

  const requestTaskAdjustment = (task: AppTask) => {
    const request = `코치님, ${task.scheduledDate} ${task.scheduledTime}에 예정된 “${task.title}” 과제를 조정하고 싶습니다.`;
    window.sessionStorage.setItem("rp-app-coach-message-draft", request);
    window.sessionStorage.setItem("rp-app-coach-message-mode", "direct");
    router.push("/student/messages?from=task-adjustment");
  };

  return (
    <div className="calendar-layout">
      <section className="calendar-panel" aria-labelledby="calendar-title">
        <div className="calendar-panel-header">
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
        </div>

        <div className="calendar-board">
          <div className="calendar-date-grid">
            <div className="calendar-weekdays" aria-hidden="true">
              {weekdays.map((day) => <span key={day}>{day}</span>)}
            </div>
            <div className={`calendar-grid ${calendarView}`}>
              {displayCells.map(({ date, current }) => {
                const key = toDateKey(date);
                const eventCategories = (eventsByDate.get(key) ?? []).map((event) => event.category);
                const taskCategories = (tasksByDate.get(key) ?? []).map((task) => task.kind);
                const scheduleCategories = Array.from(new Set([...eventCategories, ...taskCategories]));
                const scheduleCount = eventCategories.length + taskCategories.length;
                return (
                  <button
                    type="button"
                    key={key}
                    className={`${current ? "" : "outside"} ${selectedDate === key ? "selected" : ""} ${state.scheduleDate === key ? "today" : ""}`}
                    onClick={() => selectCalendarDate(date, current)}
                    aria-pressed={selectedDate === key}
                    aria-label={`${date.getMonth() + 1}월 ${date.getDate()}일${scheduleCount ? `, 할 일과 일정 ${scheduleCount}개` : ""}`}
                  >
                    <span>{date.getDate()}</span>
                    <i>
                      {scheduleCategories.slice(0, 3).map((category) => <b key={category} className={category} />)}
                    </i>
                  </button>
                );
              })}
            </div>
          </div>

          <aside className="day-agenda" aria-label="선택한 날짜 일정">
            <div className="section-heading-row compact">
              <div>
                <p className="section-kicker">SELECTED DAY</p>
                <h3>{Number(selectedDate.slice(5, 7))}월 {Number(selectedDate.slice(8, 10))}일</h3>
              </div>
              <div className="agenda-heading-actions">
                <span>{selectedTasks.length + selectedEvents.length}개</span>
                {role === "student" && (
                  <button
                    type="button"
                    className="agenda-add-task"
                    onClick={() => setTaskComposerOpen((open) => !open)}
                    aria-expanded={taskComposerOpen}
                    aria-label={taskComposerOpen ? "할 일 추가 닫기" : "선택한 날짜에 할 일 추가"}
                    title={taskComposerOpen ? "닫기" : "할 일 추가"}
                  >
                    {taskComposerOpen ? <X aria-hidden="true" size={18} /> : <Plus aria-hidden="true" size={18} />}
                  </button>
                )}
              </div>
            </div>

            {taskComposerOpen && (
              <TaskComposer date={selectedDate} onAdd={addTask} onClose={() => setTaskComposerOpen(false)} />
            )}

            <div className="agenda-list">
              {selectedTasks.map((task) => (
                <article
                  key={`task-${task.id}`}
                  className={`agenda-row task ${task.kind} ${task.completed ? "completed" : ""} ${
                    role === "student" && task.assignedBy === "coach" ? styles.coachAssignedTask : ""
                  }`}
                >
                  {role === "student" ? (
                    <button
                      type="button"
                      className="agenda-task-check"
                      onClick={() => toggleTask(task.id)}
                      aria-label={`${task.title} ${task.completed ? "완료 취소" : "완료"}`}
                      aria-pressed={task.completed}
                    >
                      {task.completed ? <CheckCircle2 aria-hidden="true" size={19} /> : <Circle aria-hidden="true" size={19} />}
                    </button>
                  ) : (
                    <span className="agenda-task-check" aria-hidden="true">
                      {task.completed ? <CheckCircle2 size={19} /> : <Circle size={19} />}
                    </span>
                  )}
                  <div>
                    <span>{taskKindLabels[task.kind]} · {task.assignedBy === "coach" ? "코치" : "직접"}</span>
                    <strong>{task.title}</strong>
                    {task.detail && <p>{task.detail}</p>}
                  </div>
                  <time>{task.scheduledTime}</time>
                  {role === "student" && (
                    task.assignedBy === "coach" ? (
                      <button
                        type="button"
                        className={styles.adjustTaskButton}
                        onClick={() => requestTaskAdjustment(task)}
                        aria-label={`${task.title} 코치에게 조정 요청`}
                        title="코치에게 조정 요청"
                      >
                        <MessageCircle aria-hidden="true" size={16} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="agenda-task-delete"
                        onClick={() => deleteTask(task.id)}
                        aria-label={`${task.title} 삭제`}
                        title="할 일 삭제"
                      >
                        <Trash2 aria-hidden="true" size={16} />
                      </button>
                    )
                  )}
                </article>
              ))}
              {selectedEvents.map((event) => (
                <article key={`event-${event.id}`} className={`agenda-row event ${event.category}`}>
                  <time>{formatKoreanScheduleTime(event.startsAt)}</time>
                  <div>
                    <span>{categoryLabels[event.category]} · {event.source === "assistant" ? "일정 도우미" : event.source === "coach" ? "코치" : "직접 등록"}</span>
                    <strong>{event.title}</strong>
                    {event.note && <p>{event.note}</p>}
                  </div>
                  {role === "student" && (
                    <button
                      type="button"
                      className="agenda-task-delete"
                      onClick={() => deleteCalendarEvent(event.id)}
                      aria-label={`${event.title} 일정 삭제`}
                      title="일정 삭제"
                    >
                      <Trash2 aria-hidden="true" size={16} />
                    </button>
                  )}
                </article>
              ))}
              {!selectedTasks.length && !selectedEvents.length && (
                <p className="empty-state">등록된 할 일이나 일정이 없습니다.</p>
              )}
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
