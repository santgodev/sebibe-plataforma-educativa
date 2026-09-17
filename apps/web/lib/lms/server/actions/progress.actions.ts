'use server';

import { revalidatePath } from 'next/cache';

import { enhanceAction } from '@kit/next/actions';
import { requireUser } from '@kit/supabase/require-user';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { MarkLessonCompleteSchema } from '../../schemas/progress.schema';
import { ProgressService } from '../services/progress.service';

export const markLessonCompleteAction = enhanceAction(
  async ({ course_id, lesson_id }) => {
    const client = getSupabaseServerClient();
    const auth = await requireUser(client);
    const user = auth.data;
    if (!user) throw new Error('Unauthorized');

    const service = new ProgressService(client);

    const result = await service.markLessonCompleted(
      user.id,
      course_id,
      lesson_id,
    );

    revalidatePath(`/home/learn/${course_id}`);
    revalidatePath(`/home/courses/${course_id}`);

    return result; // returns { percentage, status }
  },
  {
    schema: MarkLessonCompleteSchema,
  },
);
