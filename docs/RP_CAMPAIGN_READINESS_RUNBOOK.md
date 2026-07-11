# RePERFORMANCE campaign readiness runbook

Last updated: 2026-07-11

Use this before paid ads, offline events, admission season traffic, or any expected traffic spike.

For repeatable concurrent public-page validation, follow `docs/RP_TRAFFIC_LOAD_TEST.md`. The load-test command is read-only, defaults to localhost, and requires an explicit confirmation string for any remote target.

## 1. Fast local check

Run:

```powershell
npm.cmd run ops:campaign:check
```

This runs:

- `npm.cmd run ops:objective:check`
- `npm.cmd run ops:audit`
- `npm.cmd run ops:firewall:policy`
- `npm.cmd run ops:sensitive:check`
- `npm.cmd run data:retention:audit`
- `npm.cmd run pe-exam:data:readiness`
- `npm.cmd run pe-exam:data:verify`

The Objective readiness evidence report maps the active readiness work to five goal areas: customer data security, signup/login security, PE exam data maintenance, traffic surge readiness, and data scale management. It fails when local implementation evidence is missing, and it also lists the production evidence that must still be verified before the goal can be treated as complete.

The sensitive-data gate checks that public API errors use safe messages, account-recovery logs do not print raw error objects, security-event metadata drops password/secret/token/code/session fields, and retention still covers broad payloads and legacy plaintext password cleanup.

For final pre-deploy verification, run:

```powershell
npm.cmd run ops:campaign:check -- --build --typecheck --release
```

The `--release` gate runs `npm.cmd run ops:release:check`. It requires a clean local `main` branch synchronized with `origin/main`, so a campaign cannot be treated as release-ready while important homepage, security, or data-check changes are still uncommitted or unpushed.

If a production database URL is available locally, include the schema and migration gate:

```powershell
$env:DATABASE_URL="postgres://..."
npm.cmd run ops:campaign:check -- --build --typecheck --database
```

For paid traffic, admission-season campaigns, or large offline events, add the strict retention gate:

```powershell
$env:DATABASE_URL="postgres://..."
npm.cmd run ops:campaign:check -- --build --typecheck --database --retention-strict
```

`--retention-strict` requires a PostgreSQL connection, requires retention-managed tables to exist, and fails while auto-prunable retention candidates remain. Use it after backup/restore readiness is confirmed and before increasing traffic.

If `VERCEL_TOKEN` or `RP_VERCEL_TOKEN` is available, include production Vercel gates:

```powershell
npm.cmd run ops:campaign:check -- --build --typecheck --database --vercel
```

This additionally checks both production Vercel projects by default: `reperformance-homepage.vercel.app` and `reperformance.the-house-exercise.com`. It verifies latest production deployment, required production env keys, strict Firewall coverage, Bot Protection, and that each production deployment matches the current local Git `HEAD`. Firewall readiness requires active mitigation for every protected RP route and edge rate-limit coverage for abuse-sensitive public routes; inactive, partial, or log-only rules do not pass. The env-key gate includes database URL, `RP_DATA_SOURCE`, runtime schema-sync disable flag, `RP_DATABASE_POOL_MAX`, auth/recovery/password secrets, SMS verification webhook, canonical site origin, `RP_RATE_LIMIT_FAIL_CLOSED`, and retention cron secret. Secret values are not printed; effective values are verified through `/api/rp/system-status`.

After a deployment, or when no Vercel token is available, run the public production smoke and security check:

```powershell
npm.cmd run ops:public:check
```

To include it in the campaign command:

```powershell
npm.cmd run ops:campaign:check -- --public
```

The public check verifies both production URLs by default. It confirms public pages return `200`, the first landing page exposes `상담 신청하기` and `홈페이지 둘러보기`, `/services` exposes the purpose-based service choices, `/pe-exam` exposes university search and training-management entry points, security headers are present, public SSG pages are not marked `no-store`, hashed `/_next/static` assets are served with immutable public cache headers, protected APIs reject unauthenticated requests, state-changing APIs reject foreign `Origin` requests, API responses are not cached, response times stay below the configured public-check thresholds, and the external management service remains separated from the homepage.

