import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { getPostgresConnectionOptions } from '../lib/rpPostgresSsl.js';

const remoteRequire = getPostgresConnectionOptions(
  'postgresql://user:secret@example.neon.tech/app?sslmode=require&channel_binding=require',
);
assert.equal(new URL(remoteRequire.connectionString).searchParams.get('sslmode'), 'verify-full');
assert.deepEqual(remoteRequire.ssl, { rejectUnauthorized: true });

const remoteDefault = getPostgresConnectionOptions('postgres://user:secret@example.com/app');
assert.equal(new URL(remoteDefault.connectionString).searchParams.get('sslmode'), 'verify-full');
assert.deepEqual(remoteDefault.ssl, { rejectUnauthorized: true });

const alreadyVerified = getPostgresConnectionOptions(
  'postgresql://user:secret@example.com/app?sslmode=verify-full',
);
assert.equal(new URL(alreadyVerified.connectionString).searchParams.get('sslmode'), 'verify-full');

const localhost = getPostgresConnectionOptions('postgresql://user:secret@localhost:5432/app');
assert.equal(localhost.ssl, false);

const disabledInUrl = getPostgresConnectionOptions(
  'postgresql://user:secret@example.com/app?sslmode=disable',
);
assert.equal(disabledInUrl.ssl, false);

const explicitlyDisabled = getPostgresConnectionOptions(
  'postgresql://user:secret@example.com/app?sslmode=require',
  'false',
);
assert.equal(explicitlyDisabled.ssl, false);

const filesToScan = [
  'lib/rpDatabase.js',
  'lib/rpDataRetention.mjs',
  'scripts/apply-rp-database-migration.mjs',
  'scripts/check-rp-database-migration.mjs',
];
for (const relativePath of filesToScan) {
  const source = fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
  assert.equal(
    source.includes('rejectUnauthorized: false'),
    false,
    `${relativePath} must not disable PostgreSQL certificate verification.`,
  );
}

console.log('RePERFORMANCE PostgreSQL SSL policy check');
console.log('remoteSslMode=verify-full');
console.log('certificateVerification=enabled');
console.log('localAndExplicitOptOut=preserved');
console.log('Summary: 7/7 policy checks passed');
