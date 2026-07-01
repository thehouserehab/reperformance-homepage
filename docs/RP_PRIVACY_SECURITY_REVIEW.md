# RePERFORMANCE privacy and security review

Last updated: 2026-06-30

## Scope

This review covers the homepage customer data flow, login/session handling, service application storage, Google Drive/Sheets backup path, PE exam AI consult records, and NORE boundary wording.

It does not replace a legal privacy policy, medical disclaimer review, or database migration plan.

## Current Data Flow

- `/apply` collects consultation preparation data: name, phone, service choice, goal, pain/PAR-Q style exercise-safety checks, PE exam target inputs, and optional notes.
- `/api/rp/service-application` stores the application in PostgreSQL tables `rp_clients` and `rp_service_applications`.
- If a Google Apps Script URL is configured, the app can attempt a Google Drive/Sheets backup after the DB save.
- `/pe-exam/ai-consult` is login-gated and stores PE exam preparation inputs in `rp_pe_exam_ai_consults`.
- NORE remains the post-consultation member/student management destination. The public homepage should not present NORE as an open member-management dashboard.

## Fixes Applied

- Google Drive/Sheets backup secrets are no longer sent in URL query parameters by default.
- `RP_BACKUP_SECRET_IN_QUERY=true` is now the explicit legacy opt-in for older Apps Script deployments that only read query secrets.
- Backup requests now also send `X-RP-API-Secret` and `Authorization: Bearer ...` headers, while keeping body secrets for Apps Script compatibility.
- `RP_GOOGLE_DRIVE_BACKUP_ENABLED=false` can disable backup attempts while keeping PostgreSQL saves active.
- Public service application JSON responses no longer return the full application/client payload.
- Service application and PE exam AI consult free-text inputs are length-limited before storage/backup.
- Default login session lifetime is reduced from 90 days to 14 days, still configurable with `RP_SESSION_TTL_DAYS` or `RP_SESSION_TTL_SECONDS`.
- Login, admin login, identity verification, account recovery, signup, and service application routes now use shared PostgreSQL-backed rate limiting when the DB is configured, with in-memory fallback.
- PE exam question, PE exam AI consult, and consultation-summary routes also use shared rate limiting.
- Customer clients and system-status APIs now require a valid staff session and use shared rate limiting.
- Public and expensive POST routes reject oversized request bodies before parsing.
- Customer client writes reject oversized request bodies before parsing.
- `/api/*` responses are marked `private, no-store` with noindex headers so customer/auth data is not cached by browsers or intermediaries.
- Consultation summary generation now requires a valid staff session before any OpenAI call.
- New signup and password reset inputs require at least 8 characters.
- Session signatures, verification-code hashes, and password fallbacks now use a shared constant-time-style comparison helper.
- PostgreSQL legacy `password_plain` fallback is automatically migrated to `password_hash` and cleared after a successful login.
- Global security headers are configured in `next.config.js`.
- PE exam source data refresh is available through `npm run pe-exam:data:refresh`, followed by coverage auditing.
- Customer data retention dry-run is available through `npm run data:retention:audit`.
- `/apply` consent language now states the exercise-safety check is not a medical diagnosis and that configured operational backup may store submitted data.
- The deprecated interactive `next lint` script was replaced with an explicit nonconfigured message, and `npm run typecheck` was added.

## Remaining Risks

- Runtime table creation still exists in request paths. Prefer formal migrations before heavier production use.
- `rp_service_applications.payload` still stores a broad application object, although input length is now limited. A stricter column-by-column schema would reduce retention surface.
- `rp_auth_accounts` still supports legacy `password_plain` fallback for migration. Successful DB fallback logins now clear it automatically, but remaining rows should still be audited and cleaned.
- App-level rate limits now share `rp_rate_limit_buckets` through PostgreSQL when configured. Add Vercel Firewall or Redis/edge rate limiting before major campaigns so abusive traffic is blocked before it reaches the app and DB.
- Google Drive/Sheets backup duplicates sensitive consultation data. Use it only as a transition/backup path, restrict sheet access, and mirror the retention process in `docs/RP_DATA_RETENTION.md`.
- The Apps Script side must be updated to prefer headers/body secrets. Query secrets should remain disabled except during temporary legacy migration.
- PE exam data freshness depends on annual KUSF/ADIGA/source refresh. Record the source year whenever generated data is updated.
- AI consult output must remain a preparation guide, not final admissions, medical, or legal advice.

## Operational Checklist

- Keep `DATABASE_URL` or `RP_DATABASE_URL` configured in production.
- Apply `database/migrations/20260630_security_scale_baseline.sql` before high-traffic production use, then keep runtime schema creation as a safety net only.
- Prefer the guarded `npm run db:migration:apply -- --confirm=APPLY_RP_DB_MIGRATION` flow over manual SQL paste when applying the baseline migration.
- Set strong `RP_ADMIN_SESSION_SECRET`, `RP_PASSWORD_HASH_SECRET`, `RP_IDENTITY_VERIFICATION_SECRET`, and `RP_ACCOUNT_RECOVERY_SECRET`.
- Keep `RP_BACKUP_SECRET_IN_QUERY=false` unless a legacy Apps Script cannot yet read headers/body.
- Use `RP_GOOGLE_DRIVE_BACKUP_ENABLED=false` if backup access or retention policy is not ready.
- Run `npm run data:retention:audit` monthly and before high-traffic campaigns.
- Run `npm run db:migration:check` with a production database URL before high-traffic campaigns or migration-sensitive deploys.
- Run `npm run ops:campaign:check -- --build --typecheck` before paid ads, offline events, or admission-season traffic spikes.
- When `DATABASE_URL` and `VERCEL_TOKEN` are available, run `npm run ops:campaign:check -- --build --typecheck --database --vercel` to include database and production Vercel gates.
- Review `docs/RP_SHARED_RATE_LIMITING.md` before campaign traffic or paid advertising bursts.
- Complete the manual gates in `docs/RP_CAMPAIGN_READINESS_RUNBOOK.md`.
- Use `docs/RP_DATABASE_MIGRATION_RUNBOOK.md` for schema, index, legacy password, and retention sequencing.
- Use `docs/RP_VERCEL_FIREWALL_RULES.md` for edge rule setup and `docs/RP_VERCEL_PRODUCTION_AUDIT.md` for the latest recorded Vercel evidence.
- Verify `/api/rp/system-status` after deploy with a staff session.
- Verify `/api/rp/clients` rejects unauthenticated requests before exposing customer data.
- Run `npm run ops:audit` to confirm the repo-level security, traffic, and PE exam data readiness checks.
- Run `npm run build` before deploy and treat `npm run lint` as intentionally unavailable until ESLint is configured.
