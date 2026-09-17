CREATE OR REPLACE FUNCTION public.enroll_by_email(user_email TEXT, course_slug TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Allows the function to bypass RLS and access auth.users
AS $$
DECLARE
  v_user_id UUID;
  v_course_id UUID;
BEGIN
  -- Find user ID from auth.users (requires SECURITY DEFINER)
  SELECT id INTO v_user_id FROM auth.users WHERE email = user_email;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Find course ID
  SELECT id INTO v_course_id FROM public.courses WHERE slug = course_slug;
  IF v_course_id IS NULL THEN
    RAISE EXCEPTION 'Course not found';
  END IF;

  -- Enroll user
  INSERT INTO public.course_enrollments (course_id, student_id)
  VALUES (v_course_id, v_user_id)
  ON CONFLICT DO NOTHING;
END;
$$;
