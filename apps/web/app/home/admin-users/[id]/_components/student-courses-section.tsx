'use client';

import { useState } from 'react';
import { BookOpen, ChevronsUpDown } from 'lucide-react';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { CourseDetailItem, StudentCourseCard } from './student-course-card';

export function StudentCoursesSection({
  courses,
  isStudentView = false,
}: {
  courses: CourseDetailItem[];
  isStudentView?: boolean;
}) {
  // Key to force re-render when expanding/collapsing all
  const [expandAllSignal, setExpandAllSignal] = useState<boolean | null>(null);
  const [toggleKey, setToggleKey] = useState<number>(0);

  const handleExpandAll = (expand: boolean) => {
    setExpandAllSignal(expand);
    setToggleKey((prev) => prev + 1);
  };

  return (
    <div className="space-y-4">
      {/* Encabezado de la Sección de Asignaturas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-2.5">
          <BookOpen className="h-6 w-6 text-primary shrink-0 mt-0.5 sm:mt-0" />
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-foreground leading-tight">
              Asignaturas y Calificaciones
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {isStudentView
                ? 'Haz clic en cualquier materia para desplegar y ver tus notas y evaluaciones.'
                : 'Haz clic en cualquier materia para desplegar y ver las notas y detalles de sus evaluaciones.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 shrink-0">
          {courses.length > 0 && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground h-7 sm:h-8 px-2 gap-1 font-medium"
                onClick={() => handleExpandAll(true)}
              >
                <ChevronsUpDown className="w-3.5 h-3.5" />
                <span>Expandir todas</span>
              </Button>
              <span className="text-muted-foreground/30">•</span>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground h-7 sm:h-8 px-2 font-medium"
                onClick={() => handleExpandAll(false)}
              >
                <span>Colapsar todas</span>
              </Button>
            </div>
          )}

          <Badge variant="outline" className="font-semibold text-xs whitespace-nowrap">
            {courses.length} {courses.length === 1 ? 'materia' : 'materias'}
          </Badge>
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="text-center p-8 sm:p-12 bg-background rounded-xl border border-dashed shadow-xs">
          <BookOpen className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-base sm:text-lg font-bold text-foreground mb-1">
            {isStudentView ? 'Sin asignaturas registradas' : 'Sin asignaturas registradas'}
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
            {isStudentView
              ? 'Aún no tienes materias asignadas ni has registrado intentos de evaluación.'
              : 'El estudiante aún no tiene materias asignadas ni ha registrado intentos de evaluación.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4" key={toggleKey}>
          {courses.map((course) => {
            // Default to expanded if explicitly triggered or if has pending reviews or if it's the only course
            const defaultExpanded =
              expandAllSignal !== null
                ? expandAllSignal
                : course.hasNeedsGrading || courses.length === 1;

            return (
              <StudentCourseCard
                key={`${course.id}-${toggleKey}`}
                course={course}
                defaultExpanded={defaultExpanded}
                isStudentView={isStudentView}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
