import { SupabaseClient } from '@supabase/supabase-js';

import { Database } from '~/lib/database.types';

type ModuleInsert = Database['public']['Tables']['course_modules']['Insert'];
type ModuleUpdate = Database['public']['Tables']['course_modules']['Update'];

export class ModuleRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async findByCourseId(courseId: string) {
    const { data, error } = await this.client
      .from('course_modules')
      .select('*')
      .eq('course_id', courseId)
      .is('deleted_at', null)
      .order('order_index', { ascending: true });

    if (error) throw error;
    return data;
  }

  async create(module: ModuleInsert) {
    const { data, error } = await this.client
      .from('course_modules')
      .insert(module)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async update(id: string, updates: ModuleUpdate, expected_version?: number) {
    let query = this.client
      .from('course_modules')
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
          'Conflicto de concurrencia: El módulo fue modificado por otro usuario o no existe.',
        );
      }
      throw error;
    }
    return data;
  }

  async delete(id: string) {
    const { error } = await this.client
      .from('course_modules')
      .update({ deleted_at: new Date().toISOString() } as any)
      .eq('id', id);

    if (error) throw error;
  }

  async reorderModules(modules: { id: string; order_index: number }[]) {
    const { error } = await this.client.rpc('reorder_modules', {
      module_updates: modules,
    } as any);

    if (error) throw error;
  }
}
