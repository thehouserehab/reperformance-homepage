# RePERFORMANCE Production Secret Policy

This policy applies to production environment variables used for session signing, identity verification, account recovery, and password hashing.

## Required Strength

Production signing and password-hash secrets must be:

- at least 32 characters
- unique per purpose where possible
- generated randomly by a password manager or secret generator
- free of placeholder words such as `change-this`, `changeme`, `example`, `sample`, `default`, `dummy`, or `placeholder`

The application rejects weak production secrets before signing tokens or hashing passwords.

## Covered Variables

```txt
RP_ADMIN_SESSION_SECRET
RP_PASSWORD_HASH_SECRET
RP_IDENTITY_VERIFICATION_SECRET
RP_ACCOUNT_RECOVERY_SECRET
```

Fallback secrets are checked with the same rule when they are used for signing or hashing:

```txt
RP_API_SECRET
```

## Rotation Impact

- Rotating `RP_ADMIN_SESSION_SECRET` invalidates existing login sessions.
- Rotating `RP_PASSWORD_HASH_SECRET` can prevent existing password hashes from matching unless accounts are migrated or passwords are reset.
- Rotating identity or recovery secrets invalidates outstanding verification and account-recovery tokens.

Rotate during a low-traffic maintenance window and confirm account access immediately afterward.

## Staff Verification

After updating Vercel environment variables, log in as staff and open:

```txt
/api/rp/system-status
```

The status response reports secret strength booleans without exposing secret values.
