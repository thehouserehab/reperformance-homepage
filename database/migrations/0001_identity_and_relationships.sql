BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION rp_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE rp_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_subject text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('invited', 'active', 'suspended', 'deleted')),
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN rp_users.auth_subject IS
  'External authentication provider subject. Passwords and provider tokens are never stored here.';

CREATE TABLE rp_user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES rp_users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('student', 'coach', 'guardian', 'admin')),
  active_from timestamptz NOT NULL DEFAULT now(),
  active_to timestamptz,
  granted_by_user_id uuid REFERENCES rp_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (active_to IS NULL OR active_to > active_from)
);

CREATE UNIQUE INDEX rp_user_roles_one_active_role
  ON rp_user_roles(user_id, role)
  WHERE active_to IS NULL;

CREATE INDEX rp_user_roles_active_lookup
  ON rp_user_roles(user_id, role, active_from, active_to);

CREATE TABLE rp_student_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES rp_users(id) ON DELETE CASCADE,
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 80),
  school_year smallint CHECK (school_year BETWEEN 1 AND 3),
  admission_track text CHECK (admission_track IN ('early', 'regular', 'undecided')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE rp_coach_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES rp_users(id) ON DELETE CASCADE,
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 80),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('pending', 'active', 'paused', 'ended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE rp_guardian_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES rp_users(id) ON DELETE CASCADE,
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 80),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE rp_coach_student_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES rp_coach_profiles(id) ON DELETE RESTRICT,
  student_id uuid NOT NULL REFERENCES rp_student_profiles(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'invited'
    CHECK (status IN ('invited', 'active', 'paused', 'ended')),
  purpose text NOT NULL DEFAULT 'pe_exam_coaching'
    CHECK (purpose IN ('pe_exam_coaching', 'performance_coaching', 'rehab_support')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_by_user_id uuid NOT NULL REFERENCES rp_users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
);

CREATE UNIQUE INDEX rp_coach_student_links_one_active
  ON rp_coach_student_links(coach_id, student_id)
  WHERE status = 'active';

CREATE INDEX rp_coach_student_links_student_status
  ON rp_coach_student_links(student_id, status);

CREATE INDEX rp_coach_student_links_coach_status
  ON rp_coach_student_links(coach_id, status);

CREATE TABLE rp_guardian_student_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guardian_id uuid NOT NULL REFERENCES rp_guardian_profiles(id) ON DELETE RESTRICT,
  student_id uuid NOT NULL REFERENCES rp_student_profiles(id) ON DELETE RESTRICT,
  relationship_label text CHECK (char_length(relationship_label) <= 40),
  status text NOT NULL DEFAULT 'invited'
    CHECK (status IN ('invited', 'active', 'paused', 'ended')),
  invited_at timestamptz NOT NULL DEFAULT now(),
  confirmed_by_student_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX rp_guardian_student_links_one_active
  ON rp_guardian_student_links(guardian_id, student_id)
  WHERE status = 'active';

CREATE INDEX rp_guardian_student_links_student_status
  ON rp_guardian_student_links(student_id, status);

CREATE TABLE rp_guardian_sharing_preferences (
  guardian_student_link_id uuid PRIMARY KEY
    REFERENCES rp_guardian_student_links(id) ON DELETE CASCADE,
  attendance boolean NOT NULL DEFAULT false,
  contract boolean NOT NULL DEFAULT false,
  academics boolean NOT NULL DEFAULT false,
  practical boolean NOT NULL DEFAULT false,
  updated_by_student_user_id uuid NOT NULL REFERENCES rp_users(id) ON DELETE RESTRICT,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER rp_users_set_updated_at
BEFORE UPDATE ON rp_users
FOR EACH ROW EXECUTE FUNCTION rp_set_updated_at();

CREATE TRIGGER rp_student_profiles_set_updated_at
BEFORE UPDATE ON rp_student_profiles
FOR EACH ROW EXECUTE FUNCTION rp_set_updated_at();

CREATE TRIGGER rp_coach_profiles_set_updated_at
BEFORE UPDATE ON rp_coach_profiles
FOR EACH ROW EXECUTE FUNCTION rp_set_updated_at();

CREATE TRIGGER rp_guardian_profiles_set_updated_at
BEFORE UPDATE ON rp_guardian_profiles
FOR EACH ROW EXECUTE FUNCTION rp_set_updated_at();

CREATE TRIGGER rp_coach_student_links_set_updated_at
BEFORE UPDATE ON rp_coach_student_links
FOR EACH ROW EXECUTE FUNCTION rp_set_updated_at();

CREATE TRIGGER rp_guardian_student_links_set_updated_at
BEFORE UPDATE ON rp_guardian_student_links
FOR EACH ROW EXECUTE FUNCTION rp_set_updated_at();

CREATE TRIGGER rp_guardian_sharing_preferences_set_updated_at
BEFORE UPDATE ON rp_guardian_sharing_preferences
FOR EACH ROW EXECUTE FUNCTION rp_set_updated_at();

COMMIT;
