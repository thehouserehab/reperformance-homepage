const DEFAULT_ENDPOINTS = {
  memberCard: '/members',
  nutritionAnalysis: '/nutrition/analyze',
  nutritionFeedback: '/nutrition/feedback',
  reservation: '/reservations',
  reservationRecommend: '/reservations/recommend-slots',
  reservationNotify: '/reservations/no-show-notify',
  peExamProfile: '/pe-exam/profile',
  peExamPlan: '/pe-exam/plan',
};

function cleanEnvValue(value) {
  return String(value || '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .trim();
}

function getTimeoutMs() {
  const timeout = Number(cleanEnvValue(process.env.NORE_TIMEOUT_MS));
  return Number.isFinite(timeout) && timeout > 0 ? timeout : 12000;
}

function normalizeAuthPrefix(value, apiKeyHeader) {
  if (value === undefined) return apiKeyHeader.toLowerCase() === 'authorization' ? 'Bearer ' : '';

  const prefix = String(value);
  if (!prefix || /\s$/.test(prefix)) return prefix;
  if (/^(bearer|token|apikey|api-key)$/i.test(prefix)) return `${prefix} `;
  return prefix;
}

function getNoreConfig() {
  const apiKeyHeader = cleanEnvValue(process.env.NORE_API_KEY_HEADER) || 'Authorization';
  const explicitPrefix = process.env.NORE_API_KEY_PREFIX;

  return {
    baseUrl: cleanEnvValue(process.env.NORE_API_BASE_URL),
    apiKey: cleanEnvValue(process.env.NORE_API_KEY),
    apiKeyHeader,
    apiKeyPrefix: normalizeAuthPrefix(explicitPrefix, apiKeyHeader),
    organizationId: cleanEnvValue(process.env.NORE_ORG_ID),
    timeoutMs: getTimeoutMs(),
  };
}

function joinUrl(baseUrl, pathOrUrl) {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  if (!baseUrl) throw new Error('NORE_API_BASE_URL 환경변수가 필요합니다.');

  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const path = String(pathOrUrl || '').replace(/^\/+/, '');
  return new URL(path, base).toString();
}

function getEndpoint(envName, fallback) {
  return cleanEnvValue(process.env[envName]) || fallback;
}

function buildHeaders(config, extraHeaders = {}) {
  if (!config.apiKey) throw new Error('NORE_API_KEY 환경변수가 필요합니다.');

  const headers = {
    Accept: 'application/json',
    ...extraHeaders,
  };

  headers[config.apiKeyHeader] = `${config.apiKeyPrefix}${config.apiKey}`;

  if (config.organizationId) {
    headers['X-NORE-Organization-Id'] = config.organizationId;
  }

  return headers;
}

async function readJsonResponse(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch (error) {
    return { message: text.slice(0, 500) };
  }
}

async function requestNore(pathOrUrl, options = {}) {
  const config = getNoreConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(joinUrl(config.baseUrl, pathOrUrl), {
      ...options,
      headers: buildHeaders(config, options.headers),
      cache: 'no-store',
      signal: controller.signal,
    });
    const data = await readJsonResponse(response);

    if (!response.ok) {
      const message = data?.error || data?.message || `NORE API 요청 실패: ${response.status}`;
      const error = new Error(message);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return { ok: true, status: response.status, data };
  } finally {
    clearTimeout(timeout);
  }
}

function isNoreApiConfigured() {
  const config = getNoreConfig();
  return Boolean(config.apiKey && (config.baseUrl || /^https?:\/\//i.test(getEndpoint('NORE_MEMBER_CARD_ENDPOINT', ''))));
}

function buildMemberCardPayload(input = {}) {
  return {
    source: input.source || 'reperformance-homepage',
    externalId: input.clientId || input.id || input.username || '',
    name: input.name || '',
    phone: input.phone || '',
    birth: input.birth || '',
    gender: input.gender || '',
    memberType: input.memberType || input.roleLabel || '회원',
    status: input.status || '상담 전',
    service: {
      key: input.selectedService || '',
      label: input.serviceLabel || '',
    },
    profile: {
      goal: input.goal || '',
      purpose: Array.isArray(input.purpose) ? input.purpose : [],
      painAreas: Array.isArray(input.painAreas) ? input.painAreas : [],
      painScore: Number(input.painScore) || 0,
      preferredTime: input.preferredTime || '',
      weeklyFrequency: input.weeklyFrequency || '',
      exerciseExperience: input.exerciseExperience || '',
      concern: input.concern || '',
    },
    peExam: {
      targetUniversities: input.peExamTargetUniversities || '',
      targetDepartment: input.peExamTargetDepartment || '',
      practicalEvents: Array.isArray(input.peExamPracticalEvents) ? input.peExamPracticalEvents : [],
      memo: input.peExamMemo || '',
    },
    consent: {
      privacy: input.privacyConsent === 'yes',
      parq: input.parqConsent === 'yes',
    },
    parq: {
      status: input.parqStatus || '',
      yesItems: Array.isArray(input.parqYesItems) ? input.parqYesItems : [],
      memo: input.parqMemo || '',
    },
  };
}

export async function createNoreMemberCard(input = {}) {
  if (!isNoreApiConfigured()) {
    return { ok: false, skipped: true, reason: 'NORE API 환경변수가 설정되지 않았습니다.' };
  }

  const endpoint = getEndpoint('NORE_MEMBER_CARD_ENDPOINT', DEFAULT_ENDPOINTS.memberCard);
  return requestNore(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildMemberCardPayload(input)),
  });
}

export async function createNoreMemberCardSafely(input = {}) {
  try {
    return await createNoreMemberCard(input);
  } catch (error) {
    return {
      ok: false,
      skipped: false,
      error: error?.message || 'NORE 회원 카드 생성 중 오류가 발생했습니다.',
      status: error?.status || 500,
    };
  }
}

function getWorkspaceToken(workspace) {
  const key = workspace === 'pe-exam' ? 'NORE_PE_EXAM_CHAT_TOKEN' : 'NORE_MEMBER_CHAT_TOKEN';
  return cleanEnvValue(process.env[key] || process.env.NORE_CHAT_TOKEN);
}

function getWorkspaceChatUrl(workspace) {
  const key = workspace === 'pe-exam' ? 'NORE_PE_EXAM_CHAT_URL' : 'NORE_MEMBER_CHAT_URL';
  return cleanEnvValue(process.env[key] || process.env.NORE_CHAT_URL || process.env.NORE_CHAT_BASE_URL);
}

export function buildNoreChatUrl(workspace = 'member') {
  const chatUrl = getWorkspaceChatUrl(workspace);
  if (!chatUrl) return '';

  const url = new URL(chatUrl);
  const token = getWorkspaceToken(workspace);
  const tokenParam = cleanEnvValue(process.env.NORE_CHAT_TOKEN_PARAM) || 'token';

  url.searchParams.set('source', 'reperformance');
  url.searchParams.set('workspace', workspace);
  if (token) url.searchParams.set(tokenParam, token);

  return url.toString();
}

export async function analyzeNoreMealPhoto(formData) {
  const endpoint = getEndpoint('NORE_NUTRITION_ANALYSIS_ENDPOINT', DEFAULT_ENDPOINTS.nutritionAnalysis);
  return requestNore(endpoint, {
    method: 'POST',
    body: formData,
  });
}

export async function sendNoreNutritionFeedback(payload = {}) {
  const endpoint = getEndpoint('NORE_NUTRITION_FEEDBACK_ENDPOINT', DEFAULT_ENDPOINTS.nutritionFeedback);
  return requestNore(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source: 'reperformance-homepage',
      ...payload,
    }),
  });
}

