import { cookies } from 'next/headers';
import { peExamSourceStatusSnapshot } from '../../../pe-exam/peExamSourceStatus';
import {
  ADMIN_COOKIE_NAME,
  areEnvironmentAuthAccountsAllowed,
  getAdminSessionTtlSeconds,
  hasStaffAccess,
  verifyAdminSessionCookie,
} from '../../../../lib/rpAdminAuth';
import {
  checkDatabaseSchemaReadiness,
  isDatabaseConfigured,
  isDatabaseOnlyMode,
  isRuntimeSchemaSyncDisabled,
} from '../../../../lib/rpDatabase';
import {
  getGoogleDriveBackupSkipReason,
  isGoogleDriveBackupEnabled,
} from '../../../../lib/rpGoogleDriveBackup';
import { buildRateLimitResponse, checkSharedRequestRateLimit } from '../../../../lib/rpRateLimit';
import { getProductionSecretStatus } from '../../../../lib/rpSecurity';

export const dynamic = 'force-dynamic';

const STATUS_LIMIT = 120;
const STATUS_WINDOW_MS = 15 * 60 * 1000;

function getKstYear(date = new Date()) {
  return new Date(date.getTime() + (9 * 60 * 60 * 1000)).getUTCFullYear();
}

function daysSince(value) {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return null;
  return Math.floor((Date.now() - time) / (24 * 60 * 60 * 1000));
}

