# RePERFORMANCE Vercel production audit

Last checked: 2026-07-01

This records the live Vercel state that was verifiable through the connected Vercel app. It is evidence for deployment/runtime status, not a substitute for the manual firewall and environment-variable checks in the campaign runbook.

## Production projects

- Team: `thehouserehab-9727s-projects`
- Team ID: `team_EfbUpj6INJBMbI08rWAvGdof`

### `reperformance-homepage.vercel.app`

- Project: `reperformance-homepage`
- Project ID: `prj_W2sXR8dobiMSH9QGksPYnwbhX03Z`
- Framework: `nextjs`
- Latest deployment ID: `dpl_7SQ3VSMmS61o7NLnJ7rgo6RbvRm8`
- State: `READY`
- Target: `production`
- Source: GitHub `thehouserehab/reperformance-homepage`
- Branch: `main`
- Commit: `f41f0997735dc53966312eefa59598f3790b6ede`
- Commit message: `Add guarded retention maintenance cron`
- Region: `iad1`
- `reperformance-homepage.vercel.app`
- `reperformance-homepage-thehouserehab-9727s-projects.vercel.app`
- `reperformance-homepage-git-main-thehouserehab-9727s-projects.vercel.app`

### `reperformance.the-house-exercise.com`

- Project: `project-7r7l8`
- Project ID: `prj_VOlVshBafX9Njmw5ZzgVDc9b2syC`
- Framework: `nextjs`
- Latest deployment ID: `dpl_6qETkfFeFnStXHDKQbxc9aRjLBUd`
- State: `READY`
- Target: `production`
- Source: GitHub `thehouserehab/reperformance-homepage`
- Branch: `main`
- Commit: `f41f0997735dc53966312eefa59598f3790b6ede`
- Commit message: `Add guarded retention maintenance cron`
- Region: `iad1`
- `reperformance.the-house-exercise.com`
- `project-7r7l8-thehouserehab-9727s-projects.vercel.app`
- `project-7r7l8-git-main-thehouserehab-9727s-projects.vercel.app`

## Runtime health

- Vercel runtime error clusters: none found for the queried range.
- Runtime logs, recent 1-hour 5xx filter: no matching logs found.
- Runtime logs, recent 1-hour 429 filter: no matching logs found.
- `/pe-exam` returned `200 OK` on both production domains after the `f41f099` deployment.
- `/api/rp/maintenance/retention` is deployed on both projects. Unauthenticated requests should return `401`, and authenticated cron execution still requires `CRON_SECRET` or `RP_MAINTENANCE_CRON_SECRET` plus a production database URL before relying on the monthly result.

## Known gaps

- `CRON_SECRET` or `RP_MAINTENANCE_CRON_SECRET` must be configured in both production Vercel projects before relying on the monthly retention cron.
- Vercel CLI is installed, but local CLI login is not currently usable in this shell session.
- Production `DATABASE_URL`/`RP_DATABASE_URL`, migration state, and Firewall rules still require dashboard, REST API token, or CLI verification.
- Keep `RP_RETENTION_CRON_APPLY` disabled until backup/restore readiness and deletion approval are complete.
- `npm.cmd run ops:public:check` is the no-secret public production smoke check for page status, security headers, unauthenticated API rejection, and external management service separation after each deploy.

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

The check reads both default production Vercel projects, latest production deployments, production env keys, and active Firewall config. It does not print secret values. To check a custom subset, pass `--project-id=...` or set comma-separated `RP_VERCEL_PROJECT_IDS`.

For public post-deploy verification without Vercel secrets:

```powershell
npm.cmd run ops:public:check
```
