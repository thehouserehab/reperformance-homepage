"use client";

import { useRouter } from "next/navigation";
import { FormEvent, Fragment, useEffect, useRef, useState } from "react";
import { Bot, CalendarCheck2, MessageCircle, Send } from "lucide-react";
import type { CalendarAssistantResult } from "@/lib/calendarAssistant";
import {
  formatKoreanMessageClock,
  formatKoreanMessageDate,
  getKoreanMessageDateKey,
} from "@/lib/dateFormatting";
import { useAppState } from "./AppStateProvider";

const directScheduleIntentPattern = /일정|캘린더|등록|추가|예약|잡아|넣어/;
const temporalIntentPattern = /몇\s*시|오전|오후|오늘|내일|모레|요일|\d{1,2}시/;
const consultationIntentPattern = /상담|입시|운동|식단|멘탈|부상|통증|자세|코치|진로/;

export function StudentAssistantChat() {
  const router = useRouter();
  const { state, hydrated, addCalendarEvent, sendAssistantMessage } = useAppState();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const timeline = timelineRef.current;
    if (timeline) timeline.scrollTop = timeline.scrollHeight;
  }, [state.assistantConversation.length]);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 96)}px`;
  }, [message]);

  const goToCalendar = () => {
    router.push("/calendar");
  };

  const goToCoach = (prompt: string) => {
    window.sessionStorage.setItem("rp-app-coach-message-draft", prompt);
    window.sessionStorage.setItem("rp-app-coach-message-mode", "assistant");
    router.push("/student/messages?from=assistant-chat");
  };

  const handleScheduleIntent = async (prompt: string) => {
    try {
      const response = await fetch("/api/calendar/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt }),
      });
      const result = (await response.json()) as CalendarAssistantResult & { error?: string };

      if (!response.ok) {
        sendAssistantMessage("assistant", result.error ?? "일정을 정리하지 못했습니다. 다시 말씀해주시겠어요?");
        return;
      }

      if (result.draft) {
        const saved = addCalendarEvent({
          ...result.draft,
          id: crypto.randomUUID(),
          source: "assistant",
        });
        sendAssistantMessage(
          "assistant",
          saved ? `✅ ${result.summary} 캘린더에 등록했어요.` : "캘린더에 등록하지 못했습니다. 잠시 후 다시 시도해주세요.",
          saved ? { action: "calendar-added" } : undefined
        );
      } else {
        sendAssistantMessage("assistant", `${result.summary} 날짜와 시간을 조금 더 알려주시겠어요?`);
      }
    } catch {
      sendAssistantMessage("assistant", "일정을 정리하는 중 문제가 생겼어요. 다시 시도해주시겠어요?");
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const prompt = message.trim();
    if (!hydrated || prompt.length < 2 || sending) return;

    setSending(true);
    sendAssistantMessage("user", prompt);
    setMessage("");

    const isScheduleIntent =
      directScheduleIntentPattern.test(prompt) ||
      (!consultationIntentPattern.test(prompt) && temporalIntentPattern.test(prompt));

    if (isScheduleIntent) {
      await handleScheduleIntent(prompt);
    } else {
      sendAssistantMessage(
        "assistant",
        "코치님께 전달할 준비가 되었어요. 아래 버튼을 눌러 대화창으로 이동해주세요.",
        { action: "handoff-coach", handoffPrompt: prompt }
      );
    }

    setSending(false);
  };

  let previousDateKey = "";

  return (
    <section className="conversation-workspace" aria-labelledby="assistant-chat-title">
      <header className="conversation-header">
        <div className="conversation-counterpart-icon" aria-hidden="true">
          <Bot size={22} />
        </div>
        <div className="conversation-counterpart-copy">
          <h2 id="assistant-chat-title">AI 어시스턴트</h2>
          <span><i aria-hidden="true" /> 일정 등록 · 상담 연결</span>
        </div>
      </header>

      <div className="conversation-timeline" ref={timelineRef} aria-live="polite">
        {state.assistantConversation.length === 0 ? (
          <div className="conversation-empty-state">
            <strong>아직 대화가 없습니다.</strong>
            <p>일정 등록이나 상담 연결이 필요하면 편하게 말씀해주세요.</p>
          </div>
        ) : null}
        {state.assistantConversation.map((item) => {
          const mine = item.sender === "user";
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
                    <Bot size={16} />
                  </span>
                )}
                <div className="message-bundle">
                  <div className="message-bubble-line">
                    <div className="conversation-message">
                      <p>{item.body}</p>
                      {item.action === "handoff-coach" && (
                        <button
                          type="button"
                          className="assistant-chat-action"
                          onClick={() => goToCoach(item.handoffPrompt ?? item.body)}
                        >
                          <MessageCircle aria-hidden="true" size={15} /> 코치 대화로 이동
                        </button>
                      )}
                      {item.action === "calendar-added" && (
                        <button type="button" className="assistant-chat-action" onClick={goToCalendar}>
                          <CalendarCheck2 aria-hidden="true" size={15} /> 캘린더에서 보기
                        </button>
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
        <div className="message-entry" aria-busy={!hydrated || sending}>
          <label className="conversation-input">
            <span className="sr-only">AI 어시스턴트에게 메시지 보내기</span>
            <textarea
              ref={inputRef}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={1}
              maxLength={240}
              placeholder="예: 내일 오후 6시 실기 훈련 50분 등록해줘"
              disabled={!hydrated || sending}
            />
          </label>
          <button
            type="submit"
            className="send-message-button"
            title="보내기"
            aria-label="보내기"
            disabled={!hydrated || sending || message.trim().length < 2}
          >
            {sending ? <span className="button-spinner" aria-hidden="true" /> : <Send aria-hidden="true" size={19} />}
          </button>
        </div>
      </form>
    </section>
  );
}