export async function callNoreReservationAction(action, payload = {}) {
  const endpointMap = {
    recommendSlots: getEndpoint('NORE_RESERVATION_RECOMMEND_ENDPOINT', DEFAULT_ENDPOINTS.reservationRecommend),
    syncReservation: getEndpoint('NORE_RESERVATION_ENDPOINT', DEFAULT_ENDPOINTS.reservation),
    cancelReservation: getEndpoint('NORE_RESERVATION_ENDPOINT', DEFAULT_ENDPOINTS.reservation),
    markNoShow: getEndpoint('NORE_RESERVATION_ENDPOINT', DEFAULT_ENDPOINTS.reservation),
    notifyNoShowWaitlist: getEndpoint('NORE_RESERVATION_NOTIFY_ENDPOINT', DEFAULT_ENDPOINTS.reservationNotify),
  };
  const endpoint = endpointMap[action] || endpointMap.syncReservation;

  return requestNore(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source: 'reperformance-homepage',
      action,
      ...payload,
    }),
  });
}

export async function saveNorePeExamProfile(payload = {}) {
  const endpoint = getEndpoint('NORE_PE_EXAM_PROFILE_ENDPOINT', DEFAULT_ENDPOINTS.peExamProfile);
  return requestNore(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source: 'reperformance-homepage',
      ...payload,
    }),
  });
}

export async function requestNorePeExamPlan(payload = {}) {
  const endpoint = getEndpoint('NORE_PE_EXAM_PLAN_ENDPOINT', DEFAULT_ENDPOINTS.peExamPlan);
  return requestNore(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source: 'reperformance-homepage',
      ...payload,
    }),
  });
}
