export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  public: {
    Tables: {
      accounts: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          email: string | null;
          id: string;
          name: string;
          picture_url: string | null;
          public_data: Json;
          updated_at: string | null;
          updated_by: string | null;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          email?: string | null;
          id?: string;
          name: string;
          picture_url?: string | null;
          public_data?: Json;
          updated_at?: string | null;
          updated_by?: string | null;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          email?: string | null;
          id?: string;
          name?: string;
          picture_url?: string | null;
          public_data?: Json;
          updated_at?: string | null;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      activities: {
        Row: {
          allowed_file_types: string[] | null;
          automatic_feedback_enabled: boolean | null;
          course_id: string | null;
          created_at: string | null;
          description: string | null;
          id: string;
          instructions: string | null;
          lesson_id: string | null;
          max_attempts: number | null;
          min_length_words: number | null;
          passing_score: number | null;
          time_limit_minutes: number | null;
          title: string;
          type: Database['public']['Enums']['activity_type'];
          updated_at: string | null;
        };
        Insert: {
          allowed_file_types?: string[] | null;
          automatic_feedback_enabled?: boolean | null;
          course_id?: string | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          instructions?: string | null;
          lesson_id?: string | null;
          max_attempts?: number | null;
          min_length_words?: number | null;
          passing_score?: number | null;
          time_limit_minutes?: number | null;
          title: string;
          type: Database['public']['Enums']['activity_type'];
          updated_at?: string | null;
        };
        Update: {
          allowed_file_types?: string[] | null;
          automatic_feedback_enabled?: boolean | null;
          course_id?: string | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          instructions?: string | null;
          lesson_id?: string | null;
          max_attempts?: number | null;
          min_length_words?: number | null;
          passing_score?: number | null;
          time_limit_minutes?: number | null;
          title?: string;
          type?: Database['public']['Enums']['activity_type'];
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'activities_course_id_fkey';
            columns: ['course_id'];
            isOneToOne: false;
            referencedRelation: 'courses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'activities_lesson_id_fkey';
            columns: ['lesson_id'];
            isOneToOne: false;
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          },
        ];
      };
      activity_answers: {
        Row: {
          answer_text: string;
          created_at: string | null;
          id: string;
          is_correct: boolean;
          order_index: number;
          question_id: string;
        };
        Insert: {
          answer_text: string;
          created_at?: string | null;
          id?: string;
          is_correct?: boolean;
          order_index?: number;
          question_id: string;
        };
        Update: {
          answer_text?: string;
          created_at?: string | null;
          id?: string;
          is_correct?: boolean;
          order_index?: number;
          question_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'activity_answers_question_id_fkey';
            columns: ['question_id'];
            isOneToOne: false;
            referencedRelation: 'activity_questions';
            referencedColumns: ['id'];
          },
        ];
      };
      activity_attempts: {
        Row: {
          activity_id: string;
          answers_json: Json | null;
          attempt_number: number;
          completed_at: string | null;
          file_url: string | null;
          id: string;
          score: number | null;
          started_at: string | null;
          status: string | null;
          student_id: string;
        };
        Insert: {
          activity_id: string;
          answers_json?: Json | null;
          attempt_number?: number;
          completed_at?: string | null;
          file_url?: string | null;
          id?: string;
          score?: number | null;
          started_at?: string | null;
          status?: string | null;
          student_id: string;
        };
        Update: {
          activity_id?: string;
          answers_json?: Json | null;
          attempt_number?: number;
          completed_at?: string | null;
          file_url?: string | null;
          id?: string;
          score?: number | null;
          started_at?: string | null;
          status?: string | null;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'activity_attempts_activity_id_fkey';
            columns: ['activity_id'];
            isOneToOne: false;
            referencedRelation: 'activities';
            referencedColumns: ['id'];
          },
        ];
      };
      activity_questions: {
        Row: {
          activity_id: string;
          created_at: string | null;
          feedback_text: string | null;
          id: string;
          order_index: number;
          points: number | null;
          question_text: string;
          type: Database['public']['Enums']['question_type'];
        };
        Insert: {
          activity_id: string;
          created_at?: string | null;
          feedback_text?: string | null;
          id?: string;
          order_index?: number;
          points?: number | null;
          question_text: string;
          type?: Database['public']['Enums']['question_type'];
        };
        Update: {
          activity_id?: string;
          created_at?: string | null;
          feedback_text?: string | null;
          id?: string;
          order_index?: number;
          points?: number | null;
          question_text?: string;
          type?: Database['public']['Enums']['question_type'];
        };
        Relationships: [
          {
            foreignKeyName: 'activity_questions_activity_id_fkey';
            columns: ['activity_id'];
            isOneToOne: false;
            referencedRelation: 'activities';
            referencedColumns: ['id'];
          },
        ];
      };
      certificates: {
        Row: {
          course_id: string;
          id: string;
          issued_at: string | null;
          student_id: string;
          verification_code: string;
        };
        Insert: {
          course_id: string;
          id?: string;
          issued_at?: string | null;
          student_id: string;
          verification_code: string;
        };
        Update: {
          course_id?: string;
          id?: string;
          issued_at?: string | null;
          student_id?: string;
          verification_code?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'certificates_course_id_fkey';
            columns: ['course_id'];
            isOneToOne: false;
            referencedRelation: 'courses';
            referencedColumns: ['id'];
          },
        ];
      };
      course_enrollments: {
        Row: {
          completed_at: string | null;
          course_id: string;
          enrolled_at: string | null;
          id: string;
          student_id: string;
        };
        Insert: {
          completed_at?: string | null;
          course_id: string;
          enrolled_at?: string | null;
          id?: string;
          student_id: string;
        };
        Update: {
          completed_at?: string | null;
          course_id?: string;
          enrolled_at?: string | null;
          id?: string;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'course_enrollments_course_id_fkey';
            columns: ['course_id'];
            isOneToOne: false;
            referencedRelation: 'courses';
            referencedColumns: ['id'];
          },
        ];
      };
      course_modules: {
        Row: {
          course_id: string;
          created_at: string | null;
          deleted_at: string | null;
          id: string;
          order_index: number;
          title: string;
          updated_at: string | null;
          version: number;
        };
        Insert: {
          course_id: string;
          created_at?: string | null;
          deleted_at?: string | null;
          id?: string;
          order_index?: number;
          title: string;
          updated_at?: string | null;
          version?: number;
        };
        Update: {
          course_id?: string;
          created_at?: string | null;
          deleted_at?: string | null;
          id?: string;
          order_index?: number;
          title?: string;
          updated_at?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'course_modules_course_id_fkey';
            columns: ['course_id'];
            isOneToOne: false;
            referencedRelation: 'courses';
            referencedColumns: ['id'];
          },
        ];
      };
      course_progress: {
        Row: {
          completed_at: string | null;
          course_id: string;
          created_at: string | null;
          id: string;
          percentage_completed: number | null;
          status: string | null;
          student_id: string;
          updated_at: string | null;
        };
        Insert: {
          completed_at?: string | null;
          course_id: string;
          created_at?: string | null;
          id?: string;
          percentage_completed?: number | null;
          status?: string | null;
          student_id: string;
          updated_at?: string | null;
        };
        Update: {
          completed_at?: string | null;
          course_id?: string;
          created_at?: string | null;
          id?: string;
          percentage_completed?: number | null;
          status?: string | null;
          student_id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'course_progress_course_id_fkey';
            columns: ['course_id'];
            isOneToOne: false;
            referencedRelation: 'courses';
            referencedColumns: ['id'];
          },
        ];
      };
      courses: {
        Row: {
          category: string | null;
          created_at: string | null;
          deleted_at: string | null;
          duration_minutes: number | null;
          id: string;
          instructor_id: string;
          level: Database['public']['Enums']['course_level'] | null;
          long_description: string | null;
          program_id: string | null;
          short_description: string | null;
          slug: string;
          status: Database['public']['Enums']['course_status'] | null;
          thumbnail_url: string | null;
          title: string;
          updated_at: string | null;
          version: number;
        };
        Insert: {
          category?: string | null;
          created_at?: string | null;
          deleted_at?: string | null;
          duration_minutes?: number | null;
          id?: string;
          instructor_id: string;
          level?: Database['public']['Enums']['course_level'] | null;
          long_description?: string | null;
          program_id?: string | null;
          short_description?: string | null;
          slug: string;
          status?: Database['public']['Enums']['course_status'] | null;
          thumbnail_url?: string | null;
          title: string;
          updated_at?: string | null;
          version?: number;
        };
        Update: {
          category?: string | null;
          created_at?: string | null;
          deleted_at?: string | null;
          duration_minutes?: number | null;
          id?: string;
          instructor_id?: string;
          level?: Database['public']['Enums']['course_level'] | null;
          long_description?: string | null;
          program_id?: string | null;
          short_description?: string | null;
          slug?: string;
          status?: Database['public']['Enums']['course_status'] | null;
          thumbnail_url?: string | null;
          title?: string;
          updated_at?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'courses_program_id_fkey';
            columns: ['program_id'];
            isOneToOne: false;
            referencedRelation: 'programs';
            referencedColumns: ['id'];
          },
        ];
      };
      lesson_blocks: {
        Row: {
          content: Json;
          created_at: string | null;
          id: string;
          lesson_id: string;
          order_index: number;
          type: Database['public']['Enums']['block_type'];
          updated_at: string | null;
        };
        Insert: {
          content?: Json;
          created_at?: string | null;
          id?: string;
          lesson_id: string;
          order_index?: number;
          type: Database['public']['Enums']['block_type'];
          updated_at?: string | null;
        };
        Update: {
          content?: Json;
          created_at?: string | null;
          id?: string;
          lesson_id?: string;
          order_index?: number;
          type?: Database['public']['Enums']['block_type'];
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'lesson_blocks_lesson_id_fkey';
            columns: ['lesson_id'];
            isOneToOne: false;
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          },
        ];
      };
      lesson_progress: {
        Row: {
          completed_at: string | null;
          created_at: string | null;
          id: string;
          is_completed: boolean | null;
          last_watched_seconds: number | null;
          lesson_id: string;
          student_id: string;
          updated_at: string | null;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string | null;
          id?: string;
          is_completed?: boolean | null;
          last_watched_seconds?: number | null;
          lesson_id: string;
          student_id: string;
          updated_at?: string | null;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string | null;
          id?: string;
          is_completed?: boolean | null;
          last_watched_seconds?: number | null;
          lesson_id?: string;
          student_id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'lesson_progress_lesson_id_fkey';
            columns: ['lesson_id'];
            isOneToOne: false;
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          },
        ];
      };
      lesson_resources: {
        Row: {
          created_at: string | null;
          file_type: string | null;
          file_url: string;
          id: string;
          lesson_id: string;
          title: string;
        };
        Insert: {
          created_at?: string | null;
          file_type?: string | null;
          file_url: string;
          id?: string;
          lesson_id: string;
          title: string;
        };
        Update: {
          created_at?: string | null;
          file_type?: string | null;
          file_url?: string;
          id?: string;
          lesson_id?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'lesson_resources_lesson_id_fkey';
            columns: ['lesson_id'];
            isOneToOne: false;
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          },
        ];
      };
      lessons: {
        Row: {
          created_at: string | null;
          deleted_at: string | null;
          duration_seconds: number | null;
          id: string;
          is_published: boolean | null;
          module_id: string;
          order_index: number;
          title: string;
          updated_at: string | null;
          version: number;
        };
        Insert: {
          created_at?: string | null;
          deleted_at?: string | null;
          duration_seconds?: number | null;
          id?: string;
          is_published?: boolean | null;
          module_id: string;
          order_index?: number;
          title: string;
          updated_at?: string | null;
          version?: number;
        };
        Update: {
          created_at?: string | null;
          deleted_at?: string | null;
          duration_seconds?: number | null;
          id?: string;
          is_published?: boolean | null;
          module_id?: string;
          order_index?: number;
          title?: string;
          updated_at?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'lessons_module_id_fkey';
            columns: ['module_id'];
            isOneToOne: false;
            referencedRelation: 'course_modules';
            referencedColumns: ['id'];
          },
        ];
      };
      programs: {
        Row: {
          cover_image: string | null;
          created_at: string | null;
          description: string | null;
          id: string;
          slug: string;
          title: string;
          updated_at: string | null;
        };
        Insert: {
          cover_image?: string | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          slug: string;
          title: string;
          updated_at?: string | null;
        };
        Update: {
          cover_image?: string | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          slug?: string;
          title?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string | null;
          id: string;
          role: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          id: string;
          role: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          role?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      enroll_by_email: {
        Args: { course_slug: string; user_email: string };
        Returns: undefined;
      };
      reorder_lessons: { Args: { lesson_updates: Json }; Returns: undefined };
      reorder_modules: { Args: { module_updates: Json }; Returns: undefined };
    };
    Enums: {
      activity_type: 'quick_quiz' | 'reflection' | 'practical' | 'final_eval';
      block_type:
        | 'video'
        | 'text'
        | 'image'
        | 'quote'
        | 'pdf'
        | 'activity'
        | 'question'
        | 'button'
        | 'download';
      course_level: 'beginner' | 'intermediate' | 'advanced' | 'all_levels';
      course_status: 'draft' | 'published' | 'archived';
      lesson_type: 'video' | 'text' | 'pdf' | 'external_resource' | 'quiz';
      question_type:
        | 'single_choice'
        | 'multiple_choice'
        | 'true_false'
        | 'open_text'
        | 'matching'
        | 'fill_blank'
        | 'order_steps';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  'public'
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      activity_type: ['quick_quiz', 'reflection', 'practical', 'final_eval'],
      block_type: [
        'video',
        'text',
        'image',
        'quote',
        'pdf',
        'activity',
        'question',
        'button',
        'download',
      ],
      course_level: ['beginner', 'intermediate', 'advanced', 'all_levels'],
      course_status: ['draft', 'published', 'archived'],
      lesson_type: ['video', 'text', 'pdf', 'external_resource', 'quiz'],
      question_type: [
        'single_choice',
        'multiple_choice',
        'true_false',
        'open_text',
        'matching',
        'fill_blank',
        'order_steps',
      ],
    },
  },
} as const;
