'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@kit/ui/dialog';
import { FileText, Download, Eye, Award } from 'lucide-react';
import { toast } from 'sonner';

import { gradeActivityAttemptAction } from '~/lib/lms/server/actions/activity.actions';

interface Attempt {
  id: string;
  score?: number | null;
  status?: string | null;
  file_url: string | null;
  answers_json: any | null;
  activities: {
    title: string;
    type: string;
    passing_score?: number | null;
  } | null;
}

export function ViewSubmissionDialog({ attempt }: { attempt: Attempt }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const activity = attempt.activities;
  const initialGrade5 = attempt?.score !== null && attempt?.score !== undefined
    ? ((attempt.score || 0) / 20).toFixed(1)
    : '';
  const [gradeInput, setGradeInput] = useState<string>(initialGrade5);
  const [currentScore, setCurrentScore] = useState<number | null>(attempt?.score ?? null);

  const hasFile = !!attempt.file_url;
  const hasAnswers = attempt.answers_json && Object.keys(attempt.answers_json).length > 0;

  if (!hasFile && !hasAnswers) {
    return null;
  }

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="mt-2 w-full flex items-center justify-center gap-2 bg-background hover:bg-muted">
          <Eye className="h-4 w-4 text-primary" />
          Ver Entrega y Calificar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            Entrega: {activity?.title || 'Evaluación'}
          </DialogTitle>
          {currentScore !== null && (
            <p className="text-xs text-muted-foreground">
              Nota registrada: <strong>{(currentScore / 20).toFixed(1)} / 5.0</strong>
            </p>
          )}
        </DialogHeader>
        
        <div className="py-2 space-y-4">
          {hasFile && (
            <div className="bg-muted/30 p-4 rounded-lg border flex flex-col gap-3">
              <h4 className="font-semibold text-sm">Archivo Adjunto</h4>
              <p className="text-sm text-muted-foreground">
                El estudiante subió un archivo para esta evaluación.
              </p>
              <Button 
                className="w-full gap-2" 
                onClick={() => window.open(attempt.file_url as string, '_blank')}
              >
                <Download className="h-4 w-4" />
                Descargar / Ver Archivo
              </Button>
            </div>
          )}

          {hasAnswers && (
            <div className="bg-muted/30 p-4 rounded-lg border">
              <h4 className="font-semibold text-sm mb-3">Respuestas del Estudiante</h4>
              <div className="max-h-60 overflow-y-auto space-y-3 bg-background p-3 rounded border text-sm">
                {Object.entries(attempt.answers_json).map(([qId, answer]: [string, any], idx) => (
                  <div key={qId} className="border-b last:border-0 pb-2">
                    <span className="font-semibold text-muted-foreground block mb-1 text-xs">Pregunta {idx + 1}</span>
                    <span className="text-foreground whitespace-pre-wrap leading-relaxed">
                      {typeof answer === 'string'
                        ? answer
                        : Array.isArray(answer)
                        ? answer.map((item, i) => `${i + 1}. ${typeof item === 'object' ? item.text || item.id : item}`).join(' ➔ ')
                        : typeof answer === 'object' && answer !== null
                        ? Object.entries(answer).map(([k, v]) => `• ${v}`).join('\n')
                        : JSON.stringify(answer)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sección para calificar */}
          <div className="p-4 rounded-lg border bg-muted/20 space-y-3">
            <div className="flex items-center gap-2 text-primary font-semibold text-sm">
              <Award className="w-4 h-4" />
              <span>Asignar Calificación</span>
            </div>

            <div className="flex items-end gap-3">
              <div className="space-y-1 w-36">
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
                      className={`px-2 py-1 rounded text-xs font-semibold border transition-colors ${
                        gradeInput === val
                          ? 'bg-primary text-primary-foreground border-primary'
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
                size="sm"
                className="font-semibold whitespace-nowrap h-9"
              >
                {isPending ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
