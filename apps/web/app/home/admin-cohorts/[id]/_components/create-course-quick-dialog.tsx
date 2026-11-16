'use client';

import { useState, useTransition } from 'react';
import { BookPlus, CheckCircle2, Loader2, Plus } from 'lucide-react';
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
import { Textarea } from '@kit/ui/textarea';

import { createQuickCourseAction } from '~/lib/lms/server/actions/cohorts.actions';

interface CreateCourseQuickDialogProps {
  instructors: Array<{ id: string; name: string }>;
  cohortId?: string;
  trigger?: React.ReactNode;
  onCourseCreated?: (course: {
    id: string;
    title: string;
    duration_weeks: number;
    credits: number;
  }) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CreateCourseQuickDialog({
  instructors,
  cohortId,
  trigger,
  onCourseCreated,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: CreateCourseQuickDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (val: boolean) => {
    if (isControlled && setControlledOpen) {
      setControlledOpen(val);
    } else {
      setInternalOpen(val);
    }
  };

  const defaultInstructor = instructors.length > 0 ? instructors[0]!.id : '';

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    if (cohortId) {
      formData.set('cohort_id', cohortId);
    }

    const title = (formData.get('title') as string)?.trim();
    if (!title) {
      toast.error('El título de la materia es obligatorio');
      return;
    }

    startTransition(async () => {
      try {
        const result = (await createQuickCourseAction(formData)) as any;
        if (result.success && result.course) {
          toast.success(`Materia "${result.course.title}" creada exitosamente`);
          if (onCourseCreated) {
            onCourseCreated(result.course);
          }
          setOpen(false);
          form.reset();
        }
      } catch (error: any) {
        toast.error(error.message || 'Error al crear la materia');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button size="sm" variant="outline" className="gap-2 font-medium">
            <BookPlus className="h-4 w-4 text-primary" />
            Crear Materia
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <BookPlus className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Crear Nueva Materia</DialogTitle>
              <DialogDescription className="text-xs">
                Registra una nueva asignatura para programarla inmediatamente en el grupo.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-xs font-semibold">
              Título de la Materia *
            </Label>
            <Input
              id="title"
              name="title"
              placeholder="Ej. Hermenéutica Bíblica I"
              required
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="instructor_id" className="text-xs font-semibold">
              Profesor Titular *
            </Label>
            <Select name="instructor_id" defaultValue={defaultInstructor} required>
              <SelectTrigger id="instructor_id" className="h-9 text-sm">
                <SelectValue placeholder="Seleccionar profesor..." />
              </SelectTrigger>
              <SelectContent>
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
              <Label htmlFor="duration_weeks" className="text-xs font-semibold">
                Duración (Semanas) *
              </Label>
              <Input
                id="duration_weeks"
                name="duration_weeks"
                type="number"
                min={1}
                max={52}
                defaultValue={2}
                required
                className="h-9 text-sm"
              />
              <span className="text-[10px] text-muted-foreground block">
                Se usará para calcular la fecha de fin automáticamente.
              </span>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="credits" className="text-xs font-semibold">
                Créditos Académicos *
              </Label>
              <Input
                id="credits"
                name="credits"
                type="number"
                min={1}
                max={20}
                defaultValue={3}
                required
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="level" className="text-xs font-semibold">
              Nivel
            </Label>
            <Select name="level" defaultValue="all_levels">
              <SelectTrigger id="level" className="h-9 text-sm">
                <SelectValue placeholder="Nivel..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_levels">Todos los niveles</SelectItem>
                <SelectItem value="beginner">Básico / Inicial</SelectItem>
                <SelectItem value="intermediate">Intermedio</SelectItem>
                <SelectItem value="advanced">Avanzado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="short_description" className="text-xs font-semibold">
              Descripción Breve (Opcional)
            </Label>
            <Textarea
              id="short_description"
              name="short_description"
              placeholder="Resumen del contenido y objetivos de la materia..."
              rows={2}
              className="text-xs resize-none"
            />
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
            <Button type="submit" size="sm" disabled={isPending} className="gap-1.5">
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Crear Materia
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
