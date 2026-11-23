'use client';

import { useState, useTransition } from 'react';

import { useRouter } from 'next/navigation';

import {
  ArrowLeft,
  ClipboardList,
  ExternalLink,
  FileText,
  HelpCircle,
  Link2,
  Plus,
  Save,
  Trash2,
  Upload,
  Video,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import { Textarea } from '@kit/ui/textarea';

import { updateLessonAction } from '~/lib/lms/server/actions/lesson.actions';
import {
  AssignmentData,
  parseAssignmentContent,
} from '~/lib/lms/utils/assignment';
import { extractYouTubeId } from '~/lib/lms/utils/youtube';

import { QuizBuilder } from './quiz-builder';
import { QuizViewer } from '../../../learn/[courseId]/lesson/[lessonId]/_components/quiz-viewer';

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
  initialBlocks,
  initialActivityId,
}: {
  courseId: string;
  lesson: Lesson;
  initialBlocks?: any[];
  initialActivityId?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activityId, setActivityId] = useState<string | undefined>(initialActivityId);

  const [editLessonTitle, setEditLessonTitle] = useState(lesson.title);
  const [editLessonType, setEditLessonType] = useState<string>(lesson.type || 'text');
  const [editLessonVideoUrl, setEditLessonVideoUrl] = useState(
    lesson.video_url || '',
  );
  const [editLessonContent, setEditLessonContent] = useState(
    lesson.content || '',
  );
  const [assignmentData, setAssignmentData] = useState<AssignmentData>(() =>
    parseAssignmentContent(lesson.content, lesson.video_url),
  );
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleSave = async () => {
    if (!editLessonTitle.trim()) return;
    startTransition(async () => {
      try {
        const payloadContent =
          editLessonType === 'assignment'
            ? JSON.stringify(assignmentData)
            : editLessonContent || undefined;
        const payloadVideoUrl =
          editLessonType === 'assignment'
            ? assignmentData.videos[0] || undefined
            : editLessonVideoUrl || undefined;

        await updateLessonAction({
          id: lesson.id,
          title: editLessonTitle.trim(),
          type: editLessonType || undefined,
          video_url: payloadVideoUrl,
          content: payloadContent,
        });

        toast.success('Lección guardada exitosamente');
        router.push(`/home/admin-courses/${courseId}`);
      } catch (error: any) {
        console.error(error);
        toast.error(error.message || 'Error al guardar la lección');
      }
    });
  };

  const handleAssignmentPdfUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const client = getSupabaseBrowserClient();
      const uploadedPdfs: { name: string; url: string }[] = [];

      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${lesson.id}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error } = await client.storage
          .from('courses_media')
          .upload(`pdfs/${fileName}`, file);

        if (error) throw error;

        const { data: publicUrlData } = client.storage
          .from('courses_media')
          .getPublicUrl(`pdfs/${fileName}`);

        uploadedPdfs.push({
          name: file.name,
          url: publicUrlData.publicUrl,
        });
      }

      setAssignmentData((prev) => ({
        ...prev,
        pdfs: [...prev.pdfs, ...uploadedPdfs],
      }));
      toast.success(
        uploadedPdfs.length === 1
          ? 'PDF adjuntado a la tarea'
          : `${uploadedPdfs.length} PDFs adjuntados a la tarea`,
      );
      e.target.value = '';
    } catch (error) {
      console.error(error);
      toast.error('Error al subir el PDF. Verifica que el bucket exista.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddLink = () => {
    const trimmedUrl = newLinkUrl.trim();
    if (!trimmedUrl) return;
    const normalizedUrl =
      trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')
        ? trimmedUrl
        : `https://${trimmedUrl}`;
    const label = newLinkLabel.trim() || normalizedUrl;

    setAssignmentData((prev) => ({
      ...prev,
      links: [...prev.links, { label, url: normalizedUrl }],
    }));
    setNewLinkLabel('');
    setNewLinkUrl('');
  };

  const handleAddVideo = () => {
    const trimmed = newVideoUrl.trim();
    if (!trimmed) return;
    if (!extractYouTubeId(trimmed)) {
      toast.error('Ingresa una URL de YouTube válida');
      return;
    }
    setAssignmentData((prev) => ({
      ...prev,
      videos: [...prev.videos, trimmed],
    }));
    setNewVideoUrl('');
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
                    <SelectItem value="assignment">Tarea / Asignación</SelectItem>
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
                      activityId={activityId}
                      onSaved={(id) => {
                        console.log('Saved activity', id);
                        setActivityId(id);
                      }}
                    />
                  </div>
                </>
              )}

              {editLessonType === 'assignment' && (
                <div className="flex flex-1 flex-col gap-6">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-amber-500" />
                    <h3 className="text-lg font-semibold">
                      Configuración de Tarea / Asignación
                    </h3>
                  </div>

                  {/* Instrucciones / Texto */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="assignment-instructions"
                      className="text-sm font-medium"
                    >
                      Instrucciones de la tarea
                    </Label>
                    <Textarea
                      id="assignment-instructions"
                      value={assignmentData.instructions}
                      onChange={(e) =>
                        setAssignmentData((prev) => ({
                          ...prev,
                          instructions: e.target.value,
                        }))
                      }
                      placeholder="Describe las instrucciones, criterios de entrega o detalles de la asignación..."
                      className="min-h-[180px] resize-y text-sm leading-relaxed"
                    />
                  </div>

                  {/* PDFs adjuntos */}
                  <div className="space-y-3 rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2 text-sm font-medium">
                        <FileText className="h-4 w-4 text-red-500" />
                        Documentos PDF ({assignmentData.pdfs.length})
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-foreground"
                        disabled={isUploading}
                        onClick={() =>
                          document
                            .getElementById('assignment-pdf-upload')
                            ?.click()
                        }
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {isUploading ? 'Subiendo...' : 'Subir PDF(s)'}
                      </Button>
                      <input
                        id="assignment-pdf-upload"
                        type="file"
                        accept=".pdf"
                        multiple
                        className="hidden"
                        onChange={handleAssignmentPdfUpload}
                      />
                    </div>
                    {assignmentData.pdfs.length > 0 ? (
                      <div className="space-y-2">
                        {assignmentData.pdfs.map((pdf, idx) => (
                          <div
                            key={`${pdf.url}-${idx}`}
                            className="bg-muted/40 flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                          >
                            <a
                              href={pdf.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 truncate text-blue-600 hover:underline dark:text-blue-400"
                            >
                              <FileText className="h-4 w-4 shrink-0 text-red-500" />
                              <span className="truncate">{pdf.name}</span>
                            </a>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-500 hover:text-red-700"
                              onClick={() =>
                                setAssignmentData((prev) => ({
                                  ...prev,
                                  pdfs: prev.pdfs.filter((_, i) => i !== idx),
                                }))
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-xs">
                        No hay PDFs adjuntos todavía.
                      </p>
                    )}
                  </div>

                  {/* Enlaces de referencia */}
                  <div className="space-y-3 rounded-lg border p-4">
                    <Label className="flex items-center gap-2 text-sm font-medium">
                      <Link2 className="h-4 w-4 text-blue-500" />
                      Enlaces / Links de apoyo ({assignmentData.links.length})
                    </Label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        value={newLinkLabel}
                        onChange={(e) => setNewLinkLabel(e.target.value)}
                        placeholder="Título del enlace (opcional)"
                        className="sm:w-1/3"
                      />
                      <Input
                        value={newLinkUrl}
                        onChange={(e) => setNewLinkUrl(e.target.value)}
                        placeholder="https://ejemplo.com/recurso"
                        className="flex-1"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddLink();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-foreground"
                        onClick={handleAddLink}
                      >
                        <Plus className="mr-1 h-4 w-4" />
                        Agregar
                      </Button>
                    </div>
                    {assignmentData.links.length > 0 && (
                      <div className="space-y-2">
                        {assignmentData.links.map((link, idx) => (
                          <div
                            key={`${link.url}-${idx}`}
                            className="bg-muted/40 flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                          >
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 truncate text-blue-600 hover:underline dark:text-blue-400"
                            >
                              <ExternalLink className="h-4 w-4 shrink-0" />
                              <span className="truncate font-medium">
                                {link.label}
                              </span>
                            </a>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-500 hover:text-red-700"
                              onClick={() =>
                                setAssignmentData((prev) => ({
                                  ...prev,
                                  links: prev.links.filter((_, i) => i !== idx),
                                }))
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Videos de YouTube */}
                  <div className="space-y-3 rounded-lg border p-4">
                    <Label className="flex items-center gap-2 text-sm font-medium">
                      <Video className="h-4 w-4 text-purple-500" />
                      Videos de YouTube ({assignmentData.videos.length})
                    </Label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        value={newVideoUrl}
                        onChange={(e) => setNewVideoUrl(e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="flex-1"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddVideo();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-foreground"
                        onClick={handleAddVideo}
                      >
                        <Plus className="mr-1 h-4 w-4" />
                        Agregar Video
                      </Button>
                    </div>
                    {assignmentData.videos.length > 0 && (
                      <div className="space-y-2">
                        {assignmentData.videos.map((videoUrl, idx) => (
                          <div
                            key={`${videoUrl}-${idx}`}
                            className="bg-muted/40 flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                          >
                            <span className="truncate font-mono text-xs">
                              {videoUrl}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-500 hover:text-red-700"
                              onClick={() =>
                                setAssignmentData((prev) => ({
                                  ...prev,
                                  videos: prev.videos.filter(
                                    (_, i) => i !== idx,
                                  ),
                                }))
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
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

              {editLessonType === 'assignment' && (
                <div className="bg-card space-y-6 rounded-xl border p-8 shadow-sm">
                  <div className="flex items-center gap-2 border-b pb-4">
                    <ClipboardList className="h-6 w-6 text-amber-500" />
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        Tarea / Asignación
                      </span>
                      <h2 className="text-2xl font-bold">{editLessonTitle}</h2>
                    </div>
                  </div>

                  {assignmentData.instructions ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap leading-relaxed">
                      {assignmentData.instructions}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm italic">
                      Sin instrucciones escritas todavía.
                    </p>
                  )}

                  {assignmentData.videos.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="flex items-center gap-2 text-sm font-semibold">
                        <Video className="h-4 w-4 text-purple-500" />
                        Videos de apoyo
                      </h3>
                      <div className="grid gap-4">
                        {assignmentData.videos.map((videoUrl, idx) => {
                          const ytId = extractYouTubeId(videoUrl);
                          return ytId ? (
                            <div
                              key={`${videoUrl}-${idx}`}
                              className="aspect-video w-full overflow-hidden rounded-lg bg-black"
                            >
                              <iframe
                                src={`https://www.youtube.com/embed/${ytId}`}
                                className="h-full w-full"
                                allowFullScreen
                              />
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}

                  {assignmentData.pdfs.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="flex items-center gap-2 text-sm font-semibold">
                        <FileText className="h-4 w-4 text-red-500" />
                        Documentos PDF adjuntos
                      </h3>
                      <div className="space-y-3">
                        {assignmentData.pdfs.map((pdf, idx) => (
                          <div
                            key={`${pdf.url}-${idx}`}
                            className="bg-muted/30 flex items-center justify-between rounded-lg border p-3"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <FileText className="h-4 w-4 shrink-0 text-red-500" />
                              <span className="truncate text-sm font-medium">
                                {pdf.name}
                              </span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-foreground"
                              asChild
                            >
                              <a
                                href={pdf.url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="mr-2 h-3.5 w-3.5" />
                                Abrir PDF
                              </a>
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {assignmentData.links.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="flex items-center gap-2 text-sm font-semibold">
                        <Link2 className="h-4 w-4 text-blue-500" />
                        Enlaces de referencia
                      </h3>
                      <div className="space-y-2">
                        {assignmentData.links.map((link, idx) => (
                          <a
                            key={`${link.url}-${idx}`}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-muted/30 hover:bg-muted/60 flex items-center justify-between rounded-lg border p-3 text-sm transition-colors"
                          >
                            <span className="font-medium text-blue-600 dark:text-blue-400">
                              {link.label}
                            </span>
                            <ExternalLink className="text-muted-foreground h-4 w-4 shrink-0" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {editLessonType === 'quiz' && (
                <div className="bg-card rounded-xl border p-8 shadow-sm">
                  {activityId ? (
                    <QuizViewer activityId={activityId} courseId={courseId} />
                  ) : (
                    <>
                      <div className="mb-8 flex items-center gap-3 text-purple-600">
                        <HelpCircle className="h-8 w-8" />
                        <h3 className="text-2xl font-semibold">Cuestionario</h3>
                      </div>
                      <p className="text-muted-foreground italic">
                        Guarda el cuestionario en la pestaña "Editor de Contenido" para ver la vista previa.
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
