import Link from 'next/link';
import { notFound } from 'next/navigation';

import { CheckCircle, FileText, PlayCircle, HelpCircle, Video } from 'lucide-react';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@kit/ui/accordion';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const client = getSupabaseServerClient();
  const { data } = await client
    .from('courses')
    .select('title, short_description')
    .eq('slug', decodedSlug)
    .single();
  return {
    title: data?.title || 'Materia',
    description: data?.short_description || 'Detalles de la materia',
  };
}

export default async function CourseLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const client = getSupabaseServerClient();

  const { data: course, error } = await client
    .from('courses')
    .select(
      `
      id, title, slug, short_description, long_description, thumbnail_url, duration_minutes, level,
      course_modules (
        id, title, order_index,
        lessons ( id, title, order_index, lesson_blocks ( type, order_index ) )
      )
    `,
    )
    .eq('slug', decodedSlug)
    .single();

  if (error || !course) {
    return notFound();
  }

  const modules =
    course.course_modules?.sort((a, b) => a.order_index - b.order_index) || [];
  modules.forEach((m) => {
    if (m.lessons) m.lessons.sort((a, b) => a.order_index - b.order_index);
  });

  const totalLessons = modules.reduce(
    (acc, m) => acc + (m.lessons?.length || 0),
    0,
  );
  const firstLessonId = modules[0]?.lessons?.[0]?.id;

  // Obtener progreso del estudiante
  const { requireUserInServerComponent } = await import('~/lib/server/require-user-in-server-component');
  const user = await requireUserInServerComponent();
  
  const { data: progressData } = await client
    .from('course_progress')
    .select('percentage_completed')
    .eq('student_id', user.id)
    .eq('course_id', course.id)
    .maybeSingle();
  const progressPercentage = progressData?.percentage_completed || 0;

  const { data: completedLessonsData } = await client
    .from('lesson_progress')
    .select('lesson_id')
    .eq('student_id', user.id)
    .eq('is_completed', true);
  const completedLessonIds = new Set((completedLessonsData || []).map(p => p.lesson_id));

  return (
    <div className="bg-background w-full pb-20">
      {/* Hero Section */}
      <section className="w-full bg-slate-950 px-6 py-16 text-white">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-300">
                {course.duration_minutes} minutos
              </span>
            </div>

            <h1 className="text-4xl leading-tight font-extrabold md:text-5xl">
              {course.title}
            </h1>

            <p className="max-w-xl text-lg leading-relaxed text-gray-300">
              {course.short_description}
            </p>

            {firstLessonId && (
              <div className="pt-4">
                <Link
                  href={`/home/learn/${course.id}/lesson/${firstLessonId}`}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground inline-flex items-center justify-center gap-2 rounded-lg px-8 py-4 text-lg font-bold transition-colors"
                >
                  <PlayCircle className="h-5 w-5" />
                  Iniciar materia
                </Link>
              </div>
            )}
          </div>

          <div className="hidden justify-center lg:flex">
            <div className="aspect-video w-full max-w-md overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-2xl">
              {course.thumbnail_url ? (
                <img
                  src={course.thumbnail_url}
                  alt={course.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-900">
                  <span className="text-6xl">📖</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Course Details & Syllabus */}
      <section className="mx-auto mt-12 grid w-full max-w-4xl grid-cols-1 gap-12 px-6 md:grid-cols-3">
        <div className="space-y-12 md:col-span-2">
          {/* About */}
          <div>
            <h2 className="mb-6 text-2xl font-bold text-slate-900">Acerca de esta materia</h2>
            <div className="prose text-muted-foreground max-w-none leading-relaxed">
              <p>{course.long_description || course.short_description}</p>
            </div>
          </div>

          {/* Syllabus (Contenido del curso) */}
          <div id="temario">
            <div className="mb-6 flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Contenido de la materia</h2>
                <p className="text-muted-foreground mt-1">
                  {modules.length} módulos • {totalLessons} clases
                </p>
              </div>
            </div>

            <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
              <Accordion type="multiple" className="w-full">
                {modules.map((mod, i) => {
                  // For now, duration is not calculated from lessons since duration_seconds was moved/removed
                  const modDuration = 0;

                  return (
                    <AccordionItem
                      value={`module-${mod.id}`}
                      key={mod.id}
                      className="border-b px-6 py-2 last:border-0"
                    >
                      <AccordionTrigger className="py-4 hover:no-underline">
                        <div className="flex flex-col items-start gap-1 text-left">
                          <span className="text-slate-900 group-hover:text-primary text-base font-bold transition-colors">
                            {i + 1}. {mod.title}
                          </span>
                          <span className="text-muted-foreground text-xs font-normal">
                            {mod.lessons?.length || 0} clases •{' '}
                            {Math.floor(modDuration / 60)} min
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 pb-5">
                        <ul className="space-y-3">
                          {mod.lessons?.map((lesson: any, j) => {
                            const blocks = lesson.lesson_blocks || [];
                            const hasActivity = blocks.some((b: any) => b.type === 'activity' || b.type === 'quiz');
                            const hasVideo = blocks.some((b: any) => b.type === 'video');
                            const hasPdf = blocks.some((b: any) => b.type === 'pdf');
                            
                            let Icon = FileText;
                            if (hasActivity) Icon = HelpCircle;
                            else if (hasVideo) Icon = PlayCircle;
                            else if (hasPdf) Icon = FileText;
                            
                            return (
                            <li
                              key={lesson.id}
                              className="hover:bg-muted/50 group flex items-start gap-4 rounded-lg p-3 transition-colors"
                            >
                              <div className="text-muted-foreground group-hover:text-primary mt-0.5 transition-colors">
                                {completedLessonIds.has(lesson.id) ? (
                                  <CheckCircle className="h-5 w-5 text-green-500" />
                                ) : (
                                  <Icon className="h-5 w-5" />
                                )}
                              </div>
                              <div className="flex-1">
                                <Link
                                  href={`/home/learn/${course.id}/lesson/${lesson.id}`}
                                  className={`group-hover:text-primary block font-medium transition-colors ${completedLessonIds.has(lesson.id) ? 'text-muted-foreground line-through decoration-muted-foreground/30' : 'text-slate-900'}`}
                                >
                                  {lesson.title}
                                </Link>
                              </div>
                            </li>
                            );
                          })}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </div>
          </div>
        </div>

        {/* Right Sidebar (Sticky Info) */}
        <div className="md:col-span-1">
          <div className="bg-card sticky top-24 space-y-6 rounded-xl border p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900">¿Qué incluye esta materia?</h3>
            <ul className="space-y-4">
              <li className="text-muted-foreground flex items-center gap-3">
                <PlayCircle className="text-primary h-5 w-5" />
                <span>
                  {Math.floor((course.duration_minutes || 0) / 60)} horas de video
                </span>
              </li>
              <li className="text-muted-foreground flex items-center gap-3">
                <FileText className="text-primary h-5 w-5" />
                <span>{totalLessons} recursos descargables</span>
              </li>
            </ul>

            <div className="my-6 pt-6 border-t">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Tu Avance</span>
                <span className="font-bold text-primary">{progressPercentage}%</span>
              </div>
              <div className="w-full bg-muted/50 rounded-full h-2.5 overflow-hidden border">
                <div 
                  className="bg-primary h-2.5 rounded-full transition-all duration-500 ease-out" 
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>

            {firstLessonId && (
              <Link
                href={`/home/learn/${course.id}/lesson/${firstLessonId}`}
                className="bg-primary hover:bg-primary/90 text-primary-foreground block w-full rounded-lg px-4 py-3 text-center font-bold transition-all"
              >
                {progressPercentage > 0 ? 'Continuar materia' : 'Comenzar ahora'}
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
