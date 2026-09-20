import { notFound } from 'next/navigation';

import { ExternalLink, FileText, HelpCircle } from 'lucide-react';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import { ProgressService } from '~/lib/lms/server/services/progress.service';
import { extractYouTubeId } from '~/lib/lms/utils/youtube';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';

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
  const client = getSupabaseServerClient();
  const { data } = await client.from('lessons').select('title').eq('id', lessonId).single();
  return { title: data?.title || 'Lección' };
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ lessonId: string; courseId: string }>;
}) {
  const { lessonId, courseId } = await params;
  const client = getSupabaseServerClient();
  const user = await requireUserInServerComponent();
  const progressService = new ProgressService(client);

  // Load lesson
  const { data: lesson, error } = await client.from('lessons').select('*').eq('id', lessonId).single();
  if (error || !lesson) return notFound();

  // Load blocks
  const { data: blocks } = await client
    .from('lesson_blocks')
    .select('*')
    .eq('lesson_id', lessonId)
    .order('order_index', { ascending: true });

  // Load direct activity for quiz-type lessons that don't use blocks
  const { data: directActivity } = await client
    .from('activities')
    .select('id')
    .eq('lesson_id', lessonId)
    .maybeSingle();

  // Load progress
  const progress = await progressService.getLessonProgress(user.id, lessonId);
  const isCompleted = !!progress?.is_completed;

  // Fetch current user account details
  const { data: currentUserAccount } = await client
    .from('accounts')
    .select('name, picture_url')
    .eq('id', user.id)
    .single();

  // Load notes
  const { data: notes } = await client
    .from('lesson_notes' as any)
    .select('id, content, created_at')
    .eq('lesson_id', lessonId)
    .eq('student_id', user.id)
    .order('created_at', { ascending: false });

  // Load comments
  const { data: commentsData, error: commentsError } = await client
    .from('lesson_comments' as any)
    .select('id, content, created_at, user_id')
    .eq('lesson_id', lessonId)
    .order('created_at', { ascending: false });

  let comments: any[] = [];
  if (commentsData && commentsData.length > 0) {
    const userIds = commentsData.map(c => c.user_id);
    // Fetch accounts separately with admin client to bypass RLS since users can't read other users' profiles
    const adminClient = getSupabaseServerAdminClient();
    const { data: accountsData, error: accountsError } = await adminClient
      .from('accounts')
      .select('id, name, picture_url')
      .in('id', userIds);
      
    if (accountsError) {
      console.error('Error fetching accounts for comments (check SUPABASE_SERVICE_ROLE_KEY):', accountsError);
    }
    
    const accountMap = new Map((accountsData || []).map(a => [a.id, a]));

    comments = commentsData.map((c: any) => {
      const account = accountMap.get(c.user_id);
      return {
        id: c.id,
        content: c.content,
        created_at: c.created_at,
        user_id: c.user_id,
        display_name: account?.name || 'Estudiante',
        avatar_url: account?.picture_url || null,
      };
    });
  }

  // Load user roles to check for moderation permission
  const { data: rolesData } = await client
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id);
  const userRoles = rolesData?.map((r) => r.role) || [];
  const canModerate = userRoles.includes('admin') || userRoles.includes('profesor') || userRoles.includes('instructor');

  // Calculate next lesson
  const { data: courseModules } = await client
    .from('course_modules')
    .select('id, order_index, lessons(id, order_index)')
    .eq('course_id', courseId)
    .order('order_index', { ascending: true });

  let nextLessonId: string | null = null;
  if (courseModules) {
    // Flatten all lessons in order
    const allLessons: { id: string }[] = [];
    const sortedModules = courseModules.sort((a, b) => a.order_index - b.order_index);
    for (const mod of sortedModules) {
      const sortedLessons = ((mod.lessons as any[]) || []).sort(
        (a: any, b: any) => a.order_index - b.order_index,
      );
      allLessons.push(...sortedLessons);
    }
    const currentIndex = allLessons.findIndex((l) => l.id === lessonId);
    if (currentIndex !== -1 && currentIndex < allLessons.length - 1) {
      nextLessonId = allLessons[currentIndex + 1]!.id;
    }
  }

  const lessonAny = lesson as any;
  const hasBlocks = blocks && blocks.length > 0;

  function renderContent() {
    if (hasBlocks) {
      return blocks!.map((block) => {
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
                "{c?.text}"
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
              <div key={block.id} className="mt-8 bg-card rounded-xl border p-6 shadow-sm">
                <div className="flex items-center gap-3 text-purple-600 mb-6">
                  <HelpCircle className="w-8 h-8" />
                  <h3 className="text-2xl font-bold">Actividad Evaluada</h3>
                </div>
                <QuizViewer activityId={c.activity_id} courseId={courseId} />
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

    if (type === 'quiz' && directActivity?.id) {
      return (
        <div className="bg-card rounded-xl border p-8 shadow-sm mt-8">
          <div className="mb-8 flex items-center gap-3 text-purple-600">
            <HelpCircle className="h-8 w-8" />
            <h3 className="text-2xl font-semibold">Cuestionario</h3>
          </div>
          <QuizViewer activityId={directActivity.id} courseId={courseId} />
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
      <div className="mx-auto w-full max-w-5xl p-6 lg:p-10 border-b mb-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <h1 className="mb-2 text-2xl font-bold text-zinc-900 md:text-3xl">{lesson.title}</h1>
          <CompleteLessonButton courseId={courseId} lessonId={lessonId} isAlreadyCompleted={isCompleted} />
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto w-full max-w-4xl px-6 lg:px-10 pb-10 space-y-10">
        {renderContent()}

        {/* Next lesson button */}
        <div className="flex justify-end border-t pt-8">
          <NextLessonButton
            courseId={courseId}
            lessonId={lessonId}
            nextLessonId={nextLessonId}
            isAlreadyCompleted={isCompleted}
          />
        </div>

        {/* Notes section */}
        <LessonNotes lessonId={lessonId} initialNotes={(notes as any) || []} />

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
