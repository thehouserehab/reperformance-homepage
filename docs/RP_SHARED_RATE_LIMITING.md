# RePERFORMANCE shared rate limiting

Last updated: 2026-06-30

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

The shared limiter writes fixed-window counters to `rp_rate_limit_buckets` using an atomic `INSERT ... ON CONFLICT ... DO UPDATE` query. This means multiple serverless instances see the same counters instead of each instance keeping a separate memory-only count.

If the shared limiter is unavailable, the app keeps the request flow available by falling back to the existing instance-local memory limiter.

## Production traffic guidance

The PostgreSQL limiter is a practical app-layer guard, but it still consumes app runtime and database capacity. Before a major campaign or sudden traffic surge, add an edge-layer control such as Vercel Firewall, WAF rules, or Redis/edge rate limiting for:

- `/api/auth/*`
- `/api/rp/signup`
- `/api/rp/service-application`

Use the DB limiter for correctness across app instances, and edge/WAF controls to reject abusive traffic before it reaches the app or database.

## Verification

Run:

```powershell
npm.cmd run ops:audit
npm.cmd run build
```

The readiness audit should report the shared rate limit helper, PostgreSQL bucket table, and all protected routes as configured.
