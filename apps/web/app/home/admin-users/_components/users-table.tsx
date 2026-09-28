'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MoreHorizontal, PlusCircle, UserCog, LineChart } from 'lucide-react';
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

export type UserData = {
  id: string;
  name: string;
  email: string;
  role: string | null;
  created_at: string;
  semester?: number | null;
  modality?: string | null;
};

export function UsersTable({ users, courses }: { users: UserData[], courses: { id: string; title: string }[] }) {
  const [enrollDialogUserId, setEnrollDialogUserId] = useState<string | null>(null);
  
  // Filters state
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

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (semesterFilter !== 'all' && u.semester?.toString() !== semesterFilter) return false;
    if (modalityFilter !== 'all' && u.modality !== modalityFilter) return false;
    return true;
  });

  // Calculate unique available semesters
  const availableSemesters = Array.from(
    new Set(users.map(u => u.semester).filter((s): s is number => s != null))
  ).sort((a, b) => a - b);

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[180px]">
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
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Semestre" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los semestres</SelectItem>
            {availableSemesters.map(sem => (
              <SelectItem key={sem} value={sem.toString()}>
                Semestre {sem}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={modalityFilter} onValueChange={setModalityFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Modalidad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las modalidades</SelectItem>
            <SelectItem value="presencial">Presencial</SelectItem>
            <SelectItem value="virtual">Virtual</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
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
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize
                  ${
                    user.role === 'administrador'
                      ? 'bg-red-100 text-red-800'
                      : user.role === 'profesor'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                  }`}
                >
                  {user.role || 'Sin rol'}
                </span>
              </TableCell>
              <TableCell>
                {user.semester ? `Sem. ${user.semester}` : '-'}
              </TableCell>
              <TableCell className="capitalize">
                {user.modality || '-'}
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
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="p-0">
                      <DeleteUserDialog user={user} />
                    </DropdownMenuItem>
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
