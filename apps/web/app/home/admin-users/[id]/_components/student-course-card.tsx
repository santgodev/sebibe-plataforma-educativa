'use client';

import { useState } from 'react';
import {
  Award,
  BookOpen,
  ChevronDown,
  Clock,
  FileText,
} from 'lucide-react';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { cn } from '@kit/ui/utils';
import { ViewSubmissionDialog } from './view-submission-dialog';

export interface CourseDetailItem {
  id: string;
  title: string;
  thumbnail_url?: string | null;
  short_description?: string | null;
  totalLessons: number;
  completedLessons: number;
  percentage: number;
  attempts: any[];
  averageScore: number | null;
  hasNeedsGrading: boolean;
  isEnrolled: boolean;
}

export function StudentCourseCard({
  course,
  defaultExpanded = false,
  isStudentView = false,
}: {
  course: CourseDetailItem;
  defaultExpanded?: boolean;
  isStudentView?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const hasAttempts = course.attempts && course.attempts.length > 0;
  const avgScore = course.averageScore;
  const avgGrade5 = avgScore !== null ? (avgScore / 20).toFixed(1) : null;
  const isPassingCourse = avgScore !== null && avgScore >= 70;

  return (
    <div className="bg-background rounded-xl border shadow-xs overflow-hidden transition-all hover:border-primary/40">
      {/* Cabecera Desplegable de la Asignatura */}
      <div
        onClick={() => setIsExpanded((prev) => !prev)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded((prev) => !prev);
          }
        }}
        className={cn(
          'p-4 sm:p-6 bg-muted/20 cursor-pointer select-none transition-colors hover:bg-muted/35 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4',
          isExpanded && 'border-b bg-muted/30'
        )}
      >
        {/* Lado izquierdo: Portada e información de la materia */}
        <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
          {course.thumbnail_url ? (
            <img
              src={course.thumbnail_url}
              alt={course.title}
              className="w-16 h-14 sm:w-24 sm:h-20 object-cover rounded-lg border shadow-xs shrink-0"
            />
          ) : (
            <div className="w-16 h-14 sm:w-24 sm:h-20 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-center shrink-0">
              <BookOpen className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
            </div>
          )}

          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <h3 className="font-bold text-base sm:text-xl text-foreground leading-snug">
                {course.title}
              </h3>
              {course.hasNeedsGrading && (
                <Badge
                  variant="outline"
                  className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 font-bold text-[10px] sm:text-[11px] gap-1 shrink-0"
                >
                  <Clock className="w-3 h-3" /> {isStudentView ? 'Entrega en revisión' : 'Revisión pendiente'}
                </Badge>
              )}
            </div>

            {course.short_description && (
              <p className="text-xs text-muted-foreground line-clamp-1 max-w-xl">
                {course.short_description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-0.5 text-xs text-muted-foreground">
              <span>
                <strong>{course.completedLessons}</strong> de {course.totalLessons} lecciones
              </span>
              <span>•</span>
              <span className="font-semibold text-primary">{course.percentage}% avance</span>
            </div>

            {/* Barra de progreso de lecciones */}
            <div className="w-full sm:w-52 max-w-[200px] bg-muted rounded-full h-1.5 overflow-hidden mt-1">
              <div
                className="bg-primary h-1.5 rounded-full transition-all"
                style={{ width: `${course.percentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Lado derecho: Calificación de la materia y botón de despliegue */}
        <div className="flex items-center justify-between md:justify-end gap-3 sm:gap-4 border-t md:border-t-0 pt-3 md:pt-0 shrink-0 w-full md:w-auto">
          <div className="text-left md:text-right">
            <span className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Nota de la Materia
            </span>
            {avgGrade5 !== null ? (
              <div className="flex items-center md:justify-end gap-2 mt-0.5">
                <span className="text-xl sm:text-2xl font-black text-foreground">
                  {avgGrade5}
                  <span className="text-xs font-normal text-muted-foreground"> / 5.0</span>
                </span>
                <Badge
                  className={`text-[10px] font-bold ${
                    isPassingCourse
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300'
                      : 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/50 dark:text-red-300'
                  }`}
                >
                  {isPassingCourse ? 'Aprobando' : 'Reprobando'}
                </Badge>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground italic">Sin calificaciones aún</span>
            )}
          </div>

          {/* Botón visual de expandir/colapsar */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs font-semibold h-9 px-3 bg-background hover:bg-muted text-foreground border shadow-2xs whitespace-nowrap"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded((prev) => !prev);
              }}
            >
              <span>{isExpanded ? 'Ocultar notas' : 'Ver notas'}</span>
              <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-bold">
                {course.attempts.length}
              </Badge>
              <ChevronDown
                className={cn(
                  'w-4 h-4 text-muted-foreground transition-transform duration-200',
                  isExpanded && 'rotate-180 text-primary'
                )}
              />
            </Button>
          </div>
        </div>
      </div>

      {/* Contenido Desplegable: Notas y Evaluaciones de la Asignatura */}
      {isExpanded && (
        <div className="p-5 sm:p-6 space-y-4 bg-background animate-in fade-in-50 duration-200">
          <div className="flex items-center justify-between pb-2 border-b">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-primary" />
              <h4 className="font-bold text-xs uppercase tracking-wider text-foreground">
                Evaluaciones y Notas Realizadas
              </h4>
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              {course.attempts.length}{' '}
              {course.attempts.length === 1 ? 'evaluación registrada' : 'evaluaciones registradas'}
            </span>
          </div>

          {!hasAttempts ? (
            <div className="text-center p-8 bg-muted/10 rounded-lg border border-dashed text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
              <FileText className="w-7 h-7 text-muted-foreground/40" />
              <p className="font-semibold text-sm text-foreground">Sin evaluaciones registradas</p>
              <p className="max-w-md">
                El estudiante aún no ha presentado cuestionarios ni actividades en esta asignatura.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {course.attempts.map((attempt: any) => {
                const activity = attempt.activities as any;
                const passingScore = activity?.passing_score || 70;
                const isNeedsGrading = attempt.status === 'needs_grading';
                const passed = (attempt.score || 0) >= passingScore;
                const grade5 = ((attempt.score || 0) / 20).toFixed(1);
                const lessonTitle = activity?.lessons?.title;
                const moduleTitle = activity?.lessons?.course_modules?.title;

                const borderLeftColor = isNeedsGrading
                  ? '#f59e0b'
                  : passed
                  ? '#10b981'
                  : '#ef4444';

                return (
                  <div
                    key={attempt.id}
                    className="border border-l-4 rounded-xl p-3.5 sm:p-4 bg-muted/10 transition-all hover:bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 shadow-2xs"
                    style={{ borderLeftColor }}
                  >
                    {/* De qué es esa nota */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <h5 className="font-bold text-sm sm:text-base text-foreground leading-tight">
                          {activity?.title || 'Evaluación'}
                        </h5>
                        <Badge variant="outline" className="text-[10px] font-mono font-bold">
                          Intento #{attempt.attempt_number || 1}
                        </Badge>
                        {isNeedsGrading && (
                          <Badge
                            variant="outline"
                            className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 text-[10px] font-bold gap-1"
                          >
                            <Clock className="w-3 h-3 animate-pulse" /> {isStudentView ? 'En revisión' : 'Por calificar'}
                          </Badge>
                        )}
                      </div>

                      {/* Información de la Lección / De qué es la nota */}
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-muted-foreground">
                        {lessonTitle && (
                          <span className="flex items-center gap-1 font-medium text-foreground">
                            <BookOpen className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span>
                              Lección: <strong>{lessonTitle}</strong>
                            </span>
                          </span>
                        )}
                        {moduleTitle && (
                          <span className="text-muted-foreground hidden md:inline">
                            • {moduleTitle}
                          </span>
                        )}
                        <span className="text-muted-foreground">
                          • Entregado el{' '}
                          {new Date(attempt.completed_at || '').toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Cuadro de la Nota y Botón para Calificar / Ver Entrega */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0 border-t sm:border-t-0 pt-2.5 sm:pt-0 w-full sm:w-auto">
                      <div className="text-left sm:text-right">
                        {isNeedsGrading ? (
                          <div>
                            <span className="text-sm sm:text-base font-bold text-amber-700 dark:text-amber-400 block">
                              {isStudentView ? 'En revisión' : 'Por calificar'}
                            </span>
                            <span className="text-[9px] sm:text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                              {isStudentView ? 'Pendiente' : 'Revisión manual'}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-baseline gap-1 sm:justify-end">
                              <span
                                className={`text-xl sm:text-2xl font-black ${
                                  passed
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-red-600 dark:text-red-400'
                                }`}
                              >
                                {grade5}
                              </span>
                              <span className="text-xs text-muted-foreground font-semibold">
                                / 5.0
                              </span>
                            </div>
                            <span
                              className={`text-[9px] sm:text-[10px] uppercase font-bold tracking-wider block ${
                                passed
                                  ? 'text-emerald-700 dark:text-emerald-400'
                                  : 'text-red-700 dark:text-red-400'
                              }`}
                            >
                              {passed ? 'Aprobado' : 'Reprobado'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Diálogo para ver respuestas */}
                      <ViewSubmissionDialog
                        attempt={attempt as any}
                        isReadOnly={isStudentView}
                        trigger={
                          <Button
                            size="sm"
                            variant="outline"
                            className="font-semibold text-xs gap-1.5 border text-foreground bg-background hover:bg-muted shadow-2xs whitespace-nowrap h-9 px-3"
                          >
                            <FileText className="w-3.5 h-3.5 text-primary" />
                            <span>{isStudentView ? 'Ver mi Entrega' : 'Ver Entrega y Calificar'}</span>
                          </Button>
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
