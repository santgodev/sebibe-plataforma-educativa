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
import { ProgressService } from '../services/progress.service';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

async function getVerifiedStaffClient() {
  const client = getSupabaseServerClient();
  const auth = await requireUser(client);
  if (!auth.data) throw new Error('Unauthorized');

  const adminClient = getSupabaseServerAdminClient();
  const { data: roleData } = await adminClient
    .from('user_roles')
    .select('role')
    .eq('id', auth.data.id)
    .maybeSingle();

  const role = roleData?.role;
  const isStaff =
    role === 'administrador' ||
    role === 'admin' ||
    role === 'profesor' ||
    role === 'instructor';

  if (!isStaff) {
    throw new Error('No tienes permisos para modificar las lecciones.');
  }

  return { client, adminClient, user: auth.data };
}

export const createLessonAction = enhanceAction(
  async (data) => {
    const { adminClient } = await getVerifiedStaffClient();
    const service = new LessonService(adminClient);

    const lesson = await service.createLesson(data);

    // Recalcular progreso de la materia para los estudiantes inscritos
    try {
      const { data: mod } = await adminClient
        .from('course_modules')
        .select('course_id')
        .eq('id', data.module_id)
        .maybeSingle();
      if (mod?.course_id) {
        const progressService = new ProgressService(adminClient);
        await progressService.recalculateCourseProgressForAllStudents(mod.course_id);
        revalidatePath('/home/courses');
      }
    } catch (err) {
      console.error('Error recalculating course progress on lesson create:', err);
    }

    return lesson;
  },
  {
    schema: CreateLessonSchema,
  },
);

export const updateLessonAction = enhanceAction(
  async (data) => {
    const { adminClient } = await getVerifiedStaffClient();
    const service = new LessonService(adminClient);

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
    const { adminClient } = await getVerifiedStaffClient();
    const service = new LessonService(adminClient);

    await service.reorderLessons(data.lessons);

    return { success: true };
  },
  {
    schema: ReorderLessonsSchema,
  },
);

export const deleteLessonAction = enhanceAction(
  async ({ id }) => {
    const { adminClient } = await getVerifiedStaffClient();
    const service = new LessonService(adminClient);

    let courseId: string | null = null;
    try {
      const { data: lessonRow } = await adminClient
        .from('lessons')
        .select('course_modules(course_id)')
        .eq('id', id)
        .maybeSingle();
      courseId = (lessonRow as any)?.course_modules?.course_id || null;
    } catch {
      // ignore lookup error
    }

    await service.deleteLesson(id);

    if (courseId) {
      try {
        const progressService = new ProgressService(adminClient);
        await progressService.recalculateCourseProgressForAllStudents(courseId);
        revalidatePath('/home/courses');
      } catch (err) {
        console.error('Error recalculating course progress on lesson delete:', err);
      }
    }

    return { success: true };
  },
  {
    schema: UpdateLessonSchema.pick({ id: true }),
  },
);
