import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getConfig() {
  const webAppUrl = process.env.RP_SHEETS_WEBAPP_URL;
  const apiSecret = process.env.RP_API_SECRET;

  if (!webAppUrl) {
    throw new Error('Vercel 환경변수 RP_SHEETS_WEBAPP_URL이 설정되지 않았습니다.');
  }

  if (!apiSecret) {
    throw new Error('Vercel 환경변수 RP_API_SECRET이 설정되지 않았습니다.');
  }

  return { webAppUrl, apiSecret };
}

async function callSheetsApi(body) {
  const { webAppUrl, apiSecret } = getConfig();

  const response = await fetch(webAppUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify({
      ...body,
      secret: apiSecret,
    }),
    cache: 'no-store',
    redirect: 'follow',
  });

  const text = await response.text();
  let data;

  try {
    data = JSON.parse(text);
  } catch (error) {
    throw new Error(`Apps Script 응답이 JSON이 아닙니다: ${text.slice(0, 250)}`);
  }

  if (!response.ok || data?.ok === false) {
    throw new Error(data?.error || `Apps Script 요청 실패: ${response.status}`);
  }

  return data;
}

export async function GET() {
  try {
    const data = await callSheetsApi({ action: 'listClients' });

    return NextResponse.json({
      ok: true,
      source: 'google-sheets',
      clients: Array.isArray(data.clients) ? data.clients : [],
      count: Array.isArray(data.clients) ? data.clients.length : 0,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || 'Google Sheets 고객 목록 조회 중 오류가 발생했습니다.',
        clients: [],
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const action = payload?.action || 'saveConsultation';

    if (action === 'debug') {
      const data = await callSheetsApi({ action: 'debug' });
      return NextResponse.json({ ok: true, ...data });
    }

    if (action !== 'saveConsultation') {
      return NextResponse.json({ ok: false, error: `지원하지 않는 action입니다: ${action}` }, { status: 400 });
    }

    const data = await callSheetsApi({
      action: 'saveConsultation',
      record: payload?.record || {},
    });

    return NextResponse.json({ ok: true, ...data });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || 'Google Sheets 상담 기록 저장 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}
