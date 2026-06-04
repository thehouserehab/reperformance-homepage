import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function cleanEnvValue(value) {
  const text = String(value || '').trim();
  const quote = String.fromCharCode(34);

  if ((text.startsWith("'") && text.endsWith("'")) || (text.startsWith(quote) && text.endsWith(quote))) {
    return text.slice(1, -1).trim();
  }

  return text;
}

function getCronSecret() {
  return cleanEnvValue(process.env.CRON_SECRET);
}

function getSyncSecret() {
  return cleanEnvValue(process.env.RP_NOTION_SYNC_SECRET || process.env.RP_API_SECRET || process.env.CRON_SECRET);
}

function getBearerToken(request) {
  const auth = request.headers.get('authorization') || '';
  return cleanEnvValue(auth.match(/^Bearer\s+(.+)$/i)?.[1]);
}

function authorizeCron(request) {
  const cronSecret = getCronSecret();

  if (!cronSecret) {
    throw new Error('CRON_SECRET 환경변수가 필요합니다.');
  }

  if (getBearerToken(request) !== cronSecret) {
    const error = new Error('노션 설문 Cron 동기화 권한이 없습니다.');
    error.status = 401;
    throw error;
  }
}

async function readJsonResponse(response) {
  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch (error) {
    return { ok: false, error: text.slice(0, 250) };
  }
}

export async function GET(request) {
  try {
    authorizeCron(request);

    const syncSecret = getSyncSecret();
    if (!syncSecret) throw new Error('RP_NOTION_SYNC_SECRET 또는 RP_API_SECRET 환경변수가 필요합니다.');

    const requestUrl = new URL(request.url);
    const syncUrl = new URL('/api/rp/notion-survey', requestUrl.origin);
    syncUrl.searchParams.set('secret', syncSecret);
    syncUrl.searchParams.set('limit', requestUrl.searchParams.get('limit') || '50');

    const response = await fetch(syncUrl.toString(), { cache: 'no-store' });
    const data = await readJsonResponse(response);

    return NextResponse.json(
      { ...data, cron: true },
      { status: response.status },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, cron: true, error: error?.message || '노션 설문 Cron 동기화 중 오류가 발생했습니다.' },
      { status: error?.status || 500 },
    );
  }
}
