import { Users } from 'lucide-react';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { AdminGradesTable, type StudentGradeItem } from './admin-grades-table';
import { calculateSemester } from '~/home/admin-users/_lib/student-utils';

export async function AdminGradesView() {
  const adminClient = getSupabaseServerAdminClient();

  // 1. Fetch accounts, roles, and student profiles
  const [{ data: accounts }, { data: roles }, { data: studentProfiles }] = await Promise.all([
    adminClient.from('accounts').select('id, name, email').order('name'),
    adminClient.from('user_roles').select('id, role'),
    adminClient.from('students').select('user_id, entry_date, modality')
  ]);

  // Filter only students (role = 'alumno' or no role in DB implies student)
  const roleMap = new Map((roles || []).map(r => [r.id, r.role]));
  const profileMap = new Map((studentProfiles || []).map(s => [s.user_id, s]));

  const students = (accounts || []).filter(acc => {
    const role = roleMap.get(acc.id) || 'alumno';
    return role === 'alumno';
  });

  // 2. Fetch enrollments to show how many courses each student has
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

  // 3. Fetch activity attempts to show if they have recent grades
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

  const studentGradeItems: StudentGradeItem[] = students.map(student => {
    const profile = profileMap.get(student.id);
    const semester = profile?.entry_date ? calculateSemester(profile.entry_date) : calculateSemester(null);

    return {
      id: student.id,
      name: student.name || 'Sin nombre',
      email: student.email,
      semester,
      modality: profile?.modality || null,
      coursesCount: enrollmentsCount.get(student.id) || 0,
      evaluationsCount: attemptsCount.get(student.id) || 0,
    };
  });

  return (
    <div className="container max-w-5xl py-10 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          Notas de Estudiantes
        </h1>
        <p className="mt-2 text-muted-foreground">
          Filtra y busca estudiantes para ver su progreso detallado, las materias que cursan y sus calificaciones (en escala 1.0 a 5.0).
        </p>
      </div>

      <AdminGradesTable students={studentGradeItems} />
    </div>
  );
}

