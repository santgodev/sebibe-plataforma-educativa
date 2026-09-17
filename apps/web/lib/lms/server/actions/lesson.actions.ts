'use server';

import { revalidatePath } from 'next/cache';

import sanitizeHtml from 'sanitize-html';
import { z } from 'zod';

import { enhanceAction } from '@kit/next/actions';
import { requireUser } from '@kit/supabase/require-user';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import {
  CreateLessonSchema,
  ReorderLessonsSchema,
  UpdateLessonSchema,
} from '../../schemas/lesson.schema';
import { LessonService } from '../services/lesson.service';

export const createLessonAction = enhanceAction(
  async (data) => {
    const client = getSupabaseServerClient();
    const auth = await requireUser(client);
    if (!auth.data) throw new Error('Unauthorized');

    const service = new LessonService(client);

    const lesson = await service.createLesson(data);

    // Revalidation usually happens at the course level in the UI
    return lesson;
  },
  {
    schema: CreateLessonSchema,
  },
);

export const updateLessonAction = enhanceAction(
  async (data) => {
    const client = getSupabaseServerClient();
    const auth = await requireUser(client);
    if (!auth.data) throw new Error('Unauthorized');

    const service = new LessonService(client);

    const { id, expected_version, ...updateData } = data as any;

    try {
      const lesson = await service.updateLesson(
        id as string,
        { ...updateData, expected_version },
      );
      return lesson;
    } catch (error) {
      console.error('[updateLessonAction ERROR]:', error);
      throw error;
    }
  },
  {
    schema: UpdateLessonSchema.extend({
      expected_version: z.number().optional(),
    }),
  },
);

export const reorderLessonsAction = enhanceAction(
  async (data) => {
    const client = getSupabaseServerClient();
    await requireUser(client);
    const service = new LessonService(client);

    await service.reorderLessons(data.lessons);

    return { success: true };
  },
  {
    schema: ReorderLessonsSchema,
  },
);

export const deleteLessonAction = enhanceAction(
  async ({ id }) => {
    const client = getSupabaseServerClient();
    await requireUser(client);
    const service = new LessonService(client);

    await service.deleteLesson(id);
    return { success: true };
  },
  {
    schema: UpdateLessonSchema.pick({ id: true }),
  },
);
