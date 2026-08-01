"use client";

import {
  CreditCard,
  GraduationCap,
  LockKeyhole,
  MessageCircleQuestion,
  ShieldCheck,
  Trophy,
  UserCheck,
} from "lucide-react";
import type { GuardianPermissionKey } from "@/lib/types";
import { useAppState } from "./AppStateProvider";

const guardianSections: {
  key: GuardianPermissionKey;
  title: string;
  icon: typeof UserCheck;
  sharedText: (focusedMinutes: number) => string;
}[] = [
  { key: "attendance", title: "출결 확인", icon: UserCheck, sharedText: () => "이번 주 예정 수업 2회 · 완료 1회" },
  { key: "contract", title: "계약·결제", icon: CreditCard, sharedText: () => "계약 검토 전 · 결제 정보 없음" },
  { key: "academics", title: "학업", icon: GraduationCap, sharedText: (minutes) => `이번 주 집중 기록 ${minutes}분` },
  { key: "practical", title: "실기", icon: Trophy, sharedText: () => "최근 제자리멀리뛰기 268cm · 코치 확인 대기" },
];

export function GuardianSummaryWorkspace() {
  const { state } = useAppState();
  const sharedCount = Object.values(state.guardianPermissions).filter(Boolean).length;
  const focusedMinutes = state.studySessions.reduce((total, session) => total + session.focusedMinutes, 0);

  return (
    <>
      <section className="privacy-summary-band guardian-summary-band">
        <ShieldCheck aria-hidden="true" size={30} />
        <div>
          <span>학생이 공개한 항목</span>
          <strong>{sharedCount}개</strong>
          <p>공개 여부는 학생이 항목별로 결정합니다.</p>
        </div>
      </section>

      <section className="guardian-access-section" aria-labelledby="guardian-access-title">
        <div className="section-heading-row">
          <div>
            <p className="section-kicker">STUDENT SHARING</p>
            <h2 id="guardian-access-title">학생이 공개한 정보</h2>
          </div>
          <ShieldCheck aria-hidden="true" size={24} />
        </div>
        <div className="guardian-access-grid">
          {guardianSections.map((section) => {
            const Icon = section.icon;
            const allowed = state.guardianPermissions[section.key];
            return (
              <article key={section.key} className={allowed ? "allowed" : "locked"}>
                <div className="access-icon"><Icon aria-hidden="true" size={22} /></div>
                <div>
                  <span>{allowed ? "공개됨" : "비공개"}</span>
                  <h3>{section.title}</h3>
                  <p>{allowed ? section.sharedText(focusedMinutes) : "학생이 공개를 선택하면 확인할 수 있습니다."}</p>
                </div>
                {!allowed && <LockKeyhole aria-hidden="true" size={19} />}
              </article>
            );
          })}
        </div>
      </section>

      <aside className="guardian-principle">
        <MessageCircleQuestion aria-hidden="true" size={23} />
        <p>학생-코치 대화, 멘탈 기록, 건강·상담 메모와 AI 질문 원문은 이 화면에 표시하지 않습니다.</p>
      </aside>
    </>
  );
}
