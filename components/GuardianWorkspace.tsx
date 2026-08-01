"use client";

import { FormEvent, useState } from "react";
import { CreditCard, GraduationCap, LockKeyhole, MessageCircleQuestion, Send, ShieldCheck, Trophy, UserCheck } from "lucide-react";
import { useAppState } from "./AppStateProvider";
import type { GuardianPermissionKey } from "@/lib/types";

const guardianSections: {
  key: GuardianPermissionKey;
  title: string;
  icon: typeof UserCheck;
  sharedText: string;
}[] = [
  { key: "attendance", title: "출결 확인", icon: UserCheck, sharedText: "이번 주 예정 수업 2회 · 완료 1회" },
  { key: "contract", title: "계약·결제", icon: CreditCard, sharedText: "계약 진행 상태와 결제 확인 정보를 볼 수 있습니다." },
  { key: "academics", title: "학업", icon: GraduationCap, sharedText: "이번 주 공부 기록과 계획 이행 요약을 볼 수 있습니다." },
  { key: "practical", title: "실기", icon: Trophy, sharedText: "최근 실기 기록과 변화 요약을 볼 수 있습니다." },
];

export function GuardianWorkspace() {
  const { state, sendGuardianMessage } = useAppState();
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const body = message.trim();
    if (!body) return;
    sendGuardianMessage(body);
    setMessage("");
    setSent(true);
  };

  return (
    <>
      <section className="guardian-message-panel" aria-labelledby="guardian-message-title">
        <div>
          <p className="section-kicker">GUARDIAN CONTACT</p>
          <h2 id="guardian-message-title">코치에게 문의</h2>
          <p>학부모 계정의 기본 권한은 문의 메시지입니다.</p>
        </div>
        <form onSubmit={submit}>
          <label>
            <span>문의 내용</span>
            <textarea value={message} onChange={(event) => { setMessage(event.target.value); setSent(false); }} rows={4} maxLength={500} placeholder="수업 일정이나 상담 관련 문의를 남겨주세요." />
          </label>
          <button type="submit" disabled={!message.trim()}>
            <Send aria-hidden="true" size={18} /> 문의 보내기
          </button>
          {sent && <p className="form-success" role="status">문의가 기록되었습니다.</p>}
        </form>
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
                  <p>{allowed ? section.sharedText : "학생이 공개를 선택하면 확인할 수 있습니다."}</p>
                </div>
                {!allowed && <LockKeyhole aria-hidden="true" size={19} />}
              </article>
            );
          })}
        </div>
      </section>

      <aside className="guardian-principle">
        <MessageCircleQuestion aria-hidden="true" size={23} />
        <p>학생의 전체 대화, 개인 멘탈 기록, 민감한 건강·상담 메모와 AI 질문 원문은 학부모 화면에 표시하지 않습니다.</p>
      </aside>
    </>
  );
}
