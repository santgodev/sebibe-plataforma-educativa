import Link from 'next/link';
import { ArrowLeft, BookOpen, CheckCircle, Clock } from 'lucide-react';
import { notFound } from 'next/navigation';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { PageBody, PageHeader } from '@kit/ui/page';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';
import { Button } from '@kit/ui/button';
import { ViewSubmissionDialog } from './_components/view-submission-dialog';
import { calculateSemester } from '../_lib/student-utils';

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

  // 1.5 Get student details if any
  const { data: studentProfile } = await adminClient
    .from('students')
    .select('*')
    .eq('user_id', studentId)
    .maybeSingle();

  // 2. Get enrolled courses
  const { data: enrollments } = await adminClient
    .from('course_enrollments')
    .select('course_id')
    .eq('user_id', studentId);

  const enrolledCourseIds = enrollments?.map(e => e.course_id) || [];

  // 3. Get courses data
  let coursesWithProgress: any[] = [];
  if (enrolledCourseIds.length > 0) {
    const { data: courses } = await adminClient
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
          <Button variant="outline" size="sm" className="gap-2 text-slate-900 dark:text-slate-100">
            <ArrowLeft className="h-4 w-4" />
            <span translate="no">Volver a Usuarios</span>
          </Button>
        </Link>
      </PageHeader>

      <PageBody>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna Izquierda: Perfil y Cursos */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Tarjeta de Perfil del Estudiante */}
            {studentProfile && (
              <div className="bg-background rounded-xl border p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-900 dark:text-slate-100">
                  <span translate="no">Información del Estudiante</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground font-semibold" translate="no">Cédula / Documento</p>
                    <p className="text-slate-900 dark:text-slate-100 font-medium" translate="no">{studentProfile.document_id}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground font-semibold" translate="no">Correo Institucional</p>
                    <p className="text-slate-900 dark:text-slate-100 font-medium" translate="no">{studentProfile.institutional_email}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground font-semibold" translate="no">Teléfono</p>
                    <p className="text-slate-900 dark:text-slate-100 font-medium" translate="no">{studentProfile.phone}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground font-semibold" translate="no">Fecha de Nacimiento</p>
                    <p className="text-slate-900 dark:text-slate-100 font-medium" translate="no">{studentProfile.birth_date}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground font-semibold" translate="no">Iglesia</p>
                    <p className="text-slate-900 dark:text-slate-100 font-medium" translate="no">{studentProfile.church}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground font-semibold" translate="no">Semestre Actual</p>
                    <p className="text-slate-900 dark:text-slate-100 font-medium" translate="no">
                      Semestre {studentProfile.entry_date ? calculateSemester(studentProfile.entry_date) : 1}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground font-semibold" translate="no">Modalidad</p>
                    <p className="text-slate-900 dark:text-slate-100 font-medium capitalize" translate="no">{studentProfile.modality || 'Presencial'}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-background rounded-xl border p-6">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <BookOpen className="h-5 w-5 text-primary" />
                <span translate="no">Materias Inscritas</span>
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
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span translate="no">Últimas Evaluaciones</span>
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
