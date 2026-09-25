'use client';

import { useState } from 'react';
import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@kit/ui/dialog';
import { FileText, Download, Eye } from 'lucide-react';

interface Attempt {
  id: string;
  file_url: string | null;
  answers_json: any | null;
  activities: {
    title: string;
    type: string;
  } | null;
}

export function ViewSubmissionDialog({ attempt }: { attempt: Attempt }) {
  const [open, setOpen] = useState(false);
  const activity = attempt.activities;

  const hasFile = !!attempt.file_url;
  const hasAnswers = attempt.answers_json && Object.keys(attempt.answers_json).length > 0;

  if (!hasFile && !hasAnswers) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="mt-2 w-full flex items-center justify-center gap-2 bg-background hover:bg-muted">
          <Eye className="h-4 w-4 text-primary" />
          Ver Entrega
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Entrega: {activity?.title || 'Evaluación'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
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
              <h4 className="font-semibold text-sm mb-3">Respuestas del Cuestionario</h4>
              <div className="max-h-60 overflow-y-auto space-y-3 bg-background p-3 rounded border text-sm">
                {Object.entries(attempt.answers_json).map(([qId, answer]: [string, any], idx) => (
                  <div key={qId} className="border-b last:border-0 pb-2">
                    <span className="font-semibold text-muted-foreground block mb-1">Pregunta {idx + 1}</span>
                    <span className="text-foreground">
                      {typeof answer === 'string' ? answer : JSON.stringify(answer)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
