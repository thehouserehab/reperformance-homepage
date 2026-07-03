import {
  findAuthAccountByIdentityFromStores,
  updateAuthAccountPasswordFromStores,
} from '../../../../lib/rpAuthStores';
import { buildRateLimitResponse, checkSharedRequestRateLimit } from '../../../../lib/rpRateLimit';
import {
  buildForbiddenOriginResponse,
  buildRequestTooLargeResponse,
  checkSameOriginRequest,
  checkRequestBodySize,
  REQUEST_SIZE_LIMITS,
} from '../../../../lib/rpRequestGuards';
import { getPublicErrorStatus, getSafePublicErrorMessage } from '../../../../lib/rpPublicErrors';
import { assertStrongProductionSecret, safeEqual } from '../../../../lib/rpSecurity';
import { recordSecurityEvent } from '../../../../lib/rpSecurityEvents';

export const dynamic = 'force-dynamic';

const CODE_TTL_SECONDS = 5 * 60;
const REQUEST_WINDOW_MS = 15 * 60 * 1000;
const PHONE_REQUEST_LIMIT = 5;
const IP_REQUEST_LIMIT = 20;
const VERIFY_WINDOW_MS = 5 * 60 * 1000;
const VERIFY_ATTEMPT_LIMIT = 8;
const MIN_PASSWORD_LENGTH = 8;
const GENERIC_REQUEST_MESSAGE = '입력한 정보와 일치하는 계정이 있으면 인증번호를 발송합니다.';

function cleanValue(value) {
  return String(value || '').trim();
}

function normalizePhone(value) {
  return cleanValue(value).replace(/\D/g, '');
}

function rateLimitResponse(retryAfterSeconds) {
  return Response.json(
    {
      ok: false,
      error: `요청이 너무 많습니다. ${Math.ceil(retryAfterSeconds / 60)}분 후 다시 시도해주세요.`,
      retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSeconds),
      },
    },
  );
}

function getRecoverySecret() {
  return assertStrongProductionSecret(
    process.env.RP_ACCOUNT_RECOVERY_SECRET ||
    process.env.RP_ADMIN_SESSION_SECRET ||
    process.env.RP_API_SECRET,
    'RP_ACCOUNT_RECOVERY_SECRET or fallback signing secret',
  );
}

function getSmsWebhookUrl() {
  return cleanValue(process.env.RP_SMS_WEBHOOK_URL || process.env.SMS_WEBHOOK_URL);
}

function getWebhookSecret() {
  return cleanValue(
    process.env.RP_IDENTITY_WEBHOOK_SECRET ||
    process.env.RP_SMS_WEBHOOK_SECRET ||
    process.env.RP_API_SECRET,
  );
}

function getPurpose(value) {
  return cleanValue(value) === 'reset-password' ? 'reset-password' : 'find-id';
}

function base64UrlEncode(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/[+]/g, '-')
    .replace(/[/]/g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(value) {
  const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  return Buffer.from(padded, 'base64').toString('utf8');
}

async function sign(value) {
  const secret = getRecoverySecret();
  if (!secret) {
    throw new Error('RP_ACCOUNT_RECOVERY_SECRET 또는 RP_ADMIN_SESSION_SECRET 환경변수가 필요합니다.');
  }

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return base64UrlEncode(Buffer.from(signature));
}

async function hashCode(code, salt) {
  return sign(`account-recovery-code:${salt}:${code}`);
}

async function createToken(payload) {
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = await sign(body);
  return `${body}.${signature}`;
}

async function verifyToken(token) {
  const [body, signature] = cleanValue(token).split('.');
  if (!body || !signature) return null;

  const expectedSignature = await sign(body);
  if (!safeEqual(signature, expectedSignature)) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(body));
    if (!payload?.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch (_) {
    return null;
  }
}

function createCode() {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return String(bytes[0] % 1000000).padStart(6, '0');
}

function maskUsername(username) {
  const value = cleanValue(username);
  if (value.length <= 2) return value;
  return `${value.slice(0, 2)}${'*'.repeat(Math.max(2, value.length - 2))}`;
}

function buildGenericRequestCodeResponse({ verificationToken = '', debugCode } = {}) {
  return Response.json({
    ok: true,
    verificationToken,
    expiresIn: CODE_TTL_SECONDS,
    sms: {
      setupRequired: false,
      message: GENERIC_REQUEST_MESSAGE,
    },
    passwordResetSupported: false,
    usernamePreview: '',
    debugCode,
  });
}

function logRecoveryEvent(request, eventType, outcome, target = '', metadata = {}) {
  return recordSecurityEvent({
    request,
    eventType,
    outcome,
    target,
    metadata,
  });
}

async function readPayload(request) {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return request.json().catch(() => ({}));

  const formData = await request.formData();
  return Object.fromEntries(formData.entries());
}

async function sendRecoveryCode({ phone, code, purpose }) {
  const webhookUrl = getSmsWebhookUrl();
  const purposeLabel = purpose === 'reset-password' ? '비밀번호 재설정' : '아이디 찾기';
  const message = `[RePERFORMANCE] 계정 ${purposeLabel} 인증번호는 ${code}입니다. ${Math.floor(CODE_TTL_SECONDS / 60)}분 안에 입력해주세요.`;

  if (!webhookUrl) {
    return {
      sent: false,
      setupRequired: true,
      message: '문자 발송 웹훅(RP_SMS_WEBHOOK_URL)이 설정되지 않았습니다.',
    };
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      method: 'phone',
      channel: 'phone',
      contact: phone,
      phone,
      to: phone,
      code,
      purpose,
      message,
      secret: getWebhookSecret(),
      source: 'reperformance-account-recovery',
    }),
  });

  if (!response.ok) {
    return {
      sent: false,
      setupRequired: false,
      message: `문자 발송 요청 실패: ${response.status}`,
    };
  }

  return { sent: true, setupRequired: false, message: '인증번호를 문자로 보냈습니다.' };
}

