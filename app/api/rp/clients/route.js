import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  ADMIN_COOKIE_NAME,
  hasStaffAccess,
  verifyAdminSessionCookie,
} from '../../../../lib/rpAdminAuth';
import {
  isDatabaseConfigured,
  isDatabaseOnlyMode,
  listDatabaseClients,
  saveDatabaseClient,
  saveDatabaseConsultation,
} from '../../../../lib/rpDatabase';
import { shouldSendGoogleDriveSecretInQuery } from '../../../../lib/rpGoogleDriveBackup';
import { buildRateLimitResponse, checkSharedRequestRateLimit } from '../../../../lib/rpRateLimit';
import {
  buildForbiddenOriginResponse,
  buildRequestTooLargeResponse,
  checkSameOriginRequest,
  checkRequestBodySize,
  REQUEST_SIZE_LIMITS,
} from '../../../../lib/rpRequestGuards';

export const dynamic = 'force-dynamic';

const CLIENTS_READ_LIMIT = 120;
const CLIENTS_WRITE_LIMIT = 60;
const CLIENTS_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_SHEET_ID = '1FuiTT6emUqwr2uzhNlaNt7WEq1W9x5a1zI3rs223U6E';
const DEFAULT_MEMBERS_GID = '122819871';

async function requireStaffSession() {
  const cookieStore = await cookies();
  const session = await verifyAdminSessionCookie(cookieStore.get(ADMIN_COOKIE_NAME)?.value);

  if (!session) {
    return {
      response: NextResponse.json({ ok: false, error: 'Staff login required.' }, { status: 401 }),
    };
  }

  if (!hasStaffAccess(session)) {
    return {
      response: NextResponse.json({ ok: false, error: 'Staff permission required.' }, { status: 403 }),
    };
  }

  return { session };
}

async function checkClientsLimit(request, session, action) {
  const retryAfterSeconds = await checkSharedRequestRateLimit({
    request,
    scope: `rp-clients:${action}`,
    identifier: session.sub,
    limit: action === 'write' ? CLIENTS_WRITE_LIMIT : CLIENTS_READ_LIMIT,
    ipLimit: action === 'write' ? CLIENTS_WRITE_LIMIT * 2 : CLIENTS_READ_LIMIT * 2,
    windowMs: CLIENTS_WINDOW_MS,
  });

  return retryAfterSeconds
    ? buildRateLimitResponse(retryAfterSeconds, 'Too many customer data requests. Please try again later.')
    : null;
}

function cleanEnvValue(value) {
  const text = String(value || '').trim();
  const quote = String.fromCharCode(34);

  if ((text.startsWith('\'') && text.endsWith('\'')) || (text.startsWith(quote) && text.endsWith(quote))) {
    return text.slice(1, -1).trim();
  }

  return text;
}

function extractUrl(value) {
  const cleaned = cleanEnvValue(value);
  const match = cleaned.match(/https?:\/\/[^\s]+/);
  return match ? match[0] : cleaned;
}

function getConfig() {
  return {
    webAppUrl: extractUrl(process.env.RP_SHEETS_WEBAPP_URL),
    apiSecret: cleanEnvValue(process.env.RP_API_SECRET),
    sheetId: cleanEnvValue(process.env.RP_SHEET_ID) || DEFAULT_SHEET_ID,
    membersGid: cleanEnvValue(process.env.RP_MEMBERS_GID) || DEFAULT_MEMBERS_GID,
  };
}

function buildScriptUrl(webAppUrl, body, apiSecret) {
  const normalizedUrl = extractUrl(webAppUrl);

  if (!normalizedUrl || !/^https?:\/\//i.test(normalizedUrl)) {
    throw new Error('RP_SHEETS_WEBAPP_URL이 올바른 URL이 아닙니다. Apps Script 웹 앱 URL은 https://script.google.com/macros/s/.../exec 형식이어야 합니다.');
  }

  const url = new URL(normalizedUrl);
  const action = body?.action || 'listClients';
  url.searchParams.set('action', action);

  if (apiSecret && shouldSendGoogleDriveSecretInQuery()) {
    url.searchParams.set('secret', apiSecret);
    url.searchParams.set('apiSecret', apiSecret);
    url.searchParams.set('token', apiSecret);
  }

  return url.toString();
}

