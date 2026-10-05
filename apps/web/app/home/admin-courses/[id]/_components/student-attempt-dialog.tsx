'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Clock, CheckCircle2, Award } from 'lucide-react';
import { toast } from 'sonner';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@kit/ui/dialog';
import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { Badge } from '@kit/ui/badge';

import { gradeActivityAttemptAction } from '~/lib/lms/server/actions/activity.actions';

export function StudentAttemptDialog({
  activity,
  attempt,
  studentName,
}: {
  activity: any;
  attempt: any;
  studentName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [currentScore, setCurrentScore] = useState<number>(attempt?.score ?? 0);
  const [currentStatus, setCurrentStatus] = useState<string>(attempt?.status || 'pending');

  const initialGrade5 = attempt?.score !== null && attempt?.score !== undefined
    ? ((attempt.score || 0) / 20).toFixed(1)
    : '';
  const [gradeInput, setGradeInput] = useState<string>(initialGrade5);

  if (!attempt) return null;

  const isNeedsGrading = currentStatus === 'needs_grading';
  const passingScore = activity.passing_score || 70;
  const passed = currentScore >= passingScore;

  const handleSaveGrade = () => {
    const num = parseFloat(gradeInput);
    if (isNaN(num) || num < 1.0 || num > 5.0) {
      toast.error('Por favor ingresa una calificación válida entre 1.0 y 5.0');
      return;
    }

    startTransition(async () => {
      try {
        const scorePercentage = Math.round(num * 20);
        const finalStatus = scorePercentage >= passingScore ? 'passed' : 'failed';

        await gradeActivityAttemptAction({
          attempt_id: attempt.id,
          score: scorePercentage,
          status: finalStatus,
        });

        setCurrentScore(scorePercentage);
        setCurrentStatus(finalStatus);
        toast.success(`Calificación guardada: ${num.toFixed(1)} / 5.0`);
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || 'Error al guardar la calificación');
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`h-7 px-3.5 rounded-full font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm ${
            isNeedsGrading
              ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 hover:border-amber-400 dark:bg-amber-950/40 dark:text-amber-300 animate-pulse'
              : passed
              ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:border-green-300 dark:bg-green-950/40 dark:text-green-400 dark:border-green-900/50 dark:hover:bg-green-900/60'
              : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 hover:border-red-300 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/50 dark:hover:bg-red-900/60'
          }`}
        >
          {isNeedsGrading ? (
            <>
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Por calificar</span>
            </>
          ) : (
            <>
              <span>{(currentScore / 20).toFixed(1)}</span>
              <Eye className="w-3.5 h-3.5 opacity-80" />
            </>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
            <DialogTitle className="text-xl font-bold">Respuestas de {studentName}</DialogTitle>
            {isNeedsGrading ? (
              <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 font-bold gap-1 text-xs">
                <Clock className="w-3.5 h-3.5" /> Pendiente de Calificar
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className={`font-bold gap-1 text-xs ${
                  passed
                    ? 'bg-green-100 text-green-800 border-green-300'
                    : 'bg-red-100 text-red-800 border-red-300'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Nota actual: {(currentScore / 20).toFixed(1)} / 5.0
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Actividad: <strong>{activity.title}</strong> • Intento #{attempt.attempt_number || 1}
          </p>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {!activity.activity_questions || activity.activity_questions.length === 0 ? (
            <p className="text-muted-foreground text-sm italic">No se encontraron detalles de las preguntas.</p>
          ) : (
            activity.activity_questions.map((q: any, i: number) => {
              const studentAnswer = attempt.answers_json ? attempt.answers_json[q.id] : null;

              return (
                <div
                  key={q.id}
                  className={`border p-4 rounded-lg transition-all ${
                    q.type === 'open_text' || q.type === 'fill_blank'
                      ? 'border-amber-300/80 bg-amber-50/20 dark:border-amber-900/40 dark:bg-amber-950/10'
                      : 'bg-muted/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex gap-2">
                      <span className="font-semibold text-muted-foreground">{i + 1}.</span>
                      <p className="font-medium text-foreground">{q.question_text}</p>
                    </div>
                    {q.type === 'open_text' && (
                      <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded whitespace-nowrap">
                        Pregunta abierta • Manual
                      </span>
                    )}
                    {q.type === 'fill_blank' && (
                      <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded whitespace-nowrap">
                        Completar espacios • Manual
                      </span>
                    )}
                  </div>

                  <div className="pl-6 text-sm">
                    {q.type === 'open_text' ? (
                      <div className="space-y-1.5 mt-2">
                        <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                          Respuesta escrita del estudiante:
                        </span>
                        <div className="p-3.5 bg-background border rounded-md whitespace-pre-wrap text-foreground font-normal leading-relaxed text-sm shadow-sm">
                          {studentAnswer ? studentAnswer : <span className="italic text-muted-foreground">El estudiante no escribió respuesta.</span>}
                        </div>
                      </div>
                    ) : q.type === 'matching' ? (
                      <div className="space-y-1.5 mt-2">
                        <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                          Emparejamientos del estudiante:
                        </span>
                        <div className="space-y-1.5 bg-background p-3 rounded-md border text-xs">
                          {q.activity_answers?.map((a: any) => {
                            const parts = (a.answer_text || '').split('|').map((s: string) => s.trim());
                            const concept = parts[0] || '';
                            const expectedDef = parts.slice(1).join('|').trim();
                            const studentDef =
                              typeof studentAnswer === 'object' && studentAnswer !== null
                                ? studentAnswer[a.id] || studentAnswer[concept] || 'Sin responder'
                                : 'Sin responder';
                            const isMatch =
                              studentDef.toLowerCase().trim() === expectedDef.toLowerCase().trim();

                            return (
                              <div
                                key={a.id}
                                className="flex items-center justify-between py-1 border-b last:border-0 gap-2"
                              >
                                <span className="font-semibold text-foreground">{concept}</span>
                                <span className="text-muted-foreground">➔</span>
                                <span
                                  className={
                                    isMatch
                                      ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                                      : 'text-destructive font-medium'
                                  }
                                >
                                  {studentDef} {isMatch ? '✓' : `(Esperado: ${expectedDef})`}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : q.type === 'order_steps' ? (
                      <div className="space-y-1.5 mt-2">
                        <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                          Secuencia organizada por el estudiante:
                        </span>
                        <div className="space-y-1.5 bg-background p-3 rounded-md border text-xs">
                          {Array.isArray(studentAnswer) && studentAnswer.length > 0 ? (
                            studentAnswer.map((stepId: any, sIdx: number) => {
                              const actualId =
                                typeof stepId === 'object' && stepId !== null ? stepId.id : stepId;
                              const ans = q.activity_answers?.find((a: any) => a.id === actualId);
                              return (
                                <div key={actualId || sIdx} className="flex items-center gap-2 py-0.5">
                                  <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">
                                    Paso {sIdx + 1}
                                  </Badge>
                                  <span className="text-foreground font-medium">
                                    {ans ? ans.answer_text : String(stepId)}
                                  </span>
                                </div>
                              );
                            })
                          ) : (
                            <span className="italic text-muted-foreground">No ordenó los pasos.</span>
                          )}
                        </div>
                      </div>
                    ) : q.type === 'fill_blank' ? (
                      <div className="space-y-1.5 mt-2">
                        <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                          Texto completado por el estudiante:
                        </span>
                        <div className="p-3 bg-background border rounded-md font-semibold text-foreground flex flex-wrap items-center justify-between text-sm gap-2">
                          <span className="text-base font-bold text-primary">
                            {studentAnswer ? (
                              `"${studentAnswer}"`
                            ) : (
                              <span className="italic font-normal text-muted-foreground">
                                No respondió.
                              </span>
                            )}
                          </span>
                          {q.activity_answers && q.activity_answers.length > 0 && (
                            <span className="text-xs font-normal text-muted-foreground bg-muted/60 px-2.5 py-1 rounded">
                              Respuestas de referencia:{' '}
                              <strong className="text-foreground">
                                {q.activity_answers.map((a: any) => a.answer_text).filter(Boolean).join(', ')}
                              </strong>
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1 mt-1">
                        <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                          Selección del estudiante:
                        </span>
                        <span className="font-medium p-2 bg-background border rounded-md">
                          {(() => {
                            if (studentAnswer === undefined || studentAnswer === null) {
                              return <span className="italic text-muted-foreground">No respondió.</span>;
                            }

                            if (q.activity_answers) {
                              if (Array.isArray(studentAnswer)) {
                                const selectedTexts = studentAnswer.map((id) => {
                                  const ans = q.activity_answers.find((a: any) => a.id === id);
                                  return ans ? ans.answer_text : id;
                                });
                                return selectedTexts.join(', ');
                              } else {
                                const ans = q.activity_answers.find((a: any) => a.id === studentAnswer);
                                return ans ? ans.answer_text : studentAnswer;
                              }
                            }

                            return typeof studentAnswer === 'object'
                              ? JSON.stringify(studentAnswer)
                              : studentAnswer;
                          })()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Sección de Calificación del Profesor */}
        <div className="mt-6 p-5 rounded-xl border bg-muted/30 dark:bg-muted/10 space-y-4">
          <div className="flex items-center gap-2 text-primary font-bold">
            <Award className="w-5 h-5" />
            <h4 className="text-base text-foreground">Asignar Calificación del Profesor</h4>
          </div>

          <p className="text-xs text-muted-foreground">
            {isNeedsGrading
              ? 'Esta evaluación tiene preguntas abiertas o de completar espacios enviadas por el alumno. Revisa sus respuestas y asigna la nota definitiva (escala 1.0 a 5.0).'
              : 'Puedes actualizar o ajustar la nota asignada a este intento.'}
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4 pt-1">
            <div className="space-y-1 w-full sm:w-44">
              <Label className="text-xs font-semibold">Nota (1.0 - 5.0):</Label>
              <Input
                type="number"
                step="0.1"
                min="1.0"
                max="5.0"
                value={gradeInput}
                onChange={(e) => setGradeInput(e.target.value)}
                placeholder="Ej: 4.5"
                className="font-black text-xl text-center h-11"
              />
            </div>

            <div className="flex-1 space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">Calificación rápida:</Label>
              <div className="flex flex-wrap gap-1.5">
                {['1.0', '2.0', '3.0', '3.5', '4.0', '4.5', '5.0'].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setGradeInput(val)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                      gradeInput === val
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-background hover:bg-muted text-foreground'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleSaveGrade}
              disabled={isPending || !gradeInput}
              className="font-bold h-11 px-6 whitespace-nowrap"
            >
              {isPending ? 'Guardando...' : 'Guardar Nota'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
