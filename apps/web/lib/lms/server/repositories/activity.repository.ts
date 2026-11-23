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
    // 1. Fetch existing question IDs so we preserve UUIDs for existing questions
    const { data: existingQuestions, error: existingQError } = await this.client
      .from('activity_questions')
      .select('id')
      .eq('activity_id', activityId);

    if (existingQError) throw existingQError;

    const existingQuestionIds = new Set(
      (existingQuestions || []).map((q) => q.id),
    );
    const keptQuestionIds = new Set(
      questions
        .map((q) => q.id)
        .filter((id): id is string => Boolean(id && existingQuestionIds.has(id))),
    );

    const removedQuestionIds = [...existingQuestionIds].filter(
      (id) => !keptQuestionIds.has(id),
    );

    if (removedQuestionIds.length > 0) {
      const { error: delQError } = await this.client
        .from('activity_questions')
        .delete()
        .in('id', removedQuestionIds);

      if (delQError) throw delQError;
    }

    for (const [qIndex, q] of questions.entries()) {
      const questionPayload = {
        question_text: q.question_text,
        type: q.type,
        points: q.points || 1,
        order_index: q.order_index ?? qIndex,
        feedback_text: q.feedback_text || null,
      };

      let questionId: string;

      if (q.id && existingQuestionIds.has(q.id)) {
        const { error: updQError } = await this.client
          .from('activity_questions')
          .update(questionPayload)
          .eq('id', q.id)
          .eq('activity_id', activityId);

        if (updQError) throw updQError;
        questionId = q.id;
      } else {
        const { data: insertedQ, error: insQError } = await this.client
          .from('activity_questions')
          .insert({
            activity_id: activityId,
            ...questionPayload,
          })
          .select('id')
          .single();

        if (insQError) throw insQError;
        questionId = insertedQ.id;
      }

      // Sync answers preserving existing answer UUIDs
      const { data: existingAnswers, error: existingAError } = await this.client
        .from('activity_answers')
        .select('id')
        .eq('question_id', questionId);

      if (existingAError) throw existingAError;

      const existingAnswerIds = new Set(
        (existingAnswers || []).map((a) => a.id),
      );
      const validAnswers = (q.answers || []).filter(
        (a: any) => a.answer_text && a.answer_text.trim() !== '',
      );
      const keptAnswerIds = new Set(
        validAnswers
          .map((a: any) => a.id)
          .filter((id: unknown): id is string =>
            Boolean(typeof id === 'string' && existingAnswerIds.has(id)),
          ),
      );

      const removedAnswerIds = [...existingAnswerIds].filter(
        (id) => !keptAnswerIds.has(id),
      );

      if (removedAnswerIds.length > 0) {
        const { error: delAError } = await this.client
          .from('activity_answers')
          .delete()
          .in('id', removedAnswerIds);

        if (delAError) throw delAError;
      }

      const answersToInsert: Array<{
        question_id: string;
        answer_text: string;
        is_correct: boolean;
        order_index: number;
      }> = [];

      for (const [aIndex, a] of validAnswers.entries()) {
        const answerPayload = {
          answer_text: a.answer_text,
          is_correct: a.is_correct || false,
          order_index: a.order_index ?? aIndex,
        };

        if (a.id && existingAnswerIds.has(a.id)) {
          const { error: updAError } = await this.client
            .from('activity_answers')
            .update(answerPayload)
            .eq('id', a.id)
            .eq('question_id', questionId);

          if (updAError) throw updAError;
        } else {
          answersToInsert.push({
            question_id: questionId,
            ...answerPayload,
          });
        }
      }

      if (answersToInsert.length > 0) {
        const { error: insAError } = await this.client
          .from('activity_answers')
          .insert(answersToInsert);

        if (insAError) throw insAError;
      }
    }
  }
}
