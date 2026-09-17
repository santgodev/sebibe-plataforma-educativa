'use server';

import { revalidatePath } from 'next/cache';

import { requireUser } from '@kit/supabase/require-user';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function createCourseAction(formData: FormData) {
  const client = getSupabaseServerClient();
  const user = await requireUser(client);

  const title = formData.get('title') as string;
  const slug = formData.get('slug') as string;
  const description = formData.get('short_description') as string;

  if (!title || !slug) {
    throw new Error('Title and slug are required');
  }

  if (!user.data) {
    throw new Error('Unauthorized');
  }

  const { data, error } = await client
    .from('courses')
    .insert({
      title,
      slug,
      short_description: description,
      instructor_id: user.data.id,
      status: 'draft',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating course', error);
    throw new Error(error.message);
  }

  revalidatePath('/admin/courses');
  return { success: true, courseId: data.id };
}
