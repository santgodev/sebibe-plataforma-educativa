'use client';

import { useTransition } from 'react';

import { toast } from 'sonner';

import { Button } from '@kit/ui/button';

import {
  publishCourseAction,
  unpublishCourseAction,
} from '~/lib/lms/server/actions/course.actions';

export function CoursePublishToggle({
  courseId,
  initialStatus,
}: {
  courseId: string;
  initialStatus: string;
}) {
  const [isPending, startTransition] = useTransition();
  const isPublished = initialStatus === 'published';

  const handleToggle = () => {
    startTransition(async () => {
      try {
        if (isPublished) {
          const res = await unpublishCourseAction({ id: courseId });
          if ((res as any)?.error) throw new Error((res as any).error);
          toast.success(
            'Materia movida a borrador. Ya no es visible para estudiantes.',
          );
        } else {
          const res = await publishCourseAction({ id: courseId });
          if ((res as any)?.error) throw new Error((res as any).error);
          toast.success('¡Materia publicada! Ahora es visible en el catálogo.');
        }
      } catch (error: any) {
        toast.error(
          error.message || 'Error al cambiar el estado de la materia.',
        );
      }
    });
  };

  return (
    <Button
      onClick={handleToggle}
      disabled={isPending}
      variant={isPublished ? 'secondary' : 'default'}
      className={
        isPublished
          ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
          : 'bg-green-600 text-white hover:bg-green-700'
      }
    >
      {isPending
        ? 'Procesando...'
        : isPublished
          ? 'Mover a Borrador'
          : 'Publicar Materia'}
    </Button>
  );
}
