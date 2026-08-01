"use client";

import Link from "next/link";
import { Activity, ArrowRight, BookOpenCheck, Gauge, ShieldCheck, Trophy } from "lucide-react";
import { formatKoreanMessageTime } from "@/lib/dateFormatting";
import { useAppState } from "./AppStateProvider";

const practicalRecords = [
  { event: "제자리멀리뛰기", value: "268cm", change: "+4cm", status: "코치 확인 대기" },
  { event: "10m 왕복달리기", value: "8.72초", change: "-0.08초", status: "측정 조건 확인" },
];

export function StudentRecordsWorkspace() {
  const { state } = useAppState();
  const focusedMinutes = state.studySessions.reduce((total, session) => total + session.focusedMinutes, 0);
  const completedSessions = state.studySessions.filter((session) => session.status === "completed").length;

  return (
    <>
      <section className="record-summary-band" aria-label="이번 주 기록 요약">
        <div>
          <BookOpenCheck aria-hidden="true" size={21} />
          <span>학업</span>
          <strong>{focusedMinutes}분</strong>
          <small>완료 세션 {completedSessions}회</small>
        </div>
        <div>
          <Trophy aria-hidden="true" size={21} />
          <span>실기</span>
          <strong>2종목</strong>
          <small>최근 측정 기준</small>
        </div>
        <div>
          <Gauge aria-hidden="true" size={21} />
          <span>컨디션</span>
          <strong>{state.condition.energy}/5</strong>
          <small>{state.condition.checkedAt ? "오늘 확인 완료" : "오늘 확인 필요"}</small>
        </div>
      </section>

      <section className="record-directory" aria-labelledby="record-directory-title">
        <div className="section-heading-row">
          <div>
            <p className="section-kicker">RECENT RECORDS</p>
            <h2 id="record-directory-title">최근 변화부터 확인합니다.</h2>
          </div>
        </div>

        <article className="record-directory-row">
          <div className="record-row-index">01</div>
          <div className="record-row-icon"><BookOpenCheck aria-hidden="true" size={22} /></div>
          <div className="record-row-copy">
            <span>학업 기록</span>
            <h3>{state.studySessions[0]?.subject ?? "첫 공부 세션을 기록해 주세요."}</h3>
            <p>{state.studySessions[0]?.goal ?? "과목과 한 줄 목표를 정하면 기록이 시작됩니다."}</p>
          </div>
          <div className="record-row-value">
            <strong>{state.studySessions[0]?.focusedMinutes ?? 0}분</strong>
            <span>{state.studySessions[0] ? formatKoreanMessageTime(state.studySessions[0].completedAt) : "기록 없음"}</span>
          </div>
        </article>

        {practicalRecords.map((record, index) => (
          <article className="record-directory-row" key={record.event}>
            <div className="record-row-index">0{index + 2}</div>
            <div className="record-row-icon"><Trophy aria-hidden="true" size={22} /></div>
            <div className="record-row-copy">
              <span>실기 기록</span>
              <h3>{record.event}</h3>
              <p>{record.status}</p>
            </div>
            <div className="record-row-value">
              <strong>{record.value}</strong>
              <span>{record.change}</span>
            </div>
          </article>
        ))}

        <article className="record-directory-row">
          <div className="record-row-index">04</div>
          <div className="record-row-icon"><Activity aria-hidden="true" size={22} /></div>
          <div className="record-row-copy">
            <span>컨디션</span>
            <h3>에너지 {state.condition.energy} · 집중 {state.condition.focus} · 뻐근함 {state.condition.soreness}</h3>
            <p>상세 건강·상담 메모는 학부모에게 자동 공개하지 않습니다.</p>
          </div>
          <div className="record-row-value">
            <strong>{state.condition.checkedAt ? "확인" : "대기"}</strong>
            <span>오늘</span>
          </div>
        </article>
      </section>

      <aside className="record-action-band">
        <ShieldCheck aria-hidden="true" size={24} />
        <div>
          <span>부모님 공개 범위</span>
          <strong>출결·계약·학업·실기를 각각 선택합니다.</strong>
        </div>
        <Link href="/student/privacy">공개 설정 <ArrowRight aria-hidden="true" size={17} /></Link>
      </aside>
    </>
  );
}
