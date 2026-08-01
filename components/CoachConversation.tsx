"use client";

import { FormEvent, Fragment, useEffect, useRef, useState } from "react";
import { Bot, Check, Send, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import {
  formatKoreanMessageClock,
  formatKoreanMessageDate,
  getKoreanMessageDateKey,
} from "@/lib/dateFormatting";
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
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const counterpartName = role === "student" ? "담당 코치" : `${state.studentName} 학생`;

  useEffect(() => {
    const timeline = timelineRef.current;
    if (timeline) timeline.scrollTop = timeline.scrollHeight;
  }, [state.coachConversation.length]);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 96)}px`;
  }, [message]);

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
      setAssistantText("초안을 정리했습니다. 확인 후 보내주세요.");
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

  let previousDateKey = "";

  return (
    <section className="conversation-workspace" aria-labelledby="conversation-title">
      <header className="conversation-header">
        <div className="conversation-counterpart-icon" aria-hidden="true">
          <UserRound size={22} />
        </div>
        <div className="conversation-counterpart-copy">
          <h2 id="conversation-title">{counterpartName}</h2>
          <span><i aria-hidden="true" /> 1:1 코칭 대화</span>
        </div>
        <div className="conversation-privacy" title="학생과 담당 코치만 확인할 수 있습니다.">
          <ShieldCheck aria-hidden="true" size={16} />
          <span>학생·코치만</span>
        </div>
      </header>

      <div className="conversation-timeline" ref={timelineRef} aria-live="polite">
        {state.coachConversation.map((item) => {
          const mine = item.sender === role;
          const senderLabel = item.sender === "student" ? state.studentName : "담당 코치";
          const dateKey = getKoreanMessageDateKey(item.sentAt);
          const showDate = dateKey !== previousDateKey;
          previousDateKey = dateKey;

          return (
            <Fragment key={item.id}>
              {showDate && (
                <div className="conversation-date-divider">
                  <span>{formatKoreanMessageDate(item.sentAt)}</span>
                </div>
              )}
              <article className={`conversation-message-row ${mine ? "mine" : "theirs"}`}>
                {!mine && (
                  <span className="message-avatar" aria-hidden="true">
                    <UserRound size={16} />
                  </span>
                )}
                <div className="message-bundle">
                  {!mine && <strong className="message-sender">{senderLabel}</strong>}
                  <div className="message-bubble-line">
                    <div className="conversation-message">
                      <p>{item.body}</p>
                      {item.aiAssisted && (
                        <span className="assisted-label">
                          <Sparkles aria-hidden="true" size={11} /> AI로 문장 정리
                        </span>
                      )}
                    </div>
                    <time className="message-time" dateTime={item.sentAt}>
                      {formatKoreanMessageClock(item.sentAt)}
                    </time>
                  </div>
                </div>
              </article>
            </Fragment>
          );
        })}
      </div>

      <form className="conversation-composer" onSubmit={submit}>
        <div className="composer-toolbar">
          <div className="compose-mode" aria-label="메시지 작성 방식">
            <button
              type="button"
              className={mode === "direct" ? "active" : undefined}
              aria-pressed={mode === "direct"}
              onClick={() => changeMode("direct")}
            >
              직접 입력
            </button>
            <button
              type="button"
              className={mode === "assistant" ? "active" : undefined}
              aria-pressed={mode === "assistant"}
              onClick={() => changeMode("assistant")}
            >
              <Bot aria-hidden="true" size={14} /> AI 문장 정리
            </button>
          </div>
          <span>{message.length}/600</span>
        </div>

        {mode === "assistant" && (
          <div className="assistant-compose-status">
            <ShieldCheck aria-hidden="true" size={14} /> 외부 전송 없이 초안만 정리합니다.
          </div>
        )}

        <div className="message-entry">
          <label className="conversation-input">
            <span className="sr-only">메시지 내용</span>
            <textarea
              ref={inputRef}
              value={message}
              onChange={(event) => {
                setMessage(event.target.value);
                setDraftWasAssisted(false);
                setAssistantText("");
              }}
              rows={1}
              maxLength={600}
              placeholder={role === "student" ? "코치에게 메시지 보내기" : "학생에게 메시지 보내기"}
            />
          </label>

          {mode === "assistant" && (
            <button
              type="button"
              className="draft-message-button"
              title="작성한 메모를 문장으로 정리"
              aria-label="작성한 메모를 문장으로 정리"
              onClick={requestDraft}
              disabled={pending || message.trim().length < 2}
            >
              {pending ? <span className="button-spinner" aria-hidden="true" /> : <Sparkles aria-hidden="true" size={18} />}
            </button>
          )}

          <button
            type="submit"
            className="send-message-button"
            title={mode === "assistant" ? "확인하고 보내기" : "메시지 보내기"}
            aria-label={mode === "assistant" ? "확인하고 보내기" : "메시지 보내기"}
            disabled={!message.trim()}
          >
            {mode === "assistant" && draftWasAssisted ? (
              <Check aria-hidden="true" size={19} />
            ) : (
              <Send aria-hidden="true" size={19} />
            )}
          </button>
        </div>

        <p className="composer-feedback" role="status">{assistantText}</p>
      </form>
    </section>
  );
}
