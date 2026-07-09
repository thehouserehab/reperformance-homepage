# RePERFORMANCE Vercel production audit

Last checked: 2026-07-09

This records point-in-time Vercel state that was verifiable through the connected Vercel app. It is evidence for deployment/runtime status at the check time, not a substitute for the manual firewall and environment-variable checks in the campaign runbook.

## Production projects

- Team: `thehouserehab-9727s-projects`
- Team ID: `team_EfbUpj6INJBMbI08rWAvGdof`

### `reperformance-homepage.vercel.app`

- Project: `reperformance-homepage`
- Project ID: `prj_W2sXR8dobiMSH9QGksPYnwbhX03Z`
- Framework: `nextjs`
- Verified deployment ID: `dpl_7xbioT6i3ejm4JRW96TsQ7ax6xeM`
- State: `READY`
- Target: `production`
- Source: GitHub `thehouserehab/reperformance-homepage`
- Branch: `main`
- Commit: `b02295a9c284b7f745b82e740dfcb501052d3c93`
- Commit message: `Report database pool readiness`
- `reperformance-homepage.vercel.app`
- `reperformance-homepage-thehouserehab-9727s-projects.vercel.app`
- `reperformance-homepage-git-main-thehouserehab-9727s-projects.vercel.app`

### `reperformance.the-house-exercise.com`

- Project: `project-7r7l8`
- Project ID: `prj_VOlVshBafX9Njmw5ZzgVDc9b2syC`
- Framework: `nextjs`
- Verified deployment ID: `dpl_BeUkknoMbNJ4Ssr4aBAi5hZ5VKQ6`
- State: `READY`
- Target: `production`
- Source: GitHub `thehouserehab/reperformance-homepage`
- Branch: `main`
- Commit: `b02295a9c284b7f745b82e740dfcb501052d3c93`
- Commit message: `Report database pool readiness`
- `reperformance.the-house-exercise.com`
- `project-7r7l8-thehouserehab-9727s-projects.vercel.app`
- `project-7r7l8-git-main-thehouserehab-9727s-projects.vercel.app`

## Runtime health

- Vercel runtime error clusters: none found for the queried range.
- Runtime logs, recent 1-hour 5xx filter: no matching logs found.
- Runtime logs, recent 1-hour 429 filter: no matching logs found.
- `/pe-exam` returned `200 OK` on both production domains after the `b02295a` deployment.
- `npm.cmd run ops:public:check` passed `386/386` public production checks after the `b02295a` deployment.
- `/api/rp/maintenance/retention` is deployed on both projects. Unauthenticated requests should return `401`, and authenticated cron execution still requires `CRON_SECRET` or `RP_MAINTENANCE_CRON_SECRET` plus a production database URL before relying on the monthly result.

## Known gaps

- Vercel CLI is installed, but local CLI login is not currently usable in this shell session.
- Production env key presence is covered by `npm.cmd run ops:vercel:check` when `VERCEL_TOKEN` or `RP_VERCEL_TOKEN` is available. Effective env values still require `/api/rp/system-status` with a staff session.
- Production migration state still requires `npm.cmd run db:migration:check` with production database access.
- Keep `RP_RETENTION_CRON_APPLY` disabled until backup/restore readiness and deletion approval are complete.
- `npm.cmd run ops:public:check` is the no-secret public production smoke check for page status, page/cache headers, hashed static asset immutable caching, response latency thresholds, unauthenticated API rejection, foreign-origin write rejection, and external management service separation after each deploy.

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

For final campaign readiness:

```powershell
npm.cmd run ops:campaign:check -- --build --typecheck --vercel
```

The check reads both default production Vercel projects, latest production deployments, production env keys, and active Firewall config. The env-key gate includes database URL, `RP_DATA_SOURCE`, runtime schema-sync disable flag, `RP_DATABASE_POOL_MAX`, auth/recovery/password secrets, SMS verification webhook, canonical site origin, `RP_RATE_LIMIT_FAIL_CLOSED`, and retention cron secret. It does not print secret values. To check a custom subset, pass `--project-id=...` or set comma-separated `RP_VERCEL_PROJECT_IDS`.

For public post-deploy verification without Vercel secrets:

```powershell
npm.cmd run ops:public:check
```
