"use client";

import Link from "next/link";
import { Activity, ArrowRight, BookOpenCheck, MessageSquareText, Trophy } from "lucide-react";
import { useAppState } from "./AppStateProvider";

export function CoachRecordsWorkspace() {
  const { state } = useAppState();
  const completedTasks = state.tasks.filter((task) => task.completed).length;
  const focusedMinutes = state.studySessions.reduce((total, session) => total + session.focusedMinutes, 0);

  return (
    <>
      <section className="coach-review-band">
        <div><span>검토할 학생</span><strong>1</strong></div>
        <div><span>새 실기 기록</span><strong>2</strong></div>
        <div><span>컨디션 신호</span><strong>{state.condition.soreness >= 4 ? 1 : 0}</strong></div>
      </section>

      <section className="coach-record-directory" aria-labelledby="coach-record-title">
        <div className="section-heading-row">
          <div>
            <p className="section-kicker">RECORD REVIEW</p>
            <h2 id="coach-record-title">{state.studentName} 학생 기록</h2>
          </div>
        </div>

        <article>
          <BookOpenCheck aria-hidden="true" size={23} />
          <div><span>학업</span><h3>집중 {focusedMinutes}분 · 오늘 과제 {completedTasks}/{state.tasks.length}</h3></div>
          <strong>흐름 확인</strong>
        </article>
        <article>
          <Trophy aria-hidden="true" size={23} />
          <div><span>실기</span><h3>제자리멀리뛰기 268cm · 10m 왕복달리기 8.72초</h3></div>
          <strong>2건 검토</strong>
        </article>
        <article>
          <Activity aria-hidden="true" size={23} />
          <div><span>컨디션</span><h3>에너지 {state.condition.energy}/5 · 뻐근함 {state.condition.soreness}/5</h3></div>
          <strong>{state.condition.checkedAt ? "오늘 확인" : "입력 대기"}</strong>
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
