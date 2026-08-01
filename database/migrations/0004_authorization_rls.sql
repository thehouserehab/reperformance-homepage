BEGIN;

CREATE OR REPLACE FUNCTION rp_current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(current_setting('rp.user_id', true), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION rp_has_role(p_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM rp_user_roles
    WHERE user_id = rp_current_user_id()
      AND role = p_role
      AND active_from <= now()
      AND (active_to IS NULL OR active_to > now())
  );
$$;

CREATE OR REPLACE FUNCTION rp_is_student_owner(p_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM rp_student_profiles
    WHERE id = p_student_id
      AND user_id = rp_current_user_id()
  );
$$;

CREATE OR REPLACE FUNCTION rp_is_coach_profile_owner(p_coach_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM rp_coach_profiles
    WHERE id = p_coach_id
      AND user_id = rp_current_user_id()
  );
$$;

CREATE OR REPLACE FUNCTION rp_is_guardian_profile_owner(p_guardian_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM rp_guardian_profiles
    WHERE id = p_guardian_id
      AND user_id = rp_current_user_id()
  );
$$;

CREATE OR REPLACE FUNCTION rp_user_is_active_coach(p_user_id uuid, p_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM rp_coach_student_links link
    JOIN rp_coach_profiles coach ON coach.id = link.coach_id
    WHERE link.student_id = p_student_id
      AND link.status = 'active'
      AND (link.starts_at IS NULL OR link.starts_at <= now())
      AND (link.ends_at IS NULL OR link.ends_at > now())
      AND coach.user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION rp_is_active_coach(p_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT rp_user_is_active_coach(rp_current_user_id(), p_student_id);
$$;

CREATE OR REPLACE FUNCTION rp_user_is_active_guardian(p_user_id uuid, p_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM rp_guardian_student_links link
    JOIN rp_guardian_profiles guardian ON guardian.id = link.guardian_id
    WHERE link.student_id = p_student_id
      AND link.status = 'active'
      AND link.confirmed_by_student_at IS NOT NULL
      AND guardian.user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION rp_is_active_guardian(p_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT rp_user_is_active_guardian(rp_current_user_id(), p_student_id);
$$;

CREATE OR REPLACE FUNCTION rp_guardian_can_view(p_student_id uuid, p_area text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM rp_guardian_student_links link
    JOIN rp_guardian_profiles guardian ON guardian.id = link.guardian_id
    JOIN rp_guardian_sharing_preferences sharing
      ON sharing.guardian_student_link_id = link.id
    WHERE link.student_id = p_student_id
      AND link.status = 'active'
      AND link.confirmed_by_student_at IS NOT NULL
      AND guardian.user_id = rp_current_user_id()
      AND CASE p_area
        WHEN 'attendance' THEN sharing.attendance
        WHEN 'contract' THEN sharing.contract
        WHEN 'academics' THEN sharing.academics
        WHEN 'practical' THEN sharing.practical
        ELSE false
      END
  );
$$;

CREATE OR REPLACE FUNCTION rp_is_conversation_participant(p_conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM rp_conversation_participants
    WHERE conversation_id = p_conversation_id
      AND user_id = rp_current_user_id()
      AND left_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION rp_create_conversation(
  p_type text,
  p_student_id uuid,
  p_counterpart_user_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_user_id uuid := rp_current_user_id();
  v_student_user_id uuid;
  v_conversation_id uuid;
  v_actor_role text;
  v_counterpart_role text;
BEGIN
  IF v_actor_user_id IS NULL OR p_counterpart_user_id = v_actor_user_id THEN
    RAISE EXCEPTION 'conversation_not_allowed' USING ERRCODE = '42501';
  END IF;

  SELECT user_id INTO v_student_user_id
  FROM rp_student_profiles
  WHERE id = p_student_id;

  IF v_student_user_id IS NULL THEN
    RAISE EXCEPTION 'student_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF p_type = 'student_coach' THEN
    IF v_actor_user_id = v_student_user_id
      AND rp_user_is_active_coach(p_counterpart_user_id, p_student_id) THEN
      v_actor_role := 'student';
      v_counterpart_role := 'coach';
    ELSIF p_counterpart_user_id = v_student_user_id
      AND rp_user_is_active_coach(v_actor_user_id, p_student_id) THEN
      v_actor_role := 'coach';
      v_counterpart_role := 'student';
    ELSE
      RAISE EXCEPTION 'active_student_coach_relationship_required' USING ERRCODE = '42501';
    END IF;
  ELSIF p_type = 'guardian_coach' THEN
    IF rp_user_is_active_guardian(v_actor_user_id, p_student_id)
      AND rp_user_is_active_coach(p_counterpart_user_id, p_student_id) THEN
      v_actor_role := 'guardian';
      v_counterpart_role := 'coach';
    ELSIF rp_user_is_active_coach(v_actor_user_id, p_student_id)
      AND rp_user_is_active_guardian(p_counterpart_user_id, p_student_id) THEN
      v_actor_role := 'coach';
      v_counterpart_role := 'guardian';
    ELSE
      RAISE EXCEPTION 'active_guardian_coach_relationship_required' USING ERRCODE = '42501';
    END IF;
  ELSE
    RAISE EXCEPTION 'invalid_conversation_type' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      p_type || ':' || p_student_id::text || ':' ||
      least(v_actor_user_id::text, p_counterpart_user_id::text) || ':' ||
      greatest(v_actor_user_id::text, p_counterpart_user_id::text),
      0
    )
  );

  SELECT conversation.id INTO v_conversation_id
  FROM rp_conversations conversation
  WHERE conversation.type = p_type
    AND conversation.student_id = p_student_id
    AND conversation.status = 'active'
    AND EXISTS (
      SELECT 1 FROM rp_conversation_participants participant
      WHERE participant.conversation_id = conversation.id
        AND participant.user_id = v_actor_user_id
        AND participant.left_at IS NULL
    )
    AND EXISTS (
      SELECT 1 FROM rp_conversation_participants participant
      WHERE participant.conversation_id = conversation.id
        AND participant.user_id = p_counterpart_user_id
        AND participant.left_at IS NULL
    )
  ORDER BY conversation.created_at
  LIMIT 1;

  IF v_conversation_id IS NOT NULL THEN
    RETURN v_conversation_id;
  END IF;

  INSERT INTO rp_conversations (type, student_id, created_by_user_id)
  VALUES (p_type, p_student_id, v_actor_user_id)
  RETURNING id INTO v_conversation_id;

  INSERT INTO rp_conversation_participants (
    conversation_id,
    user_id,
    participant_role
  ) VALUES
    (v_conversation_id, v_actor_user_id, v_actor_role),
    (v_conversation_id, p_counterpart_user_id, v_counterpart_role);

  RETURN v_conversation_id;
END;
$$;

CREATE OR REPLACE FUNCTION rp_can_access_message(p_message_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM rp_messages message
    WHERE message.id = p_message_id
      AND rp_is_conversation_participant(message.conversation_id)
  );
$$;

CREATE OR REPLACE FUNCTION rp_create_message_receipts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO rp_message_receipts (message_id, recipient_user_id)
  SELECT NEW.id, participant.user_id
  FROM rp_conversation_participants participant
  WHERE participant.conversation_id = NEW.conversation_id
    AND participant.left_at IS NULL
    AND participant.user_id <> NEW.sender_user_id
  ON CONFLICT (message_id, recipient_user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER rp_messages_create_receipts
AFTER INSERT ON rp_messages
FOR EACH ROW EXECUTE FUNCTION rp_create_message_receipts();

CREATE OR REPLACE FUNCTION rp_ai_feature_allowed(p_user_id uuid, p_feature text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM rp_ai_access_grants
    WHERE user_id = p_user_id
      AND feature = p_feature
      AND status = 'approved'
      AND daily_request_limit > 0
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

CREATE OR REPLACE FUNCTION rp_reserve_ai_usage(p_feature text)
RETURNS TABLE (allowed boolean, remaining_requests integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := rp_current_user_id();
  v_limit integer;
  v_used integer;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 0;
    RETURN;
  END IF;

  SELECT daily_request_limit
  INTO v_limit
  FROM rp_ai_access_grants
  WHERE user_id = v_user_id
    AND feature = p_feature
    AND status = 'approved'
    AND daily_request_limit > 0
    AND (expires_at IS NULL OR expires_at > now())
  FOR UPDATE;

  IF v_limit IS NULL THEN
    RETURN QUERY SELECT false, 0;
    RETURN;
  END IF;

  INSERT INTO rp_ai_usage_daily (user_id, feature, usage_date)
  VALUES (v_user_id, p_feature, current_date)
  ON CONFLICT (user_id, feature, usage_date) DO NOTHING;

  SELECT request_count
  INTO v_used
  FROM rp_ai_usage_daily
  WHERE user_id = v_user_id
    AND feature = p_feature
    AND usage_date = current_date
  FOR UPDATE;

  IF v_used >= v_limit THEN
    RETURN QUERY SELECT false, 0;
    RETURN;
  END IF;

  UPDATE rp_ai_usage_daily
  SET request_count = request_count + 1,
      updated_at = now()
  WHERE user_id = v_user_id
    AND feature = p_feature
    AND usage_date = current_date;

  RETURN QUERY SELECT true, v_limit - v_used - 1;
END;
$$;

ALTER TABLE rp_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE rp_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rp_student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rp_coach_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rp_guardian_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rp_coach_student_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE rp_guardian_student_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE rp_guardian_sharing_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE rp_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE rp_condition_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE rp_study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rp_academic_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE rp_practical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE rp_calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE rp_admission_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rp_contract_status_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE rp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rp_conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE rp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE rp_message_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE rp_ai_access_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE rp_ai_usage_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE rp_ai_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE rp_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE rp_audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY rp_users_select_self_or_admin ON rp_users
FOR SELECT USING (id = rp_current_user_id() OR rp_has_role('admin'));

CREATE POLICY rp_users_update_self ON rp_users
FOR UPDATE USING (id = rp_current_user_id())
WITH CHECK (id = rp_current_user_id());

CREATE POLICY rp_user_roles_select_self_or_admin ON rp_user_roles
FOR SELECT USING (user_id = rp_current_user_id() OR rp_has_role('admin'));

CREATE POLICY rp_user_roles_admin_manage ON rp_user_roles
FOR ALL USING (rp_has_role('admin'))
WITH CHECK (rp_has_role('admin'));

CREATE POLICY rp_student_profiles_select_related ON rp_student_profiles
FOR SELECT USING (
  user_id = rp_current_user_id()
  OR rp_is_active_coach(id)
  OR rp_has_role('admin')
);

CREATE POLICY rp_student_profiles_update_self ON rp_student_profiles
FOR UPDATE USING (user_id = rp_current_user_id())
WITH CHECK (user_id = rp_current_user_id());

CREATE POLICY rp_coach_profiles_select_self_or_admin ON rp_coach_profiles
FOR SELECT USING (user_id = rp_current_user_id() OR rp_has_role('admin'));

CREATE POLICY rp_guardian_profiles_select_self_or_admin ON rp_guardian_profiles
FOR SELECT USING (user_id = rp_current_user_id() OR rp_has_role('admin'));

CREATE POLICY rp_coach_student_links_select_related ON rp_coach_student_links
FOR SELECT USING (
  rp_is_student_owner(student_id)
  OR rp_is_coach_profile_owner(coach_id)
  OR rp_has_role('admin')
);

CREATE POLICY rp_coach_student_links_admin_manage ON rp_coach_student_links
FOR ALL USING (rp_has_role('admin'))
WITH CHECK (rp_has_role('admin'));

CREATE POLICY rp_guardian_student_links_select_related ON rp_guardian_student_links
FOR SELECT USING (
  rp_is_student_owner(student_id)
  OR rp_is_guardian_profile_owner(guardian_id)
  OR rp_has_role('admin')
);

CREATE POLICY rp_guardian_student_links_student_confirm ON rp_guardian_student_links
FOR UPDATE USING (rp_is_student_owner(student_id))
WITH CHECK (rp_is_student_owner(student_id));

CREATE POLICY rp_guardian_student_links_admin_manage ON rp_guardian_student_links
FOR ALL USING (rp_has_role('admin'))
WITH CHECK (rp_has_role('admin'));

CREATE POLICY rp_guardian_sharing_select_related ON rp_guardian_sharing_preferences
FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM rp_guardian_student_links link
    WHERE link.id = guardian_student_link_id
      AND (
        rp_is_student_owner(link.student_id)
        OR rp_is_guardian_profile_owner(link.guardian_id)
        OR rp_has_role('admin')
      )
  )
);

CREATE POLICY rp_guardian_sharing_student_update ON rp_guardian_sharing_preferences
FOR UPDATE USING (
  EXISTS (
    SELECT 1
    FROM rp_guardian_student_links link
    WHERE link.id = guardian_student_link_id
      AND rp_is_student_owner(link.student_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM rp_guardian_student_links link
    WHERE link.id = guardian_student_link_id
      AND rp_is_student_owner(link.student_id)
  )
  AND updated_by_student_user_id = rp_current_user_id()
);

CREATE POLICY rp_guardian_sharing_admin_manage ON rp_guardian_sharing_preferences
FOR ALL USING (rp_has_role('admin'))
WITH CHECK (rp_has_role('admin'));

CREATE POLICY rp_tasks_select_student_or_coach ON rp_tasks
FOR SELECT USING (rp_is_student_owner(student_id) OR rp_is_active_coach(student_id));

CREATE POLICY rp_tasks_insert_student_or_coach ON rp_tasks
FOR INSERT WITH CHECK (
  (rp_is_student_owner(student_id) OR rp_is_active_coach(student_id))
  AND created_by_user_id = rp_current_user_id()
);

CREATE POLICY rp_tasks_update_student_or_coach ON rp_tasks
FOR UPDATE USING (rp_is_student_owner(student_id) OR rp_is_active_coach(student_id))
WITH CHECK (rp_is_student_owner(student_id) OR rp_is_active_coach(student_id));

CREATE POLICY rp_condition_checks_select_student_or_coach ON rp_condition_checks
FOR SELECT USING (rp_is_student_owner(student_id) OR rp_is_active_coach(student_id));

CREATE POLICY rp_condition_checks_insert_student ON rp_condition_checks
FOR INSERT WITH CHECK (rp_is_student_owner(student_id));

CREATE POLICY rp_study_sessions_select_student_or_coach ON rp_study_sessions
FOR SELECT USING (rp_is_student_owner(student_id) OR rp_is_active_coach(student_id));

CREATE POLICY rp_study_sessions_insert_student ON rp_study_sessions
FOR INSERT WITH CHECK (rp_is_student_owner(student_id));

CREATE POLICY rp_academic_snapshots_select_student_or_coach ON rp_academic_snapshots
FOR SELECT USING (rp_is_student_owner(student_id) OR rp_is_active_coach(student_id));

CREATE POLICY rp_academic_snapshots_insert_student ON rp_academic_snapshots
FOR INSERT WITH CHECK (
  rp_is_student_owner(student_id)
  AND created_by_user_id = rp_current_user_id()
);

CREATE POLICY rp_practical_records_select_student_or_coach ON rp_practical_records
FOR SELECT USING (rp_is_student_owner(student_id) OR rp_is_active_coach(student_id));

CREATE POLICY rp_practical_records_insert_student_or_coach ON rp_practical_records
FOR INSERT WITH CHECK (
  (rp_is_student_owner(student_id) OR rp_is_active_coach(student_id))
  AND created_by_user_id = rp_current_user_id()
);

CREATE POLICY rp_practical_records_update_student_or_coach ON rp_practical_records
FOR UPDATE USING (rp_is_student_owner(student_id) OR rp_is_active_coach(student_id))
WITH CHECK (rp_is_student_owner(student_id) OR rp_is_active_coach(student_id));

CREATE POLICY rp_calendar_events_select_student_or_coach ON rp_calendar_events
FOR SELECT USING (rp_is_student_owner(student_id) OR rp_is_active_coach(student_id));

CREATE POLICY rp_calendar_events_insert_student_or_coach ON rp_calendar_events
FOR INSERT WITH CHECK (
  (rp_is_student_owner(student_id) OR rp_is_active_coach(student_id))
  AND created_by_user_id = rp_current_user_id()
);

CREATE POLICY rp_calendar_events_update_student_or_coach ON rp_calendar_events
FOR UPDATE USING (rp_is_student_owner(student_id) OR rp_is_active_coach(student_id))
WITH CHECK (rp_is_student_owner(student_id) OR rp_is_active_coach(student_id));

CREATE POLICY rp_admission_profiles_select_student_or_coach ON rp_admission_profiles
FOR SELECT USING (rp_is_student_owner(student_id) OR rp_is_active_coach(student_id));

CREATE POLICY rp_admission_profiles_student_manage ON rp_admission_profiles
FOR ALL USING (rp_is_student_owner(student_id))
WITH CHECK (
  rp_is_student_owner(student_id)
  AND updated_by_user_id = rp_current_user_id()
);

CREATE POLICY rp_contract_status_select_permitted ON rp_contract_status_summaries
FOR SELECT USING (
  rp_is_student_owner(student_id)
  OR rp_is_active_coach(student_id)
  OR rp_guardian_can_view(student_id, 'contract')
  OR rp_has_role('admin')
);

CREATE POLICY rp_contract_status_admin_manage ON rp_contract_status_summaries
FOR ALL USING (rp_has_role('admin'))
WITH CHECK (rp_has_role('admin'));

CREATE POLICY rp_conversations_select_participant ON rp_conversations
FOR SELECT USING (rp_is_conversation_participant(id));

CREATE POLICY rp_conversation_participants_select_participant ON rp_conversation_participants
FOR SELECT USING (rp_is_conversation_participant(conversation_id));

CREATE POLICY rp_messages_select_participant ON rp_messages
FOR SELECT USING (rp_is_conversation_participant(conversation_id));

CREATE POLICY rp_messages_insert_participant ON rp_messages
FOR INSERT WITH CHECK (
  sender_user_id = rp_current_user_id()
  AND rp_is_conversation_participant(conversation_id)
);

CREATE POLICY rp_message_receipts_select_participant ON rp_message_receipts
FOR SELECT USING (rp_can_access_message(message_id));

CREATE POLICY rp_message_receipts_update_recipient ON rp_message_receipts
FOR UPDATE USING (recipient_user_id = rp_current_user_id())
WITH CHECK (recipient_user_id = rp_current_user_id());

CREATE POLICY rp_ai_access_grants_select_self_or_admin ON rp_ai_access_grants
FOR SELECT USING (user_id = rp_current_user_id() OR rp_has_role('admin'));

CREATE POLICY rp_ai_access_grants_admin_manage ON rp_ai_access_grants
FOR ALL USING (rp_has_role('admin'))
WITH CHECK (rp_has_role('admin'));

CREATE POLICY rp_ai_usage_daily_select_self_or_admin ON rp_ai_usage_daily
FOR SELECT USING (user_id = rp_current_user_id() OR rp_has_role('admin'));

CREATE POLICY rp_ai_requests_select_self_or_admin ON rp_ai_requests
FOR SELECT USING (user_id = rp_current_user_id() OR rp_has_role('admin'));

CREATE POLICY rp_ai_requests_insert_self ON rp_ai_requests
FOR INSERT WITH CHECK (
  user_id = rp_current_user_id()
  AND rp_ai_feature_allowed(user_id, feature)
);

CREATE POLICY rp_ai_requests_update_self ON rp_ai_requests
FOR UPDATE USING (user_id = rp_current_user_id())
WITH CHECK (user_id = rp_current_user_id());

CREATE POLICY rp_consents_select_self_or_admin ON rp_consents
FOR SELECT USING (user_id = rp_current_user_id() OR rp_has_role('admin'));

CREATE POLICY rp_consents_insert_self ON rp_consents
FOR INSERT WITH CHECK (user_id = rp_current_user_id());

CREATE POLICY rp_consents_update_self ON rp_consents
FOR UPDATE USING (user_id = rp_current_user_id())
WITH CHECK (user_id = rp_current_user_id());

CREATE POLICY rp_audit_events_admin_select ON rp_audit_events
FOR SELECT USING (rp_has_role('admin'));

CREATE POLICY rp_audit_events_insert_actor ON rp_audit_events
FOR INSERT WITH CHECK (actor_user_id = rp_current_user_id());

COMMIT;
