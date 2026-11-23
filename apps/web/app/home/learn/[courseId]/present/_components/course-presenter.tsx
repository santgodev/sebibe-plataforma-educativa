'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  FileText,
  HelpCircle,
  Layers,
  Link2,
  List,
  Maximize2,
  Minimize2,
  Presentation,
  Video,
  X,
} from 'lucide-react';

import { Button } from '@kit/ui/button';

import { parseAssignmentContent } from '~/lib/lms/utils/assignment';
import { extractYouTubeId } from '~/lib/lms/utils/youtube';

interface LessonBlock {
  id: string;
  type: string;
  content: string | null;
  order_index: number;
}

interface PresenterLesson {
  id: string;
  title: string;
  type: string | null;
  content: string | null;
  video_url: string | null;
  order_index: number;
  lesson_blocks?: LessonBlock[];
}

interface PresenterModule {
  id: string;
  title: string;
  order_index: number;
  lessons: PresenterLesson[];
}

type Slide =
  | {
      kind: 'cover';
      id: string;
      courseTitle: string;
      modulesCount: number;
      lessonsCount: number;
    }
  | {
      kind: 'unit';
      id: string;
      unitIndex: number;
      module: PresenterModule;
    }
  | {
      kind: 'lesson';
      id: string;
      unitIndex: number;
      unitTitle: string;
      lessonIndex: number;
      lesson: PresenterLesson;
    };

interface CoursePresenterProps {
  courseId: string;
  courseTitle: string;
  courseThumbnailUrl?: string | null;
  modules: PresenterModule[];
  initialLessonId?: string;
  initialUnitId?: string;
  backHref: string;
}

