import { SupabaseClient } from '@supabase/supabase-js';

import { Database } from '~/lib/database.types';

import { LessonRepository } from '../repositories/lesson.repository';

export class LessonService {
  private repository: LessonRepository;

  constructor(client: SupabaseClient<Database>) {
    this.repository = new LessonRepository(client);
  }

  async getLessonsForModule(moduleId: string) {
    return this.repository.findByModuleId(moduleId);
  }

  async getLesson(id: string) {
    return this.repository.findById(id);
  }

  async createLesson(data: {
    module_id: string;
    title: string;
    duration_seconds?: number;
    order_index: number;
    is_published?: boolean;
  }) {
    return this.repository.create(data);
  }

  async updateLesson(
    id: string,
    data: {
      title?: string;
      is_published?: boolean;
      order_index?: number;
      type?: string;
      video_url?: string;
      content?: string;
      expected_version?: number;
    },
  ) {
    const { expected_version, ...updates } = data;
    return this.repository.update(id, updates, expected_version);
  }

  async deleteLesson(id: string) {
    return this.repository.delete(id);
  }

  async reorderLessons(lessons: { id: string; order_index: number }[]) {
    await this.repository.reorderLessons(lessons);
  }
}
