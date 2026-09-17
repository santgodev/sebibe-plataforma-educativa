import { SupabaseClient } from '@supabase/supabase-js';

import { Database } from '~/lib/database.types';

type LessonInsert = Database['public']['Tables']['lessons']['Insert'];
type LessonUpdate = Database['public']['Tables']['lessons']['Update'];

export class LessonRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async findByModuleId(moduleId: string) {
    const { data, error } = await this.client
      .from('lessons')
      .select('*')
      .eq('module_id', moduleId)
      .is('deleted_at', null)
      .order('order_index', { ascending: true });

    if (error) throw error;
    return data;
  }

  async findById(id: string) {
    const { data, error } = await this.client
      .from('lessons')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) throw error;
    return data;
  }

  async create(lesson: LessonInsert) {
    const { data, error } = await this.client
      .from('lessons')
      .insert(lesson)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async update(id: string, updates: LessonUpdate, expected_version?: number) {
    let query = this.client
      .from('lessons')
      .update(updates)
      .eq('id', id)
      .is('deleted_at', null);

    if (expected_version !== undefined) {
      query = query.eq('version', expected_version);
    }

    const { data, error } = await query.select().single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error(
          'Conflicto de concurrencia: La lección fue modificada por otro usuario o no existe.',
        );
      }
      throw error;
    }
    return data;
  }

  async delete(id: string) {
    const { error } = await this.client
      .from('lessons')
      .update({ deleted_at: new Date().toISOString() } as any)
      .eq('id', id);

    if (error) throw error;
  }

  async reorderLessons(lessons: { id: string; order_index: number }[]) {
    const { error } = await this.client.rpc('reorder_lessons', {
      lesson_updates: lessons,
    } as any);

    if (error) throw error;
  }
}
