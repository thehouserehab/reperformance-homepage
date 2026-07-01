# RePERFORMANCE database migration runbook

Last updated: 2026-07-01

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

- required tables for auth, clients, consultations, applications, PE exam records, and rate-limit buckets
- required columns added by `database/migrations/20260630_security_scale_baseline.sql`
- required indexes for customer lookup, application lookup, PE exam lookup, and expired rate-limit cleanup
- remaining legacy `password_plain` rows that already have `password_hash`
- expired rate-limit bucket rows older than seven days

## 3. Apply baseline migration

Apply this migration through the production database console or deployment migration process:

```text
database/migrations/20260630_security_scale_baseline.sql
```

After applying it, rerun:

```powershell
npm.cmd run db:migration:check
```

Treat any failed table, column, or index check as a no-go for campaign traffic.

## 4. Retention and legacy cleanup

After the schema is confirmed:

```powershell
npm.cmd run data:retention:audit
```

Only apply retention after backup and restore readiness are confirmed:

```powershell
$env:RP_RETENTION_ALLOW_APPLY="true"
node scripts/audit-rp-data-retention.mjs --apply --confirm=APPLY_RP_RETENTION
```

If the migration check reports legacy plaintext passwords with hashes, prioritize normal login migration or an admin-approved cleanup that sets `password_plain = NULL` only after `password_hash` is confirmed.

## 5. Campaign command

When a database URL is available, include database gates in the campaign check:

```powershell
npm.cmd run ops:campaign:check -- --build --typecheck --database
```

With Vercel token access:

```powershell
$env:VERCEL_TOKEN="..."
npm.cmd run ops:campaign:check -- --build --typecheck --database --vercel
```