export function CoursePresenter({
  courseTitle,
  courseThumbnailUrl,
  modules,
  initialLessonId,
  initialUnitId,
  backHref,
}: CoursePresenterProps) {
  const slides = useMemo<Slide[]>(() => {
    const totalLessons = modules.reduce(
      (acc, m) => acc + (m.lessons?.length || 0),
      0,
    );

    const list: Slide[] = [
      {
        kind: 'cover',
        id: 'cover',
        courseTitle,
        modulesCount: modules.length,
        lessonsCount: totalLessons,
      },
    ];

    modules.forEach((mod, uIdx) => {
      list.push({
        kind: 'unit',
        id: `unit-${mod.id}`,
        unitIndex: uIdx + 1,
        module: mod,
      });

      (mod.lessons || []).forEach((lesson, lIdx) => {
        list.push({
          kind: 'lesson',
          id: `lesson-${lesson.id}`,
          unitIndex: uIdx + 1,
          unitTitle: mod.title,
          lessonIndex: lIdx + 1,
          lesson,
        });
      });
    });

    return list;
  }, [courseTitle, modules]);

  const initialIndex = useMemo(() => {
    if (initialLessonId) {
      const idx = slides.findIndex(
        (s) => s.kind === 'lesson' && s.lesson.id === initialLessonId,
      );
      if (idx !== -1) return idx;
    }
    if (initialUnitId) {
      const idx = slides.findIndex(
        (s) => s.kind === 'unit' && s.module.id === initialUnitId,
      );
      if (idx !== -1) return idx;
    }
    return 0;
  }, [slides, initialLessonId, initialUnitId]);

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showIndex, setShowIndex] = useState(false);

  const currentSlide = slides[currentIndex] || slides[0]!;

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => Math.max(0, i - 1));
  }, []);

  const goNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(slides.length - 1, i + 1));
  }, [slides.length]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Ignore if fullscreen is blocked by browser
    }
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () =>
      document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goNext, goPrev, toggleFullscreen]);

  const renderLessonBody = (lesson: PresenterLesson) => {
    const blocks = (lesson.lesson_blocks || [])
      .slice()
      .sort((a, b) => a.order_index - b.order_index);

    if (blocks.length > 0) {
      return (
        <div className="space-y-6">
          {blocks.map((block) => {
            if (block.type === 'video' && block.content) {
              const ytId = extractYouTubeId(block.content);
              return ytId ? (
                <div
                  key={block.id}
                  className="aspect-video w-full overflow-hidden rounded-xl bg-black shadow-lg"
                >
                  <iframe
                    src={`https://www.youtube.com/embed/${ytId}`}
                    className="h-full w-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : null;
            }
            if (block.type === 'pdf' && block.content) {
              return (
                <div key={block.id} className="space-y-2">
                  <div className="flex justify-end">
                    <a
                      href={block.content}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary inline-flex items-center gap-1.5 text-sm font-semibold hover:underline"
                    >
                      Abrir PDF en nueva pestaña{' '}
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                  <iframe
                    src={block.content}
                    className="h-[68vh] w-full rounded-xl border shadow-sm"
                  />
                </div>
              );
            }
            return (
              <div
                key={block.id}
                className="text-foreground text-lg leading-relaxed whitespace-pre-wrap sm:text-xl"
              >
                {block.content}
              </div>
            );
          })}
        </div>
      );
    }

    const type = lesson.type || 'text';

    if (type === 'video' && lesson.video_url) {
      const ytId = extractYouTubeId(lesson.video_url);
      if (ytId) {
        return (
          <div className="space-y-6">
            <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-xl">
              <iframe
                src={`https://www.youtube.com/embed/${ytId}`}
                className="h-full w-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            {lesson.content && (
              <div className="text-foreground/90 text-lg leading-relaxed whitespace-pre-wrap sm:text-xl">
                {lesson.content}
              </div>
            )}
          </div>
        );
      }
    }

    if (type === 'pdf' && lesson.content) {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-2.5">
            <span className="flex items-center gap-2 text-sm font-medium">
              <FileText className="h-4 w-4 text-red-500" />
              Documento PDF
            </span>
            <a
              href={lesson.content}
              target="_blank"
              rel="noreferrer"
              className="text-primary inline-flex items-center gap-1.5 text-sm font-semibold hover:underline"
            >
              Abrir en nueva pestaña <ExternalLink className="h-4 w-4" />
            </a>
          </div>
          <iframe
            src={lesson.content}
            className="h-[68vh] w-full rounded-xl border shadow-sm"
          />
        </div>
      );
    }

    if (type === 'assignment') {
      const assignment = parseAssignmentContent(
        lesson.content,
        lesson.video_url,
      );
      return (
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-100 px-3.5 py-1 text-xs font-bold text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
            <ClipboardList className="h-4 w-4" />
            <span>Tarea / Asignación</span>
          </div>

          {assignment.instructions && (
            <div className="bg-muted/20 rounded-xl border p-5 sm:p-6">
              <p className="text-foreground text-lg leading-relaxed whitespace-pre-wrap sm:text-xl">
                {assignment.instructions}
              </p>
            </div>
          )}

          {assignment.videos.length > 0 && (
            <div className="grid gap-4">
              {assignment.videos.map((vUrl, idx) => {
                const ytId = extractYouTubeId(vUrl);
                return ytId ? (
                  <div
                    key={idx}
                    className="aspect-video w-full overflow-hidden rounded-xl bg-black shadow-lg"
                  >
                    <iframe
                      src={`https://www.youtube.com/embed/${ytId}`}
                      className="h-full w-full border-0"
                      allowFullScreen
                    />
                  </div>
                ) : null;
              })}
            </div>
          )}

          {assignment.pdfs.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {assignment.pdfs.map((pdf, idx) => (
                <a
                  key={idx}
                  href={pdf.url}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-card hover:border-primary flex items-center justify-between gap-3 rounded-xl border p-4 transition-colors"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <FileText className="h-5 w-5 shrink-0 text-red-500" />
                    <span className="truncate font-medium">{pdf.name}</span>
                  </div>
                  <ExternalLink className="text-muted-foreground h-4 w-4 shrink-0" />
                </a>
              ))}
            </div>
          )}

          {assignment.links.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {assignment.links.map((link, idx) => (
                <a
                  key={idx}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-card hover:border-primary flex items-center justify-between gap-3 rounded-xl border p-4 transition-colors"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Link2 className="text-primary h-5 w-5 shrink-0" />
                    <span className="truncate font-medium">{link.label}</span>
                  </div>
                  <ExternalLink className="text-muted-foreground h-4 w-4 shrink-0" />
                </a>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (type === 'quiz') {
      return (
        <div className="bg-muted/20 flex flex-col items-center justify-center rounded-2xl border p-12 text-center">
          <HelpCircle className="text-primary mb-4 h-14 w-14" />
          <h3 className="text-2xl font-bold">Actividad de Cuestionario</h3>
          <p className="text-muted-foreground mt-2 max-w-md text-base">
            Los estudiantes pueden responder este cuestionario desde la vista
            normal de la lección.
          </p>
        </div>
      );
    }

    if (lesson.content) {
      return (
        <div className="text-foreground text-lg leading-relaxed whitespace-pre-wrap sm:text-xl sm:leading-loose">
          {lesson.content}
        </div>
      );
    }

    return (
      <p className="text-muted-foreground py-12 text-center text-lg italic">
        Esta lección aún no tiene contenido publicado.
      </p>
    );
  };

  return (
    <div className="bg-background fixed inset-0 z-50 flex flex-col overflow-hidden">
      {/* Top presenter bar */}
      <header className="bg-background/95 flex h-14 shrink-0 items-center justify-between border-b px-4 backdrop-blur sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="text-foreground hover:text-primary gap-1.5"
          >
            <Link href={backHref}>
              <ArrowLeft className="h-4 w-4" />
              <span>Salir</span>
            </Link>
          </Button>
          <div className="bg-border h-5 w-px" />
          <div className="flex min-w-0 items-center gap-2">
            <Presentation className="text-primary h-4 w-4 shrink-0" />
            <span className="text-foreground truncate text-sm font-semibold">
              {courseTitle}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-foreground gap-1.5"
            onClick={() => setShowIndex((v) => !v)}
          >
            <List className="h-4 w-4" />
            <span className="hidden sm:inline">Índice</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-foreground gap-1.5"
            onClick={toggleFullscreen}
            title="Pantalla completa (F)"
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">
              {isFullscreen ? 'Salir pantalla completa' : 'Pantalla completa'}
            </span>
          </Button>
        </div>
      </header>

      {/* Main stage + optional index sidebar */}
      <div className="relative flex flex-1 overflow-hidden">
        {showIndex && (
          <aside className="bg-muted/20 z-20 w-80 shrink-0 overflow-y-auto border-r p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Unidades y Lecciones
              </h3>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setShowIndex(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-1">
              {slides.map((slide, idx) => {
                const isActive = idx === currentIndex;
                return (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => {
                      setCurrentIndex(idx);
                      setShowIndex(false);
                    }}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground font-semibold'
                        : 'hover:bg-muted text-foreground'
                    }`}
                  >
                    {slide.kind === 'cover' && (
                      <>
                        <BookOpen className="h-4 w-4 shrink-0" />
                        <span className="truncate">Portada del Curso</span>
                      </>
                    )}
                    {slide.kind === 'unit' && (
                      <>
                        <Layers className="h-4 w-4 shrink-0" />
                        <span className="truncate font-semibold">
                          Unidad {slide.unitIndex}: {slide.module.title}
                        </span>
                      </>
                    )}
                    {slide.kind === 'lesson' && (
                      <>
                        <span className="w-4 shrink-0 text-center text-xs opacity-70">
                          •
                        </span>
                        <span className="truncate">{slide.lesson.title}</span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </aside>
        )}

        <main className="flex-1 overflow-y-auto px-6 py-8 sm:px-12 sm:py-12">
          <div className="mx-auto flex min-h-full max-w-5xl flex-col justify-center">
            {currentSlide.kind === 'cover' && (
              <div className="flex flex-col items-center justify-center space-y-6 py-4 text-center">
                {courseThumbnailUrl ? (
                  <div className="flex w-full justify-center">
                    <img
                      src={courseThumbnailUrl}
                      alt={currentSlide.courseTitle}
                      className="max-h-[60vh] w-auto max-w-full rounded-2xl border object-contain shadow-2xl"
                    />
                  </div>
                ) : (
                  <div className="bg-primary/10 text-primary mx-auto inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold">
                    <Presentation className="h-4 w-4" />
                    Modo Presentación
                  </div>
                )}
                <h1 className="text-foreground text-3xl font-extrabold tracking-tight sm:text-5xl">
                  {currentSlide.courseTitle}
                </h1>
                <p className="text-muted-foreground text-base sm:text-lg">
                  {currentSlide.modulesCount} unidades •{' '}
                  {currentSlide.lessonsCount} lecciones
                </p>
                <div className="pt-2">
                  <Button size="lg" onClick={goNext} className="gap-2">
                    Comenzar presentación
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            )}

            {currentSlide.kind === 'unit' && (
              <div className="space-y-8 py-8">
                <div className="space-y-3 border-b pb-6">
                  <span className="text-primary inline-flex items-center gap-2 text-sm font-bold uppercase tracking-widest">
                    <Layers className="h-4 w-4" />
                    Unidad {currentSlide.unitIndex}
                  </span>
                  <h1 className="text-foreground text-3xl font-extrabold tracking-tight sm:text-5xl">
                    {currentSlide.module.title}
                  </h1>
                </div>

                {currentSlide.module.lessons.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {currentSlide.module.lessons.map((l, lIdx) => {
                      const targetSlideIdx = slides.findIndex(
                        (s) => s.kind === 'lesson' && s.lesson.id === l.id,
                      );
                      return (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => {
                            if (targetSlideIdx !== -1)
                              setCurrentIndex(targetSlideIdx);
                          }}
                          className="bg-card hover:border-primary flex items-center gap-3 rounded-xl border p-4 text-left shadow-xs transition-all hover:shadow-sm"
                        >
                          <span className="bg-primary/10 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold">
                            {lIdx + 1}
                          </span>
                          <span className="text-foreground font-semibold">
                            {l.title}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-lg italic">
                    Esta unidad aún no tiene lecciones.
                  </p>
                )}
              </div>
            )}

            {currentSlide.kind === 'lesson' && (
              <div className="space-y-6">
                <div className="space-y-2 border-b pb-4">
                  <div className="text-muted-foreground flex items-center gap-2 text-xs font-bold uppercase tracking-wider sm:text-sm">
                    <span>
                      Unidad {currentSlide.unitIndex}: {currentSlide.unitTitle}
                    </span>
                    <span>•</span>
                    <span>Lección {currentSlide.lessonIndex}</span>
                  </div>
                  <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-4xl">
                    {currentSlide.lesson.title}
                  </h1>
                </div>

                <div className="pt-2">
                  {renderLessonBody(currentSlide.lesson)}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Bottom navigation bar */}
      <footer className="bg-background/95 flex h-16 shrink-0 items-center justify-between border-t px-4 backdrop-blur sm:px-6">
        <Button
          type="button"
          variant="outline"
          onClick={goPrev}
          disabled={currentIndex === 0}
          className="text-foreground gap-1.5"
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>

        <div className="text-muted-foreground text-xs font-medium sm:text-sm">
          Diapositiva <span className="text-foreground font-bold">{currentIndex + 1}</span> de{' '}
          <span className="text-foreground font-bold">{slides.length}</span>
        </div>

        <Button
          type="button"
          onClick={goNext}
          disabled={currentIndex >= slides.length - 1}
          className="gap-1.5"
        >
          Siguiente
          <ChevronRight className="h-4 w-4" />
        </Button>
      </footer>
    </div>
  );
}
