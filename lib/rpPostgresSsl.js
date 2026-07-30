function cleanValue(value) {
  return String(value || '').trim();
}

function isLocalDatabaseUrl(databaseUrl) {
  try {
    const hostname = new URL(databaseUrl).hostname.toLowerCase();
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  } catch (_) {
    const lowerUrl = databaseUrl.toLowerCase();
    return lowerUrl.includes('localhost') || lowerUrl.includes('127.0.0.1');
  }
}

function usesDisabledSsl(databaseUrl) {
  try {
    return new URL(databaseUrl).searchParams.get('sslmode')?.toLowerCase() === 'disable';
  } catch (_) {
    return databaseUrl.toLowerCase().includes('sslmode=disable');
  }
}

function requireVerifiedSsl(databaseUrl) {
  try {
    const parsed = new URL(databaseUrl);
    if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) return databaseUrl;
    parsed.searchParams.set('sslmode', 'verify-full');
    return parsed.toString();
  } catch (_) {
    return databaseUrl;
  }
}

export function getPostgresConnectionOptions(databaseUrl, sslSetting = '') {
  const connectionString = cleanValue(databaseUrl);
  const sslMode = cleanValue(sslSetting).toLowerCase();

  if (!connectionString) {
    return { connectionString, ssl: false };
  }

  if (sslMode === 'false' || usesDisabledSsl(connectionString) || isLocalDatabaseUrl(connectionString)) {
    return { connectionString, ssl: false };
  }

  return {
    connectionString: requireVerifiedSsl(connectionString),
    ssl: { rejectUnauthorized: true },
  };
}
