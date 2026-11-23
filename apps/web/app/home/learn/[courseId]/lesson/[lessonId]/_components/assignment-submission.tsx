'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Link2,
  Plus,
  Send,
  Trash2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';

import { getSupabaseBrowserClient } from '@kit/supabase/browser-client';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { Textarea } from '@kit/ui/textarea';

import { submitAssignmentAction } from '~/lib/lms/server/actions/activity.actions';

export interface SubmittedFile {
  name: string;
  url: string;
}

export interface SubmittedLink {
  label: string;
  url: string;
}

export interface AssignmentSubmissionData {
  id: string;
  status: string;
  score: number | null;
  completed_at: string | null;
  files: SubmittedFile[];
  links: SubmittedLink[];
  comment: string;
}

interface AssignmentSubmissionProps {
  courseId: string;
  lessonId: string;
  lessonTitle: string;
  initialSubmission?: AssignmentSubmissionData | null;
}

export function AssignmentSubmission({
  courseId,
  lessonId,
  lessonTitle,
  initialSubmission,
}: AssignmentSubmissionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);

  const [files, setFiles] = useState<SubmittedFile[]>(
    initialSubmission?.files || [],
  );
  const [links, setLinks] = useState<SubmittedLink[]>(
    initialSubmission?.links || [],
  );
  const [comment, setComment] = useState<string>(
    initialSubmission?.comment || '',
  );
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');

  const [status, setStatus] = useState<string | null>(
    initialSubmission?.status || null,
  );
  const [score, setScore] = useState<number | null>(
    initialSubmission?.score ?? null,
  );

  const isGraded = status === 'passed' || status === 'failed';

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setIsUploading(true);
    try {
      const client = getSupabaseBrowserClient();
      const uploaded: SubmittedFile[] = [];

      for (const file of Array.from(selectedFiles)) {
        const ext = file.name.split('.').pop() || 'pdf';
        const safeName = `${lessonId}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
        const path = `assignments/${lessonId}/${safeName}`;

        const { error } = await client.storage
          .from('courses_media')
          .upload(path, file);

        if (error) throw error;

        const { data: publicUrlData } = client.storage
          .from('courses_media')
          .getPublicUrl(path);

        uploaded.push({
          name: file.name,
          url: publicUrlData.publicUrl,
        });
      }

      setFiles((prev) => [...prev, ...uploaded]);
      toast.success(
        uploaded.length === 1
          ? 'Documento adjuntado correctamente'
          : `${uploaded.length} documentos adjuntados correctamente`,
      );
      e.target.value = '';
    } catch (error) {
      console.error(error);
      toast.error('Error al subir el documento. Intenta nuevamente.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddLink = () => {
    const trimmed = newLinkUrl.trim();
    if (!trimmed) return;
    const normalized =
      trimmed.startsWith('http://') || trimmed.startsWith('https://')
        ? trimmed
        : `https://${trimmed}`;
    const label = newLinkLabel.trim() || normalized;

    setLinks((prev) => [...prev, { label, url: normalized }]);
    setNewLinkLabel('');
    setNewLinkUrl('');
  };

  const handleSubmit = () => {
    if (files.length === 0 && links.length === 0 && !comment.trim()) {
      toast.error(
        'Adjunta al menos un documento, un enlace o un comentario para enviar tu tarea.',
      );
      return;
    }

    startTransition(async () => {
      try {
        await submitAssignmentAction({
          course_id: courseId,
          lesson_id: lessonId,
          lesson_title: lessonTitle,
          files,
          links,
          comment: comment.trim() || undefined,
        });

        setStatus('needs_grading');
        toast.success('¡Tarea enviada correctamente!');
        router.refresh();
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || 'Error al enviar la tarea');
      }
    });
  };

  return (
    <div className="bg-card space-y-5 rounded-xl border p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
        <div>
          <h3 className="text-foreground text-base font-bold sm:text-lg">
            Tu Entrega de Tarea
          </h3>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Sube tus documentos o enlaces para que el profesor los revise.
          </p>
        </div>

        {status === 'needs_grading' && (
          <Badge
            variant="outline"
            className="gap-1.5 border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
          >
            <Clock className="h-3.5 w-3.5" />
            Enviada • En revisión
          </Badge>
        )}

        {isGraded && score !== null && (
          <Badge
            variant="outline"
            className={`gap-1.5 ${
              status === 'passed'
                ? 'border-green-300 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/40 dark:text-green-400'
                : 'border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Calificada: {(score / 20).toFixed(1)} / 5.0
          </Badge>
        )}
      </div>

      {/* Subir documentos */}
      <div className="space-y-3 rounded-lg border p-3.5 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label className="text-foreground flex items-center gap-2 text-sm font-medium">
            <FileText className="h-4 w-4 text-red-500" />
            Documentos adjuntos ({files.length})
          </Label>

          {!isGraded && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-foreground"
                disabled={isUploading || isPending}
                onClick={() =>
                  document.getElementById('student-assignment-upload')?.click()
                }
              >
                <Upload className="mr-2 h-4 w-4" />
                {isUploading ? 'Subiendo...' : 'Subir Documento / PDF'}
              </Button>
              <input
                id="student-assignment-upload"
                type="file"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.ppt,.pptx,.xls,.xlsx,.txt,.zip"
                multiple
                className="hidden"
                onChange={handleFileUpload}
              />
            </>
          )}
        </div>

        {files.length > 0 ? (
          <div className="space-y-2">
            {files.map((file, idx) => (
              <div
                key={`${file.url}-${idx}`}
                className="bg-muted/40 flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-w-0 items-center gap-2 text-blue-600 hover:underline dark:text-blue-400"
                >
                  <FileText className="h-4 w-4 shrink-0 text-red-500" />
                  <span className="truncate font-medium">{file.name}</span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                </a>
                {!isGraded && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-red-500 hover:text-red-700"
                    onClick={() =>
                      setFiles((prev) => prev.filter((_, i) => i !== idx))
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-xs">
            Aún no has subido ningún documento.
          </p>
        )}
      </div>

      {/* Enlaces opcionales */}
      {!isGraded && (
        <div className="space-y-3 rounded-lg border p-3.5 sm:p-4">
          <Label className="text-foreground flex items-center gap-2 text-sm font-medium">
            <Link2 className="h-4 w-4 text-blue-500" />
            Enlaces de entrega (opcional)
          </Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={newLinkLabel}
              onChange={(e) => setNewLinkLabel(e.target.value)}
              placeholder="Nombre (opcional)"
              className="sm:w-1/3"
            />
            <Input
              value={newLinkUrl}
              onChange={(e) => setNewLinkUrl(e.target.value)}
              placeholder="https://drive.google.com/..."
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
          {links.length > 0 && (
            <div className="space-y-2">
              {links.map((link, idx) => (
                <div
                  key={`${link.url}-${idx}`}
                  className="bg-muted/40 flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-w-0 items-center gap-2 text-blue-600 hover:underline dark:text-blue-400"
                  >
                    <ExternalLink className="h-4 w-4 shrink-0" />
                    <span className="truncate font-medium">{link.label}</span>
                  </a>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-red-500 hover:text-red-700"
                    onClick={() =>
                      setLinks((prev) => prev.filter((_, i) => i !== idx))
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {isGraded && links.length > 0 && (
        <div className="space-y-2 rounded-lg border p-3.5 sm:p-4">
          <Label className="text-foreground flex items-center gap-2 text-sm font-medium">
            <Link2 className="h-4 w-4 text-blue-500" />
            Enlaces enviados
          </Label>
          {links.map((link, idx) => (
            <a
              key={`${link.url}-${idx}`}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-muted/40 flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-blue-600 hover:underline dark:text-blue-400"
            >
              <ExternalLink className="h-4 w-4 shrink-0" />
              <span className="truncate font-medium">{link.label}</span>
            </a>
          ))}
        </div>
      )}

      {/* Comentario del estudiante */}
      <div className="space-y-2">
        <Label
          htmlFor="student-assignment-comment"
          className="text-foreground text-sm font-medium"
        >
          Comentario para el profesor (opcional)
        </Label>
        <Textarea
          id="student-assignment-comment"
          value={comment}
          disabled={isGraded}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Escribe aquí cualquier nota o aclaración sobre tu entrega..."
          className="min-h-[90px] resize-y text-sm"
        />
      </div>

      {!isGraded && (
        <div className="flex justify-end">
          <Button
            type="button"
            disabled={isPending || isUploading}
            onClick={handleSubmit}
            className="w-full gap-2 sm:w-auto"
          >
            <Send className="h-4 w-4" />
            {isPending
              ? 'Enviando...'
              : status === 'needs_grading'
                ? 'Actualizar Entrega'
                : 'Enviar Tarea'}
          </Button>
        </div>
      )}
    </div>
  );
}
