'use server';

import { z } from 'zod';

import { enhanceAction } from '@kit/next/actions';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { requireUser } from '@kit/supabase/require-user';

export const saveNoteAction = enhanceAction(
  async (data) => {
    const client = getSupabaseServerClient();
    const auth = await requireUser(client);
    if (!auth.data) throw new Error('Unauthorized');

    const userId = auth.data.id;

    if (data.id) {
      // Update existing note
      const { data: note, error } = await client
        .from('lesson_notes' as any)
        .update({ content: data.content, updated_at: new Date().toISOString() })
        .eq('id', data.id)
        .eq('student_id', userId)
        .select()
        .single();

      if (error) throw error;
      return note;
    } else {
      // Insert new note
      const { data: note, error } = await client
        .from('lesson_notes' as any)
        .insert({ lesson_id: data.lesson_id, student_id: userId, content: data.content })
        .select()
        .single();

      if (error) throw error;
      return note;
    }
  },
  {
    schema: z.object({
      lesson_id: z.string().uuid(),
      content: z.string().min(1),
      id: z.string().uuid().optional(),
    }),
  },
);

export const deleteNoteAction = enhanceAction(
  async (data) => {
    const client = getSupabaseServerClient();
    const auth = await requireUser(client);
    if (!auth.data) throw new Error('Unauthorized');

    const { error } = await client
      .from('lesson_notes' as any)
      .delete()
      .eq('id', data.id)
      .eq('student_id', auth.data.id);

    if (error) throw error;
    return { success: true };
  },
  {
    schema: z.object({ id: z.string().uuid() }),
  },
);
