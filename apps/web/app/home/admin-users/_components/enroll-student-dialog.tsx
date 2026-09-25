'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';

import { enrollStudentAction } from '../_lib/server/admin-actions';

interface Course {
  id: string;
  title: string;
}

interface EnrollStudentDialogProps {
  userId: string;
  userName: string;
  courses: Course[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EnrollStudentDialog({
  userId,
  userName,
  courses,
  isOpen,
  onOpenChange,
}: EnrollStudentDialogProps) {
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEnroll = async () => {
    if (!selectedCourseId) {
      toast.error('Por favor selecciona una materia');
      return;
    }

    try {
      setIsSubmitting(true);
      await enrollStudentAction(userId, selectedCourseId);
      toast.success('Estudiante inscrito exitosamente');
      onOpenChange(false);
      setSelectedCourseId('');
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Ocurrió un error al inscribir al estudiante');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inscribir a Materia</DialogTitle>
          <DialogDescription>
            Inscribe a <strong>{userName}</strong> directamente en una materia. 
            El alumno tendrá acceso inmediato al contenido.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-3 block">
            Selecciona la materia
          </label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            disabled={isSubmitting}
          >
            <option value="" disabled>Seleccionar una materia...</option>
            {courses.map(course => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button onClick={handleEnroll} disabled={isSubmitting || !selectedCourseId}>
            {isSubmitting ? 'Inscribiendo...' : 'Inscribir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
