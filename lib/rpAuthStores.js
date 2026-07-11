import { findAuthAccount, findAuthAccountByIdentity, hasStaffRole } from './rpAdminAuth';
import { findSheetAuthAccount, findSheetAuthAccountByIdentity } from './rpSheetAuthStore';

async function findDatabaseAuthAccountFromStore(username, password) {
  const database = await import('./rpDatabase');
  const databaseOnly = database.isDatabaseOnlyMode();
  const result = await database.verifyDatabaseAuthAccount(username, password).catch((error) => {
    if (databaseOnly) throw error;
    return { account: null, accountFound: false, source: 'database', reason: 'database_error' };
  });

  return { ...result, databaseOnly };
}

export async function verifyAuthAccountFromStores(username, password) {
  const envAccount = findAuthAccount(username, password);
  if (envAccount) {
    return {
      account: { ...envAccount, authSource: 'env', sessionVersion: 1 },
      source: 'env',
      reason: 'success',
      accountFound: true,
    };
  }

  const databaseResult = await findDatabaseAuthAccountFromStore(username, password);
  if (databaseResult.account) return databaseResult;
  if (databaseResult.databaseOnly || databaseResult.accountFound) return databaseResult;

  const sheetAccount = await findSheetAuthAccount(username, password);
  if (sheetAccount) {
    return {
      account: { ...sheetAccount, authSource: 'sheet', sessionVersion: 1 },
      source: 'sheet',
      reason: 'success',
      accountFound: true,
    };
  }

  return {
    account: null,
    source: databaseResult.source || 'none',
    reason: databaseResult.reason || 'invalid_credentials',
    accountFound: false,
  };
}

export async function findAuthAccountFromStores(username, password) {
  const result = await verifyAuthAccountFromStores(username, password);
  return result.account;
}

export async function findAdminAccountFromStores(username, password) {
  const account = await findAuthAccountFromStores(username, password);
  return account && hasStaffRole(account.role) ? account : null;
}

export async function findAuthAccountByIdentityFromStores(name, contact, method = 'phone') {
  const envAccount = findAuthAccountByIdentity(name, contact, method);
  if (envAccount) return { account: envAccount, source: 'env', passwordResetSupported: false };

  const database = await import('./rpDatabase');
  const databaseOnly = database.isDatabaseOnlyMode();
  const databaseAccount = await database.findDatabaseAuthAccountByIdentity(name, contact, method).catch((error) => {
    if (databaseOnly) throw error;
    return null;
  });
  if (databaseAccount) return { account: databaseAccount, source: 'database', passwordResetSupported: true };
  if (databaseOnly) return { account: null, source: 'database', passwordResetSupported: false };

  const sheetAccount = await findSheetAuthAccountByIdentity(name, contact, method);
  if (sheetAccount) return { account: sheetAccount, source: 'sheet', passwordResetSupported: false };

  return { account: null, source: 'none', passwordResetSupported: false };
}

export async function updateAuthAccountPasswordFromStores(username, password, source) {
  if (source !== 'database') {
    return { account: null, passwordResetSupported: false };
  }

  const database = await import('./rpDatabase');
  const account = await database.updateDatabaseAuthAccountPassword(username, password);
  return { account, passwordResetSupported: true };
}
