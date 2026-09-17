'use client';

import { useState, useTransition } from 'react';

import { useRouter } from 'next/navigation';

import { ArrowLeft, FileText, HelpCircle, Save } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import { Textarea } from '@kit/ui/textarea';

import { updateLessonAction } from '~/lib/lms/server/actions/lesson.actions';
import { extractYouTubeId } from '~/lib/lms/utils/youtube';

import { QuizBuilder } from './quiz-builder';

interface Lesson {
  id: string;
  title: string;
  type?: string;
  video_url?: string;
  content?: string;
  order_index: number;
}

export function LessonEditor({
  courseId,
  lesson,
}: {
  courseId: string;
  lesson: Lesson;
  initialBlocks?: any[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [editLessonTitle, setEditLessonTitle] = useState(lesson.title);
  const [editLessonType, setEditLessonType] = useState<string>(lesson.type || 'text');
  const [editLessonVideoUrl, setEditLessonVideoUrl] = useState(
    lesson.video_url || '',
  );
  const [editLessonContent, setEditLessonContent] = useState(
    lesson.content || '',
  );
  const [isUploading, setIsUploading] = useState(false);

  const handleSave = async () => {
    if (!editLessonTitle.trim()) return;
    startTransition(async () => {
      try {
        await updateLessonAction({
          id: lesson.id,
          title: editLessonTitle.trim(),
          type: editLessonType || undefined,
          video_url: editLessonVideoUrl || undefined,
          content: editLessonContent || undefined,
        });

        toast.success('Lección guardada exitosamente');
        router.push(`/home/admin-courses/${courseId}`);
      } catch (error: any) {
        console.error(error);
        toast.error(error.message || 'Error al guardar la lección');
      }
    });
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const client = getSupabaseBrowserClient();
      const fileExt = file.name.split('.').pop();
      const fileName = `${lesson.id}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { data, error } = await client.storage
        .from('courses_media')
        .upload(`pdfs/${fileName}`, file);

      if (error) throw error;

      const { data: publicUrlData } = client.storage
        .from('courses_media')
        .getPublicUrl(`pdfs/${fileName}`);

      setEditLessonContent(publicUrlData.publicUrl);
      toast.success('PDF subido correctamente');
    } catch (error) {
      console.error(error);
      toast.error('Error al subir el PDF. Verifica que el bucket exista.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-background flex min-h-screen flex-col">
      {/* Header */}
      <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 flex items-center justify-between border-b px-6 py-4 backdrop-blur">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="mt-0.5 flex-shrink-0"
            onClick={() => router.push(`/home/admin-courses/${courseId}`)}
          >
            <ArrowLeft
              className="h-5 w-5 text-zinc-900"
              strokeWidth={2.5}
            />
          </Button>
          <div className="flex flex-col">
            <h1 className="mt-1 mb-1.5 text-xl leading-none font-bold">
              Editar Lección
            </h1>
            <p className="text-muted-foreground text-sm leading-none">
              {editLessonTitle || 'Lección sin título'}
            </p>
          </div>
        </div>
        <Button
          onClick={handleSave}
          disabled={isPending || !editLessonTitle.trim()}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          {isPending ? 'Guardando...' : 'Guardar Lección'}
        </Button>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-5xl flex-1 p-6">
        <Tabs defaultValue="edit" className="flex h-full flex-col">
          <TabsList className="mx-auto mb-8 grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="edit">Editor de Contenido</TabsTrigger>
            <TabsTrigger value="preview">Vista Previa</TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="flex-1 space-y-6">
            <div className="mb-4 rounded-lg border border-purple-200 bg-purple-50 p-4 text-sm text-purple-800 flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-purple-100 p-1">
                <HelpCircle className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <h4 className="font-semibold text-purple-900 mb-1">Guía Rápida: Editor de Lecciones</h4>
                <p className="leading-relaxed">
                  Asegúrate de seleccionar el <strong>Tipo de Contenido</strong> adecuado. Si eliges "Video", pega solo el enlace en el campo destinado para ello.
                  Si eliges "Texto" o "Cuestionario", usa la caja de contenido principal. No olvides hacer clic en <strong>Guardar Lección</strong> al finalizar.
                </p>
              </div>
            </div>

            <div className="bg-card grid grid-cols-1 gap-6 rounded-lg border p-6 md:grid-cols-2">
              <div>
                <Label htmlFor="edit-lesson-title">Título de la Lección</Label>
                <Input
                  id="edit-lesson-title"
                  value={editLessonTitle}
                  onChange={(e) => setEditLessonTitle(e.target.value)}
                  className="mt-2 text-lg font-medium"
                />
              </div>
              <div>
                <Label>Tipo de Contenido</Label>
                <Select
                  value={editLessonType}
                  onValueChange={setEditLessonType}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Seleccionar tipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="text">Texto / Artículo</SelectItem>
                    <SelectItem value="pdf">Documento PDF</SelectItem>
                    <SelectItem value="quiz">Cuestionario</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editLessonType === 'video' && (
                <div className="md:col-span-2">
                  <Label htmlFor="video_url">URL del Video (YouTube)</Label>
                  <Input
                    id="video_url"
                    value={editLessonVideoUrl}
                    onChange={(e) => setEditLessonVideoUrl(e.target.value)}
                    className="mt-2"
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                </div>
              )}
            </div>

            <div className="bg-card flex min-h-[500px] flex-col rounded-lg border p-6">
              {(editLessonType === 'text' || editLessonType === 'video') && (
                <>
                  <Label
                    htmlFor="content"
                    className="mb-4 text-lg font-semibold"
                  >
                    Contenido / Apuntes de la Lección
                  </Label>
                  <Textarea
                    id="content"
                    value={editLessonContent}
                    onChange={(e) => setEditLessonContent(e.target.value)}
                    className="min-h-[400px] flex-1 resize-y text-base leading-relaxed"
                    placeholder="Escribe aquí el contenido de la lección..."
                  />
                </>
              )}

              {editLessonType === 'quiz' && (
                <>
                  <Label className="mb-4 flex items-center gap-2 text-lg font-semibold">
                    <HelpCircle className="h-5 w-5 text-purple-500" />{' '}
                    Constructor de Cuestionario
                  </Label>
                  <div className="flex-1">
                    <QuizBuilder
                      courseId={courseId}
                      lessonId={lesson.id}
                      onSaved={(id) => console.log('Saved activity', id)}
                    />
                  </div>
                </>
              )}

              {editLessonType === 'pdf' && (
                <div className="bg-muted/20 flex flex-1 flex-col items-center justify-center rounded-lg border-2 border-dashed p-6">
                  <FileText className="text-muted-foreground mb-4 h-16 w-16" />
                  <h3 className="mb-2 text-xl font-semibold">Archivo PDF</h3>

                  {editLessonContent && editLessonContent.startsWith('http') ? (
                    <div className="mb-6 flex flex-col items-center">
                      <p className="mb-4 text-sm font-medium text-green-600">
                        PDF cargado correctamente
                      </p>
                      <a
                        href={editLessonContent}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary mb-4 max-w-md text-center break-all hover:underline"
                      >
                        {editLessonContent}
                      </a>
                    </div>
                  ) : (
                    <p className="text-muted-foreground mb-6 max-w-md text-center">
                      Sube un archivo PDF para que los estudiantes puedan
                      visualizarlo y descargarlo.
                    </p>
                  )}

                  <div className="relative">
                    <Button disabled={isUploading} size="lg">
                      {isUploading
                        ? 'Subiendo...'
                        : editLessonContent
                          ? 'Reemplazar PDF'
                          : 'Seleccionar archivo PDF'}
                    </Button>
                    <input
                      type="file"
                      accept="application/pdf"
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                      onChange={handlePdfUpload}
                      disabled={isUploading}
                    />
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="preview" className="flex-1">
            <div className="bg-background text-foreground mx-auto min-h-[600px] max-w-3xl rounded-lg border p-8 shadow-sm">
              <h2 className="mb-8 text-3xl font-bold text-foreground">
                {editLessonTitle || 'Lección sin título'}
              </h2>

              {editLessonType === 'video' && (
                <div className="mb-10 flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl bg-black shadow-md">
                  {editLessonVideoUrl &&
                  extractYouTubeId(editLessonVideoUrl) ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${extractYouTubeId(editLessonVideoUrl)}`}
                      className="h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  ) : (
                    <span className="text-muted-foreground">
                      Ingresa una URL de YouTube válida
                    </span>
                  )}
                </div>
              )}

              {(editLessonType === 'text' || editLessonType === 'video') && (
                <div className="prose prose-lg max-w-none">
                  {editLessonContent ? (
                    <div className="whitespace-pre-wrap">
                      {editLessonContent}
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic">
                      No hay contenido escrito para esta lección.
                    </p>
                  )}
                </div>
              )}

              {editLessonType === 'pdf' && (
                <div className="bg-card flex min-h-[400px] flex-col items-center justify-center rounded-xl border p-8 shadow-sm">
                  <FileText className="text-muted-foreground mx-auto mb-6 h-16 w-16" />
                  {editLessonContent && editLessonContent.startsWith('http') ? (
                    <>
                      <h3 className="mb-4 text-center text-2xl font-semibold">
                        Visualizador de PDF
                      </h3>
                      <p className="text-muted-foreground mb-6 text-center">
                        En la vista del estudiante, el PDF se incrustará
                        directamente aquí.
                      </p>
                      <a
                        href={editLessonContent}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Button variant="outline">
                          Ver PDF en nueva pestaña
                        </Button>
                      </a>
                    </>
                  ) : (
                    <>
                      <h3 className="mb-2 text-xl font-semibold">
                        Aún no has subido un PDF
                      </h3>
                      <p className="text-muted-foreground">
                        Vuelve a la pestaña "Editor de Contenido" para subir el
                        archivo.
                      </p>
                    </>
                  )}
                </div>
              )}

              {editLessonType === 'quiz' && (
                <div className="bg-card rounded-xl border p-8 shadow-sm">
                  <div className="mb-8 flex items-center gap-3 text-purple-600">
                    <HelpCircle className="h-8 w-8" />
                    <h3 className="text-2xl font-semibold">Cuestionario</h3>
                  </div>

                  <p className="text-muted-foreground italic">
                    La vista previa de cuestionarios interactivos se muestra directamente en el constructor.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
