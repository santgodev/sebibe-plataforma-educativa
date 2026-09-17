import { SupabaseClient } from '@supabase/supabase-js';

import { Database } from '~/lib/database.types';

type LessonBlockRow = Database['public']['Tables']['lesson_blocks']['Row'];
type LessonBlockInsert =
  Database['public']['Tables']['lesson_blocks']['Insert'];
type LessonBlockUpdate =
  Database['public']['Tables']['lesson_blocks']['Update'];

export class LessonBlockRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async findByLessonId(lessonId: string) {
    const { data, error } = await this.client
      .from('lesson_blocks')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('order_index', { ascending: true });

    if (error) throw error;
    return data;
  }

  async findById(id: string) {
    const { data, error } = await this.client
      .from('lesson_blocks')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async create(block: LessonBlockInsert) {
    const { data, error } = await this.client
      .from('lesson_blocks')
      .insert(block)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async update(id: string, updates: LessonBlockUpdate) {
    const { data, error } = await this.client
      .from('lesson_blocks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async delete(id: string) {
    const { error } = await this.client
      .from('lesson_blocks')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Uses RPC if available, otherwise handles manually.
  // For now, doing it manually since RPC reorder_blocks might not exist yet.
  async reorderBlocks(blocks: { id: string; order_index: number }[]) {
    // We can do this with multiple updates or an upsert. Supabase allows bulk upsert.
    const { error } = await this.client.from('lesson_blocks').upsert(
      blocks.map((b) => ({ id: b.id, order_index: b.order_index }) as any),
      { onConflict: 'id' },
    );

    if (error) throw error;
  }
}
