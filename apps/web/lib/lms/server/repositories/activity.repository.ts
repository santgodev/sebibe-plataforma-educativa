import { SupabaseClient } from '@supabase/supabase-js';

import { Database } from '~/lib/database.types';

type ActivityInsert = Database['public']['Tables']['activities']['Insert'];
type ActivityUpdate = Database['public']['Tables']['activities']['Update'];

export class ActivityRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async findByLessonId(lessonId: string) {
    const { data, error } = await this.client
      .from('activities')
      .select('*')
      .eq('lesson_id', lessonId);

    if (error) throw error;
    return data;
  }

  async findByCourseId(courseId: string) {
    const { data, error } = await this.client
      .from('activities')
      .select('*')
      .eq('course_id', courseId);

    if (error) throw error;
    return data;
  }

  async findById(id: string) {
    const { data, error } = await this.client
      .from('activities')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async getFullActivity(id: string) {
    const { data, error } = await this.client
      .from('activities')
      .select(`
        *,
        activity_questions (
          *,
          activity_answers (*)
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async create(activity: ActivityInsert) {
    const { data, error } = await this.client
      .from('activities')
      .insert(activity)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async update(id: string, updates: ActivityUpdate) {
    const { data, error } = await this.client
      .from('activities')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async delete(id: string) {
    const { error } = await this.client
      .from('activities')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async saveQuestionsAndAnswers(activityId: string, questions: any[]) {
    // Delete existing questions (answers will cascade or delete them manually)
    await this.client.from('activity_questions').delete().eq('activity_id', activityId);

    for (const [qIndex, q] of questions.entries()) {
      const { data: questionData, error: qError } = await this.client
        .from('activity_questions')
        .insert({
          activity_id: activityId,
          question_text: q.question_text,
          type: q.type,
          points: q.points || 1,
          order_index: q.order_index ?? qIndex,
          feedback_text: q.feedback_text || null,
        })
        .select()
        .single();

      if (qError) throw qError;

      if (q.answers && q.answers.length > 0) {
        const answersToInsert = q.answers.map((a: any, aIndex: number) => ({
          question_id: questionData.id,
          answer_text: a.answer_text,
          is_correct: a.is_correct || false,
          order_index: a.order_index ?? aIndex,
        }));

        const { error: aError } = await this.client
          .from('activity_answers')
          .insert(answersToInsert);

        if (aError) throw aError;
      }
    }
  }
}
