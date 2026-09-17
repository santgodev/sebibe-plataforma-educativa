-- LMS v2 Schema Updates: Activities, Programs, Progress, and Certificates

-- 1. Drop old Quiz tables in favor of unified Activities
DROP TABLE IF EXISTS public.quiz_answers CASCADE;
DROP TABLE IF EXISTS public.quiz_questions CASCADE;
DROP TABLE IF EXISTS public.quizzes CASCADE;

-- 2. Enums
CREATE TYPE public.activity_type AS ENUM ('quick_quiz', 'reflection', 'practical', 'final_eval');
CREATE TYPE public.question_type AS ENUM ('single_choice', 'multiple_choice', 'true_false', 'open_text');

-- 3. Programs
CREATE TABLE public.programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    cover_image TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add program_id to courses
ALTER TABLE public.courses ADD COLUMN program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL;

-- 4. Unified Activities
CREATE TABLE public.activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- An activity can be tied to a lesson (Quick Quiz, Reflection) or to a Course directly (Final Eval)
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    type public.activity_type NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    instructions TEXT,
    passing_score INTEGER DEFAULT 70,
    max_attempts INTEGER,
    -- Specific configurations
    min_length_words INTEGER, -- for reflections
    allowed_file_types TEXT[], -- for practicals
    time_limit_minutes INTEGER, -- for final evals
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT activity_parent_check CHECK (lesson_id IS NOT NULL OR course_id IS NOT NULL)
);

CREATE TABLE public.activity_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
    type public.question_type NOT NULL DEFAULT 'single_choice',
    question_text TEXT NOT NULL,
    points INTEGER DEFAULT 1,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.activity_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES public.activity_questions(id) ON DELETE CASCADE,
    answer_text TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT false,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tracking & Progress
CREATE TABLE public.course_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    percentage_completed INTEGER DEFAULT 0,
    status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, course_id)
);

CREATE TABLE public.activity_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    score INTEGER,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'passed', 'failed', 'needs_grading')),
    answers_json JSONB, -- stores arbitrary text answers or selected choices
    file_url TEXT, -- for practicals
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(student_id, activity_id, attempt_number)
);

-- 6. Certificates
CREATE TABLE public.certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    verification_code TEXT NOT NULL UNIQUE,
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, course_id)
);

-- 7. RLS & Policies
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Programs
CREATE POLICY "Anyone can view programs" ON public.programs FOR SELECT USING (true);
CREATE POLICY "Instructors can manage programs" ON public.programs FOR ALL USING (EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role IN ('admin', 'instructor')));

-- Activities
CREATE POLICY "Enrolled students can view activities" ON public.activities FOR SELECT USING (true); -- simplify read for now
CREATE POLICY "Instructors can manage activities" ON public.activities FOR ALL USING (EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role IN ('admin', 'instructor')));

-- Activity Questions & Answers
CREATE POLICY "Enrolled students can view questions" ON public.activity_questions FOR SELECT USING (true);
CREATE POLICY "Instructors can manage questions" ON public.activity_questions FOR ALL USING (EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role IN ('admin', 'instructor')));

CREATE POLICY "Students can view answers" ON public.activity_answers FOR SELECT USING (true);
CREATE POLICY "Instructors can manage answers" ON public.activity_answers FOR ALL USING (EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role IN ('admin', 'instructor')));

-- Course Progress
CREATE POLICY "Users can view their own course progress" ON public.course_progress FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Users can manage their own course progress" ON public.course_progress FOR ALL USING (auth.uid() = student_id);

-- Activity Attempts
CREATE POLICY "Users can view their own attempts" ON public.activity_attempts FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Users can manage their own attempts" ON public.activity_attempts FOR ALL USING (auth.uid() = student_id);
CREATE POLICY "Instructors can view attempts" ON public.activity_attempts FOR SELECT USING (EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role IN ('admin', 'instructor')));
CREATE POLICY "Instructors can update attempts" ON public.activity_attempts FOR UPDATE USING (EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role IN ('admin', 'instructor')));

-- Certificates
CREATE POLICY "Anyone can view certificates" ON public.certificates FOR SELECT USING (true);
CREATE POLICY "System can create certificates" ON public.certificates FOR INSERT WITH CHECK (auth.uid() = student_id); -- simplified

-- 8. Triggers
CREATE TRIGGER update_programs_updated_at BEFORE UPDATE ON public.programs FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON public.activities FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_course_progress_updated_at BEFORE UPDATE ON public.course_progress FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
