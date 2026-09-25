'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@kit/ui/button';
import { Checkbox } from '@kit/ui/checkbox';
import { syncCourseEnrollments } from '../../_lib/server/course-actions';

interface Student {
  id: string;
  name: string;
  email: string;
}

interface CourseEnrollmentsFormProps {
  courseId: string;
  students: Student[];
  initialEnrolledIds: string[];
}

export function CourseEnrollmentsForm({ courseId, students, initialEnrolledIds }: CourseEnrollmentsFormProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialEnrolledIds));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleStudent = (studentId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedIds(newSelected);
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await syncCourseEnrollments(courseId, Array.from(selectedIds));
      toast.success('Inscripciones guardadas correctamente');
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Ocurrió un error al guardar inscripciones');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const enrolledStudents = students.filter(s => selectedIds.has(s.id));
  const unenrolledStudents = students.filter(s => !selectedIds.has(s.id));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-medium">Alumnos del Sistema</h3>
          <p className="text-sm text-muted-foreground">Selecciona los alumnos que tendrán acceso a esta materia.</p>
        </div>
        <Button onClick={handleSave} disabled={isSubmitting}>
          {isSubmitting ? 'Guardando...' : 'Guardar Inscripciones'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* No Inscritos */}
        <div className="border rounded-md overflow-hidden bg-background flex flex-col h-[500px]">
          <div className="bg-muted px-4 py-3 font-medium flex justify-between items-center border-b">
            <span>Alumnos Disponibles</span>
            <span className="text-xs bg-background border px-2 py-1 rounded-full">{unenrolledStudents.length}</span>
          </div>
          <div className="overflow-y-auto flex-1 divide-y">
            {unenrolledStudents.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No hay alumnos disponibles.</div>
            ) : (
              unenrolledStudents.map(student => (
                <div 
                  key={student.id} 
                  className="flex items-center p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => toggleStudent(student.id)}
                >
                  <Checkbox 
                    checked={false}
                    onCheckedChange={() => toggleStudent(student.id)}
                    className="mr-3"
                  />
                  <div>
                    <p className="font-medium text-sm leading-tight">{student.name || 'Sin Nombre'}</p>
                    <p className="text-xs text-muted-foreground">{student.email}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Inscritos */}
        <div className="border rounded-md overflow-hidden bg-background flex flex-col h-[500px] border-primary/20">
          <div className="bg-primary/5 px-4 py-3 font-medium flex justify-between items-center border-b border-primary/10 text-primary">
            <span>Alumnos Inscritos</span>
            <span className="text-xs bg-primary/10 border border-primary/20 px-2 py-1 rounded-full">{enrolledStudents.length}</span>
          </div>
          <div className="overflow-y-auto flex-1 divide-y">
            {enrolledStudents.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Nadie está inscrito aún en esta materia.</div>
            ) : (
              enrolledStudents.map(student => (
                <div 
                  key={student.id} 
                  className="flex items-center p-3 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer"
                  onClick={() => toggleStudent(student.id)}
                >
                  <Checkbox 
                    checked={true}
                    onCheckedChange={() => toggleStudent(student.id)}
                    className="mr-3"
                  />
                  <div>
                    <p className="font-medium text-sm leading-tight">{student.name || 'Sin Nombre'}</p>
                    <p className="text-xs text-muted-foreground">{student.email}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
