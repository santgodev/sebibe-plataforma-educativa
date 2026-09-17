import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PageBody, PageHeader } from '@kit/ui/page';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { Button } from '@kit/ui/button';

import { AddStudentDialog } from './_components/add-student-dialog';
import { MigrateCohortDialog } from './_components/migrate-cohort-dialog';
import { AddScheduleDialog } from './_components/add-schedule-dialog';

export const metadata = {
  title: 'Detalles del Grupo',
};

export default async function CohortDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  await requireUserInServerComponent();
  const client = getSupabaseServerAdminClient();
  const cohortId = params.id;

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

  // Load accounts and roles
  const [{ data: accounts }, { data: roles }] = await Promise.all([
    client.from('accounts').select('id, name, email'),
    client.from('user_roles').select('id, role')
  ]);

  const roleMap = new Map((roles || []).map(r => [r.id, r.role]));
  
  const allAlumnos = (accounts || []).filter(a => roleMap.get(a.id) === 'alumno' || !roleMap.has(a.id));
  const allProfesores = (accounts || []).filter(a => roleMap.get(a.id) === 'profesor' || roleMap.get(a.id) === 'administrador');

  // Load enrolled students
  const { data: enrollments } = await client
    .from('cohort_enrollments')
    .select('*')
    .eq('cohort_id', cohortId);
  const enrolledStudentIds = new Set((enrollments || []).map(e => e.student_id));
  const enrolledStudents = allAlumnos.filter(a => enrolledStudentIds.has(a.id));
  // Force hot reload: available students
  const availableStudents = allAlumnos.filter(a => !enrolledStudentIds.has(a.id));

  // Load all other cohorts to allow migrating/bulk-enrolling groups
  const { data: otherCohorts } = await client
    .from('cohorts')
    .select('id, name')
    .neq('id', cohortId);

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

  return (
    <>
      <PageHeader
        title={`Grupo: ${cohort.name}`}
        description={`Semestre: ${(cohort.academic_periods as any)?.name}`}
      >
        <Link href="/home/admin-cohorts">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
        </Link>
      </PageHeader>

      <PageBody>
        <div className="mb-8 rounded-lg border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-800 flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-indigo-100 p-1">
            <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h4 className="font-semibold text-indigo-900 mb-1">Guía: Detalle del Grupo</h4>
            <p className="leading-relaxed">
              Aquí gestionas el día a día del grupo. <br/>
              <strong>1. Estudiantes:</strong> En lugar de matricular uno a uno, puedes seleccionar un grupo anterior (ej. del semestre pasado) y traer a todos sus alumnos a este nuevo grupo.<br/>
              <strong>2. Cronograma:</strong> Programa las materias. Al elegir la fecha de inicio, la fecha de fin se calculará sola según las semanas que dura la materia. ¡Los alumnos solo verán la materia durante ese periodo!
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Cronograma */}
          <div className="bg-background text-foreground rounded-xl border p-6 flex flex-col h-full">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Cronograma de Materias</h2>
              <AddScheduleDialog 
                cohortId={cohortId} 
                courses={courses || []} 
                instructors={allProfesores} 
              />
            </div>
            
            <div className="space-y-4 flex-1">
              {!formattedSchedules || formattedSchedules.length === 0 ? (
                <div className="text-muted-foreground bg-muted/20 rounded-xl border p-8 text-center text-sm">
                  No hay materias programadas.
                </div>
              ) : (
                formattedSchedules.map(schedule => (
                  <div key={schedule.id} className="border p-4 rounded-lg bg-card">
                    <h3 className="font-bold">{schedule.course_title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">Profesor: {schedule.instructor_name}</p>
                    <div className="mt-3 flex items-center justify-between text-xs font-medium text-primary">
                      <span>Inicia: {new Date(schedule.start_date).toLocaleDateString()}</span>
                      <span>Termina: {new Date(schedule.end_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Estudiantes */}
          <div className="bg-background text-foreground rounded-xl border p-6 flex flex-col h-full">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Estudiantes Matriculados ({enrolledStudents.length})</h2>
              <div className="flex items-center gap-2">
                <AddStudentDialog 
                  cohortId={cohortId} 
                  availableStudents={availableStudents} 
                />
                <MigrateCohortDialog 
                  cohortId={cohortId} 
                  otherCohorts={otherCohorts || []} 
                />
              </div>
            </div>
            
            <div className="space-y-2 flex-1">
              {!enrolledStudents || enrolledStudents.length === 0 ? (
                <div className="text-muted-foreground bg-muted/20 rounded-xl border p-8 text-center text-sm">
                  No hay estudiantes en este grupo.
                </div>
              ) : (
                enrolledStudents.map(student => (
                  <div key={student.id} className="border p-3 rounded-lg flex items-center justify-between bg-card">
                    <div>
                      <p className="font-medium text-sm">{student.name}</p>
                      <p className="text-xs text-muted-foreground">{student.email}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </PageBody>
    </>
  );
}