async function handleRequestCode(payload, request) {
  const name = cleanValue(payload.name);
  const phone = normalizePhone(payload.phone || payload.verificationContact || payload.contact);
  const purpose = getPurpose(payload.purpose);

  if (!name || !phone) {
    return Response.json({ ok: false, error: '이름과 전화번호를 입력해주세요.' }, { status: 400 });
  }

  if (phone.length < 9) {
    return Response.json({ ok: false, error: '올바른 전화번호를 입력해주세요.' }, { status: 400 });
  }

  const retryAfterSeconds = await checkSharedRequestRateLimit({
    request,
    scope: 'account-recovery-code',
    identifier: `${purpose}:${phone}`,
    limit: PHONE_REQUEST_LIMIT,
    ipLimit: IP_REQUEST_LIMIT,
    windowMs: REQUEST_WINDOW_MS,
  });
  if (retryAfterSeconds) {
    await logRecoveryEvent(request, 'auth.account_recovery.request_code', 'rate_limited', phone, { purpose, retryAfterSeconds });
    return buildRateLimitResponse(retryAfterSeconds);
  }

  const { account, source, passwordResetSupported } = await findAuthAccountByIdentityFromStores(
    name,
    phone,
    'phone',
  );

  if (!account) {
    await logRecoveryEvent(request, 'auth.account_recovery.request_code', 'failure', phone, { purpose, reason: 'account_not_found' });
    const decoyCode = createCode();
    const decoySalt = crypto.randomUUID();
    const decoyCodeHash = await hashCode(decoyCode, decoySalt);
    const decoyVerificationToken = await createToken({
      type: 'account-recovery-code',
      username: '',
      name,
      phone,
      purpose,
      source: 'decoy',
      passwordResetSupported: false,
      salt: decoySalt,
      codeHash: decoyCodeHash,
      decoy: true,
      exp: Date.now() + CODE_TTL_SECONDS * 1000,
    });
    return buildGenericRequestCodeResponse({ verificationToken: decoyVerificationToken });
  }

  const code = createCode();
  const salt = crypto.randomUUID();
  const codeHash = await hashCode(code, salt);
  const verificationToken = await createToken({
    type: 'account-recovery-code',
    username: account.username,
    name: account.name,
    phone,
    purpose,
    source,
    passwordResetSupported,
    salt,
    codeHash,
    exp: Date.now() + CODE_TTL_SECONDS * 1000,
  });
  const sms = await sendRecoveryCode({ phone, code, purpose });
  await logRecoveryEvent(request, 'auth.account_recovery.request_code', 'success', account.username, {
    purpose,
    source,
    passwordResetSupported,
    smsSent: Boolean(sms.sent),
    smsSetupRequired: Boolean(sms.setupRequired),
  });

  return buildGenericRequestCodeResponse({
    verificationToken,
    debugCode: process.env.NODE_ENV === 'production' ? undefined : code,
  });
}

