# RePERFORMANCE application notifications

The service application API can send a server-side notification after the database transaction succeeds.

## Production environment

Set these Vercel Production environment variables:

```text
RP_APPLICATION_NOTIFICATION_WEBHOOK_URL=https://notification-provider.example/webhook
RP_APPLICATION_NOTIFICATION_WEBHOOK_SECRET=<unique random secret>
RP_APPLICATION_NOTIFICATION_TIMEOUT_MS=5000
RP_SITE_URL=https://reperformance.the-house-exercise.com
```

The webhook receives `service_application.created` JSON. It contains only the application/client IDs, service,
masked applicant name, requested visit time, and the admin URL. Phone numbers, health details, grades, and practical
test records are deliberately excluded.

When `RP_APPLICATION_NOTIFICATION_WEBHOOK_SECRET` is configured, validate the following headers with HMAC-SHA256:

```text
X-RP-Webhook-Timestamp: <unix milliseconds>
X-RP-Webhook-Signature: sha256=<hex digest of timestamp + "." + raw request body>
```

Notification delivery is non-blocking from the customer's perspective. A webhook outage must not roll back or hide a
successfully saved consultation application. Monitor failed delivery separately in the receiving service.

This integration is only for new-application alerts. It must not call or forward data to NORE.
