'use client';

import { Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@kit/ui/dialog';
import { Button } from '@kit/ui/button';

export function StudentAttemptDialog({ activity, attempt, studentName }: { activity: any, attempt: any, studentName: string }) {
  if (!attempt) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={`h-7 px-3.5 rounded-full font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm
            ${attempt.score >= 60 
              ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:border-green-300 dark:bg-green-950/40 dark:text-green-400 dark:border-green-900/50 dark:hover:bg-green-900/60' 
              : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 hover:border-red-300 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/50 dark:hover:bg-red-900/60'}`}
        >
          <span>{(attempt.score / 20).toFixed(1)}</span>
          <Eye className="w-3.5 h-3.5 opacity-80" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Respuestas de {studentName}</DialogTitle>
          <p className="text-sm text-muted-foreground">Actividad: {activity.title} • Nota: {(attempt.score / 20).toFixed(1)}/5.0</p>
        </DialogHeader>
        
        <div className="space-y-4 mt-2">
          {!activity.activity_questions || activity.activity_questions.length === 0 ? (
            <p className="text-muted-foreground text-sm italic">No se encontraron detalles de las preguntas.</p>
          ) : (
            activity.activity_questions.map((q: any, i: number) => {
              const studentAnswer = attempt.answers_json ? attempt.answers_json[q.id] : null;
              
              return (
                <div key={q.id} className="border p-4 rounded-lg bg-muted/10">
                  <div className="flex gap-2">
                    <span className="font-semibold text-muted-foreground">{i + 1}.</span>
                    <p className="font-medium mb-3">{q.question_text}</p>
                  </div>
                  
                  <div className="pl-6 text-sm">
                    {q.type === 'open_text' ? (
                      <div className="space-y-1">
                        <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Respuesta libre:</span>
                        <div className="mt-1 p-3 bg-background border rounded-md whitespace-pre-wrap text-foreground">
                          {studentAnswer ? studentAnswer : <span className="italic text-muted-foreground">No respondió.</span>}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                         <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Selección del estudiante:</span>
                         <span className="font-medium p-2 bg-background border rounded-md">
                           {(() => {
                             if (studentAnswer === undefined || studentAnswer === null) {
                               return <span className="italic text-muted-foreground">No respondió.</span>;
                             }
                             
                             if (q.activity_answers) {
                               if (Array.isArray(studentAnswer)) {
                                 const selectedTexts = studentAnswer.map(id => {
                                   const ans = q.activity_answers.find((a: any) => a.id === id);
                                   return ans ? ans.answer_text : id;
                                 });
                                 return selectedTexts.join(', ');
                               } else {
                                 const ans = q.activity_answers.find((a: any) => a.id === studentAnswer);
                                 return ans ? ans.answer_text : studentAnswer;
                               }
                             }
                             
                             return typeof studentAnswer === 'object' ? JSON.stringify(studentAnswer) : studentAnswer;
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
      </DialogContent>
    </Dialog>
  );
}
