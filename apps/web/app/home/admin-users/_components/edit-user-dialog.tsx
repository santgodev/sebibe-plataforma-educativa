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
import { toast } from 'sonner';
import { UserCog, Loader2, Shield, GraduationCap, CheckCircle2 } from 'lucide-react';

interface EditUserDialogProps {
  user: UserData;
  trigger?: React.ReactNode;
}

export function EditUserDialog({ user, trigger }: EditUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState(user.role || 'alumno');

  // Extract initial first and last name (prefer structured studentProfile if available)
  const profile = user.studentProfile;
  const initialFirstName = profile?.first_name || user.name.split(' ')[0] || '';
  const initialLastName = profile?.last_name || user.name.split(' ').slice(1).join(' ') || '';

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    try {
      await updateStudentUser(user.id, formData);
      toast.success('Datos actualizados correctamente');
      setOpen(false);
    } catch (err: any) {
      const msg = err.message || 'Error al actualizar usuario';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="w-full justify-start font-normal px-2 py-1.5 h-auto text-sm">
            <UserCog className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Editar Datos</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <UserCog className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Editar Datos del Usuario</DialogTitle>
              <DialogDescription className="text-xs">
                Modifica los datos personales, de acceso y de estudiante de {user.name}.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6 mt-2">
          {/* SECCIÓN 1: DATOS DE CUENTA Y ACCESO */}
          <div className="rounded-lg border p-4 bg-card space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground border-b pb-2">
              <Shield className="h-4 w-4 text-blue-600" />
              <span>Datos de Cuenta y Acceso</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="firstName" className="text-xs font-medium">Nombres *</Label>
                <Input 
                  id="firstName" 
                  name="firstName" 
                  defaultValue={initialFirstName} 
                  required 
                  placeholder="Ej: Juan Carlos" 
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="lastName" className="text-xs font-medium">Apellidos *</Label>
                <Input 
                  id="lastName" 
                  name="lastName" 
                  defaultValue={initialLastName} 
                  required 
                  placeholder="Ej: Pérez Gómez" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email" className="text-xs font-medium">Correo Electrónico (Login) *</Label>
                <Input 
                  id="email" 
                  name="email" 
                  type="email" 
                  defaultValue={user.email} 
                  required 
                  placeholder="correo@ejemplo.com" 
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="role" className="text-xs font-medium">Rol en la Plataforma *</Label>
                <Select 
                  name="role" 
                  defaultValue={selectedRole} 
                  onValueChange={setSelectedRole}
                  required
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alumno">Alumno / Estudiante</SelectItem>
                    <SelectItem value="profesor">Profesor</SelectItem>
                    <SelectItem value="administrador">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password" className="text-xs font-medium">
                Nueva Contraseña <span className="text-muted-foreground font-normal">(Opcional, dejar vacío para conservar la actual)</span>
              </Label>
              <Input 
                id="password" 
                name="password" 
                type="password" 
                placeholder="••••••••" 
                autoComplete="new-password"
              />
            </div>
          </div>

          {/* SECCIÓN 2: FICHA DE ESTUDIANTE / INFORMACIÓN PERSONAL */}
          <div className="rounded-lg border p-4 bg-card space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <GraduationCap className="h-4 w-4 text-emerald-600" />
                <span>Ficha de Estudiante / Información Personal</span>
              </div>
              {profile?.status && (
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium capitalize ${
                  profile.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {profile.status === 'active' ? 'Activo' : profile.status}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="documentId" className="text-xs font-medium">Cédula / Documento de Identidad</Label>
                <Input 
                  id="documentId" 
                  name="documentId" 
                  defaultValue={profile?.document_id || ''} 
                  placeholder="Número de documento" 
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="institutionalEmail" className="text-xs font-medium">Correo Institucional (@sebibe.org)</Label>
                <Input 
                  id="institutionalEmail" 
                  name="institutionalEmail" 
                  type="email"
                  defaultValue={profile?.institutional_email || user.email || ''} 
                  placeholder="usuario@sebibe.org" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="phone" className="text-xs font-medium">Teléfono / Celular</Label>
                <Input 
                  id="phone" 
                  name="phone" 
                  type="tel"
                  defaultValue={profile?.phone || ''} 
                  placeholder="+57 300 000 0000" 
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="birthDate" className="text-xs font-medium">Fecha de Nacimiento</Label>
                <Input 
                  id="birthDate" 
                  name="birthDate" 
                  type="date"
                  defaultValue={profile?.birth_date || ''} 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="church" className="text-xs font-medium">Iglesia de Procedencia</Label>
                <Input 
                  id="church" 
                  name="church" 
                  defaultValue={profile?.church || ''} 
                  placeholder="Nombre de la iglesia" 
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="city" className="text-xs font-medium">Ciudad de Procedencia</Label>
                <Input 
                  id="city" 
                  name="city" 
                  defaultValue={profile?.city || ''} 
                  placeholder="Ciudad o municipio" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="entryDate" className="text-xs font-medium">Fecha de Ingreso</Label>
                <Input 
                  id="entryDate" 
                  name="entryDate" 
                  type="date"
                  defaultValue={profile?.entry_date || ''} 
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="modality" className="text-xs font-medium">Modalidad</Label>
                <Select name="modality" defaultValue={profile?.modality || 'presencial'}>
                  <SelectTrigger id="modality">
                    <SelectValue placeholder="Modalidad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="presencial">Presencial</SelectItem>
                    <SelectItem value="virtual">Virtual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="status" className="text-xs font-medium">Estado del Alumno</Label>
                <Select name="status" defaultValue={profile?.status || 'active'}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="inactive">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {error && (
            <div className="text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-md p-3 text-xs">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <Button variant="outline" type="button" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Guardar Cambios</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
