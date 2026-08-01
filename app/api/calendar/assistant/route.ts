import { NextResponse } from "next/server";
import { parseCalendarRequest } from "@/lib/calendarAssistant";

const MAX_REQUEST_BYTES = 2_048;

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return NextResponse.json({ error: "요청 내용이 너무 깁니다." }, { status: 413 });
  }
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "지원하지 않는 요청 형식입니다." }, { status: 415 });
  }

  try {
    const body = (await request.json()) as { message?: unknown };
    if (typeof body.message !== "string" || body.message.trim().length < 2 || body.message.length > 240) {
      return NextResponse.json({ error: "일정 요청을 2자 이상 240자 이하로 입력해 주세요." }, { status: 400 });
    }
    return NextResponse.json(parseCalendarRequest(body.message));
  } catch {
    return NextResponse.json({ error: "일정 요청을 확인하지 못했습니다." }, { status: 400 });
  }
}
