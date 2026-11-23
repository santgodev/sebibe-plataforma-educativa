import { getCachedUserRole } from '~/lib/server/get-cached-user-role';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';
import { StudentGradesView } from './_components/student-grades-view';
import { AdminGradesView } from './_components/admin-grades-view';

export const metadata = {
  title: 'Calificaciones',
};

export default async function GradesPage() {
  const user = await requireUserInServerComponent();
  const role = ((await getCachedUserRole(user.id)) as string | null) || 'alumno';

  if (role === 'profesor' || role === 'administrador' || role === 'admin' || role === 'coordinador') {
    return <AdminGradesView />;
  }

  return <StudentGradesView userId={user.id} />;
}
