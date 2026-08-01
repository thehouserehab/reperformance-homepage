"use client";

import Link from "next/link";
import { CalendarDays, Check, ChevronRight, Dumbbell, GraduationCap, HeartPulse } from "lucide-react";
import { useState } from "react";
import { formatKoreanScheduleDateTime } from "@/lib/dateFormatting";
import { useAppState } from "./AppStateProvider";
import { StudyTimer } from "./StudyTimer";

const taskIcons = {
  study: GraduationCap,
  training: Dumbbell,
  recovery: HeartPulse,
};

const taskLabels = {
  study: "학업",
  training: "실기",
  recovery: "회복",
};

export function StudentToday() {
  const { state, toggleTask, updateCondition } = useAppState();
  const [energy, setEnergy] = useState(state.condition.energy);
  const [focus, setFocus] = useState(state.condition.focus);
  const [soreness, setSoreness] = useState(state.condition.soreness);
  const completed = state.tasks.filter((task) => task.completed).length;
  const nextEvent = state.calendarEvents.find((event) => new Date(event.endsAt).getTime() > Date.now()) ?? state.calendarEvents[0];

  return (
    <>
      <section className="today-status-band">
        <div>
          <span>오늘의 흐름</span>
          <strong>{completed}/{state.tasks.length}</strong>
          <small>필수 과제 완료</small>
        </div>
        <div className="condition-controls">
          <label>
            <span>에너지 <b>{energy}</b></span>
            <input type="range" min="1" max="5" value={energy} onChange={(event) => setEnergy(Number(event.target.value))} />
          </label>
          <label>
            <span>집중 가능 <b>{focus}</b></span>
            <input type="range" min="1" max="5" value={focus} onChange={(event) => setFocus(Number(event.target.value))} />
          </label>
          <label>
            <span>몸의 뻐근함 <b>{soreness}</b></span>
            <input type="range" min="1" max="5" value={soreness} onChange={(event) => setSoreness(Number(event.target.value))} />
          </label>
          <button type="button" onClick={() => updateCondition({ energy, focus, soreness })}>오늘 상태 저장</button>
        </div>
      </section>

      <section className="task-section" aria-labelledby="today-task-title">
        <div className="section-heading-row">
          <div>
            <p className="section-kicker">TODAY 01</p>
            <h2 id="today-task-title">오늘은 세 가지만 봅니다.</h2>
          </div>
          <span>{state.condition.checkedAt ? "상태 확인 완료" : "상태 확인 전"}</span>
        </div>

        <div className="task-list">
          {state.tasks.map((task) => {
            const Icon = taskIcons[task.kind];
            return (
              <article key={task.id} className={task.completed ? "task-row completed" : "task-row"}>
                <div className={`task-kind ${task.kind}`}>
                  <Icon aria-hidden="true" size={21} />
                  <span>{taskLabels[task.kind]}</span>
                </div>
                <div className="task-main">
                  <span>{task.scheduledTime} · {task.durationMinutes}분</span>
                  <h3>{task.title}</h3>
                  <p>{task.detail}</p>
                </div>
                <button
                  type="button"
                  className="task-check"
                  onClick={() => toggleTask(task.id)}
                  aria-label={`${task.title} ${task.completed ? "완료 취소" : "완료"}`}
                  aria-pressed={task.completed}
                >
                  <Check aria-hidden="true" size={22} />
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <StudyTimer />

      <section className="next-schedule-band" aria-labelledby="next-schedule-title">
        <div className="schedule-icon"><CalendarDays aria-hidden="true" size={24} /></div>
        <div>
          <p className="section-kicker">NEXT SCHEDULE</p>
          <h2 id="next-schedule-title">{nextEvent?.title ?? "등록된 다음 일정이 없습니다."}</h2>
          {nextEvent && <p>{formatKoreanScheduleDateTime(nextEvent.startsAt)}</p>}
        </div>
        <Link href="/calendar" aria-label="캘린더 열기"><ChevronRight aria-hidden="true" size={24} /></Link>
      </section>
    </>
  );
}
