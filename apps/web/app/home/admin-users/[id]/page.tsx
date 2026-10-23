import Link from 'next/link';
import { notFound } from 'next/navigation';
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
import { calculateSemester } from '../_lib/student-utils';

export const metadata = {
  title: 'Progreso y Calificaciones del Estudiante',
};

export default async function StudentProgressPage(props: { params: Promise<{ id: string }> }) {
  await requireUserInServerComponent();
  const { id: studentId } = await props.params;

  const adminClient = getSupabaseServerAdminClient();

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

      // Calculate grade statistics for this course
      const gradedAttempts = courseAttempts.filter((a) => a.score !== null && a.score !== undefined);
      const averageScore =
        gradedAttempts.length > 0
          ? gradedAttempts.reduce((acc, curr) => acc + (curr.score || 0), 0) / gradedAttempts.length
          : null;

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

  // Global KPIs across all courses
  const allGradedAttempts = attempts.filter((a) => a.score !== null && a.score !== undefined);
  const overallAverageScore =
    allGradedAttempts.length > 0
      ? allGradedAttempts.reduce((acc, curr) => acc + (curr.score || 0), 0) / allGradedAttempts.length
      : null;
  const totalNeedsGrading = attempts.filter((a) => a.status === 'needs_grading').length;

  return (
    <>
      <PageHeader
        title={`Progreso: ${account.name || 'Estudiante'}`}
        description={`Panel de seguimiento y calificaciones para ${account.email}`}
      >
        <div className="flex items-center gap-2">
          <EditUserDialog
            user={userDataForEdit}
            trigger={
              <Button variant="outline" size="sm" className="gap-2 text-foreground font-medium">
                <UserCog className="h-4 w-4 text-primary" />
                <span>Editar Datos</span>
              </Button>
            }
          />
          <Link href="/home/admin-users">
            <Button variant="outline" size="sm" className="gap-2 text-foreground font-medium">
              <ArrowLeft className="h-4 w-4" />
              <span>Volver a Usuarios</span>
            </Button>
          </Link>
        </div>
      </PageHeader>

      <PageBody>
        <div className="space-y-8 pb-16">
          {/* Tarjeta Superior: Información del Estudiante & Resumen General */}
          <div className="bg-background rounded-xl border p-5 sm:p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                  {account.name ? account.name.slice(0, 2).toUpperCase() : 'ES'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-foreground leading-tight">
                      {account.name || 'Sin Nombre'}
                    </h2>
                    <Badge variant="secondary" className="font-semibold text-xs">
                      {roleLabel}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{account.email}</p>
                </div>
              </div>

              <EditUserDialog
                user={userDataForEdit}
                trigger={
                  <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-primary self-start sm:self-center">
                    <UserCog className="h-3.5 w-3.5" />
                    <span>Editar Perfil</span>
                  </Button>
                }
              />
            </div>

            {/* Datos Personales del Estudiante */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div className="p-3 bg-muted/20 rounded-lg border">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Cédula / Documento
                </span>
                <p className="text-foreground font-medium">
                  {studentProfile?.document_id || <span className="text-muted-foreground italic">No registrada</span>}
                </p>
              </div>

              <div className="p-3 bg-muted/20 rounded-lg border">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Correo Institucional
                </span>
                <p className="text-foreground font-medium truncate" title={studentProfile?.institutional_email || account.email}>
                  {studentProfile?.institutional_email || account.email}
                </p>
              </div>

              <div className="p-3 bg-muted/20 rounded-lg border">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Teléfono
                </span>
                <p className="text-foreground font-medium">
                  {studentProfile?.phone || <span className="text-muted-foreground italic">No registrado</span>}
                </p>
              </div>

              <div className="p-3 bg-muted/20 rounded-lg border">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Fecha de Nacimiento
                </span>
                <p className="text-foreground font-medium">
                  {studentProfile?.birth_date || <span className="text-muted-foreground italic">No registrada</span>}
                </p>
              </div>

              <div className="p-3 bg-muted/20 rounded-lg border">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Iglesia
                </span>
                <p className="text-foreground font-medium">
                  {studentProfile?.church || <span className="text-muted-foreground italic">No registrada</span>}
                </p>
              </div>

              <div className="p-3 bg-muted/20 rounded-lg border">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Semestre Actual
                </span>
                <p className="text-foreground font-semibold text-primary">
                  {studentProfile?.entry_date ? calculateSemester(studentProfile.entry_date) : 'Sin fecha de ingreso'}
                </p>
              </div>

              <div className="p-3 bg-muted/20 rounded-lg border">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Modalidad
                </span>
                <p className="text-foreground font-medium capitalize">
                  {studentProfile?.modality || 'Presencial'}
                </p>
              </div>

              <div className="p-3 bg-muted/20 rounded-lg border">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Estado de Revisiones
                </span>
                <p className="text-foreground font-medium">
                  {totalNeedsGrading > 0 ? (
                    <span className="text-amber-700 dark:text-amber-400 font-bold inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {totalNeedsGrading} por calificar
                    </span>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Todo al día
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Fila de Resumen Académico Global */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t">
              <div className="text-center p-3 rounded-lg bg-primary/5 border border-primary/10">
                <span className="text-xs text-muted-foreground block font-medium">Asignaturas</span>
                <span className="text-2xl font-black text-foreground">{coursesWithDetails.length}</span>
              </div>

              <div className="text-center p-3 rounded-lg bg-primary/5 border border-primary/10">
                <span className="text-xs text-muted-foreground block font-medium">Evaluaciones</span>
                <span className="text-2xl font-black text-foreground">{attempts.length}</span>
              </div>

              <div className="text-center p-3 rounded-lg bg-primary/5 border border-primary/10">
                <span className="text-xs text-muted-foreground block font-medium">Promedio General</span>
                <span className="text-2xl font-black text-foreground">
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

              <div className="text-center p-3 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40">
                <span className="text-xs text-amber-900 dark:text-amber-300 block font-medium">Por Calificar</span>
                <span className="text-2xl font-black text-amber-700 dark:text-amber-400">{totalNeedsGrading}</span>
              </div>
            </div>
          </div>

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
                    const passed = (attempt.score || 0) >= (activity?.passing_score || 70);
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
        </div>
      </PageBody>
    </>
  );
}
