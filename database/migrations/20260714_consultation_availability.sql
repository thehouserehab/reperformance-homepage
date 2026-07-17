BEGIN;

CREATE TABLE IF NOT EXISTS rp_consultation_slots (
  id TEXT PRIMARY KEY,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_open BOOLEAN NOT NULL DEFAULT TRUE,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT rp_consultation_slots_valid_window CHECK (ends_at > starts_at)
);

ALTER TABLE rp_clients ADD COLUMN IF NOT EXISTS consultation_slot_id TEXT;
ALTER TABLE rp_clients ADD COLUMN IF NOT EXISTS consultation_activity_preference TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS rp_consultation_slots_starts_at_unique_idx
  ON rp_consultation_slots (starts_at);
CREATE INDEX IF NOT EXISTS rp_consultation_slots_open_starts_at_idx
  ON rp_consultation_slots (is_open, starts_at);
CREATE INDEX IF NOT EXISTS rp_clients_consultation_slot_id_idx
  ON rp_clients (consultation_slot_id)
  WHERE consultation_slot_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS rp_clients_active_consultation_slot_unique_idx
  ON rp_clients (consultation_slot_id)
  WHERE consultation_slot_id IS NOT NULL
    AND visit_status IN ('예약 승인 대기', '일정 협의 중', '방문 예약 완료', '방문 전 확인');

COMMIT;
