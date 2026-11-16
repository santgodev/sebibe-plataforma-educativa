import { redirect } from 'next/navigation';

import { PageBody, PageHeader } from '@kit/ui/page';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';

import { CreateCourseForm } from '../_components/create-course-form';

export const metadata = {
  title: 'Crear Nueva Materia',
};

export default async function NewCoursePage() {
  const user = await requireUserInServerComponent();
  const adminClient = getSupabaseServerAdminClient();

  // Verify role
  const { data: roleData } = await adminClient
    .from('user_roles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const role = roleData?.role;
  const isAdmin = role === 'administrador' || role === 'admin';
  const isProfesor = role === 'profesor';

  if (!isAdmin && !isProfesor) {
    redirect('/home');
  }

  // Fetch teachers / instructors
  const [{ data: accounts }, { data: roles }] = await Promise.all([
    adminClient.from('accounts').select('id, name, email').order('name', { ascending: true }),
    adminClient.from('user_roles').select('id, role'),
  ]);

  const roleMap = new Map((roles || []).map((r) => [r.id, r.role]));
  const instructors = (accounts || [])
    .filter(
      (a) =>
        roleMap.get(a.id) === 'profesor' ||
        roleMap.get(a.id) === 'administrador' ||
        roleMap.get(a.id) === 'admin',
    )
    .map((a) => ({
      id: a.id,
      name: a.name || 'Sin Nombre',
      email: a.email || '',
      role: roleMap.get(a.id) || 'profesor',
    }));

  return (
    <>
      <PageHeader
        title="Crear Nueva Materia"
        description="Agrega una nueva materia a la ruta teológica y asigna el profesor responsable."
      />

      <PageBody>
        <div className="bg-background mx-auto w-full max-w-2xl rounded-lg border p-6">
          <CreateCourseForm
            instructors={instructors}
            currentUserId={user.id}
            isAdmin={isAdmin}
          />
        </div>
      </PageBody>
    </>
  );
}
