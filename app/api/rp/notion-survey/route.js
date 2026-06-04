import { NextResponse } from 'next/server';
import {
  isDatabaseConfigured,
  isDatabaseOnlyMode,
  saveDatabaseClient,
} from '../../../../lib/rpDatabase';

export const dynamic = 'force-dynamic';

function cleanEnvValue(value) {
  const text = String(value || '').trim();
  const quote = String.fromCharCode(34);

  if ((text.startsWith("'") && text.endsWith("'")) || (text.startsWith(quote) && text.endsWith(quote))) {
    return text.slice(1, -1).trim();
  }

  return text;
}

function extractUrl(value) {
  const cleaned = cleanEnvValue(value);
  const match = cleaned.match(/https?:\/\/[^\s]+/);
  return match ? match[0] : cleaned;
}

function normalizeKey(key) {
  return String(key || '')
    .toLowerCase()
    .replace(/[\s_:\-()[\]{}"'`.,/·|]+/g, '')
    .trim();
}

function splitList(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map((item) => String(item).trim()).filter(Boolean);
  if (value === true) return ['예'];
  if (!value) return [];

  return String(value)
    .split(/[,/·|\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toFiniteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function getValue(record, candidates) {
  if (!record) return '';

  for (const candidate of candidates) {
    const value = record[candidate];
    if (value !== undefined && value !== null && value !== '') return value;
  }

  const normalizedEntries = Object.entries(record).map(([key, value]) => [normalizeKey(key), value]);

  for (const candidate of candidates) {
    const normalized = normalizeKey(candidate);
    const exact = normalizedEntries.find(([key, value]) => key === normalized && value !== undefined && value !== null && value !== '');
    if (exact) return exact[1];
  }

  for (const candidate of candidates) {
    const normalized = normalizeKey(candidate);
    if (!normalized) continue;
    const partial = normalizedEntries.find(([key, value]) => (
      (key.includes(normalized) || normalized.includes(key))
      && value !== undefined
      && value !== null
      && value !== ''
    ));
    if (partial) return partial[1];
  }

  return '';
}

function buildClientId(prefix = 'NT') {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${stamp}-${random}`;
}

function notionIdToClientId(pageId) {
  const normalized = String(pageId || '').replace(/-/g, '').toUpperCase();
  return normalized ? `NT-${normalized.slice(0, 12)}` : buildClientId();
}

function isYesValue(value) {
  if (value === true) return true;
  const text = normalizeKey(value);
  return ['yes', 'true', '1', 'y', '예', '네', '있음', '해당', '해당있음'].includes(text);
}

function collectParqYesItems(record) {
  const explicit = splitList(getValue(record, ['PAR-Q 예항목', 'PARQ 예항목', 'PARQ예항목', 'parqYesItems', 'parq yes items']));
  if (explicit.length) return explicit;

  return Object.entries(record)
    .filter(([key, value]) => {
      const normalized = normalizeKey(key);
      const looksLikeParq = normalized.includes('parq') || normalized.includes('문진');
      return looksLikeParq && isYesValue(value);
    })
    .map(([key]) => key);
}

function readTextArray(items) {
  if (!Array.isArray(items)) return '';
  return items.map((item) => item?.plain_text || item?.text?.content || item?.name || '').filter(Boolean).join(' ').trim();
}

function readFormulaValue(formula) {
  if (!formula || typeof formula !== 'object') return '';
  if (formula.type === 'string') return formula.string || '';
  if (formula.type === 'number') return formula.number ?? '';
  if (formula.type === 'boolean') return formula.boolean ? '예' : '';
  if (formula.type === 'date') return formula.date?.start || '';
  return '';
}

function readRollupValue(rollup) {
  if (!rollup || typeof rollup !== 'object') return '';
  if (rollup.type === 'number') return rollup.number ?? '';
  if (rollup.type === 'date') return rollup.date?.start || '';
  if (rollup.type === 'array') return (rollup.array || []).map(readNotionProperty).flat().filter(Boolean);
  return '';
}

function readNotionProperty(property) {
  if (!property || typeof property !== 'object') return '';
  const type = property.type;

  switch (type) {
    case 'title':
      return readTextArray(property.title);
    case 'rich_text':
      return readTextArray(property.rich_text);
    case 'phone_number':
      return property.phone_number || '';
    case 'email':
      return property.email || '';
    case 'url':
      return property.url || '';
    case 'number':
      return property.number ?? '';
    case 'checkbox':
      return property.checkbox ? '예' : '';
    case 'select':
      return property.select?.name || '';
    case 'status':
      return property.status?.name || '';
    case 'multi_select':
      return (property.multi_select || []).map((item) => item.name).filter(Boolean);
    case 'date':
      return property.date?.start || '';
    case 'people':
      return (property.people || []).map((person) => person.name || person.person?.email).filter(Boolean);
    case 'files':
      return (property.files || []).map((file) => file.name).filter(Boolean);
    case 'created_time':
      return property.created_time || '';
    case 'last_edited_time':
      return property.last_edited_time || '';
    case 'unique_id': {
      const prefix = property.unique_id?.prefix ? `${property.unique_id.prefix}-` : '';
      return property.unique_id?.number ? `${prefix}${property.unique_id.number}` : '';
    }
    case 'formula':
      return readFormulaValue(property.formula);
    case 'rollup':
      return readRollupValue(property.rollup);
    default:
      return '';
  }
}

function notionPageToRecord(page) {
  const properties = page?.properties || {};
  const record = {};

  Object.entries(properties).forEach(([key, property]) => {
    record[key] = readNotionProperty(property);
  });

  record._notionPageId = page?.id || '';
  record._createdTime = page?.created_time || '';
  record._lastEditedTime = page?.last_edited_time || '';
  return record;
}

function extractRecord(item) {
  if (!item || typeof item !== 'object') return {};
  if (item.object === 'page' && item.properties) return notionPageToRecord(item);
  if (item.page?.object === 'page' && item.page?.properties) return notionPageToRecord(item.page);
  if (item.properties && Object.values(item.properties).some((value) => value?.type)) return notionPageToRecord(item);
  return item;
}

function buildSurveyClient(input = {}) {
  const record = extractRecord(input);
  const pageId = cleanEnvValue(record._notionPageId || record.notionPageId || record.pageId);
  const id = cleanEnvValue(getValue(record, ['회원ID', '회원Id', 'ID', 'id', 'clientId', 'memberId']))
    || notionIdToClientId(pageId);
  const name = cleanEnvValue(getValue(record, ['회원명', '이름', '성함', '고객명', 'name', 'Name', 'clientName', 'memberName']));
  const phone = cleanEnvValue(getValue(record, ['연락처', '전화번호', '휴대폰', '핸드폰', 'phone', 'Phone', 'mobile']));
  const birth = cleanEnvValue(getValue(record, ['생년월일', '생년', 'birth', 'Birth', 'birthday']));
  const gender = cleanEnvValue(getValue(record, ['성별', 'gender']));
  const route = cleanEnvValue(getValue(record, ['유입경로', '방문경로', '신청경로', 'route'])) || 'Notion 온라인 설문';
  const memberType = cleanEnvValue(getValue(record, ['회원구분', '구분', 'memberType']));
  const status = cleanEnvValue(getValue(record, ['회원상태', '상태', 'status'])) || '상담 전';
  const coachName = cleanEnvValue(getValue(record, ['담당자', '담당코치', '코치', 'coachName', 'coach'])) || '정우현';
  const parqStatus = cleanEnvValue(getValue(record, ['PAR-Q', 'PARQ', 'PARQ상태', 'parqStatus'])) || '설문 완료';
  const parqYesItems = collectParqYesItems(record);
  const goal = cleanEnvValue(getValue(record, ['목표', '주목표', '운동목표', 'goal']));
  const purpose = splitList(getValue(record, ['방문목적', '목적', '운동목적', 'purpose']));
  const painAreas = splitList(getValue(record, ['불편부위', '통증부위', '아픈부위', 'painAreas', 'painArea']));
  const painScore = Math.min(10, Math.max(0, toFiniteNumber(getValue(record, ['통증강도', '통증점수', 'painScore']))));
  const concern = cleanEnvValue(getValue(record, ['주의사항', '메모', '상담메모', '특이사항', '문의내용', 'caution', 'concern', 'memo']));
  const now = new Date().toISOString();

  if (!name) throw new Error('노션 설문에서 고객 이름을 찾지 못했습니다. 이름/성함/회원명 항목명을 확인해 주세요.');

  return {
    id,
    clientId: id,
    memberId: id,
    회원ID: id,
    name,
    clientName: name,
    memberName: name,
    회원명: name,
    phone,
    연락처: phone,
    birth,
    생년월일: birth,
    gender,
    성별: gender,
    route,
    유입경로: route,
    memberType,
    회원구분: memberType,
    status,
    회원상태: status,
    coachName,
    담당코치: coachName,
    parqStatus,
    'PAR-Q': parqStatus,
    parqYesItems,
    'PAR-Q 예항목': parqYesItems.join(', '),
    goal,
    목표: goal,
    purpose,
    방문목적: purpose.join(', '),
    painAreas,
    불편부위: painAreas.join(', '),
    painScore,
    통증강도: painScore,
    concern,
    주의사항: concern,
    totalSessions: Math.max(0, toFiniteNumber(getValue(record, ['총회차', 'totalSessions']))),
    remainingSessions: Math.max(0, toFiniteNumber(getValue(record, ['잔여회차', 'remainingSessions']))),
    createdAt: cleanEnvValue(record._createdTime) || now,
    updatedAt: cleanEnvValue(record._lastEditedTime) || now,
    notionPageId: pageId,
    source: 'notion-survey',
  };
}

function getRequiredSecret() {
  return cleanEnvValue(process.env.RP_NOTION_SYNC_SECRET || process.env.CRON_SECRET || process.env.RP_API_SECRET);
}

function getProvidedSecret(request, body = {}) {
  const url = new URL(request.url);
  const auth = request.headers.get('authorization') || '';
  const bearer = auth.match(/^Bearer\s+(.+)$/i)?.[1];
  return cleanEnvValue(
    bearer
    || request.headers.get('x-rp-notion-secret')
    || url.searchParams.get('secret')
    || url.searchParams.get('token')
    || body.secret
    || body.token
    || body.apiSecret
  );
}

function authorize(request, body = {}) {
  const required = getRequiredSecret();
  const provided = getProvidedSecret(request, body);

  if (!required) {
    throw new Error('RP_NOTION_SYNC_SECRET 또는 RP_API_SECRET 환경변수가 필요합니다.');
  }

  if (provided !== required) {
    const error = new Error('노션 설문 동기화 권한이 없습니다.');
    error.status = 401;
    throw error;
  }
}

function getSheetsConfig() {
  return {
    webAppUrl: extractUrl(process.env.RP_SHEETS_WEBAPP_URL),
    apiSecret: cleanEnvValue(process.env.RP_API_SECRET),
  };
}

function buildScriptUrl(webAppUrl, body, apiSecret) {
  const normalizedUrl = extractUrl(webAppUrl);

  if (!normalizedUrl || !/^https?:\/\//i.test(normalizedUrl)) {
    throw new Error('RP_SHEETS_WEBAPP_URL이 올바른 URL이 아닙니다.');
  }

  const url = new URL(normalizedUrl);
  url.searchParams.set('action', body?.action || 'saveClient');

  if (apiSecret) {
    url.searchParams.set('secret', apiSecret);
    url.searchParams.set('apiSecret', apiSecret);
    url.searchParams.set('token', apiSecret);
  }

  return url.toString();
}

async function parseJsonResponse(response, label) {
  const text = await response.text();
  let data;

  try {
    data = JSON.parse(text);
  } catch (error) {
    throw new Error(`${label} 응답이 JSON이 아닙니다: ${text.slice(0, 250)}`);
  }

  if (!response.ok || data?.ok === false) {
    throw new Error(data?.message || data?.error || `${label} 요청 실패: ${response.status}`);
  }

  return data;
}

async function callSheetsApi(body) {
  const { webAppUrl, apiSecret } = getSheetsConfig();

  if (!webAppUrl) throw new Error('RP_SHEETS_WEBAPP_URL 환경변수가 필요합니다.');
  if (!apiSecret) throw new Error('RP_API_SECRET 환경변수가 필요합니다.');

  const requestBody = { ...body, secret: apiSecret, apiSecret, token: apiSecret };
  const response = await fetch(buildScriptUrl(webAppUrl, body, apiSecret), {
    method: 'POST',
    cache: 'no-store',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(requestBody),
  });

  return parseJsonResponse(response, 'Apps Script');
}

async function saveClientToSheets(record) {
  const actions = ['saveClient', 'addClient', 'createClient', 'upsertClient', 'saveMember', 'addMember'];
  const errors = [];

  for (const action of actions) {
    try {
      const data = await callSheetsApi({ action, payload: record, client: record, member: record, record });
      return { ok: true, source: 'apps-script', action, data, record };
    } catch (error) {
      errors.push(`${action}: ${error?.message || 'unknown error'}`);
    }
  }

  throw new Error(`노션 설문 고객 저장에 실패했습니다. ${errors.slice(0, 3).join(' / ')}`);
}

async function saveClientToPreferredStore(record) {
  if (isDatabaseConfigured()) {
    try {
      const result = await saveDatabaseClient(record);
      return { source: 'database', method: 'SQL', ...result };
    } catch (error) {
      if (isDatabaseOnlyMode()) throw error;
    }
  }

  return saveClientToSheets(record);
}

function cleanNotionId(value) {
  const text = cleanEnvValue(value);
  const uuid = text.match(/[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}/i);
  if (uuid) return uuid[0].replace(/-/g, '');

  const compact = text.match(/[0-9a-f]{32}/i);
  return compact ? compact[0] : text;
}

function getNotionConfig() {
  const apiKey = cleanEnvValue(process.env.NOTION_API_KEY || process.env.NOTION_TOKEN);
  const dataSourceId = cleanNotionId(process.env.NOTION_SURVEY_DATA_SOURCE_ID || process.env.RP_NOTION_SURVEY_DATA_SOURCE_ID);
  const databaseId = cleanNotionId(process.env.NOTION_SURVEY_DATABASE_ID || process.env.RP_NOTION_SURVEY_DATABASE_ID);
  const useDataSource = Boolean(dataSourceId);
  const version = cleanEnvValue(process.env.NOTION_VERSION) || (useDataSource ? '2026-03-11' : '2022-06-28');

  if (!apiKey) throw new Error('NOTION_API_KEY 환경변수가 필요합니다.');
  if (!dataSourceId && !databaseId) throw new Error('NOTION_SURVEY_DATA_SOURCE_ID 또는 NOTION_SURVEY_DATABASE_ID 환경변수가 필요합니다.');

  return {
    apiKey,
    id: useDataSource ? dataSourceId : databaseId,
    endpoint: useDataSource ? 'data_sources' : 'databases',
    version,
  };
}

async function callNotionQuery(config, body) {
  const response = await fetch(`https://api.notion.com/v1/${config.endpoint}/${config.id}/query`, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      'Notion-Version': config.version,
    },
    body: JSON.stringify(body),
  });

  return parseJsonResponse(response, 'Notion');
}

async function fetchNotionPages(limit) {
  const config = getNotionConfig();
  const baseBody = { page_size: limit };

  try {
    return await callNotionQuery(config, {
      ...baseBody,
      sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }],
    });
  } catch (error) {
    return callNotionQuery(config, baseBody);
  }
}

