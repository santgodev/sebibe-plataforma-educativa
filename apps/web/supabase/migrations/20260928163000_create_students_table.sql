-- Create students table
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    document_id TEXT NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    birth_date DATE NOT NULL,
    phone TEXT NOT NULL,
    church TEXT NOT NULL,
    city TEXT NOT NULL,
    institutional_email TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can do everything on students" ON public.students
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_roles.id = auth.uid() AND user_roles.role = 'administrador'
    )
  );
  
CREATE POLICY "Users can read own student record" ON public.students
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
