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
- `/apply` consent language now states the exercise-safety check is not a medical diagnosis and that configured operational backup may store submitted data.
- The deprecated interactive `next lint` script was replaced with an explicit nonconfigured message, and `npm run typecheck` was added.

## Remaining Risks

- Runtime table creation still exists in request paths. Prefer formal migrations before heavier production use.
- `rp_service_applications.payload` still stores a broad application object, although input length is now limited. A stricter column-by-column schema would reduce retention surface.
- `rp_auth_accounts` still supports legacy `password_plain` fallback. Keep it only for migration and clear any remaining plain values.
- Google Drive/Sheets backup duplicates sensitive consultation data. Use it only as a transition/backup path, restrict sheet access, and define retention/deletion rules.
- The Apps Script side must be updated to prefer headers/body secrets. Query secrets should remain disabled except during temporary legacy migration.
- PE exam data freshness depends on annual KUSF/ADIGA/source refresh. Record the source year whenever generated data is updated.
- AI consult output must remain a preparation guide, not final admissions, medical, or legal advice.

## Operational Checklist

- Keep `DATABASE_URL` or `RP_DATABASE_URL` configured in production.
- Set strong `RP_ADMIN_SESSION_SECRET`, `RP_PASSWORD_HASH_SECRET`, `RP_IDENTITY_VERIFICATION_SECRET`, and `RP_ACCOUNT_RECOVERY_SECRET`.
- Keep `RP_BACKUP_SECRET_IN_QUERY=false` unless a legacy Apps Script cannot yet read headers/body.
- Use `RP_GOOGLE_DRIVE_BACKUP_ENABLED=false` if backup access or retention policy is not ready.
- Verify `/api/rp/system-status` after deploy.
- Run `npm run build` before deploy and treat `npm run lint` as intentionally unavailable until ESLint is configured.
