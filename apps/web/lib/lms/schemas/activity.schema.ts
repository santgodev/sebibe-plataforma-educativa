import { z } from 'zod';

export const QuestionTypeSchema = z.enum([
  'single_choice',
  'multiple_choice',
  'true_false',
  'matching',
  'fill_blank',
  'order_steps',
]);

export const ActivityAnswerSchema = z.object({
  id: z.string().uuid().optional(),
  answer_text: z.string().min(1),
  is_correct: z.boolean().default(false),
  order_index: z.number().int().optional(),
});

export const ActivityQuestionSchema = z.object({
  id: z.string().uuid().optional(),
  question_text: z.string().min(1),
  type: QuestionTypeSchema,
  points: z.number().int().min(1).default(1),
  order_index: z.number().int().optional(),
  feedback_text: z.string().optional(),
  answers: z.array(ActivityAnswerSchema).min(1),
});

const BaseActivitySchema = z.object({
  lesson_id: z.string().uuid().optional(),
  course_id: z.string().uuid().optional(),
  type: z.enum(['quick_quiz', 'reflection', 'practical', 'final_eval']),
  title: z.string().min(3).max(255),
  description: z.string().optional(),
  instructions: z.string().optional(),
  passing_score: z.number().int().min(0).max(100).default(70),
  max_attempts: z.number().int().min(1).optional(),
  time_limit_minutes: z.number().int().min(0).optional(),
  automatic_feedback_enabled: z.boolean().default(false),
  questions: z.array(ActivityQuestionSchema).optional(),
});

export const CreateActivitySchema = BaseActivitySchema.refine(
  (data) => data.lesson_id || data.course_id,
  {
    message: 'Activity must be associated with either a lesson or a course.',
    path: ['lesson_id'],
  }
);

export const UpdateActivitySchema = BaseActivitySchema.partial().extend({
  id: z.string().uuid(),
});

export const SubmitActivityAttemptSchema = z.object({
  activity_id: z.string().uuid(),
  answers: z.record(z.string(), z.any()), // e.g. { "questionId": ["answer1", "answer2"] }
});
