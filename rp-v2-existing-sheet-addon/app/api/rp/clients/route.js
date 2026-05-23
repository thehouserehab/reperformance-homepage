export const dynamic = 'force-dynamic';

const WEBAPP_URL = process.env.RP_SHEETS_WEBAPP_URL;
const API_SECRET = process.env.RP_API_SECRET;

function assertConfig() {
  if (!WEBAPP_URL) throw new Error('Missing env RP_SHEETS_WEBAPP_URL');
  if (!API_SECRET) throw new Error('Missing env RP_API_SECRET');
}

async function callSheetsBridge(action, payload = {}, method = 'POST') {
  assertConfig();

  if (method === 'GET') {
    const url = new URL(WEBAPP_URL);
    url.searchParams.set('action', action);
    url.searchParams.set('token', API_SECRET);
    Object.entries(payload || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    });
    const res = await fetch(url.toString(), { method: 'GET', cache: 'no-store' });
    const text = await res.text();
    return JSON.parse(text);
  }

  const res = await fetch(WEBAPP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, token: API_SECRET, payload })
  });
  const text = await res.text();
  return JSON.parse(text);
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'listClients';
    const memberId = searchParams.get('memberId') || searchParams.get('id') || '';
    const result = await callSheetsBridge(action, { memberId, id: memberId }, 'GET');
    return Response.json(result, { status: result.ok === false ? 400 : 200 });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const action = body.action || 'saveConsultation';
    const payload = body.payload || body;
    const result = await callSheetsBridge(action, payload, 'POST');
    return Response.json(result, { status: result.ok === false ? 400 : 200 });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
}
