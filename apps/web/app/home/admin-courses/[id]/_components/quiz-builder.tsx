'use client';

import { useEffect, useState, useTransition } from 'react';

import {
  ArrowRight,
  ArrowUpDown,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Clock,
  Eye,
  HelpCircle,
  ListChecks,
  PlusCircle,
  Settings,
  Shuffle,
  Sparkles,
  Split,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { Textarea } from '@kit/ui/textarea';
import { Switch } from '@kit/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@kit/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import { Checkbox } from '@kit/ui/checkbox';
import { Badge } from '@kit/ui/badge';

import { createActivityAction, updateActivityAction, getFullActivityAction } from '~/lib/lms/server/actions/activity.actions';

export interface QuizBuilderProps {
  courseId?: string;
  lessonId?: string;
  activityId?: string;
  onSaved: (activityId: string) => void;
}

export function QuizBuilder({ courseId, lessonId, activityId, onSaved }: QuizBuilderProps) {
  const [isPending, startTransition] = useTransition();

  // Activity Settings
  const [title, setTitle] = useState('Cuestionario');
  const [timeLimit, setTimeLimit] = useState<number | ''>('');
  const [maxAttempts, setMaxAttempts] = useState<number | ''>('');
  const [passingScore, setPassingScore] = useState<number>(70);
  const [autoFeedback, setAutoFeedback] = useState(true);
  const [randomizeOrder, setRandomizeOrder] = useState(false);

  // Questions
  const [questions, setQuestions] = useState<any[]>([]);

  useEffect(() => {
    if (activityId) {
      startTransition(async () => {
        try {
          const activity = await getFullActivityAction({ id: activityId });
          if (activity) {
            setTitle(activity.title || 'Cuestionario');
            setTimeLimit(activity.time_limit_minutes || '');
            setMaxAttempts(activity.max_attempts || '');
            setPassingScore(activity.passing_score || 70);
            setAutoFeedback(activity.automatic_feedback_enabled || false);
            setRandomizeOrder(activity.randomize_order || false);

            if (activity.activity_questions) {
              const loadedQuestions = activity.activity_questions.map((q: any) => ({
                ...q,
                answers: (q.activity_answers || []).map((a: any) => ({
                  ...a,
                  is_correct: Boolean(a.is_correct),
                })),
              }));

              // Sort questions and answers by order_index
              loadedQuestions.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));
              loadedQuestions.forEach((q: any) => {
                q.answers.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));

                // If question uses options, ensure there is an empty row at the end ready for typing
                if (['single_choice', 'multiple_choice'].includes(q.type)) {
                  const last = q.answers[q.answers.length - 1];
                  if (!last || (last.answer_text && last.answer_text.trim() !== '')) {
                    q.answers.push({
                      id: crypto.randomUUID(),
                      answer_text: '',
                      is_correct: false,
                      order_index: q.answers.length,
                    });
                  }
                } else if (q.type === 'matching') {
                  const last = q.answers[q.answers.length - 1];
                  const parts = (last?.answer_text || '').split('|').map((s: string) => s.trim());
                  if (!last || (parts.length >= 2 && parts[0] !== '' && parts[1] !== '')) {
                    q.answers.push({
                      id: crypto.randomUUID(),
                      answer_text: ' | ',
                      is_correct: true,
                      order_index: q.answers.length,
                    });
                  }
                } else if (q.type === 'order_steps') {
                  const last = q.answers[q.answers.length - 1];
                  if (!last || (last.answer_text && last.answer_text.trim() !== '')) {
                    q.answers.push({
                      id: crypto.randomUUID(),
                      answer_text: '',
                      is_correct: true,
                      order_index: q.answers.length,
                    });
                  }
                } else if (q.type === 'true_false') {
                  if (!q.answers || q.answers.length === 0) {
                    q.answers = [
                      { id: crypto.randomUUID(), answer_text: 'Verdadero', is_correct: true, order_index: 0 },
                      { id: crypto.randomUUID(), answer_text: 'Falso', is_correct: false, order_index: 1 },
                    ];
                  } else if (!q.answers.some((a: any) => a.is_correct)) {
                    q.answers[0].is_correct = true;
                  }
                }
              });

              setQuestions(loadedQuestions);
            }
          }
        } catch (error) {
          console.error('Error loading activity', error);
          toast.error('Error al cargar el cuestionario');
        }
      });
    }
  }, [activityId]);

  const handleSave = () => {
    startTransition(async () => {
      try {
        // Clean blank answers so they don't get saved nor validated as errors
        const cleanedQuestions = questions.map((q, idx) => {
          let cleanedAnswers = q.answers || [];
          if (q.type === 'matching') {
            cleanedAnswers = cleanedAnswers.filter((a: any) => {
              const parts = (a.answer_text || '').split('|').map((s: string) => s.trim());
              return parts.length >= 2 && parts[0].length > 0 && parts[1].length > 0;
            }).map((a: any) => ({ ...a, is_correct: true }));
          } else if (q.type === 'order_steps' || q.type === 'fill_blank') {
            cleanedAnswers = cleanedAnswers.filter(
              (a: any) => a.answer_text && a.answer_text.trim() !== ''
            ).map((a: any) => ({ ...a, is_correct: true }));
          } else if (['single_choice', 'multiple_choice'].includes(q.type)) {
            cleanedAnswers = cleanedAnswers.filter(
              (a: any) => a.answer_text && a.answer_text.trim() !== ''
            );
          }

          return {
            ...q,
            order_index: idx,
            answers: cleanedAnswers.map((a: any, aIdx: number) => ({
              ...a,
              order_index: aIdx,
            })),
          };
        });

        // Validations
        for (let i = 0; i < cleanedQuestions.length; i++) {
          const q = cleanedQuestions[i];
          if (!q.question_text || q.question_text.trim() === '') {
            toast.error(`Por favor ingresa el texto de la pregunta #${i + 1}`);
            return;
          }

          if (['single_choice', 'multiple_choice'].includes(q.type)) {
            if (q.answers.length === 0) {
              toast.error(`La pregunta #${i + 1} debe tener al menos una opción válida.`);
              return;
            }
            const hasCorrect = q.answers.some((a: any) => a.is_correct);
            if (!hasCorrect) {
              toast.error(
                `Por favor marca al menos una respuesta como correcta en la pregunta #${i + 1}.`
              );
              return;
            }
          }

          if (q.type === 'matching') {
            if (q.answers.length < 2) {
              toast.error(`La pregunta de emparejar #${i + 1} debe tener al menos 2 parejas completas (concepto y definición).`);
              return;
            }
          }

          if (q.type === 'fill_blank') {
            if (q.answers.length === 0) {
              toast.error(`La pregunta de completar espacios #${i + 1} debe tener al menos una respuesta válida aceptada.`);
              return;
            }
          }

          if (q.type === 'order_steps') {
            if (q.answers.length < 2) {
              toast.error(`La pregunta de ordenar pasos #${i + 1} debe tener al menos 2 pasos para ordenar.`);
              return;
            }
          }
        }

        const payload = {
          lesson_id: lessonId,
          course_id: courseId,
          type: 'quick_quiz' as const,
          title,
          time_limit_minutes: timeLimit === '' ? undefined : Number(timeLimit),
          max_attempts: maxAttempts === '' ? undefined : Number(maxAttempts),
          passing_score: Number(passingScore),
          automatic_feedback_enabled: autoFeedback,
          randomize_order: randomizeOrder,
          questions: cleanedQuestions,
        };

        let result;
        if (activityId) {
          result = await updateActivityAction({ id: activityId, ...payload });
        } else {
          result = await createActivityAction(payload);
        }

        // Clean up UI so blank options don't remain on screen
        setQuestions(cleanedQuestions);

        toast.success('Cuestionario guardado');
        if (result && !activityId) {
          onSaved(result.id);
        }
      } catch (error: any) {
        toast.error(error.message || 'Error al guardar el cuestionario');
      }
    });
  };

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        question_text: '',
        type: 'multiple_choice',
        points: 1,
        feedback_text: '',
        answers: [
          { id: crypto.randomUUID(), answer_text: '', is_correct: false },
          { id: crypto.randomUUID(), answer_text: '', is_correct: false },
        ],
      },
    ]);
  };

  const updateQuestion = (qIndex: number, field: string, value: any) => {
    setQuestions((prevQuestions) =>
      prevQuestions.map((q, qi) => {
        if (qi !== qIndex) return q;

        const updatedQ = { ...q, [field]: value };

        // Auto adjust answers based on type
        if (field === 'type') {
          if (value === 'true_false') {
            updatedQ.answers = [
              { id: crypto.randomUUID(), answer_text: 'Verdadero', is_correct: true, order_index: 0 },
              { id: crypto.randomUUID(), answer_text: 'Falso', is_correct: false, order_index: 1 },
            ];
          } else if (value === 'matching') {
            updatedQ.answers = [
              { id: crypto.randomUUID(), answer_text: ' | ', is_correct: true, order_index: 0 },
              { id: crypto.randomUUID(), answer_text: ' | ', is_correct: true, order_index: 1 },
            ];
          } else if (value === 'order_steps') {
            updatedQ.answers = [
              { id: crypto.randomUUID(), answer_text: '', is_correct: true, order_index: 0 },
              { id: crypto.randomUUID(), answer_text: '', is_correct: true, order_index: 1 },
            ];
          } else if (value === 'fill_blank') {
            updatedQ.answers = [
              { id: crypto.randomUUID(), answer_text: '', is_correct: true, order_index: 0 },
            ];
            if (updatedQ.question_text && !updatedQ.question_text.includes('[___]')) {
              updatedQ.question_text = updatedQ.question_text + ' [___]';
            }
          } else if (value === 'open_text') {
            updatedQ.answers = [];
          } else if (value === 'single_choice') {
            // When switching to single_choice, ensure at most one answer is marked correct
            let foundCorrect = false;
            updatedQ.answers = (q.answers || []).map((a: any) => {
              if (a.is_correct) {
                if (!foundCorrect) {
                  foundCorrect = true;
                  return a;
                }
                return { ...a, is_correct: false };
              }
              return a;
            });
          }
        }

        return updatedQ;
      })
    );
  };

  const removeQuestion = (qIndex: number) => {
    setQuestions((prevQuestions) => prevQuestions.filter((_, qi) => qi !== qIndex));
  };

  const addAnswer = (qIndex: number) => {
    setQuestions((prevQuestions) =>
      prevQuestions.map((q, qi) => {
        if (qi !== qIndex) return q;
        const defaultText = q.type === 'matching' ? ' | ' : '';
        return {
          ...q,
          answers: [
            ...(q.answers || []),
            {
              id: crypto.randomUUID(),
              answer_text: defaultText,
              is_correct: ['matching', 'order_steps', 'fill_blank'].includes(q.type) ? true : false,
              order_index: (q.answers || []).length,
            },
          ],
        };
      })
    );
  };

  const moveAnswer = (qIndex: number, aIndex: number, direction: 'up' | 'down') => {
    setQuestions((prevQuestions) =>
      prevQuestions.map((q, qi) => {
        if (qi !== qIndex) return q;
        const answers = [...(q.answers || [])];
        const targetIndex = direction === 'up' ? aIndex - 1 : aIndex + 1;
        if (targetIndex < 0 || targetIndex >= answers.length) return q;
        const temp = answers[aIndex];
        answers[aIndex] = answers[targetIndex];
        answers[targetIndex] = temp;
        return {
          ...q,
          answers: answers.map((a, idx) => ({ ...a, order_index: idx })),
        };
      })
    );
  };

  const updateMatchingPair = (qIndex: number, aIndex: number, part: 'left' | 'right', value: string) => {
    setQuestions((prevQuestions) =>
      prevQuestions.map((q, qi) => {
        if (qi !== qIndex) return q;

        let updatedAnswers = (q.answers || []).map((a: any, ai: number) => {
          if (ai !== aIndex) return a;
          const currentParts = (a.answer_text || '').split('|');
          let left = (currentParts[0] || '').trim();
          let right = (currentParts.slice(1).join('|') || '').trim();
          if (part === 'left') left = value;
          if (part === 'right') right = value;
          return {
            ...a,
            answer_text: `${left} | ${right}`,
            is_correct: true,
          };
        });

        // Auto-append next blank pair if editing last row and has some text
        if (
          aIndex === updatedAnswers.length - 1 &&
          value.trim().length > 0
        ) {
          updatedAnswers = [
            ...updatedAnswers,
            {
              id: crypto.randomUUID(),
              answer_text: ' | ',
              is_correct: true,
              order_index: updatedAnswers.length,
            },
          ];
        }

        return {
          ...q,
          answers: updatedAnswers,
        };
      })
    );
  };

  const updateAnswer = (qIndex: number, aIndex: number, field: string, value: any) => {
    setQuestions((prevQuestions) =>
      prevQuestions.map((q, qi) => {
        if (qi !== qIndex) return q;

        let updatedAnswers = (q.answers || []).map((a: any, ai: number) => {
          if (ai !== aIndex) {
            // If single choice and setting to true, uncheck all others
            if (field === 'is_correct' && value === true && q.type === 'single_choice') {
              return { ...a, is_correct: false };
            }
            return a;
          }
          return { ...a, [field]: value };
        });

        // When typing in the last option and text is non-empty, auto-append a new blank row
        if (
          field === 'answer_text' &&
          typeof value === 'string' &&
          value.trim().length > 0 &&
          aIndex === updatedAnswers.length - 1 &&
          q.type !== 'true_false' &&
          q.type !== 'open_text' &&
          q.type !== 'matching'
        ) {
          updatedAnswers = [
            ...updatedAnswers,
            {
              id: crypto.randomUUID(),
              answer_text: '',
              is_correct: ['order_steps', 'fill_blank'].includes(q.type) ? true : false,
              order_index: updatedAnswers.length,
            },
          ];
        }

        return {
          ...q,
          answers: updatedAnswers,
        };
      })
    );
  };

  const removeAnswer = (qIndex: number, aIndex: number) => {
    setQuestions((prevQuestions) =>
      prevQuestions.map((q, qi) => {
        if (qi !== qIndex) return q;
        const newAnswers = q.answers.filter((_: any, ai: number) => ai !== aIndex);
        if (newAnswers.length === 0 && q.type !== 'open_text') {
          newAnswers.push({
            id: crypto.randomUUID(),
            answer_text: q.type === 'matching' ? ' | ' : '',
            is_correct: ['matching', 'order_steps', 'fill_blank'].includes(q.type) ? true : false,
            order_index: 0,
          });
        }
        return {
          ...q,
          answers: newAnswers,
        };
      })
    );
  };

  return (
    <div className="bg-card rounded-lg border">
      <Tabs defaultValue="questions" className="w-full">
        <div className="border-b px-4 py-3 flex items-center justify-between bg-muted/20">
          <TabsList>
            <TabsTrigger value="questions" className="gap-2"><ListChecks className="w-4 h-4"/> Preguntas</TabsTrigger>
            <TabsTrigger value="settings" className="gap-2"><Settings className="w-4 h-4"/> Configuración</TabsTrigger>
          </TabsList>
          <Button onClick={handleSave} disabled={isPending} size="sm">
            {isPending ? 'Guardando...' : 'Guardar Cuestionario'}
          </Button>
        </div>

        <TabsContent value="questions" className="p-6 space-y-6 m-0">
          {questions.map((q, qIndex) => (
            <div key={q.id} className="border rounded-lg p-5 relative bg-background shadow-sm">
              <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive" onClick={() => removeQuestion(qIndex)}>
                <Trash2 className="w-4 h-4" />
              </Button>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 pr-8">
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between">
                    <Label>Texto de la Pregunta</Label>
                    {q.type === 'fill_blank' && (
                      <button
                        type="button"
                        onClick={() => {
                          const current = q.question_text || '';
                          const newText = current.includes('[___]') ? current : `${current.trim()} [___]`;
                          updateQuestion(qIndex, 'question_text', newText);
                        }}
                        className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline"
                      >
                        + Insertar espacio [___]
                      </button>
                    )}
                  </div>
                  <Input value={q.question_text} onChange={e => updateQuestion(qIndex, 'question_text', e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>Tipo de Pregunta</Label>
                  <Select value={q.type} onValueChange={v => updateQuestion(qIndex, 'type', v)}>
                    <SelectTrigger className="mt-1"><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="multiple_choice">Selección Múltiple</SelectItem>
                      <SelectItem value="single_choice">Selección Única</SelectItem>
                      <SelectItem value="true_false">Verdadero / Falso</SelectItem>
                      <SelectItem value="open_text">Pregunta Abierta</SelectItem>
                      <SelectItem value="matching">Emparejar</SelectItem>
                      <SelectItem value="fill_blank">Completar Espacios</SelectItem>
                      <SelectItem value="order_steps">Ordenar Pasos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {q.type === 'open_text' ? (
                <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-lg p-5 mb-4 text-center">
                  <div className="flex items-center justify-center gap-2 text-amber-700 dark:text-amber-400 font-semibold mb-1">
                    <Clock className="w-5 h-5" />
                    <span>Pregunta de Respuesta Abierta</span>
                  </div>
                  <p className="text-sm text-muted-foreground max-w-lg mx-auto">
                    El estudiante responderá de forma escrita libre. Los puntos no se asignan automáticamente: la entrega quedará en estado <strong>&quot;Por calificar&quot;</strong> para que tú como profesor revises su respuesta y asignes la calificación correspondiente.
                  </p>
                </div>
              ) : q.type === 'matching' ? (
                /* Specialized UI for Matching */
                <div className="bg-muted/30 rounded p-4 mb-4 space-y-3">
                  <div className="bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 rounded-lg p-3.5 text-xs text-indigo-950 dark:text-indigo-200 space-y-1">
                    <div className="font-semibold flex items-center gap-1.5 text-sm text-indigo-700 dark:text-indigo-400">
                      <Split className="w-4 h-4" />
                      <span>Emparejar Conceptos y Definiciones</span>
                    </div>
                    <p>
                      Escribe en la <strong>Columna A</strong> el concepto o término, y en la <strong>Columna B</strong> su definición o pareja correspondiente. Al estudiante se le presentará la columna derecha desordenada en un selector interactivo.
                    </p>
                  </div>

                  <div className="hidden sm:grid sm:grid-cols-2 gap-4 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <div>Concepto / Término (Columna A)</div>
                    <div className="pl-6">Definición / Pareja (Columna B)</div>
                  </div>

                  <div className="space-y-2.5">
                    {q.answers.map((a: any, aIndex: number) => {
                      const parts = (a.answer_text || '').split('|');
                      const left = parts[0] ? parts[0].trim() : '';
                      const right = parts.length > 1 ? parts.slice(1).join('|').trim() : '';

                      return (
                        <div key={a.id} className="group flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 bg-background border rounded-lg shadow-xs">
                          <span className="font-mono text-xs font-bold text-muted-foreground w-6 text-center self-center sm:self-auto">
                            #{aIndex + 1}
                          </span>
                          <div className="flex-1">
                            <Input
                              placeholder="Ej. Mitocondria"
                              value={left}
                              onChange={(e) => updateMatchingPair(qIndex, aIndex, 'left', e.target.value)}
                              className="text-sm font-medium"
                            />
                          </div>
                          <div className="flex items-center justify-center text-muted-foreground px-1">
                            <ArrowRight className="w-4 h-4 hidden sm:block" />
                            <span className="sm:hidden text-xs">se relaciona con:</span>
                          </div>
                          <div className="flex-1">
                            <Input
                              placeholder="Ej. Central energética celular"
                              value={right}
                              onChange={(e) => updateMatchingPair(qIndex, aIndex, 'right', e.target.value)}
                              className="text-sm font-medium"
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive flex-shrink-0 hover:bg-destructive/10 self-end sm:self-center"
                            onClick={() => removeAnswer(qIndex, aIndex)}
                            title="Eliminar pareja"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => addAnswer(qIndex)}
                    className="mt-2 text-xs"
                  >
                    <PlusCircle className="w-3.5 h-3.5 mr-1.5" /> Añadir Pareja
                  </Button>
                </div>
              ) : q.type === 'fill_blank' ? (
                /* Specialized UI for Fill in the Blank */
                <div className="bg-muted/30 rounded p-4 mb-4 space-y-4">
                  <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-lg p-3.5 text-xs text-amber-950 dark:text-amber-200 space-y-1.5">
                    <div className="font-semibold flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-sm text-amber-700 dark:text-amber-400 font-bold">
                        <Clock className="w-4 h-4" />
                        <span>Completar Espacios en Blanco • Calificación Manual</span>
                      </div>
                    </div>
                    <p>
                      Escribe en la pregunta la frase usando <code className="font-mono font-bold bg-amber-200/60 dark:bg-amber-800/60 px-1 py-0.5 rounded">[___]</code> donde irá la palabra que el estudiante debe rellenar (ej. <em>&quot;La capital de Colombia es [___]&quot;</em>).
                    </p>
                    <p className="text-muted-foreground text-[11px]">
                      * Al igual que las preguntas abiertas, esta pregunta queda <strong>pendiente por calificar</strong> para que tú como profesor revises la respuesta del estudiante y le asignes la nota correspondiente.
                    </p>
                  </div>

                  {q.question_text && q.question_text.includes('[___]') && (
                    <div className="p-3 bg-muted/50 rounded-lg border text-sm flex items-center gap-2">
                      <Eye className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="text-muted-foreground text-xs font-semibold">Vista previa:</span>
                      <span className="font-medium text-foreground">
                        {q.question_text.split('[___]').map((part: string, idx: number, arr: any[]) => (
                          <span key={idx}>
                            {part}
                            {idx < arr.length - 1 && (
                              <span className="mx-1 px-3 py-0.5 border-b-2 border-primary bg-primary/10 rounded text-primary font-bold text-xs">
                                [ espacio a rellenar ]
                              </span>
                            )}
                          </span>
                        ))}
                      </span>
                    </div>
                  )}

                  <div>
                    <Label className="block text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2">
                      Respuestas Sugeridas / Referencia (Guía para calificar):
                    </Label>
                    <div className="space-y-2">
                      {q.answers.map((a: any, aIndex: number) => (
                        <div key={a.id} className="group flex items-center gap-2 p-1.5 bg-background border rounded-lg">
                          <Badge variant="outline" className={`text-xs ${aIndex === 0 ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 font-semibold' : 'bg-muted/50'}`}>
                            {aIndex === 0 ? 'Respuesta esperada' : `Sinónimo / Variante #${aIndex + 1}`}
                          </Badge>
                          <Input
                            value={a.answer_text}
                            placeholder={aIndex === 0 ? "Ej. Bogotá" : "Otra respuesta aceptable de referencia (opcional)..."}
                            onChange={(e) => updateAnswer(qIndex, aIndex, 'answer_text', e.target.value)}
                            className="flex-1 font-medium"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive flex-shrink-0 hover:bg-destructive/10"
                            onClick={() => removeAnswer(qIndex, aIndex)}
                            title="Eliminar respuesta"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() => addAnswer(qIndex)}
                      className="mt-2 text-xs"
                    >
                      <PlusCircle className="w-3.5 h-3.5 mr-1.5" /> Añadir Respuesta de Referencia
                    </Button>
                  </div>
                </div>
              ) : q.type === 'order_steps' ? (
                /* Specialized UI for Order Steps */
                <div className="bg-muted/30 rounded p-4 mb-4 space-y-3">
                  <div className="bg-sky-50/70 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900/40 rounded-lg p-3.5 text-xs text-sky-950 dark:text-sky-200 space-y-1.5">
                    <div className="font-semibold flex items-center gap-1.5 text-sm text-sky-700 dark:text-sky-400">
                      <ArrowUpDown className="w-4 h-4" />
                      <span>Ordenar Pasos en Secuencia</span>
                    </div>
                    <p>
                      Escribe los pasos en el <strong>orden correcto</strong> (del primero al último). Usa los botones <span className="font-bold">▲ y ▼</span> para mover su posición. Al estudiante se le presentarán desordenados al azar para que los organice.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {q.answers.map((a: any, aIndex: number) => (
                      <div key={a.id} className="group flex items-center gap-2 p-2 bg-background border rounded-lg shadow-xs">
                        <div className="flex flex-col gap-0.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            disabled={aIndex === 0}
                            onClick={() => moveAnswer(qIndex, aIndex, 'up')}
                            title="Mover paso arriba"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            disabled={aIndex === q.answers.length - 1}
                            onClick={() => moveAnswer(qIndex, aIndex, 'down')}
                            title="Mover paso abajo"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                        </div>

                        <Badge variant="secondary" className="font-mono text-xs px-2.5 py-1 whitespace-nowrap">
                          Paso {aIndex + 1}
                        </Badge>

                        <Input
                          value={a.answer_text}
                          placeholder={`Descripción del paso #${aIndex + 1}...`}
                          onChange={(e) => updateAnswer(qIndex, aIndex, 'answer_text', e.target.value)}
                          className="flex-1 font-medium"
                        />

                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive flex-shrink-0 hover:bg-destructive/10"
                          onClick={() => removeAnswer(qIndex, aIndex)}
                          title="Eliminar paso"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => addAnswer(qIndex)}
                    className="mt-2 text-xs"
                  >
                    <PlusCircle className="w-3.5 h-3.5 mr-1.5" /> Añadir Paso
                  </Button>
                </div>
              ) : (
                /* Choice & True/False UI */
                <div className="bg-muted/30 rounded p-4 mb-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <Label className="block text-sm font-semibold">Opciones / Respuestas</Label>
                    {q.type === 'multiple_choice' && (
                      <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-300 text-xs">
                        Selección múltiple: puedes marcar varias casillas como correctas
                      </Badge>
                    )}
                    {q.type === 'single_choice' && (
                      <Badge variant="outline" className="text-blue-700 bg-blue-50 border-blue-300 text-xs">
                        Selección única: solo una opción puede ser correcta
                      </Badge>
                    )}
                    {q.type === 'true_false' && (
                      <Badge variant="outline" className="text-purple-700 bg-purple-50 border-purple-300 text-xs">
                        Verdadero / Falso: haz clic en la opción correcta
                      </Badge>
                    )}
                  </div>

                  {q.type === 'true_false' ? (
                    <div className="space-y-3 py-2">
                      <p className="text-xs text-muted-foreground">
                        Haz clic en <strong>Verdadero</strong> o <strong>Falso</strong> para definir cuál es la respuesta correcta:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
                        {q.answers.map((a: any, aIndex: number) => {
                          const isCorrect = Boolean(a.is_correct);
                          return (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => {
                                setQuestions((prev) =>
                                  prev.map((item, qi) => {
                                    if (qi !== qIndex) return item;
                                    return {
                                      ...item,
                                      answers: item.answers.map((ans: any, ai: number) => ({
                                        ...ans,
                                        is_correct: ai === aIndex,
                                      })),
                                    };
                                  })
                                );
                              }}
                              className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer text-left ${
                                isCorrect
                                  ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-100 shadow-sm'
                                  : 'border-muted hover:border-muted-foreground/30 bg-background text-foreground'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors ${
                                    isCorrect
                                      ? 'border-emerald-600 bg-emerald-600 text-white'
                                      : 'border-muted-foreground'
                                  }`}
                                >
                                  {isCorrect && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                </div>
                                <span className="font-semibold text-base">{a.answer_text}</span>
                              </div>
                              {isCorrect && (
                                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded">
                                  Correcta
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        {q.answers.map((a: any, aIndex: number) => {
                          const isMultiple = q.type === 'multiple_choice';
                          const isSingle = q.type === 'single_choice';
                          const isCorrect = Boolean(a.is_correct);

                          return (
                            <div key={a.id} className="group flex items-center gap-2">
                              {isMultiple && (
                                <div className="flex items-center justify-center p-1">
                                  <Checkbox
                                    id={`check-${q.id}-${a.id}`}
                                    checked={isCorrect}
                                    onCheckedChange={(checked) =>
                                      updateAnswer(qIndex, aIndex, 'is_correct', Boolean(checked))
                                    }
                                    className="h-5 w-5 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 cursor-pointer"
                                    title={isCorrect ? 'Respuesta correcta (clic para desmarcar)' : 'Marcar como respuesta correcta'}
                                  />
                                </div>
                              )}

                              {isSingle && (
                                <button
                                  type="button"
                                  onClick={() => updateAnswer(qIndex, aIndex, 'is_correct', !isCorrect)}
                                  className="flex-shrink-0 p-1 rounded-full hover:bg-muted transition-colors"
                                  title={isCorrect ? 'Respuesta correcta' : 'Marcar como respuesta correcta única'}
                                >
                                  {isCorrect ? (
                                    <CheckCircle2 className="text-emerald-600 w-5 h-5 fill-emerald-100" />
                                  ) : (
                                    <Circle className="text-muted-foreground hover:text-foreground w-5 h-5" />
                                  )}
                                </button>
                              )}

                              <div className="relative flex-1">
                                <Input
                                  value={a.answer_text}
                                  placeholder={
                                    aIndex === q.answers.length - 1 && !a.answer_text
                                      ? 'Escribe una nueva opción...'
                                      : `Opción ${aIndex + 1}`
                                  }
                                  onChange={(e) => updateAnswer(qIndex, aIndex, 'answer_text', e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      const parent = e.currentTarget.closest('.group');
                                      const nextRow = parent?.nextElementSibling;
                                      const nextInput = nextRow?.querySelector('input') as HTMLInputElement | null;
                                      if (nextInput) {
                                        nextInput.focus();
                                      }
                                    }
                                  }}
                                  className={`transition-all ${
                                    isCorrect && (isSingle || isMultiple)
                                      ? 'border-emerald-500 bg-emerald-50/30 text-emerald-950 font-medium dark:bg-emerald-950/20 dark:text-emerald-100 pr-24'
                                      : (isSingle || isMultiple) ? 'pr-24' : ''
                                  }`}
                                />

                                {(isSingle || isMultiple) && isCorrect && (
                                  <span
                                    onClick={() => updateAnswer(qIndex, aIndex, 'is_correct', !isCorrect)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer select-none rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300"
                                    title="Clic para desmarcar como correcta"
                                  >
                                    ✓ Correcta
                                  </span>
                                )}
                              </div>

                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive flex-shrink-0 hover:bg-destructive/10"
                                onClick={() => removeAnswer(qIndex, aIndex)}
                                title="Eliminar opción"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>

                      <Button variant="outline" size="sm" onClick={() => addAnswer(qIndex)} className="mt-3 text-xs text-slate-900 dark:text-slate-100">
                        <PlusCircle className="w-3 h-3 mr-1"/> Añadir Opción
                      </Button>
                    </>
                  )}
                </div>
              )}

              {autoFeedback && (
                <div>
                  <Label className="text-xs text-muted-foreground">Texto de Retroalimentación (opcional)</Label>
                  <Textarea 
                    value={q.feedback_text || ''} 
                    onChange={e => updateQuestion(qIndex, 'feedback_text', e.target.value)}
                    placeholder="Explicación que verá el alumno después de responder..."
                    className="mt-1 h-16 resize-none text-sm"
                  />
                </div>
              )}
            </div>
          ))}

          <Button variant="outline" onClick={addQuestion} className="w-full py-8 text-muted-foreground border-dashed">
            <PlusCircle className="w-5 h-5 mr-2" /> Agregar Nueva Pregunta
          </Button>
        </TabsContent>

        <TabsContent value="settings" className="p-6 space-y-6 m-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
            <div className="space-y-2">
              <Label>Título del Cuestionario</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            
            <div className="space-y-2">
              <Label>Nota mínima para aprobar (%)</Label>
              <Input type="number" min="0" max="100" value={passingScore} onChange={e => setPassingScore(Number(e.target.value))} />
            </div>

            <div className="space-y-2">
              <Label>Límite de tiempo (minutos)</Label>
              <Input type="number" min="1" placeholder="Sin límite" value={timeLimit} onChange={e => setTimeLimit(e.target.value ? Number(e.target.value) : '')} />
              <p className="text-xs text-muted-foreground">Deja en blanco para no tener límite</p>
            </div>

            <div className="space-y-2">
              <Label>Intentos máximos permitidos</Label>
              <Input type="number" min="1" placeholder="Ilimitados" value={maxAttempts} onChange={e => setMaxAttempts(e.target.value ? Number(e.target.value) : '')} />
            </div>

            <div className="col-span-1 md:col-span-2 flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label className="text-base font-semibold">Retroalimentación Automática</Label>
                <p className="text-sm text-muted-foreground">Muestra explicaciones y respuestas correctas al terminar</p>
              </div>
              <Switch checked={autoFeedback} onCheckedChange={setAutoFeedback} />
            </div>

            <div className="col-span-1 md:col-span-2 flex items-center justify-between p-4 border rounded-lg bg-primary/5 border-primary/20">
              <div className="space-y-0.5 pr-4">
                <div className="flex items-center gap-2">
                  <Shuffle className="w-4 h-4 text-primary" />
                  <Label className="text-base font-semibold">Preguntas y Respuestas en Orden Aleatorio</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Cada estudiante verá las preguntas y sus opciones de respuesta en un orden completamente diferente al azar, dificultando que compartan o copien respuestas.
                </p>
              </div>
              <Switch checked={randomizeOrder} onCheckedChange={setRandomizeOrder} />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
