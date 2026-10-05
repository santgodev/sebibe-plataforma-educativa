import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { FileText } from 'lucide-react';
import { StudentAttemptDialog } from './student-attempt-dialog';

interface CourseGradesViewProps {
  courseId: string;
  students: { id: string; name: string; email: string | null }[];
  enrolledIds: string[];
}

export async function CourseGradesView({ courseId, students, enrolledIds }: CourseGradesViewProps) {
  const adminClient = getSupabaseServerAdminClient();

  // Filter students who are actually enrolled
  const enrolledStudents = students.filter(s => enrolledIds.includes(s.id));

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

  // We want to show the max score attempt for each student-activity pair
  // Group by student_id -> activity_id -> best attempt
  const studentBestAttempts = new Map<string, Map<string, any>>();

  if (attempts && attempts.length > 0) {
    attempts.forEach(attempt => {
      if (attempt.score !== null || attempt.status === 'needs_grading') {
        if (!studentBestAttempts.has(attempt.student_id)) {
          studentBestAttempts.set(attempt.student_id, new Map());
        }
        const studentMap = studentBestAttempts.get(attempt.student_id)!;
        const current = studentMap.get(attempt.activity_id);

        if (!current) {
          studentMap.set(attempt.activity_id, attempt);
        } else if (attempt.status === 'needs_grading') {
          studentMap.set(attempt.activity_id, attempt);
        } else if (current.status !== 'needs_grading' && (attempt.score || 0) > (current.score || 0)) {
          studentMap.set(attempt.activity_id, attempt);
        }
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <p className="text-muted-foreground">
          Aquí puedes ver las calificaciones más altas obtenidas por cada alumno en las evaluaciones de esta materia. Las calificaciones están en escala de 1.0 a 5.0.
        </p>
      </div>

      {activities && activities.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/30 text-muted-foreground border-b">
              <tr>
                <th className="px-6 py-4 font-medium text-xs uppercase tracking-wider min-w-[200px]">Estudiante</th>
                {activities.map(activity => {
                  const lessonData = activity.lessons as any;
                  const lessonTitle = lessonData?.title;

                  return (
                  <th key={activity.id} className="px-4 py-4 font-medium text-center border-l min-w-[140px]">
                    <div className="flex flex-col items-center">
                      <span className="truncate max-w-[160px] text-foreground font-semibold" title={activity.title}>
                        {activity.title}
                      </span>
                      {lessonTitle && (
                        <span className="mt-0.5 truncate max-w-[140px] text-[10px] text-muted-foreground" title={lessonTitle}>
                          {lessonTitle}
                        </span>
                      )}
                      <span className="mt-1 text-[9px] tracking-widest uppercase font-bold text-muted-foreground/50">
                        {activity.type === 'final_eval' ? 'Examen' : 'Quiz'}
                      </span>
                    </div>
                  </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y">
              {enrolledStudents.length > 0 ? (
                enrolledStudents.map(student => (
                  <tr key={student.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-foreground">{student.name || 'Sin nombre'}</div>
                      <div className="text-muted-foreground text-xs mt-0.5">{student.email}</div>
                    </td>
                    {activities.map(activity => {
                      const attempt = studentBestAttempts.get(student.id)?.get(activity.id);
                      return (
                        <td key={activity.id} className="px-4 py-4 text-center border-l">
                          {attempt ? (
                            <div className="flex justify-center">
                              <StudentAttemptDialog 
                                activity={activity} 
                                attempt={attempt} 
                                studentName={student.name || 'Sin nombre'} 
                              />
                            </div>
                          ) : (
                            <span className="text-muted-foreground/30 font-medium">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={activities.length + 1} className="px-4 py-8 text-center text-muted-foreground">
                    No hay estudiantes inscritos en este curso.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
