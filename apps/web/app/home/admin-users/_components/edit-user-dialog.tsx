'use client';

import { useState } from 'react';
import { updateStudentUser } from '../_lib/server/admin-actions';
import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@kit/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@kit/ui/dialog';
import { UserData } from './users-table';

export function EditUserDialog({ user }: { user: UserData }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Extract first and last name from full name
  const nameParts = user.name.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await updateStudentUser(user.id, formData);
      setSuccess(true);
      setTimeout(() => setOpen(false), 1500); // Close after success
    } catch (e: any) {
      setError(e.message || 'Error al actualizar usuario');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Usuario</DialogTitle>
          <DialogDescription>
            Modifica los datos del usuario {user.email}. Haz clic en guardar cuando termines.
          </DialogDescription>
        </DialogHeader>
        
        <form action={handleSubmit} className="flex flex-col gap-4 mt-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="firstName">Nombre</Label>
            <Input id="firstName" name="firstName" defaultValue={firstName} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="lastName">Apellido</Label>
            <Input id="lastName" name="lastName" defaultValue={lastName} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="role">Rol</Label>
            <Select name="role" defaultValue={user.role || 'alumno'} required>
              <SelectTrigger id="role">
                <SelectValue placeholder="Selecciona un rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alumno">Alumno</SelectItem>
                <SelectItem value="profesor">Profesor</SelectItem>
                <SelectItem value="administrador">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && <div className="text-red-500 text-sm">{error}</div>}
          {success && <div className="text-green-500 text-sm">Usuario actualizado correctamente.</div>}

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
