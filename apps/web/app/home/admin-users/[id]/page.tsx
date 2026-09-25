import Link from 'next/link';
import { ArrowLeft, BookOpen, CheckCircle, Clock } from 'lucide-react';
import { notFound } from 'next/navigation';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { PageBody, PageHeader } from '@kit/ui/page';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';
import { Button } from '@kit/ui/button';
import { ViewSubmissionDialog } from './_components/view-submission-dialog';

export const metadata = {
  title: 'Progreso del Estudiante',
};

export default async function StudentProgressPage(props: { params: Promise<{ id: string }> }) {
  await requireUserInServerComponent();
  const { id: studentId } = await props.params;

  const adminClient = getSupabaseServerAdminClient();
  const client = getSupabaseServerClient();

  // 1. Get user details
  const { data: account, error: accountError } = await adminClient
    .from('accounts')
    .select('*')
    .eq('id', studentId)
    .single();

  if (accountError || !account) {
    return notFound();
  }

  // 2. Get enrolled courses
  const { data: enrollments } = await client
    .from('course_enrollments')
    .select('course_id')
    .eq('user_id', studentId);

  const enrolledCourseIds = enrollments?.map(e => e.course_id) || [];

  // 3. Get courses data
  let coursesWithProgress: any[] = [];
  if (enrolledCourseIds.length > 0) {
    const { data: courses } = await client
      .from('courses')
      .select(`
        id, title, thumbnail_url,
        course_modules (
          lessons ( id )
        )
      `)
      .in('id', enrolledCourseIds);

    // 4. Get lesson progress for this student
    const { data: progress } = await adminClient
      .from('lesson_progress')
      .select('lesson_id')
      .eq('user_id', studentId);

    const completedLessonIds = progress?.map(p => p.lesson_id) || [];

    // Calculate progress per course
    coursesWithProgress = (courses || []).map(course => {
      let totalLessons = 0;
      let completedLessons = 0;

      course.course_modules?.forEach((module: any) => {
        module.lessons?.forEach((lesson: any) => {
          totalLessons++;
          if (completedLessonIds.includes(lesson.id)) {
            completedLessons++;
          }
        });
      });

      const percentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

      return {
        ...course,
        totalLessons,
        completedLessons,
        percentage
      };
    });
  }

  // 5. Get recent evaluation attempts
  const { data: attempts } = await adminClient
    .from('activity_attempts')
    .select(`
      id, score, completed_at, attempt_number, file_url, answers_json,
      activities (
        title, type, passing_score
      )
    `)
    .eq('student_id', studentId)
    .order('completed_at', { ascending: false })
    .limit(10);

  return (
    <>
      <PageHeader
        title={`Progreso: ${account.name || 'Estudiante'}`}
        description={`Panel de seguimiento para ${account.email}`}
      >
        <Link href="/home/admin-users">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver a Usuarios
          </Button>
        </Link>
      </PageHeader>

      <PageBody>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna Izquierda: Cursos */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-background rounded-xl border p-6">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Materias Inscritas
              </h2>

              {coursesWithProgress.length === 0 ? (
                <div className="text-center p-8 bg-muted/20 rounded-lg border border-dashed">
                  <p className="text-muted-foreground">El estudiante no está inscrito en ninguna materia.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {coursesWithProgress.map(course => (
                    <div key={course.id} className="border rounded-lg p-5">
                      <div className="flex gap-4 items-start">
                        {course.thumbnail_url ? (
                          <img src={course.thumbnail_url} alt={course.title} className="w-24 h-16 object-cover rounded shadow-sm" />
                        ) : (
                          <div className="w-24 h-16 bg-muted flex items-center justify-center rounded shadow-sm">
                            <BookOpen className="h-6 w-6 text-muted-foreground/50" />
                          </div>
                        )}
                        <div className="flex-1">
                          <h3 className="font-bold text-lg leading-none mb-2">{course.title}</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            {course.completedLessons} de {course.totalLessons} lecciones completadas
                          </p>
                          
                          <div className="w-full bg-muted rounded-full h-2.5 mb-1 overflow-hidden">
                            <div 
                              className="bg-primary h-2.5 rounded-full transition-all" 
                              style={{ width: `${course.percentage}%` }}
                            ></div>
                          </div>
                          <div className="text-right text-xs font-medium text-muted-foreground">
                            {course.percentage}% Completado
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Columna Derecha: Evaluaciones */}
          <div className="space-y-6">
            <div className="bg-background rounded-xl border p-6">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Últimas Evaluaciones
              </h2>

              {!attempts || attempts.length === 0 ? (
                <div className="text-center p-6 bg-muted/20 rounded-lg border border-dashed text-sm text-muted-foreground">
                  No hay evaluaciones registradas.
                </div>
              ) : (
                <div className="space-y-4">
                  {attempts.map(attempt => {
                    const activity = attempt.activities as any;
                    const passingScore = activity?.passing_score || 0;
                    const passed = (attempt.score || 0) >= passingScore;
                    const grade5 = (attempt.score || 0) / 20;
                    return (
                      <div key={attempt.id} className="border-l-4 rounded bg-muted/30 p-3" style={{ borderLeftColor: passed ? '#16a34a' : '#dc2626' }}>
                        <h4 className="font-semibold text-sm mb-1">{activity?.title || 'Cuestionario'}</h4>
                        <div className="flex justify-between items-end">
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(attempt.completed_at || '').toLocaleDateString('es-ES')}
                            </div>
                            <div>Intento #{attempt.attempt_number || 1}</div>
                          </div>
                          <div className="text-right">
                            <span className={`text-lg font-bold ${passed ? 'text-green-600' : 'text-red-600'}`}>
                              {grade5.toFixed(1)} / 5.0
                            </span>
                            <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                              {passed ? 'Aprobado' : 'Reprobado'}
                            </div>
                          </div>
                        </div>
                        <ViewSubmissionDialog attempt={attempt as any} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </PageBody>
    </>
  );
}
