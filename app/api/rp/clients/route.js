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
  const action = body?.action || 'listClients';

  // Apps Script 구현 방식에 따라 e.parameter 또는 JSON body 중 하나만 읽는 경우가 있어
  // 인증값과 action을 query string과 body 양쪽에 모두 전달한다.
  url.searchParams.set('action', action);
  url.searchParams.set('secret', apiSecret);
  url.searchParams.set('apiSecret', apiSecret);
  url.searchParams.set('token', apiSecret);

  return url.toString();
}

function normalizeClients(data) {
  if (Array.isArray(data?.clients)) return data.clients;
  if (Array.isArray(data?.members)) return data.members;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.rows)) return data.rows;
  return [];
}

async function parseScriptResponse(response) {
  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Apps Script 응답이 JSON이 아닙니다: ${text.slice(0, 250)}`);
  }
}

async function callSheetsApi(body, options = {}) {
  const { webAppUrl, apiSecret } = getConfig();
  const method = options.method || 'POST';
  const requestBody = {
    ...body,
    secret: apiSecret,
    apiSecret,
    token: apiSecret,
  };

  const fetchOptions = {
    method,
    cache: 'no-store',
    redirect: 'follow',
  };

  if (method !== 'GET') {
    fetchOptions.headers = {
      'Content-Type': 'text/plain;charset=utf-8',
    };
    fetchOptions.body = JSON.stringify(requestBody);
  }

  const response = await fetch(buildScriptUrl(webAppUrl, body, apiSecret), fetchOptions);
  const data = await parseScriptResponse(response);

  if (!response.ok || data?.ok === false) {
    const suffix = data?.debug ? ` / debug=${JSON.stringify(data.debug).slice(0, 300)}` : '';
    throw new Error((data?.error || `Apps Script 요청 실패: ${response.status}`) + suffix);
  }

  return data;
}

async function listClientsWithFallbacks() {
  const attempts = [
    { action: 'getClients', method: 'GET' },
    { action: 'listClients', method: 'GET' },
    { action: 'getMembers', method: 'GET' },
    { action: 'listMembers', method: 'GET' },
    { action: 'clients', method: 'GET' },
    { action: 'getClients', method: 'POST' },
    { action: 'listMembers', method: 'POST' },
    { action: 'clients', method: 'POST' },
  ];

  const errors = [];

  for (const attempt of attempts) {
    try {
      const data = await callSheetsApi({ action: attempt.action }, { method: attempt.method });
      const clients = normalizeClients(data);

      return {
        ok: true,
        action: attempt.action,
        method: attempt.method,
        clients,
        rawCount: clients.length,
      };
    } catch (error) {
      errors.push(`${attempt.method} ${attempt.action}: ${error?.message || 'unknown error'}`);
    }
  }

  throw new Error(`고객 목록을 불러올 수 없습니다. 시도한 action이 Apps Script와 맞지 않습니다. ${errors.slice(0, 4).join(' / ')}`);
}

export async function GET() {
  try {
    const data = await listClientsWithFallbacks();

    return NextResponse.json({
      ok: true,
      source: 'google-sheets',
      action: data.action,
      method: data.method,
      clients: data.clients,
      count: data.clients.length,
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
      const data = await callSheetsApi({ action: 'debug' }, { method: 'GET' });
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
