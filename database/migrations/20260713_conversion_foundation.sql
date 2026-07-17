BEGIN;

ALTER TABLE rp_clients ADD COLUMN IF NOT EXISTS contact_status TEXT NOT NULL DEFAULT '연락 대기';
ALTER TABLE rp_clients ADD COLUMN IF NOT EXISTS visit_status TEXT NOT NULL DEFAULT '미정';
ALTER TABLE rp_clients ADD COLUMN IF NOT EXISTS scheduled_visit_at TIMESTAMPTZ;
ALTER TABLE rp_clients ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ;
ALTER TABLE rp_clients ADD COLUMN IF NOT EXISTS next_action TEXT;
ALTER TABLE rp_clients ADD COLUMN IF NOT EXISTS next_action_at TIMESTAMPTZ;
ALTER TABLE rp_clients ADD COLUMN IF NOT EXISTS follow_up_reason TEXT;
ALTER TABLE rp_clients ADD COLUMN IF NOT EXISTS first_source TEXT;
ALTER TABLE rp_clients ADD COLUMN IF NOT EXISTS first_medium TEXT;
ALTER TABLE rp_clients ADD COLUMN IF NOT EXISTS first_campaign TEXT;
ALTER TABLE rp_clients ADD COLUMN IF NOT EXISTS first_landing_path TEXT;
ALTER TABLE rp_clients ADD COLUMN IF NOT EXISTS latest_source TEXT;
ALTER TABLE rp_clients ADD COLUMN IF NOT EXISTS latest_medium TEXT;
ALTER TABLE rp_clients ADD COLUMN IF NOT EXISTS latest_campaign TEXT;
ALTER TABLE rp_clients ADD COLUMN IF NOT EXISTS application_referrer_path TEXT;
ALTER TABLE rp_clients ADD COLUMN IF NOT EXISTS campaign_code TEXT;
ALTER TABLE rp_clients ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE rp_clients ADD COLUMN IF NOT EXISTS partner_code TEXT;
ALTER TABLE rp_clients ADD COLUMN IF NOT EXISTS qr_code TEXT;
ALTER TABLE rp_clients ADD COLUMN IF NOT EXISTS max_affiliation BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE rp_clients
SET contact_status = '연락 완료'
WHERE contact_status = '연락 대기'
  AND (
    COALESCE(status, '') LIKE '%상담 중%'
    OR COALESCE(status, '') LIKE '%등록%'
  );

CREATE TABLE IF NOT EXISTS rp_conversion_events (
  id TEXT PRIMARY KEY,
  anonymous_session_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  page_path TEXT,
  service_key TEXT,
  application_id TEXT,
  first_source TEXT,
  first_medium TEXT,
  first_campaign TEXT,
  first_landing_path TEXT,
  latest_source TEXT,
  latest_medium TEXT,
  latest_campaign TEXT,
  utm_content TEXT,
  campaign_code TEXT,
  referral_code TEXT,
  partner_code TEXT,
  qr_code TEXT,
  referrer_host TEXT,
  max_affiliation BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rp_clients_contact_status_idx ON rp_clients (contact_status, updated_at DESC);
CREATE INDEX IF NOT EXISTS rp_clients_visit_status_idx ON rp_clients (visit_status, updated_at DESC);
CREATE INDEX IF NOT EXISTS rp_clients_next_action_at_idx ON rp_clients (next_action_at) WHERE next_action_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS rp_clients_first_source_idx ON rp_clients (first_source, created_at DESC);
CREATE INDEX IF NOT EXISTS rp_conversion_events_created_at_idx ON rp_conversion_events (created_at DESC);
CREATE INDEX IF NOT EXISTS rp_conversion_events_name_created_at_idx ON rp_conversion_events (event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS rp_conversion_events_session_idx ON rp_conversion_events (anonymous_session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS rp_conversion_events_source_idx ON rp_conversion_events (latest_source, created_at DESC);

COMMIT;
