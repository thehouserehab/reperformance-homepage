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
  getDatabasePoolConfig,
  isDatabaseConfigured,
  isDatabaseOnlyMode,
  isRuntimeSchemaSyncDisabled,
} from '../../../../lib/rpDatabase';
import {
  getGoogleDriveBackupSkipReason,
  isGoogleDriveBackupEnabled,
} from '../../../../lib/rpGoogleDriveBackup';
import {
  buildRateLimitResponse,
  checkSharedRequestRateLimit,
  getSharedRateLimitFailureRetrySeconds,
  isSharedRateLimitFailClosed,
} from '../../../../lib/rpRateLimit';
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

function getProductionSecretReadinessIssues(auth) {
  const secretChecks = [
    ['session_secret_not_strong', auth.session.signingSecret],
    ['identity_secret_not_strong', auth.signup.identitySigningSecret],
    ['account_recovery_secret_not_strong', auth.accountRecovery.signingSecret],
    ['password_hash_secret_not_strong', auth.passwordHash.secret],
  ];

  return secretChecks
    .filter(([, status]) => status?.productionEnforced && !status.strong)
    .map(([code]) => ({
      code,
      message: 'Production signing and password secrets must be configured, non-placeholder, and at least 32 characters.',
    }));
}

function addDatabasePoolReadinessWarnings(list, databaseConfigured, databasePool) {
  if (!databaseConfigured) return;

  const max = Number(databasePool?.max || 0);
  const minRecommendedMax = Number(databasePool?.minRecommendedMax || 0);
  const maxRecommendedMax = Number(databasePool?.maxRecommendedMax || 0);
  const detail = {
    max,
    minRecommendedMax,
    maxRecommendedMax,
    explicitMax: Boolean(databasePool?.explicitMax),
    validMax: databasePool?.validMax !== false,
  };

  if (!databasePool?.explicitMax) {
    addReadinessIssue(
      list,
      'database_pool_max_not_explicit',
      'Set RP_DATABASE_POOL_MAX explicitly before high-traffic campaigns so connection pressure is intentional.',
      detail,
    );
  }
  if (databasePool?.explicitMax && !databasePool?.validMax) {
    addReadinessIssue(
      list,
      'database_pool_max_invalid',
      'RP_DATABASE_POOL_MAX is configured but is not a positive integer; the app is using the default pool max.',
      detail,
    );
  }
  if (minRecommendedMax && max < minRecommendedMax) {
    addReadinessIssue(
      list,
      'database_pool_max_low',
      'RP_DATABASE_POOL_MAX is below the minimum recommended value for production traffic.',
      detail,
    );
  }
  if (maxRecommendedMax && max > maxRecommendedMax) {
    addReadinessIssue(
      list,
      'database_pool_max_high',
      'RP_DATABASE_POOL_MAX is above the conservative recommendation; confirm the managed PostgreSQL plan supports this many connections.',
      detail,
    );
  }
}

