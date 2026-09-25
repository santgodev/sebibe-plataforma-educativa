'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { ArrowRight, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@kit/ui/button';

import { markLessonCompleteAction } from '~/lib/lms/server/actions/progress.actions';

interface Props {
  courseId: string;
  lessonId: string;
  nextLessonId: string | null;
  isAlreadyCompleted?: boolean;
  isDisabled?: boolean;
}

export function NextLessonButton({
  courseId,
  lessonId,
  nextLessonId,
  isAlreadyCompleted = false,
  isDisabled = false,
}: Props) {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const handleNext = async () => {
    setIsPending(true);
    try {
      if (!isAlreadyCompleted) {
        await markLessonCompleteAction({ course_id: courseId, lesson_id: lessonId });
        toast.success('¡Lección completada!');
      }

      if (nextLessonId) {
        router.push(`/home/learn/${courseId}/lesson/${nextLessonId}`);
      } else {
        toast.success('🎉 ¡Has terminado todas las lecciones!', { duration: 5000 });
        router.push(`/home/courses/${courseId}`);
      }
    } catch {
      toast.error('Error al avanzar');
      setIsPending(false);
    }
  };

  return (
    <Button
      onClick={handleNext}
      disabled={isPending || isDisabled}
      className="gap-2 bg-slate-700 text-white hover:bg-slate-800"
      size="lg"
      title={isDisabled ? 'Debes aprobar el cuestionario primero' : undefined}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <CheckCircle className="h-4 w-4" />
      )}
      {nextLessonId ? 'Completar y continuar' : 'Finalizar materia'}
      {nextLessonId && <ArrowRight className="h-4 w-4" />}
    </Button>
  );
}
