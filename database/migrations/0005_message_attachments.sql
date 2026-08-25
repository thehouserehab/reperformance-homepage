BEGIN;

CREATE OR REPLACE FUNCTION rp_has_active_consent(p_user_id uuid, p_consent_type text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM rp_consents
    WHERE user_id = p_user_id
      AND consent_type = p_consent_type
      AND status = 'granted'
  );
$$;

CREATE TABLE rp_message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES rp_messages(id) ON DELETE CASCADE,
  uploader_user_id uuid NOT NULL REFERENCES rp_users(id) ON DELETE RESTRICT,
  kind text NOT NULL CHECK (kind IN ('image', 'video')),
  object_key text NOT NULL CHECK (char_length(object_key) BETWEEN 1 AND 500),
  original_filename_ciphertext bytea,
  encryption_key_version smallint CHECK (encryption_key_version >= 1),
  mime_type text NOT NULL CHECK (
    mime_type IN (
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'video/mp4',
      'video/webm',
      'video/quicktime'
    )
  ),
  byte_size bigint NOT NULL CHECK (byte_size BETWEEN 1 AND 52428800),
  checksum_sha256 bytea NOT NULL CHECK (octet_length(checksum_sha256) = 32),
  width_px integer CHECK (width_px > 0),
  height_px integer CHECK (height_px > 0),
  duration_ms integer CHECK (duration_ms >= 0),
  status text NOT NULL DEFAULT 'ready'
    CHECK (status IN ('ready', 'failed', 'redacted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  retention_until timestamptz,
  redacted_at timestamptz,
  UNIQUE (object_key),
  CHECK (
    (kind = 'image' AND mime_type LIKE 'image/%' AND duration_ms IS NULL)
    OR (kind = 'video' AND mime_type LIKE 'video/%')
  ),
  CHECK ((status = 'redacted' AND redacted_at IS NOT NULL) OR status <> 'redacted')
);

COMMENT ON TABLE rp_message_attachments IS
  'Private object-storage metadata only. Media bytes and public URLs must never be stored in this table.';

COMMENT ON COLUMN rp_message_attachments.object_key IS
  'Server-generated key for a private bucket. Access must use short-lived authorized URLs.';

CREATE INDEX rp_message_attachments_message_time
  ON rp_message_attachments(message_id, created_at);

CREATE INDEX rp_message_attachments_retention
  ON rp_message_attachments(retention_until)
  WHERE retention_until IS NOT NULL AND status <> 'redacted';

ALTER TABLE rp_message_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY rp_message_attachments_select_participant ON rp_message_attachments
FOR SELECT USING (rp_can_access_message(message_id));

CREATE POLICY rp_message_attachments_insert_sender ON rp_message_attachments
FOR INSERT WITH CHECK (
  uploader_user_id = rp_current_user_id()
  AND status = 'ready'
  AND rp_has_active_consent(uploader_user_id, 'media')
  AND EXISTS (
    SELECT 1
    FROM rp_messages message
    WHERE message.id = message_id
      AND message.sender_user_id = rp_current_user_id()
      AND rp_is_conversation_participant(message.conversation_id)
  )
);

COMMIT;
