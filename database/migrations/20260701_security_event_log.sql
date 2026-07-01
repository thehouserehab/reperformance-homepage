BEGIN;

CREATE TABLE IF NOT EXISTS rp_security_events (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  outcome TEXT NOT NULL,
  actor_hash TEXT,
  target_hash TEXT,
  ip_hash TEXT,
  ip_prefix TEXT,
  user_agent TEXT,
  route TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rp_security_events_created_at_idx ON rp_security_events (created_at DESC);
CREATE INDEX IF NOT EXISTS rp_security_events_event_type_idx ON rp_security_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS rp_security_events_target_hash_idx ON rp_security_events (target_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS rp_security_events_ip_hash_idx ON rp_security_events (ip_hash, created_at DESC);

COMMIT;
