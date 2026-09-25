'use client';

import { useEffect, useState, useTransition } from 'react';

import { CheckCircle2, HelpCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';

import { getFullActivityAction, submitActivityAttemptAction, getActivityAttemptsAction } from '~/lib/lms/server/actions/activity.actions';

export function QuizViewer({ activityId, courseId }: { activityId: string, courseId: string }) {
  const [activity, setActivity] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [result, setResult] = useState<any>(null);
  const [isPending, startTransition] = useTransition();
  const [isStarted, setIsStarted] = useState(false);
  const [pastAttempts, setPastAttempts] = useState<any[]>([]);

  useEffect(() => {
    startTransition(async () => {
      try {
        const [data, attemptsData] = await Promise.all([
          getFullActivityAction({ id: activityId }),
          getActivityAttemptsAction({ activity_id: activityId }).catch(() => [])
        ]);
        // sort questions
        if (data?.activity_questions) {
          data.activity_questions.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));
          data.activity_questions.forEach((q: any) => {
            if (q.activity_answers) {
              q.activity_answers.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));
            }
          });
        }
        setActivity(data);
        if (attemptsData && attemptsData.length > 0) {
          setPastAttempts(attemptsData);
        }
      } catch (e) {
        console.error(e);
        toast.error('Error al cargar el cuestionario');
      }
    });
  }, [activityId]);

  if (!activity) {
    return <div className="text-muted-foreground p-8 text-center animate-pulse">Cargando cuestionario...</div>;
  }

  const questions = activity.activity_questions || [];

  if (questions.length === 0) {
    return (
      <div className="text-muted-foreground italic p-8 text-center border rounded-xl">
        Este cuestionario aún no tiene preguntas.
      </div>
    );
  }

  const handleSelect = (questionId: string, value: any, isMultiple = false) => {
    if (result) return;
    
    setAnswers((prev) => {
      if (isMultiple) {
        const current = Array.isArray(prev[questionId]) ? prev[questionId] : [];
        if (current.includes(value)) {
          return { ...prev, [questionId]: current.filter((v: any) => v !== value) };
        } else {
          return { ...prev, [questionId]: [...current, value] };
        }
      }
      return { ...prev, [questionId]: value };
    });
  };

  const handleSubmit = () => {
    startTransition(async () => {
      try {
        const evalResult = await submitActivityAttemptAction({
          activity_id: activityId,
          answers
        });
        setResult(evalResult);
        toast.success(evalResult.passed ? '¡Aprobaste el cuestionario!' : 'Cuestionario completado.');
      } catch (e: any) {
        toast.error(e.message || 'Error al enviar el cuestionario');
      }
    });
  };

  if (!isStarted) {
    return (
      <div className="bg-background text-foreground mx-auto max-w-3xl rounded-xl border p-12 shadow-sm text-center">
        <HelpCircle className="h-16 w-16 text-primary mx-auto mb-6" />
        <h2 className="text-3xl font-bold mb-4">{activity.title}</h2>
        {activity.description && (
          <p className="text-muted-foreground mb-6 text-lg">{activity.description}</p>
        )}
        <div className="flex flex-col gap-3 mb-10 max-w-sm mx-auto text-sm text-muted-foreground bg-muted/20 p-6 rounded-xl border text-left">
          {activity.passing_score !== undefined && (
            <div className="flex justify-between border-b pb-2">
              <span className="font-semibold text-foreground">Nota para aprobar:</span>
              <span>{activity.passing_score ? (activity.passing_score / 20).toFixed(1) : '0.0'} / 5.0</span>
            </div>
          )}
          <div className="flex justify-between border-b pb-2">
            <span className="font-semibold text-foreground">Preguntas:</span>
            <span>{questions.length}</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="font-semibold text-foreground">Tiempo límite:</span>
            <span>{activity.time_limit_minutes ? `${activity.time_limit_minutes} minutos` : 'Sin límite'}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-foreground">Intentos permitidos:</span>
            <span>{activity.max_attempts ? activity.max_attempts : 'Ilimitados'}</span>
          </div>
        </div>

        {pastAttempts.length > 0 && (() => {
          const latestAttempt = pastAttempts[0];
          const passed = latestAttempt.score >= (activity.passing_score || 0);
          return (
          <div className="mb-10 p-6 bg-muted/10 border rounded-xl max-w-sm mx-auto text-center shadow-sm">
            <h3 className="font-bold text-lg text-foreground mb-3">Tus Resultados</h3>
            <div className="text-4xl font-black mb-2 text-foreground">
               {((latestAttempt.score || 0) / 20).toFixed(1)} / 5.0
            </div>
            <p className={`text-sm font-bold uppercase tracking-wider mb-4 ${passed ? 'text-primary' : 'text-destructive'}`}>
               {passed ? 'Aprobado' : 'No aprobado'}
            </p>
            <div className="flex items-center justify-between text-xs text-muted-foreground bg-white p-3 rounded-lg border">
               <span>Intentos realizados:</span>
               <span className="font-bold text-foreground">
                 {pastAttempts.length} {activity.max_attempts ? `/ ${activity.max_attempts}` : ''}
               </span>
            </div>
          </div>
          );
        })()}

        {(() => {
          const hasPassed = pastAttempts.some(a => (a.score || 0) >= (activity.passing_score || 0));
          const reachedMaxAttempts = activity.max_attempts && pastAttempts.length >= activity.max_attempts;
          
          if (hasPassed) {
            return (
              <div className="text-primary font-semibold bg-primary/10 p-4 rounded-lg inline-block border border-primary/20">
                ¡Ya has aprobado este cuestionario!
              </div>
            );
          }
          
          if (reachedMaxAttempts) {
            return (
              <div className="text-destructive font-semibold bg-destructive/10 p-4 rounded-lg inline-block border border-destructive/20">
                Has alcanzado el límite máximo de intentos permitidos.
              </div>
            );
          }
          
          return (
            <Button size="lg" className="px-12 text-lg h-14" onClick={() => setIsStarted(true)}>
              {pastAttempts.length > 0 ? 'Reintentar Cuestionario' : 'Comenzar Cuestionario'}
            </Button>
          );
        })()}
      </div>
    );
  }

  return (
    <div className="bg-background text-foreground mx-auto max-w-3xl rounded-xl border p-8 shadow-sm">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <HelpCircle className="h-8 w-8 text-primary" />
          <div>
            <h2 className="text-foreground text-2xl font-bold">{activity.title}</h2>
            {activity.passing_score && (
              <p className="text-sm text-muted-foreground">Nota mínima para aprobar: {(activity.passing_score / 20).toFixed(1)} de 5.0</p>
            )}
          </div>
        </div>
        {activity.time_limit_minutes && !result && (
          <div className="bg-muted/30 px-4 py-2 rounded-lg font-mono text-lg font-semibold border">
            {activity.time_limit_minutes}:00
          </div>
        )}
      </div>

      <div className="space-y-10">
        {questions.map((q: any, idx: number) => {
          const feedback = result?.feedback?.[q.id];
          const isCorrect = feedback?.isCorrect;

          return (
            <div key={q.id} className={`space-y-4 p-6 rounded-xl border ${result ? (isCorrect ? 'border-primary/30 bg-primary/5' : 'border-destructive/30 bg-destructive/5') : 'bg-card'}`}>
              <div className="flex gap-3">
                <span className="text-muted-foreground font-bold">{idx + 1}.</span>
                <div className="flex-1">
                  <h3 className="text-foreground text-lg leading-relaxed font-medium">
                    {q.question_text}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">Valor: {q.points || 1} puntos</p>
                </div>
                {result && (
                  <div>
                    {isCorrect ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <XCircle className="w-6 h-6 text-destructive" />}
                  </div>
                )}
              </div>

              <div className="space-y-3 pl-8">
                {(q.type === 'single_choice' || q.type === 'true_false') && q.activity_answers?.map((opt: any) => {
                  const isSelected = answers[q.id] === opt.id;
                  let optionStyle = 'border-muted bg-background hover:border-primary/50 cursor-pointer';
                  
                  if (isSelected) optionStyle = 'border-primary bg-primary/5 ring-1 ring-primary';
                  if (result) optionStyle = 'border-muted bg-muted/30 opacity-70 cursor-default';
                  if (result && isSelected) optionStyle += ' ring-1 ring-muted-foreground';

                  return (
                    <div
                      key={opt.id}
                      onClick={() => handleSelect(q.id, opt.id)}
                      className={`flex items-center gap-3 rounded-lg border p-4 transition-all ${optionStyle}`}
                    >
                      <div className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border ${isSelected ? 'border-primary' : 'border-muted-foreground'}`}>
                        {isSelected && <div className="bg-primary h-2.5 w-2.5 rounded-full" />}
                      </div>
                      <span className="text-foreground">{opt.answer_text}</span>
                    </div>
                  );
                })}

                {q.type === 'multiple_choice' && q.activity_answers?.map((opt: any) => {
                  const isSelected = Array.isArray(answers[q.id]) && answers[q.id].includes(opt.id);
                  let optionStyle = 'border-muted bg-background hover:border-primary/50 cursor-pointer';
                  
                  if (isSelected) optionStyle = 'border-primary bg-primary/5 ring-1 ring-primary';
                  if (result) optionStyle = 'border-muted bg-muted/30 opacity-70 cursor-default';

                  return (
                    <div
                      key={opt.id}
                      onClick={() => handleSelect(q.id, opt.id, true)}
                      className={`flex items-center gap-3 rounded-lg border p-4 transition-all ${optionStyle}`}
                    >
                      <div className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border ${isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-primary-foreground" />}
                      </div>
                      <span className="text-foreground">{opt.answer_text}</span>
                    </div>
                  );
                })}

                {q.type === 'fill_blank' && (
                  <div className="mt-2">
                    <Input 
                      placeholder="Escribe tu respuesta..." 
                      value={answers[q.id] || ''} 
                      onChange={e => handleSelect(q.id, e.target.value)}
                      disabled={!!result}
                      className="max-w-md"
                    />
                  </div>
                )}
                
                {/* For matching and order_steps, fallback to simple text input for now or select if we want to be fancy. We will use a text area for simplicity. */}
                {(q.type === 'matching' || q.type === 'order_steps') && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    Esta pregunta requiere organizar opciones. (Vista simplificada en desarrollo)
                  </div>
                )}
              </div>

              {result && feedback?.feedbackText && (
                <div className="mt-4 bg-muted/50 p-4 rounded-lg text-sm pl-8">
                  <strong className="block mb-1">Retroalimentación:</strong>
                  {feedback.feedbackText}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-12 flex flex-col items-center border-t pt-8">
        {!result ? (
          <Button
            size="lg"
            className="w-full sm:w-auto px-12"
            disabled={isPending}
            onClick={handleSubmit}
          >
            {isPending ? 'Enviando...' : 'Enviar Respuestas'}
          </Button>
        ) : (
          <div className="w-full text-center">
            <h3 className={`mb-2 text-2xl font-bold ${result.passed ? 'text-primary' : 'text-destructive'}`}>
              Resultado: {result.score.toFixed(1)}%
            </h3>
            <p className="text-muted-foreground mb-6 text-lg">
              {result.passed ? '¡Felicidades! Has aprobado el cuestionario.' : 'No has alcanzado la nota mínima requerida.'}
            </p>
            <Button
              variant="outline"
              onClick={() => {
                window.location.reload();
              }}
            >
              Volver al inicio
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