function parseCsv(text) {
  const rows = [];
  const quote = String.fromCharCode(34);
  let row = [];
  let value = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === quote && inQuotes && next === quote) {
      value += quote;
      i += 1;
      continue;
    }

    if (char === quote) {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(value.trim());
      value = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(value.trim());
      if (row.some((cell) => cell !== '')) rows.push(row);
      row = [];
      value = '';
      continue;
    }

    value += char;
  }

  row.push(value.trim());
  if (row.some((cell) => cell !== '')) rows.push(row);
  return rows;
}

function normalizeKey(key) {
  return String(key || '').replace(/\s+/g, '').trim();
}

function getValue(record, candidates) {
  if (!record) return '';

  for (const candidate of candidates) {
    if (record[candidate] !== undefined && record[candidate] !== null && record[candidate] !== '') return record[candidate];
  }

  const normalizedRecord = Object.fromEntries(Object.entries(record).map(([key, value]) => [normalizeKey(key), value]));

  for (const candidate of candidates) {
    const normalized = normalizeKey(candidate);
    if (normalizedRecord[normalized] !== undefined && normalizedRecord[normalized] !== null && normalizedRecord[normalized] !== '') return normalizedRecord[normalized];
  }

  return '';
}

function splitList(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map((item) => String(item).trim()).filter(Boolean);
  if (!value) return [];
  return String(value)
    .split(/[,/·|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function rowsToObjects(rows) {
  const headerIndex = rows.findIndex((row) => row.some((cell) => ['회원ID', '회원명', '연락처'].includes(cell)));
  if (headerIndex === -1) return [];

  const headers = rows[headerIndex];
  return rows.slice(headerIndex + 1).map((row) => {
    const record = {};
    headers.forEach((header, index) => {
      if (header) record[header] = row[index] || '';
    });
    return record;
  });
}

function mapClient(record, index = 0) {
  const id = getValue(record, ['회원ID', '회원Id', 'ID', 'id', 'clientId', 'memberId']) || `M-${String(index + 1).padStart(4, '0')}`;
  const name = getValue(record, ['회원명', '이름', 'name', 'clientName', 'memberName']);

  if (!name || name === '회원명') return null;

  const caution = getValue(record, ['주의사항', '메모', '상담메모', 'caution', 'concern']);

  return {
    id: String(id),
    name: String(name),
    phone: String(getValue(record, ['연락처', '전화번호', 'phone'])),
    birth: String(getValue(record, ['생년월일', 'birth'])),
    gender: String(getValue(record, ['성별', 'gender'])),
    route: String(getValue(record, ['유입경로', '방문경로', 'route'])),
    memberType: String(getValue(record, ['회원구분', '구분', 'memberType'])),
    status: String(getValue(record, ['회원상태', '상태', 'status']) || '상담 전'),
    coachName: String(getValue(record, ['담당자', '담당코치', 'coachName', 'coach']) || '정우현'),
    parqStatus: String(getValue(record, ['PAR-Q', 'PARQ', 'parqStatus']) || '확인 필요'),
    parqYesItems: splitList(getValue(record, ['PAR-Q 예항목', 'PARQ예항목', 'parqYesItems'])),
    goal: String(getValue(record, ['목표', '주목표', '운동목표', 'goal']) || ''),
    purpose: splitList(getValue(record, ['방문목적', '목적', 'purpose'])),
    painAreas: splitList(getValue(record, ['불편부위', '통증부위', 'painAreas', 'painArea'])),
    painScore: Number(getValue(record, ['통증강도', 'painScore'])) || 0,
    concern: String(caution || ''),
    totalSessions: Number(getValue(record, ['총회차', 'totalSessions'])) || 0,
    remainingSessions: Number(getValue(record, ['잔여회차', 'remainingSessions'])) || 0,
  };
}

function normalizeClients(data) {
  let raw = [];
  if (Array.isArray(data?.clients)) raw = data.clients;
  else if (Array.isArray(data?.members)) raw = data.members;
  else if (Array.isArray(data?.data)) raw = data.data;
  else if (Array.isArray(data?.rows)) raw = data.rows;

  if (!raw.length) return [];
  if (Array.isArray(raw[0])) return rowsToObjects(raw).map(mapClient).filter(Boolean);
  return raw.map(mapClient).filter(Boolean);
}

function buildManualClientId() {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  return `RP-${stamp}`;
}

function toFiniteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeManualClient(input = {}) {
  const now = new Date().toISOString();
  const id = cleanEnvValue(input.id || input.clientId || input.memberId || input['회원ID']) || buildManualClientId();
  const name = cleanEnvValue(input.name || input.clientName || input.memberName || input['회원명'] || input['이름']);
  const phone = cleanEnvValue(input.phone || input['연락처'] || input['전화번호']);
  const birth = cleanEnvValue(input.birth || input['생년월일']);
  const gender = cleanEnvValue(input.gender || input['성별']);
  const route = cleanEnvValue(input.route || input['유입경로'] || input['방문경로']) || '관리자 직접 추가';
  const memberType = cleanEnvValue(input.memberType || input['회원구분'] || input['구분']);
  const status = cleanEnvValue(input.status || input['회원상태'] || input['상태']) || '상담 전';
  const coachName = cleanEnvValue(input.coachName || input.coach || input['담당코치'] || input['담당자']) || '정우현';
  const parqStatus = cleanEnvValue(input.parqStatus || input.PARQ || input['PAR-Q']) || '미작성';
  const parqYesItems = splitList(input.parqYesItems || input['PAR-Q 예항목']);
  const purpose = splitList(input.purpose || input.purposes || input['방문목적'] || input['목적']);
  const painAreas = splitList(input.painAreas || input.painArea || input['불편부위'] || input['통증부위']);
  const painScore = Math.min(10, Math.max(0, toFiniteNumber(input.painScore || input['통증강도'])));
  const totalSessions = Math.max(0, toFiniteNumber(input.totalSessions || input['총회차']));
  const remainingSessions = Math.max(0, toFiniteNumber(input.remainingSessions || input['잔여회차']));
  const goal = cleanEnvValue(input.goal || input['목표'] || input['운동목표']);
  const concern = cleanEnvValue(input.concern || input.caution || input.memo || input['주의사항'] || input['메모']);

  if (!name) throw new Error('고객 이름은 필수입니다.');

  return {
    id,
    clientId: id,
    memberId: id,
    '회원ID': id,
    name,
    clientName: name,
    memberName: name,
    '회원명': name,
    phone,
    '연락처': phone,
    birth,
    '생년월일': birth,
    gender,
    '성별': gender,
    route,
    '유입경로': route,
    memberType,
    '회원구분': memberType,
    status,
    '회원상태': status,
    coachName,
    '담당코치': coachName,
    parqStatus,
    'PAR-Q': parqStatus,
    parqYesItems,
    'PAR-Q 예항목': parqYesItems.join(', '),
    goal,
    '목표': goal,
    purpose,
    '방문목적': purpose.join(', '),
    painAreas,
    '불편부위': painAreas.join(', '),
    painScore,
    '통증강도': painScore,
    concern,
    '주의사항': concern,
    totalSessions,
    '총회차': totalSessions,
    remainingSessions,
    '잔여회차': remainingSessions,
    createdAt: now,
    '등록일': now.slice(0, 10),
    source: 'admin-direct-add',
  };
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

  if (!webAppUrl) throw new Error('Vercel 환경변수 RP_SHEETS_WEBAPP_URL이 설정되지 않았습니다.');
  if (!apiSecret) throw new Error('Vercel 환경변수 RP_API_SECRET이 설정되지 않았습니다.');

  const method = options.method || 'POST';
  const requestBody = { ...body, secret: apiSecret, apiSecret, token: apiSecret };
  const fetchOptions = { method, cache: 'no-store', redirect: 'follow', headers: {} };

  if (apiSecret) {
    fetchOptions.headers['X-RP-API-Secret'] = apiSecret;
    fetchOptions.headers.Authorization = `Bearer ${apiSecret}`;
  }

  if (method !== 'GET') {
    fetchOptions.headers['Content-Type'] = 'text/plain;charset=utf-8';
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

function resolveCreatedClient(data, fallbackRecord) {
  const clientList = normalizeClients(data);
  if (clientList.length) return clientList[0];

  const candidates = [data?.client, data?.member, data?.record, data?.row, fallbackRecord].filter(Boolean);
  for (const candidate of candidates) {
    const client = mapClient(candidate);
    if (client) return client;
  }

  return mapClient(fallbackRecord);
}

async function addClientWithAttempts(record) {
  const actions = ['addClient', 'createClient', 'saveClient', 'upsertClient', 'addMember', 'createMember', 'saveMember', 'upsertMember'];
  const errors = [];

  for (const action of actions) {
    try {
      const data = await callSheetsApi({ action, client: record, member: record, record });
      return {
        ok: true,
        source: 'apps-script',
        action,
        data,
        client: resolveCreatedClient(data, record),
        record,
      };
    } catch (error) {
      errors.push(`${action}: ${error?.message || 'unknown error'}`);
    }
  }

  throw new Error(`고객 추가 Apps Script 액션이 실패했습니다. ${errors.slice(0, 4).join(' / ')}`);
}

async function fetchMembersCsvClients() {
  const { sheetId, membersGid } = getConfig();
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${membersGid}`;
  const response = await fetch(url, { cache: 'no-store', redirect: 'follow' });
  const text = await response.text();

  if (!response.ok) throw new Error(`Google Sheets CSV 조회 실패: ${response.status}`);
  if (/<!doctype html|<html/i.test(text)) throw new Error('Google Sheets CSV를 읽을 수 없습니다. 시트 공유 권한이 비공개이거나 CSV 접근이 차단되었습니다.');

  return rowsToObjects(parseCsv(text)).map(mapClient).filter(Boolean);
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
      if (clients.length) return { ok: true, source: 'apps-script', action: attempt.action, method: attempt.method, clients };
      errors.push(`${attempt.method} ${attempt.action}: 0명`);
    } catch (error) {
      errors.push(`${attempt.method} ${attempt.action}: ${error?.message || 'unknown error'}`);
    }
  }

  try {
    const clients = await fetchMembersCsvClients();
    if (clients.length) return { ok: true, source: 'google-sheets-csv', action: 'csvMembers', method: 'GET', clients };
    errors.push('CSV Members_회원: 0명');
  } catch (error) {
    errors.push(`CSV Members_회원: ${error?.message || 'unknown error'}`);
  }

  throw new Error(`회원 데이터를 찾지 못했습니다. ${errors.slice(0, 5).join(' / ')}`);
}

async function listClientsFromPreferredStore() {
  if (isDatabaseConfigured()) {
    try {
      const clients = await listDatabaseClients();
      return { ok: true, source: 'database', backupSource: 'google-drive', action: 'listDatabaseClients', method: 'SQL', clients };
    } catch (error) {
      if (isDatabaseOnlyMode()) throw error;

      const fallback = await listClientsWithFallbacks();
      return {
        ...fallback,
        source: 'google-drive-backup',
        primarySource: 'database',
        primaryError: error?.message || 'Database read failed.',
      };
    }
  }

  return listClientsWithFallbacks();
}

async function backupClientToGoogleDrive(record) {
  try {
    const backupRecord = normalizeManualClient(record);
    const data = await addClientWithAttempts(backupRecord);
    return { ok: true, source: data.source, action: data.action, method: data.method || 'POST' };
  } catch (error) {
    return { ok: false, error: error?.message || 'Google Drive backup failed.' };
  }
}

async function backupConsultationToGoogleDrive(record) {
  try {
    const data = await callSheetsApi({ action: 'saveConsultation', record });
    return { ok: true, source: 'apps-script', action: 'saveConsultation', ...data };
  } catch (error) {
    return { ok: false, error: error?.message || 'Google Drive backup failed.' };
  }
}

async function addClientToPreferredStore(input) {
  if (isDatabaseConfigured()) {
    try {
      const result = await saveDatabaseClient(input);
      const backup = await backupClientToGoogleDrive(result.record || input);
      return { source: 'database', backupSource: 'google-drive', method: 'SQL', backup, ...result };
    } catch (error) {
      if (isDatabaseOnlyMode()) throw error;
    }
  }

  const record = normalizeManualClient(input);
  return addClientWithAttempts(record);
}

async function saveConsultationToPreferredStore(record) {
  if (isDatabaseConfigured()) {
    try {
      const result = await saveDatabaseConsultation(record);
      const backup = await backupConsultationToGoogleDrive(record);
      return { source: 'database', backupSource: 'google-drive', method: 'SQL', backup, ...result };
    } catch (error) {
      if (isDatabaseOnlyMode()) throw error;
    }
  }

  const data = await callSheetsApi({ action: 'saveConsultation', record });
  return { source: 'apps-script', action: 'saveConsultation', ...data };
}

export async function GET(request) {
  const auth = await requireStaffSession();
  if (auth.response) return auth.response;

  const rateLimitResponse = await checkClientsLimit(request, auth.session, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const data = await listClientsFromPreferredStore();
    return NextResponse.json({ ok: true, source: data.source, action: data.action, method: data.method, clients: data.clients, count: data.clients.length });
  } catch (error) {
    const message = error?.message || '고객 목록 조회 중 오류가 발생했습니다.';
    const setupRequired = !isDatabaseConfigured() && (
      message.includes('RP_SHEETS_WEBAPP_URL') ||
      message.includes('회원 데이터를 찾지 못했습니다')
    );
    return NextResponse.json(
      { ok: false, setupRequired, source: setupRequired ? 'setup-required' : 'error', error: message, clients: [] },
      { status: setupRequired ? 200 : 500 },
    );
  }
}

export async function POST(request) {
  const originCheck = checkSameOriginRequest(request);
  if (!originCheck.ok) return buildForbiddenOriginResponse();

  const sizeCheck = checkRequestBodySize(request, REQUEST_SIZE_LIMITS.large);
  if (!sizeCheck.ok) return buildRequestTooLargeResponse(sizeCheck.maxBytes);

  const auth = await requireStaffSession();
  if (auth.response) return auth.response;

  const rateLimitResponse = await checkClientsLimit(request, auth.session, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const payload = await request.json();
    const action = payload?.action || 'saveConsultation';

    if (action === 'debug') {
      if (isDatabaseOnlyMode()) {
        return NextResponse.json({ ok: true, source: 'database', databaseConfigured: isDatabaseConfigured(), dataSource: 'database' });
      }

      const data = await callSheetsApi({ action: 'debug' }, { method: 'GET' });
      return NextResponse.json({ ok: true, ...data });
    }

    if (action === 'addClient') {
      const result = await addClientToPreferredStore(payload?.client || payload?.record || {});
      return NextResponse.json({ ok: true, ...result });
    }

    if (action !== 'saveConsultation') return NextResponse.json({ ok: false, error: `지원하지 않는 action입니다: ${action}` }, { status: 400 });

    const result = await saveConsultationToPreferredStore(payload?.record || {});
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error?.message || '상담 기록 저장 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