function extractItems(body) {
  if (Array.isArray(body?.pages)) return body.pages;
  if (Array.isArray(body?.results)) return body.results;
  if (Array.isArray(body?.clients)) return body.clients;
  if (Array.isArray(body?.records)) return body.records;

  const item = body?.page || body?.client || body?.member || body?.record || body?.payload || body?.data || body;
  return item ? [item] : [];
}

async function parseJsonBody(request) {
  try {
    return await request.json();
  } catch (error) {
    return {};
  }
}

async function saveItems(items, dryRun = false) {
  const results = [];

  for (const item of items) {
    const record = buildSurveyClient(item);
    if (dryRun) {
      results.push({ ok: true, dryRun: true, record });
      continue;
    }

    const saved = await saveClientToPreferredStore(record);
    results.push({
      ok: true,
      source: saved.source,
      action: saved.action,
      method: saved.method,
      client: saved.client || record,
      record,
    });
  }

  return results;
}

export async function GET(request) {
  try {
    authorize(request);

    const url = new URL(request.url);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 50));
    const dryRun = ['1', 'true', 'yes'].includes(String(url.searchParams.get('dryRun') || '').toLowerCase());
    const data = await fetchNotionPages(limit);
    const pages = Array.isArray(data?.results) ? data.results : [];
    const results = await saveItems(pages, dryRun);

    return NextResponse.json({ ok: true, mode: 'sync', dryRun, count: results.length, results });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || '노션 설문 동기화 중 오류가 발생했습니다.' },
      { status: error?.status || 500 },
    );
  }
}

export async function POST(request) {
  try {
    const body = await parseJsonBody(request);
    authorize(request, body);

    if (body?.action === 'sync') {
      const limit = Math.min(100, Math.max(1, Number(body.limit) || 50));
      const data = await fetchNotionPages(limit);
      const pages = Array.isArray(data?.results) ? data.results : [];
      const results = await saveItems(pages, Boolean(body.dryRun));
      return NextResponse.json({ ok: true, mode: 'sync', dryRun: Boolean(body.dryRun), count: results.length, results });
    }

    const items = extractItems(body);
    if (!items.length) {
      return NextResponse.json({ ok: false, error: '저장할 노션 설문 데이터가 없습니다.' }, { status: 400 });
    }

    const results = await saveItems(items, Boolean(body?.dryRun));
    return NextResponse.json({ ok: true, mode: 'webhook', dryRun: Boolean(body?.dryRun), count: results.length, results });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || '노션 설문 저장 중 오류가 발생했습니다.' },
      { status: error?.status || 500 },
    );
  }
}
