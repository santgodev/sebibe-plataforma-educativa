import { SupabaseClient } from '@supabase/supabase-js';

import { Database } from '~/lib/database.types';

import { ModuleRepository } from '../repositories/module.repository';

export class ModuleService {
  private repository: ModuleRepository;

  constructor(client: SupabaseClient<Database>) {
    this.repository = new ModuleRepository(client);
  }

  async getModulesForCourse(courseId: string) {
    return this.repository.findByCourseId(courseId);
  }

  async createModule(data: {
    course_id: string;
    title: string;
    order_index: number;
  }) {
    return this.repository.create(data);
  }

  async updateModule(
    id: string,
    data: { title?: string; order_index?: number; expected_version?: number },
  ) {
    const { expected_version, ...updates } = data;
    return this.repository.update(id, updates, expected_version);
  }

  async deleteModule(id: string) {
    return this.repository.delete(id);
  }

  async reorderModules(modules: { id: string; order_index: number }[]) {
    // Uses PostgreSQL RPC for atomic updating
    await this.repository.reorderModules(modules);
  }
}
