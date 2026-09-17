'use server';

import { revalidatePath } from 'next/cache';

import { z } from 'zod';

import { enhanceAction } from '@kit/next/actions';
import { requireUser } from '@kit/supabase/require-user';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import {
  CreateCourseSchema,
  UpdateCourseSchema,
} from '../../schemas/course.schema';
import { CourseService } from '../services/course.service';

export const createCourseAction = enhanceAction(
  async (data) => {
    const client = getSupabaseServerClient();
    const auth = await requireUser(client);
    const user = auth.data;

    if (!user) throw new Error('Unauthorized');

    const adminClient = getSupabaseServerAdminClient();
    const service = new CourseService(adminClient);

    const course = await service.createCourse({
      ...data,
      instructor_id: user.id,
    });

    revalidatePath('/home/admin-courses');
    return course;
  },
  {
    schema: CreateCourseSchema,
  },
);

export const publishCourseAction = enhanceAction(
  async ({ id }) => {
    const client = getSupabaseServerClient();
    await requireUser(client);
    const adminClient = getSupabaseServerAdminClient();
    const service = new CourseService(adminClient);

    const course = await service.publishCourse(id);
    revalidatePath('/home/admin-courses');
    revalidatePath(`/home/admin-courses/${id}`);

    return course;
  },
  {
    schema: UpdateCourseSchema.pick({ id: true }),
  },
);

export const unpublishCourseAction = enhanceAction(
  async ({ id }) => {
    const client = getSupabaseServerClient();
    await requireUser(client);
    const adminClient = getSupabaseServerAdminClient();
    const service = new CourseService(adminClient);

    const course = await service.updateCourse(id, { status: 'draft' });
    revalidatePath('/home/admin-courses');
    revalidatePath(`/home/admin-courses/${id}`);

    return course;
  },
  {
    schema: UpdateCourseSchema.pick({ id: true }),
  },
);

export const updateCourseAction = enhanceAction(
  async (data) => {
    const client = getSupabaseServerClient();
    await requireUser(client);
    const adminClient = getSupabaseServerAdminClient();
    const service = new CourseService(adminClient);

    const { id, expected_version, ...updates } = data as any;
    const course = await service.updateCourse(id, updates, expected_version);

    revalidatePath('/home/admin-courses');
    revalidatePath(`/home/admin-courses/${id}`);

    return course;
  },
  {
    schema: UpdateCourseSchema.extend({
      expected_version: z.number().optional(),
    }),
  },
);
