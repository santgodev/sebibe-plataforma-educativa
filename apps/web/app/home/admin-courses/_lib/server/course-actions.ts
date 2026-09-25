'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';

export async function syncCourseEnrollments(courseId: string, studentIds: string[]) {
  await requireUserInServerComponent();
  const adminClient = getSupabaseServerAdminClient();

  if (!courseId) {
    throw new Error('ID de materia requerido');
  }

  // 1. Delete all current enrollments for this course
  const { error: deleteError } = await adminClient
    .from('course_enrollments')
    .delete()
    .eq('course_id', courseId);

  if (deleteError) {
    throw new Error(`Error limpiando inscripciones: ${deleteError.message}`);
  }

  // 2. Insert new enrollments
  if (studentIds.length > 0) {
    const enrollments = studentIds.map(studentId => ({
      course_id: courseId,
      student_id: studentId,
    }));

    const { error: insertError } = await adminClient
      .from('course_enrollments')
      .insert(enrollments);

    if (insertError) {
      throw new Error(`Error guardando inscripciones: ${insertError.message}`);
    }
  }

  revalidatePath(`/home/admin-courses/${courseId}`);
  revalidatePath('/home/courses');
  return { success: true };
}
