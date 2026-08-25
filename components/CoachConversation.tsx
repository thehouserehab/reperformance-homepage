"use client";

import { ChangeEvent, FormEvent, Fragment, useEffect, useRef, useState } from "react";
import {
  Bot,
  Check,
  Film,
  ImageIcon,
  Paperclip,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import {
  formatKoreanMessageClock,
  formatKoreanMessageDate,
  getKoreanMessageDateKey,
} from "@/lib/dateFormatting";
import {
  deleteStoredMessageAttachments,
  getMessageAttachmentKind,
  MESSAGE_ATTACHMENT_ACCEPT,
  MESSAGE_ATTACHMENT_LIMITS,
  storeMessageAttachments,
  validateMessageAttachmentContents,
  validateMessageAttachments,
} from "@/lib/messageAttachments";
import type {
  CoachConversationAttachment,
  ConversationParticipant,
  MessageAttachmentKind,
} from "@/lib/types";
import { useAppState } from "./AppStateProvider";
import { MessageAttachmentView } from "./MessageAttachmentView";

type ComposeMode = "direct" | "assistant";

type PendingMessageAttachment = {
  id: string;
  file: File;
  kind: MessageAttachmentKind;
  previewUrl: string;
};

export function CoachConversation({ role }: { role: ConversationParticipant }) {
  const { state, hydrated, sendCoachConversationMessage } = useAppState();
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<ComposeMode>("direct");
  const [pending, setPending] = useState(false);
  const [sending, setSending] = useState(false);
  const [assistantText, setAssistantText] = useState("");
  const [feedbackTone, setFeedbackTone] = useState<"neutral" | "success" | "error">("neutral");
  const [draftWasAssisted, setDraftWasAssisted] = useState(false);
  const [attachments, setAttachments] = useState<PendingMessageAttachment[]>([]);
  const [validatingAttachments, setValidatingAttachments] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlsRef = useRef(new Set<string>());
  const attachmentValidationRef = useRef(false);
  const componentActiveRef = useRef(true);
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

  useEffect(() => {
    if (role !== "student") return;
    const savedDraft = window.sessionStorage.getItem("rp-app-coach-message-draft");
    const savedMode = window.sessionStorage.getItem("rp-app-coach-message-mode");
    if (!savedDraft) return;
    setMessage(savedDraft.slice(0, 600));
    setMode(savedMode === "assistant" ? "assistant" : "direct");
    setAssistantText("홈에서 작성한 내용을 가져왔습니다. 확인한 뒤 코치에게 보내주세요.");
    setFeedbackTone("success");
    window.sessionStorage.removeItem("rp-app-coach-message-draft");
    window.sessionStorage.removeItem("rp-app-coach-message-mode");
  }, [role]);

  useEffect(() => {
    const previewUrls = previewUrlsRef.current;
    return () => {
      componentActiveRef.current = false;
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
      previewUrls.clear();
    };
  }, []);

  const changeMode = (nextMode: ComposeMode) => {
    setMode(nextMode);
    setAssistantText("");
    setFeedbackTone("neutral");
    if (nextMode === "direct") setDraftWasAssisted(false);
  };

  const requestDraft = async () => {
    const source = message.trim();
    if (source.length < 2) return;

    setPending(true);
    setAssistantText("");
    setFeedbackTone("neutral");
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
      setFeedbackTone("success");
    } catch (error) {
      setAssistantText(error instanceof Error ? error.message : "초안을 만들지 못했습니다.");
      setFeedbackTone("error");
    } finally {
      setPending(false);
    }
  };

  const addAttachments = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (selectedFiles.length === 0 || attachmentValidationRef.current) return;

    const metadataError = validateMessageAttachments(
      selectedFiles,
      attachments.map((attachment) => attachment.file)
    );
    if (metadataError) {
      setAssistantText(metadataError);
      setFeedbackTone("error");
      return;
    }

    attachmentValidationRef.current = true;
    setValidatingAttachments(true);
    setAssistantText("파일 형식을 확인하고 있습니다.");
    setFeedbackTone("neutral");

    try {
      const contentError = await validateMessageAttachmentContents(
        selectedFiles,
        attachments.map((attachment) => attachment.file)
      );
      if (!componentActiveRef.current) return;
      if (contentError) {
        setAssistantText(contentError);
        setFeedbackTone("error");
        return;
      }

      const nextAttachments = selectedFiles.flatMap((file) => {
        const kind = getMessageAttachmentKind(file);
        if (!kind) return [];
        const previewUrl = URL.createObjectURL(file);
        previewUrlsRef.current.add(previewUrl);
        return [{ id: crypto.randomUUID(), file, kind, previewUrl }];
      });

      setAttachments((current) => [...current, ...nextAttachments]);
      setAssistantText("");
      setFeedbackTone("neutral");
    } finally {
      attachmentValidationRef.current = false;
      if (componentActiveRef.current) setValidatingAttachments(false);
    }
  };

  const removeAttachment = (attachmentId: string) => {
    setAttachments((current) => {
      const target = current.find((attachment) => attachment.id === attachmentId);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
        previewUrlsRef.current.delete(target.previewUrl);
      }
      return current.filter((attachment) => attachment.id !== attachmentId);
    });
  };

  const clearAttachmentPreviews = () => {
    attachments.forEach((attachment) => {
      URL.revokeObjectURL(attachment.previewUrl);
      previewUrlsRef.current.delete(attachment.previewUrl);
    });
    setAttachments([]);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const body = message.trim();
    if (!hydrated || (!body && attachments.length === 0)) return;

    setSending(true);
    setAssistantText("");
    setFeedbackTone("neutral");
    let storedAttachments: CoachConversationAttachment[] = [];
    let messagePersisted = false;

    try {
      storedAttachments = await storeMessageAttachments(
        attachments.map((attachment) => attachment.file)
      );
      messagePersisted = sendCoachConversationMessage(
        role,
        body,
        draftWasAssisted && Boolean(body),
        storedAttachments
      );
      if (!messagePersisted) {
        throw new Error("메시지를 이 기기에 저장하지 못했습니다. 저장 권한을 확인한 뒤 다시 시도해 주세요.");
      }

      setMessage("");
      setDraftWasAssisted(false);
      clearAttachmentPreviews();
    } catch (error) {
      let cleanupFailed = false;
      if (!messagePersisted && storedAttachments.length > 0) {
        try {
          await deleteStoredMessageAttachments(
            storedAttachments.map((attachment) => attachment.storageKey)
          );
        } catch {
          cleanupFailed = true;
        }
      }

      setAssistantText(
        cleanupFailed
          ? "메시지는 저장되지 않았고 임시 첨부파일 정리도 완료하지 못했습니다. 다른 RP APP 탭을 닫고 공개 설정에서 기기 데이터 삭제를 다시 시도해 주세요."
          : error instanceof Error
            ? error.message
            : "첨부파일을 저장하지 못했습니다."
      );
      setFeedbackTone("error");
    } finally {
      setSending(false);
    }
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
        {state.coachConversation.length === 0 ? (
          <div className="conversation-empty-state">
            <strong>아직 대화가 없습니다.</strong>
            <p>첫 메시지를 보내면 학생과 담당 코치의 대화가 이곳에 표시됩니다.</p>
          </div>
        ) : null}
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
                    <div
                      className={`conversation-message${item.attachments.length > 0 ? " has-media" : ""}${
                        !item.body && item.attachments.length > 0 ? " media-only" : ""
                      }`}
                    >
                      {item.attachments.length > 0 && (
                        <div
                          className={`message-media-grid ${item.attachments.length === 1 ? "single" : "multiple"}`}
                        >
                          {item.attachments.map((attachment) => (
                            <MessageAttachmentView key={attachment.id} attachment={attachment} />
                          ))}
                        </div>
                      )}
                      {item.body && <p>{item.body}</p>}
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
          <span>
            {attachments.length > 0 ? `${attachments.length}/${MESSAGE_ATTACHMENT_LIMITS.maxCount} · ` : ""}
            {message.length}/600
          </span>
        </div>

        {mode === "assistant" && (
          <div className="assistant-compose-status">
            <ShieldCheck aria-hidden="true" size={14} /> 사진·영상은 AI에 보내지 않고 문장만 정리합니다.
          </div>
        )}

        <input
          ref={fileInputRef}
          className="sr-only"
          type="file"
          accept={MESSAGE_ATTACHMENT_ACCEPT}
          multiple
          onChange={addAttachments}
          disabled={!hydrated || sending || validatingAttachments || attachments.length >= MESSAGE_ATTACHMENT_LIMITS.maxCount}
          tabIndex={-1}
        />

        {attachments.length > 0 && (
          <div className="attachment-preview-list" aria-label="전송할 첨부파일">
            {attachments.map((attachment) => (
              <figure className="attachment-preview" key={attachment.id}>
                {attachment.kind === "image" ? (
                  // Blob URLs are local previews and cannot use next/image optimization.
                  <img src={attachment.previewUrl} alt="" />
                ) : (
                  <video src={attachment.previewUrl} muted preload="metadata" aria-hidden="true" />
                )}
                <span className="attachment-kind" aria-hidden="true">
                  {attachment.kind === "image" ? <ImageIcon size={13} /> : <Film size={13} />}
                </span>
                <button
                  type="button"
                  className="remove-attachment-button"
                  title={`${attachment.file.name} 삭제`}
                  aria-label={`${attachment.file.name} 삭제`}
                  onClick={() => removeAttachment(attachment.id)}
                  disabled={sending}
                >
                  <X aria-hidden="true" size={14} />
                </button>
              </figure>
            ))}
          </div>
        )}

        <p className={`composer-feedback ${feedbackTone}`} role="status" aria-live="polite">
          {assistantText}
        </p>

        <div className="message-entry" aria-busy={!hydrated || sending || validatingAttachments}>
          <button
            type="button"
            className="attach-message-button"
            title={validatingAttachments ? "파일 형식 확인 중" : "사진 또는 영상 첨부"}
            aria-label={validatingAttachments ? "파일 형식 확인 중" : "사진 또는 영상 첨부"}
            onClick={() => fileInputRef.current?.click()}
            disabled={!hydrated || sending || validatingAttachments || attachments.length >= MESSAGE_ATTACHMENT_LIMITS.maxCount}
          >
            {validatingAttachments ? (
              <span className="button-spinner" aria-hidden="true" />
            ) : (
              <Paperclip aria-hidden="true" size={18} />
            )}
          </button>

          <label className="conversation-input">
            <span className="sr-only">메시지 내용</span>
            <textarea
              ref={inputRef}
              value={message}
              onChange={(event) => {
                setMessage(event.target.value);
                setDraftWasAssisted(false);
                setAssistantText("");
                setFeedbackTone("neutral");
              }}
              rows={1}
              maxLength={600}
              placeholder={role === "student" ? "코치에게 메시지 보내기" : "학생에게 메시지 보내기"}
              disabled={!hydrated || sending}
            />
          </label>

          {mode === "assistant" && (
            <button
              type="button"
              className="draft-message-button"
              title="작성한 메모를 문장으로 정리"
              aria-label="작성한 메모를 문장으로 정리"
              onClick={requestDraft}
              disabled={!hydrated || sending || validatingAttachments || pending || message.trim().length < 2}
            >
              {pending ? <span className="button-spinner" aria-hidden="true" /> : <Sparkles aria-hidden="true" size={18} />}
            </button>
          )}

          <button
            type="submit"
            className="send-message-button"
            title={mode === "assistant" ? "확인하고 보내기" : "메시지 보내기"}
            aria-label={mode === "assistant" ? "확인하고 보내기" : "메시지 보내기"}
            disabled={!hydrated || pending || sending || validatingAttachments || (!message.trim() && attachments.length === 0)}
          >
            {sending ? (
              <span className="button-spinner" aria-hidden="true" />
            ) : mode === "assistant" && draftWasAssisted ? (
              <Check aria-hidden="true" size={19} />
            ) : (
              <Send aria-hidden="true" size={19} />
            )}
          </button>
        </div>
      </form>
    </section>
  );
}
