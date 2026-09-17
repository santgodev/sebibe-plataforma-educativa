import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { SidebarTrigger } from '@kit/ui/shadcn-sidebar';

import { ProgressService } from '~/lib/lms/server/services/progress.service';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';

import { LessonSidebarNav } from './_components/lesson-sidebar-nav';

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

  // Sort modules and lessons
  const modules = course.course_modules.sort(
    (a, b) => a.order_index - b.order_index,
  );
  modules.forEach((m) => {
    if (m.lessons) m.lessons.sort((a, b) => a.order_index - b.order_index);
  });

  return (
    <div className="bg-background flex h-[calc(100vh-4rem)] flex-col overflow-hidden md:flex-row">
      {/* Sidebar Temario */}
      <aside className="bg-muted/20 flex h-full w-full flex-col overflow-y-auto border-r md:w-80">
        <div className="bg-background sticky top-0 z-10 border-b p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-3">
            <SidebarTrigger className="bg-primary/10 text-primary hover:bg-primary border-primary/20 flex h-9 w-9 items-center justify-center rounded-md border p-2 transition-colors hover:text-white" />
            <Link
              href="/home/courses"
              className="text-foreground/70 hover:text-primary text-sm font-medium transition-colors"
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
      <main className="bg-background flex h-full flex-1 flex-col overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
