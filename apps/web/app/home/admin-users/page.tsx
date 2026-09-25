import { PageBody, PageHeader } from '@kit/ui/page';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { UsersTable } from './_components/users-table';
import { CreateUserDialog } from './_components/create-user-dialog';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export const metadata = {
  title: 'Gestión de Usuarios',
};

export default async function AdminUsersPage() {
  await requireUserInServerComponent();
  const client = getSupabaseServerClient();
  const adminClient = getSupabaseServerAdminClient();

  const [{ data: accounts, error: accountsError }, { data: roles, error: rolesError }, { data: courses, error: coursesError }] = await Promise.all([
    adminClient.from('accounts').select('id, name, email, created_at').order('created_at', { ascending: false }),
    adminClient.from('user_roles').select('id, role'),
    client.from('courses').select('id, title').eq('status', 'published')
  ]);

  const error = accountsError || rolesError;

  // Create a map for quick role lookup
  const roleMap = new Map((roles || []).map(r => [r.id, r.role]));

  const formattedUsers = (accounts || []).map((account: any) => ({
    id: account.id,
    name: account.name || 'Sin Nombre',
    email: account.email || 'Sin correo',
    role: roleMap.get(account.id) || 'alumno',
    created_at: account.created_at || new Date().toISOString(),
  }));

  return (
    <>
      <PageHeader
        title="Gestión de Usuarios"
        description="Agrega nuevos alumnos o profesores y visualiza el listado de usuarios."
      >
        <CreateUserDialog />
      </PageHeader>

      <PageBody>
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-blue-100 p-1">
            <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h4 className="font-semibold text-blue-900 mb-1">Guía Rápida para Administradores</h4>
            <p className="leading-relaxed">
              Aquí puedes crear cuentas para <strong>estudiantes</strong>, <strong>profesores</strong> o nuevos <strong>administradores</strong>. 
              Recuerda que luego de crear un estudiante, deberás inscribirlo a un Grupo (Cohorte) desde el módulo de Cohortes para que herede automáticamente sus materias.
            </p>
          </div>
        </div>

        <div className="bg-background text-foreground rounded-xl border p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Listado de Usuarios</h2>
          </div>
          {error ? (
            <div className="text-red-500">
              <p>Error al cargar usuarios.</p>
              <pre className="text-xs mt-2 overflow-auto max-w-full p-2 bg-red-50 rounded">
                {JSON.stringify(error, null, 2)}
              </pre>
            </div>
          ) : (
            <UsersTable users={formattedUsers} courses={courses || []} />
          )}
        </div>
      </PageBody>
    </>
  );
}
