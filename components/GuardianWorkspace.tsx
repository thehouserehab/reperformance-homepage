"use client";

import { FormEvent, useState } from "react";
import { MessageCircleQuestion, Send } from "lucide-react";
import { useAppState } from "./AppStateProvider";

export function GuardianWorkspace() {
  const { sendGuardianMessage } = useAppState();
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const body = message.trim();
    if (!body) return;
    const saved = sendGuardianMessage(body);
    if (!saved) return;
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

      <aside className="guardian-principle">
        <MessageCircleQuestion aria-hidden="true" size={23} />
        <p>학생이 공유한 출결·계약·학업·실기 요약은 공개 요약 메뉴에서 별도로 확인합니다.</p>
      </aside>
    </>
  );
}
