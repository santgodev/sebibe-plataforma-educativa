import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { StudentGradesView } from './_components/student-grades-view';
import { AdminGradesView } from './_components/admin-grades-view';

export const metadata = {
  title: 'Calificaciones',
};

export default async function GradesPage() {
  const user = await requireUserInServerComponent();
  const adminClient = getSupabaseServerAdminClient();

  // Fetch the role of the current user
  const { data: roleData } = await adminClient
    .from('user_roles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = roleData?.role || 'alumno';

  if (role === 'profesor' || role === 'administrador' || role === 'admin' || role === 'coordinador') {
    return <AdminGradesView />;
  }

  return <StudentGradesView userId={user.id} />;
}
