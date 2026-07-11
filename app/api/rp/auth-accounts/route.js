import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  ADMIN_COOKIE_NAME,
  hasStaffAccess,
} from '../../../../lib/rpAdminAuth';
import {
  canRevokeAccountSessions,
  canRevokeTargetAccount,
} from '../../../../lib/rpAccountManagementPolicy';
import { verifyActiveSessionCookie } from '../../../../lib/rpSessionAuth';
import {
  findDatabaseAuthAccountAccess,
  isDatabaseConfigured,
  listDatabaseAuthAccounts,
  revokeDatabaseAuthAccountSessions,
  updateDatabaseAuthAccountAiAccess,
} from '../../../../lib/rpDatabase';
import { getAiDailyLimitMax } from '../../../../lib/rpAiAccess';
import { buildRateLimitResponse, checkSharedRequestRateLimit } from '../../../../lib/rpRateLimit';
import {
  buildForbiddenOriginResponse,
  buildRequestTooLargeResponse,
  checkSameOriginRequest,
  checkRequestBodySize,
  REQUEST_SIZE_LIMITS,
} from '../../../../lib/rpRequestGuards';
import { recordSecurityEvent } from '../../../../lib/rpSecurityEvents';

export const dynamic = 'force-dynamic';

const ACCOUNT_READ_LIMIT = 80;
const ACCOUNT_WRITE_LIMIT = 40;
const ACCOUNT_WINDOW_MS = 10 * 60 * 1000;

function hasOwnValue(source, key) {
  return Object.prototype.hasOwnProperty.call(source || {}, key);
}

function parseAiDailyLimit(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;

  const parsed = Number(value);
  const max = getAiDailyLimitMax();

  if (!Number.isInteger(parsed) || parsed < 1) {
    const error = new Error('AI daily limit must be a positive integer.');
    error.status = 400;
    throw error;
  }

  if (parsed > max) {
    const error = new Error(`AI daily limit must be ${max} or less.`);
    error.status = 400;
    throw error;
  }

  return parsed;
}

async function requireStaffSession() {
  const cookieStore = await cookies();
  const session = await verifyActiveSessionCookie(cookieStore.get(ADMIN_COOKIE_NAME)?.value);

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

async function checkAccountLimit(request, session, action) {
  const retryAfterSeconds = await checkSharedRequestRateLimit({
    request,
    scope: `rp-auth-accounts:${action}`,
    identifier: session.sub,
    limit: action === 'write' ? ACCOUNT_WRITE_LIMIT : ACCOUNT_READ_LIMIT,
    ipLimit: action === 'write' ? ACCOUNT_WRITE_LIMIT * 2 : ACCOUNT_READ_LIMIT * 2,
    windowMs: ACCOUNT_WINDOW_MS,
  });

  return retryAfterSeconds
    ? buildRateLimitResponse(retryAfterSeconds, 'Too many account management requests. Please try again later.')
    : null;
}

export async function GET(request) {
  const { session, response } = await requireStaffSession();
  if (response) return response;

  const limited = await checkAccountLimit(request, session, 'read');
  if (limited) return limited;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({
      ok: false,
      setupRequired: true,
      error: 'DATABASE_URL or RP_DATABASE_URL is required.',
      accounts: [],
    }, { status: 503 });
  }

  const accounts = await listDatabaseAuthAccounts();
  return NextResponse.json({
    ok: true,
    accounts,
    count: accounts.length,
    permissions: {
      canRevokeSessions: canRevokeAccountSessions(session),
    },
  });
}

