BEGIN;

-- Resolve duplicate verified contact groups before applying this migration to an existing database.
CREATE UNIQUE INDEX IF NOT EXISTS rp_auth_accounts_verified_contact_unique_idx
  ON rp_auth_accounts (
    LOWER(TRIM(verification_method)),
    LOWER(TRIM(verified_contact))
  )
  WHERE COALESCE(TRIM(verification_method), '') <> ''
    AND COALESCE(TRIM(verified_contact), '') <> '';

COMMIT;
