'use client';

import { useState, useTransition } from 'react';
import { Calendar } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';

import { addScheduleToCohortAction } from '~/lib/lms/server/actions/cohorts.actions';

export function AddScheduleDialog({ cohortId, courses, instructors }: { cohortId: string, courses: any[], instructors: any[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Helper function to calculate end date based on duration_weeks
  function handleCourseChange(courseId: string) {
    const course = courses.find(c => c.id === courseId);
    if (!course) return;

    // Get the start date input value if it exists
    const startDateInput = document.getElementById('start_date') as HTMLInputElement;
    const endDateInput = document.getElementById('end_date') as HTMLInputElement;
    
    if (startDateInput && startDateInput.value) {
      const start = new Date(startDateInput.value);
      // add duration_weeks * 7 days
      const days = (course.duration_weeks || 1) * 7;
      start.setDate(start.getDate() + days);
      endDateInput.value = start.toISOString().split('T')[0];
    }
  }

  function handleStartDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const courseIdInput = document.querySelector('input[name="course_id"]') as HTMLInputElement;
    const courseId = courseIdInput?.value;
    const course = courses.find(c => c.id === courseId);
    
    if (e.target.value && course) {
      const start = new Date(e.target.value);
      const days = (course.duration_weeks || 1) * 7;
      start.setDate(start.getDate() + days);
      const endDateInput = document.getElementById('end_date') as HTMLInputElement;
      if (endDateInput) {
        endDateInput.value = start.toISOString().split('T')[0];
      }
    }
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.append('cohort_id', cohortId);

    const course_id = formData.get('course_id');
    const instructor_id = formData.get('instructor_id');

    if (!course_id || !instructor_id) {
      toast.error('Debes seleccionar materia y profesor');
      return;
    }

    startTransition(async () => {
      try {
        await addScheduleToCohortAction(formData);
        toast.success('Materia programada en el cronograma');
        setOpen(false);
      } catch (error: any) {
        toast.error(error.message || 'Error al programar materia');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Calendar className="h-4 w-4" />
          Programar Materia
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Programar Materia</DialogTitle>
          <DialogDescription>
            Añade una materia a la línea de tiempo de este grupo. Selecciona el profesor y las fechas exactas en que el módulo estará abierto.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Materia</Label>
            <Select name="course_id" onValueChange={handleCourseChange} required>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar materia..." />
              </SelectTrigger>
              <SelectContent>
                {courses.length === 0 ? (
                  <SelectItem value="none" disabled>No hay materias</SelectItem>
                ) : (
                  courses.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title} ({c.duration_weeks} sem - {c.credits} crds)
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Profesor</Label>
            <Select name="instructor_id" required>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar profesor..." />
              </SelectTrigger>
              <SelectContent>
                {instructors.length === 0 ? (
                  <SelectItem value="none" disabled>No hay profesores</SelectItem>
                ) : (
                  instructors.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Inicia el</Label>
              <Input id="start_date" name="start_date" type="date" required onChange={handleStartDateChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">Termina el</Label>
              <Input id="end_date" name="end_date" type="date" required />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isPending || courses.length === 0 || instructors.length === 0}>
              {isPending ? 'Programando...' : 'Programar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
