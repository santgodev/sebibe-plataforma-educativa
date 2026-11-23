-- Optimize LMS performance: add missing foreign-key/query indexes and wrap auth.uid() in SELECT inside RLS policies

-- 1. Missing indexes for foreign keys and frequent LMS lookups
CREATE INDEX IF NOT EXISTS courses_instructor_id_idx ON public.courses (instructor_id);
CREATE INDEX IF NOT EXISTS courses_active_status_idx ON public.courses (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS course_modules_course_id_order_idx ON public.course_modules (course_id, order_index);
CREATE INDEX IF NOT EXISTS lessons_module_id_order_idx ON public.lessons (module_id, order_index);
CREATE INDEX IF NOT EXISTS lesson_blocks_lesson_id_order_idx ON public.lesson_blocks (lesson_id, order_index);
CREATE INDEX IF NOT EXISTS lesson_resources_lesson_id_idx ON public.lesson_resources (lesson_id);
CREATE INDEX IF NOT EXISTS course_enrollments_student_course_idx ON public.course_enrollments (student_id, course_id);
CREATE INDEX IF NOT EXISTS course_enrollments_course_id_idx ON public.course_enrollments (course_id);
CREATE INDEX IF NOT EXISTS lesson_progress_student_completed_idx ON public.lesson_progress (student_id, is_completed);
CREATE INDEX IF NOT EXISTS lesson_progress_lesson_id_idx ON public.lesson_progress (lesson_id);
CREATE INDEX IF NOT EXISTS course_progress_course_id_idx ON public.course_progress (course_id);
CREATE INDEX IF NOT EXISTS activities_lesson_id_idx ON public.activities (lesson_id);
CREATE INDEX IF NOT EXISTS activities_course_id_idx ON public.activities (course_id);
CREATE INDEX IF NOT EXISTS activity_questions_activity_order_idx ON public.activity_questions (activity_id, order_index);
CREATE INDEX IF NOT EXISTS activity_answers_question_order_idx ON public.activity_answers (question_id, order_index);
CREATE INDEX IF NOT EXISTS activity_attempts_student_activity_completed_idx ON public.activity_attempts (student_id, activity_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS activity_attempts_activity_id_idx ON public.activity_attempts (activity_id);
CREATE INDEX IF NOT EXISTS lesson_notes_lesson_student_idx ON public.lesson_notes (lesson_id, student_id);
CREATE INDEX IF NOT EXISTS lesson_comments_lesson_created_idx ON public.lesson_comments (lesson_id, created_at DESC);
CREATE INDEX IF NOT EXISTS cohorts_period_id_idx ON public.cohorts (period_id);
CREATE INDEX IF NOT EXISTS cohort_enrollments_student_id_idx ON public.cohort_enrollments (student_id);
CREATE INDEX IF NOT EXISTS cohort_enrollments_cohort_id_idx ON public.cohort_enrollments (cohort_id);
CREATE INDEX IF NOT EXISTS cohort_schedules_cohort_id_idx ON public.cohort_schedules (cohort_id);
CREATE INDEX IF NOT EXISTS cohort_schedules_course_id_idx ON public.cohort_schedules (course_id);

-- 2. Optimize RLS policies: evaluate auth.uid() once per statement via (select auth.uid())

-- user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING ((select auth.uid()) = id);

-- courses
DROP POLICY IF EXISTS "Instructors can view their own courses" ON public.courses;
CREATE POLICY "Instructors can view their own courses" ON public.courses
  FOR SELECT USING (
    deleted_at IS NULL AND (
      (select auth.uid()) = instructor_id
      OR EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE id = (select auth.uid()) AND role IN ('admin', 'administrador')
      )
    )
  );

DROP POLICY IF EXISTS "Instructors can insert their own courses" ON public.courses;
CREATE POLICY "Instructors can insert their own courses" ON public.courses
  FOR INSERT WITH CHECK (
    (select auth.uid()) = instructor_id
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE id = (select auth.uid()) AND role IN ('admin', 'administrador')
    )
  );

DROP POLICY IF EXISTS "Instructors can update their own courses" ON public.courses;
CREATE POLICY "Instructors can update their own courses" ON public.courses
  FOR UPDATE USING (
    (select auth.uid()) = instructor_id
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE id = (select auth.uid()) AND role IN ('admin', 'administrador')
    )
  );

DROP POLICY IF EXISTS "Instructors can delete their own courses" ON public.courses;
CREATE POLICY "Instructors can delete their own courses" ON public.courses
  FOR DELETE USING (
    (select auth.uid()) = instructor_id
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE id = (select auth.uid()) AND role IN ('admin', 'administrador')
    )
  );

