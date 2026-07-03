import { fetchWithTimeout } from './rpOutboundFetch.js';

function cleanBackupValue(value) {
  return String(value || '').trim();
}

function isDisabledFlag(value) {
  return ['0', 'false', 'no', 'off'].includes(cleanBackupValue(value).toLowerCase());
}

function isEnabledFlag(value) {
  return ['1', 'true', 'yes', 'on'].includes(cleanBackupValue(value).toLowerCase());
}

function getBackupEnabledSetting() {
  return cleanBackupValue(
    process.env.RP_GOOGLE_DRIVE_BACKUP_ENABLED ||
      process.env.RP_SERVICE_APPLICATION_BACKUP_ENABLED,
  );
}

export function getBackupWebAppUrl() {
  return cleanBackupValue(
    process.env.RP_SHEETS_WEBAPP_URL ||
      process.env.RP_SIGNUP_WEBAPP_URL ||
      process.env.RP_AUTH_WEBAPP_URL,
  );
}

export function getBackupApiSecret() {
  return cleanBackupValue(process.env.RP_API_SECRET);
}

export function isGoogleDriveBackupEnabled() {
  const configuredValue = getBackupEnabledSetting();

  return Boolean(getBackupWebAppUrl() && getBackupApiSecret() && isEnabledFlag(configuredValue));
}

export function getGoogleDriveBackupSkipReason() {
  if (isGoogleDriveBackupEnabled()) return null;
  if (!getBackupWebAppUrl()) return 'Google Drive backup is not configured.';
  if (!getBackupApiSecret()) return 'Google Drive backup API secret is not configured.';
  if (!getBackupEnabledSetting()) return 'Google Drive backup requires RP_GOOGLE_DRIVE_BACKUP_ENABLED=true.';
  if (isDisabledFlag(getBackupEnabledSetting())) return 'Google Drive backup is disabled.';
  return 'Google Drive backup is disabled.';
}

export function shouldSendGoogleDriveSecretInQuery() {
  return isEnabledFlag(process.env.RP_BACKUP_SECRET_IN_QUERY);
}

export async function callGoogleDriveBackup(action, payload) {
  const webAppUrl = getBackupWebAppUrl();
  const apiSecret = getBackupApiSecret();

  if (!webAppUrl) throw new Error('Google Drive backup web app URL is not configured.');
  if (!apiSecret) throw new Error('Google Drive backup API secret is not configured.');

  const url = new URL(webAppUrl);
  url.searchParams.set('action', action);

  if (apiSecret && shouldSendGoogleDriveSecretInQuery()) {
    url.searchParams.set('secret', apiSecret);
    url.searchParams.set('apiSecret', apiSecret);
    url.searchParams.set('token', apiSecret);
  }

  const headers = { 'Content-Type': 'text/plain;charset=utf-8' };
  if (apiSecret) {
    headers['X-RP-API-Secret'] = apiSecret;
    headers.Authorization = `Bearer ${apiSecret}`;
  }

  const body = apiSecret
    ? JSON.stringify({ action, ...payload, secret: apiSecret, apiSecret, token: apiSecret })
    : JSON.stringify({ action, ...payload });

  const response = await fetchWithTimeout(url.toString(), {
    method: 'POST',
    cache: 'no-store',
    redirect: 'follow',
    headers,
    body,
  }, {
    envKey: 'RP_GOOGLE_BACKUP_FETCH_TIMEOUT_MS',
    fallbackMs: 8000,
    maxMs: 30000,
  });
  const text = await response.text();
  let data = {};

  try {
    data = JSON.parse(text);
  } catch (_) {
    data = { raw: text.slice(0, 250) };
  }

  if (!response.ok || data?.ok === false) {
    throw new Error(data?.error || `Google Drive backup failed: ${response.status}`);
  }

  return data;
}
