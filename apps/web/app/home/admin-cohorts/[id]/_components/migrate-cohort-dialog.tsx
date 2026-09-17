'use client';

import { useState, useTransition } from 'react';
import { Users } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@kit/ui/dialog';
import { Label } from '@kit/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';

import { enrollCohortGroupAction } from '~/lib/lms/server/actions/cohorts.actions';

export function MigrateCohortDialog({ cohortId, otherCohorts }: { cohortId: string, otherCohorts: any[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.append('target_cohort_id', cohortId);

    const source_cohort_id = formData.get('source_cohort_id') as string;
    if (!source_cohort_id) {
      toast.error('Debes seleccionar un grupo origen');
      return;
    }

    startTransition(async () => {
      try {
        await enrollCohortGroupAction(formData);
        toast.success('Grupo matriculado con éxito');
        setOpen(false);
      } catch (error: any) {
        toast.error(error.message || 'Error al matricular');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2">
          <Users className="h-4 w-4" />
          Migrar Grupo
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Migrar / Inscribir Grupo Completo</DialogTitle>
          <DialogDescription>
            Selecciona un grupo anterior (ej. del semestre pasado). Todos los jóvenes matriculados en ese grupo quedarán inscritos automáticamente en este nuevo grupo para continuar su proceso.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Grupo Origen</Label>
            <Select name="source_cohort_id" required>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar grupo..." />
              </SelectTrigger>
              <SelectContent>
                {otherCohorts.length === 0 ? (
                  <SelectItem value="none" disabled>No hay otros grupos disponibles</SelectItem>
                ) : (
                  otherCohorts.map(cohort => (
                    <SelectItem key={cohort.id} value={cohort.id}>{cohort.name}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isPending || otherCohorts.length === 0}>
              {isPending ? 'Migrando...' : 'Migrar Grupo'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
