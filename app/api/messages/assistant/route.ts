import { noStoreJson, readLimitedJsonBody } from "@/lib/assistantHttp";
import { createConversationDraft } from "@/lib/messageAssistant";
import type { ConversationParticipant } from "@/lib/types";

const roles: ConversationParticipant[] = ["student", "coach"];
const MAX_REQUEST_BYTES = 4_096;

export async function POST(request: Request) {
  const result = await readLimitedJsonBody(request, MAX_REQUEST_BYTES);
  if (!result.ok) {
    if (result.reason === "payload_too_large") {
      return noStoreJson({ error: "요청 내용이 너무 깁니다." }, 413);
    }
    if (result.reason === "unsupported_media_type") {
      return noStoreJson({ error: "지원하지 않는 요청 형식입니다." }, 415);
    }
    return noStoreJson({ error: "메시지 초안을 정리하지 못했습니다." }, 400);
  }

  try {
    const body = result.value as { message?: unknown; role?: unknown };

    if (
      typeof body.message !== "string" ||
      body.message.trim().length < 2 ||
      body.message.length > 600 ||
      typeof body.role !== "string" ||
      !roles.includes(body.role as ConversationParticipant)
    ) {
      return noStoreJson({ error: "정리할 내용을 2자 이상 600자 이하로 입력해 주세요." }, 400);
    }

    return noStoreJson({
      draft: createConversationDraft(body.message, body.role as ConversationParticipant),
      provider: "local-draft-v1",
    });
  } catch {
    return noStoreJson({ error: "메시지 초안을 정리하지 못했습니다." }, 400);
  }
}
