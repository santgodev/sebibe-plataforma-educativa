import Link from 'next/link';
import { PageBody, PageHeader } from '@kit/ui/page';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { CreateSemesterDialog } from './_components/create-semester-dialog';
import { CreateCohortDialog } from './_components/create-cohort-dialog';

export const metadata = {
  title: 'Gestión de Cohortes',
};

export default async function AdminCohortsPage() {
  await requireUserInServerComponent();
  const client = getSupabaseServerAdminClient();

  // Load academic periods and their cohorts
  const { data: periodsData, error } = await client
    .from('academic_periods')
    .select(`
      *,
      cohorts (
        id,
        name
      )
    `)
    .order('start_date', { ascending: false });

  // Add robust type casting so TypeScript knows what we have
  const periods = (periodsData || []) as any[];

  return (
    <>
      <PageHeader
        title="Gestión de Cohortes"
        description="Administra los semestres, crea grupos (cohortes) y programa el calendario de materias."
      />

      <PageBody>
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-blue-100 p-1">
            <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h4 className="font-semibold text-blue-900 mb-1">Guía: ¿Cómo funciona este módulo?</h4>
            <p className="leading-relaxed">
              1. Crea un <strong>Semestre</strong> (ej. 2025-I).<br/>
              2. Crea un <strong>Grupo</strong> (Cohorte) dentro de ese semestre.<br/>
              3. Inscribe a los alumnos en el grupo y configúrales el calendario (cronograma) de las materias que verán.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="bg-background text-foreground rounded-xl border p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Semestres y Grupos</h2>
              <CreateSemesterDialog />
            </div>
            
            {error ? (
              <div className="text-red-500">Error al cargar la información.</div>
            ) : !periods || periods.length === 0 ? (
              <div className="text-muted-foreground bg-muted/20 rounded-xl border p-8 text-center">
                Aún no hay semestres creados.
              </div>
            ) : (
              <div className="space-y-6">
                {periods.map(period => (
                  <div key={period.id} className="border p-6 rounded-xl space-y-4">
                    <div className="flex justify-between items-center pb-4 border-b">
                      <div>
                        <h3 className="font-bold text-lg">{period.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {new Date(period.start_date).toLocaleDateString()} - {new Date(period.end_date).toLocaleDateString()}
                        </p>
                      </div>
                      <CreateCohortDialog periodId={period.id} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {!period.cohorts || period.cohorts.length === 0 ? (
                        <div className="col-span-full py-4 text-center text-sm text-muted-foreground">
                          No hay grupos creados en este semestre.
                        </div>
                      ) : (
                        period.cohorts.map((cohort: any) => (
                          <Link key={cohort.id} href={`/home/admin-cohorts/${cohort.id}`} className="bg-muted/30 border rounded-lg p-4 flex flex-col justify-between items-start gap-4 hover:border-primary/50 transition-colors">
                            <h4 className="font-semibold">{cohort.name}</h4>
                            <div className="flex items-center text-xs text-muted-foreground hover:text-primary">
                              Administrar Estudiantes y Cronograma &rarr;
                            </div>
                          </Link>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </PageBody>
    </>
  );
}
