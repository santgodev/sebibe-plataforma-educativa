import { Award, BookOpen, Clock, CheckCircle2 } from 'lucide-react';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { StudentCoursesSection } from '~/home/admin-users/[id]/_components/student-courses-section';
import { ViewSubmissionDialog } from '~/home/admin-users/[id]/_components/view-submission-dialog';

export async function StudentGradesView({ userId }: { userId: string }) {
  const adminClient = getSupabaseServerAdminClient();

  // 1. Fetch enrolled courses for the student
  const { data: enrollments } = await adminClient
    .from('course_enrollments')
    .select('course_id, enrolled_at')
    .eq('student_id', userId);

  const enrolledCourseIds = (enrollments || []).map((e) => e.course_id);

  // 2. Fetch all evaluation attempts for this student with full question and answer data
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
            courses ( id, title, thumbnail_url, short_description )
          )
        )
      )
    `)
    .eq('student_id', userId)
    .order('completed_at', { ascending: false });

  const attempts = rawAttempts || [];

  // 3. Collect all distinct courses (enrolled + courses with attempts)
  const allCourseIds = new Set<string>(enrolledCourseIds);
  attempts.forEach((a) => {
    const act = a.activities as any;
    const cId =
      act?.course_id ||
      act?.lessons?.course_modules?.course_id ||
      act?.lessons?.course_modules?.courses?.id;
    if (cId) allCourseIds.add(cId);
  });

  // 4. Fetch lesson progress for completion stats
  const { data: progress } = await adminClient
    .from('lesson_progress')
    .select('lesson_id')
    .eq('student_id', userId);

  const completedLessonIds = (progress || []).map((p) => p.lesson_id);

  // 5. Build courses with details and evaluations
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

      // Filter attempts for this course
      const courseAttempts = attempts.filter((a) => {
        const act = a.activities as any;
        const cId =
          act?.course_id ||
          act?.lessons?.course_modules?.course_id ||
          act?.lessons?.course_modules?.courses?.id;
        return cId === course.id;
      });

      // Grade stats
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

  // Attempts without an associated course (fallback)
  const standaloneAttempts = attempts.filter((a) => {
    const act = a.activities as any;
    const cId =
      act?.course_id ||
      act?.lessons?.course_modules?.course_id ||
      act?.lessons?.course_modules?.courses?.id;
    return !cId;
  });

  // Global KPIs for student
  const allGradedAttempts = attempts.filter((a) => a.score !== null && a.score !== undefined);
  const overallAverageScore =
    allGradedAttempts.length > 0
      ? allGradedAttempts.reduce((acc, curr) => acc + (curr.score || 0), 0) / allGradedAttempts.length
      : null;
  const totalNeedsGrading = attempts.filter((a) => a.status === 'needs_grading').length;

  return (
    <div className="container max-w-5xl py-6 sm:py-10 px-3 sm:px-6 lg:px-8">
      {/* Encabezado Principal */}
      <div className="mb-6 sm:mb-8 space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
          <Award className="h-7 w-7 sm:h-8 sm:w-8 text-primary shrink-0" />
          <span>Mis Calificaciones</span>
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
          Consulta tu progreso académico, notas acumuladas y el registro de tus evaluaciones por cada asignatura. La calificación se evalúa en escala de 1.0 a 5.0.
        </p>
      </div>

      {/* Tarjetas KPI de Resumen del Estudiante (100% responsivas para móvil) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mb-6 sm:mb-8">
        <div className="p-3 sm:p-4 rounded-xl bg-card border shadow-2xs text-center">
          <span className="text-[11px] sm:text-xs text-muted-foreground block font-medium">
            Materias
          </span>
          <span className="text-xl sm:text-2xl font-black text-foreground">
            {coursesWithDetails.length}
          </span>
        </div>

        <div className="p-3 sm:p-4 rounded-xl bg-card border shadow-2xs text-center">
          <span className="text-[11px] sm:text-xs text-muted-foreground block font-medium">
            Evaluaciones
          </span>
          <span className="text-xl sm:text-2xl font-black text-foreground">
            {attempts.length}
          </span>
        </div>

        <div className="p-3 sm:p-4 rounded-xl bg-card border shadow-2xs text-center">
          <span className="text-[11px] sm:text-xs text-muted-foreground block font-medium">
            Promedio General
          </span>
          <span className="text-xl sm:text-2xl font-black text-foreground">
            {overallAverageScore !== null ? (
              <>
                {((overallAverageScore || 0) / 20).toFixed(1)}
                <span className="text-xs font-normal text-muted-foreground"> / 5.0</span>
              </>
            ) : (
              <span className="text-xs font-normal text-muted-foreground">Sin notas</span>
            )}
          </span>
        </div>

        <div className="p-3 sm:p-4 rounded-xl bg-card border shadow-2xs text-center">
          <span className="text-[11px] sm:text-xs text-muted-foreground block font-medium">
            En Revisión
          </span>
          <span
            className={`text-xl sm:text-2xl font-black ${
              totalNeedsGrading > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'
            }`}
          >
            {totalNeedsGrading}
          </span>
        </div>
      </div>

      {/* Sección Desplegable de Asignaturas */}
      <StudentCoursesSection courses={coursesWithDetails} isStudentView={true} />

      {/* Evaluaciones Independientes si existen */}
      {standaloneAttempts.length > 0 && (
        <div className="bg-background rounded-xl border p-4 sm:p-6 shadow-xs space-y-3 mt-6">
          <div className="flex items-center gap-2 border-b pb-2">
            <Award className="w-5 h-5 text-amber-600 shrink-0" />
            <h3 className="font-bold text-sm sm:text-base text-foreground">
              Otras Evaluaciones Realizadas
            </h3>
          </div>
          <div className="space-y-2.5">
            {standaloneAttempts.map((attempt: any) => {
              const activity = attempt.activities as any;
              const isNeedsGrading = attempt.status === 'needs_grading';
              const passed = (attempt.score || 0) >= (activity?.passing_score || 70);
              const grade5 = ((attempt.score || 0) / 20).toFixed(1);

              return (
                <div
                  key={attempt.id}
                  className="border rounded-lg p-3 sm:p-3.5 bg-muted/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div>
                    <h4 className="font-bold text-sm text-foreground">
                      {activity?.title || 'Evaluación'}
                    </h4>
                    <span className="text-xs text-muted-foreground">
                      Intento #{attempt.attempt_number || 1} •{' '}
                      {new Date(attempt.completed_at || '').toLocaleDateString('es-ES')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                    <span className="text-base sm:text-lg font-bold text-foreground">
                      {isNeedsGrading ? 'En revisión' : `${grade5} / 5.0`}
                    </span>
                    <ViewSubmissionDialog attempt={attempt as any} isReadOnly={true} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
