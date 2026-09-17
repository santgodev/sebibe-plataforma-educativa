'use server';

import { revalidatePath } from 'next/cache';

import { z } from 'zod';

import { enhanceAction } from '@kit/next/actions';
import { requireUser } from '@kit/supabase/require-user';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import {
  CreateModuleSchema,
  ReorderModulesSchema,
  UpdateModuleSchema,
} from '../../schemas/module.schema';
import { ModuleService } from '../services/module.service';

export const createModuleAction = enhanceAction(
  async (data) => {
    const client = getSupabaseServerClient();
    const auth = await requireUser(client);
    if (!auth.data) throw new Error('Unauthorized');

    const service = new ModuleService(client);

    const module = await service.createModule(data);

    revalidatePath(`/home/admin-courses/${data.course_id}`);
    return module;
  },
  {
    schema: CreateModuleSchema,
  },
);

export const updateModuleAction = enhanceAction(
  async (data) => {
    const client = getSupabaseServerClient();
    const auth = await requireUser(client);
    if (!auth.data) throw new Error('Unauthorized');

    const service = new ModuleService(client);

    const { id, expected_version, ...updateData } = data as any;
    const module = await service.updateModule(
      id as string,
      { ...updateData, expected_version },
    );

    return module;
  },
  {
    schema: UpdateModuleSchema.extend({
      expected_version: z.number().optional(),
    }),
  },
);

export const reorderModulesAction = enhanceAction(
  async (data) => {
    const client = getSupabaseServerClient();
    await requireUser(client);
    const service = new ModuleService(client);

    await service.reorderModules(data.modules);

    return { success: true };
  },
  {
    schema: ReorderModulesSchema,
  },
);

export const deleteModuleAction = enhanceAction(
  async ({ id }) => {
    const client = getSupabaseServerClient();
    await requireUser(client);
    const service = new ModuleService(client);

    await service.deleteModule(id);
    return { success: true };
  },
  {
    schema: UpdateModuleSchema.pick({ id: true }),
  },
);
