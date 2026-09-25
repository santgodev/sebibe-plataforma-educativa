import { CheckCircle2, XCircle, Award } from 'lucide-react';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function StudentGradesView({ userId }: { userId: string }) {
  const client = getSupabaseServerClient();

  // Fetch all attempts for the user
  const { data: attemptsData } = await client
    .from('activity_attempts')
    .select(`
      id,
      score,
      completed_at,
      activities (
        id,
        title,
        passing_score,
        courses (
          title
        )
      )
    `)
    .eq('student_id', userId)
    .order('completed_at', { ascending: false });

  // Process data to keep only the highest score per activity
  const bestAttemptsMap = new Map<string, any>();

  if (attemptsData) {
    for (const attempt of attemptsData) {
      const activity = attempt.activities as any;
      if (!activity) continue;
      
      const activityId = activity.id;
      const currentBest = bestAttemptsMap.get(activityId);
      
      if (!currentBest || (attempt.score || 0) > (currentBest.score || 0)) {
        bestAttemptsMap.set(activityId, attempt);
      }
    }
  }

  const finalAttempts = Array.from(bestAttemptsMap.values());

  // Group by Course
  const groupedByCourse = finalAttempts.reduce((acc: any, attempt: any) => {
    const courseTitle = attempt.activities?.courses?.title || 'Otros Cursos';
    if (!acc[courseTitle]) {
      acc[courseTitle] = [];
    }
    acc[courseTitle].push(attempt);
    return acc;
  }, {});

  return (
    <div className="container max-w-5xl py-10 px-4 sm:px-6 lg:px-8">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <Award className="h-8 w-8 text-primary" />
          Mis Notas
        </h1>
        <p className="mt-2 text-muted-foreground">
          Aquí puedes ver el registro de tus calificaciones más altas en las actividades evaluadas de cada materia. 
          La nota se evalúa en una escala de 1.0 a 5.0.
        </p>
      </div>

      {Object.keys(groupedByCourse).length === 0 ? (
        <div className="bg-card rounded-xl border p-12 text-center shadow-sm">
          <p className="text-muted-foreground text-lg">Aún no tienes calificaciones registradas.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {Object.entries(groupedByCourse).map(([courseTitle, attempts]: [string, any]) => (
            <div key={courseTitle} className="space-y-4">
              <h2 className="text-xl font-bold text-foreground border-b pb-2">{courseTitle}</h2>
              <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/50 text-muted-foreground">
                      <tr>
                        <th className="px-6 py-4 font-semibold">Actividad Evaluada</th>
                        <th className="px-6 py-4 font-semibold">Fecha de finalización</th>
                        <th className="px-6 py-4 font-semibold text-center">Nota (1.0 - 5.0)</th>
                        <th className="px-6 py-4 font-semibold text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {attempts.map((attempt: any) => {
                        const activity = attempt.activities;
                        const score = attempt.score || 0;
                        const passingScore = activity?.passing_score || 0;
                        
                        // Convert from 0-100 to 1.0-5.0 scale
                        const grade5 = score / 20;
                        const passingGrade5 = passingScore / 20;
                        const passed = grade5 >= passingGrade5;

                        return (
                          <tr key={attempt.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-6 py-4 font-medium text-foreground">
                              {activity?.title || 'Actividad desconocida'}
                            </td>
                            <td className="px-6 py-4 text-muted-foreground">
                              {attempt.completed_at ? new Date(attempt.completed_at).toLocaleDateString('es-ES', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              }) : 'En progreso'}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`inline-flex items-center justify-center font-black text-lg ${passed ? 'text-green-600' : 'text-red-500'}`}>
                                {grade5.toFixed(1)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex justify-center">
                                {passed ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Aprobado
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                    <XCircle className="h-3.5 w-3.5" /> Reprobado
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
