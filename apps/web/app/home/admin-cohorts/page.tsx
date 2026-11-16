import Link from 'next/link';
import { Calendar, Users } from 'lucide-react';
import { PageBody, PageHeader } from '@kit/ui/page';
import { Badge } from '@kit/ui/badge';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { CreateSemesterDialog } from './_components/create-semester-dialog';
import { SyncCohortsButton } from './_components/sync-cohorts-button';
import { formatSemesterName } from '~/home/admin-users/_lib/student-utils';

export const metadata = {
  title: 'Gestión de Cohortes',
};

export default async function AdminCohortsPage() {
  await requireUserInServerComponent();
  const client = getSupabaseServerAdminClient();

  // Load academic periods, their cohorts, and student enrollment counts
  const [{ data: periodsData, error }, { data: allEnrollments }] = await Promise.all([
    client
      .from('academic_periods')
      .select(`
        *,
        cohorts (
          id,
          name
        )
      `)
      .order('start_date', { ascending: false }),
    client
      .from('cohort_enrollments')
      .select('cohort_id, student_id'),
  ]);

  const periods = (periodsData || []) as any[];

  const enrollmentCountsByCohort = new Map<string, number>();
  (allEnrollments || []).forEach((e) => {
    enrollmentCountsByCohort.set(
      e.cohort_id,
      (enrollmentCountsByCohort.get(e.cohort_id) || 0) + 1
    );
  });

  return (
    <>
      <PageHeader
        title="Gestión de Cohortes"
        description="Administra los semestres (ej: 2026 - I, 2026 - II), crea grupos de estudiantes y programa el calendario de materias."
      />

      <PageBody>
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900 p-4 text-sm text-blue-800 dark:text-blue-300 flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 p-1">
            <svg className="h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">Guía: Cohortes por Semestre</h4>
            <p className="leading-relaxed">
              Cada tarjeta representa una <strong>cohorte por semestre</strong> lectivo. Haz clic en cualquiera de ellas para gestionar sus estudiantes inscritos, programar materias o migrar alumnos de otros periodos.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="bg-background text-foreground rounded-xl border p-3.5 sm:p-6 shadow-xs">
            <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-xl font-bold">Cohortes por Semestre</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Organización académica por periodo lectivo
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <SyncCohortsButton />
                <CreateSemesterDialog />
              </div>
            </div>
            
            {error ? (
              <div className="text-red-500">Error al cargar la información.</div>
            ) : !periods || periods.length === 0 ? (
              <div className="text-muted-foreground bg-muted/20 rounded-xl border p-8 text-center text-sm">
                Aún no hay semestres creados. Comienza creando el primer periodo lectivo.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
                {periods.map((period) => {
                  const formattedPeriodName = formatSemesterName(period.name);
                  const cohort = period.cohorts?.[0];
                  const studentCount = cohort ? (enrollmentCountsByCohort.get(cohort.id) || 0) : 0;
                  const cohortHref = cohort ? `/home/admin-cohorts/${cohort.id}` : '#';

                  return (
                    <Link
                      key={period.id}
                      href={cohortHref}
                      className="bg-card hover:bg-muted/40 border-2 hover:border-primary/60 transition-all rounded-xl p-5 shadow-xs flex flex-col justify-between gap-5 group"
                    >
                      <div className="space-y-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                              <Calendar className="h-5 w-5" />
                            </div>
                            <div>
                              <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                                {formattedPeriodName}
                              </h3>
                              <span className="text-xs text-muted-foreground block">
                                Cohorte de Semestre
                              </span>
                            </div>
                          </div>
                          {period.is_active && (
                            <Badge variant="secondary" className="text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-300">
                              Activo
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-2 pt-2 border-t text-xs">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5 shrink-0" />
                            <span>
                              {new Date(period.start_date).toLocaleDateString()} - {new Date(period.end_date).toLocaleDateString()}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 font-semibold text-foreground">
                            <Users className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span>
                              {studentCount} {studentCount === 1 ? 'estudiante' : 'estudiantes'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t flex items-center justify-between text-xs text-primary font-semibold group-hover:underline">
                        <span>Administrar Estudiantes y Cronograma</span>
                        <span>&rarr;</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </PageBody>
    </>
  );
}
