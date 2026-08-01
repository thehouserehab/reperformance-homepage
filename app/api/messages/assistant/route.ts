import { NextResponse } from "next/server";
import { createConversationDraft } from "@/lib/messageAssistant";
import type { ConversationParticipant } from "@/lib/types";

const roles: ConversationParticipant[] = ["student", "coach"];

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { message?: unknown; role?: unknown };

    if (
      typeof body.message !== "string" ||
      body.message.trim().length < 2 ||
      body.message.length > 600 ||
      typeof body.role !== "string" ||
      !roles.includes(body.role as ConversationParticipant)
    ) {
      return NextResponse.json(
        { error: "정리할 내용을 2자 이상 600자 이하로 입력해 주세요." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      draft: createConversationDraft(body.message, body.role as ConversationParticipant),
      provider: "local-draft-v1",
    });
  } catch {
    return NextResponse.json({ error: "메시지 초안을 정리하지 못했습니다." }, { status: 400 });
  }
}
