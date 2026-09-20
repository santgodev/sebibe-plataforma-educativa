'use client';

import { useState } from 'react';

import { MessageCircle, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@kit/ui/button';
import { Textarea } from '@kit/ui/textarea';

import {
  addCommentAction,
  deleteCommentAction,
} from '~/lib/lms/server/actions/comments.actions';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface LessonCommentsProps {
  lessonId: string;
  currentUserId: string;
  currentUserDisplayName?: string;
  currentUserAvatarUrl?: string | null;
  canModerate: boolean; // true if admin or instructor
  initialComments: Comment[];
}

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'hace un momento';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return `hace ${Math.floor(diff / 86400)} días`;
}

function Avatar({ name, url }: { name: string | null; url: string | null }) {
  if (url) {
    return (
      <img
        src={url}
        alt={name || 'Avatar'}
        className="h-9 w-9 rounded-full object-cover ring-2 ring-white shadow-sm"
      />
    );
  }
  const initials = (name || 'A')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-600 ring-2 ring-white shadow-sm">
      {initials}
    </div>
  );
}

export function LessonComments({
  lessonId,
  currentUserId,
  currentUserDisplayName = 'Tú',
  currentUserAvatarUrl = null,
  canModerate,
  initialComments,
}: LessonCommentsProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newComment, setNewComment] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    setIsSending(true);
    try {
      const saved = await addCommentAction({
        lesson_id: lessonId,
        content: newComment.trim(),
      });

      // Optimistic add with current user info
      const optimistic: Comment = {
        id: (saved as any).id,
        content: (saved as any).content,
        created_at: (saved as any).created_at,
        user_id: currentUserId,
        display_name: currentUserDisplayName,
        avatar_url: currentUserAvatarUrl,
      };
      setComments((prev) => [optimistic, ...prev]);
      setNewComment('');
    } catch {
      toast.error('No se pudo publicar el comentario');
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCommentAction({ id });
      setComments((prev) => prev.filter((c) => c.id !== id));
      toast.success('Comentario eliminado');
    } catch {
      toast.error('No se pudo eliminar el comentario');
    }
  };

  return (
    <div className="rounded-xl border bg-white p-6">
      {/* Header */}
      <h3 className="mb-6 flex items-center gap-2 text-lg font-semibold text-zinc-800">
        <MessageCircle className="h-5 w-5 text-slate-500" />
        Comentarios
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
          {comments.length}
        </span>
      </h3>

      {/* New comment box */}
      <div className="mb-8 flex gap-3">
        <Avatar name={currentUserDisplayName} url={currentUserAvatarUrl} />
        <div className="flex-1">
          <Textarea
            placeholder="Escribe una pregunta o comentario sobre esta lección..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit();
            }}
            className="mb-2 min-h-[80px] resize-none rounded-xl border-slate-200 bg-slate-50 text-sm text-zinc-800 placeholder:text-zinc-400 focus:bg-white"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">Ctrl+Enter para enviar</span>
            <Button
              size="sm"
              disabled={isSending || !newComment.trim()}
              onClick={handleSubmit}
              className="gap-1.5 bg-slate-700 text-white hover:bg-slate-800"
            >
              <Send className="h-3.5 w-3.5" />
              {isSending ? 'Enviando...' : 'Publicar'}
            </Button>
          </div>
        </div>
      </div>

      {/* Comments list */}
      {comments.length === 0 ? (
        <p className="py-6 text-center text-sm text-zinc-400">
          Sé el primero en comentar esta lección.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {comments.map((comment) => {
            const canDelete =
              canModerate || comment.user_id === currentUserId;
            return (
              <li key={comment.id} className="group flex gap-3 py-4">
                <Avatar name={comment.display_name} url={comment.avatar_url} />
                <div className="flex-1">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-zinc-800">
                        {comment.display_name || 'Estudiante'}
                      </span>
                      <span className="text-xs text-zinc-400">
                        {timeAgo(comment.created_at)}
                      </span>
                    </div>
                    {canDelete && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-zinc-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                        onClick={() => handleDelete(comment.id)}
                        title="Eliminar comentario"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-zinc-700">
                    {comment.content}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
