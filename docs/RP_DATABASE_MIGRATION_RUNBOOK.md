# RePERFORMANCE database migration runbook

Last updated: 2026-07-09

Use this before high-traffic campaigns, production data migration, or any deploy that changes login, customer, application, PE exam AI, or rate-limit storage.

## 1. Local wiring check

Run this when a production database URL is not available on the local machine:

```powershell
npm.cmd run db:migration:check -- --allow-missing-database
```

This only confirms the script is wired. It does not verify the live database.

## 2. Production schema check

Set one database URL and run the read-only check:

```powershell
$env:DATABASE_URL="postgres://..."
npm.cmd run db:migration:check
```

The script also accepts `POSTGRES_URL` or `RP_DATABASE_URL`. It verifies:

- required tables for auth, clients, consultations, applications, PE exam records, rate-limit buckets, AI usage buckets, and security event logs
- required columns added by checked-in SQL migrations, including AI approval fields
- required indexes for customer lookup, application lookup, PE exam lookup, broad-payload retention cleanup, expired rate-limit cleanup, AI usage lookup, and security event review
- remaining legacy `password_plain` rows that already have `password_hash`
- duplicate auth verified-contact groups that must be resolved before enforcing one account per verified contact
- expired rate-limit bucket rows older than seven days
- AI usage bucket rows older than 400 days for retention review

## 3. Apply checked-in migrations

Apply all checked-in SQL migrations with the guarded script:

```powershell
$env:DATABASE_URL="postgres://..."
$env:RP_DATABASE_MIGRATION_ALLOW_APPLY="true"
npm.cmd run db:migration:apply -- --confirm=APPLY_RP_DB_MIGRATION
```

The script applies every `.sql` file in `database/migrations` in filename order, then runs `npm.cmd run db:migration:check` automatically. Current files:

```text
database/migrations/20260630_security_scale_baseline.sql
database/migrations/20260701_ai_access_controls.sql
database/migrations/20260701_security_event_log.sql
database/migrations/20260702_retention_scale_indexes.sql
database/migrations/20260703_auth_contact_uniqueness.sql
```

To inspect the migration metadata without connecting to a database:

```powershell
npm.cmd run db:migration:apply -- --plan
```

After applying it, rerun:

```powershell
npm.cmd run db:migration:check
```

Treat any failed table, column, or index check as a no-go for campaign traffic.

If `db:migration:check` reports duplicate auth verified-contact groups, resolve those rows before applying `20260703_auth_contact_uniqueness.sql`. The unique index is intentionally strict so the same verified phone, email, or Kakao contact cannot create multiple login accounts.

## 4. Disable runtime schema sync for heavy traffic

The app keeps runtime schema creation as a local/setup safety net. Before paid traffic, admission-season traffic, or any large offline event, apply the checked-in migrations and confirm:

```powershell
npm.cmd run db:migration:check
```

After that production check passes, disable request-path DDL in Vercel:

```txt
RP_DISABLE_RUNTIME_SCHEMA_SYNC=true
```

Equivalent fallback:

```txt
RP_RUNTIME_SCHEMA_SYNC=false
```

With runtime schema sync disabled, request handlers no longer run `CREATE TABLE`, `ALTER TABLE`, or `CREATE INDEX` safety-net queries. Missing schema will surface as normal database errors, so do not enable this until `db:migration:check` passes against the same production database. Staff can confirm the effective runtime mode from `/api/rp/system-status` after login: `storage.postgres.runtimeSchemaSyncDisabled` should be `true`.

## 5. Retention and legacy cleanup

After the schema is confirmed:

```powershell
npm.cmd run data:retention:audit
```

Only apply retention after backup and restore readiness are confirmed:

```powershell
$env:RP_RETENTION_ALLOW_APPLY="true"
node scripts/audit-rp-data-retention.mjs --apply --confirm=APPLY_RP_RETENTION
```

The deployed Vercel cron route `/api/rp/maintenance/retention` uses the same retention logic as the CLI and rejects unauthenticated requests before setup checks. Configure `CRON_SECRET` or `RP_MAINTENANCE_CRON_SECRET` before relying on the cron result, and keep `RP_RETENTION_CRON_APPLY` disabled until the production migration check, backup restore test, and deletion approval are complete.

The `20260702_retention_scale_indexes.sql` migration adds partial indexes for old broad JSON payload cleanup. The baseline migrations also include indexes for rate-limit expiry, AI usage dates, and security event review. Apply the migrations before running retention apply mode on a large production dataset so cleanup queries can find old rows without scanning every retained record.

If the migration check reports legacy plaintext passwords with hashes, prioritize normal login migration or an admin-approved cleanup that sets `password_plain = NULL` only after `password_hash` is confirmed.

## 6. Campaign command

When a database URL is available, include database gates in the campaign check:

```powershell
npm.cmd run ops:campaign:check -- --build --typecheck --database
```

With Vercel token access:

```powershell
$env:VERCEL_TOKEN="..."
npm.cmd run ops:campaign:check -- --build --typecheck --database --vercel
```
