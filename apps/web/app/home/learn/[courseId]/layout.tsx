import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { SidebarTrigger } from '@kit/ui/shadcn-sidebar';
import { Target, TrendingUp, Trophy } from 'lucide-react';

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
      <main className="bg-background relative flex h-full flex-1 flex-col overflow-y-auto">
        
        {/* Top Header estilo Udemy/Platzi */}
        <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-end border-b bg-white px-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Tu progreso</span>
              <span className="text-sm font-bold text-zinc-900">{progressPercentage}% completado</span>
            </div>
            
            {/* Progress Circular o Barra sutil */}
            <div className="relative flex h-10 w-10 items-center justify-center">
              <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
                <circle
                  className="text-zinc-100"
                  strokeWidth="8"
                  stroke="currentColor"
                  fill="transparent"
                  r="40"
                  cx="50"
                  cy="50"
                />
                <circle
                  className="text-primary transition-all duration-1000 ease-in-out"
                  strokeWidth="8"
                  strokeDasharray={251.2}
                  strokeDashoffset={251.2 - (251.2 * progressPercentage) / 100}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                  r="40"
                  cx="50"
                  cy="50"
                />
              </svg>
              <div className="absolute flex items-center justify-center text-primary">
                {progressPercentage === 0 ? (
                  <Target className="h-4 w-4" />
                ) : progressPercentage === 100 ? (
                  <Trophy className="h-4 w-4" />
                ) : (
                  <TrendingUp className="h-4 w-4" />
                )}
              </div>
            </div>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
