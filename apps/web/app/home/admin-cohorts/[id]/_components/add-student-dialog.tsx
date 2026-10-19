'use client';

import { useState, useTransition, useMemo } from 'react';
import { Plus, Search, X, Check, User, Filter, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import { Badge } from '@kit/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@kit/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';

import { addStudentToCohortAction } from '~/lib/lms/server/actions/cohorts.actions';

export interface StudentOption {
  id: string;
  name: string;
  email: string | null;
  modality?: string | null;
  document_id?: string | null;
  semester?: string | null;
}

export function AddStudentDialog({
  cohortId,
  availableStudents,
}: {
  cohortId: string;
  availableStudents: StudentOption[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState('');
  const [semesterFilter, setSemesterFilter] = useState<string>('all');
  const [modalityFilter, setModalityFilter] = useState<'all' | 'presencial' | 'virtual'>('all');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  // Available semesters
  const availableSemesters = useMemo(() => {
    return Array.from(
      new Set(availableStudents.map((s) => s.semester).filter((sem): sem is string => !!sem))
    ).sort().reverse();
  }, [availableStudents]);

  // Check if any student has modality information
  const hasModalityData = useMemo(() => {
    return availableStudents.some((s) => s.modality);
  }, [availableStudents]);

  // Filter students by search query, semester and modality
  const filteredStudents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return availableStudents.filter((student) => {
      // Semester filter
      if (semesterFilter !== 'all' && student.semester !== semesterFilter) {
        return false;
      }

      // Modality filter
      if (modalityFilter !== 'all' && student.modality !== modalityFilter) {
        return false;
      }

      // Search query filter
      if (query) {
        const nameMatch = student.name?.toLowerCase().includes(query) ?? false;
        const emailMatch = student.email?.toLowerCase().includes(query) ?? false;
        const docMatch = student.document_id?.toLowerCase().includes(query) ?? false;
        if (!nameMatch && !emailMatch && !docMatch) {
          return false;
        }
      }

      return true;
    });
  }, [availableStudents, searchQuery, semesterFilter, modalityFilter]);

  const selectedStudent = useMemo(() => {
    return availableStudents.find((s) => s.id === selectedStudentId);
  }, [availableStudents, selectedStudentId]);

  function handleReset() {
    setSearchQuery('');
    setSemesterFilter('all');
    setModalityFilter('all');
    setSelectedStudentId('');
  }

  function handleOpenChange(newOpen: boolean) {
    setOpen(newOpen);
    if (!newOpen) {
      handleReset();
    }
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedStudentId) {
      toast.error('Debes seleccionar un estudiante de la lista');
      return;
    }

    const formData = new FormData();
    formData.append('cohort_id', cohortId);
    formData.append('student_id', selectedStudentId);

    startTransition(async () => {
      try {
        await addStudentToCohortAction(formData);
        toast.success(`Estudiante ${selectedStudent?.name || ''} matriculado exitosamente`);
        handleOpenChange(false);
      } catch (error: any) {
        toast.error(error.message || 'Error al matricular estudiante');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2 shadow-sm">
          <Plus className="h-4 w-4" />
          Añadir Estudiante
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <GraduationCap className="h-5 w-5 text-primary" />
            Añadir Estudiante al Grupo
          </DialogTitle>
          <DialogDescription>
            Busca y filtra estudiantes no matriculados por semestre, modalidad o nombre para integrarlos al grupo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex-1 flex flex-col min-h-0 space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre, correo o cédula..."
                className="pl-9 pr-8 h-9 text-sm"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Semester Filter */}
            <div className="w-full sm:w-[150px]">
              <Select
                value={semesterFilter}
                onValueChange={(val: any) => setSemesterFilter(val)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <GraduationCap className="h-3 w-3 mr-1 text-muted-foreground" />
                  <SelectValue placeholder="Semestre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los semestres</SelectItem>
                  {availableSemesters.map((sem) => (
                    <SelectItem key={sem} value={sem}>
                      {sem}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {hasModalityData && (
              <div className="w-full sm:w-[130px]">
                <Select
                  value={modalityFilter}
                  onValueChange={(val: any) => setModalityFilter(val)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <Filter className="h-3 w-3 mr-1 text-muted-foreground" />
                    <SelectValue placeholder="Modalidad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="presencial">Presencial</SelectItem>
                    <SelectItem value="virtual">Virtual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>


          {/* Status Indicator */}
          <div className="flex items-center justify-between text-xs text-muted-foreground px-0.5">
            <span>
              Disponibles: <strong className="text-foreground">{filteredStudents.length}</strong> de {availableStudents.length}
            </span>
            {selectedStudent && (
              <span className="text-primary font-medium flex items-center gap-1">
                <Check className="h-3.5 w-3.5" /> 1 seleccionado
              </span>
            )}
          </div>

          {/* Student List (Scrollable) */}
          <div className="flex-1 overflow-y-auto border rounded-lg p-2 min-h-[220px] max-h-[280px] space-y-1.5 divide-y divide-border/40">
            {availableStudents.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
                <User className="h-8 w-8 mb-2 opacity-40" />
                <p className="font-medium text-sm">No hay estudiantes disponibles</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Todos los estudiantes registrados ya están matriculados en este grupo.
                </p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
                <Search className="h-7 w-7 mb-2 opacity-40" />
                <p className="font-medium text-sm">Sin coincidencias</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Ningún estudiante coincide con "{searchQuery}".
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setModalityFilter('all');
                  }}
                  className="mt-2 text-xs"
                >
                  Limpiar filtros
                </Button>
              </div>
            ) : (
              filteredStudents.map((student) => {
                const isSelected = selectedStudentId === student.id;

                return (
                  <div
                    key={student.id}
                    onClick={() => setSelectedStudentId(student.id)}
                    className={`flex items-center justify-between p-2.5 rounded-md cursor-pointer transition-all border ${
                      isSelected
                        ? 'border-primary bg-primary/10 shadow-sm'
                        : 'border-transparent hover:bg-muted/60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs uppercase flex-shrink-0 ${
                          isSelected
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {isSelected ? (
                          <Check className="h-4 w-4" />
                        ) : student.name ? (
                          student.name.slice(0, 2)
                        ) : (
                          <User className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-semibold text-sm truncate text-foreground">
                            {student.name || 'Sin Nombre'}
                          </p>
                          {student.semester && (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-medium py-0 px-1.5 bg-background"
                            >
                              {student.semester}
                            </Badge>
                          )}
                          {student.modality && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] uppercase tracking-wider py-0 px-1.5"
                            >
                              {student.modality}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {student.email || 'Sin correo'}
                          {student.document_id ? ` • Doc: ${student.document_id}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="ml-2 flex-shrink-0">
                      <div
                        className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-muted-foreground/30'
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Selected Student Card */}
          {selectedStudent && (
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 truncate">
                <span className="font-semibold text-primary">Seleccionado:</span>
                <span className="truncate text-foreground font-medium">{selectedStudent.name}</span>
                <span className="text-muted-foreground truncate hidden sm:inline">({selectedStudent.email})</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedStudentId('')}
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                Cambiar
              </Button>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isPending || !selectedStudentId}
              className="gap-1.5"
            >
              {isPending ? 'Matriculando...' : 'Matricular Estudiante'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
