'use client';

import { useState, useTransition, useMemo } from 'react';
import { Calendar, CheckCircle2, Loader2, Users } from 'lucide-react';
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
import { Label } from '@kit/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';

import { enrollCohortGroupAction } from '~/lib/lms/server/actions/cohorts.actions';

export interface CohortOptionForMigration {
  id: string;
  name: string;
  period_id?: string;
  semesterName: string;
  rawSemesterName?: string;
  student_count?: number;
}

export function MigrateCohortDialog({
  cohortId,
  otherCohorts,
}: {
  cohortId: string;
  otherCohorts: CohortOptionForMigration[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [selectedCohortId, setSelectedCohortId] = useState<string>('');

  // Agrupar cohortes por semestre (ej. "2026 - II", "2026 - I", "2025 - II")
  const cohortsBySemester = useMemo(() => {
    const map: Record<string, CohortOptionForMigration[]> = {};

    otherCohorts.forEach((cohort) => {
      const sem = cohort.semesterName || 'Sin Semestre Asignado';
      if (!map[sem]) {
        map[sem] = [];
      }
      map[sem].push(cohort);
    });

    // Ordenar semestres descendente (los más recientes primero)
    return Object.entries(map).sort(([semA], [semB]) => semB.localeCompare(semA));
  }, [otherCohorts]);

  const selectedCohort = useMemo(() => {
    return otherCohorts.find((c) => c.id === selectedCohortId);
  }, [otherCohorts, selectedCohortId]);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.append('target_cohort_id', cohortId);
    formData.set('source_cohort_id', selectedCohortId);

    if (!selectedCohortId) {
      toast.error('Debes seleccionar un grupo origen');
      return;
    }

    startTransition(async () => {
      try {
        await enrollCohortGroupAction(formData);
        toast.success(
          `Alumnos de ${selectedCohort?.name || 'grupo'} migrados correctamente a este grupo`
        );
        setOpen(false);
        setSelectedCohortId('');
      } catch (error: any) {
        toast.error(error.message || 'Error al matricular alumnos');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2 font-medium">
          <Users className="h-4 w-4" />
          Migrar Grupo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                Migrar / Inscribir Grupo Completo
              </DialogTitle>
              <DialogDescription className="text-xs">
                Selecciona un grupo anterior agrupado por su semestre correspondiente (ej. 2026 - I, 2026 - II) para matricular a todos sus alumnos en este grupo.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 py-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Grupo Origen (por Semestre) *</Label>
            <Select
              name="source_cohort_id"
              value={selectedCohortId}
              onValueChange={setSelectedCohortId}
              required
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Seleccionar grupo por semestre..." />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {otherCohorts.length === 0 ? (
                  <SelectItem value="none" disabled>
                    No hay otros grupos disponibles
                  </SelectItem>
                ) : (
                  cohortsBySemester.map(([semName, cohorts]) => (
                    <SelectGroup key={semName}>
                      <SelectLabel className="font-bold text-xs uppercase tracking-wider text-primary bg-primary/5 py-1.5 px-2 rounded my-1 flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" />
                        Semestre: {semName}
                      </SelectLabel>
                      {cohorts.map((cohort) => (
                        <SelectItem key={cohort.id} value={cohort.id} className="pl-4">
                          <div className="flex items-center justify-between w-full gap-4">
                            <span className="font-medium">{cohort.name}</span>
                            <span className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              {cohort.student_count || 0} alumno(s)
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedCohort && (
            <div className="rounded-lg border bg-primary/5 border-primary/20 p-3 space-y-1.5 text-xs text-foreground">
              <div className="flex items-center gap-1.5 font-bold text-primary">
                <CheckCircle2 className="h-4 w-4" />
                <span>Resumen de la Migración</span>
              </div>
              <p className="leading-relaxed">
                Se inscribirán <strong>{selectedCohort.student_count || 0} estudiante(s)</strong>{' '}
                del grupo <strong>{selectedCohort.name}</strong> (Semestre:{' '}
                <strong>{selectedCohort.semesterName}</strong>) en este grupo actual.
              </p>
              <p className="text-[11px] text-muted-foreground">
                Los alumnos que ya se encuentren matriculados en este grupo no serán duplicados.
              </p>
            </div>
          )}

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
            <Button
              type="submit"
              size="sm"
              disabled={isPending || otherCohorts.length === 0 || !selectedCohortId}
              className="gap-1.5"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Migrando...
                </>
              ) : (
                <>
                  <Users className="h-4 w-4" />
                  Migrar Alumnos
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
