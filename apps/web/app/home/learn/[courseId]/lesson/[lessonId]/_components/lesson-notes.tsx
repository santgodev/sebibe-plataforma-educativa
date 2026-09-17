'use client';

import { useState } from 'react';

import { ChevronDown, ChevronUp, Pencil, Plus, Save, StickyNote, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@kit/ui/button';
import { Textarea } from '@kit/ui/textarea';

import { saveNoteAction, deleteNoteAction } from '~/lib/lms/server/actions/notes.actions';

interface Note {
  id: string;
  content: string;
  created_at: string;
}

interface LessonNotesProps {
  lessonId: string;
  initialNotes: Note[];
}

export function LessonNotes({ lessonId, initialNotes }: LessonNotesProps) {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [newNote, setNewNote] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);

  const handleAdd = async () => {
    if (!newNote.trim()) return;
    setIsSaving(true);
    try {
      const saved = await saveNoteAction({ lesson_id: lessonId, content: newNote.trim() });
      setNotes((prev) => [saved as Note, ...prev]);
      setNewNote('');
      setIsAdding(false);
      toast.success('Nota guardada');
    } catch {
      toast.error('Error al guardar la nota');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = async (id: string) => {
    if (!editingContent.trim()) return;
    setIsSaving(true);
    try {
      const saved = await saveNoteAction({ lesson_id: lessonId, content: editingContent.trim(), id });
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, content: editingContent.trim() } : n)));
      setEditingId(null);
      toast.success('Nota actualizada');
    } catch {
      toast.error('Error al actualizar la nota');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNoteAction({ id });
      setNotes((prev) => prev.filter((n) => n.id !== id));
      toast.success('Nota eliminada');
    } catch {
      toast.error('Error al eliminar la nota');
    }
  };

  return (
    <div className="rounded-xl border bg-amber-50/50 p-6">
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => setIsCollapsed((v) => !v)}
          className="flex items-center gap-2 text-lg font-semibold text-zinc-800 hover:text-zinc-600 transition-colors"
        >
          <StickyNote className="h-5 w-5 text-amber-500" />
          Mis notas
          {isCollapsed
            ? <ChevronDown className="h-4 w-4 text-zinc-400" />
            : <ChevronUp className="h-4 w-4 text-zinc-400" />}
          <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
            {notes.length}
          </span>
        </button>
        {!isAdding && !isCollapsed && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 border-amber-300 bg-white text-amber-700 hover:bg-amber-50"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="h-4 w-4" /> Nueva nota
          </Button>
        )}
      </div>

      {!isCollapsed && (
        <>
          {/* New note form */}
          {isAdding && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-white p-3 shadow-sm">
              <Textarea
                autoFocus
                placeholder="Escribe tu nota aquí..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="mb-2 min-h-[80px] resize-none border-0 bg-transparent p-0 text-sm text-zinc-800 placeholder:text-zinc-400 focus-visible:ring-0"
              />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" className="text-zinc-500" onClick={() => { setIsAdding(false); setNewNote(''); }}>
                  <X className="h-4 w-4" />
                </Button>
                <Button size="sm" disabled={isSaving || !newNote.trim()} className="gap-1.5 bg-amber-500 text-white hover:bg-amber-600" onClick={handleAdd}>
                  <Save className="h-4 w-4" />
                  {isSaving ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
            </div>
          )}

          {/* Notes list */}
          {notes.length === 0 && !isAdding ? (
            <p className="text-center text-sm text-zinc-400 py-4">
              Aún no tienes notas en esta lección. ¡Agrega una!
            </p>
          ) : (
            <ul className="space-y-3">
              {notes.map((note) => (
                <li key={note.id} className="rounded-lg border border-amber-100 bg-white p-3 shadow-sm">
                  {editingId === note.id ? (
                    <>
                      <Textarea
                        autoFocus
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        className="mb-2 min-h-[70px] resize-none border-0 bg-transparent p-0 text-sm text-zinc-800 focus-visible:ring-0"
                      />
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" className="text-zinc-500" onClick={() => setEditingId(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                        <Button size="sm" disabled={isSaving} className="gap-1.5 bg-amber-500 text-white hover:bg-amber-600" onClick={() => handleEdit(note.id)}>
                          <Save className="h-4 w-4" /> Guardar
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <p className="flex-1 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">{note.content}</p>
                      <div className="flex shrink-0 gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-400 hover:text-zinc-700" onClick={() => { setEditingId(note.id); setEditingContent(note.content); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-400 hover:text-red-500" onClick={() => handleDelete(note.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