function cleanEnvValue(value) {
  return String(value || '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .trim();
}

function hasEnv(...keys) {
  return keys.some((key) => Boolean(cleanEnvValue(process.env[key])));
}

function getFirstEnv(...keys) {
  for (const key of keys) {
    const value = cleanEnvValue(process.env[key]);
    if (value) return value;
  }

  return '';
}

function buildSecretStatus(...keys) {
  return getProductionSecretStatus(getFirstEnv(...keys));
}

function buildPeExamDataStatus() {
  const currentKoreaYear = getKstYear();
  const maxAgeDays = Number(peExamSourceStatusSnapshot.defaults?.maxAgeDays || 120);
  const sources = (peExamSourceStatusSnapshot.sources || []).map((source) => {
    const ageDays = daysSince(source.generatedAt);
    const expectedSchoolYear = currentKoreaYear + Number(source.minSchoolYearOffset || 0);
    const hasResultYearThreshold = source.minResultYearOffset !== null
      && source.minResultYearOffset !== undefined
      && source.minResultYearOffset !== '';
    const expectedResultYear = hasResultYearThreshold && Number.isFinite(Number(source.minResultYearOffset))
      ? currentKoreaYear + Number(source.minResultYearOffset)
      : null;
    const schoolYear = Number(source.schoolYear || 0);
    const resultYear = Number(source.resultYear || 0);
    const universityCount = Number(source.universityCount || 0);
    const admissionCount = Number(source.admissionCount || 0);
    const issues = [];

    if (schoolYear < expectedSchoolYear) issues.push('school_year_stale');
    if (expectedResultYear !== null && resultYear < expectedResultYear) issues.push('result_year_stale');
    if (ageDays === null || ageDays < 0 || ageDays > maxAgeDays) issues.push('generated_at_stale');
    if (universityCount < Number(source.minUniversities || 0)) issues.push('university_count_low');
    if (admissionCount < Number(source.minAdmissions || 0)) issues.push('admission_count_low');

    return {
      key: source.key,
      label: source.label,
      file: source.file,
      sourceName: source.sourceName,
      sourceUrl: source.sourceUrl,
      schoolYear: source.schoolYear,
      resultYear: source.resultYear || null,
      generatedAt: source.generatedAt,
      ageDays,
      universityCount,
      admissionCount,
      expectedSchoolYear,
      expectedResultYear,
      maxAgeDays,
      ok: issues.length === 0,
      issues,
    };
  });
  const failures = sources.filter((source) => !source.ok);

  return {
    ok: failures.length === 0,
    currentKoreaYear,
    maxAgeDays,
    sourceSnapshotsMaxGeneratedAt: peExamSourceStatusSnapshot.sourceSnapshotsMaxGeneratedAt || '',
    refreshCommand: 'npm.cmd run pe-exam:data:refresh',
    verifyCommand: 'npm.cmd run pe-exam:data:verify',
    sources,
    failures,
  };
}

async function buildStatus() {
  const databaseConfigured = isDatabaseConfigured();
  const databaseOnly = isDatabaseOnlyMode();
  const databaseSchema = await checkDatabaseSchemaReadiness();
  const sheetsWebAppConfigured = hasEnv('RP_SHEETS_WEBAPP_URL');
  const authWebAppConfigured = hasEnv('RP_AUTH_WEBAPP_URL', 'RP_SIGNUP_WEBAPP_URL', 'RP_SHEETS_WEBAPP_URL');
  const backupWebAppConfigured = authWebAppConfigured;
  const apiSecretConfigured = hasEnv('RP_API_SECRET');
  const googleDriveBackupEnabled = isGoogleDriveBackupEnabled();
  const sessionTtlSeconds = getAdminSessionTtlSeconds();

  return {
    ok: true,
    checkedAt: new Date().toISOString(),
    storage: {
      primary: databaseConfigured ? 'postgres' : 'google-drive',
      postgres: {
        configured: databaseConfigured,
        databaseOnly,
        runtimeSchemaSyncDisabled: isRuntimeSchemaSyncDisabled(),
        schema: databaseSchema,
      },
      googleDriveBackup: {
        configured: backupWebAppConfigured && apiSecretConfigured,
        enabled: googleDriveBackupEnabled,
        explicitOptInRequired: true,
        skipReason: googleDriveBackupEnabled ? null : getGoogleDriveBackupSkipReason(),
        backupWebAppConfigured,
        sheetsWebAppConfigured,
        authWebAppConfigured,
        apiSecretConfigured,
      },
    },
    auth: {
      session: {
        cookieName: ADMIN_COOKIE_NAME,
        ttlSeconds: sessionTtlSeconds,
        minimumOneDay: sessionTtlSeconds >= 60 * 60 * 24,
        signingSecretConfigured: hasEnv('RP_ADMIN_SESSION_SECRET', 'RP_API_SECRET'),
        signingSecret: buildSecretStatus('RP_ADMIN_SESSION_SECRET', 'RP_API_SECRET'),
      },
      signup: {
        defaultRole: 'member',
        identitySigningSecretConfigured: hasEnv(
          'RP_IDENTITY_VERIFICATION_SECRET',
          'RP_ADMIN_SESSION_SECRET',
          'RP_API_SECRET',
        ),
        identitySigningSecret: buildSecretStatus(
          'RP_IDENTITY_VERIFICATION_SECRET',
          'RP_ACCOUNT_RECOVERY_SECRET',
          'RP_ADMIN_SESSION_SECRET',
          'RP_API_SECRET',
        ),
        phoneWebhookConfigured: hasEnv('RP_SMS_WEBHOOK_URL', 'SMS_WEBHOOK_URL'),
        emailWebhookConfigured: hasEnv('RP_EMAIL_WEBHOOK_URL', 'EMAIL_WEBHOOK_URL'),
        kakaoWebhookConfigured: hasEnv('RP_KAKAO_WEBHOOK_URL', 'KAKAO_WEBHOOK_URL'),
      },
      accountRecovery: {
        signingSecretConfigured: hasEnv('RP_ACCOUNT_RECOVERY_SECRET', 'RP_ADMIN_SESSION_SECRET', 'RP_API_SECRET'),
        signingSecret: buildSecretStatus('RP_ACCOUNT_RECOVERY_SECRET', 'RP_ADMIN_SESSION_SECRET', 'RP_API_SECRET'),
        phoneWebhookConfigured: hasEnv('RP_SMS_WEBHOOK_URL', 'SMS_WEBHOOK_URL'),
        webhookSecretConfigured: hasEnv('RP_IDENTITY_WEBHOOK_SECRET', 'RP_SMS_WEBHOOK_SECRET', 'RP_API_SECRET'),
        passwordResetStore: databaseConfigured ? 'postgres' : 'manual',
        requestLimit: {
          perPhone: '5 / 15min',
          perIp: '20 / 15min',
          verifyAttempts: '8 / 5min',
        },
      },
      passwordHash: {
        secretConfigured: hasEnv('RP_PASSWORD_HASH_SECRET', 'RP_ADMIN_SESSION_SECRET', 'RP_API_SECRET'),
        secret: buildSecretStatus('RP_PASSWORD_HASH_SECRET', 'RP_ADMIN_SESSION_SECRET', 'RP_API_SECRET'),
      },
      seedAccounts: {
        allowed: areEnvironmentAuthAccountsAllowed(),
        productionOptInRequired: process.env.NODE_ENV === 'production',
        authUsersConfigured: hasEnv('RP_AUTH_USERS'),
        adminUsersConfigured: hasEnv('RP_ADMIN_USERS', 'RP_ADMIN_USERNAME'),
        trainerUsersConfigured: hasEnv('RP_TRAINER_USERS', 'RP_TRAINER_USERNAME'),
      },
    },
    peExamData: buildPeExamDataStatus(),
  };
}

export async function GET(request) {
  const cookieStore = await cookies();
  const session = await verifyAdminSessionCookie(cookieStore.get(ADMIN_COOKIE_NAME)?.value);

  if (!session) {
    return Response.json({ ok: false, error: '관리자 로그인이 필요합니다.' }, { status: 401 });
  }

  if (!hasStaffAccess(session)) {
    return Response.json({ ok: false, error: '관리자 또는 트레이너 권한이 필요합니다.' }, { status: 403 });
  }

  const retryAfterSeconds = await checkSharedRequestRateLimit({
    request,
    scope: 'rp-system-status',
    identifier: session.sub,
    limit: STATUS_LIMIT,
    ipLimit: STATUS_LIMIT * 2,
    windowMs: STATUS_WINDOW_MS,
  });
  if (retryAfterSeconds) return buildRateLimitResponse(retryAfterSeconds);

  return Response.json(await buildStatus());
}
