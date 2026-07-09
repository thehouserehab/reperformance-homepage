# RePERFORMANCE shared rate limiting

Last updated: 2026-07-10

## Current behavior

When `DATABASE_URL`, `POSTGRES_URL`, or `RP_DATABASE_URL` is configured, public abuse-sensitive routes use PostgreSQL-backed shared rate limiting before falling back to in-memory limits.

Protected flows:

- `/api/auth/login`
- `/api/admin/login`
- `/api/auth/identity-verification`
- `/api/auth/account-recovery`
- `/api/rp/signup`
- `/api/rp/service-application`
- `/api/rp/pe-exam-question`
- `/api/rp/pe-exam-ai-consult`
- `/api/rp/consultation-summary`
- `/api/rp/clients`
- `/api/rp/auth-accounts`
- `/api/rp/security-events`
- `/api/rp/system-status`

The shared limiter writes fixed-window counters to `rp_rate_limit_buckets` using an atomic `INSERT ... ON CONFLICT ... DO UPDATE` query. This means multiple serverless instances see the same counters instead of each instance keeping a separate memory-only count.

If the shared limiter is unavailable, the app keeps the request flow available by falling back to the existing instance-local memory limiter by default.

For paid campaigns, offline events, or abuse-sensitive windows, set:

```powershell
RP_RATE_LIMIT_FAIL_CLOSED=true
```

With this enabled, a PostgreSQL shared-limiter failure returns a temporary `429` instead of silently degrading to instance-local memory limits. `RP_RATE_LIMIT_FAIL_CLOSED_RETRY_SECONDS` can tune the retry window between 5 and 300 seconds; the default is 60 seconds.

## Production traffic guidance

The PostgreSQL limiter is a practical app-layer guard, but it still consumes app runtime and database capacity. Before a major campaign or sudden traffic surge, add an edge-layer control such as Vercel Firewall, WAF rules, or Redis/edge rate limiting for:

- `/api/auth/*`
- `/api/rp/signup`
- `/api/rp/service-application`
- `/api/rp/pe-exam-ai-consult`
- `/api/rp/pe-exam-question`
- `/api/rp/clients`
- `/api/rp/auth-accounts`
- `/api/rp/security-events`

Use the DB limiter for correctness across app instances, and edge/WAF controls to reject abusive traffic before it reaches the app or database.

During high-traffic campaign windows, prefer `RP_RATE_LIMIT_FAIL_CLOSED=true` after the production database migration check passes. Keep it disabled only when preserving form availability during a database incident is more important than strict abuse control.

Server-side outbound calls are also timeout-bound with `fetchWithTimeout`. Keep Google/Auth/Webhook defaults near 8 seconds and OpenAI near 25 seconds unless a campaign load test proves a larger value is necessary.

For campaign preparation, run:

```powershell
npm.cmd run ops:campaign:check -- --build --typecheck
```

The operational audit also fails if a new `app/api/**/route.js` file is not added to the protection inventory, if a state-changing route is missing same-origin protection, if a JSON body route parses `request.json()` without the request-size guard, or if source code reintroduces external management service identifiers.

Then complete the manual edge and production database gates in `docs/RP_CAMPAIGN_READINESS_RUNBOOK.md`.

After deploy, run:

```powershell
npm.cmd run ops:public:check
```

This no-secret public check now also verifies public page cache headers, hashed `/_next/static` immutable caching, and broad response-time thresholds so obvious CDN or routing regressions are caught before traffic is increased.

## Verification

Run:

```powershell
npm.cmd run ops:audit
npm.cmd run build
```

The readiness audit should report the shared rate limit helper, PostgreSQL bucket table, and all protected routes as configured.