function buildHighTrafficReadiness({
  databaseConfigured,
  databaseOnly,
  runtimeSchemaSyncDisabled,
  databaseSchema,
  googleDriveBackup,
  auth,
  peExamData,
  trafficControls,
  databasePool,
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
  if (!databaseSchema?.allRequiredTablesPresent) {
    addReadinessIssue(blockers, 'database_required_tables_missing', 'Apply checked-in migrations so all production tables exist before high-traffic campaigns.', {
      missingCount: databaseSchema?.missingRequiredTables?.length ?? null,
    });
  }
  if (!databaseSchema?.allRequiredIndexesPresent) {
    addReadinessIssue(blockers, 'database_required_indexes_missing', 'Apply checked-in migrations so lookup, rate-limit, AI usage, security event, and retention indexes exist.', {
      missingCount: databaseSchema?.missingRequiredIndexes?.length ?? null,
    });
  }
  if (!databaseSchema?.verifiedContactUniquenessReady) {
    addReadinessIssue(blockers, 'auth_verified_contact_uniqueness_not_ready', 'Apply auth contact uniqueness migration and resolve duplicate verified contacts.');
  }
  if (!databaseSchema?.rateLimitBucketsReady) {
    addReadinessIssue(blockers, 'shared_rate_limit_store_not_ready', 'PostgreSQL shared rate-limit buckets and expiry index must be ready before traffic spikes.');
  }
  if (!databaseSchema?.aiUsageBucketsReady) {
    addReadinessIssue(blockers, 'ai_usage_buckets_not_ready', 'AI usage buckets and usage-date index must be ready before token-backed AI services are enabled at scale.');
  }
  if (!trafficControls?.sharedRateLimit?.failClosed) {
    addReadinessIssue(warnings, 'rate_limit_fail_closed_not_enabled', 'Consider RP_RATE_LIMIT_FAIL_CLOSED=true during paid campaigns so DB limiter failures do not silently degrade to instance-local limits.');
  }
  addDatabasePoolReadinessWarnings(warnings, databaseConfigured, databasePool);
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

  for (const issue of getProductionSecretReadinessIssues(auth)) {
    addReadinessIssue(blockers, issue.code, issue.message);
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

function buildObjectiveReadiness({
  storage,
  auth,
  peExamData,
  highTrafficReadiness,
  trafficControls,
}) {
  const databaseConfigured = storage.postgres.configured;
  const databaseOnly = storage.postgres.databaseOnly;
  const runtimeSchemaSyncDisabled = storage.postgres.runtimeSchemaSyncDisabled;
  const databaseSchema = storage.postgres.schema;
  const databasePool = storage.postgres.pool;
  const googleDriveBackup = storage.googleDriveBackup;
  const retentionCronSecretConfigured = hasEnv('CRON_SECRET', 'RP_MAINTENANCE_CRON_SECRET');
  const retentionCronApplyEnabled = ['true', '1', 'yes', 'on'].includes(
    cleanEnvValue(process.env.RP_RETENTION_CRON_APPLY).toLowerCase(),
  );

  const customerDataBlockers = [];
  const customerDataWarnings = [];
  if (!databaseConfigured) {
    addReadinessIssue(customerDataBlockers, 'postgres_not_configured', 'Customer data should be stored in PostgreSQL before production traffic.');
  }
  if (databaseConfigured && databaseSchema?.error) {
    addReadinessIssue(customerDataBlockers, 'schema_check_failed', 'PostgreSQL schema readiness could not be verified.', {
      error: databaseSchema.error,
    });
  }
  if (!databaseSchema?.allRequiredTablesPresent) {
    addReadinessIssue(customerDataBlockers, 'database_required_tables_missing', 'Customer, application, PE exam, auth, rate-limit, AI usage, and security event tables must exist.');
  }
  if (googleDriveBackup.enabled && !googleDriveBackup.configured) {
    addReadinessIssue(customerDataBlockers, 'google_backup_enabled_but_not_configured', 'Google backup is enabled without all required backup settings.');
  }
  if (googleDriveBackup.enabled) {
    addReadinessIssue(customerDataWarnings, 'google_backup_enabled', 'Google backup is enabled; verify sheet access, restore readiness, and retention before relying on it.');
  }

  const authBlockers = [];
  const authWarnings = [];
  for (const issue of getProductionSecretReadinessIssues(auth)) {
    addReadinessIssue(authBlockers, issue.code, issue.message);
  }
  if (!databaseConfigured) {
    addReadinessIssue(authBlockers, 'postgres_not_configured', 'Signup, account recovery, AI approval, and duplicate-contact protection require PostgreSQL.');
  }
  if (!databaseSchema?.verifiedContactUniquenessReady) {
    addReadinessIssue(authBlockers, 'auth_verified_contact_uniqueness_not_ready', 'Apply the verified-contact uniqueness migration and resolve duplicate verified contacts.');
  }
  if (!databaseSchema?.securityEventsReady) {
    addReadinessIssue(authBlockers, 'security_event_store_not_ready', 'Security event table and review indexes must be ready for sensitive auth and AI approval audit trails.');
  }
  if (process.env.NODE_ENV === 'production' && auth.seedAccounts.allowed) {
    addReadinessIssue(authBlockers, 'production_env_auth_accounts_enabled', 'Disable production environment-variable auth accounts after bootstrap.');
  }
  if (!auth.signup.phoneWebhookConfigured && !auth.signup.emailWebhookConfigured && !auth.signup.kakaoWebhookConfigured) {
    addReadinessIssue(authWarnings, 'identity_delivery_not_configured', 'No identity verification delivery webhook is configured.');
  }
  if (!auth.accountRecovery.phoneWebhookConfigured) {
    addReadinessIssue(authWarnings, 'phone_recovery_delivery_not_configured', 'Phone-based account recovery requires an SMS webhook before production use.');
  }

  const peExamBlockers = [];
  if (!peExamData.ok) {
    addReadinessIssue(peExamBlockers, 'pe_exam_data_not_fresh', 'Refresh and verify KUSF/ADIGA PE exam source snapshots.', {
      failureCount: peExamData.failures.length,
    });
  }

  const dataScaleBlockers = [];
  const dataScaleWarnings = [];
  if (!databaseConfigured) {
    addReadinessIssue(dataScaleBlockers, 'postgres_not_configured', 'Data scale management requires PostgreSQL instead of local or manual storage.');
  }
  if (!runtimeSchemaSyncDisabled) {
    addReadinessIssue(dataScaleBlockers, 'runtime_schema_sync_enabled', 'Disable runtime schema sync after migrations are applied for high-traffic production.');
  }
  if (databaseConfigured && databaseSchema?.error) {
    addReadinessIssue(dataScaleBlockers, 'schema_check_failed', 'Database schema readiness could not be verified for data-scale operations.', {
      error: databaseSchema.error,
    });
  }
  if (!databaseSchema?.allRequiredIndexesPresent) {
    addReadinessIssue(dataScaleBlockers, 'database_required_indexes_missing', 'Required lookup, rate-limit, AI usage, security event, and retention indexes are missing.');
  }
  if (!databaseSchema?.retentionIndexesReady) {
    addReadinessIssue(dataScaleBlockers, 'retention_indexes_not_ready', 'Retention cleanup indexes must exist before running cleanup on a large production dataset.');
  }
  if (!databaseSchema?.rateLimitBucketsReady) {
    addReadinessIssue(dataScaleBlockers, 'shared_rate_limit_store_not_ready', 'Shared PostgreSQL rate-limit buckets must be ready before traffic spikes.');
  }
  if (!databaseSchema?.aiUsageBucketsReady) {
    addReadinessIssue(dataScaleBlockers, 'ai_usage_buckets_not_ready', 'AI usage buckets must be ready before token-backed AI usage increases.');
  }
  if (!trafficControls?.sharedRateLimit?.failClosed) {
    addReadinessIssue(dataScaleWarnings, 'rate_limit_fail_closed_not_enabled', 'For campaign windows, enable RP_RATE_LIMIT_FAIL_CLOSED=true if DB limiter degradation should block instead of falling back to in-memory limits.');
  }
  addDatabasePoolReadinessWarnings(dataScaleWarnings, databaseConfigured, databasePool);
  if (!databaseOnly) {
    addReadinessIssue(dataScaleWarnings, 'database_only_mode_not_enabled', 'Set RP_DATA_SOURCE=database before campaigns to avoid fallback write paths.');
  }
  if (!retentionCronSecretConfigured) {
    addReadinessIssue(dataScaleWarnings, 'retention_cron_secret_not_configured', 'Configure CRON_SECRET or RP_MAINTENANCE_CRON_SECRET before relying on scheduled retention maintenance.');
  }
  if (retentionCronApplyEnabled) {
    addReadinessIssue(dataScaleWarnings, 'retention_cron_apply_enabled', 'Retention cron apply mode is enabled; confirm deletion approval and restore readiness.');
  }

  return {
    customerDataSecurity: {
      ready: customerDataBlockers.length === 0,
      blockers: customerDataBlockers,
      warnings: customerDataWarnings,
      evidence: [
        'storage.postgres.configured',
        'storage.googleDriveBackup.explicitOptInRequired',
        'storage.googleDriveBackup.enabled',
      ],
    },
    signupLoginSecurity: {
      ready: authBlockers.length === 0,
      blockers: authBlockers,
      warnings: authWarnings,
      evidence: [
        'auth.session.signingSecret',
        'auth.signup.identitySigningSecret',
        'auth.accountRecovery.signingSecret',
        'auth.passwordHash.secret',
        'storage.postgres.schema.verifiedContactUniquenessReady',
      ],
    },
    peExamDataMaintenance: {
      ready: peExamBlockers.length === 0,
      blockers: peExamBlockers,
      warnings: [],
      commands: [
        peExamData.refreshCommand,
        peExamData.verifyCommand,
      ],
    },
    trafficSurgeReadiness: {
      ready: highTrafficReadiness.ready,
      blockers: highTrafficReadiness.blockers,
      warnings: highTrafficReadiness.warnings,
      requiredManualChecks: highTrafficReadiness.requiredManualChecks,
    },
    dataScaleManagement: {
      ready: dataScaleBlockers.length === 0,
      blockers: dataScaleBlockers,
      warnings: dataScaleWarnings,
      retentionCron: {
        secretConfigured: retentionCronSecretConfigured,
        applyEnabled: retentionCronApplyEnabled,
      },
      databasePool,
      requiredManualChecks: [
        'Run npm.cmd run data:retention:audit monthly and before campaigns.',
        'Run npm.cmd run ops:campaign:check -- --database --retention-strict before paid or admission-season traffic.',
        'Apply retention only after backup restore readiness and deletion approval are confirmed.',
      ],
    },
  };
}

async function buildStatus() {
  const databaseConfigured = isDatabaseConfigured();
  const databaseOnly = isDatabaseOnlyMode();
  const databaseSchema = await checkDatabaseSchemaReadiness();
  const databasePool = getDatabasePoolConfig();
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
      pool: databasePool,
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
  const trafficControls = {
    sharedRateLimit: {
      store: databaseConfigured ? 'postgres-with-memory-fallback' : 'memory-only',
      failClosed: isSharedRateLimitFailClosed(),
      failClosedRetryAfterSeconds: getSharedRateLimitFailureRetrySeconds(),
      failureMode: isSharedRateLimitFailClosed() ? 'block_with_429' : 'fallback_to_in_memory',
    },
  };
  const highTrafficReadiness = buildHighTrafficReadiness({
    databaseConfigured,
    databaseOnly,
    runtimeSchemaSyncDisabled,
    databaseSchema,
    googleDriveBackup: storage.googleDriveBackup,
    auth,
    peExamData,
    trafficControls,
    databasePool,
  });
  const objectiveReadiness = buildObjectiveReadiness({
    storage,
    auth,
    peExamData,
    highTrafficReadiness,
    trafficControls,
  });

  return {
    ok: true,
    checkedAt: new Date().toISOString(),
    storage,
    auth,
    trafficControls,
    peExamData,
    highTrafficReadiness,
    objectiveReadiness,
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
