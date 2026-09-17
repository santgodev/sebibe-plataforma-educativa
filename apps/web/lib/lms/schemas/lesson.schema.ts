import { z } from 'zod';

export const CreateLessonSchema = z.object({
  module_id: z.string().uuid(),
  title: z.string().min(3).max(255),
  duration_seconds: z.number().min(0).optional(),
  order_index: z.number().int().min(0),
  is_published: z.boolean().default(true),
});

export const UpdateLessonSchema = CreateLessonSchema.partial().extend({
  id: z.string().uuid(),
  type: z.string().optional(),
  video_url: z.string().optional(),
  content: z.string().optional(),
});

export const ReorderLessonsSchema = z.object({
  lessons: z.array(
    z.object({
      id: z.string().uuid(),
      order_index: z.number().int().min(0),
    }),
  ),
});

export const CreateLessonBlockSchema = z.object({
  lesson_id: z.string().uuid(),
  type: z.enum([
    'video',
    'text',
    'image',
    'quote',
    'pdf',
    'activity',
    'question',
    'button',
    'download',
  ]),
  content: z.any(),
  order_index: z.number().int().min(0),
});

export const UpdateLessonBlockSchema = CreateLessonBlockSchema.partial().extend(
  {
    id: z.string().uuid(),
  },
);

export const ReorderLessonBlocksSchema = z.object({
  blocks: z.array(
    z.object({
      id: z.string().uuid(),
      order_index: z.number().int().min(0),
    }),
  ),
});
