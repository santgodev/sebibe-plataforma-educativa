import { z } from 'zod';

export const MarkLessonCompleteSchema = z.object({
  course_id: z.string().uuid(),
  lesson_id: z.string().uuid(),
});
