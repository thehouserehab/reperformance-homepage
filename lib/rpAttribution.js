const ATTRIBUTION_TOKEN_MAX = 100;
const ATTRIBUTION_PATH_MAX = 240;
const ATTRIBUTION_HOST_MAX = 160;

export const CONVERSION_EVENT_NAMES = new Set([
  'page_view',
  'consultation_cta_click',
  'application_view',
  'application_started',
  'application_submitted',
]);

export const PUBLIC_SERVICE_KEYS = new Set([
  'senior-rehab',
  'athlete-reconditioning',
  'pain-care',
  'pe-exam',
]);

function cleanValue(value) {
  return String(value || '').trim();
}

export function sanitizeAttributionToken(value, maxLength = ATTRIBUTION_TOKEN_MAX) {
  return cleanValue(value)
    .normalize('NFKC')
    .replace(/[^0-9A-Za-z가-힣._~\- ]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, maxLength)
    .toLowerCase();
}

export function sanitizeAttributionPath(value) {
  const path = cleanValue(value).split(/[?#]/, 1)[0];
  if (!path.startsWith('/')) return '';
  return path.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, ATTRIBUTION_PATH_MAX);
}

export function sanitizeReferrerHost(value) {
  const host = cleanValue(value).toLowerCase();
  if (!/^[a-z0-9.-]+(?::\d{1,5})?$/.test(host)) return '';
  return host.slice(0, ATTRIBUTION_HOST_MAX);
}

export function sanitizeAnonymousSessionId(value) {
  const sessionId = cleanValue(value);
  if (!/^[A-Za-z0-9_-]{12,80}$/.test(sessionId)) return '';
  return sessionId;
}

function sanitizeOpaqueId(value, maxLength = 80) {
  const id = cleanValue(value);
  if (!/^[A-Za-z0-9_-]+$/.test(id)) return '';
  return id.slice(0, maxLength);
}

function isEnabledFlag(value) {
  return ['1', 'true', 'yes', 'on', 'max'].includes(cleanValue(value).toLowerCase());
}

function getInputValue(input, camelKey, formKey) {
  return input?.[camelKey] ?? input?.[formKey] ?? '';
}

export function normalizeAttribution(input = {}) {
  const firstSource = sanitizeAttributionToken(getInputValue(input, 'firstSource', 'attributionFirstSource')) || 'direct';
  const firstMedium = sanitizeAttributionToken(getInputValue(input, 'firstMedium', 'attributionFirstMedium')) || 'none';
  const latestSource = sanitizeAttributionToken(getInputValue(input, 'latestSource', 'attributionLatestSource')) || firstSource;
  const latestMedium = sanitizeAttributionToken(getInputValue(input, 'latestMedium', 'attributionLatestMedium')) || firstMedium;
  const maxFlag = getInputValue(input, 'maxAffiliation', 'attributionMaxAffiliation');

  return {
    sessionId: sanitizeAnonymousSessionId(getInputValue(input, 'sessionId', 'attributionSessionId')),
    firstSource,
    firstMedium,
    firstCampaign: sanitizeAttributionToken(getInputValue(input, 'firstCampaign', 'attributionFirstCampaign')),
    firstLandingPath: sanitizeAttributionPath(getInputValue(input, 'firstLandingPath', 'attributionFirstLandingPath')) || '/',
    latestSource,
    latestMedium,
    latestCampaign: sanitizeAttributionToken(getInputValue(input, 'latestCampaign', 'attributionLatestCampaign')),
    utmContent: sanitizeAttributionToken(getInputValue(input, 'utmContent', 'attributionUtmContent')),
    applicationReferrerPath: sanitizeAttributionPath(getInputValue(input, 'applicationReferrerPath', 'attributionApplicationReferrerPath')),
    campaignCode: sanitizeAttributionToken(getInputValue(input, 'campaignCode', 'attributionCampaignCode')),
    referralCode: sanitizeAttributionToken(getInputValue(input, 'referralCode', 'attributionReferralCode')),
    partnerCode: sanitizeAttributionToken(getInputValue(input, 'partnerCode', 'attributionPartnerCode')),
    qrCode: sanitizeAttributionToken(getInputValue(input, 'qrCode', 'attributionQrCode')),
    referrerHost: sanitizeReferrerHost(getInputValue(input, 'referrerHost', 'attributionReferrerHost')),
    maxAffiliation: typeof maxFlag === 'boolean' ? maxFlag : isEnabledFlag(maxFlag),
  };
}

export function getAttributionRouteLabel(attribution = {}) {
  const data = normalizeAttribution(attribution);
  if (data.maxAffiliation) return 'MAX 체대입시 연계';
  if (data.qrCode) return `오프라인 QR · ${data.qrCode}`;
  if (data.partnerCode) return `연계기관 · ${data.partnerCode}`;
  if (data.referralCode) return `추천 · ${data.referralCode}`;

  const source = data.latestSource;
  const medium = data.latestMedium;
  if (source === 'direct') return '홈페이지 직접 방문';
  if (source === 'naver-blog') return '네이버 블로그';
  if (source === 'naver') return medium === 'organic' ? '네이버 검색' : '네이버 유입';
  if (source === 'instagram') {
    if (medium === 'reels') return '인스타그램 릴스';
    if (medium === 'story') return '인스타그램 스토리';
    if (medium === 'profile') return '인스타그램 프로필';
    return '인스타그램';
  }
  if (source === 'google') return medium === 'organic' ? 'Google 검색' : 'Google 유입';
  if (source === 'daum') return medium === 'organic' ? 'Daum 검색' : 'Daum 유입';
  if (medium === 'paid' || medium === 'cpc') return `광고 · ${source}`;
  return source ? `외부 유입 · ${source}` : '홈페이지 서비스 신청';
}

export function normalizeConversionEvent(input = {}) {
  const eventName = cleanValue(input.eventName);
  const serviceKey = cleanValue(input.serviceKey);
  const attribution = normalizeAttribution(input.attribution || input);

  if (!CONVERSION_EVENT_NAMES.has(eventName)) return null;
  if (!attribution.sessionId) return null;

  return {
    id: cleanValue(input.id),
    eventName,
    pagePath: sanitizeAttributionPath(input.pagePath) || '/',
    serviceKey: PUBLIC_SERVICE_KEYS.has(serviceKey) ? serviceKey : '',
    applicationId: sanitizeOpaqueId(input.applicationId),
    ...attribution,
  };
}
