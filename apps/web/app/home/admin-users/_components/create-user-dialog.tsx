'use client';

import { useState } from 'react';

import { Plus } from 'lucide-react';

import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@kit/ui/dialog';

import { CreateUserForm } from './create-user-form';
import { CreateStudentForm } from './create-student-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';

export function CreateUserDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          Crear Nuevo Usuario
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Agregar Usuario</DialogTitle>
          <DialogDescription>
            Registra un nuevo estudiante con perfil completo, o crea cuentas de personal (profesor/administrador).
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <Tabs defaultValue="student" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="student">Estudiante</TabsTrigger>
              <TabsTrigger value="staff">Personal</TabsTrigger>
            </TabsList>
            <TabsContent value="student">
              <CreateStudentForm onSuccess={() => setOpen(false)} />
            </TabsContent>
            <TabsContent value="staff">
              <CreateUserForm onSuccess={() => setOpen(false)} />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
