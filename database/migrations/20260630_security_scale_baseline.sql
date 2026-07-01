BEGIN;

CREATE TABLE IF NOT EXISTS rp_auth_accounts (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  username_key TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  password_plain TEXT,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  kakao_id TEXT,
  verification_method TEXT,
  verified_contact TEXT,
  role TEXT NOT NULL DEFAULT 'member',
  role_label TEXT,
  status TEXT,
  account_status TEXT,
  approved BOOLEAN NOT NULL DEFAULT FALSE,
  ai_approved BOOLEAN NOT NULL DEFAULT FALSE,
  ai_approved_at TIMESTAMPTZ,
  ai_approved_by TEXT,
  ai_daily_limit INTEGER,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  message TEXT,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE rp_auth_accounts ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE rp_auth_accounts ADD COLUMN IF NOT EXISTS kakao_id TEXT;
ALTER TABLE rp_auth_accounts ADD COLUMN IF NOT EXISTS verification_method TEXT;
ALTER TABLE rp_auth_accounts ADD COLUMN IF NOT EXISTS verified_contact TEXT;
ALTER TABLE rp_auth_accounts ADD COLUMN IF NOT EXISTS ai_approved BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE rp_auth_accounts ADD COLUMN IF NOT EXISTS ai_approved_at TIMESTAMPTZ;
ALTER TABLE rp_auth_accounts ADD COLUMN IF NOT EXISTS ai_approved_by TEXT;
ALTER TABLE rp_auth_accounts ADD COLUMN IF NOT EXISTS ai_daily_limit INTEGER;

CREATE TABLE IF NOT EXISTS rp_clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  birth TEXT,
  gender TEXT,
  route TEXT,
  member_type TEXT,
  status TEXT,
  coach_name TEXT,
  parq_status TEXT,
  parq_yes_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  goal TEXT,
  purpose JSONB NOT NULL DEFAULT '[]'::jsonb,
  pain_areas JSONB NOT NULL DEFAULT '[]'::jsonb,
  pain_score INTEGER NOT NULL DEFAULT 0,
  concern TEXT,
  total_sessions INTEGER NOT NULL DEFAULT 0,
  remaining_sessions INTEGER NOT NULL DEFAULT 0,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rp_consultations (
  id BIGSERIAL PRIMARY KEY,
  client_id TEXT,
  client_name TEXT,
  consultation_date TEXT,
  consultation_status TEXT,
  record JSONB NOT NULL,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rp_service_applications (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  selected_service TEXT,
  service_label TEXT,
  member_type TEXT,
  status TEXT,
  parq_status TEXT,
  parq_yes_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  purpose JSONB NOT NULL DEFAULT '[]'::jsonb,
  pain_areas JSONB NOT NULL DEFAULT '[]'::jsonb,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rp_pe_exam_questions (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  member_name TEXT,
  role TEXT,
  question_type TEXT,
  admission_track TEXT,
  target_university TEXT,
  question_text TEXT NOT NULL,
  answer_status TEXT NOT NULL DEFAULT 'pending',
  source TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rp_pe_exam_ai_consults (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  member_name TEXT,
  role TEXT,
  grade_level TEXT,
  admission_track TEXT,
  target_university TEXT,
  target_university_id TEXT,
  target_university_region TEXT,
  target_university_area TEXT,
  target_university_school_type TEXT,
  target_university_slug TEXT,
  target_university_href TEXT,
  target_department TEXT,
  school_grade TEXT,
  mock_exam TEXT,
  practical_records TEXT,
  training_context TEXT,
  injury_note TEXT,
  question_focus TEXT,
  ai_status TEXT NOT NULL DEFAULT 'pending',
  source TEXT,
  consultation_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  conversation_record JSONB NOT NULL DEFAULT '{}'::jsonb,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE rp_pe_exam_ai_consults ADD COLUMN IF NOT EXISTS target_university_id TEXT;
ALTER TABLE rp_pe_exam_ai_consults ADD COLUMN IF NOT EXISTS target_university_region TEXT;
ALTER TABLE rp_pe_exam_ai_consults ADD COLUMN IF NOT EXISTS target_university_area TEXT;
ALTER TABLE rp_pe_exam_ai_consults ADD COLUMN IF NOT EXISTS target_university_school_type TEXT;
ALTER TABLE rp_pe_exam_ai_consults ADD COLUMN IF NOT EXISTS target_university_slug TEXT;
ALTER TABLE rp_pe_exam_ai_consults ADD COLUMN IF NOT EXISTS target_university_href TEXT;
ALTER TABLE rp_pe_exam_ai_consults ADD COLUMN IF NOT EXISTS consultation_summary JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE rp_pe_exam_ai_consults ADD COLUMN IF NOT EXISTS conversation_record JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS rp_rate_limit_buckets (
  rate_key TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  hit_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (rate_key, window_start)
);

CREATE TABLE IF NOT EXISTS rp_ai_usage_buckets (
  subject_key TEXT NOT NULL,
  route_key TEXT NOT NULL,
  usage_date DATE NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  token_estimate INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (subject_key, route_key, usage_date)
);

CREATE INDEX IF NOT EXISTS rp_clients_name_idx ON rp_clients (name);
CREATE INDEX IF NOT EXISTS rp_clients_phone_idx ON rp_clients (phone);
CREATE INDEX IF NOT EXISTS rp_consultations_client_id_idx ON rp_consultations (client_id);
CREATE INDEX IF NOT EXISTS rp_service_applications_client_id_idx ON rp_service_applications (client_id);
CREATE INDEX IF NOT EXISTS rp_service_applications_phone_idx ON rp_service_applications (phone);
CREATE INDEX IF NOT EXISTS rp_service_applications_created_at_idx ON rp_service_applications (created_at DESC);
CREATE INDEX IF NOT EXISTS rp_pe_exam_questions_username_idx ON rp_pe_exam_questions (username);
CREATE INDEX IF NOT EXISTS rp_pe_exam_questions_created_at_idx ON rp_pe_exam_questions (created_at DESC);
CREATE INDEX IF NOT EXISTS rp_pe_exam_ai_consults_username_idx ON rp_pe_exam_ai_consults (username);
CREATE INDEX IF NOT EXISTS rp_pe_exam_ai_consults_created_at_idx ON rp_pe_exam_ai_consults (created_at DESC);
CREATE INDEX IF NOT EXISTS rp_rate_limit_buckets_expires_at_idx ON rp_rate_limit_buckets (expires_at);
CREATE INDEX IF NOT EXISTS rp_ai_usage_buckets_usage_date_idx ON rp_ai_usage_buckets (usage_date DESC);

-- After this migration is applied, audit and clear any legacy plaintext values:
-- SELECT username, updated_at FROM rp_auth_accounts WHERE password_plain IS NOT NULL AND password_plain <> '';

COMMIT;
