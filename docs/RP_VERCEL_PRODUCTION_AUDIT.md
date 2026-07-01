# RePERFORMANCE Vercel production audit

Last checked: 2026-07-01

This records the live Vercel state that was verifiable through the connected Vercel app. It is evidence for deployment/runtime status, not a substitute for the manual firewall and environment-variable checks in the campaign runbook.

## Project

- Team: `thehouserehab-9727s-projects`
- Team ID: `team_EfbUpj6INJBMbI08rWAvGdof`
- Project: `reperformance-homepage`
- Project ID: `prj_W2sXR8dobiMSH9QGksPYnwbhX03Z`
- Framework: `nextjs`
- Node runtime setting: `24.x`

## Latest production deployment

- Deployment ID: `dpl_Ep9FSBwrp2szwu6c7BZn1gywwhbb`
- State: `READY`
- Target: `production`
- Source: GitHub `thehouserehab/reperformance-homepage`
- Branch: `main`
- Commit: `02587ec59c7f23ceeaa73b9398d3dfda8c3c3945`
- Commit message: `Strengthen security and operational readiness`
- Region: `iad1`

Aliases reported by Vercel:

- `reperformance-homepage.vercel.app`
- `reperformance-homepage-thehouserehab-9727s-projects.vercel.app`
- `reperformance-homepage-git-main-thehouserehab-9727s-projects.vercel.app`

## Runtime health

- Vercel runtime error clusters: none found for the queried range.
- Runtime logs, recent 1-hour 5xx filter: no matching logs found.
- Runtime logs, recent 1-hour 429 filter: no matching logs found.

## Known gaps

- Current local security/campaign-readiness changes are not yet deployed until committed and pushed.
- The connected Vercel app tools exposed in this Codex session did not include direct environment-variable or firewall-config reads.
- Vercel CLI is installed, but local CLI login is not currently usable in this shell session.
- Production `DATABASE_URL`/`RP_DATABASE_URL`, migration state, and Firewall rules still require dashboard, REST API token, or CLI verification.

## Required follow-up

- Commit and push local readiness changes when approved.
- Verify the next production deployment points at the new commit.
- Confirm production environment variables in the Vercel dashboard.
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

The check reads the Vercel project, latest production deployment, production env keys, and active Firewall config. It does not print secret values.
