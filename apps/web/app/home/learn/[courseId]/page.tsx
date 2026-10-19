import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export default async function LearnCourseIndexPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const client = getSupabaseServerClient();

  const { data: modules } = await client
    .from('course_modules')
    .select('id, order_index, lessons(id, order_index)')
    .eq('course_id', courseId)
    .order('order_index', { ascending: true });

  if (!modules || modules.length === 0) {
    redirect('/home/courses');
  }

  const sortedModules = modules.sort((a, b) => a.order_index - b.order_index);
  for (const mod of sortedModules) {
    const rawLessons = mod.lessons as { id: string; order_index: number }[] | null;
    const sortedLessons = (rawLessons || []).sort(
      (a, b) => a.order_index - b.order_index,
    );
    if (sortedLessons.length > 0 && sortedLessons[0]) {
      redirect(`/home/learn/${courseId}/lesson/${sortedLessons[0].id}`);
    }
  }

  redirect('/home/courses');
}
