import Link from 'next/link';
import { Award, Users, BookOpen, ChevronRight } from 'lucide-react';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export async function AdminGradesView() {
  const adminClient = getSupabaseServerAdminClient();

  // 1. Fetch all accounts
  const { data: accounts } = await adminClient
    .from('accounts')
    .select('id, name, email')
    .order('name');

  // 2. Fetch roles
  const { data: roles } = await adminClient
    .from('user_roles')
    .select('id, role');

  // Filter only students (role = 'alumno' or no role in DB implies student)
  const roleMap = new Map((roles || []).map(r => [r.id, r.role]));
  const students = (accounts || []).filter(acc => {
    const role = roleMap.get(acc.id) || 'alumno';
    return role === 'alumno';
  });

  // 3. Fetch enrollments to show how many courses each student has
  const { data: enrollments } = await adminClient
    .from('course_enrollments')
    .select('student_id, course_id');

  const enrollmentsCount = new Map<string, number>();
  if (enrollments) {
    enrollments.forEach(e => {
      const count = enrollmentsCount.get(e.student_id) || 0;
      enrollmentsCount.set(e.student_id, count + 1);
    });
  }

  // 4. Fetch activity attempts to show if they have recent grades
  const { data: attempts } = await adminClient
    .from('activity_attempts')
    .select('student_id');

  const attemptsCount = new Map<string, number>();
  if (attempts) {
    attempts.forEach(a => {
      const count = attemptsCount.get(a.student_id) || 0;
      attemptsCount.set(a.student_id, count + 1);
    });
  }

  return (
    <div className="container max-w-5xl py-10 px-4 sm:px-6 lg:px-8">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          Notas de Estudiantes
        </h1>
        <p className="mt-2 text-muted-foreground">
          Selecciona un estudiante para ver su progreso detallado, las materias que cursa y sus calificaciones (en escala 1.0 a 5.0).
        </p>
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        {students.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            No hay estudiantes registrados en la plataforma.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-6 py-4 font-semibold">Estudiante</th>
                  <th className="px-6 py-4 font-semibold text-center">Materias Inscritas</th>
                  <th className="px-6 py-4 font-semibold text-center">Evaluaciones Realizadas</th>
                  <th className="px-6 py-4 font-semibold text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {students.map((student) => {
                  const courses = enrollmentsCount.get(student.id) || 0;
                  const evals = attemptsCount.get(student.id) || 0;

                  return (
                    <tr key={student.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-foreground text-base">{student.name || 'Sin nombre'}</div>
                        <div className="text-muted-foreground">{student.email}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                          <BookOpen className="h-3.5 w-3.5" />
                          {courses} {courses === 1 ? 'Materia' : 'Materias'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                          <Award className="h-3.5 w-3.5" />
                          {evals}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link 
                          href={`/home/admin-users/${student.id}`}
                          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 group-hover:border-primary group-hover:text-primary"
                        >
                          Ver Reporte
                          <ChevronRight className="ml-2 h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
