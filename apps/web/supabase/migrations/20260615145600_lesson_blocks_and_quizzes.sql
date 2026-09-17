-- 1. Modify question_type enum
ALTER TYPE public.question_type RENAME TO question_type_old;
CREATE TYPE public.question_type AS ENUM ('single_choice', 'multiple_choice', 'true_false', 'open_text', 'matching', 'fill_blank', 'order_steps');
ALTER TABLE public.activity_questions ALTER COLUMN type DROP DEFAULT;
ALTER TABLE public.activity_questions ALTER COLUMN type TYPE public.question_type USING type::text::public.question_type;
ALTER TABLE public.activity_questions ALTER COLUMN type SET DEFAULT 'single_choice'::public.question_type;
DROP TYPE public.question_type_old;

-- 2. Create block_type enum
CREATE TYPE public.block_type AS ENUM ('video', 'text', 'image', 'quote', 'pdf', 'activity', 'question', 'button', 'download');

-- 3. Create lesson_blocks table
CREATE TABLE public.lesson_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    type public.block_type NOT NULL,
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enable RLS and add policies for lesson_blocks
ALTER TABLE public.lesson_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enrolled students can view lesson blocks" ON public.lesson_blocks FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.lessons l 
        JOIN public.course_modules cm ON l.module_id = cm.id 
        JOIN public.course_enrollments ce ON cm.course_id = ce.course_id 
        WHERE l.id = lesson_id AND ce.student_id = auth.uid() AND l.is_published = true
    ) OR EXISTS (
        SELECT 1 FROM public.lessons l 
        JOIN public.course_modules cm ON l.module_id = cm.id 
        JOIN public.courses c ON cm.course_id = c.id 
        WHERE l.id = lesson_id AND (c.instructor_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role = 'admin'))
    )
);

CREATE POLICY "Instructors can manage lesson blocks" ON public.lesson_blocks FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.lessons l 
        JOIN public.course_modules cm ON l.module_id = cm.id 
        JOIN public.courses c ON cm.course_id = c.id 
        WHERE l.id = lesson_id AND (c.instructor_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role = 'admin'))
    )
);

-- 5. Trigger for updated_at
CREATE TRIGGER update_lesson_blocks_updated_at BEFORE UPDATE ON public.lesson_blocks FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- 6. Add columns to activities and questions
ALTER TABLE public.activity_questions ADD COLUMN feedback_text TEXT;
ALTER TABLE public.activities ADD COLUMN automatic_feedback_enabled BOOLEAN DEFAULT false;

-- 7. Migrate existing lessons to blocks (Optional data migration, doing it here to not lose data)
INSERT INTO public.lesson_blocks (lesson_id, type, content, order_index)
SELECT id, 'video'::public.block_type, jsonb_build_object('url', video_url), 0
FROM public.lessons
WHERE video_url IS NOT NULL AND video_url != '';

INSERT INTO public.lesson_blocks (lesson_id, type, content, order_index)
SELECT id, 'text'::public.block_type, jsonb_build_object('html', content), 1
FROM public.lessons
WHERE content IS NOT NULL AND content != '';

-- 8. Drop old columns from lessons
ALTER TABLE public.lessons DROP COLUMN content;
ALTER TABLE public.lessons DROP COLUMN video_url;
ALTER TABLE public.lessons DROP COLUMN type;
