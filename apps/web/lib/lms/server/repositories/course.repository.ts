import { SupabaseClient } from '@supabase/supabase-js';

import { Database } from '~/lib/database.types';

type CourseRow = Database['public']['Tables']['courses']['Row'];
type CourseInsert = Database['public']['Tables']['courses']['Insert'];
type CourseUpdate = Database['public']['Tables']['courses']['Update'];

export class CourseRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async findById(id: string) {
    const { data, error } = await this.client
      .from('courses')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) throw error;
    return data;
  }

  async findBySlug(slug: string) {
    const { data, error } = await this.client
      .from('courses')
      .select('*')
      .eq('slug', slug)
      .is('deleted_at', null)
      .single();

    if (error) throw error;
    return data;
  }

  async findAllPublished() {
    const { data, error } = await this.client
      .from('courses')
      .select('*')
      .eq('status', 'published')
      .is('deleted_at', null);

    if (error) throw error;
    return data;
  }

  async findByInstructor(instructorId: string) {
    const { data, error } = await this.client
      .from('courses')
      .select('*')
      .eq('instructor_id', instructorId)
      .is('deleted_at', null);

    if (error) throw error;
    return data;
  }

  async create(course: CourseInsert) {
    const { data, error } = await this.client
      .from('courses')
      .insert(course)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error(
          'El identificador URL (slug) ya está en uso. Por favor elige otro.',
        );
      }
      throw error;
    }
    return data;
  }

  async update(id: string, updates: CourseUpdate, expected_version?: number) {
    let query = this.client
      .from('courses')
      .update(updates)
      .eq('id', id)
      .is('deleted_at', null);

    if (expected_version !== undefined) {
      query = query.eq('version', expected_version);
    }

    const { data, error } = await query.select().single();

    if (error) {
      if (error.code === '23505') {
        throw new Error(
          'El identificador URL (slug) ya está en uso. Por favor elige otro.',
        );
      }
      if (error.code === 'PGRST116') {
        throw new Error(
          'Conflicto de concurrencia: El curso fue modificado por otro usuario o no existe.',
        );
      }
      throw error;
    }
    return data;
  }

  async delete(id: string) {
    const { error } = await this.client
      .from('courses')
      .update({ deleted_at: new Date().toISOString() } as any)
      .eq('id', id);

    if (error) throw error;
  }
}
