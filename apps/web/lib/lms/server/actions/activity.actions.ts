'use server';

import { revalidatePath } from 'next/cache';

import { enhanceAction } from '@kit/next/actions';
import { requireUser } from '@kit/supabase/require-user';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import { CreateActivitySchema, UpdateActivitySchema } from '../../schemas/activity.schema';
import { ActivityService } from '../services/activity.service';

export const createActivityAction = enhanceAction(
  async (data) => {
    const client = getSupabaseServerClient();
    const auth = await requireUser(client);
    if (!auth.data) throw new Error('Unauthorized');

    const service = new ActivityService(client);
    
    const { questions, ...activityData } = data;

    const activity = await service.createActivity(activityData, questions);

    return activity;
  },
  {
    schema: CreateActivitySchema,
  },
);

export const updateActivityAction = enhanceAction(
  async (data) => {
    const client = getSupabaseServerClient();
    const auth = await requireUser(client);
    if (!auth.data) throw new Error('Unauthorized');

    const service = new ActivityService(client);
    
    const { id, questions, ...activityData } = data;

    const activity = await service.updateActivity(id, activityData, questions);

    return activity;
  },
  {
    schema: UpdateActivitySchema,
  },
);

import { SubmitActivityAttemptSchema } from '../../schemas/activity.schema';

import { z } from 'zod';

export const getFullActivityAction = enhanceAction(
  async (data) => {
    const client = getSupabaseServerClient();
    const auth = await requireUser(client);
    if (!auth.data) throw new Error('Unauthorized');

    const service = new ActivityService(client);
    const activity = await service.getFullActivity(data.id);
    return {
      ...activity,
      currentUserId: auth.data.id,
    };
  },
  {
    schema: z.object({ id: z.string().uuid() }),
  },
);

export const getActivityAttemptsAction = enhanceAction(
  async (data) => {
    const client = getSupabaseServerClient();
    const auth = await requireUser(client);
    if (!auth.data) throw new Error('Unauthorized');

    const service = new ActivityService(client);
    return service.getActivityAttempts(data.activity_id, auth.data.id);
  },
  {
    schema: z.object({ activity_id: z.string().uuid() }),
  },
);

export const submitActivityAttemptAction = enhanceAction(
  async (data) => {
    const client = getSupabaseServerClient();
    const auth = await requireUser(client);
    if (!auth.data) throw new Error('Unauthorized');

    const service = new ActivityService(client);

    return service.evaluateQuiz(data.activity_id, auth.data.id, data.answers);
  },
  {
    schema: SubmitActivityAttemptSchema,
  },
);

export const gradeActivityAttemptAction = enhanceAction(
  async (data) => {
    const client = getSupabaseServerClient();
    const auth = await requireUser(client);
    if (!auth.data) throw new Error('Unauthorized');

    const adminClient = getSupabaseServerAdminClient();

    // Check roles
    const { data: roles } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('id', auth.data.id);

    const roleNames = (roles || []).map((r) => r.role);
    const isTeacherOrAdmin =
      roleNames.includes('admin') ||
      roleNames.includes('administrador') ||
      roleNames.includes('profesor') ||
      roleNames.includes('instructor');

    if (!isTeacherOrAdmin) {
      throw new Error('No tienes permisos de profesor o administrador para calificar esta evaluación.');
    }

    const { attempt_id, score, status } = data;
    const roundedScore = Math.round(Math.max(0, Math.min(100, score)));
    const finalStatus = status || (roundedScore >= 70 ? 'passed' : 'failed');

    const { data: updatedAttempt, error } = await adminClient
      .from('activity_attempts')
      .update({
        score: roundedScore,
        status: finalStatus,
      })
      .eq('id', attempt_id)
      .select('*, activities(course_id, passing_score)')
      .single();

    if (error) {
      console.error('Error grading attempt:', error);
      throw new Error(`Error al guardar la calificación: ${error.message}`);
    }

    // Revalidate paths so grades update immediately
    const courseId = (updatedAttempt.activities as any)?.course_id;
    if (courseId) {
      revalidatePath(`/home/admin-courses/${courseId}`);
    }
    revalidatePath('/home/grades');
    revalidatePath(`/home/admin-users/${updatedAttempt.student_id}`);

    return updatedAttempt;
  },
  {
    schema: z.object({
      attempt_id: z.string().uuid(),
      score: z.number().min(0).max(100),
      status: z.enum(['passed', 'failed', 'needs_grading']).optional(),
    }),
  }
);

