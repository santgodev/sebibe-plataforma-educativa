'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { Badge } from '@kit/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@kit/ui/dialog';
import {
  FileText,
  Download,
  Eye,
  Award,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@kit/ui/utils';

import {
  gradeActivityAttemptAction,
  getFullActivityAction,
} from '~/lib/lms/server/actions/activity.actions';

export interface ActivityAnswer {
  id: string;
  answer_text: string;
  is_correct?: boolean | null;
  order_index?: number | null;
}

export interface ActivityQuestion {
  id: string;
  question_text: string;
  type: string;
  order_index?: number | null;
  activity_answers?: ActivityAnswer[] | null;
}

export interface Attempt {
  id: string;
  score?: number | null;
  status?: string | null;
  completed_at?: string | null;
  attempt_number?: number | null;
  file_url: string | null;
  answers_json: any | null;
  activities: {
    id?: string;
    title: string;
    type: string;
    passing_score?: number | null;
    activity_questions?: ActivityQuestion[] | null;
  } | null;
}

export function ViewSubmissionDialog({
  attempt,
  trigger,
  isReadOnly = false,
}: {
  attempt: Attempt;
  trigger?: React.ReactNode;
  isReadOnly?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const activity = attempt.activities;
  const initialGrade5 =
    attempt?.score !== null && attempt?.score !== undefined
      ? ((attempt.score || 0) / 20).toFixed(1)
      : '';
  const [gradeInput, setGradeInput] = useState<string>(initialGrade5);
  const [currentScore, setCurrentScore] = useState<number | null>(attempt?.score ?? null);

  // Activity questions state (preloaded or fetched on demand)
  const [questions, setQuestions] = useState<ActivityQuestion[]>(
    activity?.activity_questions || []
  );
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  // Sync questions from attempt when it changes or fetch if missing
  useEffect(() => {
    if (activity?.activity_questions && activity.activity_questions.length > 0) {
      setQuestions(activity.activity_questions);
    } else if (open && activity?.id && (!questions || questions.length === 0)) {
      setIsLoadingQuestions(true);
      getFullActivityAction({ id: activity.id })
        .then((res: any) => {
          if (res?.data?.activity_questions) {
            setQuestions(res.data.activity_questions);
          }
        })
        .catch((err) => {
          console.error('Error fetching activity questions:', err);
        })
        .finally(() => {
          setIsLoadingQuestions(false);
        });
    }
  }, [open, activity, questions.length]);

  const hasFile = !!attempt.file_url;
  const hasAnswers = !!(attempt.answers_json && Object.keys(attempt.answers_json).length > 0);

  const handleSaveGrade = () => {
    const num = parseFloat(gradeInput);
    if (isNaN(num) || num < 1.0 || num > 5.0) {
      toast.error('Por favor ingresa una calificación válida entre 1.0 y 5.0');
      return;
    }

    startTransition(async () => {
      try {
        const scorePercentage = Math.round(num * 20);
        const passingScore = activity?.passing_score || 70;
        const finalStatus = scorePercentage >= passingScore ? 'passed' : 'failed';

        await gradeActivityAttemptAction({
          attempt_id: attempt.id,
          score: scorePercentage,
          status: finalStatus,
        });

        setCurrentScore(scorePercentage);
        toast.success(`Calificación guardada: ${num.toFixed(1)} / 5.0`);
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || 'Error al guardar la calificación');
      }
    });
  };

  // Build lookup map for answer texts and correct flags
  const answersMap = new Map<string, { text: string; isCorrect: boolean }>();
  (questions || []).forEach((q) => {
    q.activity_answers?.forEach((a) => {
      answersMap.set(a.id, { text: a.answer_text, isCorrect: !!a.is_correct });
    });
  });

  // Helper to convert any raw ID/value to readable text
  const resolveText = (val: any): string => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'string') {
      const match = answersMap.get(val);
      return match ? match.text : val;
    }
    if (typeof val === 'object') {
      if (val.text) return String(val.text);
      if (val.id) {
        const match = answersMap.get(val.id);
        return match ? match.text : String(val.id);
      }
      return JSON.stringify(val);
    }
    return String(val);
  };

  // Sort questions by order_index
  const sortedQuestions = [...(questions || [])].sort(
    (a, b) => (a.order_index || 0) - (b.order_index || 0)
  );

  const renderedQuestionIds = new Set<string>();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="mt-2 w-full flex items-center justify-center gap-2 bg-background hover:bg-muted text-foreground border shadow-2xs font-semibold text-xs h-9"
          >
            <Eye className="h-4 w-4 text-primary" />
            <span>{isReadOnly ? 'Ver mi Entrega' : 'Ver Entrega y Calificar'}</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl max-h-[88vh] overflow-y-auto w-[95vw] sm:w-full p-4 sm:p-6">
        <DialogHeader>
          <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <FileText className="h-5 w-5 text-primary shrink-0" />
              <span>{isReadOnly ? 'Mi Entrega:' : 'Entrega:'} {activity?.title || 'Evaluación'}</span>
            </DialogTitle>
            {currentScore !== null ? (
              <Badge
                variant="outline"
                className={cn(
                  'font-bold text-xs gap-1',
                  currentScore >= (activity?.passing_score || 70)
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/60 dark:text-red-300'
                )}
              >
                Nota: {(currentScore / 20).toFixed(1)} / 5.0
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 text-xs font-bold">
                Sin calificar
              </Badge>
            )}
          </div>
          {attempt.attempt_number && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Intento #{attempt.attempt_number}{' '}
              {attempt.completed_at &&
                `• Realizado el ${new Date(attempt.completed_at).toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}`}
            </p>
          )}
        </DialogHeader>

        <div className="py-2 space-y-5">
          {/* Archivo adjunto si lo hubiere */}
          {hasFile && (
            <div className="bg-muted/20 p-4 rounded-lg border flex flex-col gap-2.5">
              <h4 className="font-semibold text-sm text-foreground">Archivo Adjunto</h4>
              <p className="text-xs text-muted-foreground">
                El estudiante subió un archivo o documento para esta actividad.
              </p>
              <Button
                size="sm"
                className="w-full gap-2 font-semibold"
                onClick={() => window.open(attempt.file_url as string, '_blank')}
              >
                <Download className="h-4 w-4" />
                Descargar / Ver Archivo Adjunto
              </Button>
            </div>
          )}

          {/* Respuestas del estudiante con texto resuelto */}
          {hasAnswers && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b">
                <h4 className="font-bold text-xs uppercase tracking-wider text-foreground">
                  Respuestas del Estudiante
                </h4>
                {isLoadingQuestions && (
                  <span className="text-[11px] text-muted-foreground animate-pulse">
                    Cargando enunciados...
                  </span>
                )}
              </div>

              <div className="space-y-3">
                {/* 1. Render all questions that match the activity */}
                {sortedQuestions.length > 0 ? (
                  sortedQuestions.map((q, idx) => {
                    renderedQuestionIds.add(q.id);
                    const studentAnswer = attempt.answers_json ? attempt.answers_json[q.id] : null;

                    // Question type label
                    const typeLabel =
                      q.type === 'single_choice'
                        ? 'Opción Única'
                        : q.type === 'multiple_choice'
                        ? 'Selección Múltiple'
                        : q.type === 'fill_blank'
                        ? 'Completar Espacios'
                        : q.type === 'open_text'
                        ? 'Pregunta Abierta'
                        : q.type === 'matching'
                        ? 'Emparejamiento'
                        : q.type === 'order_steps'
                        ? 'Ordenar Pasos'
                        : 'Pregunta';

                    return (
                      <div
                        key={q.id}
                        className="p-4 bg-muted/10 rounded-xl border space-y-2.5 shadow-2xs hover:border-primary/30 transition-colors"
                      >
                        {/* Enunciado de la Pregunta */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2 flex-1 min-w-0">
                            <span className="font-bold text-sm text-primary shrink-0 mt-0.5">
                              {idx + 1}.
                            </span>
                            <p className="font-semibold text-sm text-foreground leading-snug">
                              {q.type === 'fill_blank' && q.question_text?.includes('[___]')
                                ? 'Completa la siguiente frase:'
                                : q.question_text}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-[10px] uppercase font-bold shrink-0">
                            {typeLabel}
                          </Badge>
                        </div>

                        {/* Respuesta del estudiante según el tipo */}
                        <div className="pl-5 text-sm">
                          {/* CASO: OPCIÓN ÚNICA */}
                          {q.type === 'single_choice' && (() => {
                            if (studentAnswer === null || studentAnswer === undefined) {
                              return <span className="italic text-muted-foreground text-xs">No respondió.</span>;
                            }
                            const ansInfo = answersMap.get(studentAnswer);
                            const answerText = ansInfo ? ansInfo.text : resolveText(studentAnswer);
                            const isCorrect = ansInfo ? ansInfo.isCorrect : undefined;

                            // Find expected correct answer
                            const correctAnswer = q.activity_answers?.find((a) => a.is_correct);

                            return (
                              <div className="space-y-1.5">
                                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                                  Opción elegida:
                                </span>
                                <div
                                  className={cn(
                                    'p-2.5 rounded-lg border flex items-center justify-between gap-2 text-xs font-semibold',
                                    isCorrect === true
                                      ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300'
                                      : isCorrect === false
                                      ? 'bg-red-50/70 border-red-300 text-red-900 dark:bg-red-950/30 dark:border-red-800 dark:text-red-300'
                                      : 'bg-background text-foreground'
                                  )}
                                >
                                  <div className="flex items-center gap-2">
                                    {isCorrect === true && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                                    {isCorrect === false && <XCircle className="w-4 h-4 text-red-600 shrink-0" />}
                                    <span className="text-sm font-bold">{answerText}</span>
                                  </div>
                                  {isCorrect !== undefined && (
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        'text-[10px] font-bold',
                                        isCorrect ? 'border-emerald-400 text-emerald-700' : 'border-red-400 text-red-700'
                                      )}
                                    >
                                      {isCorrect ? 'Correcta' : 'Incorrecta'}
                                    </Badge>
                                  )}
                                </div>
                                {isCorrect === false && correctAnswer && (
                                  <p className="text-xs text-muted-foreground">
                                    Respuesta esperada: <strong>{correctAnswer.answer_text}</strong>
                                  </p>
                                )}
                              </div>
                            );
                          })()}

                          {/* CASO: SELECCIÓN MÚLTIPLE */}
                          {q.type === 'multiple_choice' && (() => {
                            const selectedItems = Array.isArray(studentAnswer)
                              ? studentAnswer
                              : studentAnswer !== null && studentAnswer !== undefined
                              ? [studentAnswer]
                              : [];

                            if (selectedItems.length === 0) {
                              return <span className="italic text-muted-foreground text-xs">No seleccionó opciones.</span>;
                            }

                            return (
                              <div className="space-y-1.5">
                                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                                  Opciones seleccionadas por el estudiante:
                                </span>
                                <div className="flex flex-wrap gap-2">
                                  {selectedItems.map((item: any, sIdx: number) => {
                                    const ansInfo = answersMap.get(item);
                                    const text = ansInfo ? ansInfo.text : resolveText(item);
                                    const isCorrect = ansInfo ? ansInfo.isCorrect : undefined;

                                    return (
                                      <Badge
                                        key={sIdx}
                                        variant="outline"
                                        className={cn(
                                          'text-xs py-1 px-2.5 font-semibold flex items-center gap-1.5 shadow-2xs',
                                          isCorrect === true
                                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300'
                                            : isCorrect === false
                                            ? 'bg-red-50 text-red-800 border-red-300 dark:bg-red-950/40 dark:text-red-300'
                                            : 'bg-background text-foreground'
                                        )}
                                      >
                                        {isCorrect === true && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                                        {isCorrect === false && <XCircle className="w-3.5 h-3.5 text-red-600" />}
                                        <span>{text}</span>
                                      </Badge>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}

                          {/* CASO: COMPLETAR ESPACIOS (FILL_BLANK) */}
                          {q.type === 'fill_blank' && (() => {
                            const parts = (q.question_text || '').split('[___]');
                            const numSpaces = parts.length > 1 ? parts.length - 1 : 1;

                            const getBlankValue = (idx: number): string => {
                              let raw: any = '';
                              if (Array.isArray(studentAnswer)) {
                                raw = studentAnswer[idx];
                              } else if (typeof studentAnswer === 'object' && studentAnswer !== null) {
                                raw = studentAnswer[idx] ?? studentAnswer[String(idx)];
                              } else if (typeof studentAnswer === 'string' && idx === 0) {
                                raw = studentAnswer;
                              }
                              return resolveText(raw);
                            };

                            return (
                              <div className="space-y-3">
                                {/* Frase reconstruida con los textos del estudiante */}
                                {parts.length > 1 && (
                                  <div className="p-3 bg-background border rounded-lg text-sm leading-relaxed text-foreground font-medium shadow-2xs">
                                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                                      Frase completada por el estudiante:
                                    </span>
                                    <p className="leading-relaxed">
                                      {parts.map((part, pIdx) => {
                                        const filled = getBlankValue(pIdx);
                                        return (
                                          <span key={pIdx}>
                                            {part}
                                            {pIdx < parts.length - 1 && (
                                              <span
                                                className={cn(
                                                  'inline-block px-2 py-0.5 mx-1 rounded font-bold border text-xs',
                                                  filled.trim()
                                                    ? 'bg-primary/10 text-primary border-primary/30'
                                                    : 'bg-muted text-muted-foreground border-dashed italic'
                                                )}
                                              >
                                                {filled.trim() ? filled : `[Espacio ${pIdx + 1} vacío]`}
                                              </span>
                                            )}
                                          </span>
                                        );
                                      })}
                                    </p>
                                  </div>
                                )}

                                {/* Desglose espacio por espacio */}
                                <div className="grid grid-cols-1 gap-2">
                                  {Array.from({ length: numSpaces }).map((_, bIdx) => {
                                    const filled = getBlankValue(bIdx);
                                    const refAnswer = q.activity_answers?.[bIdx]?.answer_text;

                                    return (
                                      <div
                                        key={bIdx}
                                        className="p-2.5 bg-background border rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                                      >
                                        <div className="flex items-center gap-2">
                                          <Badge variant="outline" className="font-mono text-[10px] font-bold">
                                            Espacio #{bIdx + 1}
                                          </Badge>
                                          <span className="text-foreground font-bold text-sm">
                                            {filled.trim() ? (
                                              `"${filled}"`
                                            ) : (
                                              <span className="italic font-normal text-muted-foreground">Sin responder</span>
                                            )}
                                          </span>
                                        </div>

                                        {refAnswer && (
                                          <div className="text-muted-foreground text-xs">
                                            Referencia esperada: <strong className="text-foreground">{refAnswer}</strong>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}

                          {/* CASO: PREGUNTA ABIERTA */}
                          {q.type === 'open_text' && (
                            <div className="space-y-1.5">
                              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                                Respuesta escrita:
                              </span>
                              <div className="p-3 bg-background border rounded-lg text-sm text-foreground leading-relaxed whitespace-pre-wrap shadow-2xs">
                                {studentAnswer ? (
                                  studentAnswer
                                ) : (
                                  <span className="italic text-muted-foreground">El estudiante no escribió respuesta.</span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* CASO: EMPAREJAR (MATCHING) */}
                          {q.type === 'matching' && (
                            <div className="space-y-1.5">
                              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                                Emparejamientos realizados:
                              </span>
                              <div className="space-y-1 bg-background p-2.5 rounded-lg border text-xs">
                                {q.activity_answers?.map((a) => {
                                  const [concept, ...rest] = (a.answer_text || '').split('|').map((s) => s.trim());
                                  const expectedDef = rest.join('|').trim();
                                  const studentChoiceId =
                                    typeof studentAnswer === 'object' && studentAnswer !== null
                                      ? studentAnswer[a.id] || studentAnswer[concept]
                                      : 'Sin responder';
                                  const studentChoiceText = resolveText(studentChoiceId);

                                  return (
                                    <div
                                      key={a.id}
                                      className="flex items-center justify-between py-1 border-b last:border-0 gap-2"
                                    >
                                      <span className="font-semibold text-foreground">{concept}</span>
                                      <span className="text-muted-foreground">➔</span>
                                      <span className="font-medium text-foreground">{studentChoiceText}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* CASO: ORDENAR PASOS */}
                          {q.type === 'order_steps' && (
                            <div className="space-y-1.5">
                              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                                Secuencia organizada:
                              </span>
                              <div className="space-y-1 bg-background p-2.5 rounded-lg border text-xs">
                                {Array.isArray(studentAnswer) && studentAnswer.length > 0 ? (
                                  studentAnswer.map((stepId: any, sIdx: number) => {
                                    const stepText = resolveText(stepId);
                                    return (
                                      <div key={sIdx} className="flex items-center gap-2 py-0.5">
                                        <Badge variant="outline" className="font-mono text-[10px]">
                                          Paso {sIdx + 1}
                                        </Badge>
                                        <span className="font-medium text-foreground">{stepText}</span>
                                      </div>
                                    );
                                  })
                                ) : (
                                  <span className="italic text-muted-foreground">No ordenó los pasos.</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  /* Fallback si no hay preguntas estructuradas cargadas aún */
                  <div className="space-y-3">
                    {Object.entries(attempt.answers_json).map(([qId, answer]: [string, any], idx) => {
                      // Attempt to resolve answer text even without questions
                      const displayAnswer = Array.isArray(answer)
                        ? answer.map((item) => resolveText(item)).join('  •  ')
                        : resolveText(answer);

                      return (
                        <div key={qId} className="p-3 bg-muted/10 rounded-lg border text-xs space-y-1">
                          <span className="font-semibold text-muted-foreground block text-xs">
                            Pregunta {idx + 1}
                          </span>
                          <p className="font-medium text-sm text-foreground whitespace-pre-wrap">
                            {displayAnswer}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 2. Any answers in answers_json not accounted for in sortedQuestions */}
                {Object.entries(attempt.answers_json)
                  .filter(([qId]) => !renderedQuestionIds.has(qId))
                  .map(([qId, answer]: [string, any], extraIdx) => {
                    const displayAnswer = Array.isArray(answer)
                      ? answer.map((item) => resolveText(item)).join('  •  ')
                      : resolveText(answer);

                    return (
                      <div key={qId} className="p-3 bg-muted/10 rounded-lg border text-xs space-y-1">
                        <span className="font-semibold text-muted-foreground block text-xs">
                          Pregunta Adicional {extraIdx + 1}
                        </span>
                        <p className="font-medium text-sm text-foreground whitespace-pre-wrap">
                          {displayAnswer}
                        </p>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {!hasFile && !hasAnswers && (
            <div className="bg-muted/20 p-4 rounded-lg border text-sm text-muted-foreground text-center">
              Esta entrega no contiene archivos adjuntos ni respuestas guardadas para previsualizar. Puedes ajustar o validar la calificación a continuación.
            </div>
          )}

          {/* Sección para Calificar o Ajustar Nota (Solo para Profesores / Administradores) */}
          {!isReadOnly && (
            <div className="p-4 rounded-xl border bg-muted/20 space-y-3">
              <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                <Award className="w-4 h-4" />
                <span>Asignar / Modificar Calificación</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                <div className="space-y-1 w-full sm:w-36">
                  <Label className="text-xs">Nota (1.0 - 5.0):</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="5.0"
                    value={gradeInput}
                    onChange={(e) => setGradeInput(e.target.value)}
                    placeholder="Ej: 4.5"
                    className="font-bold text-base text-center"
                  />
                </div>

                <div className="flex-1">
                  <div className="flex flex-wrap gap-1 mb-1">
                    {['3.0', '3.5', '4.0', '4.5', '5.0'].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setGradeInput(val)}
                        className={cn(
                          'px-2.5 py-1 rounded text-xs font-semibold border transition-colors',
                          gradeInput === val
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background hover:bg-muted text-foreground'
                        )}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleSaveGrade}
                  disabled={isPending || !gradeInput}
                  size="sm"
                  className="font-semibold whitespace-nowrap h-9 w-full sm:w-auto"
                >
                  {isPending ? 'Guardando...' : 'Guardar Calificación'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
