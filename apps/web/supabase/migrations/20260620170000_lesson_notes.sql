-- Create lesson_notes table for student personal notes per lesson

CREATE TABLE IF NOT EXISTS public.lesson_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.lesson_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can manage own notes"
  ON public.lesson_notes
  FOR ALL
  TO authenticated
  USING ((select auth.uid()) = student_id)
  WITH CHECK ((select auth.uid()) = student_id);

GRANT ALL ON public.lesson_notes TO authenticated;
