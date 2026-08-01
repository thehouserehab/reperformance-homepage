BEGIN;

CREATE TABLE rp_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('student_coach', 'guardian_coach')),
  student_id uuid NOT NULL REFERENCES rp_student_profiles(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'closed')),
  created_by_user_id uuid NOT NULL REFERENCES rp_users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX rp_conversations_student_status
  ON rp_conversations(student_id, status);

CREATE TABLE rp_conversation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES rp_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES rp_users(id) ON DELETE RESTRICT,
  participant_role text NOT NULL CHECK (participant_role IN ('student', 'coach', 'guardian')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz,
  CHECK (left_at IS NULL OR left_at > joined_at)
);

CREATE UNIQUE INDEX rp_conversation_participants_one_active
  ON rp_conversation_participants(conversation_id, user_id)
  WHERE left_at IS NULL;

CREATE INDEX rp_conversation_participants_user_active
  ON rp_conversation_participants(user_id, conversation_id)
  WHERE left_at IS NULL;

CREATE TABLE rp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES rp_conversations(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL REFERENCES rp_users(id) ON DELETE RESTRICT,
  client_message_id uuid NOT NULL,
  body_ciphertext bytea NOT NULL,
  encryption_key_version smallint NOT NULL CHECK (encryption_key_version >= 1),
  ai_assisted boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'redacted')),
  sent_at timestamptz NOT NULL DEFAULT now(),
  redacted_at timestamptz,
  UNIQUE (sender_user_id, client_message_id),
  CHECK ((status = 'redacted' AND redacted_at IS NOT NULL) OR status <> 'redacted')
);

CREATE INDEX rp_messages_conversation_time
  ON rp_messages(conversation_id, sent_at DESC);

CREATE TABLE rp_message_receipts (
  message_id uuid NOT NULL REFERENCES rp_messages(id) ON DELETE CASCADE,
  recipient_user_id uuid NOT NULL REFERENCES rp_users(id) ON DELETE RESTRICT,
  delivered_at timestamptz,
  read_at timestamptz,
  PRIMARY KEY (message_id, recipient_user_id),
  CHECK (read_at IS NULL OR delivered_at IS NULL OR read_at >= delivered_at)
);

CREATE INDEX rp_message_receipts_unread
  ON rp_message_receipts(recipient_user_id, message_id)
  WHERE read_at IS NULL;

CREATE TABLE rp_ai_access_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES rp_users(id) ON DELETE CASCADE,
  feature text NOT NULL
    CHECK (feature IN ('calendar_draft', 'message_draft', 'admission', 'training', 'nutrition', 'wellbeing', 'posture')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'suspended', 'revoked')),
  daily_request_limit integer NOT NULL DEFAULT 0 CHECK (daily_request_limit BETWEEN 0 AND 1000),
  approved_by_user_id uuid REFERENCES rp_users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, feature),
  CHECK (
    (status = 'approved' AND approved_by_user_id IS NOT NULL AND approved_at IS NOT NULL)
    OR status <> 'approved'
  ),
  CHECK (expires_at IS NULL OR approved_at IS NULL OR expires_at > approved_at)
);

CREATE TABLE rp_ai_usage_daily (
  user_id uuid NOT NULL REFERENCES rp_users(id) ON DELETE CASCADE,
  feature text NOT NULL
    CHECK (feature IN ('calendar_draft', 'message_draft', 'admission', 'training', 'nutrition', 'wellbeing', 'posture')),
  usage_date date NOT NULL,
  request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  input_tokens bigint NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
  output_tokens bigint NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
  cost_amount numeric(14, 6) NOT NULL DEFAULT 0 CHECK (cost_amount >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, feature, usage_date)
);

CREATE TABLE rp_ai_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES rp_users(id) ON DELETE RESTRICT,
  feature text NOT NULL
    CHECK (feature IN ('calendar_draft', 'message_draft', 'admission', 'training', 'nutrition', 'wellbeing', 'posture')),
  status text NOT NULL CHECK (status IN ('reserved', 'completed', 'failed', 'blocked')),
  model_provider text CHECK (char_length(model_provider) <= 60),
  model_name text CHECK (char_length(model_name) <= 120),
  provider_request_id text CHECK (char_length(provider_request_id) <= 240),
  input_fingerprint text CHECK (char_length(input_fingerprint) <= 128),
  input_redaction_level text NOT NULL DEFAULT 'minimum'
    CHECK (input_redaction_level IN ('minimum', 'pseudonymized', 'none_sent')),
  input_tokens integer CHECK (input_tokens >= 0),
  output_tokens integer CHECK (output_tokens >= 0),
  cost_amount numeric(14, 6) CHECK (cost_amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CHECK ((status = 'completed' AND completed_at IS NOT NULL) OR status <> 'completed')
);

COMMENT ON TABLE rp_ai_requests IS
  'AI request metadata only. Student records, health details, message bodies, prompts, and model outputs are not stored here.';

CREATE INDEX rp_ai_requests_user_time
  ON rp_ai_requests(user_id, created_at DESC);

CREATE TABLE rp_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES rp_users(id) ON DELETE RESTRICT,
  consent_type text NOT NULL
    CHECK (consent_type IN ('privacy', 'sensitive_data', 'ai', 'media', 'guardian_link')),
  policy_version text NOT NULL CHECK (char_length(policy_version) BETWEEN 1 AND 40),
  status text NOT NULL CHECK (status IN ('granted', 'revoked', 'expired')),
  granted_at timestamptz,
  revoked_at timestamptz,
  evidence_ref text CHECK (char_length(evidence_ref) <= 240),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status = 'granted' AND granted_at IS NOT NULL) OR status <> 'granted'),
  CHECK ((status = 'revoked' AND revoked_at IS NOT NULL) OR status <> 'revoked')
);

CREATE UNIQUE INDEX rp_consents_one_current_grant
  ON rp_consents(user_id, consent_type, policy_version)
  WHERE status = 'granted';

CREATE INDEX rp_consents_user_type_time
  ON rp_consents(user_id, consent_type, created_at DESC);

CREATE TABLE rp_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES rp_users(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (char_length(action) BETWEEN 1 AND 120),
  target_type text NOT NULL CHECK (char_length(target_type) BETWEEN 1 AND 80),
  target_id uuid,
  reason_code text CHECK (char_length(reason_code) <= 80),
  request_id text CHECK (char_length(request_id) <= 120),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(metadata) = 'object')
);

COMMENT ON COLUMN rp_audit_events.metadata IS
  'Operational metadata only. Never store health, grades, message text, prompts, or media content.';

CREATE INDEX rp_audit_events_target_time
  ON rp_audit_events(target_type, target_id, occurred_at DESC);

CREATE INDEX rp_audit_events_actor_time
  ON rp_audit_events(actor_user_id, occurred_at DESC);

CREATE TRIGGER rp_conversations_set_updated_at
BEFORE UPDATE ON rp_conversations
FOR EACH ROW EXECUTE FUNCTION rp_set_updated_at();

CREATE TRIGGER rp_ai_access_grants_set_updated_at
BEFORE UPDATE ON rp_ai_access_grants
FOR EACH ROW EXECUTE FUNCTION rp_set_updated_at();

COMMIT;
