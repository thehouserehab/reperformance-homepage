"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Square } from "lucide-react";
import { useAppState } from "./AppStateProvider";

const presets = [
  { label: "가볍게", focus: 25, break: 5 },
  { label: "기본", focus: 50, break: 10 },
  { label: "깊게", focus: 90, break: 20 },
] as const;

const subjects = ["국어", "영어", "수학", "탐구", "학교 과제", "기타"];

function formatSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function StudyTimer() {
  const { state, addStudySession } = useAppState();
  const [subject, setSubject] = useState("영어");
  const [goal, setGoal] = useState("독해 2지문과 오답 이유 정리");
  const [focusMinutes, setFocusMinutes] = useState(50);
  const [breakMinutes, setBreakMinutes] = useState(10);
  const [remainingSeconds, setRemainingSeconds] = useState(50 * 60);
  const [phase, setPhase] = useState<"focus" | "break">("focus");
  const [running, setRunning] = useState(false);
  const deadlineRef = useRef<number | null>(null);
  const completedRef = useRef(false);

  const totalSeconds = phase === "focus" ? focusMinutes * 60 : breakMinutes * 60;
  const progress = Math.min(100, Math.max(0, ((totalSeconds - remainingSeconds) / totalSeconds) * 100));

  const recordSession = useCallback(
    (status: "completed" | "stopped", minutes: number) => {
      if (minutes < 1 || completedRef.current) return;
      completedRef.current = true;
      addStudySession({
        id: crypto.randomUUID(),
        subject,
        goal: goal.trim() || "집중 공부",
        focusedMinutes: minutes,
        completedAt: new Date().toISOString(),
        status,
      });
    },
    [addStudySession, goal, subject]
  );

  useEffect(() => {
    if (!running || deadlineRef.current === null) return;
    const interval = window.setInterval(() => {
      const next = Math.max(0, Math.ceil((deadlineRef.current! - Date.now()) / 1000));
      setRemainingSeconds(next);
      if (next === 0) {
        window.clearInterval(interval);
        setRunning(false);
        deadlineRef.current = null;
        if (phase === "focus") {
          recordSession("completed", focusMinutes);
          setPhase("break");
          setRemainingSeconds(breakMinutes * 60);
        } else {
          setPhase("focus");
          setRemainingSeconds(focusMinutes * 60);
        }
      }
    }, 250);
    return () => window.clearInterval(interval);
  }, [breakMinutes, focusMinutes, phase, recordSession, running]);

  const start = () => {
    completedRef.current = false;
    deadlineRef.current = Date.now() + remainingSeconds * 1000;
    setRunning(true);
  };

  const pause = () => {
    if (deadlineRef.current !== null) {
      setRemainingSeconds(Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000)));
    }
    deadlineRef.current = null;
    setRunning(false);
  };

  const reset = () => {
    deadlineRef.current = null;
    setRunning(false);
    setPhase("focus");
    setRemainingSeconds(focusMinutes * 60);
    completedRef.current = false;
  };

  const stopAndRecord = () => {
    const elapsedMinutes = Math.floor((focusMinutes * 60 - remainingSeconds) / 60);
    pause();
    if (phase === "focus") recordSession("stopped", elapsedMinutes);
    setPhase("focus");
    setRemainingSeconds(focusMinutes * 60);
  };

  const selectPreset = (focus: number, rest: number) => {
    if (running) return;
    setFocusMinutes(focus);
    setBreakMinutes(rest);
    setPhase("focus");
    setRemainingSeconds(focus * 60);
  };

  const todayMinutes = useMemo(
    () => state.studySessions.reduce((sum, session) => sum + session.focusedMinutes, 0),
    [state.studySessions]
  );

  return (
    <section className="timer-tool" id="study-timer" aria-labelledby="study-timer-title">
      <div className="timer-copy">
        <p className="section-kicker">FOCUS TIMER</p>
        <h2 id="study-timer-title">지금 한 번만 집중합니다.</h2>
        <p>오늘 누적 {todayMinutes}분 · 비교 없이 내 흐름만 기록합니다.</p>

        <div className="timer-fields">
          <label>
            <span>과목</span>
            <select value={subject} onChange={(event) => setSubject(event.target.value)} disabled={running}>
              {subjects.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span>이번 목표</span>
            <input value={goal} onChange={(event) => setGoal(event.target.value)} disabled={running} maxLength={80} />
          </label>
        </div>

        <div className="timer-presets" aria-label="집중 시간 선택">
          {presets.map((preset) => (
            <button
              type="button"
              key={preset.label}
              className={focusMinutes === preset.focus ? "selected" : undefined}
              onClick={() => selectPreset(preset.focus, preset.break)}
              disabled={running}
            >
              <b>{preset.focus}/{preset.break}</b>
              <span>{preset.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="timer-face" style={{ "--timer-progress": `${progress}%` } as React.CSSProperties}>
        <span>{phase === "focus" ? "집중" : "회복"}</span>
        <strong aria-live="polite">{formatSeconds(remainingSeconds)}</strong>
        <small>{subject}</small>
        <div className="timer-controls">
          <button type="button" className="icon-button secondary" onClick={reset} title="타이머 초기화" aria-label="타이머 초기화">
            <RotateCcw aria-hidden="true" size={20} />
          </button>
          {running ? (
            <button type="button" className="icon-button primary" onClick={pause} title="잠시 멈춤" aria-label="잠시 멈춤">
              <Pause aria-hidden="true" size={23} fill="currentColor" />
            </button>
          ) : (
            <button type="button" className="icon-button primary" onClick={start} title="집중 시작" aria-label="집중 시작">
              <Play aria-hidden="true" size={23} fill="currentColor" />
            </button>
          )}
          <button type="button" className="icon-button secondary" onClick={stopAndRecord} title="기록하고 종료" aria-label="기록하고 종료">
            <Square aria-hidden="true" size={19} fill="currentColor" />
          </button>
        </div>
      </div>
    </section>
  );
}
