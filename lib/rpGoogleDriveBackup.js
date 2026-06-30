function cleanBackupValue(value) {
  return String(value || '').trim();
}

function isDisabledFlag(value) {
  return ['0', 'false', 'no', 'off'].includes(cleanBackupValue(value).toLowerCase());
}

function isEnabledFlag(value) {
  return ['1', 'true', 'yes', 'on'].includes(cleanBackupValue(value).toLowerCase());
}

export function getBackupWebAppUrl() {
  return cleanBackupValue(
    process.env.RP_SHEETS_WEBAPP_URL ||
      process.env.RP_SIGNUP_WEBAPP_URL ||
      process.env.RP_AUTH_WEBAPP_URL,
  );
}

export function isGoogleDriveBackupEnabled() {
  const configuredValue = cleanBackupValue(
    process.env.RP_GOOGLE_DRIVE_BACKUP_ENABLED ||
      process.env.RP_SERVICE_APPLICATION_BACKUP_ENABLED,
  );

  if (configuredValue) return !isDisabledFlag(configuredValue);
  return Boolean(getBackupWebAppUrl());
}

export function getGoogleDriveBackupSkipReason() {
  if (!getBackupWebAppUrl()) return 'Google Drive backup is not configured.';
  return 'Google Drive backup is disabled.';
}

export function shouldSendGoogleDriveSecretInQuery() {
  return isEnabledFlag(process.env.RP_BACKUP_SECRET_IN_QUERY);
}

export async function callGoogleDriveBackup(action, payload) {
  const webAppUrl = getBackupWebAppUrl();
  const apiSecret = cleanBackupValue(process.env.RP_API_SECRET);

  if (!webAppUrl) throw new Error('Google Drive backup web app URL is not configured.');

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

  const response = await fetch(url.toString(), {
    method: 'POST',
    cache: 'no-store',
    redirect: 'follow',
    headers,
    body,
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
