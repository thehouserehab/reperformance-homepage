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

function addReadinessIssue(list, code, message, detail = {}) {
  list.push({ code, message, detail });
}

function buildHighTrafficReadiness({
  databaseConfigured,
  databaseOnly,
  runtimeSchemaSyncDisabled,
  databaseSchema,
  googleDriveBackup,
  auth,
  peExamData,
}) {
  const blockers = [];
  const warnings = [];
  const productionRuntime = process.env.NODE_ENV === 'production';

  if (!databaseConfigured) {
    addReadinessIssue(blockers, 'postgres_not_configured', 'Production traffic requires PostgreSQL as the primary customer-data store.');
  }
  if (!databaseOnly) {
    addReadinessIssue(warnings, 'database_only_mode_not_enabled', 'Set RP_DATA_SOURCE=database before high-traffic campaigns to avoid fallback write paths.');
  }
  if (!runtimeSchemaSyncDisabled) {
    addReadinessIssue(blockers, 'runtime_schema_sync_enabled', 'Apply checked-in migrations, then set RP_DISABLE_RUNTIME_SCHEMA_SYNC=true before high-traffic campaigns.');
  }
  if (!databaseSchema?.verifiedContactUniquenessReady) {
    addReadinessIssue(blockers, 'auth_verified_contact_uniqueness_not_ready', 'Apply auth contact uniqueness migration and resolve duplicate verified contacts.');
  }
  if (googleDriveBackup.enabled) {
    addReadinessIssue(warnings, 'google_backup_enabled', 'Google Drive/Sheets backup is enabled; confirm restore readiness, access controls, and retention before campaign traffic.');
  }
  if (googleDriveBackup.enabled && !googleDriveBackup.configured) {
    addReadinessIssue(blockers, 'google_backup_enabled_but_not_configured', 'Google backup is enabled without a complete backup web app URL and API secret configuration.');
  }
  if (productionRuntime && auth.seedAccounts.allowed) {
    addReadinessIssue(blockers, 'production_env_auth_accounts_enabled', 'Disable RP_ALLOW_ENV_AUTH_ACCOUNTS after bootstrap so PostgreSQL accounts are the production login source.');
  }
  if (!peExamData.ok) {
    addReadinessIssue(blockers, 'pe_exam_data_not_fresh', 'Refresh and verify PE exam source snapshots before admission-season traffic.', {
      failureCount: peExamData.failures.length,
    });
  }

  const secretChecks = [
    ['session_secret_not_strong', auth.session.signingSecret],
    ['identity_secret_not_strong', auth.signup.identitySigningSecret],
    ['account_recovery_secret_not_strong', auth.accountRecovery.signingSecret],
    ['password_hash_secret_not_strong', auth.passwordHash.secret],
  ];
  for (const [code, status] of secretChecks) {
    if (status?.productionEnforced && !status.strong) {
      addReadinessIssue(blockers, code, 'Production signing and password secrets must be configured, non-placeholder, and at least 32 characters.');
    }
  }

  return {
    ready: blockers.length === 0,
    blockers,
    warnings,
    requiredManualChecks: [
      'Run npm.cmd run db:migration:check against production PostgreSQL.',
      'Run npm.cmd run ops:campaign:check -- --database --retention-strict with production database access.',
      'Confirm Vercel Firewall or equivalent edge controls protect auth, signup, service application, AI, client, and admin APIs.',
      'Run npm.cmd run ops:public:check after deploy.',
      'Monitor 429, 5xx, database connection timeouts, and backup failures during campaign traffic.',
    ],
  };
}

async function buildStatus() {
  const databaseConfigured = isDatabaseConfigured();
  const databaseOnly = isDatabaseOnlyMode();
  const databaseSchema = await checkDatabaseSchemaReadiness();
  const runtimeSchemaSyncDisabled = isRuntimeSchemaSyncDisabled();
  const sheetsWebAppConfigured = hasEnv('RP_SHEETS_WEBAPP_URL');
  const authWebAppConfigured = hasEnv('RP_AUTH_WEBAPP_URL', 'RP_SIGNUP_WEBAPP_URL', 'RP_SHEETS_WEBAPP_URL');
  const backupWebAppConfigured = authWebAppConfigured;
  const apiSecretConfigured = hasEnv('RP_API_SECRET');
  const googleDriveBackupEnabled = isGoogleDriveBackupEnabled();
  const sessionTtlSeconds = getAdminSessionTtlSeconds();
  const storage = {
    primary: databaseConfigured ? 'postgres' : 'google-drive',
    postgres: {
      configured: databaseConfigured,
      databaseOnly,
      runtimeSchemaSyncDisabled,
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
  };
  const auth = {
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
  };
  const peExamData = buildPeExamDataStatus();
  const highTrafficReadiness = buildHighTrafficReadiness({
    databaseConfigured,
    databaseOnly,
    runtimeSchemaSyncDisabled,
    databaseSchema,
    googleDriveBackup: storage.googleDriveBackup,
    auth,
    peExamData,
  });

  return {
    ok: true,
    checkedAt: new Date().toISOString(),
    storage,
    auth,
    peExamData,
    highTrafficReadiness,
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
