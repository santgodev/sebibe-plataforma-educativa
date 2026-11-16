import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
  ArrowLeft,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  FileCheck,
  FileText,
  GraduationCap,
  Mail,
  Phone,
  Sparkles,
  User,
  UserCog,
  XCircle,
} from 'lucide-react';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { PageBody, PageHeader } from '@kit/ui/page';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';
import { Button } from '@kit/ui/button';
import { Badge } from '@kit/ui/badge';
import { ViewSubmissionDialog } from './_components/view-submission-dialog';
import { StudentCoursesSection } from './_components/student-courses-section';
import { EditUserDialog } from '../_components/edit-user-dialog';
import { calculateSemester, calculateBestScoresAverage } from '../_lib/student-utils';

export const metadata = {
  title: 'Progreso y Calificaciones del Estudiante',
};

export default async function StudentProgressPage(props: { params: Promise<{ id: string }> }) {
  const user = await requireUserInServerComponent();
  const { id: studentId } = await props.params;

  const adminClient = getSupabaseServerAdminClient();

  // Verify caller is admin or professor
  const { data: callerRoleData } = await adminClient
    .from('user_roles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const callerRole = callerRoleData?.role;
  const isStaff = callerRole === 'administrador' || callerRole === 'admin' || callerRole === 'profesor';
  if (!isStaff) {
    redirect('/home');
  }

  const isAdmin = callerRole === 'administrador' || callerRole === 'admin';

  // 1. Get user details
  const { data: account, error: accountError } = await adminClient
    .from('accounts')
    .select('*')
    .eq('id', studentId)
    .single();

  if (accountError || !account) {
    return notFound();
  }

  // 1.5 Get student profile if any
  const { data: studentProfile } = await adminClient
    .from('students')
    .select('*')
    .eq('user_id', studentId)
    .maybeSingle();

  // 1.8 Get user role
  const { data: roleData } = await adminClient
    .from('user_roles')
    .select('role')
    .eq('id', studentId)
    .maybeSingle();

  const currentRole = roleData?.role || 'alumno';
  const roleLabel =
    currentRole === 'administrador' || currentRole === 'admin'
      ? 'Administrador'
      : currentRole === 'profesor' || currentRole === 'instructor'
      ? 'Profesor'
      : 'Estudiante';

  const userDataForEdit = {
    id: account.id,
    name: account.name || 'Sin Nombre',
    email: account.email || '',
    role: currentRole,
    created_at: account.created_at || new Date().toISOString(),
    semester: studentProfile?.entry_date ? calculateSemester(studentProfile.entry_date) : null,
    modality: studentProfile?.modality || null,
    studentProfile: studentProfile || null,
  };

  // 1.9 If user is a teacher, fetch their assigned courses
  const { data: teacherCourses } = await adminClient
    .from('courses')
    .select('id, title, thumbnail_url, short_description, status, level')
    .eq('instructor_id', studentId);

  // 2. Get enrolled courses (using student_id)
  const { data: enrollments } = await adminClient
    .from('course_enrollments')
    .select('course_id, enrolled_at')
    .eq('student_id', studentId);

  const enrolledCourseIds = (enrollments || []).map((e) => e.course_id);

  // 3. Get all evaluation attempts for this student with full lesson and course metadata
  const { data: rawAttempts } = await adminClient
    .from('activity_attempts')
    .select(`
      id, score, status, completed_at, attempt_number, file_url, answers_json,
      activities (
        id, title, type, passing_score, course_id, lesson_id,
        activity_questions (
          id, question_text, type, order_index,
          activity_answers ( id, answer_text, is_correct, order_index )
        ),
        lessons (
          id, title,
          course_modules (
            id, title, course_id,
            courses ( id, title, thumbnail_url )
          )
        )
      )
    `)
    .eq('student_id', studentId)
    .order('completed_at', { ascending: false });

  const attempts = rawAttempts || [];

  // 4. Collect all distinct courses (both explicitly enrolled and courses with attempts)
  const allCourseIds = new Set<string>(enrolledCourseIds);
  attempts.forEach((a) => {
    const act = a.activities as any;
    const cId =
      act?.course_id ||
      act?.lessons?.course_modules?.course_id ||
      act?.lessons?.course_modules?.courses?.id;
    if (cId) allCourseIds.add(cId);
  });

  // 5. Get lesson progress for this student
  const { data: progress } = await adminClient
    .from('lesson_progress')
    .select('lesson_id')
    .eq('student_id', studentId);

  const completedLessonIds = (progress || []).map((p) => p.lesson_id);

  // 6. Fetch courses and organize them with their evaluation attempts and progress
  let coursesWithDetails: any[] = [];
  if (allCourseIds.size > 0) {
    const { data: courses } = await adminClient
      .from('courses')
      .select(`
        id, title, thumbnail_url, short_description,
        course_modules (
          id, title,
          lessons ( id, title )
        )
      `)
      .in('id', Array.from(allCourseIds));

    coursesWithDetails = (courses || []).map((course) => {
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

      // Filter attempts belonging to this specific course
      const courseAttempts = attempts.filter((a) => {
        const act = a.activities as any;
        const cId =
          act?.course_id ||
          act?.lessons?.course_modules?.course_id ||
          act?.lessons?.course_modules?.courses?.id;
        return cId === course.id;
      });

      // Calculate grade statistics for this course (taking highest score per activity)
      const averageScore = calculateBestScoresAverage(courseAttempts);

      const hasNeedsGrading = courseAttempts.some((a) => a.status === 'needs_grading');

      return {
        ...course,
        totalLessons,
        completedLessons,
        percentage,
        attempts: courseAttempts,
        averageScore,
        hasNeedsGrading,
        isEnrolled: enrolledCourseIds.includes(course.id),
      };
    });
  }

  // 7. Attempts without an associated course (fallback)
  const standaloneAttempts = attempts.filter((a) => {
    const act = a.activities as any;
    const cId =
      act?.course_id ||
      act?.lessons?.course_modules?.course_id ||
      act?.lessons?.course_modules?.courses?.id;
    return !cId;
  });

  // Global KPIs across all courses (taking highest score per activity)
  const overallAverageScore = calculateBestScoresAverage(attempts);
  const totalNeedsGrading = attempts.filter((a) => a.status === 'needs_grading').length;

  return (
    <>
      <PageHeader className="flex-col sm:flex-row items-start sm:items-center gap-3 sm:justify-between"
        title={
          currentRole === 'profesor'
            ? `Profesor: ${account.name || 'Docente'}`
            : currentRole === 'administrador' || currentRole === 'admin'
            ? `Administrador: ${account.name || 'Usuario'}`
            : `Progreso: ${account.name || 'Estudiante'}`
        }
        description={
          currentRole === 'profesor'
            ? `Perfil del docente y asignaturas asignadas`
            : currentRole === 'administrador' || currentRole === 'admin'
            ? `Información del administrador del sistema`
            : `Panel de seguimiento y calificaciones para ${account.email}`
        }
      >
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link href={isAdmin ? "/home/admin-users" : "/home/grades"}>
            <Button variant="outline" size="sm" className="gap-2 text-foreground font-medium w-full sm:w-auto justify-center">
              <ArrowLeft className="h-4 w-4" />
              <span>{isAdmin ? "Volver a Usuarios" : "Volver a Notas"}</span>
            </Button>
          </Link>
        </div>
      </PageHeader>

      <PageBody>
        <div className="space-y-8 pb-16">
          {/* Tarjeta Superior: Información Personal & Resumen General */}
          <div className="bg-background rounded-xl border p-4 sm:p-6 shadow-xs space-y-5 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-base sm:text-lg shrink-0">
                  {account.name ? account.name.slice(0, 2).toUpperCase() : 'US'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <h2 className="text-lg sm:text-xl font-bold text-foreground leading-tight break-words">
                      {account.name || 'Sin Nombre'}
                    </h2>
                    <Badge variant="secondary" className="font-semibold text-xs">
                      {roleLabel}
                    </Badge>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground break-all mt-0.5">{account.email}</p>
                </div>
              </div>

              {currentRole === 'profesor' && isAdmin && (
                <EditUserDialog
                  user={userDataForEdit}
                  trigger={
                    <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-primary w-full sm:w-auto justify-center self-stretch sm:self-center border sm:border-transparent">
                      <UserCog className="h-3.5 w-3.5" />
                      <span>Editar Perfil</span>
                    </Button>
                  }
                />
              )}
            </div>

            {/* Datos Personales */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 text-xs sm:text-sm">
              <div className="p-2.5 sm:p-3 bg-muted/20 rounded-lg border min-w-0">
                <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-0.5 sm:mb-1">
                  Cédula / Documento
                </span>
                <p className="text-foreground font-medium">
                  {studentProfile?.document_id || <span className="text-muted-foreground italic">No registrada</span>}
                </p>
              </div>

              <div className="p-2.5 sm:p-3 bg-muted/20 rounded-lg border min-w-0">
                <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-0.5 sm:mb-1">
                  Correo Institucional
                </span>
                <p className="text-foreground font-medium truncate" title={studentProfile?.institutional_email || account.email}>
                  {studentProfile?.institutional_email || account.email}
                </p>
              </div>

              <div className="p-2.5 sm:p-3 bg-muted/20 rounded-lg border min-w-0">
                <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-0.5 sm:mb-1">
                  Teléfono
                </span>
                <p className="text-foreground font-medium">
                  {studentProfile?.phone || <span className="text-muted-foreground italic">No registrado</span>}
                </p>
              </div>

              <div className="p-2.5 sm:p-3 bg-muted/20 rounded-lg border min-w-0">
                <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-0.5 sm:mb-1">
                  Fecha de Nacimiento
                </span>
                <p className="text-foreground font-medium">
                  {studentProfile?.birth_date || <span className="text-muted-foreground italic">No registrada</span>}
                </p>
              </div>

              <div className="p-2.5 sm:p-3 bg-muted/20 rounded-lg border min-w-0">
                <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-0.5 sm:mb-1">
                  Iglesia / Congregación
                </span>
                <p className="text-foreground font-medium">
                  {studentProfile?.church || <span className="text-muted-foreground italic">No registrada</span>}
                </p>
              </div>

              <div className="p-2.5 sm:p-3 bg-muted/20 rounded-lg border min-w-0">
                <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-0.5 sm:mb-1">
                  Ciudad de Procedencia
                </span>
                <p className="text-foreground font-medium">
                  {studentProfile?.city || <span className="text-muted-foreground italic">No registrada</span>}
                </p>
              </div>

              {currentRole === 'profesor' ? (
                <>
                  <div className="p-2.5 sm:p-3 bg-muted/20 rounded-lg border min-w-0">
                    <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-0.5 sm:mb-1">
                      Materias Asignadas
                    </span>
                    <p className="text-foreground font-semibold text-primary">
                      {teacherCourses?.length || 0} materia(s)
                    </p>
                  </div>

                  <div className="p-2.5 sm:p-3 bg-muted/20 rounded-lg border min-w-0">
                    <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-0.5 sm:mb-1">
                      Estado
                    </span>
                    <p className="text-emerald-600 dark:text-emerald-400 font-semibold inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Activo
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-2.5 sm:p-3 bg-muted/20 rounded-lg border min-w-0">
                    <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-0.5 sm:mb-1">
                      Semestre Actual
                    </span>
                    <p className="text-foreground font-semibold text-primary">
                      {studentProfile?.entry_date ? calculateSemester(studentProfile.entry_date) : 'Sin fecha de ingreso'}
                    </p>
                  </div>

                  <div className="p-2.5 sm:p-3 bg-muted/20 rounded-lg border min-w-0">
                    <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-0.5 sm:mb-1">
                      Modalidad
                    </span>
                    <p className="text-foreground font-medium capitalize">
                      {studentProfile?.modality || 'Presencial'}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Fila de Resumen Académico Global (Solo Estudiantes) */}
            {currentRole === 'alumno' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 pt-2 border-t">
                <div className="text-center p-2 sm:p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <span className="text-[10px] sm:text-xs text-muted-foreground block font-medium">Asignaturas</span>
                  <span className="text-xl sm:text-2xl font-black text-foreground">{coursesWithDetails.length}</span>
                </div>

                <div className="text-center p-2 sm:p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <span className="text-[10px] sm:text-xs text-muted-foreground block font-medium">Evaluaciones</span>
                  <span className="text-xl sm:text-2xl font-black text-foreground">{attempts.length}</span>
                </div>

                <div className="text-center p-2 sm:p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <span className="text-[10px] sm:text-xs text-muted-foreground block font-medium">Promedio General</span>
                  <span className="text-xl sm:text-2xl font-black text-foreground">
                    {overallAverageScore !== null ? (
                      <>
                        {((overallAverageScore || 0) / 20).toFixed(1)}
                        <span className="text-xs font-normal text-muted-foreground"> / 5.0</span>
                      </>
                    ) : (
                      <span className="text-sm font-normal text-muted-foreground">Sin notas</span>
                    )}
                  </span>
                </div>

                <div className="text-center p-2 sm:p-3 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40">
                  <span className="text-[10px] sm:text-xs text-amber-900 dark:text-amber-300 block font-medium">Por Calificar</span>
                  <span className="text-xl sm:text-2xl font-black text-amber-700 dark:text-amber-400">{totalNeedsGrading}</span>
                </div>
              </div>
            )}
          </div>

          {/* Vistas según rol: Si es Profesor muestra sus Materias Asignadas */}
          {currentRole === 'profesor' ? (
            <div className="bg-background rounded-xl border p-4 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-lg text-foreground">
                    Materias Asignadas ({teacherCourses?.length || 0})
                  </h3>
                </div>
                <Link href="/home/admin-courses/new">
                  <Button size="sm" variant="outline" className="text-xs gap-1.5">
                    Crear Nueva Materia
                  </Button>
                </Link>
              </div>

              {(!teacherCourses || teacherCourses.length === 0) ? (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  <p>Este profesor aún no tiene materias asignadas.</p>
                  <p className="mt-1 text-xs">
                    Puedes asignarle materias al crear o editar una materia en{' '}
                    <Link href="/home/admin-courses" className="text-primary underline">
                      Gestión de Materias
                    </Link>.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {teacherCourses.map((c) => (
                    <div
                      key={c.id}
                      className="border rounded-lg p-4 bg-card flex flex-col justify-between gap-3 hover:border-primary transition-colors shadow-2xs"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <Badge
                            variant={c.status === 'published' ? 'default' : 'secondary'}
                            className="text-xs capitalize"
                          >
                            {c.status === 'published' ? 'Publicada' : 'Borrador'}
                          </Badge>
                          {c.level && (
                            <span className="text-[11px] text-muted-foreground font-semibold">
                              {c.level === 'beginner'
                                ? 'Básico'
                                : c.level === 'intermediate'
                                ? 'Intermedio'
                                : c.level === 'advanced'
                                ? 'Avanzado'
                                : 'Todos los niveles'}
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-base text-foreground leading-snug">
                          {c.title}
                        </h4>
                        {c.short_description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {c.short_description}
                          </p>
                        )}
                      </div>
                      <Link href={`/home/admin-courses/${c.id}`}>
                        <Button variant="outline" size="sm" className="w-full text-xs">
                          Ver / Gestionar Materia
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Sección Principal: Asignaturas Desplegables con sus Portadas, Notas y Evaluaciones */}
              <StudentCoursesSection courses={coursesWithDetails} />

              {/* Evaluaciones Sueltas / Sin Asignatura Asociada (si las hubiera) */}
              {standaloneAttempts.length > 0 && (
                <div className="bg-background rounded-xl border p-5 sm:p-6 shadow-xs space-y-4 mt-6">
                  <div className="flex items-center gap-2 border-b pb-2">
                    <Award className="w-5 h-5 text-amber-600" />
                    <h3 className="font-bold text-base text-foreground">Otras Evaluaciones Independientes</h3>
                  </div>
                  <div className="space-y-3">
                    {standaloneAttempts.map((attempt: any) => {
                      const activity = attempt.activities as any;
                      const isNeedsGrading = attempt.status === 'needs_grading';
                      const grade5 = ((attempt.score || 0) / 20).toFixed(1);

                      return (
                        <div
                          key={attempt.id}
                          className="border rounded-lg p-3.5 bg-muted/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                        >
                          <div>
                            <h4 className="font-bold text-sm text-foreground">{activity?.title || 'Evaluación'}</h4>
                            <span className="text-xs text-muted-foreground">
                              Intento #{attempt.attempt_number || 1} • {new Date(attempt.completed_at || '').toLocaleDateString('es-ES')}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-bold text-foreground">
                              {isNeedsGrading ? 'Por calificar' : `${grade5} / 5.0`}
                            </span>
                            <ViewSubmissionDialog attempt={attempt as any} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </PageBody>
    </>
  );
}
