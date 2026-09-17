'use client';

import { useState, useTransition } from 'react';
import { Plus } from 'lucide-react';
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
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';

import { createCohortAction } from '~/lib/lms/server/actions/cohorts.actions';

export function CreateCohortDialog({ periodId }: { periodId: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.append('period_id', periodId);

    startTransition(async () => {
      try {
        await createCohortAction(formData);
        toast.success('Grupo creado correctamente');
        setOpen(false);
      } catch (error: any) {
        toast.error(error.message || 'Ocurrió un error al crear el grupo');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2">
          <Plus className="h-4 w-4" />
          Añadir Grupo
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Añadir Grupo (Cohorte)</DialogTitle>
          <DialogDescription>
            Crea un nuevo grupo cerrado de estudiantes. A este grupo se le asignará el cronograma de materias a seguir.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del Grupo</Label>
            <Input id="name" name="name" placeholder="Ej. Grupo Alpha" required />
          </div>
          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Creando...' : 'Crear Grupo'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
