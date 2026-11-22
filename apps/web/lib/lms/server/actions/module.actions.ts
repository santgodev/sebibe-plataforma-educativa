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
import { ProgressService } from '../services/progress.service';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export const createModuleAction = enhanceAction(
  async (data) => {
    const client = getSupabaseServerClient();
    const auth = await requireUser(client);
    if (!auth.data) throw new Error('Unauthorized');

    const service = new ModuleService(client);

    const module = await service.createModule(data);

    try {
      const progressService = new ProgressService(client);
      await progressService.recalculateCourseProgressForAllStudents(data.course_id);
      revalidatePath('/home/courses');
    } catch (err) {
      console.error('Error recalculating course progress on module create:', err);
    }

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

    let courseId: string | null = null;
    try {
      const adminClient = getSupabaseServerAdminClient();
      const { data: mod } = await adminClient
        .from('course_modules')
        .select('course_id')
        .eq('id', id)
        .maybeSingle();
      courseId = mod?.course_id || null;
    } catch {
      // ignore lookup error
    }

    await service.deleteModule(id);

    if (courseId) {
      try {
        const progressService = new ProgressService(client);
        await progressService.recalculateCourseProgressForAllStudents(courseId);
        revalidatePath('/home/courses');
      } catch (err) {
        console.error('Error recalculating course progress on module delete:', err);
      }
    }

    return { success: true };
  },
  {
    schema: UpdateModuleSchema.pick({ id: true }),
  },
);
