import { findAuthAccount, findAuthAccountByIdentity, hasStaffRole } from './rpAdminAuth';
import { findSheetAuthAccount, findSheetAuthAccountByIdentity } from './rpSheetAuthStore';

async function findDatabaseAuthAccountFromStore(username, password) {
  const database = await import('./rpDatabase');
  const databaseOnly = database.isDatabaseOnlyMode();
  const account = await database.findDatabaseAuthAccount(username, password).catch((error) => {
    if (databaseOnly) throw error;
    return null;
  });

  return { account, databaseOnly };
}

export async function findAuthAccountFromStores(username, password) {
  const envAccount = findAuthAccount(username, password);
  if (envAccount) return envAccount;

  const { account: databaseAccount, databaseOnly } = await findDatabaseAuthAccountFromStore(username, password);
  if (databaseAccount) return databaseAccount;
  if (databaseOnly) return null;

  return findSheetAuthAccount(username, password);
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
