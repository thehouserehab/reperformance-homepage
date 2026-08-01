import type { ConversationParticipant } from "./types";

export function createConversationDraft(message: string, role: ConversationParticipant) {
  const normalized = message.replace(/\s+/g, " ").trim().replace(/[.!?]+$/, "");

  if (role === "student") {
    return `코치님, ${normalized}. 확인 후 훈련 방향을 알려주시면 감사하겠습니다.`;
  }

  return `${normalized}. 진행 중 통증이나 어려움이 생기면 바로 알려주세요.`;
}
