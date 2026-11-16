import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PageBody, PageHeader } from '@kit/ui/page';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { Button } from '@kit/ui/button';

import { AddStudentDialog } from './_components/add-student-dialog';
import { MigrateCohortDialog, CohortOptionForMigration } from './_components/migrate-cohort-dialog';
import { AddScheduleDialog } from './_components/add-schedule-dialog';
import { CohortStudentsList } from './_components/cohort-students-list';
import { CreateCourseQuickDialog } from './_components/create-course-quick-dialog';

import { calculateSemester, formatSemesterName } from '~/home/admin-users/_lib/student-utils';

export const metadata = {
  title: 'Detalles del Grupo',
};

export default async function CohortDetailsPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  await requireUserInServerComponent();
  const client = getSupabaseServerAdminClient();
  const resolvedParams = await params;
  const cohortId = resolvedParams.id;

  // Fetch cohort info
  const { data: cohort, error: cohortError } = await client
    .from('cohorts')
    .select(`
      *,
      academic_periods (name)
    `)
    .eq('id', cohortId)
    .single();

  if (cohortError || !cohort) {
    return (
      <PageBody>
        <div className="text-red-500">Error: Grupo no encontrado.</div>
      </PageBody>
    );
  }

  // Load accounts, roles, and student profiles
  const [{ data: accounts }, { data: roles }, { data: studentProfiles }, { data: allEnrollments }] = await Promise.all([
    client.from('accounts').select('id, name, email'),
    client.from('user_roles').select('id, role'),
    client.from('students').select('user_id, modality, document_id, entry_date'),
    client.from('cohort_enrollments').select('cohort_id, student_id'),
  ]);

  const roleMap = new Map((roles || []).map(r => [r.id, r.role]));
  const profileMap = new Map((studentProfiles || []).map(s => [s.user_id, s]));
  
  const allAlumnos = (accounts || []).filter(a => roleMap.get(a.id) === 'alumno' || !roleMap.has(a.id)).map(a => {
    const prof = profileMap.get(a.id);
    return {
      ...a,
      modality: prof?.modality || null,
      document_id: prof?.document_id || null,
      semester: prof?.entry_date ? calculateSemester(prof.entry_date) : calculateSemester(null),
    };
  });
  const allProfesores = (accounts || []).filter(a => roleMap.get(a.id) === 'profesor' || roleMap.get(a.id) === 'administrador');

  // Load enrolled students in this cohort
  const enrolledStudentIds = new Set(
    (allEnrollments || []).filter(e => e.cohort_id === cohortId).map(e => e.student_id)
  );
  const enrolledStudents = allAlumnos.filter(a => enrolledStudentIds.has(a.id));
  const availableStudents = allAlumnos.filter(a => !enrolledStudentIds.has(a.id));

  // Count students in other cohorts for migration preview
  const enrollmentCountsByCohort = new Map<string, number>();
  (allEnrollments || []).forEach(e => {
    enrollmentCountsByCohort.set(e.cohort_id, (enrollmentCountsByCohort.get(e.cohort_id) || 0) + 1);
  });

  // Load all other cohorts to allow migrating/bulk-enrolling groups, including their academic period
  const { data: otherCohortsRaw } = await client
    .from('cohorts')
    .select(`
      id,
      name,
      period_id,
      academic_periods (
        id,
        name
      )
    `)
    .neq('id', cohortId);

  const formattedOtherCohorts: CohortOptionForMigration[] = (otherCohortsRaw || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    period_id: c.period_id,
    semesterName: formatSemesterName(c.academic_periods?.name),
    rawSemesterName: c.academic_periods?.name || 'Sin Semestre',
    student_count: enrollmentCountsByCohort.get(c.id) || 0,
  }));

  // Load courses
  const { data: courses } = await client
    .from('courses')
    .select('id, title, credits, duration_weeks')
    .order('title', { ascending: true });

  // Load schedules
  const { data: schedules } = await client
    .from('cohort_schedules')
    .select('*')
    .eq('cohort_id', cohortId)
    .order('start_date', { ascending: true });

  const formattedSchedules = (schedules || []).map((s: any) => {
    const course = (courses || []).find(c => c.id === s.course_id);
    const prof = (accounts || []).find(a => a.id === s.instructor_id);
    return {
      id: s.id,
      course_title: course?.title || 'Desconocido',
      instructor_name: prof?.name || 'Desconocido',
      start_date: s.start_date,
      end_date: s.end_date,
    };
  });

  const formattedPeriodName = formatSemesterName((cohort.academic_periods as any)?.name);

  return (
    <>
      <PageHeader
        title={`Cohorte: ${cohort.name}`}
        description={`Semestre académico: ${formattedPeriodName}`}
      >
        <Link href="/home/admin-cohorts">
          <Button variant="outline" size="sm" className="gap-2 font-medium">
            <ArrowLeft className="h-4 w-4" />
            Volver a Cohortes
          </Button>
        </Link>
      </PageHeader>

      <PageBody>
        <div className="mb-8 rounded-lg border border-indigo-200 bg-indigo-50 dark:bg-indigo-950/20 dark:border-indigo-900 p-4 text-sm text-indigo-800 dark:text-indigo-300 flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 p-1">
            <svg className="h-4 w-4 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h4 className="font-semibold text-indigo-900 dark:text-indigo-200 mb-1">Guía: Detalle de la Cohorte</h4>
            <p className="leading-relaxed">
              Aquí gestionas el día a día de la cohorte {cohort.name}. <br/>
              <strong>1. Estudiantes:</strong> En lugar de matricular uno a uno, puedes seleccionar un grupo anterior (agrupado por semestre ej: 2026 - I, 2026 - II) y traer a todos sus alumnos a esta cohorte.<br/>
              <strong>2. Cronograma:</strong> Programa las materias existentes o crea una nueva materia directamente. Al elegir la fecha de inicio, la fecha de fin se calculará sola según las semanas que dura la materia.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Cronograma de Materias */}
          <div className="bg-background text-foreground rounded-xl border p-3.5 sm:p-6 flex flex-col h-full shadow-xs">
            <div className="mb-4 sm:mb-6 flex items-center justify-between gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold">Cronograma de Materias</h2>
              <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                <CreateCourseQuickDialog 
                  instructors={allProfesores} 
                  cohortId={cohortId} 
                />
                <AddScheduleDialog 
                  cohortId={cohortId} 
                  courses={courses || []} 
                  instructors={allProfesores} 
                />
              </div>
            </div>
            
            <div className="space-y-4 flex-1">
              {!formattedSchedules || formattedSchedules.length === 0 ? (
                <div className="text-muted-foreground bg-muted/20 rounded-xl border p-8 text-center text-sm">
                  No hay materias programadas para este grupo.
                </div>
              ) : (
                formattedSchedules.map(schedule => (
                  <div key={schedule.id} className="border p-4 rounded-lg bg-card shadow-2xs">
                    <h3 className="font-bold text-base text-foreground">{schedule.course_title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">Profesor: {schedule.instructor_name}</p>
                    <div className="mt-3 flex items-center justify-between text-xs font-semibold text-primary">
                      <span>Inicia: {new Date(schedule.start_date).toLocaleDateString()}</span>
                      <span>Termina: {new Date(schedule.end_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Estudiantes Matriculados */}
          <div className="bg-background text-foreground rounded-xl border p-3.5 sm:p-6 flex flex-col h-full shadow-xs">
            <div className="mb-4 sm:mb-6 flex items-center justify-between gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold">Estudiantes Matriculados ({enrolledStudents.length})</h2>
              <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                <AddStudentDialog 
                  cohortId={cohortId} 
                  availableStudents={availableStudents} 
                />
                <MigrateCohortDialog 
                  cohortId={cohortId} 
                  otherCohorts={formattedOtherCohorts} 
                />
              </div>
            </div>
            
            <CohortStudentsList students={enrolledStudents} />
          </div>

        </div>
      </PageBody>
    </>
  );
}
