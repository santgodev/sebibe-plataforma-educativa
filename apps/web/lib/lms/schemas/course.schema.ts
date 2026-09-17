import { z } from 'zod';

export const CreateCourseSchema = z.object({
  title: z.string().min(3).max(255),
  slug: z.string().min(3).max(255),
  short_description: z.string().optional(),
  long_description: z.string().optional(),
  thumbnail_url: z.string().url().optional().or(z.literal('')),
  level: z
    .enum(['beginner', 'intermediate', 'advanced', 'all_levels'])
    .default('all_levels'),
  duration_minutes: z.number().min(0).optional(),
  category: z.string().optional(),
});

export const UpdateCourseSchema = CreateCourseSchema.partial().extend({
  id: z.string().uuid(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
});
