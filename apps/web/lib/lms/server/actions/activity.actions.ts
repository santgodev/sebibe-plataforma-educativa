'use server';

import { revalidatePath } from 'next/cache';

import { enhanceAction } from '@kit/next/actions';
import { requireUser } from '@kit/supabase/require-user';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

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
    return service.getFullActivity(data.id);
  },
  {
    schema: z.object({ id: z.string().uuid() }),
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
