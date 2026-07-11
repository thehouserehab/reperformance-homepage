BEGIN;

ALTER TABLE rp_auth_accounts
  ADD COLUMN IF NOT EXISTS session_version BIGINT NOT NULL DEFAULT 1;

ALTER TABLE rp_auth_accounts
  ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;

UPDATE rp_auth_accounts
SET password_changed_at = COALESCE(password_changed_at, updated_at, NOW())
WHERE password_hash IS NOT NULL
  AND password_changed_at IS NULL;

COMMIT;
