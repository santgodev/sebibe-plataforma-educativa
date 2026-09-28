ALTER TABLE public.students 
ADD COLUMN semester INTEGER NOT NULL DEFAULT 1,
ADD COLUMN modality TEXT NOT NULL DEFAULT 'presencial' CHECK (modality IN ('presencial', 'virtual'));
