import assert from 'node:assert/strict';
import {
  createAdminSession,
  verifyAdminSessionCookie,
} from '../lib/rpAdminAuth.js';
import {
  canRevokeAccountSessions,
  canRevokeTargetAccount,
} from '../lib/rpAccountManagementPolicy.js';
import { verifyActiveSessionCookie } from '../lib/rpSessionAuth.js';

process.env.RP_ADMIN_SESSION_SECRET = 'rp-session-policy-test-secret-2026-07-11-64-characters-long';
delete process.env.DATABASE_URL;
delete process.env.POSTGRES_URL;
delete process.env.RP_DATABASE_URL;
delete process.env.RP_DATA_SOURCE;

const databaseCookie = await createAdminSession({
  username: 'policy-db-user',
  name: 'Policy DB User',
  role: 'member',
  authSource: 'database',
  sessionVersion: 4,
});
const signedDatabaseSession = await verifyAdminSessionCookie(databaseCookie);
assert.equal(signedDatabaseSession?.authSource, 'database');
assert.equal(signedDatabaseSession?.sessionVersion, 4);
assert.equal(
  await verifyActiveSessionCookie(databaseCookie),
  null,
  'Database-backed sessions must fail closed when the database cannot be checked.',
);

const envCookie = await createAdminSession({
  username: 'policy-env-user',
  name: 'Policy Env User',
  role: 'member',
  authSource: 'env',
  sessionVersion: 1,
});
assert.equal(
  (await verifyActiveSessionCookie(envCookie))?.sub,
  'policy-env-user',
  'Development environment accounts should remain usable when explicitly selected.',
);

const [payload, signature] = envCookie.split('.');
const tamperedCookie = `${payload.slice(0, -1)}${payload.endsWith('A') ? 'B' : 'A'}.${signature}`;
assert.equal(await verifyAdminSessionCookie(tamperedCookie), null, 'Tampered session payloads must be rejected.');

process.env.RP_DATA_SOURCE = 'database';
const legacyCookie = await createAdminSession({
  username: 'policy-legacy-user',
  name: 'Policy Legacy User',
  role: 'member',
});
assert.equal(
  await verifyActiveSessionCookie(legacyCookie),
  null,
  'Database-only mode must reject sessions when current account state cannot be checked.',
);

delete process.env.RP_DATA_SOURCE;
const previousNodeEnv = process.env.NODE_ENV;
process.env.NODE_ENV = 'production';
const productionLegacyCookie = await createAdminSession({
  username: 'policy-production-legacy-user',
  name: 'Policy Production Legacy User',
  role: 'member',
});
assert.equal(
  await verifyActiveSessionCookie(productionLegacyCookie),
  null,
  'Production must reject legacy sessions that do not identify a revalidatable auth source.',
);

assert.equal(canRevokeAccountSessions({ role: 'owner' }), true);
assert.equal(canRevokeTargetAccount({ role: 'owner' }, { role: 'owner' }), true);
assert.equal(canRevokeTargetAccount({ role: 'admin' }, { role: 'member' }), true);
assert.equal(canRevokeTargetAccount({ role: 'admin' }, { role: 'owner' }), false);
assert.equal(canRevokeTargetAccount({ role: 'trainer' }, { role: 'member' }), false);

if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousNodeEnv;

console.log('RePERFORMANCE auth session policy check');
console.log('Summary: 12/12 session policy checks passed');
