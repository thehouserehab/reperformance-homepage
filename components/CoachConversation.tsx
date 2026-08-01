"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Bot, Check, MessageCircle, Send, Sparkles, UserRound } from "lucide-react";
import { formatKoreanMessageTime } from "@/lib/dateFormatting";
import type { ConversationParticipant } from "@/lib/types";
import { useAppState } from "./AppStateProvider";

type ComposeMode = "direct" | "assistant";

export function CoachConversation({ role }: { role: ConversationParticipant }) {
  const { state, sendCoachConversationMessage } = useAppState();
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<ComposeMode>("direct");
  const [pending, setPending] = useState(false);
  const [assistantText, setAssistantText] = useState("");
  const [draftWasAssisted, setDraftWasAssisted] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  const conversationTitle =
    role === "student" ? "담당 코치와 대화" : `${state.studentName} 학생과 대화`;

  useEffect(() => {
    const timeline = timelineRef.current;
    if (timeline) timeline.scrollTop = timeline.scrollHeight;
  }, [state.coachConversation.length]);

  const changeMode = (nextMode: ComposeMode) => {
    setMode(nextMode);
    setAssistantText("");
    if (nextMode === "direct") setDraftWasAssisted(false);
  };

  const requestDraft = async () => {
    const source = message.trim();
    if (source.length < 2) return;

    setPending(true);
    setAssistantText("");
    try {
      const response = await fetch("/api/messages/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: source, role }),
      });
      const result = (await response.json()) as { draft?: string; error?: string };
      if (!response.ok || !result.draft) {
        throw new Error(result.error || "초안을 만들지 못했습니다.");
      }
      setMessage(result.draft);
      setDraftWasAssisted(true);
      setAssistantText("초안을 정리했습니다. 내용을 확인한 뒤 직접 보내세요.");
    } catch (error) {
      setAssistantText(error instanceof Error ? error.message : "초안을 만들지 못했습니다.");
    } finally {
      setPending(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const body = message.trim();
    if (!body) return;
    sendCoachConversationMessage(role, body, draftWasAssisted);
    setMessage("");
    setAssistantText("");
    setDraftWasAssisted(false);
  };

  return (
    <section className="conversation-workspace" aria-labelledby="conversation-title">
      <header className="conversation-header">
        <div className="conversation-counterpart-icon">
          {role === "student" ? (
            <MessageCircle aria-hidden="true" size={23} />
          ) : (
            <UserRound aria-hidden="true" size={23} />
          )}
        </div>
        <div>
          <p className="section-kicker">PRIVATE COACHING</p>
          <h2 id="conversation-title">{conversationTitle}</h2>
          <span>학생과 코치만 확인 · 학부모에게 자동 공개되지 않음</span>
        </div>
      </header>

      <div className="conversation-timeline" ref={timelineRef} aria-live="polite">
        {state.coachConversation.map((item) => {
          const mine = item.sender === role;
          const senderLabel = item.sender === "student" ? state.studentName : "담당 코치";
          return (
            <article key={item.id} className={`conversation-message ${mine ? "mine" : "theirs"}`}>
              <div className="message-meta">
                <strong>{mine ? "나" : senderLabel}</strong>
                <time dateTime={item.sentAt}>{formatKoreanMessageTime(item.sentAt)}</time>
              </div>
              <p>{item.body}</p>
              {item.aiAssisted && (
                <span className="assisted-label">
                  <Sparkles aria-hidden="true" size={12} /> AI 도움으로 정리
                </span>
              )}
            </article>
          );
        })}
      </div>

      <form className="conversation-composer" onSubmit={submit}>
        <div className="composer-toolbar">
          <div className="compose-mode" aria-label="메시지 작성 방식">
            <button
              type="button"
              className={mode === "direct" ? "active" : undefined}
              onClick={() => changeMode("direct")}
            >
              <Send aria-hidden="true" size={15} /> 직접 작성
            </button>
            <button
              type="button"
              className={mode === "assistant" ? "active" : undefined}
              onClick={() => changeMode("assistant")}
            >
              <Bot aria-hidden="true" size={16} /> AI 도움
            </button>
          </div>
          <span>{message.length}/600</span>
        </div>

        {mode === "assistant" && (
          <div className="assistant-compose-note">
            <Bot aria-hidden="true" size={18} />
            <p>
              <strong>메모를 문장으로 정리합니다.</strong> 현재 프로토타입은 외부 AI에 내용을 보내지 않으며,
              자동 발송하지 않습니다.
            </p>
          </div>
        )}

        <label className="conversation-input">
          <span className="sr-only">메시지 내용</span>
          <textarea
            value={message}
            onChange={(event) => {
              setMessage(event.target.value);
              setDraftWasAssisted(false);
              setAssistantText("");
            }}
            rows={4}
            maxLength={600}
            placeholder={
              role === "student"
                ? "오늘 컨디션, 실기 질문, 일정 문의를 남겨보세요."
                : "훈련 피드백이나 다음 과제를 전달하세요."
            }
          />
        </label>

        <div className="composer-actions">
          <p role="status">{assistantText}</p>
          {mode === "assistant" && (
            <button
              type="button"
              className="draft-message-button"
              onClick={requestDraft}
              disabled={pending || message.trim().length < 2}
            >
              <Sparkles aria-hidden="true" size={17} /> {pending ? "정리 중" : "초안 정리"}
            </button>
          )}
          <button type="submit" className="send-message-button" disabled={!message.trim()}>
            {mode === "assistant" ? (
              <>
                <Check aria-hidden="true" size={18} /> 확인하고 보내기
              </>
            ) : (
              <>
                <Send aria-hidden="true" size={18} /> 메시지 보내기
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
}
