import { notFound } from 'next/navigation';

import { ClipboardList, ExternalLink, FileText, HelpCircle, Link2, Video } from 'lucide-react';

import { parseAssignmentContent } from '~/lib/lms/utils/assignment';
import { extractYouTubeId } from '~/lib/lms/utils/youtube';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';

import {
  getCachedCourseOutline,
  getCachedLessonBundle,
  getStudentLessonState,
} from '../../_lib/learn-data.server';
import { AssignmentSubmission, type AssignmentSubmissionData } from './_components/assignment-submission';
import { CompleteLessonButton } from './_components/complete-lesson-button';
import { LessonComments } from './_components/lesson-comments';
import { LessonNotes } from './_components/lesson-notes';
import { NextLessonButton } from './_components/next-lesson-button';
import { QuizViewer } from './_components/quiz-viewer';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  const bundle = await getCachedLessonBundle(lessonId);
  return { title: bundle?.lesson?.title || 'Lección' };
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ lessonId: string; courseId: string }>;
}) {
  const { lessonId, courseId } = await params;
  const user = await requireUserInServerComponent();

  // Shared cross-request cached content (0 DB queries on cache hit)
  const [bundle, courseOutlineRes] = await Promise.all([
    getCachedLessonBundle(lessonId),
    getCachedCourseOutline(courseId),
  ]);

  if (!bundle || !bundle.lesson) {
    return notFound();
  }

  const { lesson: currentLesson, blocks, directActivity, activitiesList, activityIds } = bundle;

  // Single Postgres RPC for ALL per-student dynamic state (role, enrollment, account, progress, notes, comments, attempts)
  const studentState = await getStudentLessonState(courseId, lessonId, activityIds);
  if (!studentState) {
    return notFound();
  }

  const roleName = studentState.role;
  const canModerate =
    roleName === 'admin' ||
    roleName === 'administrador' ||
    roleName === 'profesor' ||
    roleName === 'instructor' ||
    studentState.is_instructor;

  // Enforce enrollment / publish access control
  if (!canModerate && (!studentState.is_enrolled || !currentLesson.is_published)) {
    return notFound();
  }

  const isCompleted = studentState.lesson_completed;
  const currentUserAccount = studentState.account;
  const notes = studentState.notes || [];
  const comments = studentState.comments || [];
  const hasBlocks = blocks.length > 0;

  // Map full activities and attempts by activity_id
  const activitiesById = new Map<string, any>();
  for (const act of activitiesList) {
    activitiesById.set(act.id, act);
  }

  const attemptsData = studentState.attempts || [];
  const attemptsByActivity = new Map<string, any[]>();
  for (const attempt of attemptsData) {
    const list = attemptsByActivity.get(attempt.activity_id) || [];
    list.push(attempt);
    attemptsByActivity.set(attempt.activity_id, list);
  }

  // Load existing student submission if this is an assignment lesson
  let initialSubmission: AssignmentSubmissionData | null = null;
  if ((currentLesson as any).type === 'assignment' && directActivity?.id) {
    const directAttempts = attemptsByActivity.get(directActivity.id) || [];
    const latestAttempt = [...directAttempts].sort(
      (a, b) => (b.attempt_number || 0) - (a.attempt_number || 0),
    )[0];

    if (latestAttempt) {
      const answersObj = (latestAttempt.answers_json as any) || {};
      const files = Array.isArray(answersObj.files)
        ? answersObj.files
        : latestAttempt.file_url
          ? [{ name: 'Documento adjunto', url: latestAttempt.file_url }]
          : [];
      const links = Array.isArray(answersObj.links) ? answersObj.links : [];
      const comment = typeof answersObj.comment === 'string' ? answersObj.comment : '';

      initialSubmission = {
        id: latestAttempt.id,
        status: latestAttempt.status || 'needs_grading',
        score: latestAttempt.score ?? null,
        completed_at: latestAttempt.completed_at ?? null,
        files,
        links,
        comment,
      };
    }
  }

  // Check if lesson requires passing/submitting a quiz
  const requiresQuiz = activityIds.length > 0;
  let hasPassedQuiz = false;

  if (requiresQuiz) {
    let allPassed = true;
    let hasBlockingActivities = false;

    for (const actId of activityIds) {
      const act = activitiesById.get(actId);
      if (!act) continue;

      const hasQuestions = act.activity_questions && act.activity_questions.length > 0;
      if (!hasQuestions) {
        continue;
      }

      hasBlockingActivities = true;
      const passingScore = act.passing_score || 0;
      const attemptsForAct = attemptsByActivity.get(act.id) || [];
      const passed = attemptsForAct.some((a) => (a.score || 0) >= passingScore);
      const hasSubmitted = attemptsForAct.length > 0;

      if (!passed && !hasSubmitted) {
        allPassed = false;
        break;
      }
    }

    hasPassedQuiz = hasBlockingActivities ? allPassed : true;
  }

  const canMarkAsCompleted = canModerate || !requiresQuiz || hasPassedQuiz;

  // Calculate next lesson from shared cached course outline
  let nextLessonId: string | null = null;
  const courseModules = courseOutlineRes.data?.course_modules;
  if (courseModules) {
    const allLessons: { id: string }[] = [];
    const sortedModules = [...courseModules].sort(
      (a, b) => a.order_index - b.order_index,
    );
    for (const mod of sortedModules) {
      const sortedLessons = ((mod.lessons as any[]) || [])
        .filter((l: any) => !l.deleted_at)
        .sort((a: any, b: any) => a.order_index - b.order_index);
      allLessons.push(...sortedLessons);
    }
    const currentIndex = allLessons.findIndex((l) => l.id === lessonId);
    if (currentIndex !== -1 && currentIndex < allLessons.length - 1) {
      nextLessonId = allLessons[currentIndex + 1]!.id;
    }
  }

  const lessonAny = currentLesson as any;

  function renderContent() {
    if (hasBlocks) {
      return blocks.map((block) => {
        const c = block.content as any;
        switch (block.type) {
          case 'video':
            return (
              <div key={block.id} className="relative flex aspect-video w-full overflow-hidden bg-black rounded-xl shadow-md">
                {extractYouTubeId(c?.url || '') ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${extractYouTubeId(c.url)}`}
                    className="h-full w-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <span className="m-auto text-muted-foreground">URL de video no válida</span>
                )}
              </div>
            );
          case 'text':
            return (
              <div key={block.id} className="prose max-w-none">
                <div className="text-zinc-800 leading-relaxed whitespace-pre-wrap">{c?.html}</div>
              </div>
            );
          case 'quote':
            return (
              <blockquote key={block.id} className="border-l-4 border-primary pl-6 italic text-xl text-muted-foreground py-2 my-8">
                &ldquo;{c?.text}&rdquo;
              </blockquote>
            );
          case 'pdf':
            return (
              <div key={block.id} className="flex w-full flex-col items-center my-10">
                <div className="bg-muted/30 mb-3 flex w-full items-center justify-between rounded-lg border p-3">
                  <span className="text-zinc-600 flex items-center gap-2 text-sm font-medium">
                    <FileText className="text-primary h-4 w-4" /> Documento
                  </span>
                  <a href={c?.url} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1.5 text-xs font-semibold hover:underline">
                    Ver en nueva pestaña <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
                {c?.url && <iframe src={c.url} className="h-[650px] w-full rounded-xl border shadow-sm" />}
              </div>
            );
          case 'activity':
            if (!c?.activity_id) return null;
            return (
              <div key={block.id} className="mt-4 sm:mt-8 bg-card rounded-xl border p-3.5 sm:p-6 shadow-sm">
                <div className="flex items-center gap-2.5 text-primary mb-4 sm:mb-6">
                  <HelpCircle className="w-6 h-6 sm:w-8 sm:h-8" />
                  <h3 className="text-lg sm:text-2xl font-bold">Actividad Evaluada</h3>
                </div>
                <QuizViewer
                  activityId={c.activity_id}
                  courseId={courseId}
                  lessonId={lessonId}
                  currentUserId={user.id}
                  initialActivity={activitiesById.get(c.activity_id)}
                  initialPastAttempts={attemptsByActivity.get(c.activity_id) || []}
                />
              </div>
            );
          default:
            return null;
        }
      });
    }

    // Fallback: lesson-level fields
    const type: string = lessonAny.type || 'text';
    const videoUrl: string | null = lessonAny.video_url;
    const content: string | null = lessonAny.content;

    if (type === 'video' && videoUrl) {
      const videoId = extractYouTubeId(videoUrl);
      return (
        <>
          {videoId && (
            <div className="relative flex aspect-video w-full overflow-hidden bg-black rounded-xl shadow-md">
              <iframe
                src={`https://www.youtube.com/embed/${videoId}`}
                className="h-full w-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
          {content && (
            <div className="prose max-w-none mt-8">
              <div className="text-zinc-800 leading-relaxed whitespace-pre-wrap">{content}</div>
            </div>
          )}
        </>
      );
    }

    if (type === 'pdf' && content) {
      return (
        <div className="flex w-full flex-col items-center my-10">
          <div className="bg-muted/30 mb-3 flex w-full items-center justify-between rounded-lg border p-3">
            <span className="text-zinc-600 flex items-center gap-2 text-sm font-medium">
              <FileText className="text-primary h-4 w-4" /> Documento PDF
            </span>
            <a href={content} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1.5 text-xs font-semibold hover:underline">
              Ver en nueva pestaña <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
          <iframe src={content} className="h-[650px] w-full rounded-xl border shadow-sm" />
        </div>
      );
    }

    if (type === 'assignment') {
      const assignment = parseAssignmentContent(content, videoUrl);
      return (
        <div className="space-y-6 sm:space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 px-3 py-1 text-xs font-bold border border-amber-300 dark:border-amber-800">
            <ClipboardList className="h-3.5 w-3.5" />
            <span>Tarea / Asignación</span>
          </div>

          {assignment.instructions && (
            <div className="prose max-w-none rounded-xl border bg-muted/10 p-4 sm:p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Instrucciones
              </h3>
              <div className="text-zinc-800 dark:text-foreground leading-relaxed whitespace-pre-wrap text-sm sm:text-base">
                {assignment.instructions}
              </div>
            </div>
          )}

          {assignment.videos.length > 0 && (
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                <Video className="h-4 w-4 text-primary" />
                <span>Videos de Apoyo</span>
              </h3>
              <div className="space-y-4">
                {assignment.videos.map((vUrl, idx) => {
                  const ytId = extractYouTubeId(vUrl);
                  return ytId ? (
                    <div
                      key={idx}
                      className="relative flex aspect-video w-full overflow-hidden bg-black rounded-xl shadow-md"
                    >
                      <iframe
                        src={`https://www.youtube.com/embed/${ytId}`}
                        className="h-full w-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {assignment.pdfs.length > 0 && (
            <div className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                <FileText className="h-4 w-4 text-primary" />
                <span>Documentos PDF Adjuntos</span>
              </h3>
              <div className="space-y-4">
                {assignment.pdfs.map((pdf, idx) => (
                  <div key={idx} className="rounded-xl border bg-card overflow-hidden shadow-xs">
                    <div className="bg-muted/30 flex items-center justify-between gap-2 border-b p-3">
                      <span className="text-foreground flex items-center gap-2 text-sm font-medium min-w-0">
                        <FileText className="text-primary h-4 w-4 shrink-0" />
                        <span className="truncate">{pdf.name}</span>
                      </span>
                      <a
                        href={pdf.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary inline-flex items-center gap-1.5 text-xs font-semibold hover:underline shrink-0"
                      >
                        Ver / Descargar <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                    <iframe src={pdf.url} className="h-[520px] w-full" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {assignment.links.length > 0 && (
            <div className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                <Link2 className="h-4 w-4 text-primary" />
                <span>Enlaces de Referencia</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {assignment.links.map((link, idx) => (
                  <a
                    key={idx}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3.5 hover:border-primary transition-colors shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Link2 className="h-4 w-4 text-primary shrink-0" />
                      <span className="font-medium text-sm text-foreground break-words">
                        {link.label}
                      </span>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {!assignment.instructions &&
            assignment.videos.length === 0 &&
            assignment.pdfs.length === 0 &&
            assignment.links.length === 0 && (
              <p className="text-zinc-400 text-center">
                Esta tarea aún no tiene instrucciones publicadas.
              </p>
            )}

          <AssignmentSubmission
            courseId={courseId}
            lessonId={lessonId}
            lessonTitle={currentLesson.title}
            initialSubmission={initialSubmission}
          />
        </div>
      );
    }

    if (type === 'quiz' && directActivity?.id) {
      return (
        <div className="bg-card rounded-xl border p-3.5 sm:p-6 md:p-8 shadow-sm mt-4 sm:mt-8">
          <div className="mb-4 sm:mb-6 flex items-center gap-2.5 text-primary">
            <HelpCircle className="h-6 w-6 sm:h-8 sm:w-8" />
            <h3 className="text-lg sm:text-2xl font-semibold">Cuestionario</h3>
          </div>
          <QuizViewer
            activityId={directActivity.id}
            courseId={courseId}
            lessonId={lessonId}
            currentUserId={user.id}
            initialActivity={activitiesById.get(directActivity.id)}
            initialPastAttempts={attemptsByActivity.get(directActivity.id) || []}
          />
        </div>
      );
    }

    if (content) {
      return (
        <div className="prose max-w-none">
          <div className="text-zinc-800 leading-relaxed whitespace-pre-wrap">{content}</div>
        </div>
      );
    }

    return <p className="text-zinc-400 text-center">Esta lección aún no tiene contenido publicado.</p>;
  }

  return (
    <div className="flex w-full flex-col">
      {/* Header */}
      <div className="mx-auto w-full max-w-5xl px-4 py-4 sm:px-6 sm:py-6 lg:p-10 border-b mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground leading-tight">{currentLesson.title}</h1>
          <div className="w-full sm:w-auto">
            <CompleteLessonButton
              courseId={courseId}
              lessonId={lessonId}
              isAlreadyCompleted={isCompleted}
              isDisabled={!canMarkAsCompleted}
              disabledReason="Debes aprobar el cuestionario de esta lección para poder completarla."
            />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto w-full max-w-4xl px-3 sm:px-6 lg:px-10 pb-10 space-y-6 sm:space-y-10">
        {renderContent()}

        {/* Next lesson button */}
        <div className="flex justify-end border-t pt-6 sm:pt-8">
          <NextLessonButton
            courseId={courseId}
            lessonId={lessonId}
            nextLessonId={nextLessonId}
            isAlreadyCompleted={isCompleted}
            isDisabled={!canMarkAsCompleted}
          />
        </div>

        {/* Notes section */}
        <LessonNotes lessonId={lessonId} initialNotes={notes as any} />

        {/* Comments section */}
        <LessonComments
          lessonId={lessonId}
          currentUserId={user.id}
          currentUserDisplayName={currentUserAccount?.name || 'Tú'}
          currentUserAvatarUrl={currentUserAccount?.picture_url || null}
          canModerate={canModerate}
          initialComments={comments as any}
        />

        <div className="pb-10" />
      </div>
    </div>
  );
}
