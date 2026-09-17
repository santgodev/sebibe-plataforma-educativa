-- Create lesson_comments table for global conversation on a lesson

CREATE TABLE IF NOT EXISTS public.lesson_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.lesson_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone enrolled can read comments"
  ON public.lesson_comments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert own comment"
  ON public.lesson_comments
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Author admin or instructor can delete"
  ON public.lesson_comments
  FOR DELETE
  TO authenticated
  USING (
    (select auth.uid()) = user_id
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid())
      AND role IN ('admin', 'profesor')
    )
  );

GRANT SELECT, INSERT, DELETE ON public.lesson_comments TO authenticated;
