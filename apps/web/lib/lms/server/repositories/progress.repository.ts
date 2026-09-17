import { SupabaseClient } from '@supabase/supabase-js';

import { Database } from '~/lib/database.types';

export class ProgressRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async getLessonProgress(studentId: string, lessonId: string) {
    const { data, error } = await this.client
      .from('lesson_progress')
      .select('*')
      .eq('student_id', studentId)
      .eq('lesson_id', lessonId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is not found
    return data;
  }

  async getAllLessonProgressForStudentInCourse(
    studentId: string,
    courseId: string,
  ) {
    // We need to join with lessons -> course_modules to filter by course_id
    // Supabase JS doesn't do complex joins easily, so we fetch modules and lessons, or use a view.
    // For now, simpler: query all lesson_progress for student, UI filters or we use nested select.
    const { data, error } = await this.client
      .from('lesson_progress')
      .select(
        `
        *,
        lesson:lessons!inner (
          module:course_modules!inner (
            course_id
          )
        )
      `,
      )
      .eq('student_id', studentId)
      .eq('lesson.module.course_id', courseId)
      .eq('is_completed', true);

    if (error) throw error;
    return data;
  }

  async upsertLessonProgress(
    studentId: string,
    lessonId: string,
    isCompleted: boolean,
  ) {
    const { data, error } = await this.client
      .from('lesson_progress')
      .upsert(
        {
          student_id: studentId,
          lesson_id: lessonId,
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null,
        },
        { onConflict: 'student_id,lesson_id' },
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async upsertCourseProgress(
    studentId: string,
    courseId: string,
    percentage: number,
    status: 'in_progress' | 'completed',
  ) {
    const { data, error } = await this.client
      .from('course_progress')
      .upsert(
        {
          student_id: studentId,
          course_id: courseId,
          percentage_completed: percentage,
          status: status,
          completed_at:
            status === 'completed' ? new Date().toISOString() : null,
        },
        { onConflict: 'student_id,course_id' },
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
