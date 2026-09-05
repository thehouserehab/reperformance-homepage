"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Dumbbell,
  GraduationCap,
  HeartPulse,
  Plus,
  Timer,
  X,
} from "lucide-react";
import { formatKoreanMessageTime } from "@/lib/dateFormatting";
import { getTasksForDate } from "@/lib/taskScheduling";
import type { RecordCategory, TaskKind } from "@/lib/types";
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
const recordCategoryLabels: Record<RecordCategory, string> = {
  study: "공부",
  training: "운동",
  condition: "컨디션",
};
const RECENT_RECORD_COUNT = 3;
const CONDITION_ONBOARDING_SEEN_KEY = "rp-app-condition-onboarding-seen";

export function StudentToday() {
  const { state, toggleTask, updateCondition } = useAppState();
  const [energy, setEnergy] = useState(state.condition.energy);
  const [focus, setFocus] = useState(state.condition.focus);
  const [soreness, setSoreness] = useState(state.condition.soreness);
  const [showConditionOnboarding, setShowConditionOnboarding] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const alreadySeen = window.localStorage.getItem(CONDITION_ONBOARDING_SEEN_KEY);
    if (!alreadySeen && !state.condition.checkedAt) {
      setShowConditionOnboarding(true);
    }
    // 앱을 처음 실행했을 때만 한 번 확인하면 되므로 마운트 시 한 번만 검사합니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismissConditionOnboarding = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CONDITION_ONBOARDING_SEEN_KEY, "1");
    }
    setShowConditionOnboarding(false);
  };

  const saveConditionOnboarding = () => {
    updateCondition({ energy, focus, soreness });
    dismissConditionOnboarding();
  };
  const todayTasks = getTasksForDate(state.tasks, state.scheduleDate);
  const completed = todayTasks.filter((task) => task.completed).length;
  const groupedTasks = Object.fromEntries(
    taskKinds.map((kind) => [kind, todayTasks.filter((task) => task.kind === kind)])
  ) as Record<TaskKind, typeof todayTasks>;
  const recordItemLookup = new Map(state.recordItems.map((item) => [item.id, item]));
  const recentRecords = [...state.studentRecords]
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
    .slice(0, RECENT_RECORD_COUNT);

  return (
    <>
    <div className="student-home-stack">
      <section className="home-focus-section tasks" aria-labelledby="today-task-title">
        <header className="home-section-heading">
          <div>
            <span>01</span>
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

      <section className="home-focus-section study-timer-teaser" aria-labelledby="study-timer-title">
        <header className="home-section-heading">
          <div>
            <span>02</span>
            <div>
              <p className="section-kicker">FOCUS</p>
              <h2 id="study-timer-title">공부 타이머</h2>
            </div>
          </div>
          <Timer aria-hidden="true" size={22} />
        </header>

        <Link href="/student/study" className="study-timer-teaser-link">
          <span>집중할 시간만 정하고 바로 타이머를 시작해보세요.</span>
          <ChevronRight aria-hidden="true" size={18} />
        </Link>
      </section>

      <section className="home-focus-section recent-records" aria-labelledby="recent-records-title">
        <header className="home-section-heading">
          <div>
            <span>03</span>
            <div>
              <p className="section-kicker">RECORDS</p>
              <h2 id="recent-records-title">최근 기록</h2>
            </div>
          </div>
          <Link href="/student/records?view=entry" className="recent-records-add">
            <Plus aria-hidden="true" size={16} /> 기록 추가
          </Link>
        </header>

        <div className="recent-records-list">
          {recentRecords.length ? recentRecords.map((record) => {
            const item = recordItemLookup.get(record.itemId);
            return (
              <div className="recent-records-row" key={record.id}>
                <span className="recent-records-category">{recordCategoryLabels[record.category]}</span>
                <div className="recent-records-copy">
                  <strong>{item?.name ?? "삭제된 항목"}</strong>
                  <span>{record.value}{record.unit}</span>
                </div>
                <time dateTime={record.recordedAt}>{formatKoreanMessageTime(record.recordedAt)}</time>
              </div>
            );
          }) : (
            <p className="recent-records-empty">아직 기록이 없습니다. 기록 추가에서 첫 기록을 남겨보세요.</p>
          )}
        </div>

        {recentRecords.length > 0 ? (
          <Link href="/student/records" className="recent-records-more">
            전체 기록 보기 <ArrowRight aria-hidden="true" size={15} />
          </Link>
        ) : null}
      </section>
    </div>

    {showConditionOnboarding ? (
      <div className="condition-onboarding-backdrop" role="presentation">
        <div
          className="condition-onboarding-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="condition-onboarding-title"
        >
          <button
            type="button"
            className="condition-onboarding-close"
            onClick={dismissConditionOnboarding}
            aria-label="닫기"
          >
            <X aria-hidden="true" size={18} />
          </button>
          <p className="section-kicker">CHECK IN</p>
          <h2 id="condition-onboarding-title">오늘 컨디션을 알려주세요</h2>
          <p className="condition-onboarding-lead">처음 한 번만 확인해요. 이후에는 &quot;오늘&quot; 탭에 따로 뜨지 않아요.</p>

          <div className="condition-onboarding-grid">
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
          </div>

          <div className="condition-onboarding-actions">
            <button type="button" className="condition-onboarding-skip" onClick={dismissConditionOnboarding}>
              나중에
            </button>
            <button type="button" className="condition-onboarding-save" onClick={saveConditionOnboarding}>
              <Check aria-hidden="true" size={17} /> 상태 저장
            </button>
          </div>
        </div>
      </div>
    ) : null}
    </>
  );
}
