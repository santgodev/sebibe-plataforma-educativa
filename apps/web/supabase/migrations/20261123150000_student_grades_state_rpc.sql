-- Single-RPC per-student grades state for /home/grades.
-- Returns only lightweight per-student rows (enrollments, completed lessons, raw attempts);
-- shared course/activity/question/answer metadata is joined from shared server cache.

CREATE OR REPLACE FUNCTION public.get_student_grades_state()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := (select auth.uid());
  v_enrollments jsonb;
  v_completed_lesson_ids jsonb;
  v_attempts jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object(
      'enrollments', '[]'::jsonb,
      'completed_lesson_ids', '[]'::jsonb,
      'attempts', '[]'::jsonb
    );
  END IF;

  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'course_id', ce.course_id,
        'enrolled_at', ce.enrolled_at
      )
    ),
    '[]'::jsonb
  )
  INTO v_enrollments
  FROM public.course_enrollments ce
  WHERE ce.student_id = v_uid;

  SELECT coalesce(jsonb_agg(lp.lesson_id), '[]'::jsonb)
  INTO v_completed_lesson_ids
  FROM public.lesson_progress lp
  WHERE lp.student_id = v_uid
    AND lp.is_completed = true;

  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', aa.id,
        'activity_id', aa.activity_id,
        'score', aa.score,
        'status', aa.status,
        'completed_at', aa.completed_at,
        'attempt_number', aa.attempt_number,
        'file_url', aa.file_url,
        'answers_json', aa.answers_json
      )
      ORDER BY aa.completed_at DESC NULLS LAST
    ),
    '[]'::jsonb
  )
  INTO v_attempts
  FROM public.activity_attempts aa
  WHERE aa.student_id = v_uid;

  RETURN jsonb_build_object(
    'enrollments', v_enrollments,
    'completed_lesson_ids', v_completed_lesson_ids,
    'attempts', v_attempts
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_student_grades_state() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_student_grades_state() TO authenticated;
