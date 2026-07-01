import { safeEqual } from './rpSecurity';

const CODE_TTL_SECONDS = 5 * 60;
const IDENTITY_TTL_SECONDS = 30 * 60;

const METHOD_LABELS = {
  phone: '전화번호',
  email: '이메일',
  kakao: '카카오톡',
};

function cleanValue(value) {
  return String(value || '').trim();
}

function getVerificationSecret() {
  return cleanValue(
    process.env.RP_IDENTITY_VERIFICATION_SECRET ||
    process.env.RP_ACCOUNT_RECOVERY_SECRET ||
    process.env.RP_ADMIN_SESSION_SECRET ||
    process.env.RP_API_SECRET,
  );
}

function getWebhookSecret() {
  return cleanValue(
    process.env.RP_IDENTITY_WEBHOOK_SECRET ||
    process.env.RP_SMS_WEBHOOK_SECRET ||
    process.env.RP_API_SECRET,
  );
}

function getWebhookUrl(method) {
  if (method === 'email') return cleanValue(process.env.RP_EMAIL_WEBHOOK_URL || process.env.EMAIL_WEBHOOK_URL);
  if (method === 'kakao') return cleanValue(process.env.RP_KAKAO_WEBHOOK_URL || process.env.KAKAO_WEBHOOK_URL);
  return cleanValue(process.env.RP_SMS_WEBHOOK_URL || process.env.SMS_WEBHOOK_URL);
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
  const secret = getVerificationSecret();
  if (!secret) {
    throw new Error('RP_IDENTITY_VERIFICATION_SECRET 또는 RP_ADMIN_SESSION_SECRET 환경변수가 필요합니다.');
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

async function createSignedToken(payload) {
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = await sign(body);
  return `${body}.${signature}`;
}

async function verifySignedToken(token) {
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

async function hashCode(code, salt) {
  return sign(`identity-code:${salt}:${code}`);
}

function createCode() {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return String(bytes[0] % 1000000).padStart(6, '0');
}

export function normalizeIdentityMethod(value) {
  const method = cleanValue(value).toLowerCase().replace(/[\s_-]+/g, '');
  if (method === 'email' || method === '이메일') return 'email';
  if (method === 'kakao' || method === 'kakaotalk' || method === '카카오' || method === '카카오톡') return 'kakao';
  return 'phone';
}

export function getIdentityMethodLabel(method) {
  return METHOD_LABELS[normalizeIdentityMethod(method)] || METHOD_LABELS.phone;
}

export function normalizeIdentityContact(method, value) {
  const normalizedMethod = normalizeIdentityMethod(method);
  const contact = cleanValue(value);

  if (normalizedMethod === 'phone') return contact.replace(/\D/g, '');
  if (normalizedMethod === 'email') return contact.toLowerCase();
  return contact.toLowerCase();
}

export function getIdentityContactFromPayload(payload = {}) {
  const method = normalizeIdentityMethod(payload.verificationMethod || payload.method);
  const contact =
    payload.verificationContact ||
    payload.contact ||
    (method === 'email' ? payload.email : '') ||
    (method === 'kakao' ? payload.kakaoId || payload.kakaoTalkId : '') ||
    payload.phone;

  return {
    method,
    contact: normalizeIdentityContact(method, contact),
  };
}

async function sendIdentityCode({ method, contact, code, purpose }) {
  const normalizedMethod = normalizeIdentityMethod(method);
  const label = getIdentityMethodLabel(normalizedMethod);
  const webhookUrl = getWebhookUrl(normalizedMethod);
  const purposeLabel = purpose === 'signup' ? '회원가입' : '계정 찾기';
  const message = `[RePERFORMANCE] ${purposeLabel} ${label} 인증번호는 ${code}입니다. ${Math.floor(CODE_TTL_SECONDS / 60)}분 안에 입력해주세요.`;

  if (!webhookUrl) {
    return {
      sent: false,
      setupRequired: true,
      message: `${label} 인증 발송 웹훅이 설정되지 않았습니다.`,
    };
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      method: normalizedMethod,
      channel: normalizedMethod,
      contact,
      phone: normalizedMethod === 'phone' ? contact : undefined,
      email: normalizedMethod === 'email' ? contact : undefined,
      kakaoId: normalizedMethod === 'kakao' ? contact : undefined,
      to: contact,
      code,
      purpose,
      message,
      secret: getWebhookSecret(),
      source: 'reperformance-identity-verification',
    }),
  });

  if (!response.ok) {
    return {
      sent: false,
      setupRequired: false,
      message: `${label} 인증번호 발송 요청 실패: ${response.status}`,
    };
  }

  return { sent: true, setupRequired: false, message: `${label}로 인증번호를 보냈습니다.` };
}

export async function requestIdentityCode(payload = {}) {
  const { method, contact } = getIdentityContactFromPayload(payload);
  const purpose = cleanValue(payload.purpose) || 'signup';

  if (!contact) throw new Error(`${getIdentityMethodLabel(method)} 정보를 입력해주세요.`);
  if (method === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) {
    throw new Error('올바른 이메일 주소를 입력해주세요.');
  }
  if (method === 'phone' && contact.length < 9) {
    throw new Error('올바른 전화번호를 입력해주세요.');
  }

  const code = createCode();
  const salt = crypto.randomUUID();
  const verificationToken = await createSignedToken({
    type: 'identity-code',
    method,
    contact,
    purpose,
    salt,
    codeHash: await hashCode(code, salt),
    exp: Date.now() + CODE_TTL_SECONDS * 1000,
  });
  const delivery = await sendIdentityCode({ method, contact, code, purpose });

  return {
    verificationToken,
    expiresIn: CODE_TTL_SECONDS,
    delivery,
    debugCode: process.env.NODE_ENV === 'production' ? undefined : code,
  };
}

export async function verifyIdentityCode(payload = {}) {
  const tokenPayload = await verifySignedToken(payload.verificationToken);
  const code = cleanValue(payload.code);
  const purpose = cleanValue(payload.purpose) || 'signup';

  if (!tokenPayload || tokenPayload.type !== 'identity-code' || tokenPayload.purpose !== purpose) {
    throw new Error('인증 시간이 만료되었거나 요청이 올바르지 않습니다.');
  }

  const attemptedHash = await hashCode(code, tokenPayload.salt);
  if (!code || !safeEqual(attemptedHash, tokenPayload.codeHash)) {
    throw new Error('인증번호가 일치하지 않습니다.');
  }

  const identityToken = await createSignedToken({
    type: 'identity-verification',
    method: tokenPayload.method,
    contact: tokenPayload.contact,
    purpose,
    verifiedAt: new Date().toISOString(),
    exp: Date.now() + IDENTITY_TTL_SECONDS * 1000,
  });

  return {
    identityToken,
    method: tokenPayload.method,
    contact: tokenPayload.contact,
    expiresIn: IDENTITY_TTL_SECONDS,
  };
}

export async function verifyIdentityToken(token, expectedPurpose = 'signup') {
  const payload = await verifySignedToken(token);
  if (!payload || payload.type !== 'identity-verification') return null;
  if (expectedPurpose && payload.purpose !== expectedPurpose) return null;
  return payload;
}
