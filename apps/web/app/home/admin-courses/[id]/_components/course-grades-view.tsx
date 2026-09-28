import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { FileText } from 'lucide-react';

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
    .select('id, title, type, max_attempts')
    .eq('course_id', courseId)
    .order('created_at', { ascending: true });

  // Fetch attempts for these activities
  const activityIds = (activities || []).map(a => a.id);
  
  // Need to handle empty activityIds array for the 'in' filter
  let attempts: any[] = [];
  if (activityIds.length > 0) {
    const { data } = await adminClient
      .from('activity_attempts')
      .select('id, activity_id, student_id, score, status, attempt_number')
      .in('activity_id', activityIds);
    attempts = data || [];
  }

  // We want to show the max score for each student-activity pair
  // Group by student_id -> activity_id -> max score
  const studentScores = new Map<string, Map<string, number>>();

  if (attempts && attempts.length > 0) {
    attempts.forEach(attempt => {
      if (attempt.score !== null) {
        if (!studentScores.has(attempt.student_id)) {
          studentScores.set(attempt.student_id, new Map());
        }
        const studentMap = studentScores.get(attempt.student_id)!;
        const currentScore = studentMap.get(attempt.activity_id) || 0;
        if (attempt.score > currentScore) {
          studentMap.set(attempt.activity_id, attempt.score);
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
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold border-b">Estudiante</th>
                {activities.map(activity => (
                  <th key={activity.id} className="px-4 py-3 font-semibold text-center border-b border-l">
                    <div className="flex flex-col items-center gap-1">
                      <span className="truncate max-w-[120px] sm:max-w-[150px]" title={activity.title}>
                        {activity.title}
                      </span>
                      <span className="text-[10px] uppercase bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        {activity.type === 'final_eval' ? 'Examen' : 'Quiz'}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {enrolledStudents.length > 0 ? (
                enrolledStudents.map(student => (
                  <tr key={student.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-foreground">{student.name || 'Sin nombre'}</div>
                      <div className="text-muted-foreground text-xs">{student.email}</div>
                    </td>
                    {activities.map(activity => {
                      const score = studentScores.get(student.id)?.get(activity.id);
                      return (
                        <td key={activity.id} className="px-4 py-3 text-center border-l">
                          {score !== undefined ? (
                            <span className={`font-bold ${score >= 3.0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {score.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/50">-</span>
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
