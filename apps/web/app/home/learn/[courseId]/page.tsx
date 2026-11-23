import { redirect } from 'next/navigation';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';

import { getCachedCourseOutline } from './_lib/learn-data.server';

export default async function LearnCourseIndexPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const user = await requireUserInServerComponent();
  const client = getSupabaseServerClient();

  const [courseOutlineRes, progressRes] = await Promise.all([
    getCachedCourseOutline(courseId),
    client
      .from('lesson_progress')
      .select('lesson_id')
      .eq('student_id', user.id)
      .eq('is_completed', true),
  ]);

  const modules = courseOutlineRes.data?.course_modules;
  if (!modules || modules.length === 0) {
    redirect('/home/courses');
  }

  const completedLessonIds = new Set(
    (progressRes.data || []).map((p) => p.lesson_id),
  );

  const sortedModules = [...modules].sort(
    (a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0),
  );

  const orderedLessons = sortedModules.flatMap((mod: any) =>
    ((mod.lessons as any[]) || [])
      .filter((l: any) => !l.deleted_at)
      .slice()
      .sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0)),
  );

  if (orderedLessons.length === 0) {
    redirect('/home/courses');
  }

  const nextLesson =
    orderedLessons.find((l: any) => !completedLessonIds.has(l.id)) ||
    orderedLessons[0];

  redirect(`/home/learn/${courseId}/lesson/${nextLesson.id}`);
}
