'use client';

import { useState, useMemo } from 'react';
import { Search, X, Filter, ArrowUpDown, User, GraduationCap } from 'lucide-react';
import { Input } from '@kit/ui/input';
import { Button } from '@kit/ui/button';
import { Badge } from '@kit/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { StudentAttemptDialog } from './student-attempt-dialog';

interface Student {
  id: string;
  name: string;
  email: string | null;
  semester?: string | null;
  modality?: string | null;
}

interface CourseGradesTableProps {
  enrolledStudents: Student[];
  activities: any[];
  studentBestAttemptsRecord: Record<string, Record<string, any>>;
}

export function CourseGradesTable({
  enrolledStudents,
  activities,
  studentBestAttemptsRecord,
}: CourseGradesTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [semesterFilter, setSemesterFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'has_attempts' | 'no_attempts' | 'needs_grading'>('all');
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'attempts_desc' | 'attempts_asc'>('name_asc');

  // Available semesters
  const availableSemesters = useMemo(() => {
    return Array.from(
      new Set(enrolledStudents.map((s) => s.semester).filter((sem): sem is string => !!sem))
    ).sort().reverse();
  }, [enrolledStudents]);

  // Compute stats per student
  const studentStats = useMemo(() => {
    const stats = new Map<string, { attemptsCount: number; hasNeedsGrading: boolean }>();
    enrolledStudents.forEach((student) => {
      const studentMap = studentBestAttemptsRecord[student.id] || {};
      let attemptsCount = 0;
      let hasNeedsGrading = false;

      activities.forEach((activity) => {
        const attempt = studentMap[activity.id];
        if (attempt) {
          attemptsCount++;
          if (attempt.status === 'needs_grading') {
            hasNeedsGrading = true;
          }
        }
      });

      stats.set(student.id, { attemptsCount, hasNeedsGrading });
    });
    return stats;
  }, [enrolledStudents, studentBestAttemptsRecord, activities]);

  const filteredStudents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return enrolledStudents
      .filter((student) => {
        // Search filter
        if (query) {
          const nameMatch = student.name?.toLowerCase().includes(query) ?? false;
          const emailMatch = student.email?.toLowerCase().includes(query) ?? false;
          if (!nameMatch && !emailMatch) {
            return false;
          }
        }

        // Semester filter
        if (semesterFilter !== 'all' && student.semester !== semesterFilter) {
          return false;
        }

        const stat = studentStats.get(student.id) || { attemptsCount: 0, hasNeedsGrading: false };

        // Status filter
        if (statusFilter === 'has_attempts' && stat.attemptsCount === 0) return false;
        if (statusFilter === 'no_attempts' && stat.attemptsCount > 0) return false;
        if (statusFilter === 'needs_grading' && !stat.hasNeedsGrading) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name_asc') {
          return (a.name || '').localeCompare(b.name || '');
        }
        if (sortBy === 'name_desc') {
          return (b.name || '').localeCompare(a.name || '');
        }
        const statA = studentStats.get(a.id)?.attemptsCount || 0;
        const statB = studentStats.get(b.id)?.attemptsCount || 0;
        if (sortBy === 'attempts_desc') {
          return statB - statA;
        }
        if (sortBy === 'attempts_asc') {
          return statA - statB;
        }
        return 0;
      });
  }, [enrolledStudents, searchQuery, semesterFilter, statusFilter, sortBy, studentStats]);

  const hasActiveFilters = searchQuery !== '' || semesterFilter !== 'all' || statusFilter !== 'all' || sortBy !== 'name_asc';

  const resetFilters = () => {
    setSearchQuery('');
    setSemesterFilter('all');
    setStatusFilter('all');
    setSortBy('name_asc');
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between bg-card p-4 rounded-xl border shadow-sm">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar alumno por nombre o correo..."
            className="pl-9 pr-8 h-10 w-full"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap sm:flex-nowrap gap-2 items-center">
          {/* Semester Filter */}
          <div className="w-full sm:w-[170px]">
            <Select
              value={semesterFilter}
              onValueChange={(val: any) => setSemesterFilter(val)}
            >
              <SelectTrigger className="h-10">
                <GraduationCap className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
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

          {/* Status Filter */}
          <div className="w-full sm:w-[190px]">
            <Select
              value={statusFilter}
              onValueChange={(val: any) => setStatusFilter(val)}
            >
              <SelectTrigger className="h-10">
                <Filter className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Evaluaciones" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los alumnos</SelectItem>
                <SelectItem value="has_attempts">Con evaluaciones</SelectItem>
                <SelectItem value="no_attempts">Sin evaluaciones</SelectItem>
                <SelectItem value="needs_grading">Por calificar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort By */}
          <div className="w-full sm:w-[160px]">
            <Select
              value={sortBy}
              onValueChange={(val: any) => setSortBy(val)}
            >
              <SelectTrigger className="h-10">
                <ArrowUpDown className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name_asc">Nombre (A - Z)</SelectItem>
                <SelectItem value="name_desc">Nombre (Z - A)</SelectItem>
                <SelectItem value="attempts_desc">Más evaluaciones</SelectItem>
                <SelectItem value="attempts_asc">Menos evaluaciones</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="text-muted-foreground hover:text-foreground h-10 px-3 whitespace-nowrap"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Limpiar
            </Button>
          )}
        </div>
      </div>


      {/* Results Count & Badges */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>
          Mostrando <strong className="text-foreground">{filteredStudents.length}</strong> de <strong className="text-foreground">{enrolledStudents.length}</strong> alumnos inscritos
        </span>
        {hasActiveFilters && (
          <span className="text-primary font-medium">Filtro activo</span>
        )}
      </div>

      {/* Grades Table */}
      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/30 text-muted-foreground border-b">
            <tr>
              <th className="px-6 py-4 font-medium text-xs uppercase tracking-wider min-w-[220px]">
                Estudiante
              </th>
              {activities.map((activity) => {
                const lessonData = activity.lessons as any;
                const lessonTitle = lessonData?.title;

                return (
                  <th key={activity.id} className="px-4 py-4 font-medium text-center border-l min-w-[140px]">
                    <div className="flex flex-col items-center">
                      <span className="truncate max-w-[160px] text-foreground font-semibold" title={activity.title}>
                        {activity.title}
                      </span>
                      {lessonTitle && (
                        <span className="mt-0.5 truncate max-w-[140px] text-[10px] text-muted-foreground" title={lessonTitle}>
                          {lessonTitle}
                        </span>
                      )}
                      <span className="mt-1 text-[9px] tracking-widest uppercase font-bold text-muted-foreground/50">
                        {activity.type === 'final_eval' ? 'Examen' : 'Quiz'}
                      </span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredStudents.length > 0 ? (
              filteredStudents.map((student) => {
                const studentAttempts = studentBestAttemptsRecord[student.id] || {};

                return (
                  <tr key={student.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">
                          {student.name ? (
                            student.name.slice(0, 2)
                          ) : (
                            <User className="h-3.5 w-3.5" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-foreground">{student.name || 'Sin nombre'}</span>
                            {student.semester && (
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-medium bg-background">
                                {student.semester}
                              </Badge>
                            )}
                          </div>
                          <div className="text-muted-foreground text-xs">{student.email}</div>
                        </div>
                      </div>
                    </td>
                    {activities.map((activity) => {
                      const attempt = studentAttempts[activity.id];
                      return (
                        <td key={activity.id} className="px-4 py-4 text-center border-l">
                          {attempt ? (
                            <div className="flex justify-center">
                              <StudentAttemptDialog 
                                activity={activity} 
                                attempt={attempt} 
                                studentName={student.name || 'Sin nombre'} 
                              />
                            </div>
                          ) : (
                            <span className="text-muted-foreground/30 font-medium">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={activities.length + 1} className="px-4 py-12 text-center text-muted-foreground">
                  <div className="space-y-2">
                    <p className="font-medium text-foreground">No se encontraron alumnos con los criterios seleccionados</p>
                    {hasActiveFilters && (
                      <Button variant="outline" size="sm" onClick={resetFilters} className="mt-1">
                        Restablecer filtros
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
