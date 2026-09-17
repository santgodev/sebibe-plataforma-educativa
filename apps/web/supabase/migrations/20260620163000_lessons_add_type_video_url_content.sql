-- Add type, video_url and content columns to lessons table
-- These fields allow direct storage of lesson content/type without using lesson_blocks

ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS content TEXT;
