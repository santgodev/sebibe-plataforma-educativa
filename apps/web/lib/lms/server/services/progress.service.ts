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
}
