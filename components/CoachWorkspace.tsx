"use client";

import { Activity, CalendarClock, ChevronRight, MessageSquareText, ShieldCheck } from "lucide-react";
import { useAppState } from "./AppStateProvider";

export function CoachWorkspace() {
  const { state } = useAppState();
  const completedTasks = state.tasks.filter((task) => task.completed).length;
  const sharedCount = Object.values(state.guardianPermissions).filter(Boolean).length;
  const latestMessage = [...state.guardianMessages].reverse().find((message) => message.status === "sent");

  return (
    <>
      <section className="coach-priority-band">
        <div><span>오늘 확인할 학생</span><strong>1</strong></div>
        <div><span>답장 대기</span><strong>{latestMessage ? 1 : 0}</strong></div>
        <div><span>컨디션 확인</span><strong>{state.condition.checkedAt ? 0 : 1}</strong></div>
      </section>

      <section className="coach-student-section" aria-labelledby="coach-student-title">
        <div className="section-heading-row">
          <div>
            <p className="section-kicker">STUDENT QUEUE</p>
            <h2 id="coach-student-title">오늘 개입이 필요한 순서</h2>
          </div>
        </div>
        <article className="coach-student-row">
          <div className="student-avatar">김</div>
          <div className="student-summary">
            <span>고3 · 정시 준비</span>
            <h3>{state.studentName}</h3>
            <p>오늘 과제 {completedTasks}/{state.tasks.length} · 에너지 {state.condition.energy}/5 · 뻐근함 {state.condition.soreness}/5</p>
          </div>
          <div className="coach-signals">
            <span><Activity aria-hidden="true" size={17} /> 기록 확인</span>
            <span><ShieldCheck aria-hidden="true" size={17} /> 학부모 공개 {sharedCount}/4</span>
            {latestMessage && <span><MessageSquareText aria-hidden="true" size={17} /> 문의 답장 대기</span>}
          </div>
          <button type="button" className="icon-button secondary" aria-label="학생 상세 열기" title="학생 상세 열기">
            <ChevronRight aria-hidden="true" size={21} />
          </button>
        </article>
      </section>

      <section className="coach-next-action">
        <CalendarClock aria-hidden="true" size={25} />
        <div>
          <p className="section-kicker">NEXT ACTION</p>
          <h2>수업 전 컨디션과 제멀 과제를 확인합니다.</h2>
        </div>
        <button type="button">피드백 작성</button>
      </section>
    </>
  );
}
