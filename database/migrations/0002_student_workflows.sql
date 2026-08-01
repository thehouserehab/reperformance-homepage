BEGIN;

CREATE TABLE rp_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES rp_student_profiles(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('study', 'training', 'recovery')),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  detail text CHECK (char_length(detail) <= 1200),
  scheduled_at timestamptz,
  duration_minutes integer NOT NULL CHECK (duration_minutes BETWEEN 1 AND 720),
  status text NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'in_progress', 'completed', 'rescheduled', 'cancelled')),
  assigned_by_role text NOT NULL CHECK (assigned_by_role IN ('student', 'coach')),
  created_by_user_id uuid NOT NULL REFERENCES rp_users(id) ON DELETE RESTRICT,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status = 'completed' AND completed_at IS NOT NULL) OR status <> 'completed')
);

CREATE INDEX rp_tasks_student_schedule
  ON rp_tasks(student_id, scheduled_at, status);

CREATE TABLE rp_condition_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES rp_student_profiles(id) ON DELETE CASCADE,
  energy smallint NOT NULL CHECK (energy BETWEEN 1 AND 5),
  focus smallint NOT NULL CHECK (focus BETWEEN 1 AND 5),
  soreness smallint NOT NULL CHECK (soreness BETWEEN 1 AND 5),
  checked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX rp_condition_checks_student_time
  ON rp_condition_checks(student_id, checked_at DESC);

CREATE TABLE rp_study_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES rp_student_profiles(id) ON DELETE CASCADE,
  subject text NOT NULL CHECK (char_length(subject) BETWEEN 1 AND 80),
  goal text CHECK (char_length(goal) <= 300),
  focused_minutes integer NOT NULL CHECK (focused_minutes BETWEEN 0 AND 720),
  break_minutes integer NOT NULL DEFAULT 0 CHECK (break_minutes BETWEEN 0 AND 240),
  status text NOT NULL CHECK (status IN ('completed', 'stopped')),
  started_at timestamptz NOT NULL,
  completed_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (completed_at >= started_at)
);

CREATE INDEX rp_study_sessions_student_time
  ON rp_study_sessions(student_id, completed_at DESC);

CREATE TABLE rp_academic_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES rp_student_profiles(id) ON DELETE CASCADE,
  assessment_type text NOT NULL
    CHECK (assessment_type IN ('school_grade', 'mock_exam', 'csat', 'interview', 'other')),
  subject text NOT NULL CHECK (char_length(subject) BETWEEN 1 AND 80),
  score_value numeric(8, 3),
  score_band text CHECK (char_length(score_band) <= 80),
  recorded_at date NOT NULL,
  source_note text CHECK (char_length(source_note) <= 300),
  created_by_user_id uuid NOT NULL REFERENCES rp_users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (score_value IS NOT NULL OR score_band IS NOT NULL)
);

CREATE INDEX rp_academic_snapshots_student_date
  ON rp_academic_snapshots(student_id, recorded_at DESC);

CREATE TABLE rp_practical_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES rp_student_profiles(id) ON DELETE CASCADE,
  event_code text NOT NULL CHECK (char_length(event_code) BETWEEN 1 AND 80),
  value numeric(10, 3) NOT NULL,
  unit text NOT NULL CHECK (unit IN ('cm', 'm', 'sec', 'count', 'point')),
  measured_at timestamptz NOT NULL,
  measurement_protocol text CHECK (char_length(measurement_protocol) <= 500),
  verification_status text NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified', 'coach_verified', 'rejected')),
  verified_by_user_id uuid REFERENCES rp_users(id) ON DELETE SET NULL,
  verified_at timestamptz,
  created_by_user_id uuid NOT NULL REFERENCES rp_users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (verification_status = 'coach_verified' AND verified_by_user_id IS NOT NULL AND verified_at IS NOT NULL)
    OR verification_status <> 'coach_verified'
  )
);

CREATE INDEX rp_practical_records_student_event_time
  ON rp_practical_records(student_id, event_code, measured_at DESC);

CREATE TABLE rp_calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES rp_student_profiles(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  category text NOT NULL
    CHECK (category IN ('study', 'training', 'exam', 'consultation', 'recovery')),
  source text NOT NULL CHECK (source IN ('manual', 'assistant', 'coach')),
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('draft', 'scheduled', 'completed', 'cancelled')),
  note text CHECK (char_length(note) <= 1000),
  created_by_user_id uuid NOT NULL REFERENCES rp_users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);

CREATE INDEX rp_calendar_events_student_time
  ON rp_calendar_events(student_id, starts_at, status);

CREATE TABLE rp_admission_profiles (
  student_id uuid PRIMARY KEY REFERENCES rp_student_profiles(id) ON DELETE CASCADE,
  target_year smallint NOT NULL CHECK (target_year BETWEEN 2026 AND 2100),
  track text NOT NULL CHECK (track IN ('early', 'regular', 'both', 'undecided')),
  target_departments jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_by_user_id uuid NOT NULL REFERENCES rp_users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(target_departments) = 'array')
);

CREATE TABLE rp_contract_status_summaries (
  student_id uuid PRIMARY KEY REFERENCES rp_student_profiles(id) ON DELETE RESTRICT,
  product_name text CHECK (char_length(product_name) <= 120),
  session_count integer CHECK (session_count BETWEEN 1 AND 1000),
  contract_status text NOT NULL DEFAULT 'not_started'
    CHECK (contract_status IN ('not_started', 'reviewing', 'sent', 'completed', 'cancelled')),
  payment_status text NOT NULL DEFAULT 'not_started'
    CHECK (payment_status IN ('not_started', 'pending', 'partial', 'completed', 'refunded')),
  first_session_at timestamptz,
  external_ref text CHECK (char_length(external_ref) <= 240),
  updated_by_user_id uuid NOT NULL REFERENCES rp_users(id) ON DELETE RESTRICT,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE rp_contract_status_summaries IS
  'Status-only mirror. Contract and payment originals remain in Google Workspace.';

CREATE TRIGGER rp_tasks_set_updated_at
BEFORE UPDATE ON rp_tasks
FOR EACH ROW EXECUTE FUNCTION rp_set_updated_at();

CREATE TRIGGER rp_practical_records_set_updated_at
BEFORE UPDATE ON rp_practical_records
FOR EACH ROW EXECUTE FUNCTION rp_set_updated_at();

CREATE TRIGGER rp_calendar_events_set_updated_at
BEFORE UPDATE ON rp_calendar_events
FOR EACH ROW EXECUTE FUNCTION rp_set_updated_at();

CREATE TRIGGER rp_admission_profiles_set_updated_at
BEFORE UPDATE ON rp_admission_profiles
FOR EACH ROW EXECUTE FUNCTION rp_set_updated_at();

CREATE TRIGGER rp_contract_status_summaries_set_updated_at
BEFORE UPDATE ON rp_contract_status_summaries
FOR EACH ROW EXECUTE FUNCTION rp_set_updated_at();

COMMIT;
