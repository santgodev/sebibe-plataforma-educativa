-- Drop constraint
DO $$ 
DECLARE 
    constraint_name text; 
BEGIN 
    SELECT conname INTO constraint_name FROM pg_constraint WHERE conrelid = 'public.user_roles'::regclass AND contype = 'c'; 
    IF constraint_name IS NOT NULL THEN 
        EXECUTE 'ALTER TABLE public.user_roles DROP CONSTRAINT ' || constraint_name; 
    END IF; 
END $$;

-- Update existing roles
UPDATE public.user_roles SET role = 'administrador' WHERE role = 'admin';
UPDATE public.user_roles SET role = 'profesor' WHERE role = 'instructor';

-- Add new constraint
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_role_check CHECK (role IN ('administrador', 'profesor', 'alumno'));

-- Drop old policies
DROP POLICY IF EXISTS "Instructors can view their own courses" ON public.courses;
DROP POLICY IF EXISTS "Instructors can update their own courses" ON public.courses;
DROP POLICY IF EXISTS "Instructors can delete their own courses" ON public.courses;
DROP POLICY IF EXISTS "Anyone can view modules of published courses" ON public.course_modules;
DROP POLICY IF EXISTS "Instructors can manage their course modules" ON public.course_modules;
DROP POLICY IF EXISTS "Enrolled students can view published lessons" ON public.lessons;
DROP POLICY IF EXISTS "Instructors can manage their lessons" ON public.lessons;
DROP POLICY IF EXISTS "Enrolled students can view lesson resources" ON public.lesson_resources;
DROP POLICY IF EXISTS "Instructors can manage lesson resources" ON public.lesson_resources;
DROP POLICY IF EXISTS "Users can view their own enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "Enrolled students can view quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Instructors can manage quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Enrolled students can view quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Instructors can manage quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Enrolled students can view quiz answers" ON public.quiz_answers;
DROP POLICY IF EXISTS "Instructors can manage quiz answers" ON public.quiz_answers;
DROP POLICY IF EXISTS "Instructors can manage programs" ON public.programs;
DROP POLICY IF EXISTS "Instructors can manage activities" ON public.activities;
DROP POLICY IF EXISTS "Instructors can manage questions" ON public.activity_questions;
DROP POLICY IF EXISTS "Instructors can manage answers" ON public.activity_answers;
DROP POLICY IF EXISTS "Instructors can view attempts" ON public.activity_attempts;
DROP POLICY IF EXISTS "Instructors can update attempts" ON public.activity_attempts;

