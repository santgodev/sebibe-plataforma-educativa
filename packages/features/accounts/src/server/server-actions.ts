'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { enhanceAction } from '@kit/next/actions';
import { getLogger } from '@kit/shared/logger';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { DeletePersonalAccountSchema } from '../schema/delete-personal-account.schema';
import { createDeletePersonalAccountService } from './services/delete-personal-account.service';

const enableAccountDeletion =
  process.env.NEXT_PUBLIC_ENABLE_PERSONAL_ACCOUNT_DELETION === 'true';

export async function refreshAuthSession() {
  const client = getSupabaseServerClient();

  await client.auth.refreshSession();

  return {};
}

export const deletePersonalAccountAction = enhanceAction(
  async (formData: FormData, user) => {
    const logger = await getLogger();

    // validate the form data
    const { success } = DeletePersonalAccountSchema.safeParse(
      Object.fromEntries(formData.entries()),
    );

    if (!success) {
      throw new Error('Invalid form data');
    }

    const ctx = {
      name: 'account.delete',
      userId: user.id,
    };

    const adminClient = getSupabaseServerAdminClient();

    // Verify user has admin privileges
    const { data: roleData } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const role = roleData?.role;
    const isAdmin = role === 'administrador' || role === 'admin';

    if (!isAdmin) {
      logger.warn(ctx, `User does not have admin permissions to delete account`);
      throw new Error('Solo los administradores tienen permiso para eliminar cuentas.');
    }

    logger.info(ctx, `Deleting account...`);

    const client = getSupabaseServerClient();

    // Clean up dependent LMS and user tables
    await adminClient.from('course_enrollments').delete().eq('student_id', user.id);
    await adminClient.from('course_progress').delete().eq('student_id', user.id);
    await adminClient.from('lesson_progress').delete().eq('student_id', user.id);
    await adminClient.from('activity_attempts').delete().eq('student_id', user.id);
    await adminClient.from('students').delete().eq('user_id', user.id);
    await adminClient.from('user_roles').delete().eq('id', user.id);
    await adminClient.from('accounts').delete().eq('id', user.id);

    // create a new instance of the personal accounts service
    const service = createDeletePersonalAccountService();

    // sign out the user before deleting their account
    await client.auth.signOut();

    // delete the user's account and cancel all subscriptions
    await service.deletePersonalAccount({
      adminClient,
      userId: user.id,
      userEmail: user.email ?? null,
    });

    logger.info(ctx, `Account request successfully sent`);

    // clear the cache for all pages
    revalidatePath('/', 'layout');

    // redirect to the home page
    redirect('/');
  },
  {},
);
