'use client';

import { useState, useTransition, useEffect } from 'react';
import { Calendar, CheckCircle2, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@kit/ui/dialog';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';

import { createAcademicPeriodAction } from '~/lib/lms/server/actions/cohorts.actions';

export function CreateSemesterDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const defaultPeriod = currentMonth < 6 ? 'I' : 'II';

  const [year, setYear] = useState<string>(currentYear.toString());
  const [cycle, setCycle] = useState<'I' | 'II'>(defaultPeriod);
  const [name, setName] = useState<string>(`${currentYear} - ${defaultPeriod}`);
  const [startDate, setStartDate] = useState<string>(
    defaultPeriod === 'I' ? `${currentYear}-01-15` : `${currentYear}-07-15`
  );
  const [endDate, setEndDate] = useState<string>(
    defaultPeriod === 'I' ? `${currentYear}-06-30` : `${currentYear}-12-15`
  );

  useEffect(() => {
    const formatted = `${year} - ${cycle}`;
    setName(formatted);
    if (cycle === 'I') {
      setStartDate(`${year}-01-15`);
      setEndDate(`${year}-06-30`);
    } else {
      setStartDate(`${year}-07-15`);
      setEndDate(`${year}-12-15`);
    }
  }, [year, cycle]);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set('name', name);
    formData.set('start_date', startDate);
    formData.set('end_date', endDate);

    startTransition(async () => {
      try {
        await createAcademicPeriodAction(formData);
        toast.success(`Semestre "${name}" creado correctamente`);
        setOpen(false);
      } catch (error: any) {
        toast.error(error.message || 'Ocurrió un error al crear el semestre');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 font-medium">
          <Plus className="h-4 w-4" />
          Nuevo Semestre
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Crear Semestre Académico</DialogTitle>
              <DialogDescription className="text-xs">
                Añade un nuevo periodo académico con el formato estándar (ej: 2026 - I, 2026 - II).
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 py-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Año Académico</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Año..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={(currentYear - 1).toString()}>{currentYear - 1}</SelectItem>
                  <SelectItem value={currentYear.toString()}>{currentYear}</SelectItem>
                  <SelectItem value={(currentYear + 1).toString()}>{currentYear + 1}</SelectItem>
                  <SelectItem value={(currentYear + 2).toString()}>{currentYear + 2}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Ciclo / Semestre</Label>
              <Select value={cycle} onValueChange={(v: 'I' | 'II') => setCycle(v)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Ciclo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="I">I (Ene - Jun)</SelectItem>
                  <SelectItem value="II">II (Jul - Dic)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-semibold">
              Nombre Oficial del Semestre *
            </Label>
            <Input
              id="name"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. 2026 - I"
              required
              className="h-9 text-sm font-semibold text-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="start_date" className="text-xs font-semibold">
                Fecha de Inicio *
              </Label>
              <Input
                id="start_date"
                name="start_date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end_date" className="text-xs font-semibold">
                Fecha de Fin *
              </Label>
              <Input
                id="end_date"
                name="end_date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={isPending} className="gap-1.5">
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Crear Semestre
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
