import Link from 'next/link';
import { 
  BookOpen, 
  CheckCircle2, 
  PlayCircle, 
  Clock, 
  RotateCcw, 
  ArrowRight, 
  Sparkles,
  GraduationCap
} from 'lucide-react';

import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { PageBody, PageHeader } from '@kit/ui/page';

export const metadata = {
  title: 'Mi Aprendizaje',
};

export default async function CoursesCatalogPage() {
  const user = await requireUserInServerComponent();
  const adminClient = getSupabaseServerAdminClient();

  // 1. Obtener todas las asignaturas asignadas / inscritas del estudiante
  const { data: enrollments } = await adminClient
    .from('course_enrollments')
    .select('course_id, enrolled_at, completed_at')
    .eq('student_id', user.id);

  const enrolledCourseIds = (enrollments || []).map((e) => e.course_id);

  // 2. Obtener progreso de materias
  const { data: progressData } = await adminClient
    .from('course_progress')
    .select('course_id, percentage_completed, updated_at, created_at, status, completed_at')
    .eq('student_id', user.id);

  const progressList = progressData || [];
  const progressCourseIds = progressList.map((p) => p.course_id);

  // 3. Obtener materias asociadas a intentos de actividades / evaluaciones
  const { data: rawAttempts } = await adminClient
    .from('activity_attempts')
    .select(`
      activities (
        course_id,
        lessons (
          course_modules (
            course_id
          )
        )
      )
    `)
    .eq('student_id', user.id);

  const attemptCourseIds: string[] = [];
  (rawAttempts || []).forEach((a) => {
    const act = a.activities as any;
    const cId =
      act?.course_id ||
      act?.lessons?.course_modules?.course_id;
    if (cId) attemptCourseIds.push(cId);
  });

  // Unir todos los IDs de asignaturas asociados al estudiante
  const allStudentCourseIds = Array.from(
    new Set([...enrolledCourseIds, ...progressCourseIds, ...attemptCourseIds])
  );

  // Si no tiene materias asignadas ni avance, mostrar estado vacío
  if (allStudentCourseIds.length === 0) {
    return (
      <>
        <PageHeader
          title="Mi Aprendizaje"
          description="Aquí puedes ver tu progreso en las materias que estás cursando"
        />
        <PageBody>
          <div className="text-muted-foreground bg-card/60 rounded-2xl border border-dashed p-8 sm:p-14 text-center max-w-2xl mx-auto my-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
              <BookOpen className="w-8 h-8" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-foreground">
              Aún no estás inscrito en ninguna materia
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto">
              Comunícate con un administrador para que te asigne tus asignaturas o ruta de aprendizaje.
            </p>
          </div>
        </PageBody>
      </>
    );
  }

  // 4. Obtener progreso de lecciones del estudiante
  const { data: lessonProgress } = await adminClient
    .from('lesson_progress')
    .select('lesson_id')
    .eq('student_id', user.id)
    .eq('is_completed', true);

  const completedLessonIds = new Set((lessonProgress || []).map((lp) => lp.lesson_id));

  // 5. Consultar los datos de las materias
  const { data: coursesData } = await adminClient
    .from('courses')
    .select(`
      id, title, slug, short_description, thumbnail_url, duration_minutes, level, status, created_at,
      course_modules (
        id, title, order_index,
        lessons ( id, title, order_index )
      )
    `)
    .in('id', allStudentCourseIds);

  const courses = coursesData || [];

  // Mapear cada materia con sus estadísticas
  const mappedCourses = courses.map((course) => {
    let totalLessons = 0;
    let completedLessons = 0;

    const modules =
      course.course_modules?.sort(
        (a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0)
      ) || [];

    modules.forEach((m: any) => {
      m.lessons?.forEach((l: any) => {
        totalLessons++;
        if (completedLessonIds.has(l.id)) {
          completedLessons++;
        }
      });
    });

    const cp = progressList.find((p) => p.course_id === course.id);
    let percentage = cp?.percentage_completed ?? 0;
    if (totalLessons > 0 && percentage === 0 && completedLessons > 0) {
      percentage = Math.round((completedLessons / totalLessons) * 100);
    }
    if (totalLessons > 0 && completedLessons >= totalLessons) {
      percentage = 100;
    }

    const isCompleted = cp?.status === 'completed' || percentage >= 100;

    return {
      ...course,
      totalLessons,
      completedLessons,
      percentage: Math.min(percentage, 100),
      isCompleted,
      updatedAt: cp?.updated_at || course.created_at,
    };
  });

  // División 1: Asignaturas que está cursando (porcentaje < 100 o no completadas)
  const inProgressCourses = mappedCourses
    .filter((c) => !c.isCompleted)
    .sort((a, b) => (b.percentage || 0) - (a.percentage || 0));

  // División 2: Asignaturas ya cursadas (completadas al 100%)
  const completedCourses = mappedCourses
    .filter((c) => c.isCompleted)
    .sort(
      (a, b) =>
        new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
    );

  return (
    <>
      <PageHeader
        title="Mi Aprendizaje"
        description="Aquí puedes ver tu progreso en las materias que estás cursando"
      />

      <PageBody>
        <div className="space-y-10 sm:space-y-12">
          
          {/* ======================================================== */}
          {/* DIVISIÓN 1: ASIGNATURAS QUE ESTÁ CURSANDO                */}
          {/* ======================================================== */}
          <section className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-2xs">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                      Asignaturas que estás cursando
                    </h2>
                    <span className="bg-primary/10 text-primary text-xs font-bold px-2.5 py-0.5 rounded-full">
                      {inProgressCourses.length} {inProgressCourses.length === 1 ? 'materia' : 'materias'}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                    Materias activas en las que estás inscrito. Continúa con tus lecciones y evaluaciones.
                  </p>
                </div>
              </div>
            </div>

            {inProgressCourses.length === 0 ? (
              <div className="bg-card/40 border border-dashed rounded-xl p-8 sm:p-10 text-center text-muted-foreground">
                <Sparkles className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <h4 className="text-base font-bold text-foreground">
                  ¡No tienes materias en curso pendientes por cursar!
                </h4>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                  Has completado las materias que tenías activas. Revisa la división de asignaturas ya cursadas más abajo o solicita nuevas materias a tu profesor.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                {inProgressCourses.map((course) => {
                  const isStarted = (course.percentage || 0) > 0;
                  const courseUrl = `/home/courses/${course.slug || course.id}`;

                  return (
                    <div
                      key={course.id}
                      className="group bg-card rounded-2xl border shadow-xs hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden"
                    >
                      {/* Portada */}
                      <div className="relative aspect-video w-full bg-muted/60 overflow-hidden">
                        {course.thumbnail_url ? (
                          <img
                            src={course.thumbnail_url}
                            alt={course.title}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/10 via-primary/5 to-muted">
                            <GraduationCap className="h-12 w-12 text-primary/40" />
                          </div>
                        )}
                        <div className="absolute top-3 left-3 flex items-center gap-1.5">
                          <span className="bg-background/90 backdrop-blur-xs text-foreground px-2.5 py-1 rounded-md text-[11px] font-bold shadow-xs capitalize">
                            {course.level?.replace('_', ' ') || 'General'}
                          </span>
                        </div>
                        <div className="absolute top-3 right-3">
                          <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold shadow-xs ${
                            isStarted 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-muted/90 backdrop-blur-xs text-muted-foreground'
                          }`}>
                            {isStarted ? 'En curso' : 'Por iniciar'}
                          </span>
                        </div>
                      </div>

                      {/* Contenido */}
                      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                            <BookOpen className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              {course.completedLessons} de {course.totalLessons} clases completadas
                            </span>
                          </div>

                          <h3 className="font-bold text-base sm:text-lg text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                            {course.title}
                          </h3>

                          {course.short_description && (
                            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                              {course.short_description}
                            </p>
                          )}
                        </div>

                        {/* Barra de Progreso y Botón */}
                        <div className="space-y-3.5 pt-2 border-t">
                          <div>
                            <div className="flex justify-between items-center text-xs mb-1.5">
                              <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">
                                Avance
                              </span>
                              <span className="font-black text-primary">
                                {course.percentage}%
                              </span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2 overflow-hidden shadow-inner">
                              <div
                                className="bg-primary h-2 rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${course.percentage}%` }}
                              />
                            </div>
                          </div>

                          <Link
                            href={courseUrl}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2.5 text-sm font-bold shadow-xs transition-colors"
                          >
                            <PlayCircle className="w-4 h-4 shrink-0" />
                            <span>
                              {isStarted ? 'Continuar materia' : 'Comenzar materia'}
                            </span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ======================================================== */}
          {/* DIVISIÓN 2: ASIGNATURAS YA CURSADAS                      */}
          {/* ======================================================== */}
          <section className="space-y-5 pt-4 sm:pt-6 border-t-2 border-border/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-2xs">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                      Asignaturas ya cursadas
                    </h2>
                    <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold px-2.5 py-0.5 rounded-full">
                      {completedCourses.length} {completedCourses.length === 1 ? 'cursada' : 'cursadas'}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                    Materias finalizadas con éxito. Puedes ingresar para repasar temas y lecciones cuando desees.
                  </p>
                </div>
              </div>
            </div>

            {completedCourses.length === 0 ? (
              <div className="bg-card/40 border border-dashed rounded-xl p-8 sm:p-10 text-center text-muted-foreground">
                <CheckCircle2 className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                <h4 className="text-base font-bold text-foreground">
                  Aún no tienes asignaturas ya cursadas
                </h4>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                  A medida que completes el 100% de las clases y evaluaciones de tus materias en curso, aparecerán aquí para que puedas repasarlas.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                {completedCourses.map((course) => {
                  const courseUrl = `/home/courses/${course.slug || course.id}`;

                  return (
                    <div
                      key={course.id}
                      className="group bg-card rounded-2xl border border-emerald-500/20 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden"
                    >
                      {/* Portada con Badge de Completada */}
                      <div className="relative aspect-video w-full bg-muted/60 overflow-hidden">
                        {course.thumbnail_url ? (
                          <img
                            src={course.thumbnail_url}
                            alt={course.title}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-muted">
                            <CheckCircle2 className="h-12 w-12 text-emerald-600/40" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-3">
                          <span className="bg-emerald-600 text-white px-2.5 py-1 rounded-md text-[11px] font-bold shadow-md flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Completada ✓
                          </span>
                        </div>
                      </div>

                      {/* Contenido */}
                      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              Todas las clases completadas ({course.totalLessons} clases)
                            </span>
                          </div>

                          <h3 className="font-bold text-base sm:text-lg text-foreground line-clamp-1 group-hover:text-emerald-600 transition-colors">
                            {course.title}
                          </h3>

                          {course.short_description && (
                            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                              {course.short_description}
                            </p>
                          )}
                        </div>

                        {/* Barra 100% y Botón de Repaso */}
                        <div className="space-y-3.5 pt-2 border-t">
                          <div>
                            <div className="flex justify-between items-center text-xs mb-1.5">
                              <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-[11px] uppercase tracking-wider">
                                Materia Finalizada
                              </span>
                              <span className="font-black text-emerald-600 dark:text-emerald-400">
                                100%
                              </span>
                            </div>
                            <div className="w-full bg-emerald-500/10 rounded-full h-2 overflow-hidden shadow-inner">
                              <div className="bg-emerald-500 h-2 rounded-full w-full" />
                            </div>
                          </div>

                          <Link
                            href={courseUrl}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border/80 px-4 py-2.5 text-sm font-semibold shadow-2xs transition-colors"
                          >
                            <RotateCcw className="w-4 h-4 shrink-0 text-muted-foreground" />
                            <span>Repasar materia</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

        </div>
      </PageBody>
    </>
  );
}
