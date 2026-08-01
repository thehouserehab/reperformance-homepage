"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import {
  Bot,
  CalendarPlus,
  Check,
  Dumbbell,
  GraduationCap,
  HeartPulse,
  MessageCircle,
  Send,
  Sparkles,
} from "lucide-react";
import { getTasksForDate } from "@/lib/taskScheduling";
import type { TaskKind } from "@/lib/types";
import { useAppState } from "./AppStateProvider";

const taskIcons = {
  study: GraduationCap,
  training: Dumbbell,
  recovery: HeartPulse,
};

const taskLabels: Record<TaskKind, string> = {
  study: "공부",
  training: "운동",
  recovery: "회복",
};

const taskKinds: TaskKind[] = ["study", "training", "recovery"];
const directScheduleIntentPattern = /일정|캘린더|등록|추가|예약|잡아|넣어/;
const temporalIntentPattern = /몇\s*시|오전|오후|오늘|내일|모레|요일|\d{1,2}시/;
const consultationIntentPattern = /상담|입시|운동|식단|멘탈|부상|통증|자세|코치|진로/;

export function StudentToday() {
  const router = useRouter();
  const { state, toggleTask, updateCondition } = useAppState();
  const [energy, setEnergy] = useState(state.condition.energy);
  const [focus, setFocus] = useState(state.condition.focus);
  const [soreness, setSoreness] = useState(state.condition.soreness);
  const [assistantPrompt, setAssistantPrompt] = useState("");
  const [assistantFeedback, setAssistantFeedback] = useState("");
  const todayTasks = getTasksForDate(state.tasks, state.scheduleDate);
  const completed = todayTasks.filter((task) => task.completed).length;
  const groupedTasks = Object.fromEntries(
    taskKinds.map((kind) => [kind, todayTasks.filter((task) => task.kind === kind)])
  ) as Record<TaskKind, typeof todayTasks>;

  const openCalendarAssistant = (prompt: string) => {
    window.sessionStorage.setItem("rp-app-calendar-assistant-request", prompt);
    window.sessionStorage.setItem("rp-app-calendar-assistant-autosave", "true");
    setAssistantFeedback("일정을 정리해 캘린더에 등록합니다.");
    router.push("/calendar?from=home-assistant");
  };

  const openCoachConversation = (prompt: string) => {
    window.sessionStorage.setItem("rp-app-coach-message-draft", prompt);
    window.sessionStorage.setItem("rp-app-coach-message-mode", "assistant");
    setAssistantFeedback("담당 코치 대화창으로 이동합니다.");
    router.push("/student/messages?from=home-assistant");
  };

  const submitAssistant = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const prompt = assistantPrompt.trim();
    if (prompt.length < 2) return;
    const shouldOpenCalendar = directScheduleIntentPattern.test(prompt)
      || (!consultationIntentPattern.test(prompt) && temporalIntentPattern.test(prompt));
    if (shouldOpenCalendar) openCalendarAssistant(prompt);
    else openCoachConversation(prompt);
  };

  return (
    <div className="student-home-stack">
      <section className="home-focus-section condition" aria-labelledby="condition-title">
        <header className="home-section-heading">
          <div>
            <span>01</span>
            <div>
              <p className="section-kicker">CHECK IN</p>
              <h2 id="condition-title">오늘 상태 저장</h2>
            </div>
          </div>
          <strong>{state.condition.checkedAt ? "저장 완료" : "확인 전"}</strong>
        </header>

        <div className="home-condition-grid">
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
          <button type="button" onClick={() => updateCondition({ energy, focus, soreness })}>
            <Check aria-hidden="true" size={17} /> 상태 저장
          </button>
        </div>
      </section>

      <section className="home-focus-section tasks" aria-labelledby="today-task-title">
        <header className="home-section-heading">
          <div>
            <span>02</span>
            <div>
              <p className="section-kicker">TODAY</p>
              <h2 id="today-task-title">오늘의 할 일</h2>
            </div>
          </div>
          <strong aria-label={`${todayTasks.length}개 중 ${completed}개 완료`}>{completed}/{todayTasks.length}</strong>
        </header>

        <div className="home-task-groups">
          {taskKinds.map((kind) => {
            const Icon = taskIcons[kind];
            const tasks = groupedTasks[kind];
            return (
              <section className={`home-task-group ${kind}`} key={kind} aria-label={taskLabels[kind]}>
                <div className="home-task-group-title">
                  <Icon aria-hidden="true" size={18} />
                  <strong>{taskLabels[kind]}</strong>
                  <span>{tasks.length}</span>
                </div>
                <div className="home-task-items">
                  {tasks.length ? tasks.map((task) => (
                    <article className={task.completed ? "home-task-item completed" : "home-task-item"} key={task.id}>
                      <button
                        type="button"
                        className="home-task-check"
                        onClick={() => toggleTask(task.id)}
                        aria-label={`${task.title} ${task.completed ? "완료 취소" : "완료"}`}
                        aria-pressed={task.completed}
                      >
                        <Check aria-hidden="true" size={16} />
                      </button>
                      <div>
                        <strong>{task.title}</strong>
                        <span>{task.scheduledTime} · {task.durationMinutes}분</span>
                      </div>
                    </article>
                  )) : <p>오늘 등록된 할 일이 없습니다.</p>}
                </div>
              </section>
            );
          })}
        </div>
      </section>

      <section className="home-focus-section ai" aria-labelledby="home-ai-title">
        <header className="home-section-heading">
          <div>
            <span>03</span>
            <div>
              <p className="section-kicker">RP ASSISTANT</p>
              <h2 id="home-ai-title">RP AI 도우미</h2>
            </div>
          </div>
          <Bot aria-hidden="true" size={22} />
        </header>

        <p className="home-assistant-lead">한 문장으로 말하면 일정 등록이나 코치 상담까지 바로 이어드려요.</p>
        <form className="home-assistant-form" onSubmit={submitAssistant}>
          <label>
            <span className="sr-only">RP AI 도우미에게 요청</span>
            <Sparkles aria-hidden="true" size={18} />
            <input
              value={assistantPrompt}
              onChange={(event) => {
                setAssistantPrompt(event.target.value);
                setAssistantFeedback("");
              }}
              maxLength={240}
              placeholder="예: 내일 오후 6시에 수학 공부 50분 등록해줘"
            />
          </label>
          <button type="submit" aria-label="요청 보내기" title="요청 보내기" disabled={assistantPrompt.trim().length < 2}>
            <Send aria-hidden="true" size={19} />
          </button>
        </form>
        <div className="home-assistant-actions" aria-label="빠른 도움 선택">
          <button type="button" onClick={() => setAssistantPrompt("내일 오후 6시에 공부 일정 50분 등록해줘")}>
            <CalendarPlus aria-hidden="true" size={17} /> 일정 등록
          </button>
          <button type="button" onClick={() => openCoachConversation("체대입시 준비 방향을 코치와 상담하고 싶어요.")}>
            <MessageCircle aria-hidden="true" size={17} /> 입시 상담
          </button>
          <button type="button" onClick={() => openCoachConversation("현재 운동과 회복 상태를 코치와 상담하고 싶어요.")}>
            <Dumbbell aria-hidden="true" size={17} /> 운동 상담
          </button>
        </div>
        <p className="home-assistant-feedback" role="status">{assistantFeedback}</p>
      </section>
    </div>
  );
}