export async function PATCH(request) {
  const originCheck = checkSameOriginRequest(request);
  if (!originCheck.ok) return buildForbiddenOriginResponse();

  const sizeCheck = checkRequestBodySize(request, REQUEST_SIZE_LIMITS.small);
  if (!sizeCheck.ok) return buildRequestTooLargeResponse(sizeCheck.maxBytes);

  const { session, response } = await requireStaffSession();
  if (response) return response;

  const limited = await checkAccountLimit(request, session, 'write');
  if (limited) return limited;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({
      ok: false,
      setupRequired: true,
      error: 'DATABASE_URL or RP_DATABASE_URL is required.',
    }, { status: 503 });
  }

  const payload = await request.json().catch(() => ({}));
  const username = String(payload.username || '').trim();
  const hasAiApprovedUpdate = hasOwnValue(payload, 'aiApproved');
  const hasAiDailyLimitUpdate = hasOwnValue(payload, 'aiDailyLimit');
  const hasSessionRevocation = payload.revokeSessions === true;

  if (!username) {
    return NextResponse.json({ ok: false, error: 'username is required.' }, { status: 400 });
  }

  if (!hasAiApprovedUpdate && !hasAiDailyLimitUpdate && !hasSessionRevocation) {
    return NextResponse.json({ ok: false, error: 'AI access update or session revocation is required.' }, { status: 400 });
  }

  if (hasSessionRevocation && (hasAiApprovedUpdate || hasAiDailyLimitUpdate)) {
    return NextResponse.json({ ok: false, error: 'Session revocation must be requested separately.' }, { status: 400 });
  }

  if (hasSessionRevocation) {
    const targetAccount = await findDatabaseAuthAccountAccess(username);

    if (!targetAccount) {
      await recordSecurityEvent({
        request,
        eventType: 'admin.session_revoke',
        outcome: 'failure',
        actor: session.sub,
        target: username,
        metadata: { reason: 'account_not_found' },
      });
      return NextResponse.json({ ok: false, error: 'Account not found.' }, { status: 404 });
    }

    if (!canRevokeTargetAccount(session, targetAccount)) {
      await recordSecurityEvent({
        request,
        eventType: 'admin.session_revoke',
        outcome: 'forbidden',
        actor: session.sub,
        target: username,
        metadata: {
          reason: 'insufficient_role',
          actorRole: session.role,
          accountRole: targetAccount.role,
        },
      });
      return NextResponse.json({ ok: false, error: 'Session revocation permission required.' }, { status: 403 });
    }

    const account = await revokeDatabaseAuthAccountSessions(username);
    if (!account) {
      return NextResponse.json({ ok: false, error: 'Account not found.' }, { status: 404 });
    }

    const revokedCurrentSession = account.usernameKey === String(session.sub || '').trim().toLowerCase();
    await recordSecurityEvent({
      request,
      eventType: 'admin.session_revoke',
      outcome: 'success',
      actor: session.sub,
      target: username,
      metadata: {
        accountRole: account.role,
        revokedCurrentSession,
        sessionVersion: account.sessionVersion,
      },
    });

    return NextResponse.json({
      ok: true,
      sessionsRevoked: true,
      sessionRevocation: {
        username: account.username,
        name: account.name,
        role: account.role,
        roleLabel: account.roleLabel,
        sessionVersion: account.sessionVersion,
        revokedCurrentSession,
      },
    });
  }

  let updates;
  try {
    updates = {
      ...(hasAiApprovedUpdate ? { aiApproved: Boolean(payload.aiApproved) } : {}),
      ...(hasAiDailyLimitUpdate ? { aiDailyLimit: parseAiDailyLimit(payload.aiDailyLimit) } : {}),
    };
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: error.status || 400 });
  }

  const account = await updateDatabaseAuthAccountAiAccess(username, updates, session.sub);

  if (!account) {
    await recordSecurityEvent({
      request,
      eventType: 'admin.ai_access_update',
      outcome: 'failure',
      actor: session.sub,
      target: username,
      metadata: {
        reason: 'account_not_found',
        aiApproved: updates.aiApproved,
        aiDailyLimit: updates.aiDailyLimit,
        changedAiApproval: hasAiApprovedUpdate,
        changedAiDailyLimit: hasAiDailyLimitUpdate,
      },
    });
    return NextResponse.json({ ok: false, error: 'Account not found.' }, { status: 404 });
  }

  await recordSecurityEvent({
    request,
    eventType: 'admin.ai_access_update',
    outcome: hasAiApprovedUpdate ? (account.aiApproved ? 'approved' : 'revoked') : 'limit_updated',
    actor: session.sub,
    target: username,
    metadata: {
      aiApproved: account.aiApproved,
      aiDailyLimit: account.aiDailyLimit,
      accountRole: account.role,
      changedAiApproval: hasAiApprovedUpdate,
      changedAiDailyLimit: hasAiDailyLimitUpdate,
    },
  });

  return NextResponse.json({ ok: true, account });
}
