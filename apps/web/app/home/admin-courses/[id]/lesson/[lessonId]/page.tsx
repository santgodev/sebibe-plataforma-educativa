import { notFound } from 'next/navigation';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { LessonEditor } from '../../_components/lesson-editor';

export const metadata = {
  title: 'Editar Lección',
};

interface EditLessonPageProps {
  params: Promise<{ id: string; lessonId: string }>;
}

export default async function EditLessonPage({ params }: EditLessonPageProps) {
  const { id, lessonId } = await params;
  const client = getSupabaseServerClient();

  const { data: lesson, error: lessonError } = await client
    .from('lessons')
    .select('*')
    .eq('id', lessonId)
    .single();

  if (lessonError || !lesson) {
    return notFound();
  }

  const { data: blocks, error: blocksError } = await client
    .from('lesson_blocks')
    .select('*')
    .eq('lesson_id', lessonId)
    .order('order_index', { ascending: true });

  if (blocksError) {
    console.error('Error fetching blocks:', blocksError);
  }

  return (
    <LessonEditor courseId={id} lesson={lesson} initialBlocks={blocks || []} />
  );
}
