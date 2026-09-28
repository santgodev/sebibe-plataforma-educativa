'use client';

import { useState } from 'react';
import { deleteStudentUser } from '../_lib/server/admin-actions';
import { Button } from '@kit/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@kit/ui/alert-dialog';
import { UserData } from './users-table';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

export function DeleteUserDialog({ user }: { user: UserData }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      await deleteStudentUser(user.id);
      toast.success('Usuario eliminado correctamente', {
        description: `Se ha eliminado al usuario ${user.name}`,
      });
      setOpen(false);
    } catch (e: any) {
      toast.error('Error al eliminar usuario', {
        description: e.message || 'Ocurrió un error inesperado',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50">
          <Trash2 className="mr-2 h-4 w-4" />
          <span>Eliminar Usuario</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Estás completamente seguro?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción eliminará permanentemente al usuario <strong>{user.name}</strong> ({user.email}). 
            También se borrarán sus intentos, progreso de lecciones y materias inscritas de la base de datos. 
            Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction 
            onClick={(e) => {
              e.preventDefault(); // Evitamos que se cierre automáticamente
              handleDelete();
            }} 
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {loading ? 'Eliminando...' : 'Sí, eliminar usuario'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
