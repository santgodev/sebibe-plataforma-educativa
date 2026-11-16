'use client';

import { useTransition } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@kit/ui/button';
import { syncCohortsFromActiveStudentsAction } from '~/lib/lms/server/actions/cohorts.actions';

export function SyncCohortsButton() {
  const [isPending, startTransition] = useTransition();

  function handleSync() {
    startTransition(async () => {
      try {
        const result = await syncCohortsFromActiveStudentsAction();
        toast.success(
          `Cohortes verificadas y sincronizadas. ${result.count} alumnos vinculados a sus grupos por semestre.`
        );
      } catch (error: any) {
        toast.error(error.message || 'Error al sincronizar cohortes');
      }
    });
  }

  return (
    <Button
      variant="outline"
      onClick={handleSync}
      disabled={isPending}
      className="gap-2 font-medium text-xs sm:text-sm"
      title="Verifica todos los alumnos activos en el sistema y crea automáticamente el periodo y grupo para su semestre correspondiente"
    >
      {isPending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span>Sincronizando...</span>
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4 text-primary" />
          <span>Sincronizar por Semestre</span>
        </>
      )}
    </Button>
  );
}

