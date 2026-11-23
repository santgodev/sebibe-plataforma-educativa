-- Consolidate per-student lesson & dashboard queries into single fast RPCs
-- to dramatically reduce PostgREST connection pool usage under high concurrency.

CREATE OR REPLACE FUNCTION public.get_student_lesson_state(
  p_course_id uuid,
  p_lesson_id uuid,
  p_activity_ids uuid[] DEFAULT '{}'::uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid;
  v_role text;
  v_is_enrolled boolean;
  v_is_instructor boolean;
  v_account jsonb;
  v_lesson_completed boolean;
  v_notes jsonb;
  v_comments jsonb;
  v_attempts jsonb;
BEGIN
  v_uid := (select auth.uid());
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT ur.role INTO v_role
  FROM public.user_roles ur
  WHERE ur.id = v_uid
  LIMIT 1;

  SELECT EXISTS (
    SELECT 1
    FROM public.course_enrollments ce
    WHERE ce.course_id = p_course_id
      AND ce.student_id = v_uid
  ) INTO v_is_enrolled;

  SELECT EXISTS (
    SELECT 1
    FROM public.courses c
    WHERE c.id = p_course_id
      AND c.instructor_id = v_uid
  ) INTO v_is_instructor;

  SELECT jsonb_build_object('name', a.name, 'picture_url', a.picture_url)
  INTO v_account
  FROM public.accounts a
  WHERE a.id = v_uid
  LIMIT 1;

  SELECT EXISTS (
    SELECT 1
    FROM public.lesson_progress lp
    WHERE lp.student_id = v_uid
      AND lp.lesson_id = p_lesson_id
      AND lp.is_completed = true
  ) INTO v_lesson_completed;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', n.id,
        'content', n.content,
        'created_at', n.created_at
      )
      ORDER BY n.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_notes
  FROM public.lesson_notes n
  WHERE n.lesson_id = p_lesson_id
    AND n.student_id = v_uid;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', c.id,
        'content', c.content,
        'created_at', c.created_at,
        'user_id', c.user_id,
        'display_name', COALESCE(a.name, 'Estudiante'),
        'avatar_url', a.picture_url
      )
      ORDER BY c.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_comments
  FROM public.lesson_comments c
  LEFT JOIN public.accounts a ON a.id = c.user_id
  WHERE c.lesson_id = p_lesson_id;

  IF p_activity_ids IS NOT NULL AND array_length(p_activity_ids, 1) > 0 THEN
    SELECT COALESCE(
      jsonb_agg(to_jsonb(att) ORDER BY att.completed_at DESC NULLS LAST),
      '[]'::jsonb
    )
    INTO v_attempts
    FROM public.activity_attempts att
    WHERE att.student_id = v_uid
      AND att.activity_id = ANY(p_activity_ids);
  ELSE
    v_attempts := '[]'::jsonb;
  END IF;

  RETURN jsonb_build_object(
    'role', v_role,
    'is_enrolled', v_is_enrolled,
    'is_instructor', v_is_instructor,
    'account', COALESCE(v_account, jsonb_build_object('name', 'Tú', 'picture_url', null)),
    'lesson_completed', v_lesson_completed,
    'notes', v_notes,
    'comments', v_comments,
    'attempts', v_attempts
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_student_lesson_state(uuid, uuid, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_student_lesson_state(uuid, uuid, uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_student_courses_state()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid;
  v_enrollments jsonb;
  v_progress jsonb;
  v_attempt_course_ids jsonb;
  v_completed_lesson_ids jsonb;
BEGIN
  v_uid := (select auth.uid());
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'course_id', ce.course_id,
        'enrolled_at', ce.enrolled_at,
        'completed_at', ce.completed_at
      )
    ),
    '[]'::jsonb
  )
  INTO v_enrollments
  FROM public.course_enrollments ce
  WHERE ce.student_id = v_uid;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'course_id', cp.course_id,
        'percentage_completed', cp.percentage_completed,
        'updated_at', cp.updated_at,
        'created_at', cp.created_at,
        'status', cp.status,
        'completed_at', cp.completed_at
      )
    ),
    '[]'::jsonb
  )
  INTO v_progress
  FROM public.course_progress cp
  WHERE cp.student_id = v_uid;

  SELECT COALESCE(
    jsonb_agg(DISTINCT COALESCE(a.course_id, cm.course_id)),
    '[]'::jsonb
  )
  INTO v_attempt_course_ids
  FROM public.activity_attempts aa
  JOIN public.activities a ON a.id = aa.activity_id
  LEFT JOIN public.lessons l ON l.id = a.lesson_id
  LEFT JOIN public.course_modules cm ON cm.id = l.module_id
  WHERE aa.student_id = v_uid
    AND COALESCE(a.course_id, cm.course_id) IS NOT NULL;

  SELECT COALESCE(
    jsonb_agg(lp.lesson_id),
    '[]'::jsonb
  )
  INTO v_completed_lesson_ids
  FROM public.lesson_progress lp
  WHERE lp.student_id = v_uid
    AND lp.is_completed = true;

  RETURN jsonb_build_object(
    'enrollments', v_enrollments,
    'progress', v_progress,
    'attempt_course_ids', v_attempt_course_ids,
    'completed_lesson_ids', v_completed_lesson_ids
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_student_courses_state() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_student_courses_state() TO authenticated;
