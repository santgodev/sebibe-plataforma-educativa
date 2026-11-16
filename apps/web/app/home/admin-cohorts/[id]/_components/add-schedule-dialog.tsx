'use client';

import { useState, useTransition, useEffect } from 'react';
import { Calendar, Plus } from 'lucide-react';
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
import { CreateCourseQuickDialog } from './create-course-quick-dialog';

export function AddScheduleDialog({
  cohortId,
  courses,
  instructors,
}: {
  cohortId: string;
  courses: any[];
  instructors: any[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [coursesList, setCoursesList] = useState<any[]>(courses);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Sync if prop courses change
  useEffect(() => {
    setCoursesList(courses);
  }, [courses]);

  // Helper function to calculate end date based on duration_weeks
  function calculateEndDate(courseId: string, startVal: string) {
    const course = coursesList.find((c) => c.id === courseId);
    if (!course || !startVal) return;

    const start = new Date(startVal);
    if (isNaN(start.getTime())) return;

    const weeks = course.duration_weeks || 2;
    const days = weeks * 7;
    start.setDate(start.getDate() + days);
    setEndDate(start.toISOString().split('T')[0] || '');
  }

  function handleCourseChange(courseId: string) {
    setSelectedCourseId(courseId);
    if (startDate) {
      calculateEndDate(courseId, startDate);
    }
  }

  function handleStartDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setStartDate(val);
    if (selectedCourseId && val) {
      calculateEndDate(selectedCourseId, val);
    }
  }

  function handleNewCourseCreated(newCourse: any) {
    setCoursesList((prev) => {
      const exists = prev.some((c) => c.id === newCourse.id);
      return exists ? prev : [newCourse, ...prev];
    });
    setSelectedCourseId(newCourse.id);
    if (startDate) {
      calculateEndDate(newCourse.id, startDate);
    }
    toast.success(`Materia "${newCourse.title}" seleccionada en el formulario`);
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.append('cohort_id', cohortId);
    formData.set('course_id', selectedCourseId);
    formData.set('start_date', startDate);
    formData.set('end_date', endDate);

    const instructor_id = formData.get('instructor_id');

    if (!selectedCourseId || !instructor_id || !startDate || !endDate) {
      toast.error('Debes seleccionar materia, profesor y fechas');
      return;
    }

    startTransition(async () => {
      try {
        await addScheduleToCohortAction(formData);
        toast.success('Materia programada en el cronograma');
        setOpen(false);
        setSelectedCourseId('');
        setStartDate('');
        setEndDate('');
      } catch (error: any) {
        toast.error(error.message || 'Error al programar materia');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2 font-medium">
          <Calendar className="h-4 w-4" />
          Programar Materia
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Programar Materia en Cronograma</DialogTitle>
          <DialogDescription>
            Añade una materia a la línea de tiempo de este grupo. Selecciona el profesor y las fechas exactas en que el módulo estará abierto.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 py-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Materia *</Label>
              <CreateCourseQuickDialog
                instructors={instructors}
                cohortId={cohortId}
                onCourseCreated={handleNewCourseCreated}
                trigger={
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-primary hover:text-primary gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Crear nueva materia
                  </Button>
                }
              />
            </div>

            <Select
              name="course_id"
              value={selectedCourseId}
              onValueChange={handleCourseChange}
              required
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Seleccionar materia..." />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {coursesList.length === 0 ? (
                  <SelectItem value="none" disabled>
                    No hay materias disponibles
                  </SelectItem>
                ) : (
                  coursesList.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title} ({c.duration_weeks || 2} sem - {c.credits || 3} crds)
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Profesor Encargado *</Label>
            <Select name="instructor_id" required>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Seleccionar profesor..." />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {instructors.length === 0 ? (
                  <SelectItem value="none" disabled>
                    No hay profesores disponibles
                  </SelectItem>
                ) : (
                  instructors.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="start_date" className="text-xs font-semibold">
                Inicia el *
              </Label>
              <Input
                id="start_date"
                name="start_date"
                type="date"
                value={startDate}
                onChange={handleStartDateChange}
                required
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end_date" className="text-xs font-semibold">
                Termina el *
              </Label>
              <Input
                id="end_date"
                name="end_date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending || coursesList.length === 0 || instructors.length === 0}
            >
              {isPending ? 'Programando...' : 'Programar Materia'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
