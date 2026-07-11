import {
  areEnvironmentAuthAccountsAllowed,
  getRoleLabel,
  verifyAdminSessionCookie,
} from './rpAdminAuth.js';
import {
  findDatabaseAuthAccountAccess,
  isDatabaseAuthAccountAccessActive,
  isDatabaseConfigured,
  isDatabaseOnlyMode,
} from './rpDatabase.js';

function sessionVersion(value) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) return 1;
  return parsed;
}

export async function verifyActiveSessionCookie(cookieValue) {
  const session = await verifyAdminSessionCookie(cookieValue);
  if (!session) return null;

  const source = String(session.authSource || '').trim().toLowerCase();
  if (source === 'env' && !areEnvironmentAuthAccountsAllowed()) return null;

  const databaseConfigured = isDatabaseConfigured();
  const databaseOnly = isDatabaseOnlyMode();
  const legacySessionRequiresValidation = process.env.NODE_ENV === 'production' && !source;
  const shouldCheckDatabase = databaseConfigured
    && (databaseOnly || source === 'database' || source === '');

  if (!shouldCheckDatabase) {
    if (databaseOnly || source === 'database' || legacySessionRequiresValidation) return null;
    return session;
  }

  let account;
  try {
    account = await findDatabaseAuthAccountAccess(session.sub);
  } catch (_) {
    return databaseOnly || source === 'database' || legacySessionRequiresValidation ? null : session;
  }

  if (!account) {
    return databaseOnly || source === 'database' || legacySessionRequiresValidation ? null : session;
  }
  if (!isDatabaseAuthAccountAccessActive(account)) return null;
  if (sessionVersion(session.sessionVersion) !== sessionVersion(account.sessionVersion)) return null;

  return {
    ...session,
    name: account.name || session.name,
    role: account.role,
    roleLabel: account.roleLabel || getRoleLabel(account.role),
    authSource: 'database',
    sessionVersion: sessionVersion(account.sessionVersion),
  };
}
