import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { FileText } from 'lucide-react';
import { CourseGradesTable } from './course-grades-table';
import { calculateSemester } from '~/home/admin-users/_lib/student-utils';

interface CourseGradesViewProps {
  courseId: string;
  students: { id: string; name: string; email: string | null; semester?: string | null; modality?: string | null }[];
  enrolledIds: string[];
}

export async function CourseGradesView({ courseId, students, enrolledIds }: CourseGradesViewProps) {
  const adminClient = getSupabaseServerAdminClient();

  // Load student profiles to get semester and modality
  const { data: studentProfiles } = await adminClient
    .from('students')
    .select('user_id, entry_date, modality');
  const profileMap = new Map((studentProfiles || []).map(s => [s.user_id, s]));

  // Filter students who are actually enrolled and enrich with semester
  const enrolledStudents = students
    .filter(s => enrolledIds.includes(s.id))
    .map(s => {
      const prof = profileMap.get(s.id);
      return {
        ...s,
        semester: s.semester ?? (prof?.entry_date ? calculateSemester(prof.entry_date) : calculateSemester(null)),
        modality: s.modality ?? prof?.modality ?? null,
      };
    });

  // Fetch activities for this course
  const { data: activities } = await adminClient
    .from('activities')
    .select('id, title, type, max_attempts, lessons(title, course_modules(title)), activity_questions(id, question_text, type, order_index, activity_answers(id, answer_text))')
    .eq('course_id', courseId)
    .order('created_at', { ascending: true });

  // Sort questions for each activity
  if (activities) {
    activities.forEach(a => {
      if (a.activity_questions) {
        a.activity_questions.sort((q1: any, q2: any) => (q1.order_index || 0) - (q2.order_index || 0));
      }
    });
  }

  // Fetch attempts for these activities
  const activityIds = (activities || []).map(a => a.id);
  
  // Need to handle empty activityIds array for the 'in' filter
  let attempts: any[] = [];
  if (activityIds.length > 0) {
    const { data } = await adminClient
      .from('activity_attempts')
      .select('id, activity_id, student_id, score, status, attempt_number, answers_json')
      .in('activity_id', activityIds);
    attempts = data || [];
  }

  // Plain object record to pass to client component
  const studentBestAttemptsRecord: Record<string, Record<string, any>> = {};

  if (attempts && attempts.length > 0) {
    attempts.forEach(attempt => {
      if (attempt.score !== null || attempt.status === 'needs_grading') {
        if (!studentBestAttemptsRecord[attempt.student_id]) {
          studentBestAttemptsRecord[attempt.student_id] = {};
        }
        const studentMap = studentBestAttemptsRecord[attempt.student_id]!;
        const current = studentMap[attempt.activity_id];

        if (!current) {
          studentMap[attempt.activity_id] = attempt;
        } else if (attempt.status === 'needs_grading') {
          studentMap[attempt.activity_id] = attempt;
        } else if (current.status !== 'needs_grading' && (attempt.score || 0) > (current.score || 0)) {
          studentMap[attempt.activity_id] = attempt;
        }
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-muted-foreground">
          Aquí puedes ver las calificaciones más altas obtenidas por cada alumno en las evaluaciones de esta materia. Las calificaciones están en escala de 1.0 a 5.0.
        </p>
      </div>

      {activities && activities.length > 0 ? (
        <CourseGradesTable
          enrolledStudents={enrolledStudents}
          activities={activities}
          studentBestAttemptsRecord={studentBestAttemptsRecord}
        />
      ) : (
        <div className="p-8 text-center border rounded-md bg-muted/20">
          <FileText className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
          <h3 className="font-semibold text-lg">No hay evaluaciones</h3>
          <p className="text-muted-foreground text-sm">
            Aún no has creado quices ni exámenes para esta materia.
          </p>
        </div>
      )}
    </div>
  );
}

