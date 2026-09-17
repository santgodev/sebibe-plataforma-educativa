'use server';

import { z } from 'zod';

import { enhanceAction } from '@kit/next/actions';
import { requireUser } from '@kit/supabase/require-user';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export const addCommentAction = enhanceAction(
  async (data) => {
    const client = getSupabaseServerClient();
    const auth = await requireUser(client);
    if (!auth.data) throw new Error('Unauthorized');

    const { data: comment, error } = await client
      .from('lesson_comments' as any)
      .insert({
        lesson_id: data.lesson_id,
        user_id: auth.data.id,
        content: data.content,
      })
      .select('id, content, created_at, user_id')
      .single();

    if (error) throw error;
    return comment;
  },
  {
    schema: z.object({
      lesson_id: z.string().uuid(),
      content: z.string().min(1).max(2000),
    }),
  },
);

export const deleteCommentAction = enhanceAction(
  async (data) => {
    const client = getSupabaseServerClient();
    const auth = await requireUser(client);
    if (!auth.data) throw new Error('Unauthorized');

    // RLS handles the permission check (author OR admin/instructor)
    const { error } = await client
      .from('lesson_comments' as any)
      .delete()
      .eq('id', data.id);

    if (error) throw error;
    return { success: true };
  },
  {
    schema: z.object({ id: z.string().uuid() }),
  },
);
