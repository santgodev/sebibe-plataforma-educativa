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
import { Label } from '@kit/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';

import { addStudentToCohortAction } from '~/lib/lms/server/actions/cohorts.actions';

export function AddStudentDialog({ cohortId, availableStudents }: { cohortId: string, availableStudents: any[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.append('cohort_id', cohortId);

    const student_id = formData.get('student_id') as string;
    if (!student_id) {
      toast.error('Debes seleccionar un estudiante');
      return;
    }

    startTransition(async () => {
      try {
        await addStudentToCohortAction(formData);
        toast.success('Estudiante matriculado');
        setOpen(false);
      } catch (error: any) {
        toast.error(error.message || 'Error al matricular');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Añadir Estudiante
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Añadir Estudiante al Grupo</DialogTitle>
          <DialogDescription>
            Selecciona un estudiante. Una vez añadido, heredará el calendario de este grupo y tendrá acceso a las materias según la fecha.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Estudiante</Label>
            <Select name="student_id" required>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar estudiante..." />
              </SelectTrigger>
              <SelectContent>
                {availableStudents.length === 0 ? (
                  <SelectItem value="none" disabled>No hay estudiantes disponibles</SelectItem>
                ) : (
                  availableStudents.map(student => (
                    <SelectItem key={student.id} value={student.id}>{student.name} ({student.email})</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isPending || availableStudents.length === 0}>
              {isPending ? 'Añadiendo...' : 'Añadir'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
