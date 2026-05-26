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

function buildScriptUrl(webAppUrl, body, apiSecret) {
  const url = new URL(webAppUrl);

  // Apps Script 구현 방식에 따라 e.parameter 또는 JSON body 중 하나만 읽는 경우가 있어
  // 인증값과 action을 query string과 body 양쪽에 모두 전달한다.
  url.searchParams.set('action', body?.action || 'listClients');
  url.searchParams.set('secret', apiSecret);
  url.searchParams.set('apiSecret', apiSecret);
  url.searchParams.set('token', apiSecret);

  return url.toString();
}

async function callSheetsApi(body) {
  const { webAppUrl, apiSecret } = getConfig();
  const requestBody = {
    ...body,
    secret: apiSecret,
    apiSecret,
    token: apiSecret,
  };

  const response = await fetch(buildScriptUrl(webAppUrl, body, apiSecret), {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(requestBody),
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
    const suffix = data?.debug ? ` / debug=${JSON.stringify(data.debug).slice(0, 300)}` : '';
    throw new Error((data?.error || `Apps Script 요청 실패: ${response.status}`) + suffix);
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
