'use client';

import { useState } from 'react';
import { createStudentUser } from '../_lib/server/admin-actions';
import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@kit/ui/select';

export function CreateUserForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await createStudentUser(formData);
      setSuccess(true);
      (document.getElementById('create-user-form') as HTMLFormElement).reset();
    } catch (e: any) {
      setError(e.message || 'Error al crear usuario');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form id="create-user-form" action={handleSubmit} className="flex flex-col gap-4 max-w-md">
      <div className="flex flex-col gap-2">
        <Label htmlFor="firstName">Nombre</Label>
        <Input id="firstName" name="firstName" required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="lastName">Apellido</Label>
        <Input id="lastName" name="lastName" required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Correo Electrónico</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Contraseña Temporal</Label>
        <Input id="password" name="password" type="password" required minLength={6} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="role">Rol</Label>
        <Select name="role" defaultValue="alumno" required>
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
      {success && <div className="text-green-500 text-sm">Usuario creado correctamente.</div>}

      <Button type="submit" disabled={loading}>
        {loading ? 'Creando...' : 'Crear Usuario'}
      </Button>
    </form>
  );
}
