'use client';

import { useState, useTransition } from 'react';

import Link from 'next/link';

import {
  FileText,
  GripVertical,
  HelpCircle,
  PlusCircle,
  Trash2,
  Video,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import { Textarea } from '@kit/ui/textarea';

import {
  createLessonAction,
  deleteLessonAction,
  reorderLessonsAction,
  updateLessonAction,
} from '~/lib/lms/server/actions/lesson.actions';
import {
  createModuleAction,
  deleteModuleAction,
  reorderModulesAction,
  updateModuleAction,
} from '~/lib/lms/server/actions/module.actions';
import { extractYouTubeId } from '~/lib/lms/utils/youtube';

interface Lesson {
  id: string;
  title: string;
  order_index: number;
  lesson_blocks?: any[];
}

interface Module {
  id: string;
  title: string;
  order_index: number;
  lessons: Lesson[];
}

export function CourseBuilder({
  courseId,
  initialModules,
}: {
  courseId: string;
  initialModules: Module[];
}) {
  const [modules, setModules] = useState<Module[]>(initialModules);
  const [isPending, startTransition] = useTransition();

  // Modals state
  const [isCreateModuleOpen, setIsCreateModuleOpen] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState('');

  const [isEditModuleOpen, setIsEditModuleOpen] = useState(false);
  const [activeModule, setActiveModule] = useState<Module | null>(null);
  const [editModuleTitle, setEditModuleTitle] = useState('');

  const [isCreateLessonOpen, setIsCreateLessonOpen] = useState(false);
  const [newLessonTitle, setNewLessonTitle] = useState('');

  // Drag and Drop state
  const [draggedModuleIndex, setDraggedModuleIndex] = useState<number | null>(
    null,
  );
  const [draggedLessonInfo, setDraggedLessonInfo] = useState<{
    moduleIndex: number;
    lessonIndex: number;
  } | null>(null);

  const handleModuleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedModuleIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
      if (e.target instanceof HTMLElement) e.target.style.opacity = '0.4';
    }, 0);
  };

  const handleModuleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleModuleDragEnd = (e: React.DragEvent) => {
    if (e.target instanceof HTMLElement) e.target.style.opacity = '1';
    setDraggedModuleIndex(null);
  };

  const handleModuleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedModuleIndex === null || draggedModuleIndex === targetIndex)
      return;

    const newModules = [...modules];
    const draggedItem = newModules[draggedModuleIndex];
    if (!draggedItem) return;
    newModules.splice(draggedModuleIndex, 1);
    newModules.splice(targetIndex, 0, draggedItem);

    const updatedModules = newModules.map((m, idx) => ({
      ...m,
      order_index: idx,
    }));
    setModules(updatedModules);

    startTransition(async () => {
      try {
        await reorderModulesAction({
          modules: updatedModules.map((m) => ({
            id: m.id,
            order_index: m.order_index,
          })),
        });
        toast.success('Orden de unidades guardado');
      } catch (e: any) {
        toast.error(e.message || 'Error al guardar el nuevo orden');
      }
    });
  };

  const handleLessonDragStart = (
    e: React.DragEvent,
    moduleIndex: number,
    lessonIndex: number,
  ) => {
    e.stopPropagation();
    setDraggedLessonInfo({ moduleIndex, lessonIndex });
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
      if (e.target instanceof HTMLElement) e.target.style.opacity = '0.4';
    }, 0);
  };

  const handleLessonDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleLessonDragEnd = (e: React.DragEvent) => {
    e.stopPropagation();
    if (e.target instanceof HTMLElement) e.target.style.opacity = '1';
    setDraggedLessonInfo(null);
  };

  const handleLessonDrop = (
    e: React.DragEvent,
    targetModuleIndex: number,
    targetLessonIndex: number,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (
      !draggedLessonInfo ||
      draggedLessonInfo.moduleIndex !== targetModuleIndex ||
      draggedLessonInfo.lessonIndex === targetLessonIndex
    ) {
      return;
    }

    const newModules = [...modules];
    const sourceModule = newModules[targetModuleIndex];
    if (!sourceModule) return;
    const targetModule = { ...sourceModule };
    const newLessons = [...(targetModule.lessons || [])];

    const draggedItem = newLessons[draggedLessonInfo.lessonIndex];
    if (!draggedItem) return;
    newLessons.splice(draggedLessonInfo.lessonIndex, 1);
    newLessons.splice(targetLessonIndex, 0, draggedItem);

    const updatedLessons = newLessons.map((l, idx) => ({
      ...l,
      order_index: idx,
    }));
    targetModule.lessons = updatedLessons;
    newModules[targetModuleIndex] = targetModule as Module;

    setModules(newModules);

    startTransition(async () => {
      try {
        await reorderLessonsAction({
          lessons: updatedLessons.map((l) => ({
            id: l.id,
            order_index: l.order_index,
          })),
        });
        toast.success('Orden de lecciones guardado');
      } catch (e: any) {
        toast.error(e.message || 'Error al guardar el nuevo orden');
      }
    });
  };

  const handleCreateModule = async () => {
    if (!newModuleTitle.trim()) return;
    startTransition(async () => {
      try {
        const result = await createModuleAction({
          course_id: courseId,
          title: newModuleTitle.trim(),
          order_index: modules.length,
        });
        if (result) {
          setModules([...modules, { ...result, lessons: [] } as any]);
          toast.success('Unidad creada correctamente');
          setNewModuleTitle('');
          setIsCreateModuleOpen(false);
        }
      } catch (error: any) {
        toast.error(error.message || 'Ocurrió un error al crear la unidad');
      }
    });
  };

  const handleEditModule = async () => {
    if (!activeModule || !editModuleTitle.trim()) return;
    startTransition(async () => {
      try {
        const result = await updateModuleAction({
          id: activeModule.id,
          title: editModuleTitle.trim(),
        });
        if (result) {
          setModules(
            modules.map((m) =>
              m.id === activeModule.id ? { ...m, title: result.title } : m,
            ),
          );
          toast.success('Unidad actualizada');
          setIsEditModuleOpen(false);
        }
      } catch (error: any) {
        toast.error(error.message || 'Error al actualizar la unidad');
      }
    });
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (
      !confirm(
        '¿Estás seguro de que quieres eliminar esta unidad? (Soft delete)',
      )
    )
      return;
    startTransition(async () => {
      try {
        await deleteModuleAction({ id: moduleId });
        setModules(modules.filter((m) => m.id !== moduleId));
        toast.success('Unidad eliminada');
      } catch (error: any) {
        toast.error(error.message || 'Error al eliminar la unidad');
      }
    });
  };

  const handleCreateLesson = async () => {
    if (!activeModule || !newLessonTitle.trim()) return;
    startTransition(async () => {
      try {
        const lesson = await createLessonAction({
          module_id: activeModule.id,
          title: newLessonTitle.trim(),
          order_index: activeModule.lessons?.length || 0,
          is_published: true,
        });
        if (lesson) {
          setModules(
            modules.map((m) =>
              m.id === activeModule.id
                ? { ...m, lessons: [...m.lessons, lesson as any] }
                : m,
            ),
          );
          toast.success('Lección creada');
          setNewLessonTitle('');
          setIsCreateLessonOpen(false);
        }
      } catch (error: any) {
        toast.error(error.message || 'Error al crear la lección');
      }
    });
  };

  const handleDeleteLesson = async (moduleId: string, lessonId: string) => {
    if (
      !confirm(
        '¿Estás seguro de que quieres eliminar esta lección? (Soft delete)',
      )
    )
      return;
    startTransition(async () => {
      try {
        await deleteLessonAction({ id: lessonId });
        setModules(
          modules.map((m) =>
            m.id === moduleId
              ? { ...m, lessons: m.lessons.filter((l) => l.id !== lessonId) }
              : m,
          ),
        );
        toast.success('Lección eliminada');
      } catch (error: any) {
        toast.error(error.message || 'Error al eliminar la lección');
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => setIsCreateModuleOpen(true)}
        >
          <PlusCircle className="h-4 w-4" /> Agregar Unidad
        </Button>
      </div>

      {modules.length === 0 ? (
        <div className="bg-muted/30 rounded-lg border-2 border-dashed p-12 text-center">
          <p className="text-muted-foreground mb-4">
            Aún no hay unidades en esta materia.
          </p>
          <Button onClick={() => setIsCreateModuleOpen(true)}>
            Crear la primera unidad
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {modules.map((mod, modIdx) => (
            <div
              key={mod.id}
              className="bg-card text-card-foreground overflow-hidden rounded-md border"
              draggable
              onDragStart={(e) => handleModuleDragStart(e, modIdx)}
              onDragOver={handleModuleDragOver}
              onDragEnd={handleModuleDragEnd}
              onDrop={(e) => handleModuleDrop(e, modIdx)}
            >
              <div className="bg-muted/40 flex items-center justify-between border-b p-4">
                <div className="flex items-center gap-3">
                  <div className="hover:bg-muted text-muted-foreground -ml-1 cursor-grab rounded p-1 active:cursor-grabbing">
                    <GripVertical className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold">{mod.title}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setActiveModule(mod);
                      setEditModuleTitle(mod.title);
                      setIsEditModuleOpen(true);
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => handleDeleteModule(mod.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2 p-4">
                {mod.lessons.length === 0 ? (
                  <p className="text-muted-foreground pl-8 text-sm italic">
                    No hay lecciones en esta unidad.
                  </p>
                ) : (
                  mod.lessons.map((lesson, lessonIdx) => {
                    const blocks = lesson.lesson_blocks || [];
                    const hasActivity = blocks.some((b: any) => b.type === 'activity' || b.type === 'quiz');
                    const hasVideo = blocks.some((b: any) => b.type === 'video');
                    const hasPdf = blocks.some((b: any) => b.type === 'pdf');
                    
                    let Icon = FileText;
                    if (hasActivity) Icon = HelpCircle;
                    else if (hasVideo) Icon = Video;
                    else if (hasPdf) Icon = FileText;

                    return (
                    <div
                      key={lesson.id}
                      className="hover:bg-muted/50 bg-background ml-8 flex items-center justify-between rounded-md border p-3 transition-colors"
                      draggable
                      onDragStart={(e) =>
                        handleLessonDragStart(e, modIdx, lessonIdx)
                      }
                      onDragOver={handleLessonDragOver}
                      onDragEnd={handleLessonDragEnd}
                      onDrop={(e) => handleLessonDrop(e, modIdx, lessonIdx)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="hover:bg-muted text-muted-foreground -ml-1 cursor-grab rounded p-1 active:cursor-grabbing">
                          <GripVertical className="h-4 w-4" />
                        </div>
                        <Icon className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{lesson.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/home/admin-courses/${courseId}/lesson/${lesson.id}`}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs"
                          >
                            Editar
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive h-8 w-8"
                          onClick={() => handleDeleteLesson(mod.id, lesson.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    );
                  })
                )}

                <div className="pt-2 pl-8">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-primary gap-1 text-xs"
                    onClick={() => {
                      setActiveModule(mod);
                      setNewLessonTitle('');
                      setIsCreateLessonOpen(true);
                    }}
                  >
                    <PlusCircle className="h-3 w-3" /> Agregar Lección o
                    Actividad
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE MODULE MODAL */}
      <Dialog open={isCreateModuleOpen} onOpenChange={setIsCreateModuleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nueva Unidad</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="new-module-title">Título de la unidad</Label>
            <Input
              id="new-module-title"
              value={newModuleTitle}
              onChange={(e) => setNewModuleTitle(e.target.value)}
              className="mt-2"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateModuleOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateModule}
              disabled={isPending || !newModuleTitle.trim()}
            >
              {isPending ? 'Creando...' : 'Crear Unidad'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT MODULE MODAL */}
      <Dialog open={isEditModuleOpen} onOpenChange={setIsEditModuleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Unidad</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="edit-module-title">Título de la unidad</Label>
            <Input
              id="edit-module-title"
              value={editModuleTitle}
              onChange={(e) => setEditModuleTitle(e.target.value)}
              className="mt-2"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditModuleOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleEditModule}
              disabled={isPending || !editModuleTitle.trim()}
            >
              {isPending ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CREATE LESSON MODAL */}
      <Dialog open={isCreateLessonOpen} onOpenChange={setIsCreateLessonOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Lección</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="new-lesson-title">Título de la lección</Label>
              <Input
                id="new-lesson-title"
                value={newLessonTitle}
                onChange={(e) => setNewLessonTitle(e.target.value)}
                className="mt-2"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateLessonOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateLesson}
              disabled={isPending || !newLessonTitle.trim()}
            >
              {isPending ? 'Creando...' : 'Crear Lección'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
