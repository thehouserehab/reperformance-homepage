import { findAuthAccount, hasStaffRole } from './rpAdminAuth';
import { findSheetAuthAccount } from './rpSheetAuthStore';

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