-- Create new policies
CREATE POLICY "Instructors can view their own courses" ON public.courses FOR SELECT USING (auth.uid() = instructor_id OR EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role = 'administrador'));
CREATE POLICY "Instructors can update their own courses" ON public.courses FOR UPDATE USING (auth.uid() = instructor_id OR EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role = 'administrador'));
CREATE POLICY "Instructors can delete their own courses" ON public.courses FOR DELETE USING (auth.uid() = instructor_id OR EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role = 'administrador'));
CREATE POLICY "Anyone can view modules of published courses" ON public.course_modules FOR SELECT USING (EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND status = 'published') OR EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND instructor_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role = 'administrador'));
CREATE POLICY "Instructors can manage their course modules" ON public.course_modules FOR ALL USING (EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND instructor_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role = 'administrador'));
CREATE POLICY "Enrolled students can view published lessons" ON public.lessons FOR SELECT USING (is_published = true AND EXISTS (SELECT 1 FROM public.course_modules cm JOIN public.course_enrollments ce ON cm.course_id = ce.course_id WHERE cm.id = module_id AND ce.student_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.course_modules cm JOIN public.courses c ON cm.course_id = c.id WHERE cm.id = module_id AND (c.instructor_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role = 'administrador'))));
CREATE POLICY "Instructors can manage their lessons" ON public.lessons FOR ALL USING (EXISTS (SELECT 1 FROM public.course_modules cm JOIN public.courses c ON cm.course_id = c.id WHERE cm.id = module_id AND (c.instructor_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role = 'administrador'))));
CREATE POLICY "Enrolled students can view lesson resources" ON public.lesson_resources FOR SELECT USING (EXISTS (SELECT 1 FROM public.lessons l JOIN public.course_modules cm ON l.module_id = cm.id JOIN public.course_enrollments ce ON cm.course_id = ce.course_id WHERE l.id = lesson_id AND ce.student_id = auth.uid() AND l.is_published = true) OR EXISTS (SELECT 1 FROM public.lessons l JOIN public.course_modules cm ON l.module_id = cm.id JOIN public.courses c ON cm.course_id = c.id WHERE l.id = lesson_id AND (c.instructor_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role = 'administrador'))));
CREATE POLICY "Instructors can manage lesson resources" ON public.lesson_resources FOR ALL USING (EXISTS (SELECT 1 FROM public.lessons l JOIN public.course_modules cm ON l.module_id = cm.id JOIN public.courses c ON cm.course_id = c.id WHERE l.id = lesson_id AND (c.instructor_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role = 'administrador'))));
CREATE POLICY "Users can view their own enrollments" ON public.course_enrollments FOR SELECT USING (auth.uid() = student_id OR EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND instructor_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role = 'administrador'));
CREATE POLICY "Enrolled students can view quizzes" ON public.quizzes FOR SELECT USING (EXISTS (SELECT 1 FROM public.lessons l JOIN public.course_modules cm ON l.module_id = cm.id JOIN public.course_enrollments ce ON cm.course_id = ce.course_id WHERE l.id = lesson_id AND ce.student_id = auth.uid() AND l.is_published = true) OR EXISTS (SELECT 1 FROM public.lessons l JOIN public.course_modules cm ON l.module_id = cm.id JOIN public.courses c ON cm.course_id = c.id WHERE l.id = lesson_id AND (c.instructor_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role = 'administrador'))));
CREATE POLICY "Instructors can manage quizzes" ON public.quizzes FOR ALL USING (EXISTS (SELECT 1 FROM public.lessons l JOIN public.course_modules cm ON l.module_id = cm.id JOIN public.courses c ON cm.course_id = c.id WHERE l.id = lesson_id AND (c.instructor_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role = 'administrador'))));
CREATE POLICY "Enrolled students can view quiz questions" ON public.quiz_questions FOR SELECT USING (EXISTS (SELECT 1 FROM public.quizzes q WHERE q.id = quiz_id AND (EXISTS (SELECT 1 FROM public.lessons l JOIN public.course_modules cm ON l.module_id = cm.id JOIN public.course_enrollments ce ON cm.course_id = ce.course_id WHERE l.id = q.lesson_id AND ce.student_id = auth.uid() AND l.is_published = true) OR EXISTS (SELECT 1 FROM public.lessons l JOIN public.course_modules cm ON l.module_id = cm.id JOIN public.courses c ON cm.course_id = c.id WHERE l.id = q.lesson_id AND (c.instructor_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role = 'administrador'))))));
CREATE POLICY "Instructors can manage quiz questions" ON public.quiz_questions FOR ALL USING (EXISTS (SELECT 1 FROM public.quizzes q JOIN public.lessons l ON q.lesson_id = l.id JOIN public.course_modules cm ON l.module_id = cm.id JOIN public.courses c ON cm.course_id = c.id WHERE q.id = quiz_id AND (c.instructor_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role = 'administrador'))));
CREATE POLICY "Enrolled students can view quiz answers" ON public.quiz_answers FOR SELECT USING (EXISTS (SELECT 1 FROM public.quiz_questions qq JOIN public.quizzes q ON qq.quiz_id = q.id WHERE qq.id = question_id AND (EXISTS (SELECT 1 FROM public.lessons l JOIN public.course_modules cm ON l.module_id = cm.id JOIN public.course_enrollments ce ON cm.course_id = ce.course_id WHERE l.id = q.lesson_id AND ce.student_id = auth.uid() AND l.is_published = true) OR EXISTS (SELECT 1 FROM public.lessons l JOIN public.course_modules cm ON l.module_id = cm.id JOIN public.courses c ON cm.course_id = c.id WHERE l.id = q.lesson_id AND (c.instructor_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role = 'administrador'))))));
CREATE POLICY "Instructors can manage quiz answers" ON public.quiz_answers FOR ALL USING (EXISTS (SELECT 1 FROM public.quiz_questions qq JOIN public.quizzes q ON qq.quiz_id = q.id JOIN public.lessons l ON q.lesson_id = l.id JOIN public.course_modules cm ON l.module_id = cm.id JOIN public.courses c ON cm.course_id = c.id WHERE qq.id = question_id AND (c.instructor_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role = 'administrador'))));
CREATE POLICY "Instructors can manage programs" ON public.programs FOR ALL USING (EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role IN ('administrador', 'profesor')));
CREATE POLICY "Instructors can manage activities" ON public.activities FOR ALL USING (EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role IN ('administrador', 'profesor')));
CREATE POLICY "Instructors can manage questions" ON public.activity_questions FOR ALL USING (EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role IN ('administrador', 'profesor')));
CREATE POLICY "Instructors can manage answers" ON public.activity_answers FOR ALL USING (EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role IN ('administrador', 'profesor')));
CREATE POLICY "Instructors can view attempts" ON public.activity_attempts FOR SELECT USING (EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role IN ('administrador', 'profesor')));
CREATE POLICY "Instructors can update attempts" ON public.activity_attempts FOR UPDATE USING (EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role IN ('administrador', 'profesor')));
