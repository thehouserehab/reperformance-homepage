# RePERFORMANCE data retention operations

Last updated: 2026-07-01

## Purpose

This guide keeps sensitive customer data from growing without a review path. It focuses on broad raw payloads and temporary operational data while preserving structured columns needed for customer follow-up and service history.

## Default dry-run

Run:

```powershell
npm.cmd run data:retention:audit
```

Without a database URL, the command prints the static retention plan only. With `DATABASE_URL`, `POSTGRES_URL`, or `RP_DATABASE_URL`, it connects to PostgreSQL and reports candidate counts.

Checked areas:

- `rp_service_applications.payload`: broad consultation application payloads older than 365 days
- `rp_pe_exam_ai_consults.payload` and `conversation_record`: broad AI consult source records older than 365 days
- `rp_pe_exam_questions`: records older than 730 days for manual review
- `rp_rate_limit_buckets`: expired operational counters older than 7 days
- `rp_auth_accounts.password_plain`: legacy plaintext password fields when a hash already exists

## Apply mode

Apply mode is intentionally gated. It requires both an environment variable and a confirmation token:

```powershell
$env:RP_RETENTION_ALLOW_APPLY="true"
node scripts/audit-rp-data-retention.mjs --apply --confirm=APPLY_RP_RETENTION
```

Apply mode:

- prunes broad JSON payloads while keeping indexed columns
- deletes expired rate limit buckets
- clears `password_plain` only when `password_hash` already exists
- does not delete client profiles or PE exam question rows automatically

## Review cadence

- Monthly: run `npm.cmd run data:retention:audit`
- Quarterly: review candidate counts and apply pruning after backup/restore readiness is confirmed
- Before large campaigns: run `npm.cmd run ops:campaign:check -- --build --typecheck`

Google Drive/Sheets backups are outside this script. If backup is enabled, apply the same retention decisions to the backup sheet/drive permissions and rows.
