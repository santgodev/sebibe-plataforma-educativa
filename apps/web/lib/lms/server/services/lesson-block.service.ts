import { SupabaseClient } from '@supabase/supabase-js';

import { Database } from '~/lib/database.types';

import { LessonBlockRepository } from '../repositories/lesson-block.repository';

export class LessonBlockService {
  private repository: LessonBlockRepository;

  constructor(client: SupabaseClient<Database>) {
    this.repository = new LessonBlockRepository(client);
  }

  async getBlocksForLesson(lessonId: string) {
    return this.repository.findByLessonId(lessonId);
  }

  async getBlock(id: string) {
    return this.repository.findById(id);
  }

  async createBlock(data: {
    lesson_id: string;
    type: Database['public']['Enums']['block_type'];
    content: any;
    order_index: number;
  }) {
    return this.repository.create({
      ...data,
      content: data.content,
    });
  }

  async updateBlock(
    id: string,
    data: {
      type?: Database['public']['Enums']['block_type'];
      content?: any;
      order_index?: number;
    },
  ) {
    return this.repository.update(id, data);
  }

  async deleteBlock(id: string) {
    return this.repository.delete(id);
  }

  async reorderBlocks(blocks: { id: string; order_index: number }[]) {
    await this.repository.reorderBlocks(blocks);
  }
}
