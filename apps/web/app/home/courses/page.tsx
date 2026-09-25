import Link from 'next/link';

import { PlayCircle, CheckCircle, BookOpen } from 'lucide-react';

import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { PageBody, PageHeader } from '@kit/ui/page';

export const metadata = {
  title: 'Mi Aprendizaje',
};

export default async function CoursesCatalogPage() {
  const user = await requireUserInServerComponent();
  const client = getSupabaseServerClient();

  // Obtener inscripciones del alumno
  const { data: enrollments } = await client
    .from('course_enrollments')
    .select('course_id')
    .eq('student_id', user.id);

  const enrolledCourseIds = enrollments?.map(e => e.course_id) || [];

  // Fetch course progress for this student
  const { data: progressData } = await client
    .from('course_progress')
    .select('course_id, percentage_completed, updated_at, created_at, status')
    .eq('student_id', user.id);
  
  const progressMap = new Map((progressData || []).map(p => [p.course_id, p.percentage_completed || 0]));

  const { data: coursesData, error } = await client
    .from('courses')
    .select(
      `
      id, title, slug, short_description, thumbnail_url, duration_minutes, level,
      course_modules (
        lessons ( id )
      )
    `,
    )
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  // Filtrar para mostrar SOLO las materias en las que está inscrito
  const courses = coursesData?.filter(course => enrolledCourseIds.includes(course.id)) || [];

  // Determinar la materia activa (la más reciente que esté > 0 y < 100)
  let activeCourseId = null;
  const inProgress = progressData?.filter(p => p.percentage_completed && p.percentage_completed > 0 && p.percentage_completed < 100)
    .sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime());
  
  if (inProgress && inProgress.length > 0) {
    activeCourseId = inProgress[0].course_id;
  } else {
    // Si no hay en progreso, busca la primera que no esté al 100%
    const notStarted = courses.find(c => (progressMap.get(c.id) || 0) < 100);
    if (notStarted) activeCourseId = notStarted.id;
  }

  const activeCourse = courses.find(c => c.id === activeCourseId);
  const completedCourses = courses.filter(c => progressMap.get(c.id) === 100 && c.id !== activeCourseId);
  const otherCourses = courses.filter(c => c.id !== activeCourseId && progressMap.get(c.id) !== 100);

  // Helper para obtener el total de lecciones de un curso
  const getTotalLessons = (course: any) => {
    let total = 0;
    if (course.course_modules) {
      course.course_modules.forEach((m: any) => {
        if (m.lessons) total += m.lessons.length;
      });
    }
    return total;
  };

  // Helper para renderizar una tarjeta de curso normal
  const renderCourseCard = (course: any, isCompleted: boolean) => {
    const progress = progressMap.get(course.id) || 0;
    const isStarted = progress > 0;

    return (
      <div
        key={course.id}
        className="group bg-background relative flex flex-col overflow-hidden rounded-xl border shadow-sm transition-all hover:shadow-md"
      >
        <div className="bg-muted/50 aspect-video w-full overflow-hidden relative">
          {course.thumbnail_url ? (
            <img
              src={course.thumbnail_url}
              alt={course.title}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="bg-primary/5 text-primary/40 flex h-full w-full items-center justify-center">
              <span className="text-4xl">📚</span>
            </div>
          )}
          {isCompleted && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
              <div className="bg-green-500/90 text-white px-4 py-2 rounded-full font-bold flex items-center gap-2">
                <CheckCircle className="h-5 w-5" /> Completada
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="bg-primary/10 text-primary inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize">
              {course.level?.replace('_', ' ') || 'General'}
            </span>
            <span className="text-muted-foreground text-xs font-medium flex items-center gap-1">
              <BookOpen className="h-3.5 w-3.5" /> {getTotalLessons(course)} lecciones
            </span>
          </div>
          <h3 className="group-hover:text-primary mb-2 text-lg leading-tight font-bold transition-colors">
            {course.title}
          </h3>
          <p className="text-muted-foreground mb-4 line-clamp-2 flex-1 text-sm">
            {course.short_description}
          </p>

          <div className="mb-6">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Progreso</span>
              <span className={`text-xs font-bold ${isCompleted ? 'text-green-600' : 'text-primary'}`}>{progress}%</span>
            </div>
            <div className="w-full bg-muted/50 rounded-full h-2.5 overflow-hidden border">
              <div 
                className={`${isCompleted ? 'bg-green-500' : 'bg-primary'} h-2.5 rounded-full transition-all duration-500 ease-out`} 
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <Link
            href={`/home/courses/${course.slug}`}
            className={`${isCompleted ? 'bg-muted text-muted-foreground hover:bg-muted/80' : 'bg-primary text-primary-foreground hover:bg-primary/90'} inline-flex w-full items-center justify-center rounded-md px-4 py-2 text-sm font-medium shadow transition-colors`}
          >
            {isCompleted ? 'Repasar materia' : isStarted ? 'Continuar materia' : 'Comenzar materia'}
          </Link>
        </div>
      </div>
    );
  };

  return (
    <>
      <PageHeader
        title="Mi Aprendizaje"
        description="Aquí puedes ver tu progreso en las materias que estás cursando"
      />

      <PageBody>
        {error ? (
          <div className="p-8 text-center text-red-500">
            Error al cargar los seminarios.
          </div>
        ) : !courses || courses.length === 0 ? (
          <div className="text-muted-foreground bg-muted/20 rounded-xl border p-12 text-center">
            <h3 className="mb-2 text-xl font-medium">
              Aún no estás inscrito en ninguna materia
            </h3>
            <p>Comunícate con un administrador para que te asigne una ruta de aprendizaje.</p>
          </div>
        ) : (
          <div className="space-y-12">
            
            {/* HERO ACTIVE COURSE */}
            {activeCourse && (
              <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="mb-4 text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <PlayCircle className="text-primary h-6 w-6" /> Continuar aprendiendo
                </h2>
                <div className="bg-card rounded-2xl border shadow-md overflow-hidden flex flex-col md:flex-row">
                  <div className="md:w-2/5 relative h-64 md:h-auto">
                    {activeCourse.thumbnail_url ? (
                      <img
                        src={activeCourse.thumbnail_url}
                        alt={activeCourse.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="bg-primary/5 text-primary/40 flex h-full w-full items-center justify-center">
                        <span className="text-6xl">📚</span>
                      </div>
                    )}
                  </div>
                  <div className="p-8 md:w-3/5 flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
                        Materia Activa
                      </span>
                    </div>
                    <h3 className="text-3xl font-extrabold text-slate-900 mb-3">{activeCourse.title}</h3>
                    <p className="text-muted-foreground text-lg mb-8 line-clamp-2">
                      {activeCourse.short_description}
                    </p>
                    
                    <div className="mb-8 p-5 bg-muted/30 rounded-xl border">
                      <div className="flex justify-between items-end mb-2">
                        <div>
                          <p className="text-sm font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Tu progreso general</p>
                          <p className="text-slate-900 font-medium">Llevas completado el <span className="text-primary font-bold">{progressMap.get(activeCourse.id) || 0}%</span> de la materia</p>
                        </div>
                        <div className="text-primary font-bold text-xl">
                          {progressMap.get(activeCourse.id) || 0}%
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-3 overflow-hidden shadow-inner">
                        <div 
                          className="bg-primary h-3 rounded-full transition-all duration-1000 ease-out" 
                          style={{ width: `${progressMap.get(activeCourse.id) || 0}%` }}
                        />
                      </div>
                    </div>

                    <Link
                      href={`/home/courses/${activeCourse.slug}`}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground text-center rounded-xl px-8 py-4 font-bold text-lg shadow-lg transition-all hover:-translate-y-1"
                    >
                      Continuar clase
                    </Link>
                  </div>
                </div>
              </section>
            )}

            {/* OTHER COURSES */}
            {otherCourses.length > 0 && (
              <section>
                <h2 className="mb-6 text-2xl font-bold text-slate-900">En curso o por empezar</h2>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {otherCourses.map(c => renderCourseCard(c, false))}
                </div>
              </section>
            )}

            {/* COMPLETED COURSES */}
            {completedCourses.length > 0 && (
              <section className="pt-8 border-t">
                <h2 className="mb-6 text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle className="text-green-500 h-6 w-6" /> Materias Completadas
                </h2>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 opacity-90">
                  {completedCourses.map(c => renderCourseCard(c, true))}
                </div>
              </section>
            )}

          </div>
        )}
      </PageBody>
    </>
  );
}
