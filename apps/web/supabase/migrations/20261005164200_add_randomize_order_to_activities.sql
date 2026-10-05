-- Add randomize_order column to activities
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS randomize_order BOOLEAN DEFAULT false;
