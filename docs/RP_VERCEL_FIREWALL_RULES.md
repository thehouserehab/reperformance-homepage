# RePERFORMANCE Vercel Firewall rules

Last updated: 2026-07-01

These rules are the recommended campaign and admission-season edge controls. They must be applied in Vercel Firewall, Vercel REST API, or another edge/WAF layer. They are not automatically applied by this repository.

## Baseline

- Keep Vercel DDoS protection enabled. It is platform-level and always on.
- Enable Bot Protection in log/challenge mode before paid traffic.
- Keep public static pages on SSG/CDN paths.
- Use app-layer shared PostgreSQL rate limits as the second line of defense.

## Priority 1: login and identity flows

Protect:

- `/api/auth/login`
- `/api/admin/login`
- `/api/auth/identity-verification`
- `/api/auth/account-recovery`

Suggested edge action:

- `challenge` or `deny` after repeated hits by IP
- stricter limits than public content routes
- log first for a short observation window if traffic source quality is unknown

Example custom rule shape:

```json
{
  "name": "RP login rate limit",
  "active": true,
  "conditionGroup": [
    {
      "conditions": [
        { "type": "path", "op": "inc", "value": ["/api/auth/login", "/api/admin/login"] },
        { "type": "method", "op": "eq", "value": "POST" }
      ]
    }
  ],
  "action": {
    "mitigate": {
      "action": "rate_limit",
      "rateLimit": {
        "algo": "fixed_window",
        "window": 60,
        "limit": 10,
        "keys": ["ip"],
        "action": "challenge"
      }
    }
  }
}
```

## Priority 2: signup and service applications

Protect:

- `/api/rp/signup`
- `/api/rp/service-application`

Suggested edge action:

- `challenge` suspicious high-volume clients
- `deny` clear bot floods
- watch `413`, `429`, and `5xx` after enabling

Suggested starting point:

- fixed window 20 to 40 POST requests per IP per minute
- lower during attacks
- higher only for verified event kiosks or internal networks

## Priority 3: PE exam AI and question APIs

Protect:

- `/api/rp/pe-exam-ai-consult`
- `/api/rp/pe-exam-question`

Suggested edge action:

- challenge or deny high-frequency POST requests
- keep GET history reads behind login at the app layer
- use runtime logs to watch OpenAI and DB pressure

Suggested starting point:

- fixed window 20 POST requests per IP per minute
- stricter limits during public admission campaigns

## Priority 4: staff/customer APIs

Protect:

- `/api/rp/clients`
- `/api/rp/consultation-summary`
- `/api/rp/system-status`

Suggested edge action:

- rate limit by IP even though app-layer staff session checks are required
- deny obvious scanner paths and non-browser automated probes
- do not require a custom API key header unless the frontend is updated to send it

Suggested starting point:

- fixed window 30 to 60 requests per IP per minute
- stricter for `POST /api/rp/clients`

## Scanner and bot noise

Add deny rules for common irrelevant probes:

- `/wp-admin`
- `/wp-login.php`
- `/.env`
- `/phpmyadmin`
- `/xmlrpc.php`

Challenge obvious non-browser tools when they hit dynamic or API routes:

- user agent starts with `curl/`
- user agent starts with `python-requests/`
- empty or suspicious user agent on `/api/*`

## Verification after applying rules

Run locally:

```powershell
npm.cmd run ops:campaign:check -- --build --typecheck
```

Then verify in production:

- `/api/rp/clients` returns `401` without a staff session
- `/api/rp/system-status` works with a staff session
- API responses include `Cache-Control: private, no-store, max-age=0, must-revalidate`
- Vercel Firewall events show expected challenges or denies without blocking real customers
- Runtime logs show no sustained `5xx` increase

## Notes

- Rate limiting in Vercel Firewall is an edge guard. It should reduce load before requests reach the app and database.
- The app still keeps PostgreSQL-backed shared rate limiting for correctness across serverless instances.
- During an attack, enable Attack Challenge Mode from the Vercel Firewall dashboard and temporarily lower API thresholds.
