# RePERFORMANCE Security Event Audit Log

Last updated: 2026-07-11

## Purpose

`rp_security_events` gives the operator a minimal audit trail for sensitive account and AI-access actions without creating a new raw-PII store.

Staff can review recent event patterns at `/admin/security` or through the staff-only `/api/rp/security-events` endpoint. These views expose only event types, outcomes, routes, timestamps, short hash prefixes, and partially masked IP prefixes.

## Covered Actions

- Member login: `auth.login`
- Admin login: `auth.admin_login`
- Account lockout signals are recorded as `auth.login` or `auth.admin_login` failures with sanitized metadata such as `reason`, `failedLoginCount`, and `lockedUntil`.
- Signup: `auth.signup`
- Account recovery code request: `auth.account_recovery.request_code`
- Account recovery code verification and ID lookup: `auth.account_recovery.verify_code`, `auth.account_recovery.find_id`
- Password reset: `auth.account_recovery.reset_password`
- Admin AI access approval changes: `admin.ai_access_update`
- Admin all-session termination attempts and results: `admin.session_revoke`

## Stored Fields

- `event_type`
- `outcome`
- `actor_hash`
- `target_hash`
- `ip_hash`
- `ip_prefix`
- `user_agent`
- `route`
- `metadata`
- `created_at`

Actor, target, and IP values are HMAC-hashed with `RP_SECURITY_EVENT_SECRET` when available. If that variable is not set, the app falls back to existing strong app secrets such as `RP_ADMIN_SESSION_SECRET`, `RP_API_SECRET`, or `RP_PASSWORD_HASH_SECRET`.

## Staff Review Surface

- `/admin/security` is a staff-only admin page for recent event review.
- `/api/rp/security-events` requires a valid staff session and shared rate limiting.
- Returned rows use `actorHashPrefix`, `targetHashPrefix`, `ipHashPrefix`, and `ipPrefix`; raw actor, target, phone, email, and IP values are not returned.
- Metadata is sanitized and truncated before display so it remains useful for pattern review without becoming a second sensitive-data store.

## System Status Summary

The staff-only `/api/rp/system-status` endpoint also reports a compact `securityMonitoring` object built from `rp_security_events`.

Key fields:

- `securityMonitoring.available`: whether the summary could be loaded from PostgreSQL.
- `securityMonitoring.status`: `normal` or `review_required`.
- `securityMonitoring.authFailureCount`: recent `auth.*` failures, forbidden attempts, and rate-limited events.
- `securityMonitoring.rateLimitedCount`: recent auth events that hit app-level rate limiting.
- `securityMonitoring.topIpPrefixes`: high-volume masked IP prefixes, never raw IP addresses.
- `securityMonitoring.thresholds`: configured review thresholds.

`review_required` is an operational warning, not an automatic deployment failure in the default status check. Before paid campaigns, admission-season campaigns, or other abuse-sensitive traffic windows, run `npm.cmd run ops:status:check -- --security-strict` or `npm.cmd run ops:campaign:check -- --security-strict`; strict mode fails unless `securityMonitoring.status=normal`. Staff should review `/admin/security`, then adjust Vercel Firewall rules, rate-limit policy, or future account-lockout policy if the pattern is recurring.

## Non-Storage Rules

Do not store these values in security event metadata:

- passwords
- verification codes
- password hashes
- session cookies
- account recovery tokens
- raw phone numbers
- raw email verification tokens

The `recordSecurityEvent` helper sanitizes metadata keys matching sensitive names, and route code should still avoid passing secrets to the helper in the first place.

## Retention

`npm run data:retention:audit` includes the `oldSecurityEvents` retention item. In apply mode, it deletes `rp_security_events` rows older than the configured security-event retention window.

## Verification

Run:

```powershell
npm.cmd run ops:audit
npm.cmd run db:migration:check -- --allow-missing-database
npm.cmd run data:retention:audit
npm.cmd run ops:public:check
```

For production, run `db:migration:check` with `DATABASE_URL`, `POSTGRES_URL`, or `RP_DATABASE_URL` configured.
