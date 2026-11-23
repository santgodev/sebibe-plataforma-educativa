import 'server-only';

import { unstable_cache } from 'next/cache';
import { cache } from 'react';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

const inFlightRoles = new Map<string, Promise<string | null>>();

const fetchUserRoleCached = unstable_cache(
  async (userId: string) => {
    const adminClient = getSupabaseServerAdminClient();
    const { data } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    return data?.role ?? null;
  },
  ['user-role'],
  { revalidate: 300, tags: ['user-roles'] },
);

/**
 * Fetches the current user's role using cross-request unstable_cache (300s TTL),
 * single-flight deduplication across concurrent requests, and React.cache.
 */
export const getCachedUserRole = cache(async (userId: string) => {
  const existing = inFlightRoles.get(userId);
  if (existing) {
    return existing;
  }

  const promise = fetchUserRoleCached(userId).finally(() => {
    inFlightRoles.delete(userId);
  });
  inFlightRoles.set(userId, promise);
  return promise;
});
