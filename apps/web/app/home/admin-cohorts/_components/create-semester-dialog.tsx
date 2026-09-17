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

import { createAcademicPeriodAction } from '~/lib/lms/server/actions/cohorts.actions';

export function CreateSemesterDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        await createAcademicPeriodAction(formData);
        toast.success('Semestre creado correctamente');
        setOpen(false);
      } catch (error: any) {
        toast.error(error.message || 'Ocurrió un error al crear el semestre');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Semestre
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear Semestre</DialogTitle>
          <DialogDescription>
            Añade un nuevo periodo académico. Recuerda que la ruta completa toma 3 años (2 años de teoría y 1 de práctica), por lo que crearás semestres secuencialmente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del Semestre</Label>
            <Input id="name" name="name" placeholder="Ej. Semestre 2026-I" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Fecha de Inicio</Label>
              <Input id="start_date" name="start_date" type="date" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">Fecha de Fin</Label>
              <Input id="end_date" name="end_date" type="date" required />
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Creando...' : 'Crear Semestre'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
