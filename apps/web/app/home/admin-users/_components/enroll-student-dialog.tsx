'use client';

import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Search, X, Check, BookOpen } from 'lucide-react';

import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredCourses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return courses;
    return courses.filter((c) => c.title.toLowerCase().includes(query));
  }, [courses, searchQuery]);

  const selectedCourse = useMemo(() => {
    return courses.find((c) => c.id === selectedCourseId);
  }, [courses, selectedCourseId]);

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
      setSearchQuery('');
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Ocurrió un error al inscribir al estudiante');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDialogChange = (open: boolean) => {
    onOpenChange(open);
    if (!open) {
      setSelectedCourseId('');
      setSearchQuery('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Inscribir a Materia
          </DialogTitle>
          <DialogDescription>
            Inscribe a <strong>{userName}</strong> directamente en una materia. 
            El alumno tendrá acceso inmediato al contenido.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar materia por nombre..."
              className="pl-8 pr-7 h-9 text-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                aria-label="Limpiar búsqueda"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <div className="text-xs text-muted-foreground flex justify-between px-0.5">
            <span>Materias disponibles: {filteredCourses.length} de {courses.length}</span>
            {selectedCourse && (
              <span className="text-primary font-medium">1 seleccionada</span>
            )}
          </div>

          <div className="max-h-[220px] overflow-y-auto border rounded-lg p-1 space-y-1 divide-y divide-border/40">
            {courses.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No hay materias publicadas disponibles.
              </div>
            ) : filteredCourses.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No se encontraron materias con "{searchQuery}".
              </div>
            ) : (
              filteredCourses.map((course) => {
                const isSelected = selectedCourseId === course.id;

                return (
                  <div
                    key={course.id}
                    onClick={() => setSelectedCourseId(course.id)}
                    className={`flex items-center justify-between p-2.5 rounded-md cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-primary/10 border border-primary text-primary font-medium'
                        : 'hover:bg-muted/60 text-foreground border border-transparent'
                    }`}
                  >
                    <span className="text-sm truncate">{course.title}</span>
                    <div
                      className={`h-4 w-4 rounded-full border flex items-center justify-center flex-shrink-0 ${
                        isSelected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-muted-foreground/30'
                      }`}
                    >
                      {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleDialogChange(false)}
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
