'use client';

import { useEffect, useState, useTransition } from 'react';

import { CheckCircle2, HelpCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';

import { getFullActivityAction, submitActivityAttemptAction } from '~/lib/lms/server/actions/activity.actions';

export function QuizViewer({ activityId, courseId }: { activityId: string, courseId: string }) {
  const [activity, setActivity] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [result, setResult] = useState<any>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      try {
        const data = await getFullActivityAction({ id: activityId });
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

  return (
    <div className="bg-background text-foreground mx-auto max-w-3xl rounded-xl border p-8 shadow-sm">
      <div className="mb-8 flex items-center gap-3 border-b pb-4">
        <HelpCircle className="h-8 w-8 text-purple-600" />
        <div>
          <h2 className="text-foreground text-2xl font-bold">{activity.title}</h2>
          {activity.passing_score && (
            <p className="text-sm text-muted-foreground">Nota para aprobar: {activity.passing_score}%</p>
          )}
        </div>
      </div>

      <div className="space-y-10">
        {questions.map((q: any, idx: number) => {
          const feedback = result?.feedback?.[q.id];
          const isCorrect = feedback?.isCorrect;

          return (
            <div key={q.id} className={`space-y-4 p-6 rounded-xl border ${result ? (isCorrect ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5') : 'bg-card'}`}>
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
                    {isCorrect ? <CheckCircle2 className="w-6 h-6 text-green-500" /> : <XCircle className="w-6 h-6 text-red-500" />}
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
            <h3 className={`mb-2 text-2xl font-bold ${result.passed ? 'text-green-500' : 'text-red-500'}`}>
              Resultado: {result.score.toFixed(1)}%
            </h3>
            <p className="text-muted-foreground mb-6 text-lg">
              {result.passed ? '¡Felicidades! Has aprobado el cuestionario.' : 'No has alcanzado la nota mínima requerida.'}
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setAnswers({});
                setResult(null);
              }}
            >
              Reintentar Cuestionario
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