-- course_modules
DROP POLICY IF EXISTS "Anyone can view modules of published courses" ON public.course_modules;
CREATE POLICY "Anyone can view modules of published courses" ON public.course_modules
  FOR SELECT USING (
    deleted_at IS NULL AND (
      EXISTS (
        SELECT 1 FROM public.courses
        WHERE id = course_id AND status = 'published' AND deleted_at IS NULL
      )
      OR EXISTS (
        SELECT 1 FROM public.courses
        WHERE id = course_id AND instructor_id = (select auth.uid()) AND deleted_at IS NULL
      )
      OR EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE id = (select auth.uid()) AND role IN ('admin', 'administrador')
      )
    )
  );

DROP POLICY IF EXISTS "Instructors can manage their course modules" ON public.course_modules;
CREATE POLICY "Instructors can manage their course modules" ON public.course_modules
  FOR ALL USING (
    deleted_at IS NULL AND (
      EXISTS (
        SELECT 1 FROM public.courses
        WHERE id = course_id AND instructor_id = (select auth.uid())
      )
      OR EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE id = (select auth.uid()) AND role IN ('admin', 'administrador')
      )
    )
  );

-- lessons
DROP POLICY IF EXISTS "Enrolled students can view published lessons" ON public.lessons;
CREATE POLICY "Enrolled students can view published lessons" ON public.lessons
  FOR SELECT USING (
    deleted_at IS NULL AND (
      (
        is_published = true
        AND EXISTS (
          SELECT 1
          FROM public.course_modules cm
          JOIN public.course_enrollments ce ON cm.course_id = ce.course_id
          WHERE cm.id = module_id
            AND ce.student_id = (select auth.uid())
            AND cm.deleted_at IS NULL
        )
      )
      OR EXISTS (
        SELECT 1
        FROM public.course_modules cm
        JOIN public.courses c ON cm.course_id = c.id
        WHERE cm.id = module_id
          AND cm.deleted_at IS NULL
          AND c.deleted_at IS NULL
          AND (
            c.instructor_id = (select auth.uid())
            OR EXISTS (
              SELECT 1 FROM public.user_roles
              WHERE id = (select auth.uid()) AND role IN ('admin', 'administrador')
            )
          )
      )
    )
  );

DROP POLICY IF EXISTS "Instructors can manage their lessons" ON public.lessons;
CREATE POLICY "Instructors can manage their lessons" ON public.lessons
  FOR ALL USING (
    deleted_at IS NULL AND (
      EXISTS (
        SELECT 1
        FROM public.course_modules cm
        JOIN public.courses c ON cm.course_id = c.id
        WHERE cm.id = module_id
          AND (
            c.instructor_id = (select auth.uid())
            OR EXISTS (
              SELECT 1 FROM public.user_roles
              WHERE id = (select auth.uid()) AND role IN ('admin', 'administrador')
            )
          )
      )
    )
  );

-- lesson_blocks
DROP POLICY IF EXISTS "Enrolled students can view lesson blocks" ON public.lesson_blocks;
CREATE POLICY "Enrolled students can view lesson blocks" ON public.lesson_blocks
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.lessons l
      JOIN public.course_modules cm ON l.module_id = cm.id
      JOIN public.course_enrollments ce ON cm.course_id = ce.course_id
      WHERE l.id = lesson_id
        AND ce.student_id = (select auth.uid())
        AND l.is_published = true
        AND l.deleted_at IS NULL
        AND cm.deleted_at IS NULL
    )
    OR EXISTS (
      SELECT 1
      FROM public.lessons l
      JOIN public.course_modules cm ON l.module_id = cm.id
      JOIN public.courses c ON cm.course_id = c.id
      WHERE l.id = lesson_id
        AND (
          c.instructor_id = (select auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE id = (select auth.uid()) AND role IN ('admin', 'administrador')
          )
        )
    )
  );

DROP POLICY IF EXISTS "Instructors can manage lesson blocks" ON public.lesson_blocks;
CREATE POLICY "Instructors can manage lesson blocks" ON public.lesson_blocks
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM public.lessons l
      JOIN public.course_modules cm ON l.module_id = cm.id
      JOIN public.courses c ON cm.course_id = c.id
      WHERE l.id = lesson_id
        AND (
          c.instructor_id = (select auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE id = (select auth.uid()) AND role IN ('admin', 'administrador')
          )
        )
    )
  );

-- course_enrollments
DROP POLICY IF EXISTS "Users can view their own enrollments" ON public.course_enrollments;
CREATE POLICY "Users can view their own enrollments" ON public.course_enrollments
  FOR SELECT USING (
    (select auth.uid()) = student_id
    OR EXISTS (
      SELECT 1 FROM public.courses
      WHERE id = course_id AND instructor_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE id = (select auth.uid()) AND role IN ('admin', 'administrador')
    )
  );

