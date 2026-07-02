import { NextResponse } from 'next/server';
import {
  isDatabaseConfigured,
  saveDatabaseClient,
} from '../../../../lib/rpDatabase';
import {
  callGoogleDriveBackup,
  getGoogleDriveBackupSkipReason,
  isGoogleDriveBackupEnabled,
} from '../../../../lib/rpGoogleDriveBackup';
import { buildRateLimitResponse, checkSharedRequestRateLimit } from '../../../../lib/rpRateLimit';
import {
  buildForbiddenOriginResponse,
  buildRequestTooLargeResponse,
  checkSameOriginRequest,
  checkRequestBodySize,
  REQUEST_SIZE_LIMITS,
} from '../../../../lib/rpRequestGuards';

export const dynamic = 'force-dynamic';

const APPLICATION_WINDOW_MS = 60 * 60 * 1000;
const APPLICATION_LIMIT = 8;
const APPLICATION_IP_LIMIT = 50;

const SERVICE_OPTIONS = {
  'senior-rehab': {
    label: '시니어 재활 트레이닝',
    memberType: '시니어',
  },
  'athlete-reconditioning': {
    label: '선수·학생 리컨디셔닝',
    memberType: '선수/학생',
  },
  'pain-care': {
    label: '일반인 통증 케어 & 근력 회복',
    memberType: '일반회원',
  },
  'pe-exam': {
    label: '체대입시 운동 + 입시상담',
    memberType: '체대입시생',
  },
};

const ARRAY_FIELDS = new Set(['purpose', 'painAreas', 'parqYesItems', 'peExamPracticalEvents']);

function getDatabaseUrl() {
  return cleanValue(process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.RP_DATABASE_URL);
}

function getSslConfig(databaseUrl) {
  const sslMode = cleanValue(process.env.RP_DATABASE_SSL).toLowerCase();
  const lowerUrl = String(databaseUrl || '').toLowerCase();

  if (sslMode === 'false') return false;
  if (lowerUrl.includes('sslmode=disable')) return false;
  if (lowerUrl.includes('localhost') || lowerUrl.includes('127.0.0.1')) return false;
  return { rejectUnauthorized: false };
}

async function backupServiceApplication(application, client) {
  if (!isGoogleDriveBackupEnabled()) {
    return {
      ok: true,
      skipped: true,
      source: 'google-drive',
      reason: getGoogleDriveBackupSkipReason(),
    };
  }

  const backupPayload = buildMinimizedApplicationPayload(application);
  const backupApplication = buildGoogleDriveBackupApplication(application, backupPayload);
  const backupClient = buildGoogleDriveBackupClient(client);
  const payload = {
    application: backupApplication,
    client: backupClient,
    record: {
      recordType: 'serviceApplication',
      backupRetention: 'minimized_on_send',
      backupSchemaVersion: 1,
      applicationId: application.id,
      clientId: application.clientId,
      clientName: application.name,
      phone: application.phone,
      selectedService: application.selectedService,
      serviceLabel: application.serviceLabel,
      memberType: application.memberType,
      parqStatus: application.parqStatus,
      source: application.source,
      payload: backupPayload,
      application: backupApplication,
      client: backupClient,
    },
  };
  const attempts = ['saveServiceApplication', 'saveApplication', 'saveConsultation'];
  const errors = [];

  for (const action of attempts) {
    try {
      const data = await callGoogleDriveBackup(action, payload);
      return { ok: true, source: 'google-drive', action, data };
    } catch (error) {
      errors.push(`${action}: ${error?.message || 'unknown error'}`);
    }
  }

  return { ok: false, error: errors.slice(0, 3).join(' / ') || 'Google Drive backup failed.' };
}

function cleanValue(value) {
  return String(value || '').trim();
}

function cleanLimitedValue(value, maxLength = 500) {
  return cleanValue(value).slice(0, maxLength);
}

