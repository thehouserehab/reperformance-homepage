# RePERFORMANCE Vercel production audit

Last checked: 2026-07-11

This records point-in-time Vercel state that was verifiable through the connected Vercel app. It is evidence for deployment/runtime status at the check time, not a substitute for the manual firewall, production database, staff-session system-status, and environment-variable checks in the campaign runbook.

## Production projects

- Team: `thehouserehab-9727s-projects`
- Team ID: `team_EfbUpj6INJBMbI08rWAvGdof`

### `reperformance-homepage.vercel.app`

- Project: `reperformance-homepage`
- Project ID: `prj_W2sXR8dobiMSH9QGksPYnwbhX03Z`
- Framework: `nextjs`
- Verified deployment ID: `dpl_5dFchdbwuHHdmnMk1u6TqmFwZAUS`
- State: `READY`
- Target: `production`
- Source: GitHub `thehouserehab/reperformance-homepage`
- Branch: `main`
- Commit: `97ee9552a4e5d07b1428d51d698ba55b0f8bc6f3`
- Commit message: `Harden production firewall readiness`
- `reperformance-homepage.vercel.app`
- `reperformance-homepage-thehouserehab-9727s-projects.vercel.app`
- `reperformance-homepage-git-main-thehouserehab-9727s-projects.vercel.app`

### `reperformance.the-house-exercise.com`

- Project: `project-7r7l8`
- Project ID: `prj_VOlVshBafX9Njmw5ZzgVDc9b2syC`
- Framework: `nextjs`
- Verified deployment ID: `dpl_38M9gJsARVxrUt1UD7p1QZ7ZVsUn`
- State: `READY`
- Target: `production`
- Source: GitHub `thehouserehab/reperformance-homepage`
- Branch: `main`
- Commit: `97ee9552a4e5d07b1428d51d698ba55b0f8bc6f3`
- Commit message: `Harden production firewall readiness`
- `reperformance.the-house-exercise.com`
- `project-7r7l8-thehouserehab-9727s-projects.vercel.app`
- `project-7r7l8-git-main-thehouserehab-9727s-projects.vercel.app`

## Runtime health

- Vercel runtime error clusters: none found for the queried 1-hour range on both production projects after the `97ee955` deployment.
- Runtime logs, recent 1-hour production `5xx` status-code grouping: no matching rows returned for project IDs `prj_W2sXR8dobiMSH9QGksPYnwbhX03Z` and `prj_VOlVshBafX9Njmw5ZzgVDc9b2syC`.
- `/`, `/services`, `/services/pe-exam`, and `/pe-exam` returned `200 OK` on both production domains after the `97ee955` deployment.
- `npm.cmd run ops:public:check` passed `456/456` public production checks after the `97ee955` deployment.
- Local `npm.cmd run ops:campaign:check`, `npm.cmd run build`, `npm.cmd run typecheck`, and `npm.cmd run ops:release:check` passed for `97ee955` before and after push as applicable.
- `/api/rp/maintenance/retention` is deployed on both projects. Unauthenticated requests should return `401`, and authenticated cron execution still requires `CRON_SECRET` or `RP_MAINTENANCE_CRON_SECRET` plus a production database URL before relying on the monthly result.

## Known gaps

- Vercel CLI is installed, but local CLI login is not currently usable in this shell session.
- Production env key presence is covered by `npm.cmd run ops:vercel:check` when `VERCEL_TOKEN` or `RP_VERCEL_TOKEN` is available. Those tokens were not available in the local shell during this audit.
- Effective production env values still require `/api/rp/system-status` with a staff session, using `RP_SYSTEM_STATUS_COOKIE` or `RP_ADMIN_SESSION_COOKIE`.
- Production migration state still requires `npm.cmd run db:migration:check` with production database access.
- Security-strict staff readiness still requires `npm.cmd run ops:status:check -- --security-strict` with a valid staff session cookie.
- Active Vercel Firewall configuration still requires the Vercel token-backed production check or manual verification against `docs/RP_VERCEL_FIREWALL_RULES.md`.
- The repository Firewall checker is now strict: partial, inactive, or log-only rules do not pass. `npm.cmd run ops:firewall:sync` provides a token-backed dry-run and an explicitly gated apply path for both production projects.
- Keep `RP_RETENTION_CRON_APPLY` disabled until backup/restore readiness and deletion approval are complete.
- `npm.cmd run ops:public:check` is the no-secret public production smoke check for page status, first-landing CTA visibility, service-choice links, PE exam search/training-management entry points, page/cache headers, hashed static asset immutable caching, response latency thresholds, unauthenticated API rejection, foreign-origin write rejection, and external management service separation after each deploy.

## Required follow-up

- Confirm production environment variables in both Vercel projects.
- Confirm firewall rules using `docs/RP_VERCEL_FIREWALL_RULES.md`.
- Verify `/api/rp/system-status` with a staff session after deploy.

## Automated Vercel check

When a Vercel token is available, run:

```powershell
$env:VERCEL_TOKEN="..."
npm.cmd run ops:vercel:check
```

For token-backed production readiness:

```powershell
npm.cmd run ops:campaign:check -- --build --typecheck --vercel
```

The check reads both default production Vercel projects, latest production deployments, production env keys, and active Firewall config. The env-key gate includes database URL, `RP_DATA_SOURCE`, runtime schema-sync disable flag, `RP_DATABASE_POOL_MAX`, auth/recovery/password secrets, SMS verification webhook, canonical site origin, `RP_RATE_LIMIT_FAIL_CLOSED`, and retention cron secret. It does not print secret values. To check a custom subset, pass `--project-id=...` or set comma-separated `RP_VERCEL_PROJECT_IDS`.

For final staff/database/security readiness when production secrets are available:

```powershell
npm.cmd run ops:campaign:check -- --database --vercel --security-strict --retention-strict
```

For public post-deploy verification without Vercel secrets:

```powershell
npm.cmd run ops:public:check
```
