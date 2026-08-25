"use client";

import Link from "next/link";
import { Activity, ArrowRight, BookOpenCheck, MessageSquareText, Trophy } from "lucide-react";
import { useAppState } from "./AppStateProvider";
import { getTasksForDate } from "@/lib/taskScheduling";

export function CoachRecordsWorkspace() {
  const { state } = useAppState();
  const todayTasks = getTasksForDate(state.tasks, state.scheduleDate);
  const completedTasks = todayTasks.filter((task) => task.completed).length;
  const focusedMinutes = state.studySessions.reduce((total, session) => total + session.focusedMinutes, 0);
  const recordsNeedingReview = state.studentRecords.filter(
    (record) => record.validationStatus === "needs_review"
  ).length;
  const trainingRecords = state.studentRecords
    .filter((record) => record.category === "training" && record.validationStatus === "valid")
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
  const conditionRecords = state.studentRecords
    .filter((record) => record.category === "condition" && record.validationStatus === "valid")
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
  const latestTraining = trainingRecords[0];
  const latestTrainingItem = state.recordItems.find((item) => item.id === latestTraining?.itemId);

  return (
    <>
      <section className="coach-review-band">
        <div><span>검토할 학생</span><strong>1</strong></div>
        <div><span>실기 기록</span><strong>{trainingRecords.length}</strong></div>
        <div><span>컨디션 신호</span><strong>{state.condition.soreness >= 4 ? 1 : 0}</strong></div>
      </section>

      <section className="coach-record-directory" aria-labelledby="coach-record-title">
        <div className="section-heading-row">
          <div>
            <p className="section-kicker">RECORD REVIEW</p>
            <h2 id="coach-record-title">{state.studentName} 학생 기록</h2>
          </div>
        </div>

        {recordsNeedingReview ? (
          <p className="coach-record-warning" role="status">
            입력 기준을 확인해야 하는 기록 {recordsNeedingReview}건은 최신 기록과 요약 계산에서 제외했습니다.
          </p>
        ) : null}

        <article>
          <BookOpenCheck aria-hidden="true" size={23} />
          <div><span>학업</span><h3>집중 {focusedMinutes}분 · 오늘 과제 {completedTasks}/{todayTasks.length}</h3></div>
          <strong>흐름 확인</strong>
        </article>
        <article>
          <Trophy aria-hidden="true" size={23} />
          <div>
            <span>실기</span>
            <h3>{latestTraining
              ? `${latestTrainingItem?.name ?? "직접 기록"} ${latestTraining.value}${latestTraining.unit}`
              : "아직 실기 기록이 없습니다."}</h3>
          </div>
          <strong>{trainingRecords.length}건 확인</strong>
        </article>
        <article>
          <Activity aria-hidden="true" size={23} />
          <div><span>컨디션</span><h3>에너지 {state.condition.energy}/5 · 뻐근함 {state.condition.soreness}/5</h3></div>
          <strong>{conditionRecords.length ? `${conditionRecords.length}건 확인` : "입력 대기"}</strong>
        </article>
      </section>

      <aside className="coach-record-action">
        <MessageSquareText aria-hidden="true" size={24} />
        <div><span>다음 행동</span><strong>기록 조건을 확인한 뒤 학생에게 피드백을 보냅니다.</strong></div>
        <Link href="/coach/messages">대화 열기 <ArrowRight aria-hidden="true" size={17} /></Link>
      </aside>
    </>
  );
}
