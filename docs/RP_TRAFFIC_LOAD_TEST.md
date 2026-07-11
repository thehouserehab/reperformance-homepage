# RePERFORMANCE Traffic Load Test

## Purpose

`ops:public:check` verifies page content, headers, authorization rejection, caching, and individual response-time limits. `ops:load:test` complements it with a bounded, read-only concurrency probe against public pages.

The script does not estimate the maximum number of real users the business can support. It provides a repeatable baseline for p50, p95, p99, requests per second, and error rate. Database-heavy authenticated flows require a separate staging environment with synthetic accounts and production-like data.

## Local baseline

Build and start the app, then run the default 90-request test:

```powershell
npm.cmd run build
npm.cmd run start -- --port 3012
npm.cmd run ops:load:test -- --base-url=http://127.0.0.1:3012
```

For a larger local-only comparison:

```powershell
npm.cmd run ops:load:test -- --base-url=http://127.0.0.1:3012 --requests=300 --concurrency=20
```

Record the machine, Node version, request count, concurrency, p95, error rate, and commit SHA. Compare like-for-like results after major routing, middleware, or data changes.

## Controlled production probe

Production execution requires an explicit confirmation string and is capped at 300 measured requests with concurrency 20:

```powershell
npm.cmd run ops:load:test -- --base-url=https://reperformance.the-house-exercise.com --requests=90 --concurrency=6 --confirm=RUN_RP_PUBLIC_LOAD_TEST
```

Run this only during an approved low-risk window. Keep Vercel logs and firewall metrics open, stop if 429/5xx responses rise, and do not repeatedly run probes to manufacture sustained traffic. The test allows public GET pages only; `/api/*` paths, cross-origin paths, and cross-origin redirects are rejected.

The default pass criteria are p95 at or below 2500ms and error rate at or below 1%. These are release guardrails, not a capacity promise. Adjust thresholds only with a documented reason.

## Before a campaign

1. Run the local baseline against the exact commit intended for deployment.
2. Complete `npm.cmd run ops:campaign:check -- --build --typecheck --release`.
3. Apply and verify database migrations, then confirm staff-only system status readiness.
4. Verify Vercel Firewall rules and database pool limits.
5. After deployment, run `npm.cmd run ops:public:check`.
6. Optionally run one controlled production probe and record its result.

Public-page success does not prove authenticated login, account recovery, AI usage, customer-list, or database write capacity. Test those flows only in a staging environment with synthetic data; never generate load using real customer records.
