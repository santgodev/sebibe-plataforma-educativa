import { SupabaseClient } from '@supabase/supabase-js';

import { Database } from '~/lib/database.types';

import { ActivityRepository } from '../repositories/activity.repository';

export class ActivityService {
  private repository: ActivityRepository;

  constructor(client: SupabaseClient<Database>) {
    this.repository = new ActivityRepository(client);
  }

  async getActivitiesForLesson(lessonId: string) {
    return this.repository.findByLessonId(lessonId);
  }

  async getActivityAttempts(activityId: string, studentId: string) {
    const { getSupabaseServerAdminClient } = await import('@kit/supabase/server-admin-client');
    const adminClient = getSupabaseServerAdminClient();
    
    const { data, error } = await adminClient
      .from('activity_attempts')
      .select('*')
      .eq('activity_id', activityId)
      .eq('student_id', studentId)
      .order('completed_at', { ascending: false });

    if (error) {
      console.error('Error fetching activity attempts:', error);
      throw error;
    }
    return data;
  }

  async getFinalEvaluationsForCourse(courseId: string) {
    // Usually final evaluations are attached directly to the course
    return this.repository.findByCourseId(courseId);
  }

  async getActivity(id: string) {
    return this.repository.findById(id);
  }

  async getFullActivity(id: string) {
    return this.repository.getFullActivity(id);
  }

  async createActivity(
    data: Database['public']['Tables']['activities']['Insert'],
    questions?: any[]
  ) {
    const activity = await this.repository.create(data);
    if (questions && questions.length > 0) {
      await this.repository.saveQuestionsAndAnswers(activity.id, questions);
    }
    return activity;
  }

  async updateActivity(
    id: string,
    data: Database['public']['Tables']['activities']['Update'],
    questions?: any[]
  ) {
    const activity = await this.repository.update(id, data);
    if (questions) {
      await this.repository.saveQuestionsAndAnswers(id, questions);
    }
    return activity;
  }

  async deleteActivity(id: string) {
    return this.repository.delete(id);
  }

  async evaluateQuiz(activityId: string, studentId: string, submittedAnswers: Record<string, any>) {
    const fullActivity = await this.repository.getFullActivity(activityId);
    
    // Get current attempt count
    const { count } = await this.repository['client']
      .from('activity_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('activity_id', activityId)
      .eq('student_id', studentId);
      
    const currentAttempts = count || 0;

    // Check max attempts
    if (fullActivity.max_attempts) {
      if (currentAttempts >= fullActivity.max_attempts) {
        throw new Error('Maximum attempts reached');
      }
    }
    
    const attemptNumber = currentAttempts + 1;

    let totalPoints = 0;
    let earnedPoints = 0;
    const feedback: Record<string, { isCorrect: boolean, feedbackText?: string | null }> = {};

    for (const question of fullActivity.activity_questions) {
      totalPoints += question.points || 1;
      const studentAnswer = submittedAnswers[question.id];
      let isCorrect = false;

      if (!studentAnswer) {
        feedback[question.id] = { isCorrect: false, feedbackText: question.feedback_text };
        continue;
      }

      switch (question.type) {
        case 'single_choice':
        case 'true_false':
          const correctAns = question.activity_answers.find((a: any) => a.is_correct);
          isCorrect = correctAns?.id === studentAnswer;
          break;
        case 'multiple_choice':
          const correctIds = question.activity_answers.filter((a: any) => a.is_correct).map((a: any) => a.id).sort();
          const studentIds = Array.isArray(studentAnswer) ? [...studentAnswer].sort() : [];
          isCorrect = JSON.stringify(correctIds) === JSON.stringify(studentIds);
          break;
        case 'matching':
          // For matching, answers are stored as [{ answer_text: 'A|B', is_correct: true }] maybe?
          // Or we can just do a basic string match for now
          isCorrect = true; // Placeholder for complex matching logic
          break;
        case 'fill_blank':
          const correctBlanks = question.activity_answers.filter((a: any) => a.is_correct).map((a: any) => a.answer_text.toLowerCase());
          isCorrect = correctBlanks.includes(String(studentAnswer).toLowerCase());
          break;
        case 'order_steps':
          const correctOrder = question.activity_answers.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0)).map((a: any) => a.id);
          isCorrect = JSON.stringify(correctOrder) === JSON.stringify(studentAnswer);
          break;
      }

      if (isCorrect) earnedPoints += question.points || 1;
      feedback[question.id] = { isCorrect, feedbackText: question.feedback_text };
    }

    const scorePercentage = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
    const passed = scorePercentage >= (fullActivity.passing_score || 0);

    // Save attempt
    const { error: insertError } = await this.repository['client'].from('activity_attempts').insert({
      activity_id: activityId,
      student_id: studentId,
      attempt_number: attemptNumber,
      score: scorePercentage,
      answers_json: submittedAnswers,
      completed_at: new Date().toISOString()
    });

    if (insertError) {
      console.error('Error saving activity attempt:', insertError);
      throw new Error(`Failed to save attempt: ${insertError.message}`);
    }

    return {
      score: scorePercentage,
      passed,
      feedback: fullActivity.automatic_feedback_enabled ? feedback : null
    };
  }
}
