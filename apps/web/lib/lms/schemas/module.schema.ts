import { z } from 'zod';

export const CreateModuleSchema = z.object({
  course_id: z.string().uuid(),
  title: z.string().min(3).max(255),
  order_index: z.number().int().min(0),
});

export const UpdateModuleSchema = CreateModuleSchema.partial().extend({
  id: z.string().uuid(),
});

export const ReorderModulesSchema = z.object({
  modules: z.array(
    z.object({
      id: z.string().uuid(),
      order_index: z.number().int().min(0),
    }),
  ),
});
