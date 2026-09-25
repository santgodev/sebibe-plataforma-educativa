'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@kit/ui/button';

import { markLessonCompleteAction } from '~/lib/lms/server/actions/progress.actions';

interface Props {
  courseId: string;
  lessonId: string;
  isAlreadyCompleted?: boolean;
  isDisabled?: boolean;
  disabledReason?: string;
}

export function CompleteLessonButton({
  courseId,
  lessonId,
  isAlreadyCompleted = false,
  isDisabled = false,
  disabledReason = 'No puedes completar esta lección aún',
}: Props) {
  const [isPending, setIsPending] = useState(false);
  const [completed, setCompleted] = useState(isAlreadyCompleted);
  const router = useRouter();

  const handleComplete = async () => {
    if (completed) return;

    setIsPending(true);
    try {
      const result = await markLessonCompleteAction({
        course_id: courseId,
        lesson_id: lessonId,
      });
      setCompleted(true);
      toast.success('¡Lección completada!');

      if (result.status === 'completed') {
        toast.success('🎉 ¡Has terminado la materia al 100%!', {
          duration: 5000,
        });
        // TODO: Redirect to certificate page
      } else {
        // Optionally, router.push to the next lesson if we pass nextLessonId
      }
    } catch (error) {
      toast.error('No se pudo marcar como completada.');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Button
      onClick={handleComplete}
      disabled={isPending || completed || isDisabled}
      variant={completed ? 'secondary' : 'default'}
      className="shrink-0 gap-2 font-medium shadow-sm"
      title={isDisabled ? disabledReason : undefined}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <CheckCircle
          className={`h-4 w-4 ${completed ? 'text-green-500' : ''}`}
        />
      )}
      {completed ? 'Completada' : 'Marcar como completada'}
    </Button>
  );
}
