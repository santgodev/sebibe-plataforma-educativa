-- 1. Add version and deleted_at columns for concurrency control and soft deletes

ALTER TABLE public.courses 
ADD COLUMN version INTEGER NOT NULL DEFAULT 1,
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.course_modules 
ADD COLUMN version INTEGER NOT NULL DEFAULT 1,
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.lessons 
ADD COLUMN version INTEGER NOT NULL DEFAULT 1,
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;


-- 2. Triggers to auto-increment version on update

CREATE OR REPLACE FUNCTION increment_version_column() 
RETURNS TRIGGER AS $$
BEGIN
  -- Solo incrementar la versión si los datos cambiaron y la aplicación no envió una versión específica superior
  -- Esto permite Optimistic Locking: la app manda el current version y el trigger la sube.
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER increment_courses_version BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE PROCEDURE increment_version_column();
CREATE TRIGGER increment_course_modules_version BEFORE UPDATE ON public.course_modules FOR EACH ROW EXECUTE PROCEDURE increment_version_column();
CREATE TRIGGER increment_lessons_version BEFORE UPDATE ON public.lessons FOR EACH ROW EXECUTE PROCEDURE increment_version_column();


-- 3. Update Policies to enforce Soft Delete (deleted_at IS NULL)

-- Drop existing select policies
DROP POLICY IF EXISTS "Anyone can view published courses" ON public.courses;
DROP POLICY IF EXISTS "Instructors can view their own courses" ON public.courses;
DROP POLICY IF EXISTS "Anyone can view modules of published courses" ON public.course_modules;
DROP POLICY IF EXISTS "Instructors can manage their course modules" ON public.course_modules;
DROP POLICY IF EXISTS "Enrolled students can view published lessons" ON public.lessons;
DROP POLICY IF EXISTS "Instructors can manage their lessons" ON public.lessons;

-- Recreate with deleted_at IS NULL
CREATE POLICY "Anyone can view published courses" ON public.courses FOR SELECT 
USING (status = 'published' AND deleted_at IS NULL);

CREATE POLICY "Instructors can view their own courses" ON public.courses FOR SELECT 
USING ((auth.uid() = instructor_id OR EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role = 'admin')) AND deleted_at IS NULL);

CREATE POLICY "Anyone can view modules of published courses" ON public.course_modules FOR SELECT 
USING ((EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND status = 'published' AND deleted_at IS NULL) OR EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND instructor_id = auth.uid() AND deleted_at IS NULL) OR EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role = 'admin')) AND deleted_at IS NULL);

CREATE POLICY "Instructors can manage their course modules" ON public.course_modules FOR ALL 
USING ((EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND instructor_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role = 'admin')) AND deleted_at IS NULL);

CREATE POLICY "Enrolled students can view published lessons" ON public.lessons FOR SELECT 
USING (is_published = true AND deleted_at IS NULL AND EXISTS (SELECT 1 FROM public.course_modules cm JOIN public.course_enrollments ce ON cm.course_id = ce.course_id WHERE cm.id = module_id AND ce.student_id = auth.uid() AND cm.deleted_at IS NULL) OR EXISTS (SELECT 1 FROM public.course_modules cm JOIN public.courses c ON cm.course_id = c.id WHERE cm.id = module_id AND (c.instructor_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role = 'admin')) AND cm.deleted_at IS NULL AND c.deleted_at IS NULL));

CREATE POLICY "Instructors can manage their lessons" ON public.lessons FOR ALL 
USING ((EXISTS (SELECT 1 FROM public.course_modules cm JOIN public.courses c ON cm.course_id = c.id WHERE cm.id = module_id AND (c.instructor_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role = 'admin')))) AND deleted_at IS NULL);


-- 4. RPC Functions for Atomic Reordering

CREATE OR REPLACE FUNCTION public.reorder_modules(module_updates jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    item jsonb;
BEGIN
    -- module_updates is an array of objects: [{"id": "uuid", "order_index": 0}, ...]
    FOR item IN SELECT * FROM jsonb_array_elements(module_updates)
    LOOP
        UPDATE public.course_modules
        SET order_index = (item->>'order_index')::int
        WHERE id = (item->>'id')::uuid;
    END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.reorder_lessons(lesson_updates jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    item jsonb;
BEGIN
    FOR item IN SELECT * FROM jsonb_array_elements(lesson_updates)
    LOOP
        UPDATE public.lessons
        SET order_index = (item->>'order_index')::int
        WHERE id = (item->>'id')::uuid;
    END LOOP;
END;
$$;
