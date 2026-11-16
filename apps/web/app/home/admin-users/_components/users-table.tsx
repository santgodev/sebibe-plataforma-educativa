'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { MoreHorizontal, PlusCircle, UserCog, LineChart, Search, X, User, GraduationCap, Calendar, Mail } from 'lucide-react';
import { Badge } from '@kit/ui/badge';
import { Input } from '@kit/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';
import { Button } from '@kit/ui/button';
import { EditUserDialog } from './edit-user-dialog';
import { EnrollStudentDialog } from './enroll-student-dialog';
import { DeleteUserDialog } from './delete-user-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';

export type StudentProfile = {
  id?: string;
  user_id?: string;
  document_id?: string;
  first_name?: string;
  last_name?: string;
  birth_date?: string;
  phone?: string;
  church?: string;
  city?: string;
  institutional_email?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  entry_date?: string;
  modality?: string;
};

export type UserData = {
  id: string;
  name: string;
  email: string;
  role: string | null;
  created_at: string;
  semester?: string | null;
  modality?: string | null;
  studentProfile?: StudentProfile | null;
};

export function UsersTable({
  users,
  courses,
  currentUserId,
}: {
  users: UserData[];
  courses: { id: string; title: string }[];
  currentUserId?: string;
}) {
  const [enrollDialogUserId, setEnrollDialogUserId] = useState<string | null>(null);
  
  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [semesterFilter, setSemesterFilter] = useState<string>('all');
  const [modalityFilter, setModalityFilter] = useState<string>('all');

  const closeEnrollDialog = () => setEnrollDialogUserId(null);
  if (users.length === 0) {
    return (
      <div className="text-muted-foreground p-8 text-center">
        No hay usuarios registrados.
      </div>
    );
  }

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (semesterFilter !== 'all' && u.semester !== semesterFilter) return false;
      if (modalityFilter !== 'all' && u.modality !== modalityFilter) return false;

      if (query) {
        const nameMatch = u.name?.toLowerCase().includes(query) ?? false;
        const emailMatch = u.email?.toLowerCase().includes(query) ?? false;
        const docMatch = u.studentProfile?.document_id?.toLowerCase().includes(query) ?? false;
        if (!nameMatch && !emailMatch && !docMatch) {
          return false;
        }
      }

      return true;
    });
  }, [users, roleFilter, semesterFilter, modalityFilter, searchQuery]);

  // Calculate unique available semesters
  const availableSemesters = useMemo(() => {
    return Array.from(
      new Set(users.map(u => u.semester).filter((s): s is string => !!s))
    ).sort().reverse();
  }, [users]);

  const hasActiveFilters = searchQuery !== '' || roleFilter !== 'all' || semesterFilter !== 'all' || modalityFilter !== 'all';

  const resetFilters = () => {
    setSearchQuery('');
    setRoleFilter('all');
    setSemesterFilter('all');
    setModalityFilter('all');
  };

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3">
        {/* Search input */}
        <div className="relative flex-1 min-w-0 sm:min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, correo o cédula..."
            className="pl-9 pr-8 h-9 sm:h-10 text-xs sm:text-sm w-full"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-[145px] h-9 sm:h-10 text-xs sm:text-sm">
              <SelectValue placeholder="Rol" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los roles</SelectItem>
              <SelectItem value="alumno">Alumno</SelectItem>
              <SelectItem value="profesor">Profesor</SelectItem>
              <SelectItem value="administrador">Administrador</SelectItem>
            </SelectContent>
          </Select>

          <Select value={semesterFilter} onValueChange={setSemesterFilter}>
            <SelectTrigger className="w-full sm:w-[145px] h-9 sm:h-10 text-xs sm:text-sm">
              <SelectValue placeholder="Semestre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los semestres</SelectItem>
              {availableSemesters.map(sem => (
                <SelectItem key={sem} value={sem}>
                  {sem}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={modalityFilter} onValueChange={setModalityFilter}>
            <SelectTrigger className="w-full sm:w-[145px] h-9 sm:h-10 text-xs sm:text-sm">
              <SelectValue placeholder="Modalidad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las modalidades</SelectItem>
              <SelectItem value="presencial">Presencial</SelectItem>
              <SelectItem value="virtual">Virtual</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="col-span-2 sm:col-span-1 h-9 sm:h-10 text-xs sm:text-sm text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {/* Results counter */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-0.5">
        <span>
          Mostrando <strong className="text-foreground">{filteredUsers.length}</strong> de <strong className="text-foreground">{users.length}</strong> usuarios
        </span>
        {hasActiveFilters && (
          <span className="text-primary font-medium">Filtro aplicado</span>
        )}
      </div>

      {/* VISTA MOBILE: Tarjetas Responsivas para Teléfonos */}
      <div className="space-y-3 md:hidden">
        {filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground border rounded-xl bg-muted/20 text-xs">
            No se encontraron usuarios con estos filtros.
          </div>
        ) : (
          filteredUsers.map((user) => (
            <div
              key={user.id}
              className="border rounded-xl p-3.5 bg-card hover:border-primary/40 transition-colors shadow-2xs space-y-3"
            >
              {/* Header de la tarjeta */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="h-9 w-9 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                    {user.name ? user.name.slice(0, 2).toUpperCase() : 'US'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/home/admin-users/${user.id}`}
                      className="font-bold text-sm text-foreground hover:text-primary hover:underline truncate block"
                    >
                      {user.name}
                    </Link>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>

                {/* Acciones */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
                      <span className="sr-only">Abrir menú</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/home/admin-users/${user.id}`} className="flex items-center">
                        <LineChart className="mr-2 h-4 w-4" />
                        <span>Ver Perfil y Progreso</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setEnrollDialogUserId(user.id)}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      <span>Inscribir a Materia</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <div className="w-full">
                        <EditUserDialog user={user} />
                      </div>
                    </DropdownMenuItem>
                    {user.id !== currentUserId && (
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="p-0">
                        <DeleteUserDialog user={user} />
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Badges / Metadatos */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t text-xs">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${
                    user.role === 'administrador'
                      ? 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300'
                      : user.role === 'profesor'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300'
                      : 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300'
                  }`}
                >
                  {user.role || 'Sin rol'}
                </span>

                {user.role !== 'profesor' && user.role !== 'administrador' && (
                  <>
                    {user.semester && (
                      <Badge variant="outline" className="text-[10px] font-medium bg-background px-2 py-0.5">
                        {user.semester}
                      </Badge>
                    )}
                    {user.modality && (
                      <Badge variant="secondary" className="text-[10px] capitalize px-2 py-0.5">
                        {user.modality}
                      </Badge>
                    )}
                    {user.studentProfile?.document_id && (
                      <span className="text-[10px] text-muted-foreground font-mono">
                        CC: {user.studentProfile.document_id}
                      </span>
                    )}
                  </>
                )}

                <span className="text-[10px] text-muted-foreground ml-auto">
                  {new Date(user.created_at).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>

              {/* Botones de acción rápida */}
              <div className="pt-1 border-t flex items-center gap-2">
                <Link href={`/home/admin-users/${user.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full h-8 text-xs font-semibold gap-1.5 justify-center">
                    <LineChart className="h-3.5 w-3.5 text-primary" />
                    <span>Ver Perfil y Progreso</span>
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEnrollDialogUserId(user.id)}
                  className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                  title="Inscribir a Materia"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* VISTA DESKTOP: Tabla Tradicional */}
      <div className="rounded-md border overflow-x-auto hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Correo Electrónico</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Semestre</TableHead>
              <TableHead>Modalidad</TableHead>
              <TableHead>Fecha de Registro</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No se encontraron usuarios con estos filtros.
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    <Link href={`/home/admin-users/${user.id}`} className="hover:text-primary hover:underline transition-colors">
                      {user.name}
                    </Link>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                        user.role === 'administrador'
                          ? 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300'
                          : user.role === 'profesor'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300'
                          : 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300'
                      }`}
                    >
                      {user.role || 'Sin rol'}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium whitespace-nowrap">
                    {user.role === 'profesor' || user.role === 'administrador' ? '-' : (user.semester || '-')}
                  </TableCell>
                  <TableCell className="capitalize">
                    {user.role === 'profesor' || user.role === 'administrador' ? '-' : (user.modality || '-')}
                  </TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menú</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/home/admin-users/${user.id}`} className="flex items-center">
                            <LineChart className="mr-2 h-4 w-4" />
                            <span>Ver Progreso</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEnrollDialogUserId(user.id)}>
                          <PlusCircle className="mr-2 h-4 w-4" />
                          <span>Inscribir a Materia</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                          <div className="w-full">
                            <EditUserDialog user={user} />
                          </div>
                        </DropdownMenuItem>
                        {user.id !== currentUserId && (
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="p-0">
                            <DeleteUserDialog user={user} />
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {enrollDialogUserId && (
        <EnrollStudentDialog
          userId={enrollDialogUserId}
          userName={users.find((u) => u.id === enrollDialogUserId)?.name || ''}
          courses={courses}
          isOpen={!!enrollDialogUserId}
          onOpenChange={closeEnrollDialog}
        />
      )}
    </div>
  );
}
