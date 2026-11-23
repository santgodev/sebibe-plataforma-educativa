import { notFound } from 'next/navigation';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';

import { CoursePresenter } from './_components/course-presenter';

export const metadata = {
  title: 'Modo Presentación',
};

export default async function CoursePresentPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ lesson?: string; unit?: string; from?: string }>;
}) {
  const { courseId } = await params;
  const { lesson: initialLessonId, unit: initialUnitId, from } =
    await searchParams;

  const user = await requireUserInServerComponent();
  const client = getSupabaseServerClient();
  const adminClient = getSupabaseServerAdminClient();

  const { data: roleData } = await adminClient
    .from('user_roles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const role = roleData?.role;
  const isStaff =
    role === 'admin' ||
    role === 'administrador' ||
    role === 'profesor' ||
    role === 'instructor';

  const db = isStaff ? adminClient : client;

  const { data: course, error } = await db
    .from('courses')
    .select(
      `
      id, title, thumbnail_url,
      course_modules (
        id, title, order_index,
        lessons (
          id, title, type, content, video_url, order_index,
          lesson_blocks ( id, type, content, order_index )
        )
      )
    `,
    )
    .eq('id', courseId)
    .single();

  if (error || !course) {
    return notFound();
  }

  const modules = (course.course_modules || [])
    .slice()
    .sort((a: any, b: any) => a.order_index - b.order_index)
    .map((m: any) => ({
      ...m,
      lessons: (m.lessons || [])
        .slice()
        .sort((a: any, b: any) => a.order_index - b.order_index),
    }));

  const backHref =
    from === 'admin'
      ? `/home/admin-courses/${courseId}`
      : `/home/learn/${courseId}`;

  return (
    <CoursePresenter
      courseId={courseId}
      courseTitle={course.title}
      courseThumbnailUrl={course.thumbnail_url || null}
      modules={modules}
      initialLessonId={initialLessonId}
      initialUnitId={initialUnitId}
      backHref={backHref}
    />
  );
}
