import { SupabaseClient } from '@supabase/supabase-js';

import { Database } from '~/lib/database.types';

import { LessonRepository } from '../repositories/lesson.repository';
import { ModuleRepository } from '../repositories/module.repository';
import { ProgressRepository } from '../repositories/progress.repository';

export class ProgressService {
  private progressRepo: ProgressRepository;
  private lessonRepo: LessonRepository;
  private moduleRepo: ModuleRepository;

  constructor(client: SupabaseClient<Database>) {
    this.progressRepo = new ProgressRepository(client);
    this.lessonRepo = new LessonRepository(client);
    this.moduleRepo = new ModuleRepository(client);
  }

  async getLessonProgress(studentId: string, lessonId: string) {
    return this.progressRepo.getLessonProgress(studentId, lessonId);
  }

  async getCompletedLessonsSet(
    studentId: string,
    courseId: string,
  ): Promise<Set<string>> {
    const progressRecords =
      await this.progressRepo.getAllLessonProgressForStudentInCourse(
        studentId,
        courseId,
      );
    return new Set(progressRecords.map((p) => p.lesson_id));
  }

  async markLessonCompleted(
    studentId: string,
    courseId: string,
    lessonId: string,
  ) {
    // 1. Mark lesson as completed
    await this.progressRepo.upsertLessonProgress(studentId, lessonId, true);

    // 2. Recalculate course progress
    // Get all modules and lessons for this course to know total
    const modules = await this.moduleRepo.findByCourseId(courseId);
    let totalLessons = 0;

    // In a real optimized system, we could count directly via SQL RPC.
    // For now, we fetch all lessons for these modules.
    for (const mod of modules) {
      const lessons = await this.lessonRepo.findByModuleId(mod.id);
      totalLessons += lessons.length;
    }

    if (totalLessons === 0) return { percentage: 0, status: 'in_progress' };

    const completedRecords =
      await this.progressRepo.getAllLessonProgressForStudentInCourse(
        studentId,
        courseId,
      );
    const completedCount = completedRecords.length;

    const percentage = Math.round((completedCount / totalLessons) * 100);
    const status = percentage >= 100 ? 'completed' : 'in_progress';

    await this.progressRepo.upsertCourseProgress(
      studentId,
      courseId,
      percentage,
      status,
    );

    // TODO: If status === 'completed', we can automatically generate a Certificate here
    // if no final evaluation is required by the course settings.

    return { percentage, status };
  }

  /**
   * Recalcula y sincroniza `course_progress` en la base de datos para todos los
   * estudiantes que tienen progreso registrado en una materia.
   */
  async recalculateCourseProgressForAllStudents(courseId: string) {
    if (!courseId) return;

    const { getSupabaseServerAdminClient } = await import('@kit/supabase/server-admin-client');
    const adminClient = getSupabaseServerAdminClient();

    // 1. Obtener todos los módulos y lecciones vigentes de la materia
    const { data: modules } = await adminClient
      .from('course_modules')
      .select('id, lessons(id)')
      .eq('course_id', courseId);

    const courseLessonIds: string[] = [];
    (modules || []).forEach((mod: any) => {
      (mod.lessons || []).forEach((lesson: any) => {
        if (lesson?.id) courseLessonIds.push(lesson.id);
      });
    });

    const totalLessons = courseLessonIds.length;

    // 2. Obtener todos los registros de progreso en esta materia
    const { data: existingCourseProgress } = await adminClient
      .from('course_progress')
      .select('student_id')
      .eq('course_id', courseId);

    if (!existingCourseProgress || existingCourseProgress.length === 0) {
      return;
    }

    if (totalLessons === 0) {
      await adminClient
        .from('course_progress')
        .update({
          percentage_completed: 0,
          status: 'in_progress',
          updated_at: new Date().toISOString(),
        })
        .eq('course_id', courseId);
      return;
    }

    // 3. Contar lecciones completadas por estudiante dentro de esta materia
    const { data: completedRows } = await adminClient
      .from('lesson_progress')
      .select('student_id, lesson_id')
      .eq('is_completed', true)
      .in('lesson_id', courseLessonIds);

    const completedByStudent = new Map<string, number>();
    (completedRows || []).forEach((row: any) => {
      completedByStudent.set(
        row.student_id,
        (completedByStudent.get(row.student_id) || 0) + 1,
      );
    });

    // 4. Actualizar `course_progress` de cada estudiante
    for (const cp of existingCourseProgress) {
      const completedCount = completedByStudent.get(cp.student_id) || 0;
      const percentage = Math.min(Math.round((completedCount / totalLessons) * 100), 100);
      const status = completedCount >= totalLessons ? 'completed' : 'in_progress';

      await adminClient
        .from('course_progress')
        .update({
          percentage_completed: percentage,
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('course_id', courseId)
        .eq('student_id', cp.student_id);
    }
  }

  /**
   * Cuando se agrega un nuevo cuestionario/actividad a una lección existente,
   * reinicia el estado de completado de esa lección y recalcula el progreso de la materia.
   */
  async handleNewQuizInLesson(lessonId: string, courseId?: string | null) {
    const { getSupabaseServerAdminClient } = await import('@kit/supabase/server-admin-client');
    const adminClient = getSupabaseServerAdminClient();

    // Desmarcar la lección como completada para que refleje la nueva evaluación pendiente
    await adminClient
      .from('lesson_progress')
      .update({
        is_completed: false,
        updated_at: new Date().toISOString(),
      })
      .eq('lesson_id', lessonId)
      .eq('is_completed', true);

    let resolvedCourseId = courseId;
    if (!resolvedCourseId) {
      const { data: lessonRow } = await adminClient
        .from('lessons')
        .select('course_modules(course_id)')
        .eq('id', lessonId)
        .maybeSingle();
      resolvedCourseId = (lessonRow as any)?.course_modules?.course_id || null;
    }

    if (resolvedCourseId) {
      await this.recalculateCourseProgressForAllStudents(resolvedCourseId);
    }
  }
}
