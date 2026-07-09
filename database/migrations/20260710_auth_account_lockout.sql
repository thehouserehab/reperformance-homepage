BEGIN;

ALTER TABLE rp_auth_accounts ADD COLUMN IF NOT EXISTS failed_login_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE rp_auth_accounts ADD COLUMN IF NOT EXISTS failed_login_window_started_at TIMESTAMPTZ;
ALTER TABLE rp_auth_accounts ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS rp_auth_accounts_locked_until_idx
  ON rp_auth_accounts (locked_until)
  WHERE locked_until IS NOT NULL;

COMMIT;