To automate the staff-only `/api/rp/system-status` gate, provide a current staff session cookie through an environment variable. The script sends the cookie in the request header and never prints the value:

```powershell
$env:RP_SYSTEM_STATUS_COOKIE="rp_admin_session=..."
npm.cmd run ops:status:check
```

To include it in the campaign command:

```powershell
npm.cmd run ops:campaign:check -- --status
```

For paid traffic, admission-season campaigns, or abuse-sensitive windows, use security strict mode:

```powershell
$env:RP_SYSTEM_STATUS_COOKIE="rp_admin_session=..."
npm.cmd run ops:status:check -- --security-strict
npm.cmd run ops:campaign:check -- --security-strict
```

`--security-strict` includes the staff-only system-status gate and fails unless `securityMonitoring.available=true`, `securityMonitoring.status=normal`, and no security-monitoring warnings are reported.

The status check verifies `storage.postgres.configured`, `storage.postgres.runtimeSchemaSyncDisabled`, `storage.postgres.pool.max`, `storage.postgres.pool.explicitMax`, `storage.postgres.pool.validMax`, `storage.postgres.schema.allRequiredTablesPresent`, `storage.postgres.schema.allRequiredIndexesPresent`, `storage.postgres.schema.verifiedContactUniquenessReady`, `storage.postgres.schema.rateLimitBucketsReady`, `storage.postgres.schema.aiUsageBucketsReady`, `storage.postgres.schema.retentionIndexesReady`, `storage.postgres.schema.securityEventsReady`, `auth.session.ttlSeconds`, `auth.session.withinBlockingMax`, `trafficControls.sharedRateLimit`, `securityMonitoring.available`, security-event counters, abuse thresholds, `peExamData.ok`, `highTrafficReadiness.ready`, and every `objectiveReadiness.*.ready` section across the configured production URLs. In strict mode, it also requires `securityMonitoring.status=normal`.

## 2. Production gates

Do not start a high-traffic campaign until these manual gates are checked:

