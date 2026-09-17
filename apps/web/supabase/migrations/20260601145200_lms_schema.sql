-- Enums
CREATE TYPE public.course_level AS ENUM ('beginner', 'intermediate', 'advanced', 'all_levels');
CREATE TYPE public.course_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE public.lesson_type AS ENUM ('video', 'text', 'pdf', 'external_resource', 'quiz');

-- 1. Create Tables

CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'instructor')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    short_description TEXT,
    long_description TEXT,
    thumbnail_url TEXT,
    level public.course_level DEFAULT 'all_levels',
    status public.course_status DEFAULT 'draft',
    instructor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    duration_minutes INTEGER DEFAULT 0,
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.course_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type public.lesson_type NOT NULL DEFAULT 'video',
    content TEXT,
    video_url TEXT,
    duration_seconds INTEGER DEFAULT 0,
    order_index INTEGER NOT NULL DEFAULT 0,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.lesson_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.course_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(course_id, student_id)
);

CREATE TABLE public.lesson_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    last_watched_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, lesson_id)
);

CREATE TABLE public.quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID UNIQUE NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    passing_score INTEGER DEFAULT 70,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.quiz_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
    answer_text TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT false,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable RLS

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;


-- 3. Create Policies

-- user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = id);

-- courses
CREATE POLICY "Anyone can view published courses" ON public.courses FOR SELECT USING (status = 'published');
CREATE POLICY "Instructors can view their own courses" ON public.courses FOR SELECT USING (auth.uid() = instructor_id OR EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Instructors can insert their own courses" ON public.courses FOR INSERT WITH CHECK (auth.uid() = instructor_id);
CREATE POLICY "Instructors can update their own courses" ON public.courses FOR UPDATE USING (auth.uid() = instructor_id OR EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Instructors can delete their own courses" ON public.courses FOR DELETE USING (auth.uid() = instructor_id OR EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role = 'admin'));

-- course_modules
CREATE POLICY "Anyone can view modules of published courses" ON public.course_modules FOR SELECT USING (EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND status = 'published') OR EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND instructor_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Instructors can manage their course modules" ON public.course_modules FOR ALL USING (EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND instructor_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role = 'admin'));

-- lessons
CREATE POLICY "Enrolled students can view published lessons" ON public.lessons FOR SELECT USING (is_published = true AND EXISTS (SELECT 1 FROM public.course_modules cm JOIN public.course_enrollments ce ON cm.course_id = ce.course_id WHERE cm.id = module_id AND ce.student_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.course_modules cm JOIN public.courses c ON cm.course_id = c.id WHERE cm.id = module_id AND (c.instructor_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role = 'admin'))));
CREATE POLICY "Instructors can manage their lessons" ON public.lessons FOR ALL USING (EXISTS (SELECT 1 FROM public.course_modules cm JOIN public.courses c ON cm.course_id = c.id WHERE cm.id = module_id AND (c.instructor_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role = 'admin'))));

-- lesson_resources
CREATE POLICY "Enrolled students can view lesson resources" ON public.lesson_resources FOR SELECT USING (EXISTS (SELECT 1 FROM public.lessons l JOIN public.course_modules cm ON l.module_id = cm.id JOIN public.course_enrollments ce ON cm.course_id = ce.course_id WHERE l.id = lesson_id AND ce.student_id = auth.uid() AND l.is_published = true) OR EXISTS (SELECT 1 FROM public.lessons l JOIN public.course_modules cm ON l.module_id = cm.id JOIN public.courses c ON cm.course_id = c.id WHERE l.id = lesson_id AND (c.instructor_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role = 'admin'))));
CREATE POLICY "Instructors can manage lesson resources" ON public.lesson_resources FOR ALL USING (EXISTS (SELECT 1 FROM public.lessons l JOIN public.course_modules cm ON l.module_id = cm.id JOIN public.courses c ON cm.course_id = c.id WHERE l.id = lesson_id AND (c.instructor_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role = 'admin'))));

