import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';

import { LearnHeader } from './_components/learn-header';
import { LessonSidebarNav } from './_components/lesson-sidebar-nav';
import { getCachedCourseOutline } from './_lib/learn-data.server';

export default async function LearningLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const client = getSupabaseServerClient();
  const user = await requireUserInServerComponent();

  const [{ data: course, error }, { data: completedRows }] = await Promise.all([
    getCachedCourseOutline(courseId),
    client
      .from('lesson_progress')
      .select('lesson_id')
      .eq('student_id', user.id)
      .eq('is_completed', true),
  ]);

  if (error || !course) {
    return notFound();
  }

  // Sort modules and lessons and calculate real-time progress
  const modules = [...(course.course_modules || [])].sort(
    (a, b) => a.order_index - b.order_index,
  );
  const validLessonIds = new Set<string>();
  let totalLessons = 0;

  modules.forEach((m) => {
    if (m.lessons) {
      m.lessons = m.lessons
        .filter((l: any) => !l.deleted_at)
        .sort((a, b) => a.order_index - b.order_index);
      m.lessons.forEach((l: any) => {
        totalLessons++;
        validLessonIds.add(l.id);
      });
    }
  });

  const completedLessonsSet = new Set(
    (completedRows || [])
      .map((row) => row.lesson_id)
      .filter((id) => validLessonIds.has(id)),
  );
  const completedLessonsCount = completedLessonsSet.size;
  const progressPercentage =
    totalLessons > 0
      ? Math.min(Math.round((completedLessonsCount / totalLessons) * 100), 100)
      : 0;

  return (
    <div className="bg-background flex h-dvh md:h-[calc(100dvh-4rem)] flex-col overflow-hidden md:flex-row -mx-4 lg:mx-0">
      {/* Sidebar Temario (visible en desktop, en móvil se accede desde el botón Temario del header) */}
      <aside className="bg-muted/20 hidden md:flex h-full w-80 shrink-0 flex-col overflow-y-auto border-r">
        <div className="bg-background sticky top-0 z-10 border-b p-4 shadow-xs">
          <div className="mb-3 flex items-center gap-3">
            <Link
              href="/home/courses"
              prefetch={false}
              className="text-foreground/70 hover:text-primary text-xs font-semibold transition-colors flex items-center gap-1"
            >
              ← Volver al catálogo
            </Link>
          </div>
          <h2 className="text-foreground text-lg font-bold leading-tight break-words">
            {course.title}
          </h2>
        </div>

        <LessonSidebarNav
          courseId={courseId}
          modules={modules as any}
          completedLessonsSet={Array.from(completedLessonsSet)}
        />
      </aside>

      {/* Main Content Area */}
      <main className="bg-background relative flex h-full flex-1 min-w-0 flex-col overflow-y-auto">
        <LearnHeader
          courseId={courseId}
          courseTitle={course.title}
          modules={modules as any}
          completedLessonsSet={Array.from(completedLessonsSet)}
          progressPercentage={progressPercentage}
        />

        <div className="flex-1 w-full min-w-0">
          {children}
        </div>
      </main>
    </div>
  );
}