- Production has `DATABASE_URL`, `POSTGRES_URL`, or `RP_DATABASE_URL`.
- Production has an explicit `RP_DATABASE_POOL_MAX` reviewed against the managed PostgreSQL connection limit.
- All checked-in SQL files in `database/migrations` have been applied in production.
- If migrations have not been applied, use `npm.cmd run db:migration:apply -- --confirm=APPLY_RP_DB_MIGRATION` with `RP_DATABASE_MIGRATION_ALLOW_APPLY=true`.
- `npm.cmd run db:migration:check` passes against the production PostgreSQL database.
- After `db:migration:check` passes, set `RP_DISABLE_RUNTIME_SCHEMA_SYNC=true` for high-traffic production so request handlers do not run schema DDL during user traffic.
- Latest production deployment and runtime health have been checked against `docs/RP_VERCEL_PRODUCTION_AUDIT.md`.
- Local release state is clean before deployment: `npm.cmd run ops:release:check` passes from `main`, with no uncommitted paths and no ahead/behind drift against `origin/main`.
- Sensitive data exposure gate is clean before deployment: `npm.cmd run ops:sensitive:check` passes with no raw public-route error logging or missing public error sanitization.
- Both production Vercel projects point at the expected GitHub `main` commit. This is automated when `npm.cmd run ops:campaign:check -- --vercel` is run from the release commit.
- `npm.cmd run ops:audit` passes; this includes API route protection inventory, same-origin checks for state-changing routes, request-size checks for JSON body routes, and source-code separation from the external management service.
- `/api/rp/system-status` works with a staff session and reports PostgreSQL as configured.
- `/api/rp/system-status` reports all required PostgreSQL tables and indexes as ready, including rate-limit, AI usage, retention, and security-event indexes.
- `/api/rp/system-status` reports the PostgreSQL login lockout policy and no `auth_lockout_store_not_ready` blocker; apply `database/migrations/20260710_auth_account_lockout.sql` before campaign traffic.
- `/api/rp/system-status` reports `auth.session.withinBlockingMax=true`; keep the login session TTL at the default 14 days when possible, 30 days or less as the production recommendation, and never above the 90-day blocking maximum.
- `/api/rp/system-status` reports `securityMonitoring.available=true`; before paid or admission-season traffic, `npm.cmd run ops:campaign:check -- --security-strict` passes with a staff session cookie and `securityMonitoring.status=normal`.
- `/api/rp/system-status` reports `highTrafficReadiness.ready=true`. If false, resolve every item in `highTrafficReadiness.blockers` before increasing traffic.
- `/api/rp/system-status` reports `objectiveReadiness` for `customerDataSecurity`, `signupLoginSecurity`, `peExamDataMaintenance`, `trafficSurgeReadiness`, and `dataScaleManagement`; treat any blocker in these sections as unresolved campaign work.
- If a staff session cookie is available, `npm.cmd run ops:campaign:check -- --status` passes against the production URLs. For paid or admission-season campaigns, use `npm.cmd run ops:campaign:check -- --security-strict` instead.
- `/api/rp/clients` rejects unauthenticated requests before returning customer data.
- `/api/rp/clients` returns a bounded customer list with pagination metadata; the default page should stay at 200 rows and the request maximum at 500 rows unless a load test proves a larger value is safe. The staff customer manager should use the 더 불러오기 flow instead of one-shot full-table downloads.
- `/api/rp/auth-accounts` rejects unauthenticated requests before returning account or AI approval data.
- `/api/rp/security-events` rejects unauthenticated requests before returning audit-event summaries.
- `RP_ALLOW_ENV_AUTH_ACCOUNTS` remains unset or false unless a short emergency bootstrap window is intentionally open.
- State-changing POST APIs reject foreign `Origin`/`Referer` values; configure `NEXT_PUBLIC_SITE_URL`, `RP_SITE_URL`, or `RP_ALLOWED_ORIGINS` if trusted alternate domains are used.
- For paid campaigns or abuse-sensitive traffic windows, set `RP_RATE_LIMIT_FAIL_CLOSED=true` after the production migration check passes so shared limiter failures return temporary `429` responses instead of falling back to instance-local memory limits.
- `/api/*` responses include `Cache-Control: private, no-store, max-age=0, must-revalidate`.
- Public SSG pages are not marked `no-store`, and hashed `/_next/static` assets return `Cache-Control: public, max-age=31536000, immutable`.
- `npm.cmd run ops:public:check` passes against both production URLs after deploy.
- Google Drive/Sheets backup remains disabled unless `RP_GOOGLE_DRIVE_BACKUP_ENABLED=true`, `RP_API_SECRET`, and trusted staff-only sheet access are confirmed.
- `RP_BACKUP_SECRET_IN_QUERY` remains unset or false unless a temporary legacy Apps Script requires it.
- Outbound timeout env vars remain conservative: `RP_OUTBOUND_FETCH_TIMEOUT_MS`, `RP_GOOGLE_BACKUP_FETCH_TIMEOUT_MS`, `RP_AUTH_SCRIPT_FETCH_TIMEOUT_MS`, `RP_WEBHOOK_FETCH_TIMEOUT_MS`, and `RP_OPENAI_FETCH_TIMEOUT_MS`.
- Vercel Cron has `CRON_SECRET` or `RP_MAINTENANCE_CRON_SECRET` configured for `/api/rp/maintenance/retention`.
- Keep `RP_RETENTION_CRON_APPLY` disabled until backup/restore readiness and retention approval are confirmed.
- `npm.cmd run ops:campaign:check -- --database --retention-strict` passes against production PostgreSQL before paid or admission-season traffic.

To check Vercel directly without the full campaign command:

```powershell
$env:VERCEL_TOKEN="..."
npm.cmd run ops:vercel:check
```

To inspect and safely synchronize the repository-managed Firewall baseline:

