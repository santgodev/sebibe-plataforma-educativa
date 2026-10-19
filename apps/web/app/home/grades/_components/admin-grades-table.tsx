'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Award, BookOpen, ChevronRight, Search, X, Filter, ArrowUpDown, User, GraduationCap } from 'lucide-react';
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

export interface StudentGradeItem {
  id: string;
  name: string;
  email: string | null;
  semester?: string | null;
  modality?: string | null;
  coursesCount: number;
  evaluationsCount: number;
}

interface AdminGradesTableProps {
  students: StudentGradeItem[];
}

export function AdminGradesTable({ students }: AdminGradesTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [semesterFilter, setSemesterFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'with_courses' | 'without_courses' | 'with_evals' | 'without_evals'>('all');
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'courses_desc' | 'courses_asc' | 'evals_desc' | 'evals_asc'>('name_asc');

  // Available semesters
  const availableSemesters = useMemo(() => {
    return Array.from(
      new Set(students.map((s) => s.semester).filter((sem): sem is string => !!sem))
    ).sort().reverse();
  }, [students]);

  const filteredStudents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return students
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

        // Status filter
        if (statusFilter === 'with_courses' && student.coursesCount === 0) return false;
        if (statusFilter === 'without_courses' && student.coursesCount > 0) return false;
        if (statusFilter === 'with_evals' && student.evaluationsCount === 0) return false;
        if (statusFilter === 'without_evals' && student.evaluationsCount > 0) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name_asc') {
          return (a.name || '').localeCompare(b.name || '');
        }
        if (sortBy === 'name_desc') {
          return (b.name || '').localeCompare(a.name || '');
        }
        if (sortBy === 'courses_desc') {
          return b.coursesCount - a.coursesCount;
        }
        if (sortBy === 'courses_asc') {
          return a.coursesCount - b.coursesCount;
        }
        if (sortBy === 'evals_desc') {
          return b.evaluationsCount - a.evaluationsCount;
        }
        if (sortBy === 'evals_asc') {
          return a.evaluationsCount - b.evaluationsCount;
        }
        return 0;
      });
  }, [students, searchQuery, semesterFilter, statusFilter, sortBy]);

  const hasActiveFilters = searchQuery !== '' || semesterFilter !== 'all' || statusFilter !== 'all' || sortBy !== 'name_asc';

  const resetFilters = () => {
    setSearchQuery('');
    setSemesterFilter('all');
    setStatusFilter('all');
    setSortBy('name_asc');
  };

  if (students.length === 0) {
    return (
      <div className="bg-card rounded-xl border shadow-sm p-12 text-center text-muted-foreground">
        No hay estudiantes registrados en la plataforma.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between bg-card p-4 rounded-xl border shadow-sm">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre o correo electrónico..."
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
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las situaciones</SelectItem>
                <SelectItem value="with_courses">Con materias</SelectItem>
                <SelectItem value="without_courses">Sin materias</SelectItem>
                <SelectItem value="with_evals">Con evaluaciones</SelectItem>
                <SelectItem value="without_evals">Sin evaluaciones</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort By */}
          <div className="w-full sm:w-[170px]">
            <Select
              value={sortBy}
              onValueChange={(val: any) => setSortBy(val)}
            >
              <SelectTrigger className="h-10">
                <ArrowUpDown className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name_asc">Nombre (A - Z)</SelectItem>
                <SelectItem value="name_desc">Nombre (Z - A)</SelectItem>
                <SelectItem value="courses_desc">Más materias</SelectItem>
                <SelectItem value="courses_asc">Menos materias</SelectItem>
                <SelectItem value="evals_desc">Más evaluaciones</SelectItem>
                <SelectItem value="evals_asc">Menos evaluaciones</SelectItem>
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
          Mostrando <strong className="text-foreground">{filteredStudents.length}</strong> de <strong className="text-foreground">{students.length}</strong> estudiantes
        </span>
        {hasActiveFilters && (
          <span className="text-primary font-medium">Filtros aplicados</span>
        )}
      </div>

      {/* Table Container */}
      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        {filteredStudents.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Search className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-base text-foreground">No se encontraron estudiantes</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              No hay coincidencias con los criterios de búsqueda o filtros seleccionados.
            </p>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={resetFilters} className="mt-2">
                Restablecer filtros
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-6 py-4 font-semibold">Estudiante</th>
                  <th className="px-6 py-4 font-semibold text-center">Materias Inscritas</th>
                  <th className="px-6 py-4 font-semibold text-center">Evaluaciones Realizadas</th>
                  <th className="px-6 py-4 font-semibold text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredStudents.map((student) => {
                  return (
                    <tr key={student.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">
                            {student.name ? (
                              student.name.slice(0, 2)
                            ) : (
                              <User className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-foreground text-base">
                                {student.name || 'Sin nombre'}
                              </span>
                              {student.semester && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-medium bg-background">
                                  {student.semester}
                                </Badge>
                              )}
                              {student.modality && (
                                <Badge variant="secondary" className="text-[9px] uppercase tracking-wider px-1 py-0">
                                  {student.modality}
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {student.email || 'Sin correo registrado'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                          student.coursesCount > 0
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          <BookOpen className="h-3.5 w-3.5" />
                          {student.coursesCount} {student.coursesCount === 1 ? 'Materia' : 'Materias'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                          student.evaluationsCount > 0
                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          <Award className="h-3.5 w-3.5" />
                          {student.evaluationsCount} {student.evaluationsCount === 1 ? 'Evaluación' : 'Evaluaciones'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link 
                          href={`/home/admin-users/${student.id}`}
                          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 group-hover:border-primary group-hover:text-primary"
                        >
                          Ver Reporte
                          <ChevronRight className="ml-2 h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