async function handleVerifyCode(payload, request) {
  const verificationToken = cleanValue(payload.verificationToken);
  const code = cleanValue(payload.code);
  const purpose = getPurpose(payload.purpose);
  const verifyRetryAfter = await checkSharedRequestRateLimit({
    request,
    scope: 'account-recovery-verify',
    identifier: `${purpose}:${verificationToken.slice(0, 32)}`,
    limit: VERIFY_ATTEMPT_LIMIT,
    ipLimit: VERIFY_ATTEMPT_LIMIT,
    windowMs: VERIFY_WINDOW_MS,
  });
  if (verifyRetryAfter) {
    await logRecoveryEvent(request, 'auth.account_recovery.verify_code', 'rate_limited', '', { purpose, retryAfterSeconds: verifyRetryAfter });
    return buildRateLimitResponse(verifyRetryAfter);
  }

  const tokenPayload = await verifyToken(verificationToken);

  if (!tokenPayload || tokenPayload.type !== 'account-recovery-code' || tokenPayload.purpose !== purpose) {
    await logRecoveryEvent(request, 'auth.account_recovery.verify_code', 'failure', '', { purpose, reason: 'invalid_token' });
    return Response.json({ ok: false, error: '인증 시간이 만료되었거나 요청이 올바르지 않습니다.' }, { status: 400 });
  }

  const attemptedHash = await hashCode(code, tokenPayload.salt);
  if (!code || !safeEqual(attemptedHash, tokenPayload.codeHash) || tokenPayload.decoy) {
    await logRecoveryEvent(request, 'auth.account_recovery.verify_code', 'failure', tokenPayload.username || tokenPayload.phone || '', {
      purpose,
      reason: tokenPayload.decoy ? 'decoy_token' : 'invalid_code',
    });
    return Response.json({ ok: false, error: '인증번호가 일치하지 않습니다.' }, { status: 400 });
  }

  if (purpose === 'find-id') {
    await logRecoveryEvent(request, 'auth.account_recovery.find_id', 'success', tokenPayload.username, { source: tokenPayload.source });
    return Response.json({
      ok: true,
      username: tokenPayload.username,
      usernamePreview: maskUsername(tokenPayload.username),
      name: tokenPayload.name,
    });
  }

  const newPassword = cleanValue(payload.newPassword);
  const passwordConfirm = cleanValue(payload.passwordConfirm || payload.confirmPassword);
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    await logRecoveryEvent(request, 'auth.account_recovery.reset_password', 'failure', tokenPayload.username, { reason: 'weak_password' });
    return Response.json({ ok: false, error: `새 비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.` }, { status: 400 });
  }
  if (passwordConfirm && newPassword !== passwordConfirm) {
    await logRecoveryEvent(request, 'auth.account_recovery.reset_password', 'failure', tokenPayload.username, { reason: 'password_mismatch' });
    return Response.json({ ok: false, error: '새 비밀번호 확인이 일치하지 않습니다.' }, { status: 400 });
  }
  if (!tokenPayload.passwordResetSupported) {
    await logRecoveryEvent(request, 'auth.account_recovery.reset_password', 'failure', tokenPayload.username, { reason: 'unsupported_store' });
    return Response.json({
      ok: false,
      error: '현재 계정 저장소에서는 자동 비밀번호 변경을 지원하지 않습니다. 관리자에게 임시 비밀번호 발급을 요청해주세요.',
    }, { status: 409 });
  }

  const { account } = await updateAuthAccountPasswordFromStores(
    tokenPayload.username,
    newPassword,
    tokenPayload.source,
  );

  if (!account) {
    await logRecoveryEvent(request, 'auth.account_recovery.reset_password', 'failure', tokenPayload.username, { reason: 'update_failed' });
    return Response.json({ ok: false, error: '비밀번호를 변경하지 못했습니다.' }, { status: 500 });
  }

  await logRecoveryEvent(request, 'auth.account_recovery.reset_password', 'success', account.username, { source: tokenPayload.source });

  return Response.json({
    ok: true,
    username: account.username,
    name: account.name,
    message: '비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.',
  });
}

export async function POST(request) {
  try {
    const originCheck = checkSameOriginRequest(request);
    if (!originCheck.ok) return buildForbiddenOriginResponse();

    const sizeCheck = checkRequestBodySize(request, REQUEST_SIZE_LIMITS.small);
    if (!sizeCheck.ok) return buildRequestTooLargeResponse(sizeCheck.maxBytes);

    const payload = await readPayload(request);
    const action = cleanValue(payload.action);

    if (action === 'request-code') return handleRequestCode(payload, request);
    if (action === 'verify-code') return handleVerifyCode(payload, request);

    return Response.json({ ok: false, error: '지원하지 않는 요청입니다.' }, { status: 400 });
  } catch (error) {
    console.error('account recovery failed', error);
    return Response.json(
      { ok: false, error: getSafePublicErrorMessage(error, '계정 찾기 처리 중 오류가 발생했습니다.') },
      { status: getPublicErrorStatus(error) },
    );
  }
}
