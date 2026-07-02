BEGIN;

CREATE INDEX IF NOT EXISTS rp_service_applications_retention_idx
ON rp_service_applications (created_at DESC)
WHERE COALESCE(payload->>'retention', '') NOT IN ('payload_pruned', 'minimized_on_write');

CREATE INDEX IF NOT EXISTS rp_pe_exam_ai_consults_retention_idx
ON rp_pe_exam_ai_consults (created_at DESC)
WHERE COALESCE(payload->>'retention', '') NOT IN ('payload_pruned', 'minimized_on_write')
   OR COALESCE(conversation_record->>'retention', '') NOT IN ('payload_pruned', 'minimized_on_write');

CREATE INDEX IF NOT EXISTS rp_pe_exam_questions_retention_idx
ON rp_pe_exam_questions (created_at DESC)
WHERE COALESCE(payload->>'retention', '') NOT IN ('payload_pruned', 'minimized_on_write');

COMMIT;
