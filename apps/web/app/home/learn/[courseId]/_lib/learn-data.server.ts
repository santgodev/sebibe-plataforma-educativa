import 'server-only';

import { unstable_cache } from 'next/cache';
import { cache } from 'react';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

const inFlightCache = new Map<string, Promise<any>>();

/**
 * Deduplicates concurrent cache misses for the same key within the same server
 * instance so a burst of 50 simultaneous students only triggers 1 DB fetch.
 */
function singleFlight<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inFlightCache.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const promise = fn().finally(() => {
    inFlightCache.delete(key);
  });
  inFlightCache.set(key, promise);
  return promise;
}

const fetchCourseOutlineShared = unstable_cache(
  async (courseId: string) => {
    const adminClient = getSupabaseServerAdminClient();
    const { data, error } = await adminClient
      .from('courses')
      .select(
        `
        id, title,
        course_modules (
          id, title, order_index,
          lessons ( id, title, order_index, deleted_at )
        )
      `,
      )
      .eq('id', courseId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      return { data: null, error: error.message };
    }
    return { data, error: null };
  },
  ['lms-course-outline'],
  { revalidate: 300, tags: ['lms-content'] },
);

const fetchLessonBundleShared = unstable_cache(
  async (lessonId: string) => {
    const adminClient = getSupabaseServerAdminClient();

    const [lessonRes, blocksRes, directActivityRes] = await Promise.all([
      adminClient
        .from('lessons')
        .select('*')
        .eq('id', lessonId)
        .is('deleted_at', null)
        .maybeSingle(),
      adminClient
        .from('lesson_blocks')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('order_index', { ascending: true }),
      adminClient
        .from('activities')
        .select('*, activity_questions(*, activity_answers(*))')
        .eq('lesson_id', lessonId)
        .maybeSingle(),
    ]);

    if (lessonRes.error || !lessonRes.data) {
      return null;
    }

    const blocks = blocksRes.data || [];
    const directActivity = directActivityRes.data || null;

    const activityIdSet = new Set<string>();
    const extraBlockActivityIds: string[] = [];

    if (directActivity?.id) {
      activityIdSet.add(directActivity.id);
    }

    for (const block of blocks) {
      const c = block.content as any;
      if (block.type === 'activity' && c?.activity_id) {
        if (!activityIdSet.has(c.activity_id)) {
          activityIdSet.add(c.activity_id);
          extraBlockActivityIds.push(c.activity_id);
        }
      }
    }

    const activitiesList: any[] = [];
    if (directActivity) {
      activitiesList.push(directActivity);
    }

    if (extraBlockActivityIds.length > 0) {
      const { data: extraActs } = await adminClient
        .from('activities')
        .select('*, activity_questions(*, activity_answers(*))')
        .in('id', extraBlockActivityIds);
      if (extraActs) {
        activitiesList.push(...extraActs);
      }
    }

    return {
      lesson: lessonRes.data,
      blocks,
      directActivity,
      activitiesList,
      activityIds: Array.from(activityIdSet),
    };
  },
  ['lms-lesson-bundle'],
  { revalidate: 300, tags: ['lms-content'] },
);

const fetchCoursesCatalogShared = unstable_cache(
  async () => {
    const adminClient = getSupabaseServerAdminClient();
    const { data } = await adminClient
      .from('courses')
      .select(
        `
        id, title, slug, short_description, thumbnail_url, duration_minutes, level, status, created_at,
        course_modules (
          id, title, order_index,
          lessons ( id, title, order_index, deleted_at )
        )
      `,
      )
      .is('deleted_at', null);

    return data || [];
  },
  ['lms-courses-catalog'],
  { revalidate: 300, tags: ['lms-content'] },
);

const fetchActivitiesCatalogShared = unstable_cache(
  async () => {
    const adminClient = getSupabaseServerAdminClient();
    const { data } = await adminClient.from('activities').select(`
      id, title, type, passing_score, course_id, lesson_id,
      activity_questions (
        id, question_text, type, order_index,
        activity_answers ( id, answer_text, is_correct, order_index )
      ),
      lessons (
        id, title,
        course_modules (
          id, title, course_id,
          courses ( id, title, thumbnail_url, short_description )
        )
      )
    `);

    return data || [];
  },
  ['lms-activities-catalog'],
  { revalidate: 300, tags: ['lms-content'] },
);

/**
 * Shared cached course outline across all students (300s TTL + single-flight + tag invalidation).
 */
export const getCachedCourseOutline = cache(async (courseId: string) => {
  return singleFlight(`course-outline:${courseId}`, () =>
    fetchCourseOutlineShared(courseId),
  );
});

/**
 * Shared cached lesson + blocks + full activities across all students (300s TTL + single-flight + tag invalidation).
 */
export const getCachedLessonBundle = cache(async (lessonId: string) => {
  return singleFlight(`lesson-bundle:${lessonId}`, () =>
    fetchLessonBundleShared(lessonId),
  );
});

/**
 * Shared cached course catalog (300s TTL + single-flight + tag invalidation).
 */
export const getCachedCoursesCatalog = cache(async () => {
  return singleFlight('courses-catalog', () => fetchCoursesCatalogShared());
});

/**
 * Shared cached activities metadata + questions + course hierarchy (300s TTL + single-flight + tag invalidation).
 */
export const getCachedActivitiesCatalog = cache(async () => {
  return singleFlight('activities-catalog', () =>
    fetchActivitiesCatalogShared(),
  );
});

export interface StudentLessonState {
  role: string | null;
  is_enrolled: boolean;
  is_instructor: boolean;
  account: { name: string | null; picture_url: string | null };
  lesson_completed: boolean;
  notes: Array<{ id: string; content: string; created_at: string }>;
  comments: Array<{
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    display_name: string;
    avatar_url: string | null;
  }>;
  attempts: any[];
}

/**
 * Fetches all per-student dynamic state for a lesson in a SINGLE Postgres RPC call.
 */
export const getStudentLessonState = cache(
  async (
    courseId: string,
    lessonId: string,
    activityIds: string[],
  ): Promise<StudentLessonState | null> => {
    const client = getSupabaseServerClient();
    const { data, error } = await (client as any).rpc(
      'get_student_lesson_state',
      {
        p_course_id: courseId,
        p_lesson_id: lessonId,
        p_activity_ids: activityIds,
      },
    );

    if (error || !data) {
      console.error('Error calling get_student_lesson_state RPC:', error);
      return null;
    }

    return data as StudentLessonState;
  },
);

export interface StudentGradesState {
  enrollments: Array<{ course_id: string; enrolled_at: string }>;
  completed_lesson_ids: string[];
  attempts: Array<{
    id: string;
    activity_id: string;
    score: number | null;
    status: string | null;
    completed_at: string | null;
    attempt_number: number | null;
    file_url: string | null;
    answers_json: any;
  }>;
}

/**
 * Fetches all per-student grades state in a SINGLE lightweight Postgres RPC call.
 */
export const getStudentGradesState = cache(
  async (): Promise<StudentGradesState> => {
    const client = getSupabaseServerClient();
    const { data, error } = await (client as any).rpc(
      'get_student_grades_state',
    );

    if (error || !data) {
      console.error('Error calling get_student_grades_state RPC:', error);
      return {
        enrollments: [],
        completed_lesson_ids: [],
        attempts: [],
      };
    }

    return data as StudentGradesState;
  },
);