function buildId(prefix) {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${stamp}-${random}`;
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map((item) => cleanValue(item)).filter(Boolean);
  if (!value) return [];
  return [cleanValue(value)].filter(Boolean);
}

function normalizeLimitedArray(value, maxItems = 16, maxLength = 120) {
  return normalizeArray(value)
    .map((item) => cleanLimitedValue(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function wantsJson(request) {
  const accept = request.headers.get('accept') || '';
  const contentType = request.headers.get('content-type') || '';
  return accept.includes('application/json') || contentType.includes('application/json');
}

function redirectTo(request, status, params = {}) {
  const url = new URL('/apply', request.url);
  url.searchParams.set('status', status);

  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });

  return NextResponse.redirect(url, 303);
}

async function readPayload(request) {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return request.json().catch(() => ({}));
  }

  const formData = await request.formData();
  const payload = {};

  for (const key of new Set(formData.keys())) {
    const values = formData.getAll(key).map((value) => cleanValue(value)).filter(Boolean);
    payload[key] = ARRAY_FIELDS.has(key) ? values : values[0] || '';
  }

  return payload;
}

function buildApplication(payload = {}) {
  const selectedService = cleanValue(payload.service || payload.selectedService);
  const option = SERVICE_OPTIONS[selectedService];

  if (!selectedService || !option) {
    const error = new Error('신청 서비스를 선택해주세요.');
    error.status = 400;
    throw error;
  }

  const name = cleanLimitedValue(payload.name, 80);
  const phone = cleanLimitedValue(payload.phone, 40);
  const privacyConsent = cleanValue(payload.privacyConsent);
  const parqConsent = cleanValue(payload.parqConsent);

  if (!name || !phone || privacyConsent !== 'yes' || parqConsent !== 'yes') {
    const error = new Error('필수 항목을 확인해주세요.');
    error.status = 400;
    throw error;
  }

  const parqYesItems = normalizeLimitedArray(payload.parqYesItems, 12, 120);
  const peExamTargetUniversities = cleanLimitedValue(payload.peExamTargetUniversities, 300);
  const peExamTargetDepartment = cleanLimitedValue(payload.peExamTargetDepartment, 160);
  const peExamPracticalEvents = normalizeLimitedArray(payload.peExamPracticalEvents, 20, 80);
  const peExamParts = [
    cleanLimitedValue(payload.peExamMemo, 1200),
    peExamTargetUniversities ? `희망 대학: ${peExamTargetUniversities}` : '',
    peExamTargetDepartment ? `목표 학과: ${peExamTargetDepartment}` : '',
    peExamPracticalEvents.length ? `실기 종목: ${peExamPracticalEvents.join(', ')}` : '',
  ].filter(Boolean);

  return {
    id: buildId('APP'),
    clientId: buildId('RP'),
    selectedService,
    serviceLabel: option.label,
    memberType: option.memberType,
    name,
    phone,
    birth: cleanLimitedValue(payload.birth, 20),
    gender: cleanLimitedValue(payload.gender, 20),
    goal: cleanLimitedValue(payload.goal, 800),
    purpose: normalizeLimitedArray(payload.purpose, 12, 100),
    painAreas: normalizeLimitedArray(payload.painAreas, 16, 80),
    painScore: Number(payload.painScore) || 0,
    weeklyFrequency: cleanLimitedValue(payload.weeklyFrequency, 120),
    preferredTime: cleanLimitedValue(payload.preferredTime, 160),
    exerciseExperience: cleanLimitedValue(payload.exerciseExperience, 800),
    concern: cleanLimitedValue(payload.concern, 1000),
    peExamTargetUniversities,
    peExamTargetDepartment,
    peExamPracticalEvents,
    peExamMemo: cleanLimitedValue(peExamParts.join('\n'), 1800),
    parqMemo: cleanLimitedValue(payload.parqMemo, 1000),
    parqYesItems,
    parqStatus: parqYesItems.length ? '추가 확인 필요' : '설문 완료',
    privacyConsent,
    parqConsent,
    source: 'homepage-service-application',
  };
}

function buildMinimizedApplicationPayload(application) {
  return {
    retention: 'minimized_on_write',
    kind: 'service_application',
    schemaVersion: 2,
    applicationId: application.id,
    clientId: application.clientId,
    selectedService: application.selectedService,
    serviceLabel: application.serviceLabel,
    memberType: application.memberType,
    source: application.source,
    consent: {
      privacy: application.privacyConsent === 'yes',
      parq: application.parqConsent === 'yes',
    },
    parqStatus: application.parqStatus,
    counts: {
      purpose: application.purpose.length,
      painAreas: application.painAreas.length,
      parqYesItems: application.parqYesItems.length,
      peExamPracticalEvents: application.peExamPracticalEvents.length,
    },
    fieldLengths: {
      goal: application.goal.length,
      concern: application.concern.length,
      exerciseExperience: application.exerciseExperience.length,
      parqMemo: application.parqMemo.length,
      peExamMemo: application.peExamMemo.length,
    },
    peExam: application.selectedService === 'pe-exam'
      ? {
          hasTargetUniversities: Boolean(application.peExamTargetUniversities),
          hasTargetDepartment: Boolean(application.peExamTargetDepartment),
          practicalEventCount: application.peExamPracticalEvents.length,
        }
      : null,
    savedAt: new Date().toISOString(),
  };
}

function buildGoogleDriveBackupApplication(application, metadata = buildMinimizedApplicationPayload(application)) {
  return {
    retention: 'minimized_on_send',
    kind: 'service_application_backup',
    schemaVersion: 1,
    id: application.id,
    clientId: application.clientId,
    name: application.name,
    phone: application.phone,
    selectedService: application.selectedService,
    serviceLabel: application.serviceLabel,
    memberType: application.memberType,
    parqStatus: application.parqStatus,
    source: application.source,
    metadata,
  };
}

function buildGoogleDriveBackupClient(client = {}) {
  return {
    retention: 'minimized_on_send',
    kind: 'client_backup_reference',
    schemaVersion: 1,
    id: client.id || null,
    name: client.name || null,
    phone: client.phone || null,
    memberType: client.memberType || null,
    status: client.status || null,
    parqStatus: client.parqStatus || null,
    source: client.source || null,
  };
}

let poolPromise;
async function getPool() {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) throw new Error('DATABASE_URL 또는 RP_DATABASE_URL 환경변수가 필요합니다.');

  const globalKey = '__rpServiceApplicationPool';
  if (globalThis[globalKey]) return globalThis[globalKey];

  if (!poolPromise) {
    poolPromise = (async () => {
      const pg = await import('pg');
      const Pool = pg.Pool || pg.default?.Pool;

      if (!Pool) throw new Error('PostgreSQL Pool을 불러오지 못했습니다.');

      return new Pool({
        connectionString: databaseUrl,
        max: Number(process.env.RP_DATABASE_POOL_MAX) || 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
        ssl: getSslConfig(databaseUrl),
      });
    })();
  }

  globalThis[globalKey] = await poolPromise;
  return globalThis[globalKey];
}

let schemaPromise;
async function ensureApplicationSchema() {
  const pool = await getPool();
  if (schemaPromise) return schemaPromise;

  schemaPromise = pool.query(`
    CREATE TABLE IF NOT EXISTS rp_service_applications (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      selected_service TEXT,
      service_label TEXT,
      member_type TEXT,
      status TEXT,
      parq_status TEXT,
      parq_yes_items JSONB NOT NULL DEFAULT '[]'::jsonb,
      purpose JSONB NOT NULL DEFAULT '[]'::jsonb,
      pain_areas JSONB NOT NULL DEFAULT '[]'::jsonb,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `).then(async () => {
    await pool.query('CREATE INDEX IF NOT EXISTS rp_service_applications_client_id_idx ON rp_service_applications (client_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS rp_service_applications_created_at_idx ON rp_service_applications (created_at DESC)');
  });

  try {
    await schemaPromise;
  } catch (error) {
    schemaPromise = null;
    throw error;
  }

  return schemaPromise;
}

async function saveServiceApplication(application) {
  const storedPayload = buildMinimizedApplicationPayload(application);
  const clientResult = await saveDatabaseClient({
    id: application.clientId,
    name: application.name,
    phone: application.phone,
    birth: application.birth,
    gender: application.gender,
    route: '홈페이지 서비스 신청',
    memberType: application.memberType,
    status: application.parqYesItems.length ? '추가 확인' : '상담 전',
    coachName: '정우현',
    parqStatus: application.parqStatus,
    parqYesItems: application.parqYesItems,
    goal: application.goal,
    purpose: application.purpose,
    painAreas: application.painAreas,
    painScore: application.painScore,
    concern: [
      application.concern,
      application.weeklyFrequency ? `운동 가능 빈도: ${application.weeklyFrequency}` : '',
      application.preferredTime ? `선호 시간: ${application.preferredTime}` : '',
      application.exerciseExperience ? `운동 경험: ${application.exerciseExperience}` : '',
      application.parqMemo ? `PAR-Q 추가 메모: ${application.parqMemo}` : '',
      application.peExamMemo ? `체대입시 메모: ${application.peExamMemo}` : '',
    ].filter(Boolean).join('\n'),
    source: application.source,
  });

  await ensureApplicationSchema();
  const pool = await getPool();
  await pool.query(
    `INSERT INTO rp_service_applications (
      id, client_id, name, phone, selected_service, service_label, member_type, status,
      parq_status, parq_yes_items, purpose, pain_areas, payload, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8,
      $9, $10::jsonb, $11::jsonb, $12::jsonb, $13::jsonb, NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      client_id = EXCLUDED.client_id,
      name = EXCLUDED.name,
      phone = EXCLUDED.phone,
      selected_service = EXCLUDED.selected_service,
      service_label = EXCLUDED.service_label,
      member_type = EXCLUDED.member_type,
      status = EXCLUDED.status,
      parq_status = EXCLUDED.parq_status,
      parq_yes_items = EXCLUDED.parq_yes_items,
      purpose = EXCLUDED.purpose,
      pain_areas = EXCLUDED.pain_areas,
      payload = EXCLUDED.payload,
      updated_at = NOW()`,
    [
      application.id,
      application.clientId,
      application.name,
      application.phone,
      application.selectedService,
      application.serviceLabel,
      application.memberType,
      application.parqYesItems.length ? '추가 확인' : '상담 전',
      application.parqStatus,
      JSON.stringify(application.parqYesItems),
      JSON.stringify(application.purpose),
      JSON.stringify(application.painAreas),
      JSON.stringify(storedPayload),
    ],
  );

  const backup = await backupServiceApplication(application, clientResult.client);

  return { ok: true, action: 'database', backupSource: 'google-drive', backup, application, client: clientResult.client };
}

function buildPublicBackupResult(backup) {
  if (!backup) return null;

  return {
    ok: Boolean(backup.ok),
    skipped: Boolean(backup.skipped),
    source: backup.source || null,
    action: backup.action || null,
    reason: backup.reason || null,
  };
}

function buildPublicApplicationResult(result) {
  return {
    action: result.action,
    backupSource: result.backupSource,
    backup: buildPublicBackupResult(result.backup),
    applicationId: result.application?.id || null,
    clientId: result.client?.id || null,
  };
}

function getPublicApplicationError(error) {
  if (error?.status === 400) return error?.message || '필수 항목을 확인해주세요.';
  if (error?.status === 503) return '현재 신청 저장소 설정이 완료되지 않았습니다.';
  return '서비스 신청 저장 중 오류가 발생했습니다.';
}

export async function POST(request) {
  const jsonMode = wantsJson(request);
  const originCheck = checkSameOriginRequest(request);
  if (!originCheck.ok) return buildForbiddenOriginResponse();

  const sizeCheck = checkRequestBodySize(request, REQUEST_SIZE_LIMITS.medium);
  if (!sizeCheck.ok) return buildRequestTooLargeResponse(sizeCheck.maxBytes);

  try {
    if (!isDatabaseConfigured()) {
      if (jsonMode) {
        return NextResponse.json({ ok: false, error: '현재 신청 저장소 설정이 완료되지 않았습니다.' }, { status: 503 });
      }

      return redirectTo(request, 'setup');
    }

    const payload = await readPayload(request);
    const application = buildApplication(payload);
    const retryAfterSeconds = await checkSharedRequestRateLimit({
      request,
      scope: 'service-application',
      identifier: application.phone,
      limit: APPLICATION_LIMIT,
      ipLimit: APPLICATION_IP_LIMIT,
      windowMs: APPLICATION_WINDOW_MS,
    });

    if (retryAfterSeconds) {
      if (jsonMode) return buildRateLimitResponse(retryAfterSeconds);
      return redirectTo(request, 'rate-limited');
    }

    const result = await saveServiceApplication(application);

    if (jsonMode) {
      return NextResponse.json({ ok: true, ...buildPublicApplicationResult(result) });
    }

    return redirectTo(request, 'success', { clientId: result.client?.id });
  } catch (error) {
    if (jsonMode) {
      return NextResponse.json(
        { ok: false, error: getPublicApplicationError(error) },
        { status: error?.status || 500 },
      );
    }

    return redirectTo(request, error?.status === 400 ? 'invalid' : 'error');
  }
}
