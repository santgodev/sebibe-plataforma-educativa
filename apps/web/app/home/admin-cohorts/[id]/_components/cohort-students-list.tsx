'use client';

import { useState, useMemo } from 'react';
import { Search, X, User, GraduationCap } from 'lucide-react';
import { Input } from '@kit/ui/input';
import { Badge } from '@kit/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import Link from 'next/link';

interface EnrolledStudent {
  id: string;
  name: string;
  email: string | null;
  semester?: string | null;
  modality?: string | null;
}

export function CohortStudentsList({
  students,
}: {
  students: EnrolledStudent[];
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [semesterFilter, setSemesterFilter] = useState<string>('all');

  const availableSemesters = useMemo(() => {
    return Array.from(
      new Set(students.map((s) => s.semester).filter((sem): sem is string => !!sem))
    ).sort().reverse();
  }, [students]);

  const filteredStudents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return students.filter((s) => {
      if (semesterFilter !== 'all' && s.semester !== semesterFilter) {
        return false;
      }

      if (query) {
        const nameMatch = s.name?.toLowerCase().includes(query) ?? false;
        const emailMatch = s.email?.toLowerCase().includes(query) ?? false;
        if (!nameMatch && !emailMatch) {
          return false;
        }
      }

      return true;
    });
  }, [students, searchQuery, semesterFilter]);

  if (students.length === 0) {
    return (
      <div className="text-muted-foreground bg-muted/20 rounded-xl border p-8 text-center text-sm">
        No hay estudiantes en este grupo. Utiliza el botón "Añadir Estudiante" o "Migrar Grupo" para matricular alumnos.
      </div>
    );
  }

  return (
    <div className="space-y-3 flex-1 flex flex-col">
      {/* Search Bar & Semester Filter for Enrolled Students */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar estudiante en este grupo..."
            className="pl-8 pr-7 h-8 text-xs"
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

        {availableSemesters.length > 0 && (
          <div className="w-[125px]">
            <Select
              value={semesterFilter}
              onValueChange={(val: any) => setSemesterFilter(val)}
            >
              <SelectTrigger className="h-8 text-[11px] px-2">
                <GraduationCap className="h-3 w-3 mr-1 text-muted-foreground" />
                <SelectValue placeholder="Semestre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {availableSemesters.map((sem) => (
                  <SelectItem key={sem} value={sem.toString()}>
                    Semestre {sem}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {(searchQuery || semesterFilter !== 'all') && (
        <div className="text-[11px] text-muted-foreground px-0.5 flex items-center justify-between">
          <span>
            Mostrando: <strong>{filteredStudents.length}</strong> de {students.length}
          </span>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSemesterFilter('all');
            }}
            className="text-primary hover:underline text-[11px]"
          >
            Limpiar filtros
          </button>
        </div>
      )}

      {/* List */}
      <div className="space-y-2 flex-1 overflow-y-auto max-h-[420px] pr-0.5">
        {filteredStudents.length === 0 ? (
          <div className="text-muted-foreground border rounded-lg p-6 text-center text-xs">
            No se encontró ningún estudiante con los filtros aplicados.
          </div>
        ) : (
          filteredStudents.map((student) => (
            <div
              key={student.id}
              className="border p-3 rounded-lg flex items-center justify-between bg-card hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">
                  {student.name ? student.name.slice(0, 2) : <User className="h-3.5 w-3.5" />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Link
                      href={`/home/admin-users/${student.id}`}
                      className="font-medium text-sm hover:text-primary hover:underline truncate"
                    >
                      {student.name || 'Sin nombre'}
                    </Link>
                    {student.semester && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 font-medium">
                        {student.semester}
                      </Badge>
                    )}
                    {student.modality && (
                      <Badge variant="secondary" className="text-[9px] uppercase px-1 py-0">
                        {student.modality}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
