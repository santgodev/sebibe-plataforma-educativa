'use client';

import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Search, X, CheckSquare, Square, User, Check, Users, GraduationCap } from 'lucide-react';

import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import { Badge } from '@kit/ui/badge';
import { Checkbox } from '@kit/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { syncCourseEnrollments } from '../../_lib/server/course-actions';

interface Student {
  id: string;
  name: string;
  email: string;
  semester?: string | null;
  modality?: string | null;
}

interface CourseEnrollmentsFormProps {
  courseId: string;
  students: Student[];
  initialEnrolledIds: string[];
}

export function CourseEnrollmentsForm({
  courseId,
  students,
  initialEnrolledIds,
}: CourseEnrollmentsFormProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialEnrolledIds));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchAvailable, setSearchAvailable] = useState('');
  const [semesterAvailableFilter, setSemesterAvailableFilter] = useState<string>('all');
  const [searchEnrolled, setSearchEnrolled] = useState('');
  const [semesterEnrolledFilter, setSemesterEnrolledFilter] = useState<string>('all');

  // Available semesters
  const availableSemesters = useMemo(() => {
    return Array.from(
      new Set(students.map((s) => s.semester).filter((sem): sem is string => !!sem))
    ).sort().reverse();
  }, [students]);

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

  const enrolledStudents = useMemo(() => {
    return students.filter((s) => selectedIds.has(s.id));
  }, [students, selectedIds]);

  const unenrolledStudents = useMemo(() => {
    return students.filter((s) => !selectedIds.has(s.id));
  }, [students, selectedIds]);

  const filteredUnenrolled = useMemo(() => {
    const query = searchAvailable.trim().toLowerCase();

    return unenrolledStudents.filter((s) => {
      // Semester filter
      if (semesterAvailableFilter !== 'all' && s.semester !== semesterAvailableFilter) {
        return false;
      }

      // Search filter
      if (query) {
        const nameMatch = s.name?.toLowerCase().includes(query) ?? false;
        const emailMatch = s.email?.toLowerCase().includes(query) ?? false;
        if (!nameMatch && !emailMatch) {
          return false;
        }
      }

      return true;
    });
  }, [unenrolledStudents, searchAvailable, semesterAvailableFilter]);

  const filteredEnrolled = useMemo(() => {
    const query = searchEnrolled.trim().toLowerCase();

    return enrolledStudents.filter((s) => {
      // Semester filter
      if (semesterEnrolledFilter !== 'all' && s.semester !== semesterEnrolledFilter) {
        return false;
      }

      // Search filter
      if (query) {
        const nameMatch = s.name?.toLowerCase().includes(query) ?? false;
        const emailMatch = s.email?.toLowerCase().includes(query) ?? false;
        if (!nameMatch && !emailMatch) {
          return false;
        }
      }

      return true;
    });
  }, [enrolledStudents, searchEnrolled, semesterEnrolledFilter]);

  const selectAllFilteredUnenrolled = () => {
    const newSelected = new Set(selectedIds);
    filteredUnenrolled.forEach((s) => newSelected.add(s.id));
    setSelectedIds(newSelected);
    toast.success(`${filteredUnenrolled.length} alumnos añadidos`);
  };

  const unselectAllFilteredEnrolled = () => {
    const newSelected = new Set(selectedIds);
    filteredEnrolled.forEach((s) => newSelected.delete(s.id));
    setSelectedIds(newSelected);
    toast.info(`${filteredEnrolled.length} alumnos removidos`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-card p-4 rounded-xl border shadow-sm">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Gestión de Alumnos en la Materia
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Selecciona los estudiantes que tendrán acceso a esta materia. Total inscritos:{' '}
            <strong className="text-primary">{enrolledStudents.length}</strong> de {students.length}
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSubmitting} className="self-end sm:self-auto gap-2">
          {isSubmitting ? 'Guardando cambios...' : 'Guardar Inscripciones'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* No Inscritos (Disponibles) */}
        <div className="border rounded-xl overflow-hidden bg-background flex flex-col h-[580px] shadow-sm">
          {/* Header */}
          <div className="bg-muted/70 px-4 py-3 border-b flex justify-between items-center">
            <div>
              <span className="font-semibold text-sm text-foreground">Alumnos Disponibles</span>
              <p className="text-xs text-muted-foreground">Listos para inscribir</p>
            </div>
            <span className="text-xs bg-background border font-semibold px-2.5 py-1 rounded-full text-foreground">
              {unenrolledStudents.length}
            </span>
          </div>

          {/* Search Bar, Semester Filter & Bulk Actions */}
          <div className="p-3 border-b bg-card space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  value={searchAvailable}
                  onChange={(e) => setSearchAvailable(e.target.value)}
                  placeholder="Buscar por nombre o correo..."
                  className="pl-8 pr-7 h-8 text-xs"
                />
                {searchAvailable && (
                  <button
                    type="button"
                    onClick={() => setSearchAvailable('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                    aria-label="Limpiar búsqueda"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {availableSemesters.length > 0 && (
                <div className="w-[125px]">
                  <Select
                    value={semesterAvailableFilter}
                    onValueChange={(val: any) => setSemesterAvailableFilter(val)}
                  >
                    <SelectTrigger className="h-8 text-[11px] px-2">
                      <GraduationCap className="h-3 w-3 mr-1 text-muted-foreground" />
                      <SelectValue placeholder="Semestre" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {availableSemesters.map((sem) => (
                        <SelectItem key={sem} value={sem}>
                          {sem}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground px-0.5">
              <span>
                Mostrando: <strong>{filteredUnenrolled.length}</strong> de {unenrolledStudents.length}
              </span>
              {filteredUnenrolled.length > 0 && (
                <button
                  type="button"
                  onClick={selectAllFilteredUnenrolled}
                  className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
                >
                  <CheckSquare className="h-3 w-3" />
                  Inscribir {filteredUnenrolled.length === unenrolledStudents.length ? 'todos' : 'visibles'}
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1 divide-y divide-border/50 p-1">
            {unenrolledStudents.length === 0 ? (
              <div className="p-12 text-center text-sm text-muted-foreground flex flex-col items-center justify-center h-full">
                <Check className="h-8 w-8 text-green-500 mb-2 opacity-80" />
                <p className="font-medium text-foreground">Todos están inscritos</p>
                <p className="text-xs mt-1">No quedan más estudiantes disponibles para inscribir.</p>
              </div>
            ) : filteredUnenrolled.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground flex flex-col items-center justify-center h-full">
                <Search className="h-7 w-7 text-muted-foreground/40 mb-2" />
                <p className="font-medium text-foreground text-xs">Sin coincidencias</p>
                <p className="text-xs mt-1">Ningún alumno disponible coincide con los filtros.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchAvailable('');
                    setSemesterAvailableFilter('all');
                  }}
                  className="text-xs text-primary underline mt-2"
                >
                  Limpiar filtros
                </button>
              </div>
            ) : (
              filteredUnenrolled.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center p-3 hover:bg-muted/60 transition-colors cursor-pointer rounded-lg mx-1"
                  onClick={() => toggleStudent(student.id)}
                >
                  <Checkbox
                    checked={false}
                    onCheckedChange={() => toggleStudent(student.id)}
                    className="mr-3"
                  />
                  <div className="h-7 w-7 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-bold text-[10px] uppercase flex-shrink-0 mr-2.5">
                    {student.name ? student.name.slice(0, 2) : <User className="h-3 w-3" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-medium text-sm leading-tight text-foreground truncate">
                        {student.name || 'Sin Nombre'}
                      </p>
                      {student.semester && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 font-medium">
                          {student.semester}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Inscritos */}
        <div className="border border-primary/20 rounded-xl overflow-hidden bg-background flex flex-col h-[580px] shadow-sm">
          {/* Header */}
          <div className="bg-primary/5 px-4 py-3 border-b border-primary/10 flex justify-between items-center text-primary">
            <div>
              <span className="font-semibold text-sm">Alumnos Inscritos</span>
              <p className="text-xs text-primary/70">Tienen acceso al curso</p>
            </div>
            <span className="text-xs bg-primary/10 border border-primary/20 font-semibold px-2.5 py-1 rounded-full text-primary">
              {enrolledStudents.length}
            </span>
          </div>

          {/* Search Bar, Semester Filter & Bulk Actions */}
          <div className="p-3 border-b bg-card space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  value={searchEnrolled}
                  onChange={(e) => setSearchEnrolled(e.target.value)}
                  placeholder="Buscar alumnos inscritos..."
                  className="pl-8 pr-7 h-8 text-xs"
                />
                {searchEnrolled && (
                  <button
                    type="button"
                    onClick={() => setSearchEnrolled('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                    aria-label="Limpiar búsqueda"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {availableSemesters.length > 0 && (
                <div className="w-[125px]">
                  <Select
                    value={semesterEnrolledFilter}
                    onValueChange={(val: any) => setSemesterEnrolledFilter(val)}
                  >
                    <SelectTrigger className="h-8 text-[11px] px-2">
                      <GraduationCap className="h-3 w-3 mr-1 text-muted-foreground" />
                      <SelectValue placeholder="Semestre" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {availableSemesters.map((sem) => (
                        <SelectItem key={sem} value={sem}>
                          {sem}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground px-0.5">
              <span>
                Mostrando: <strong>{filteredEnrolled.length}</strong> de {enrolledStudents.length}
              </span>
              {filteredEnrolled.length > 0 && (
                <button
                  type="button"
                  onClick={unselectAllFilteredEnrolled}
                  className="text-xs text-red-600 dark:text-red-400 font-medium hover:underline flex items-center gap-1"
                >
                  <Square className="h-3 w-3" />
                  Quitar {filteredEnrolled.length === enrolledStudents.length ? 'todos' : 'visibles'}
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1 divide-y divide-border/50 p-1">
            {enrolledStudents.length === 0 ? (
              <div className="p-12 text-center text-sm text-muted-foreground flex flex-col items-center justify-center h-full">
                <Users className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="font-medium text-foreground">Nadie inscrito aún</p>
                <p className="text-xs mt-1">
                  Selecciona alumnos en la columna izquierda para inscribirlos en esta materia.
                </p>
              </div>
            ) : filteredEnrolled.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground flex flex-col items-center justify-center h-full">
                <Search className="h-7 w-7 text-muted-foreground/40 mb-2" />
                <p className="font-medium text-foreground text-xs">Sin coincidencias</p>
                <p className="text-xs mt-1">Ningún alumno inscrito coincide con los filtros.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchEnrolled('');
                    setSemesterEnrolledFilter('all');
                  }}
                  className="text-xs text-primary underline mt-2"
                >
                  Limpiar filtros
                </button>
              </div>
            ) : (
              filteredEnrolled.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center p-3 bg-primary/[0.03] hover:bg-primary/[0.08] transition-colors cursor-pointer rounded-lg mx-1"
                  onClick={() => toggleStudent(student.id)}
                >
                  <Checkbox
                    checked={true}
                    onCheckedChange={() => toggleStudent(student.id)}
                    className="mr-3"
                  />
                  <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] uppercase flex-shrink-0 mr-2.5">
                    {student.name ? student.name.slice(0, 2) : <User className="h-3 w-3" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-medium text-sm leading-tight text-foreground truncate">
                        {student.name || 'Sin Nombre'}
                      </p>
                      {student.semester && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 font-medium bg-background">
                          {student.semester}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{student.email}</p>
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
