'use client';

import { useEffect, useState, useTransition } from 'react';

import { CheckCircle2, Circle, PlusCircle, Trash2, Settings, ListChecks } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { Textarea } from '@kit/ui/textarea';
import { Switch } from '@kit/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@kit/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';

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
            
            if (activity.activity_questions) {
              // Ensure answers is always an array
              const loadedQuestions = activity.activity_questions.map((q: any) => ({
                ...q,
                answers: q.activity_answers || []
              }));
              // Sort questions and answers by order_index
              loadedQuestions.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));
              loadedQuestions.forEach((q: any) => {
                q.answers.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));
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
        const payload = {
          lesson_id: lessonId,
          course_id: courseId,
          type: 'quick_quiz' as const,
          title,
          time_limit_minutes: timeLimit === '' ? undefined : Number(timeLimit),
          max_attempts: maxAttempts === '' ? undefined : Number(maxAttempts),
          passing_score: Number(passingScore),
          automatic_feedback_enabled: autoFeedback,
          questions,
        };

        let result;
        if (activityId) {
          result = await updateActivityAction({ id: activityId, ...payload });
        } else {
          result = await createActivityAction(payload);
        }

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
    setQuestions([
      ...questions,
      {
        id: crypto.randomUUID(),
        question_text: '',
        type: 'single_choice',
        points: 1,
        feedback_text: '',
        answers: [
          { id: crypto.randomUUID(), answer_text: '', is_correct: true },
          { id: crypto.randomUUID(), answer_text: '', is_correct: false }
        ],
      },
    ]);
  };

  const updateQuestion = (qIndex: number, field: string, value: any) => {
    const newQs = [...questions];
    newQs[qIndex][field] = value;
    
    // Auto adjust answers based on type
    if (field === 'type') {
      if (value === 'true_false') {
        newQs[qIndex].answers = [
          { id: crypto.randomUUID(), answer_text: 'Verdadero', is_correct: true },
          { id: crypto.randomUUID(), answer_text: 'Falso', is_correct: false }
        ];
      } else if (value === 'matching' || value === 'order_steps') {
        newQs[qIndex].answers = [
          { id: crypto.randomUUID(), answer_text: '', is_correct: true, order_index: 0 },
          { id: crypto.randomUUID(), answer_text: '', is_correct: true, order_index: 1 }
        ];
      }
    }
    
    setQuestions(newQs);
  };

  const removeQuestion = (qIndex: number) => {
    const newQs = [...questions];
    newQs.splice(qIndex, 1);
    setQuestions(newQs);
  };

  const addAnswer = (qIndex: number) => {
    const newQs = [...questions];
    newQs[qIndex].answers.push({
      id: crypto.randomUUID(),
      answer_text: '',
      is_correct: false,
      order_index: newQs[qIndex].answers.length
    });
    setQuestions(newQs);
  };

  const updateAnswer = (qIndex: number, aIndex: number, field: string, value: any) => {
    const newQs = [...questions];
    newQs[qIndex].answers[aIndex][field] = value;
    
    // If single choice and setting to true, set others to false
    if (field === 'is_correct' && value === true && newQs[qIndex].type === 'single_choice') {
      newQs[qIndex].answers.forEach((a: any, i: number) => {
        if (i !== aIndex) a.is_correct = false;
      });
    }
    
    setQuestions(newQs);
  };

  const removeAnswer = (qIndex: number, aIndex: number) => {
    const newQs = [...questions];
    newQs[qIndex].answers.splice(aIndex, 1);
    setQuestions(newQs);
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
                  <Label>Texto de la Pregunta</Label>
                  <Input value={q.question_text} onChange={e => updateQuestion(qIndex, 'question_text', e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>Tipo de Pregunta</Label>
                  <Select value={q.type} onValueChange={v => updateQuestion(qIndex, 'type', v)}>
                    <SelectTrigger className="mt-1"><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single_choice">Selección Única</SelectItem>
                      <SelectItem value="multiple_choice">Selección Múltiple</SelectItem>
                      <SelectItem value="true_false">Verdadero / Falso</SelectItem>
                      <SelectItem value="matching">Emparejar</SelectItem>
                      <SelectItem value="fill_blank">Completar Espacios</SelectItem>
                      <SelectItem value="order_steps">Ordenar Pasos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="bg-muted/30 rounded p-4 mb-4">
                <Label className="mb-2 block text-sm font-semibold">Opciones / Respuestas</Label>
                
                {q.type === 'fill_blank' && (
                  <p className="text-xs text-muted-foreground mb-3">
                    Añade las palabras exactas que el estudiante debe escribir.
                  </p>
                )}
                {q.type === 'matching' && (
                  <p className="text-xs text-muted-foreground mb-3">
                    Usa el formato "Concepto | Definición". Ejemplo: "Manzana | Fruta roja"
                  </p>
                )}
                {q.type === 'order_steps' && (
                  <p className="text-xs text-muted-foreground mb-3">
                    Añade los pasos en el orden correcto. El sistema los mezclará automáticamente.
                  </p>
                )}

                <div className="space-y-2">
                  {q.answers.map((a: any, aIndex: number) => (
                    <div key={a.id} className="flex items-center gap-2">
                      {(q.type === 'single_choice' || q.type === 'multiple_choice') && (
                        <button
                          onClick={() => updateAnswer(qIndex, aIndex, 'is_correct', !a.is_correct)}
                          type="button"
                          className="flex-shrink-0"
                        >
                          {a.is_correct ? <CheckCircle2 className="text-green-500 w-5 h-5"/> : <Circle className="text-muted-foreground w-5 h-5"/>}
                        </button>
                      )}
                      
                      {q.type === 'order_steps' && (
                        <span className="font-mono text-sm w-6">{aIndex + 1}.</span>
                      )}

                      <Input 
                        value={a.answer_text} 
                        onChange={e => updateAnswer(qIndex, aIndex, 'answer_text', e.target.value)}
                        className={a.is_correct && (q.type === 'single_choice' || q.type === 'multiple_choice') ? 'border-green-500/50' : ''}
                      />
                      
                      {q.type !== 'true_false' && (
                        <Button variant="ghost" size="icon" className="text-destructive flex-shrink-0" onClick={() => removeAnswer(qIndex, aIndex)}>
                          <Trash2 className="w-4 h-4"/>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                
                {q.type !== 'true_false' && (
                  <Button variant="outline" size="sm" onClick={() => addAnswer(qIndex)} className="mt-3 text-xs text-slate-900">
                    <PlusCircle className="w-3 h-3 mr-1"/> Añadir Opción
                  </Button>
                )}
              </div>

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
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
