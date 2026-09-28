'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { generateAvailableEmailAction, createFullStudentAction } from '../_lib/server/student-actions';
import { normalizeName } from '../_lib/student-utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@kit/ui/select';
import { CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export function CreateStudentForm({ onSuccess }: { onSuccess?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (firstName.trim().length > 1 && lastName.trim().length > 1) {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
      
      setEmailLoading(true);
      debounceTimeout.current = setTimeout(async () => {
        try {
          const res = await generateAvailableEmailAction(firstName, lastName);
          if (res.email) {
            setEmail(res.email);
            setEmailError('');
          } else {
            setEmail('');
            setEmailError(res.error || 'No se pudo generar un correo.');
          }
        } catch (err) {
          setEmailError('Error validando correo.');
        } finally {
          setEmailLoading(false);
        }
      }, 600);
    } else {
      setEmail('');
      setEmailError('');
    }
    
    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, [firstName, lastName]);

  async function handleSubmit(formData: FormData) {
    if (!email) {
      toast.error('Espera a que se genere un correo institucional válido');
      return;
    }
    
    formData.set('email', email); // Asegurar que mandamos el correo generado
    
    setLoading(true);
    try {
      const res = await createFullStudentAction(formData);
      if (res.success) {
        toast.success(
          <div>
            <p className="font-bold">Estudiante creado correctamente</p>
            <ul className="text-sm mt-2 space-y-1">
              <li><strong>Nombre:</strong> {res.studentName}</li>
              <li><strong>Identificación:</strong> {res.documentId}</li>
              <li><strong>Correo institucional:</strong> <a href={`mailto:${res.email}`} className="underline text-blue-300">{res.email}</a></li>
              <li><strong>Estado:</strong> Activo</li>
            </ul>
          </div>,
          { duration: 8000 }
        );
        (document.getElementById('create-student-form') as HTMLFormElement).reset();
        setFirstName('');
        setLastName('');
        setEmail('');
        if (onSuccess) onSuccess();
      }
    } catch (e: any) {
      toast.error(e.message || 'Error al crear estudiante');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form id="create-student-form" action={handleSubmit} className="flex flex-col gap-4 max-w-md w-full">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="firstName">Nombres</Label>
          <Input 
            id="firstName" 
            name="firstName" 
            required 
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            onBlur={() => setFirstName(normalizeName(firstName))}
            placeholder="Juan Carlos"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="lastName">Apellidos</Label>
          <Input 
            id="lastName" 
            name="lastName" 
            required 
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            onBlur={() => setLastName(normalizeName(lastName))}
            placeholder="Pérez Gómez"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="documentId">Número de identificación</Label>
        <Input id="documentId" name="documentId" required placeholder="1234567890" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="birthDate">Fecha de nacimiento</Label>
          <Input id="birthDate" name="birthDate" type="date" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="phone">Teléfono</Label>
          <Input id="phone" name="phone" type="tel" required placeholder="+57 300 000 0000" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="church">Iglesia de procedencia</Label>
          <Input id="church" name="church" required placeholder="Iglesia..." />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="city">Ciudad de procedencia</Label>
          <Input id="city" name="city" required placeholder="Bogotá" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="entryDate">Fecha de ingreso</Label>
          <Input id="entryDate" name="entryDate" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="modality">Modalidad</Label>
          <Select name="modality" defaultValue="presencial" required>
            <SelectTrigger id="modality">
              <SelectValue placeholder="Selecciona..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="presencial">Presencial</SelectItem>
              <SelectItem value="virtual">Virtual</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Preview del correo */}
      <div className="mt-2 mb-2 p-3 bg-muted/30 rounded-lg border flex flex-col gap-1.5">
        <Label className="text-muted-foreground text-xs uppercase tracking-wider">Correo Institucional Generado</Label>
        <div className="flex items-center min-h-[24px]">
          {emailLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Generando...</span>
            </div>
          ) : email ? (
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>{email}</span>
            </div>
          ) : emailError ? (
            <div className="text-sm text-red-500 font-medium">
              {emailError}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground italic">
              Ingresa nombres y apellidos para generar el correo.
            </div>
          )}
        </div>
      </div>

      <Button type="submit" disabled={loading || !email || emailLoading} className="w-full">
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Guardando estudiante...
          </>
        ) : (
          'Guardar estudiante'
        )}
      </Button>
    </form>
  );
}
