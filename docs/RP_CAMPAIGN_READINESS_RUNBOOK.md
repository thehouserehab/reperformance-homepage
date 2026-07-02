# RePERFORMANCE campaign readiness runbook

Last updated: 2026-07-03

Use this before paid ads, offline events, admission season traffic, or any expected traffic spike.

## 1. Fast local check

Run:

```powershell
npm.cmd run ops:campaign:check
```

This runs:

- `npm.cmd run ops:audit`
- `npm.cmd run data:retention:audit`
- `npm.cmd run pe-exam:data:verify`

For final pre-deploy verification, run:

```powershell
npm.cmd run ops:campaign:check -- --build --typecheck
```

If a production database URL is available locally, include the schema and migration gate:

```powershell
$env:DATABASE_URL="postgres://..."
npm.cmd run ops:campaign:check -- --build --typecheck --database
```

If `VERCEL_TOKEN` or `RP_VERCEL_TOKEN` is available, include production Vercel gates:

```powershell
npm.cmd run ops:campaign:check -- --build --typecheck --database --vercel
```

This additionally checks both production Vercel projects by default: `reperformance-homepage.vercel.app` and `reperformance.the-house-exercise.com`. It verifies latest production deployment, required production env keys, readable Firewall configuration, and that each production deployment matches the current local Git `HEAD`.

After a deployment, or when no Vercel token is available, run the public production smoke and security check:

```powershell
npm.cmd run ops:public:check
```

To include it in the campaign command:

```powershell
npm.cmd run ops:campaign:check -- --public
```

The public check verifies both production URLs by default. It confirms public pages return `200`, security headers are present, protected APIs reject unauthenticated requests, API responses are not cached, and the external management service remains separated from the homepage.

## 2. Production gates

Do not start a high-traffic campaign until these manual gates are checked:

- Production has `DATABASE_URL`, `POSTGRES_URL`, or `RP_DATABASE_URL`.
- All checked-in SQL files in `database/migrations` have been applied in production.
- If migrations have not been applied, use `npm.cmd run db:migration:apply -- --confirm=APPLY_RP_DB_MIGRATION` with `RP_DATABASE_MIGRATION_ALLOW_APPLY=true`.
- `npm.cmd run db:migration:check` passes against the production PostgreSQL database.
- Latest production deployment and runtime health have been checked against `docs/RP_VERCEL_PRODUCTION_AUDIT.md`.
- Both production Vercel projects point at the expected GitHub `main` commit. This is automated when `npm.cmd run ops:campaign:check -- --vercel` is run from the release commit.
- `npm.cmd run ops:audit` passes; this includes API route protection inventory, same-origin checks for state-changing routes, request-size checks for JSON body routes, and source-code separation from the external management service.
- `/api/rp/system-status` works with a staff session and reports PostgreSQL as configured.
- `/api/rp/clients` rejects unauthenticated requests before returning customer data.
- `/api/rp/auth-accounts` rejects unauthenticated requests before returning account or AI approval data.
- State-changing POST APIs reject foreign `Origin`/`Referer` values; configure `NEXT_PUBLIC_SITE_URL`, `RP_SITE_URL`, or `RP_ALLOWED_ORIGINS` if trusted alternate domains are used.
- `/api/*` responses include `Cache-Control: private, no-store, max-age=0, must-revalidate`.
- `npm.cmd run ops:public:check` passes against both production URLs after deploy.
- Google Drive/Sheets backup is restricted to trusted staff, or disabled with `RP_GOOGLE_DRIVE_BACKUP_ENABLED=false`.
- `RP_BACKUP_SECRET_IN_QUERY` remains unset or false unless a temporary legacy Apps Script requires it.
- Vercel Cron has `CRON_SECRET` or `RP_MAINTENANCE_CRON_SECRET` configured for `/api/rp/maintenance/retention`.
- Keep `RP_RETENTION_CRON_APPLY` disabled until backup/restore readiness and retention approval are confirmed.

To check Vercel directly without the full campaign command:

```powershell
$env:VERCEL_TOKEN="..."
npm.cmd run ops:vercel:check
```

To check a custom subset, pass `--project-id=...` for one project or set comma-separated `RP_VERCEL_PROJECT_IDS`.

To check a custom public URL subset without Vercel secrets:

```powershell
npm.cmd run ops:public:check -- --base-urls=https://example.com,https://www.example.com
```

## 3. Edge traffic controls

The app-layer PostgreSQL limiter protects correctness across serverless instances, but it still consumes app and database capacity. Add Vercel Firewall, WAF, or equivalent edge rules before the campaign for:

- `/api/auth/*`
- `/api/rp/signup`
- `/api/rp/service-application`
- `/api/rp/pe-exam-ai-consult`
- `/api/rp/pe-exam-question`
- `/api/rp/clients`
- `/api/rp/auth-accounts`

Use `docs/RP_VERCEL_FIREWALL_RULES.md` as the concrete rule checklist.

Recommended policy:

- Challenge or block obvious bot traffic and abusive IPs before it reaches the app.
- Use stricter limits on login, identity verification, signup, and account recovery.
- Keep public static PE exam pages on SSG/CDN paths.
- Watch for spikes in `429`, `401`, `403`, `413`, and `5xx`.

## 4. Data management gates

Before the campaign:

- Run `npm.cmd run db:migration:check` with a production database URL.
- Run `npm.cmd run data:retention:audit`.
- Review old broad payload counts for `rp_service_applications`, `rp_pe_exam_ai_consults`, and `rp_pe_exam_questions`.
- Review old operational bucket counts for `rp_rate_limit_buckets`, `rp_ai_usage_buckets`, and `rp_security_events`.
- Confirm `20260702_retention_scale_indexes.sql` has been applied before retention apply mode on a large production dataset.
- Confirm the monthly retention cron is reporting candidate counts, or run the endpoint manually with `Authorization: Bearer <secret>`.
- Apply retention only after backup and restore readiness is confirmed:

```powershell
$env:RP_RETENTION_ALLOW_APPLY="true"
node scripts/audit-rp-data-retention.mjs --apply --confirm=APPLY_RP_RETENTION
```

During the campaign:

- Monitor database connection timeouts.
- Monitor backup failures if Google Drive/Sheets backup is enabled.
- Keep `RP_DATABASE_POOL_MAX` aligned with the managed PostgreSQL plan.

After the campaign:

- Run the retention audit again.
- Review duplicate customers by name and phone.
- Review failed signup, login, identity verification, and service application rates.

## 5. PE exam data freshness

Before admission-season traffic:

```powershell
npm.cmd run pe-exam:data:refresh
```

`pe-exam:data:refresh` fetches all KUSF/ADIGA source snapshots and then runs freshness/source-year and university coverage gates. Use `npm.cmd run pe-exam:data:verify` when the source snapshots have already been refreshed and only the gates need to be rerun.

Publish only when:

- the freshness gate confirms generated dates, source years, and minimum row counts
- the coverage audit has no unresolved missing universities
- manual supplemental schools are still intentional
- source year and official source limitations are understood
- pages build successfully with `npm.cmd run build`

If official KUSF or ADIGA source data is incomplete, keep affected cutoffs and records marked as official guideline checks instead of inventing numbers.

## 6. Go or no-go summary

Go only if all are true:

- automated checks pass
- production DB and migration are confirmed
- edge protection is active
- sensitive API responses are no-store
- data retention candidates are reviewed
- PE exam data coverage is current
- staff can access status and customer data, while unauthenticated requests are blocked

If any item is uncertain, delay the campaign or reduce spend until the gap is resolved.
