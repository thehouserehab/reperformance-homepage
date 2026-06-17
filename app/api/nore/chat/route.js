import { NextResponse } from 'next/server';
import { buildNoreChatUrl } from '../../../../lib/noreClient';

export const dynamic = 'force-dynamic';

function unavailableResponse() {
  return new Response(
    `<!doctype html>
    <html lang="ko">
      <head><meta charset="utf-8"><title>NORE 상담 링크 설정 필요</title></head>
      <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:32px;line-height:1.7">
        <h1>NORE 상담 링크 설정이 필요합니다.</h1>
        <p>Vercel 환경변수 NORE_CHAT_URL 또는 NORE_MEMBER_CHAT_URL / NORE_PE_EXAM_CHAT_URL을 설정한 뒤 다시 열어주세요.</p>
      </body>
    </html>`,
    {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    },
  );
}

export async function GET(request) {
  const url = new URL(request.url);
  const workspace = url.searchParams.get('workspace') === 'pe-exam' ? 'pe-exam' : 'member';
  let targetUrl = '';

  try {
    targetUrl = buildNoreChatUrl(workspace);
  } catch (error) {
    return unavailableResponse();
  }

  if (!targetUrl) return unavailableResponse();

  return NextResponse.redirect(targetUrl, 307);
}