DROP POLICY IF EXISTS "Users can enroll themselves" ON public.course_enrollments;
CREATE POLICY "Users can enroll themselves" ON public.course_enrollments
  FOR INSERT WITH CHECK ((select auth.uid()) = student_id);

DROP POLICY IF EXISTS "Users can update their own enrollments" ON public.course_enrollments;
CREATE POLICY "Users can update their own enrollments" ON public.course_enrollments
  FOR UPDATE USING ((select auth.uid()) = student_id);

-- lesson_progress
DROP POLICY IF EXISTS "Users can view their own progress" ON public.lesson_progress;
CREATE POLICY "Users can view their own progress" ON public.lesson_progress
  FOR SELECT USING ((select auth.uid()) = student_id);

DROP POLICY IF EXISTS "Users can insert their own progress" ON public.lesson_progress;
CREATE POLICY "Users can insert their own progress" ON public.lesson_progress
  FOR INSERT WITH CHECK ((select auth.uid()) = student_id);

DROP POLICY IF EXISTS "Users can update their own progress" ON public.lesson_progress;
CREATE POLICY "Users can update their own progress" ON public.lesson_progress
  FOR UPDATE USING ((select auth.uid()) = student_id);

-- course_progress
DROP POLICY IF EXISTS "Users can view their own course progress" ON public.course_progress;
CREATE POLICY "Users can view their own course progress" ON public.course_progress
  FOR SELECT USING ((select auth.uid()) = student_id);

DROP POLICY IF EXISTS "Users can manage their own course progress" ON public.course_progress;
CREATE POLICY "Users can manage their own course progress" ON public.course_progress
  FOR ALL USING ((select auth.uid()) = student_id)
  WITH CHECK ((select auth.uid()) = student_id);

-- activities, questions, answers, attempts
DROP POLICY IF EXISTS "Instructors can manage activities" ON public.activities;
CREATE POLICY "Instructors can manage activities" ON public.activities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE id = (select auth.uid()) AND role IN ('admin', 'administrador', 'profesor', 'instructor')
    )
  );

DROP POLICY IF EXISTS "Instructors can manage questions" ON public.activity_questions;
CREATE POLICY "Instructors can manage questions" ON public.activity_questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE id = (select auth.uid()) AND role IN ('admin', 'administrador', 'profesor', 'instructor')
    )
  );

DROP POLICY IF EXISTS "Instructors can manage answers" ON public.activity_answers;
CREATE POLICY "Instructors can manage answers" ON public.activity_answers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE id = (select auth.uid()) AND role IN ('admin', 'administrador', 'profesor', 'instructor')
    )
  );

DROP POLICY IF EXISTS "Users can view their own attempts" ON public.activity_attempts;
CREATE POLICY "Users can view their own attempts" ON public.activity_attempts
  FOR SELECT USING ((select auth.uid()) = student_id);

DROP POLICY IF EXISTS "Users can manage their own attempts" ON public.activity_attempts;
CREATE POLICY "Users can manage their own attempts" ON public.activity_attempts
  FOR ALL USING ((select auth.uid()) = student_id)
  WITH CHECK ((select auth.uid()) = student_id);

DROP POLICY IF EXISTS "Instructors can view attempts" ON public.activity_attempts;
CREATE POLICY "Instructors can view attempts" ON public.activity_attempts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE id = (select auth.uid()) AND role IN ('admin', 'administrador', 'profesor', 'instructor')
    )
  );

DROP POLICY IF EXISTS "Instructors can update attempts" ON public.activity_attempts;
CREATE POLICY "Instructors can update attempts" ON public.activity_attempts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE id = (select auth.uid()) AND role IN ('admin', 'administrador', 'profesor', 'instructor')
    )
  );

-- lesson_comments (also fix user_roles.id column reference)
DROP POLICY IF EXISTS "Author admin or instructor can delete" ON public.lesson_comments;
CREATE POLICY "Author admin or instructor can delete" ON public.lesson_comments
  FOR DELETE TO authenticated USING (
    (select auth.uid()) = user_id
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE id = (select auth.uid()) AND role IN ('admin', 'administrador', 'profesor', 'instructor')
    )
  );

-- Refresh planner statistics immediately
ANALYZE public.courses,
  public.course_modules,
  public.lessons,
  public.lesson_blocks,
  public.course_enrollments,
  public.lesson_progress,
  public.course_progress,
  public.activities,
  public.activity_questions,
  public.activity_answers,
  public.activity_attempts,
  public.lesson_notes,
  public.lesson_comments,
  public.user_roles;
