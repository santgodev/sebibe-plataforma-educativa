'use client';

import { useState, useTransition } from 'react';

import { useRouter } from 'next/navigation';

import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  FileText,
  GripVertical,
  HelpCircle,
  Image as ImageIcon,
  Link,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

import { getSupabaseBrowserClient } from '@kit/supabase/browser-client';
import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Textarea } from '@kit/ui/textarea';

import {
  createLessonBlockAction,
  deleteLessonBlockAction,
  reorderLessonBlocksAction,
  updateLessonBlockAction,
} from '~/lib/lms/server/actions/lesson-block.actions';
import { updateLessonAction } from '~/lib/lms/server/actions/lesson.actions';

import { QuizBuilder } from '../[id]/_components/quiz-builder';

interface Lesson {
  id: string;
  title: string;
  order_index: number;
}

interface Block {
  id: string;
  lesson_id: string;
  type:
    | 'video'
    | 'text'
    | 'image'
    | 'quote'
    | 'pdf'
    | 'activity'
    | 'question'
    | 'button'
    | 'download';
  content: any;
  order_index: number;
}

export function LessonEditor({
  courseId,
  lesson,
  initialBlocks,
}: {
  courseId: string;
  lesson: Lesson;
  initialBlocks: Block[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [editLessonTitle, setEditLessonTitle] = useState(lesson.title);
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [isUploading, setIsUploading] = useState(false);

  const handleSaveLessonTitle = async () => {
    if (!editLessonTitle.trim() || editLessonTitle === lesson.title) return;
    try {
      await updateLessonAction({
        id: lesson.id,
        title: editLessonTitle.trim(),
      });
      toast.success('Título guardado');
      router.refresh();
    } catch (error) {
      toast.error('Error al guardar título');
    }
  };

  const handleAddBlock = async (type: Block['type']) => {
    startTransition(async () => {
      try {
        const order_index = blocks.length;
        const newBlockData = {
          lesson_id: lesson.id,
          type,
          content:
            type === 'text'
              ? { html: '' }
              : type === 'video'
                ? { url: '' }
                : {},
          order_index,
        };
        const newBlock = await createLessonBlockAction(newBlockData);
        setBlocks([...blocks, newBlock]);
        toast.success(`Bloque ${type} añadido`);
      } catch (error) {
        console.error(error);
        toast.error('Error al añadir bloque');
      }
    });
  };

  const handleDeleteBlock = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este bloque?')) return;
    startTransition(async () => {
      try {
        await deleteLessonBlockAction({ id });
        setBlocks(blocks.filter((b) => b.id !== id));
        toast.success('Bloque eliminado');
      } catch (error) {
        toast.error('Error al eliminar bloque');
      }
    });
  };

  const handleUpdateBlockContent = async (id: string, newContent: any) => {
    setBlocks(
      blocks.map((b) => (b.id === id ? { ...b, content: newContent } : b)),
    );
  };

  const handleSaveBlock = async (id: string) => {
    const block = blocks.find((b) => b.id === id);
    if (!block) return;
    startTransition(async () => {
      try {
        await updateLessonBlockAction({
          id: block.id,
          type: block.type,
          content: block.content,
          order_index: block.order_index,
        });
        toast.success('Bloque guardado');
      } catch (error) {
        toast.error('Error al guardar bloque');
      }
    });
  };

  const moveBlock = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === blocks.length - 1) return;

    const newBlocks = [...blocks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    // Swap
    const temp = newBlocks[index]!;
    newBlocks[index] = newBlocks[targetIndex]!;
    newBlocks[targetIndex] = temp;

    // Update order_index
    const updatedBlocks = newBlocks.map((b, i) => ({ ...b, order_index: i }));
    setBlocks(updatedBlocks);

    startTransition(async () => {
      try {
        await reorderLessonBlocksAction({
          blocks: updatedBlocks.map((b) => ({
            id: b.id,
            order_index: b.order_index,
          })),
        });
      } catch (error) {
        toast.error('Error al reordenar');
      }
    });
  };

  return (
    <div className="bg-background flex min-h-screen flex-col">
      <header className="bg-background/95 sticky top-0 z-10 flex items-center justify-between border-b px-6 py-4 backdrop-blur">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/home/admin-courses/${courseId}`)}
          >
            <ArrowLeft
              className="h-5 w-5 text-zinc-900"
              strokeWidth={2.5}
            />
          </Button>
          <div className="flex flex-col">
            <h1 className="mt-1 mb-1.5 text-xl leading-none font-bold">
              Constructor de Contenidos
            </h1>
            <p className="text-muted-foreground text-sm leading-none">
              Añade y organiza bloques de contenido para esta lección.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 space-y-8 p-6">
        {/* Título de Lección */}
        <div className="bg-card flex items-end gap-4 rounded-lg border p-6">
          <div className="flex-1">
            <Label htmlFor="lesson-title">Título de la Lección</Label>
            <Input
              id="lesson-title"
              value={editLessonTitle}
              onChange={(e) => setEditLessonTitle(e.target.value)}
              className="mt-2 text-xl font-bold"
            />
          </div>
          <Button variant="outline" onClick={handleSaveLessonTitle}>
            Guardar Título
          </Button>
        </div>

        {/* Lista de Bloques */}
        <div className="space-y-4">
          {blocks.length === 0 ? (
            <div className="bg-muted/20 rounded-lg border-2 border-dashed py-12 text-center">
              <p className="text-muted-foreground mb-4">
                Esta lección aún no tiene contenido.
              </p>
            </div>
          ) : (
            blocks.map((block, index) => (
              <div
                key={block.id}
                className="group bg-card relative rounded-lg border p-6 pr-16 shadow-sm"
              >
                {/* Botones de Reordenar y Eliminar */}
                <div className="absolute top-2 right-2 bottom-2 flex flex-col justify-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => moveBlock(index, 'up')}
                    disabled={index === 0}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => moveBlock(index, 'down')}
                    disabled={index === blocks.length - 1}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10 h-8 w-8"
                    onClick={() => handleDeleteBlock(block.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="text-muted-foreground mb-4 flex items-center gap-2 text-sm font-semibold tracking-wider uppercase">
                  <GripVertical className="h-4 w-4" />
                  Bloque: {block.type}
                </div>

                {/* Renderizador Específico del Bloque */}
                {block.type === 'video' && (
                  <div className="space-y-4">
                    <Label>URL de YouTube</Label>
                    <Input
                      value={block.content?.url || ''}
                      onChange={(e) =>
                        handleUpdateBlockContent(block.id, {
                          ...block.content,
                          url: e.target.value,
                        })
                      }
                      placeholder="https://www.youtube.com/watch?v=..."
                    />
                  </div>
                )}

                {block.type === 'text' && (
                  <div className="space-y-4">
                    <Label>Contenido de Texto</Label>
                    <Textarea
                      value={block.content?.html || ''}
                      onChange={(e) =>
                        handleUpdateBlockContent(block.id, {
                          ...block.content,
                          html: e.target.value,
                        })
                      }
                      className="min-h-[200px]"
                      placeholder="Escribe el contenido..."
                    />
                  </div>
                )}

                {block.type === 'pdf' && (
                  <div className="space-y-4">
                    <Label>URL del PDF</Label>
                    <Input
                      value={block.content?.url || ''}
                      onChange={(e) =>
                        handleUpdateBlockContent(block.id, {
                          ...block.content,
                          url: e.target.value,
                        })
                      }
                      placeholder="https://.../documento.pdf"
                    />
                  </div>
                )}

                {block.type === 'quote' && (
                  <div className="border-primary space-y-4 border-l-4 pl-4">
                    <Label>Cita Destacada</Label>
                    <Textarea
                      value={block.content?.text || ''}
                      onChange={(e) =>
                        handleUpdateBlockContent(block.id, {
                          ...block.content,
                          text: e.target.value,
                        })
                      }
                      placeholder="Ej. El éxito es la suma de pequeños esfuerzos..."
                    />
                  </div>
                )}

                {block.type === 'activity' && (
                  <div className="space-y-4">
                    <Label className="text-purple-600 mb-2 block font-semibold flex items-center gap-2">
                      <HelpCircle className="w-5 h-5"/> Constructor de Actividad / Cuestionario
                    </Label>
                    <QuizBuilder
                      courseId={courseId}
                      lessonId={lesson.id}
                      activityId={block.content?.activity_id}
                      onSaved={(activityId) => {
                        handleUpdateBlockContent(block.id, { ...block.content, activity_id: activityId });
                        // Optionally trigger save automatically
                        handleSaveBlock(block.id);
                      }}
                    />
                  </div>
                )}

                <div className="mt-4 flex justify-end">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleSaveBlock(block.id)}
                    disabled={isPending}
                  >
                    Guardar Cambios
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Añadir Bloque - Menú Tipo Notion */}
        <div className="bg-muted/30 rounded-lg border p-6">
          <Label className="mb-4 block text-lg font-semibold">
            Añadir Nuevo Bloque
          </Label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Button
              variant="outline"
              className="h-auto justify-start gap-2 py-3"
              onClick={() => handleAddBlock('text')}
            >
              <FileText className="h-5 w-5 text-blue-500" />
              <div className="flex flex-col items-start">
                <span className="font-semibold">Texto</span>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-auto justify-start gap-2 py-3"
              onClick={() => handleAddBlock('video')}
            >
              <ImageIcon className="h-5 w-5 text-red-500" />
              <div className="flex flex-col items-start">
                <span className="font-semibold">Video</span>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-auto justify-start gap-2 py-3"
              onClick={() => handleAddBlock('pdf')}
            >
              <Link className="h-5 w-5 text-orange-500" />
              <div className="flex flex-col items-start">
                <span className="font-semibold">PDF / Doc</span>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-auto justify-start gap-2 py-3"
              onClick={() => handleAddBlock('quote')}
            >
              <HelpCircle className="h-5 w-5 text-green-500" />
              <div className="flex flex-col items-start">
                <span className="font-semibold">Cita</span>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-auto justify-start gap-2 py-3"
              onClick={() => handleAddBlock('activity')}
            >
              <HelpCircle className="h-5 w-5 text-purple-500" />
              <div className="flex flex-col items-start">
                <span className="font-semibold">Cuestionario</span>
                <span className="text-muted-foreground text-[10px]">
                  Actividad Evaluada
                </span>
              </div>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
