import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { ProgressService } from '~/lib/lms/server/services/progress.service';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';

import { LessonSidebarNav } from './_components/lesson-sidebar-nav';
import { LearnHeader } from './_components/learn-header';

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
  const progressService = new ProgressService(client);

  const { data: course, error } = await client
    .from('courses')
    .select(
      `
      id, title,
      course_modules (
        id, title, order_index,
        lessons ( id, title, order_index )
      )
    `,
    )
    .eq('id', courseId)
    .single();

  if (error || !course) {
    return notFound();
  }

  const completedLessonsSet = await progressService.getCompletedLessonsSet(
    user.id,
    courseId,
  );

  const { data: progressData } = await client
    .from('course_progress')
    .select('percentage_completed')
    .eq('student_id', user.id)
    .eq('course_id', courseId)
    .maybeSingle();
  const progressPercentage = progressData?.percentage_completed || 0;

  // Sort modules and lessons
  const modules = course.course_modules.sort(
    (a, b) => a.order_index - b.order_index,
  );
  modules.forEach((m) => {
    if (m.lessons) m.lessons.sort((a, b) => a.order_index - b.order_index);
  });

  return (
    <div className="bg-background flex h-dvh md:h-[calc(100dvh-4rem)] flex-col overflow-hidden md:flex-row -mx-4 lg:mx-0">
      {/* Sidebar Temario (visible en desktop, en móvil se accede desde el botón Temario del header) */}
      <aside className="bg-muted/20 hidden md:flex h-full w-80 shrink-0 flex-col overflow-y-auto border-r">
        <div className="bg-background sticky top-0 z-10 border-b p-4 shadow-xs">
          <div className="mb-3 flex items-center gap-3">
            <Link
              href="/home/courses"
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
