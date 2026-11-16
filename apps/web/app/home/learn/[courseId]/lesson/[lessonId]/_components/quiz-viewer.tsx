'use client';

import { useEffect, useMemo, useState, useTransition, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

import {
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  ArrowUpDown,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  HelpCircle,
  PenLine,
  Shuffle,
  Split,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import { Textarea } from '@kit/ui/textarea';
import { Badge } from '@kit/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@kit/ui/alert-dialog';

import { getFullActivityAction, submitActivityAttemptAction, getActivityAttemptsAction } from '~/lib/lms/server/actions/activity.actions';
import { markLessonCompleteAction } from '~/lib/lms/server/actions/progress.actions';

export function seededShuffle<T>(array: T[], seed: string): T[] {
  const result = [...array];
  if (result.length <= 1) return result;

  // Mulberry32 deterministic PRNG
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }

  const random = () => {
    h = Math.imul(h ^ (h >>> 15), 1 | h);
    h ^= h + Math.imul(h ^ (h >>> 7), 61 | h) ^ h;
    return ((h ^ (h >>> 14)) >>> 0) / 4294967296;
  };

  // Fisher-Yates shuffle with PRNG
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }

  return result;
}

function MatchingViewer({
  question,
  studentMatches,
  onSelectMatch,
  result,
  studentSeed,
}: {
  question: any;
  studentMatches: Record<string, string>;
  onSelectMatch: (pairId: string, value: string) => void;
  result: any;
  studentSeed?: string;
}) {
  const pairs = useMemo(() => {
    return (question.activity_answers || [])
      .map((a: any) => {
        const parts = (a.answer_text || '').split('|').map((s: string) => s.trim());
        return {
          id: a.id,
          concept: parts[0] || '',
          definition: parts.slice(1).join('|').trim() || parts[0] || '',
        };
      })
      .filter((p: any) => p.concept.length > 0);
  }, [question.activity_answers]);

  // Shuffled definitions for the dropdown using studentSeed
  const availableDefinitions = useMemo(() => {
    const defs = pairs.map((p: any) => p.definition);
    return seededShuffle(defs, `${studentSeed || 'student'}-matching-defs-${question.id}`);
  }, [pairs, question.id, studentSeed]);

  const normalize = (str: string) =>
    str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

  return (
    <div className="mt-3 space-y-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground pb-1">
        <Split className="w-4 h-4 text-primary" />
        <span>Selecciona la definición o pareja correspondiente para cada concepto:</span>
      </div>

      <div className="space-y-3">
        {pairs.map((pair: any, index: number) => {
          const selectedValue = studentMatches?.[pair.id] || '';
          const isCorrect =
            result && normalize(selectedValue) === normalize(pair.definition);
          const isIncorrect =
            result && normalize(selectedValue) !== normalize(pair.definition);

          return (
            <div
              key={pair.id}
              className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 ${
                result
                  ? isCorrect
                    ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20'
                    : 'border-destructive/60 bg-destructive/5'
                  : 'bg-background hover:border-primary/40 shadow-xs'
              }`}
            >
              {/* Concept (Left Column) */}
              <div className="flex items-center gap-2.5 sm:w-1/2">
                <Badge variant="secondary" className="font-mono text-xs px-2 py-0.5 shrink-0">
                  {index + 1}
                </Badge>
                <span className="font-semibold text-foreground text-sm leading-tight">
                  {pair.concept}
                </span>
              </div>

              <div className="items-center justify-center text-muted-foreground shrink-0 hidden sm:flex">
                <ArrowRight className="w-4 h-4" />
              </div>

              {/* Match Selector (Right Column) */}
              <div className="sm:w-1/2">
                <Select
                  value={selectedValue}
                  onValueChange={(val) => onSelectMatch(pair.id, val)}
                  disabled={!!result}
                >
                  <SelectTrigger
                    className={`w-full h-auto min-h-9 py-2 text-left whitespace-normal [&>span]:line-clamp-none [&>span]:whitespace-normal text-sm font-medium ${
                      result
                        ? isCorrect
                          ? 'border-emerald-500 text-emerald-800 dark:text-emerald-300'
                          : 'border-destructive text-destructive'
                        : ''
                    }`}
                  >
                    <SelectValue placeholder="Elegir pareja correspondiente..." />
                  </SelectTrigger>
                  <SelectContent className="max-w-[calc(100vw-2rem)]">
                    {availableDefinitions.map((def: string, dIdx: number) => (
                      <SelectItem key={dIdx} value={def} className="whitespace-normal break-words">
                        {def}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {result && isIncorrect && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                    ✓ Correcta: {pair.definition}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      
    </div>
  );
}

function FillBlankViewer({
  question,
  studentAnswer,
  onChange,
  result,
}: {
  question: any;
  studentAnswer: any;
  onChange: (value: any) => void;
  result: any;
}) {
  const parts = (question.question_text || '').split('[___]');
  const hasBlanks = parts.length > 1;
  const blankCount = hasBlanks ? parts.length - 1 : 1;

  const getBlankValue = (index: number): string => {
    if (Array.isArray(studentAnswer)) {
      return studentAnswer[index] ?? '';
    }
    if (typeof studentAnswer === 'object' && studentAnswer !== null) {
      return studentAnswer[index] ?? studentAnswer[String(index)] ?? '';
    }
    if (typeof studentAnswer === 'string') {
      return index === 0 ? studentAnswer : '';
    }
    return '';
  };

  const handleBlankChange = (index: number, val: string) => {
    let currentList: string[] = [];
    if (Array.isArray(studentAnswer)) {
      currentList = [...studentAnswer];
    } else if (typeof studentAnswer === 'object' && studentAnswer !== null) {
      for (let k = 0; k < blankCount; k++) {
        currentList[k] = studentAnswer[k] ?? studentAnswer[String(k)] ?? '';
      }
    } else if (typeof studentAnswer === 'string') {
      currentList = [studentAnswer];
    }
    while (currentList.length < blankCount) {
      currentList.push('');
    }
    currentList[index] = val;
    onChange(currentList);
  };

  return (
    <div className="mt-4 space-y-4">
      {hasBlanks && (
        <div className="p-4 sm:p-5 rounded-xl border bg-muted/20 text-base sm:text-lg leading-relaxed font-medium text-foreground shadow-2xs">
          <span className="text-xs font-semibold uppercase text-muted-foreground block mb-2 tracking-wider">
            Frase a completar (vista en vivo):
          </span>
          {parts.map((part: string, idx: number) => {
            const val = getBlankValue(idx);
            const isFilled = val.trim().length > 0;
            return (
              <span key={idx}>
                <span>{part}</span>
                {idx < parts.length - 1 && (
                  <span
                    className={`inline-flex items-center gap-1.5 mx-1.5 px-2.5 py-0.5 rounded-lg border text-sm sm:text-base font-bold transition-all ${
                      result
                        ? 'border-amber-500/60 bg-amber-100/50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200'
                        : isFilled
                        ? 'border-primary bg-primary/10 text-primary shadow-xs'
                        : 'border-dashed border-primary/50 text-muted-foreground bg-background'
                    }`}
                  >
                    <span className="text-[10px] font-mono font-semibold uppercase tracking-wider px-1 py-0.2 rounded bg-muted/60 text-muted-foreground">
                      Espacio {idx + 1}
                    </span>
                    <span className="underline decoration-primary/40 underline-offset-4">
                      {isFilled ? val : '________'}
                    </span>
                  </span>
                )}
              </span>
            );
          })}
        </div>
      )}

      <div className="space-y-3 pt-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-0.5">
          <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <PenLine className="w-3.5 h-3.5 text-primary" />
            <span>
              {blankCount === 1
                ? 'Escribe tu respuesta para completar el espacio:'
                : 'Escribe tu respuesta para cada espacio de forma independiente:'}
            </span>
          </label>
          {result && (
            <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 px-2.5 py-1 rounded-md self-start sm:self-auto">
              <Clock className="w-3.5 h-3.5" /> Pendiente de calificación
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3">
          {Array.from({ length: blankCount }).map((_, idx) => {
            const val = getBlankValue(idx);
            const isFilled = val.trim().length > 0;
            return (
              <div
                key={idx}
                className={`p-3.5 sm:p-4 rounded-xl border transition-all ${
                  result
                    ? 'border-amber-500/40 bg-amber-50/10'
                    : isFilled
                    ? 'border-primary/40 bg-primary/[0.02] shadow-xs'
                    : 'border-muted bg-background hover:border-primary/30'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono text-xs px-2 py-0.5 font-bold">
                      Espacio #{idx + 1}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-medium">
                      Respuesta abierta para el espacio #{idx + 1}
                    </span>
                  </div>
                  {isFilled && !result && (
                    <span className="text-[11px] font-semibold text-primary flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Completado
                    </span>
                  )}
                </div>
                <Input
                  placeholder={`Escribe aquí la palabra o frase para el Espacio #${idx + 1}...`}
                  value={val}
                  onChange={(e) => handleBlankChange(idx, e.target.value)}
                  disabled={!!result}
                  className={`w-full text-sm sm:text-base py-5 font-medium transition-all select-text ${
                    result
                      ? 'border-amber-500/40 bg-amber-50/20 text-foreground'
                      : 'bg-background'
                  }`}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function OrderStepsViewer({
  question,
  studentOrder,
  onChangeOrder,
  result,
  studentSeed,
}: {
  question: any;
  studentOrder?: string[];
  onChangeOrder: (order: string[]) => void;
  result: any;
  studentSeed?: string;
}) {
  const allAnswers = question.activity_answers || [];

  // Deterministic initial shuffle so steps don't appear in correct order initially
  const initialOrder = useMemo(() => {
    if (Array.isArray(studentOrder) && studentOrder.length === allAnswers.length) {
      return studentOrder;
    }
    const ids = allAnswers.map((a: any) => a.id);
    return seededShuffle(ids, `${studentSeed || 'student'}-order-steps-${question.id}`);
  }, [allAnswers, question.id, studentOrder, studentSeed]);

  const [currentOrder, setCurrentOrder] = useState<string[]>(initialOrder);

  useEffect(() => {
    if (!studentOrder || studentOrder.length === 0) {
      onChangeOrder(initialOrder);
    }
  }, [initialOrder, studentOrder, onChangeOrder]);

  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (result) return;
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= currentOrder.length) return;
    const updated = [...currentOrder];
    const temp = updated[index];
    updated[index] = updated[target];
    updated[target] = temp;
    setCurrentOrder(updated);
    onChangeOrder(updated);
  };

  // Correct order calculated from order_index
  const correctSortedAnswers = useMemo(() => {
    return [...allAnswers].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
  }, [allAnswers]);

  const correctOrderIds = correctSortedAnswers.map((a: any) => a.id);
  const isAllCorrect = result && JSON.stringify(correctOrderIds) === JSON.stringify(currentOrder);

  return (
    <div className="mt-3 space-y-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground pb-1">
        <ArrowUpDown className="w-4 h-4 text-primary" />
        <span>
          Organiza los siguientes pasos en la secuencia correcta (el primero debe ir arriba y el último abajo):
        </span>
      </div>

      <div className="space-y-3">
        {currentOrder.map((stepId: string, idx: number) => {
          const stepAnswer = allAnswers.find((a: any) => a.id === stepId);
          const isCorrectPosition = result && correctOrderIds[idx] === stepId;

          return (
            <div
              key={stepId || idx}
              className={`p-3.5 sm:p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                result
                  ? isCorrectPosition
                    ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20'
                    : 'border-destructive/60 bg-destructive/5'
                  : 'bg-background hover:border-primary/40 shadow-xs'
              }`}
            >
              {/* Enunciado completo y Paso a un lado */}
              <div className="flex items-start sm:items-center justify-between gap-3 flex-1 min-w-0">
                <span className="text-foreground text-sm sm:text-base font-medium leading-snug break-words flex-1">
                  {stepAnswer?.answer_text || 'Paso'}
                </span>
                <Badge
                  variant={result ? (isCorrectPosition ? 'default' : 'destructive') : 'secondary'}
                  className="font-mono text-xs px-2.5 py-1 shrink-0 font-bold"
                >
                  Paso {idx + 1}
                </Badge>
              </div>

              {!result && (
                <div className="flex items-center gap-2 pt-2 border-t sm:border-t-0 sm:pt-0 shrink-0 w-full sm:w-auto">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1 sm:flex-initial h-8 px-3 text-xs gap-1 font-medium"
                    disabled={idx === 0}
                    onClick={() => moveItem(idx, 'up')}
                  >
                    <ChevronUp className="w-3.5 h-3.5" /> Subir
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1 sm:flex-initial h-8 px-3 text-xs gap-1 font-medium"
                    disabled={idx === currentOrder.length - 1}
                    onClick={() => moveItem(idx, 'down')}
                  >
                    <ChevronDown className="w-3.5 h-3.5" /> Bajar
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {result && !isAllCorrect && (
        <div className="p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 text-xs text-foreground space-y-2 mt-4">
          <span className="font-bold text-emerald-800 dark:text-emerald-300 block">
            Secuencia correcta esperada:
          </span>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground font-medium pl-1">
            {correctSortedAnswers.map((step: any, sIdx: number) => (
              <li key={step.id || sIdx} className="text-foreground">
                {step.answer_text}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

export function QuizViewer({
  activityId,
  courseId,
  lessonId,
  currentUserId,
}: {
  activityId: string;
  courseId: string;
  lessonId?: string;
  currentUserId?: string;
}) {
  const router = useRouter();
  const [activity, setActivity] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [result, setResult] = useState<any>(null);
  const [isPending, startTransition] = useTransition();
  const [isStarted, setIsStarted] = useState(false);
  const [pastAttempts, setPastAttempts] = useState<any[]>([]);
  const [studentSeed, setStudentSeed] = useState<string>('');

  // Control de seguridad e integridad (detección de ventanas y pantalla completa)
  const [warningStrikes, setWarningStrikes] = useState<number>(0);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState<boolean>(false);
  const [isDisqualified, setIsDisqualified] = useState<boolean>(false);
  const isSubmittingRef = useRef<boolean>(false);
  const answersRef = useRef<Record<string, any>>(answers);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    startTransition(async () => {
      try {
        const [data, attemptsData] = await Promise.all([
          getFullActivityAction({ id: activityId }),
          getActivityAttemptsAction({ activity_id: activityId }).catch(() => [])
        ]);

        const uid = data?.currentUserId || currentUserId || 'student';
        const seed = `${uid}-${activityId}-${attemptsData?.length || 0}`;
        setStudentSeed(seed);

        if (data?.activity_questions) {
          if (data.randomize_order) {
            // Shuffle questions deterministically for this student
            data.activity_questions = seededShuffle(
              data.activity_questions,
              `${seed}-questions`
            );

            // Shuffle answer options inside each question for this student
            data.activity_questions.forEach((q: any) => {
              if (q.activity_answers && q.activity_answers.length > 0) {
                if (q.type === 'single_choice' || q.type === 'multiple_choice' || q.type === 'matching') {
                  q.activity_answers = seededShuffle(
                    q.activity_answers,
                    `${seed}-answers-${q.id}`
                  );
                } else if (q.type !== 'order_steps') {
                  q.activity_answers.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));
                }
              }
            });
          } else {
            // Default sequential order
            data.activity_questions.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));
            data.activity_questions.forEach((q: any) => {
              if (q.activity_answers) {
                q.activity_answers.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));
              }
            });
          }
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
  }, [activityId, currentUserId]);

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
    isSubmittingRef.current = true;
    if (typeof document !== 'undefined' && document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
    startTransition(async () => {
      try {
        const evalResult = await submitActivityAttemptAction({
          activity_id: activityId,
          answers
        });
        setResult(evalResult);

        // Auto-complete the lesson when an attempt is submitted
        if (lessonId) {
          try {
            await markLessonCompleteAction({
              course_id: courseId,
              lesson_id: lessonId,
            });
          } catch (progressErr) {
            console.error('Error auto-completing lesson:', progressErr);
          }
        }

        toast.success(
          evalResult.needsGrading
            ? '¡Cuestionario enviado! Tu profesor revisará tus respuestas abiertas.'
            : evalResult.passed
            ? '¡Aprobaste el cuestionario!'
            : 'Cuestionario completado.'
        );
        router.refresh();
      } catch (e: any) {
        isSubmittingRef.current = false;
        toast.error(e.message || 'Error al enviar el cuestionario');
      }
    });
  };

  // Salida e invalidación del cuestionario (Strike 2)
  const handleDisqualifyQuiz = useCallback(() => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    setIsSecurityModalOpen(false);
    setIsDisqualified(true);

    if (typeof document !== 'undefined' && document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }

    startTransition(async () => {
      try {
        const evalResult = await submitActivityAttemptAction({
          activity_id: activityId,
          answers: answersRef.current || {},
        });
        setResult(evalResult);
        toast.error('Cuestionario cerrado por deshonestidad académica / salida de ventana.', {
          duration: 7000,
        });
        router.refresh();
      } catch (e: any) {
        console.error('Error auto-submitting on security violation:', e);
      }
    });
  }, [activityId, router]);

  // Manejo de violaciones (Strike 1 = Advertencia, Strike 2 = Cierre definitivo)
  const handleSecurityViolation = useCallback(() => {
    if (!isStarted || result || isDisqualified || isSubmittingRef.current) return;
    if (isSecurityModalOpen) return;

    if (warningStrikes === 0) {
      setWarningStrikes(1);
      setIsSecurityModalOpen(true);
      toast.warning('¡Advertencia de Seguridad Académica!', {
        description: 'Se detectó que saliste de la ventana o pantalla del cuestionario.',
        duration: 5000,
      });
    } else {
      handleDisqualifyQuiz();
    }
  }, [isStarted, result, isDisqualified, isSecurityModalOpen, warningStrikes, handleDisqualifyQuiz]);

  // Aceptar advertencia y regresar a pantalla completa
  const acknowledgeWarning = async () => {
    setIsSecurityModalOpen(false);
    try {
      if (typeof document !== 'undefined' && !document.fullscreenElement && document.documentElement?.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (e) {
      // ignore
    }
  };

  // Iniciar cuestionario solicitando pantalla completa
  const startQuiz = async () => {
    try {
      if (typeof document !== 'undefined' && document.documentElement?.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (e) {
      console.warn('Fullscreen no disponible o rechazado:', e);
    }
    setWarningStrikes(0);
    setIsSecurityModalOpen(false);
    setIsDisqualified(false);
    isSubmittingRef.current = false;
    setIsStarted(true);
  };

  // Escuchar eventos de cambio de ventana, visibilidad, pantalla completa y bloqueo de copiado
  useEffect(() => {
    if (!isStarted || result || isDisqualified) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleSecurityViolation();
      }
    };

    const handleWindowBlur = () => {
      setTimeout(() => {
        if (!document.hasFocus() && !isSubmittingRef.current) {
          handleSecurityViolation();
        }
      }, 250);
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !isSubmittingRef.current) {
        handleSecurityViolation();
      }
    };

    let lastCopyWarn = 0;
    const warnNoCopy = () => {
      const now = Date.now();
      if (now - lastCopyWarn > 2500) {
        lastCopyWarn = now;
        toast.warning('No está permitido copiar la información del cuestionario.', {
          duration: 3000,
        });
      }
    };

    const handleCopyOrCut = (e: ClipboardEvent) => {
      e.preventDefault();
      warnNoCopy();
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';

      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        // Bloquear copiar, cortar, imprimir, ver código fuente y seleccionar todo fuera de inputs
        if (key === 'c' || key === 'x' || key === 'u' || key === 'p') {
          e.preventDefault();
          if (key === 'c' || key === 'x') warnNoCopy();
        } else if (key === 'a' && !isInput) {
          e.preventDefault();
        } else if (e.shiftKey && (key === 'i' || key === 'j' || key === 'c')) {
          e.preventDefault();
        }
      } else if (e.key === 'F12') {
        e.preventDefault();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('copy', handleCopyOrCut);
    document.addEventListener('cut', handleCopyOrCut);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('copy', handleCopyOrCut);
      document.removeEventListener('cut', handleCopyOrCut);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isStarted, result, isDisqualified, handleSecurityViolation]);

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

  if (!isStarted) {
    return (
      <div className="bg-background text-foreground mx-auto max-w-3xl rounded-xl border p-4 sm:p-8 md:p-12 shadow-sm text-center">
        <HelpCircle className="h-12 w-12 sm:h-16 sm:w-16 text-primary mx-auto mb-4 sm:mb-6" />
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-3 sm:mb-4">{activity.title}</h2>
        {activity.description && (
          <p className="text-muted-foreground mb-4 sm:mb-6 text-sm sm:text-base md:text-lg">{activity.description}</p>
        )}
        <div className="flex flex-col gap-2.5 mb-6 sm:mb-10 max-w-sm mx-auto text-xs sm:text-sm text-muted-foreground bg-muted/20 p-4 sm:p-6 rounded-xl border text-left">
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
          {activity.randomize_order && (
            <div className="flex justify-between border-t pt-2 text-primary font-medium">
              <span className="flex items-center gap-1.5 text-foreground">
                <Shuffle className="w-3.5 h-3.5 text-primary" /> Orden aleatorio:
              </span>
              <span className="font-semibold text-primary">Activado</span>
            </div>
          )}
        </div>

        {pastAttempts.length > 0 && (() => {
          const latestAttempt = pastAttempts[0];
          const isNeedsGrading = latestAttempt.status === 'needs_grading';
          const passed = latestAttempt.score >= (activity.passing_score || 0);

          if (isNeedsGrading) {
            return (
              <div className="mb-10 p-6 bg-amber-50/70 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/50 rounded-xl max-w-sm mx-auto text-center shadow-sm">
                <Clock className="w-10 h-10 text-amber-500 mx-auto mb-2 animate-pulse" />
                <h3 className="font-bold text-lg text-foreground mb-1">En Revisión</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Tu entrega incluye preguntas abiertas o de completar espacios y está en revisión por tu profesor. Tu nota se actualizará pronto.
                </p>
                <div className="flex items-center justify-between text-xs text-muted-foreground bg-white dark:bg-background p-3 rounded-lg border">
                  <span>Intentos realizados:</span>
                  <span className="font-bold text-foreground">
                    {pastAttempts.length} {activity.max_attempts ? `/ ${activity.max_attempts}` : ''}
                  </span>
                </div>
              </div>
            );
          }

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
          const hasPending = pastAttempts.some(a => a.status === 'needs_grading');
          const reachedMaxAttempts = activity.max_attempts && pastAttempts.length >= activity.max_attempts;
          
          if (hasPassed) {
            return (
              <div className="text-primary font-semibold bg-primary/10 p-4 rounded-lg inline-block border border-primary/20">
                ¡Ya has aprobado este cuestionario!
              </div>
            );
          }

          if (hasPending) {
            return (
              <div className="text-amber-800 dark:text-amber-300 font-semibold bg-amber-50 dark:bg-amber-950/40 p-4 rounded-lg inline-block border border-amber-200 dark:border-amber-800">
                Tu entrega fue recibida y está a la espera de calificación del profesor.
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
            <div className="space-y-4">
              <div className="flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/30 p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/60 max-w-sm mx-auto text-left shadow-2xs">
                <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-xs">Protección de Pantalla y Ventanas</span>
                  <span className="text-[11px] text-muted-foreground leading-relaxed block mt-0.5">
                    Este cuestionario se realiza en <strong>pantalla completa</strong>. Si sales de la pantalla o abres otras ventanas/pestañas, recibirás una advertencia; a la segunda salida, el cuestionario se cancelará automáticamente.
                  </span>
                </div>
              </div>

              <Button size="lg" className="w-full sm:w-auto px-6 sm:px-12 text-base sm:text-lg h-12 sm:h-14" onClick={startQuiz}>
              {pastAttempts.length > 0 ? 'Reintentar Cuestionario' : 'Comenzar Cuestionario'}
            </Button>
            </div>
          );
        })()}
      </div>
    );
  }

  if (isDisqualified) {
    return (
      <div className="bg-background text-foreground mx-auto max-w-2xl rounded-2xl border-2 border-destructive/40 p-6 sm:p-10 shadow-lg text-center space-y-6 animate-in fade-in duration-300">
        <div className="h-16 w-16 bg-destructive/15 text-destructive rounded-full flex items-center justify-center mx-auto shadow-inner">
          <ShieldAlert className="h-9 w-9" />
        </div>

        <div className="space-y-2">
          <Badge variant="destructive" className="px-3 py-1 text-xs uppercase font-bold tracking-wider">
            Infracción de Seguridad Académica
          </Badge>
          <h2 className="text-2xl font-extrabold text-foreground">
            Cuestionario Cancelado y Cerrado
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-lg mx-auto">
            El sistema detectó que abriste otras ventanas, cambiaste de pestaña o saliste de la pantalla completa tras haber recibido la primera advertencia.
          </p>
        </div>

        <div className="bg-muted/30 border rounded-xl p-4 text-xs text-left max-w-md mx-auto space-y-2">
          <div className="flex justify-between border-b pb-1.5">
            <span className="font-semibold text-muted-foreground">Estado del intento:</span>
            <span className="font-bold text-destructive">Cerrado por salida de ventana</span>
          </div>
          {result && (
            <div className="flex justify-between pt-0.5">
              <span className="font-semibold text-muted-foreground">Calificación registrada:</span>
              <span className="font-bold text-foreground">{(result.score / 20).toFixed(1)} / 5.0</span>
            </div>
          )}
        </div>

        <div className="pt-2 flex justify-center">
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto px-8"
          >
            Volver a la Lección
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-background text-foreground mx-auto max-w-3xl rounded-xl border p-3.5 sm:p-6 md:p-8 shadow-sm ${
        !result && !isDisqualified ? 'select-none print:hidden' : ''
      }`}
      style={!result && !isDisqualified ? { WebkitUserSelect: 'none', WebkitTouchCallout: 'none' } : undefined}
      onCopy={(e) => {
        if (!result && !isDisqualified) e.preventDefault();
      }}
      onCut={(e) => {
        if (!result && !isDisqualified) e.preventDefault();
      }}
      onContextMenu={(e) => {
        if (!result && !isDisqualified) e.preventDefault();
      }}
      onDragStart={(e) => {
        if (!result && !isDisqualified) e.preventDefault();
      }}
    >
      <div className="mb-6 sm:mb-8 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 border-b pb-4">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <HelpCircle className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-foreground text-xl sm:text-2xl font-bold">{activity.title}</h2>
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-300 dark:border-emerald-800 font-semibold shadow-2xs">
                <ShieldAlert className="w-3.5 h-3.5" />
                Modo Seguro Activo
              </span>
            </div>
            {activity.passing_score && (
              <p className="text-xs sm:text-sm text-muted-foreground">Nota mínima para aprobar: {(activity.passing_score / 20).toFixed(1)} de 5.0</p>
            )}
          </div>
        </div>
        {activity.time_limit_minutes && !result && (
          <div className="self-start md:self-auto bg-muted/30 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-mono text-base sm:text-lg font-semibold border">
            {activity.time_limit_minutes}:00
          </div>
        )}
      </div>

      <div className="space-y-10">
        {questions.map((q: any, idx: number) => {
          const feedback = result?.feedback?.[q.id];
          const isCorrect = feedback?.isCorrect;
          const isManualGradingType = q.type === 'open_text' || q.type === 'fill_blank';

          return (
            <div
              key={q.id}
              className={`space-y-3 sm:space-y-4 p-3.5 sm:p-6 rounded-xl border ${
                result
                  ? isManualGradingType
                    ? 'border-amber-500/40 bg-amber-500/5'
                    : isCorrect
                    ? 'border-primary/30 bg-primary/5'
                    : 'border-destructive/30 bg-destructive/5'
                  : 'bg-card'
              }`}
            >
              <div className="flex gap-2.5 sm:gap-3">
                <span className="text-muted-foreground font-bold text-sm sm:text-base">{idx + 1}.</span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-foreground text-base sm:text-lg leading-snug sm:leading-relaxed font-medium">
                    {q.type === 'fill_blank' && q.question_text?.includes('[___]')
                      ? 'Completa los espacios en blanco de la siguiente frase:'
                      : q.question_text}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-muted-foreground">Valor: {q.points || 1} puntos</p>
                    {isManualGradingType && (
                      <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/50 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-900">
                        Calificación manual
                      </span>
                    )}
                  </div>
                </div>
                {result && (
                  <div>
                    {isManualGradingType ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-100/70 dark:bg-amber-950/60 px-2.5 py-1 rounded-md border border-amber-300 dark:border-amber-800">
                        <Clock className="w-3.5 h-3.5" /> Por calificar
                      </span>
                    ) : isCorrect ? (
                      <CheckCircle2 className="w-6 h-6 text-primary" />
                    ) : (
                      <XCircle className="w-6 h-6 text-destructive" />
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2.5 sm:space-y-3 pl-0 sm:pl-7">
                {(q.type === 'single_choice' || q.type === 'true_false') && q.activity_answers?.filter((opt: any) => opt.answer_text && opt.answer_text.trim() !== '').map((opt: any) => {
                  const isSelected = answers[q.id] === opt.id;
                  let optionStyle = 'border-muted bg-background hover:border-primary/50 cursor-pointer';
                  
                  if (isSelected) optionStyle = 'border-primary bg-primary/5 ring-1 ring-primary';
                  if (result) optionStyle = 'border-muted bg-muted/30 opacity-70 cursor-default';
                  if (result && isSelected) optionStyle += ' ring-1 ring-muted-foreground';

                  return (
                    <div
                      key={opt.id}
                      onClick={() => handleSelect(q.id, opt.id)}
                      className={`flex items-center gap-3 rounded-xl border p-3 sm:p-4 text-sm sm:text-base transition-all ${optionStyle}`}
                    >
                      <div className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border ${isSelected ? 'border-primary' : 'border-muted-foreground'}`}>
                        {isSelected && <div className="bg-primary h-2.5 w-2.5 rounded-full" />}
                      </div>
                      <span className="text-foreground leading-snug">{opt.answer_text}</span>
                    </div>
                  );
                })}

                {q.type === 'multiple_choice' && q.activity_answers?.filter((opt: any) => opt.answer_text && opt.answer_text.trim() !== '').map((opt: any) => {
                  const isSelected = Array.isArray(answers[q.id]) && answers[q.id].includes(opt.id);
                  let optionStyle = 'border-muted bg-background hover:border-primary/50 cursor-pointer';
                  
                  if (isSelected) optionStyle = 'border-primary bg-primary/5 ring-1 ring-primary';
                  if (result) optionStyle = 'border-muted bg-muted/30 opacity-70 cursor-default';

                  return (
                    <div
                      key={opt.id}
                      onClick={() => handleSelect(q.id, opt.id, true)}
                      className={`flex items-center gap-3 rounded-xl border p-3 sm:p-4 text-sm sm:text-base transition-all ${optionStyle}`}
                    >
                      <div className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border ${isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-primary-foreground" />}
                      </div>
                      <span className="text-foreground leading-snug">{opt.answer_text}</span>
                    </div>
                  );
                })}

                {q.type === 'fill_blank' && (
                  <FillBlankViewer
                    question={q}
                    studentAnswer={answers[q.id] || []}
                    onChange={(val) => handleSelect(q.id, val)}
                    result={result}
                  />
                )}

                {q.type === 'open_text' && (
                  <div className="mt-3 space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground block">
                      Escribe tu respuesta detallada:
                    </label>
                    <Textarea 
                      placeholder="Escribe tu respuesta aquí con tus propias palabras..." 
                      value={answers[q.id] || ''} 
                      onChange={e => handleSelect(q.id, e.target.value)}
                      disabled={!!result}
                      className="min-h-[130px] w-full max-w-2xl text-sm bg-background border-input leading-relaxed select-text"
                    />
                  </div>
                )}
                
                {q.type === 'matching' && (
                  <MatchingViewer
                    question={q}
                    studentMatches={answers[q.id] || {}}
                    onSelectMatch={(pairId, val) => {
                      setAnswers((prev) => ({
                        ...prev,
                        [q.id]: {
                          ...(typeof prev[q.id] === 'object' && prev[q.id] !== null ? prev[q.id] : {}),
                          [pairId]: val,
                        },
                      }));
                    }}
                    result={result}
                    studentSeed={studentSeed}
                  />
                )}

                {q.type === 'order_steps' && (
                  <OrderStepsViewer
                    question={q}
                    studentOrder={answers[q.id]}
                    onChangeOrder={(newOrder) => handleSelect(q.id, newOrder)}
                    result={result}
                    studentSeed={studentSeed}
                  />
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
            {result.needsGrading ? (
              <div className="max-w-md mx-auto bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 mb-6">
                <Clock className="w-10 h-10 text-amber-500 mx-auto mb-3 animate-pulse" />
                <h3 className="text-xl font-bold text-foreground mb-2">
                  Cuestionario enviado para revisión
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Esta evaluación incluye preguntas abiertas o de completar espacios que deben ser revisadas y calificadas por tu profesor. Tu nota definitiva se publicará una vez completada la revisión.
                </p>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  <Clock className="w-3.5 h-3.5" /> Estado: Pendiente por calificar
                </div>
              </div>
            ) : (
              <>
                <h3 className={`mb-2 text-2xl font-bold ${result.passed ? 'text-primary' : 'text-destructive'}`}>
                  Resultado: {result.score.toFixed(1)}%
                </h3>
                <p className="text-muted-foreground mb-6 text-lg">
                  {result.passed ? '¡Felicidades! Has aprobado el cuestionario.' : 'No has alcanzado la nota mínima requerida.'}
                </p>
              </>
            )}
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
      {/* Modal de Advertencia por cambio de ventana (Strike 1) */}
      <AlertDialog open={isSecurityModalOpen && isStarted && !isDisqualified}>
        <AlertDialogContent className="sm:max-w-[480px] border-amber-300 dark:border-amber-800 bg-card shadow-2xl">
          <AlertDialogHeader className="flex flex-col items-center text-center space-y-3">
            <div className="h-14 w-14 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center animate-bounce">
              <AlertTriangle className="h-7 w-7" />
            </div>

            <AlertDialogTitle className="text-xl font-bold text-foreground">
              ⚠️ Advertencia de Seguridad (1 de 1)
            </AlertDialogTitle>

            <AlertDialogDescription className="text-sm text-muted-foreground text-center leading-relaxed">
              Se detectó que <strong>saliste de la pantalla del cuestionario o abriste otra ventana/pestaña</strong>.
            </AlertDialogDescription>

            <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/40 p-4 text-xs text-amber-900 dark:text-amber-200 text-left space-y-1">
              <p className="font-bold">⚠️ Esta es tu única advertencia permitida.</p>
              <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                Si vuelves a abrir otra ventana, cambiar de pestaña o salir de pantalla completa, el cuestionario <strong>se cerrará de forma automática y definitiva</strong>, registrando tu intento como reprobado.
              </p>
            </div>
          </AlertDialogHeader>

          <AlertDialogFooter className="mt-4 pt-3 border-t sm:justify-center">
            <Button
              type="button"
              size="lg"
              onClick={acknowledgeWarning}
              className="w-full sm:w-auto px-8 font-bold gap-2"
            >
              <ShieldAlert className="h-4 w-4" />
              <span>Entendido, volver al cuestionario</span>
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
