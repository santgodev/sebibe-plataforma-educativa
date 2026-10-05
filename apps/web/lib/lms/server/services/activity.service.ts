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

    const hasOpenText = fullActivity.activity_questions.some((q: any) => q.type === 'open_text');

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
        case 'matching': {
          const normalize = (str: string) =>
            str
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .trim()
              .toLowerCase();

          if (typeof studentAnswer === 'object' && studentAnswer !== null) {
            let allPairsCorrect = true;
            let pairCount = 0;
            for (const a of question.activity_answers) {
              const parts = (a.answer_text || '').split('|').map((s: string) => s.trim());
              if (parts.length >= 2) {
                pairCount++;
                const expectedDef = parts.slice(1).join('|').trim();
                const studentVal = String(studentAnswer[a.id] || studentAnswer[parts[0]] || '').trim();
                if (normalize(studentVal) !== normalize(expectedDef)) {
                  allPairsCorrect = false;
                  break;
                }
              }
            }
            isCorrect = allPairsCorrect && pairCount > 0;
          } else {
            isCorrect = false;
          }
          break;
        }
        case 'fill_blank':
          // Las preguntas de completar espacios NO se califican automáticamente; el profesor debe asignar la nota
          isCorrect = false;
          break;
        case 'open_text':
          // Las preguntas abiertas NO se califican automáticamente; el profesor debe asignar la nota
          isCorrect = false;
          break;
        case 'order_steps': {
          const sortedAnswers = [...question.activity_answers].sort(
            (a: any, b: any) => (a.order_index || 0) - (b.order_index || 0)
          );
          const correctOrderIds = sortedAnswers.map((a: any) => a.id);
          const correctOrderTexts = sortedAnswers.map((a: any) => (a.answer_text || '').trim().toLowerCase());
          if (Array.isArray(studentAnswer)) {
            const parsedStudentIds = studentAnswer.map((s: any) =>
              typeof s === 'object' && s !== null && s.id ? s.id : String(s || '')
            );
            const isIdMatch = JSON.stringify(correctOrderIds) === JSON.stringify(parsedStudentIds);
            const isTextMatch =
              JSON.stringify(correctOrderTexts) ===
              JSON.stringify(studentAnswer.map((s: any) => String(s || '').trim().toLowerCase()));
            isCorrect = isIdMatch || isTextMatch;
          } else {
            isCorrect = false;
          }
          break;
        }
      }

      if (isCorrect) earnedPoints += question.points || 1;
      feedback[question.id] = {
        isCorrect,
        feedbackText: question.type === 'open_text'
          ? 'Respuesta abierta enviada al profesor para su calificación manual.'
          : question.type === 'fill_blank'
          ? 'Respuesta de completar espacios enviada al profesor para su calificación manual.'
          : question.feedback_text
      };
    }

    const hasManualGrading = fullActivity.activity_questions.some(
      (q: any) => q.type === 'open_text' || q.type === 'fill_blank'
    );
    const scorePercentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    const passed = scorePercentage >= (fullActivity.passing_score || 0);
    const status = hasManualGrading ? 'needs_grading' : (passed ? 'passed' : 'failed');

    // Save attempt
    const { error: insertError } = await this.repository['client'].from('activity_attempts').insert({
      activity_id: activityId,
      student_id: studentId,
      attempt_number: attemptNumber,
      score: scorePercentage,
      status: status,
      answers_json: submittedAnswers,
      completed_at: new Date().toISOString()
    });

    if (insertError) {
      console.error('Error saving activity attempt:', insertError);
      throw new Error(`Failed to save attempt: ${insertError.message}`);
    }

    return {
      score: scorePercentage,
      passed: hasManualGrading ? false : passed,
      status,
      needsGrading: hasManualGrading,
      feedback: fullActivity.automatic_feedback_enabled ? feedback : null
    };
  }
}