-- course_enrollments
CREATE POLICY "Users can view their own enrollments" ON public.course_enrollments FOR SELECT USING (auth.uid() = student_id OR EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND instructor_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Users can enroll themselves" ON public.course_enrollments FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Users can update their own enrollments" ON public.course_enrollments FOR UPDATE USING (auth.uid() = student_id);

-- lesson_progress
CREATE POLICY "Users can view their own progress" ON public.lesson_progress FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Users can insert their own progress" ON public.lesson_progress FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Users can update their own progress" ON public.lesson_progress FOR UPDATE USING (auth.uid() = student_id);

-- quizzes
CREATE POLICY "Enrolled students can view quizzes" ON public.quizzes FOR SELECT USING (EXISTS (SELECT 1 FROM public.lessons l JOIN public.course_modules cm ON l.module_id = cm.id JOIN public.course_enrollments ce ON cm.course_id = ce.course_id WHERE l.id = lesson_id AND ce.student_id = auth.uid() AND l.is_published = true) OR EXISTS (SELECT 1 FROM public.lessons l JOIN public.course_modules cm ON l.module_id = cm.id JOIN public.courses c ON cm.course_id = c.id WHERE l.id = lesson_id AND (c.instructor_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role = 'admin'))));
CREATE POLICY "Instructors can manage quizzes" ON public.quizzes FOR ALL USING (EXISTS (SELECT 1 FROM public.lessons l JOIN public.course_modules cm ON l.module_id = cm.id JOIN public.courses c ON cm.course_id = c.id WHERE l.id = lesson_id AND (c.instructor_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role = 'admin'))));

-- quiz_questions
CREATE POLICY "Enrolled students can view quiz questions" ON public.quiz_questions FOR SELECT USING (EXISTS (SELECT 1 FROM public.quizzes q WHERE q.id = quiz_id AND (EXISTS (SELECT 1 FROM public.lessons l JOIN public.course_modules cm ON l.module_id = cm.id JOIN public.course_enrollments ce ON cm.course_id = ce.course_id WHERE l.id = q.lesson_id AND ce.student_id = auth.uid() AND l.is_published = true) OR EXISTS (SELECT 1 FROM public.lessons l JOIN public.course_modules cm ON l.module_id = cm.id JOIN public.courses c ON cm.course_id = c.id WHERE l.id = q.lesson_id AND (c.instructor_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role = 'admin'))))));
CREATE POLICY "Instructors can manage quiz questions" ON public.quiz_questions FOR ALL USING (EXISTS (SELECT 1 FROM public.quizzes q JOIN public.lessons l ON q.lesson_id = l.id JOIN public.course_modules cm ON l.module_id = cm.id JOIN public.courses c ON cm.course_id = c.id WHERE q.id = quiz_id AND (c.instructor_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role = 'admin'))));

-- quiz_answers
CREATE POLICY "Enrolled students can view quiz answers" ON public.quiz_answers FOR SELECT USING (EXISTS (SELECT 1 FROM public.quiz_questions qq JOIN public.quizzes q ON qq.quiz_id = q.id WHERE qq.id = question_id AND (EXISTS (SELECT 1 FROM public.lessons l JOIN public.course_modules cm ON l.module_id = cm.id JOIN public.course_enrollments ce ON cm.course_id = ce.course_id WHERE l.id = q.lesson_id AND ce.student_id = auth.uid() AND l.is_published = true) OR EXISTS (SELECT 1 FROM public.lessons l JOIN public.course_modules cm ON l.module_id = cm.id JOIN public.courses c ON cm.course_id = c.id WHERE l.id = q.lesson_id AND (c.instructor_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role = 'admin'))))));
CREATE POLICY "Instructors can manage quiz answers" ON public.quiz_answers FOR ALL USING (EXISTS (SELECT 1 FROM public.quiz_questions qq JOIN public.quizzes q ON qq.quiz_id = q.id JOIN public.lessons l ON q.lesson_id = l.id JOIN public.course_modules cm ON l.module_id = cm.id JOIN public.courses c ON cm.course_id = c.id WHERE qq.id = question_id AND (c.instructor_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role = 'admin'))));


-- 4. Triggers for updated_at

CREATE OR REPLACE FUNCTION update_modified_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ language 'plpgsql';

CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON public.user_roles FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_course_modules_updated_at BEFORE UPDATE ON public.course_modules FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON public.lessons FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_lesson_progress_updated_at BEFORE UPDATE ON public.lesson_progress FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_quizzes_updated_at BEFORE UPDATE ON public.quizzes FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
