'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

import { enhanceAction } from '@kit/next/actions';
import { requireUser } from '@kit/supabase/require-user';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import { CreateActivitySchema, UpdateActivitySchema } from '../../schemas/activity.schema';
import { ActivityService } from '../services/activity.service';
import { ProgressService } from '../services/progress.service';

export const createActivityAction = enhanceAction(
  async (data) => {
    const client = getSupabaseServerClient();
    const auth = await requireUser(client);
    if (!auth.data) throw new Error('Unauthorized');

    const service = new ActivityService(client);
    
    const { questions, ...activityData } = data;

    const activity = await service.createActivity(activityData, questions);

    // Si se agregó un cuestionario/actividad a una lección o curso, actualizar el progreso
    try {
      const progressService = new ProgressService(client);
      if (activityData.lesson_id) {
        await progressService.handleNewQuizInLesson(activityData.lesson_id, activityData.course_id);
        revalidatePath('/home/courses');
      } else if (activityData.course_id) {
        await progressService.recalculateCourseProgressForAllStudents(activityData.course_id);
        revalidatePath('/home/courses');
      }
    } catch (err) {
      console.error('Error updating course progress on activity create:', err);
    }

    revalidateTag('lms-content');
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

    revalidateTag('lms-content');
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

export const submitAssignmentAction = enhanceAction(
  async (data) => {
    const client = getSupabaseServerClient();
    const auth = await requireUser(client);
    if (!auth.data) throw new Error('Unauthorized');

    const adminClient = getSupabaseServerAdminClient();
    const studentId = auth.data.id;

    // 1. Ensure a practical activity exists for this assignment lesson
    const { data: existingActivity } = await adminClient
      .from('activities')
      .select('id')
      .eq('lesson_id', data.lesson_id)
      .maybeSingle();

    let activityId = existingActivity?.id;

    if (!activityId) {
      const { data: createdActivity, error: actErr } = await adminClient
        .from('activities')
        .insert({
          lesson_id: data.lesson_id,
          course_id: data.course_id,
          type: 'practical',
          title: data.lesson_title || 'Tarea / Asignación',
          passing_score: 70,
        })
        .select('id')
        .single();

      if (actErr || !createdActivity) {
        console.error('Error creating practical activity:', actErr);
        throw new Error('No se pudo registrar la actividad de la tarea.');
      }
      activityId = createdActivity.id;
    }

    // 2. Check for an existing ungraded attempt to update, or create a new attempt
    const { data: latestAttempt } = await adminClient
      .from('activity_attempts')
      .select('id, attempt_number, status')
      .eq('activity_id', activityId)
      .eq('student_id', studentId)
      .order('attempt_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    const payload = {
      file_url: data.files[0]?.url || null,
      answers_json: {
        files: data.files,
        links: data.links,
        comment: data.comment || '',
      },
      status: 'needs_grading' as const,
      completed_at: new Date().toISOString(),
    };

    if (latestAttempt && latestAttempt.status === 'needs_grading') {
      const { error: updErr } = await adminClient
        .from('activity_attempts')
        .update(payload)
        .eq('id', latestAttempt.id);

      if (updErr) {
        console.error('Error updating assignment submission:', updErr);
        throw new Error('Error al actualizar la entrega.');
      }
    } else {
      const nextAttemptNumber = (latestAttempt?.attempt_number || 0) + 1;
      const { error: insErr } = await adminClient
        .from('activity_attempts')
        .insert({
          activity_id: activityId,
          student_id: studentId,
          attempt_number: nextAttemptNumber,
          ...payload,
        });

      if (insErr) {
        console.error('Error inserting assignment submission:', insErr);
        throw new Error('Error al guardar la entrega.');
      }
    }

    revalidatePath(`/home/learn/${data.course_id}/lesson/${data.lesson_id}`);
    revalidatePath(`/home/admin-courses/${data.course_id}`);

    return { ok: true, activityId };
  },
  {
    schema: z.object({
      course_id: z.string().uuid(),
      lesson_id: z.string().uuid(),
      lesson_title: z.string(),
      files: z
        .array(
          z.object({
            name: z.string(),
            url: z.string(),
          }),
        )
        .default([]),
      links: z
        .array(
          z.object({
            label: z.string(),
            url: z.string(),
          }),
        )
        .default([]),
      comment: z.string().optional(),
    }),
  },
);

