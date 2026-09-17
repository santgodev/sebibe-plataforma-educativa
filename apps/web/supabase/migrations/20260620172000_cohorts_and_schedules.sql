-- FASE 1: Cohortes, Semestres y Bloques

-- 1. Modificar tabla courses
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS credits integer DEFAULT 3;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS duration_weeks integer DEFAULT 2;

-- 2. Tabla academic_periods (Semestres)
CREATE TABLE IF NOT EXISTS public.academic_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- Ej: '2025-1'
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.academic_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read academic periods" ON public.academic_periods FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage academic periods" ON public.academic_periods FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role = 'admin')
);

-- 3. Tabla cohorts (Grupos)
CREATE TABLE IF NOT EXISTS public.cohorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- Ej: 'Grupo 1'
  period_id UUID NOT NULL REFERENCES public.academic_periods(id) ON DELETE CASCADE,
  program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.cohorts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read cohorts" ON public.cohorts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage cohorts" ON public.cohorts FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role = 'admin')
);

-- 4. Tabla cohort_enrollments (Alumnos en grupos)
CREATE TABLE IF NOT EXISTS public.cohort_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id UUID NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cohort_id, student_id)
);

ALTER TABLE public.cohort_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students can read their own cohort enrollments" ON public.cohort_enrollments FOR SELECT TO authenticated USING (
  student_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role IN ('admin', 'profesor'))
);
CREATE POLICY "Admins can manage cohort enrollments" ON public.cohort_enrollments FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role = 'admin')
);

-- 5. Tabla cohort_schedules (Cronograma de clases exclusivas)
CREATE TABLE IF NOT EXISTS public.cohort_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id UUID NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.cohort_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read cohort schedules" ON public.cohort_schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage cohort schedules" ON public.cohort_schedules FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role = 'admin')
);

-- Roles grants
GRANT ALL ON public.academic_periods TO authenticated;
GRANT ALL ON public.cohorts TO authenticated;
GRANT ALL ON public.cohort_enrollments TO authenticated;
GRANT ALL ON public.cohort_schedules TO authenticated;
