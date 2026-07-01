import { hasStaffRole, normalizeRole } from './rpAdminAuth';
import {
  consumeDatabaseAiUsage,
  findDatabaseAuthAccountAccess,
  getKstDateKey,
  isDatabaseConfigured,
} from './rpDatabase';

function cleanValue(value) {
  return String(value || '').trim();
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number(cleanValue(value));
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

export function getAiDailyLimitForRole(role, account = null) {
  if (Number(account?.aiDailyLimit) > 0) return Number(account.aiDailyLimit);

  const normalizedRole = normalizeRole(role);
  const defaultLimit = parsePositiveInteger(process.env.RP_AI_DAILY_LIMIT, 3);

  if (hasStaffRole(normalizedRole)) {
    return parsePositiveInteger(
      process.env.RP_AI_STAFF_DAILY_LIMIT || process.env.RP_AI_DAILY_LIMIT,
      20,
    );
  }

  return parsePositiveInteger(process.env.RP_AI_MEMBER_DAILY_LIMIT || process.env.RP_AI_DAILY_LIMIT, defaultLimit);
}

export async function checkAiServiceAccess(session, {
  routeKey = 'ai-service',
  requireMemberApproval = true,
  tokenEstimate = 0,
} = {}) {
  if (!session?.sub) {
    return {
      ok: false,
      status: 401,
      error: '로그인이 필요합니다.',
    };
  }

  if (!isDatabaseConfigured()) {
    return {
      ok: false,
      status: 503,
      setupRequired: true,
      error: 'AI 사용 승인과 일일 사용량 확인을 위해 DATABASE_URL 또는 RP_DATABASE_URL 설정이 필요합니다.',
    };
  }

  const sessionRole = normalizeRole(session.role);
  const staff = hasStaffRole(sessionRole);
  const account = await findDatabaseAuthAccountAccess(session.sub);

  if (!staff && (!account || !account.approved)) {
    return {
      ok: false,
      status: 403,
      error: '승인된 회원 계정만 AI 서비스를 이용할 수 있습니다.',
    };
  }

  if (!staff && requireMemberApproval && !account?.aiApproved) {
    return {
      ok: false,
      status: 403,
      code: 'AI_APPROVAL_REQUIRED',
      error: '관리자 AI 사용 승인 후 이용할 수 있습니다.',
    };
  }

  const dailyLimit = getAiDailyLimitForRole(account?.role || sessionRole, account);
  const usageDate = getKstDateKey();
  const usage = await consumeDatabaseAiUsage({
    username: account?.usernameKey || session.sub,
    routeKey,
    limit: dailyLimit,
    usageDate,
    tokenEstimate,
  });

  if (!usage.allowed) {
    return {
      ok: false,
      status: 429,
      code: 'AI_DAILY_LIMIT_REACHED',
      error: `오늘 AI 사용 가능 횟수 ${usage.limit}회를 모두 사용했습니다.`,
      usage,
    };
  }

  return {
    ok: true,
    account,
    staff,
    usage,
  };
}
