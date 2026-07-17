# RePERFORMANCE Vercel production audit

Last checked: 2026-07-17

This document records the Vercel state verified during the repository consolidation. It is point-in-time operational evidence, not a substitute for the database, staff-session, Firewall, and migration gates in the campaign runbook.

## Production project

- Team: `thehouserehab-9727s-projects`
- Team ID: `team_EfbUpj6INJBMbI08rWAvGdof`
- Project: `reperformance-homepage`
- Project ID: `prj_VOlVshBafX9Njmw5ZzgVDc9b2syC`
- Framework: `nextjs`
- Source: GitHub `thehouserehab/reperformance-homepage`
- Branch: `main`
- Verified deployment before this consolidation commit: `dpl_8vSTa4c6KcaXDrCeyhJdD389mwfw`
- Verified Git commit before this consolidation commit: `340e9f0`
- State: `READY`
- Target: `production`

Both public domains are assigned to this one project:

- `reperformance-homepage.vercel.app`
- `reperformance.the-house-exercise.com`

The former duplicate project was removed on 2026-07-17 after its default domain was moved and both domains were verified against the canonical project. Do not create another Vercel project for this repository.

## Runtime verification

- Both `/services` URLs returned `200` from the same production deployment and exposed the same `ETag` during the consolidation check.
- Unauthenticated `/api/rp/clients` requests returned `401` on both domains.
- The local repository is linked to project ID `prj_VOlVshBafX9Njmw5ZzgVDc9b2syC`; `.vercel/` remains ignored by Git.
- A new production smoke check is required after every `main` deployment.

## Environment metadata

The production project exposed these environment-variable names at the check time; secret values were not read or printed:

- `RP_AUTH_USERS`
- `RP_MEMBERS_GID`
- `RP_API_SECRET`
- `RP_SHEETS_WEBAPP_URL`

No `DATABASE_URL`, `POSTGRES_URL`, or `RP_DATABASE_URL` key was present. Therefore PostgreSQL-backed conversion, booking, durable session revocation, and full customer workflow features are not production-ready until a managed database is configured and all migrations pass.

## Known gaps

- Configure a production PostgreSQL URL, apply every migration in `database/migrations`, and run `npm.cmd run db:migration:check`.
- Add and verify the required runtime, rate-limit, password, recovery, identity-verification, SMS delivery, canonical-origin, and retention variables checked by `npm.cmd run ops:vercel:check`, including `RP_DATABASE_POOL_MAX`, `RP_RATE_LIMIT_FAIL_CLOSED`, `RP_SMS_WEBHOOK_URL`, and `CRON_SECRET` or `RP_MAINTENANCE_CRON_SECRET`.
- Treat the historical Apps Script API secret as compromised because it existed in Git history. Rotate `RP_API_SECRET` in Apps Script Script Properties and Vercel together.
- Verify the active Vercel Firewall baseline with `npm.cmd run ops:firewall:sync` and `npm.cmd run ops:vercel:check`.
- Run `/api/rp/system-status` with a valid staff session after the database and production variables are configured.
- Keep `RP_RETENTION_CRON_APPLY` disabled until backup, restore, and deletion approval are complete.

## Verification commands

```powershell
$env:VERCEL_TOKEN="..."
npm.cmd run ops:vercel:check
npm.cmd run ops:campaign:check -- --build --typecheck --vercel
```

The Vercel check targets the canonical project by default. Use `RP_VERCEL_PROJECT_ID` or `--project-id=...` for an explicit single-project override. `RP_VERCEL_PROJECT_IDS` is retained only for exceptional multi-project audits. Secret values are never printed.

For full staff, database, and security readiness when production credentials are available:

```powershell
npm.cmd run ops:campaign:check -- --database --vercel --security-strict --retention-strict
```

For public post-deploy verification without Vercel credentials:

```powershell
npm.cmd run ops:public:check
```
