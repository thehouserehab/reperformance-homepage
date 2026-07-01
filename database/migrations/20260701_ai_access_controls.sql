BEGIN;

ALTER TABLE rp_auth_accounts ADD COLUMN IF NOT EXISTS ai_approved BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE rp_auth_accounts ADD COLUMN IF NOT EXISTS ai_approved_at TIMESTAMPTZ;
ALTER TABLE rp_auth_accounts ADD COLUMN IF NOT EXISTS ai_approved_by TEXT;
ALTER TABLE rp_auth_accounts ADD COLUMN IF NOT EXISTS ai_daily_limit INTEGER;

CREATE TABLE IF NOT EXISTS rp_ai_usage_buckets (
  subject_key TEXT NOT NULL,
  route_key TEXT NOT NULL,
  usage_date DATE NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  token_estimate INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (subject_key, route_key, usage_date)
);

CREATE INDEX IF NOT EXISTS rp_ai_usage_buckets_usage_date_idx ON rp_ai_usage_buckets (usage_date DESC);

COMMIT;
