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

export type UserData = {
  id: string;
  name: string;
  email: string;
  role: string | null;
  created_at: string;
};

export function UsersTable({ users, courses }: { users: UserData[], courses: { id: string; title: string }[] }) {
  const [enrollDialogUserId, setEnrollDialogUserId] = useState<string | null>(null);

  const closeEnrollDialog = () => setEnrollDialogUserId(null);
  if (users.length === 0) {
    return (
      <div className="text-muted-foreground p-8 text-center">
        No hay usuarios registrados.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Correo Electrónico</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Fecha de Registro</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
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
                    <DropdownMenuItem asChild>
                      <div className="w-full" onClick={(e) => e.stopPropagation()}>
                        {/* We use EditUserDialog as a trigger itself, so we don't want DropdownMenuItem to steal clicks inappropriately if it messes with the Dialog */}
                        <EditUserDialog user={user} />
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

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