```powershell
npm.cmd run ops:firewall:policy
$env:VERCEL_TOKEN="..."
npm.cmd run ops:firewall:sync
$env:RP_VERCEL_FIREWALL_ALLOW_APPLY="true"
npm.cmd run ops:firewall:sync -- --apply --confirm=APPLY_RP_VERCEL_FIREWALL
npm.cmd run ops:vercel:check
```

The sync command is plan-only by default. Applying requires both the opt-in environment variable and exact confirmation token. It rereads the active configuration and fails if Vercel leaves an unpublished draft; in that case review `vercel firewall diff`, run `vercel firewall publish --yes`, and rerun `ops:vercel:check`. Review Firewall events after applying, especially if a legitimate event kiosk or shared school network may send more than 120 API requests per IP per minute.

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
- `/api/rp/security-events`

Use `docs/RP_VERCEL_FIREWALL_RULES.md` as the concrete rule checklist and `npm.cmd run ops:firewall:sync` as the reproducible dry-run/apply path.

Recommended policy:

- Challenge or block obvious bot traffic and abusive IPs before it reaches the app.
- Use stricter limits on login, identity verification, signup, and account recovery.
- Keep public static PE exam pages on SSG/CDN paths.
- Watch for spikes in `429`, `401`, `403`, `413`, and `5xx`.

## 4. Data management gates

Before the campaign:

- Run `npm.cmd run db:migration:check` with a production database URL.
- Confirm `/api/rp/system-status` reports `storage.postgres.runtimeSchemaSyncDisabled=true` after migrations are applied and the production env is updated.
- Confirm `/api/rp/system-status` reports `storage.postgres.pool.explicitMax=true`, `storage.postgres.pool.validMax=true`, and a `storage.postgres.pool.max` value that fits the managed PostgreSQL plan.
- Run `npm.cmd run data:retention:audit`.
- Run `npm.cmd run ops:campaign:check -- --database --retention-strict` when preparing for paid traffic or admission-season spikes.
- Review old broad payload counts for `rp_service_applications`, `rp_pe_exam_ai_consults`, and `rp_pe_exam_questions`.
- Review old operational bucket counts for `rp_rate_limit_buckets`, `rp_ai_usage_buckets`, and `rp_security_events`.
- Review `/admin/security` for repeated login, signup, account-recovery, AI approval, and suspicious IP-prefix patterns.
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
- Keep `RP_DATABASE_POOL_MAX` aligned with the managed PostgreSQL plan. Do not increase it beyond the plan's connection budget; Vercel instances can multiply concurrent pools.

After the campaign:

- Run the retention audit again.
- Review duplicate customers by name and phone.
- Review failed signup, login, identity verification, and service application rates.
- Review `/admin/security` for campaign-period security-event spikes and repeated prefixes.

## 5. PE exam data freshness

Before admission-season traffic:

```powershell
npm.cmd run pe-exam:data:readiness
npm.cmd run pe-exam:data:refresh
```

`pe-exam:data:readiness` is the read-only first check. It summarizes source years, generated dates, row counts, system-status summary sync, and the next commands to run. `pe-exam:data:refresh` fetches all KUSF/ADIGA source snapshots and then runs freshness/source-year and university coverage gates. Use `npm.cmd run pe-exam:data:verify` when the source snapshots have already been refreshed and only the gates need to be rerun.

The `PE exam data maintenance` GitHub Actions workflow runs monthly and can also be started manually in `verify` or `refresh` mode. A refresh that changes source snapshots creates or updates a review pull request and never deploys automatically. See `docs/RP_PE_EXAM_DATA_AUTOMATION.md` for the review boundary and repository permission requirement.

After source snapshots change, run:

```powershell
npm.cmd run pe-exam:data:status
```

This updates the small `peExamSourceStatus` summary used by `/api/rp/system-status`. After deploy, verify `peExamData.ok=true` with a staff session and review any `peExamData.failures` before publishing admission-season traffic.

Publish only when:

- the freshness gate confirms generated dates, source years, and minimum row counts
- `npm.cmd run pe-exam:data:readiness` reports `ready=true`
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
