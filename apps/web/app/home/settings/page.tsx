import { use } from 'react';

import { PersonalAccountSettingsContainer } from '@kit/accounts/personal-account-settings';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { PageBody } from '@kit/ui/page';

import authConfig from '~/config/auth.config';
import pathsConfig from '~/config/paths.config';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';

const callbackPath = pathsConfig.auth.callback;

const paths = {
  callback: callbackPath + `?next=${pathsConfig.app.profileSettings}`,
};

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();
  const title = i18n.t('account:settingsTab');

  return {
    title,
  };
};

async function checkIsAdmin(userId: string) {
  try {
    const adminClient = getSupabaseServerAdminClient();
    const { data: roleData } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    const role = roleData?.role;
    return role === 'administrador' || role === 'admin';
  } catch (error) {
    console.error('Error verifying admin role for settings:', error);
    return false;
  }
}

function PersonalAccountSettingsPage() {
  const user = use(requireUserInServerComponent());
  const userId = user.id;
  const isAdmin = use(checkIsAdmin(userId));

  const features = {
    enableAccountDeletion: isAdmin,
    enablePasswordUpdate: authConfig.providers.password,
  };

  return (
    <PageBody>
      <div className={'flex w-full flex-1 flex-col lg:max-w-2xl'}>
        <PersonalAccountSettingsContainer
          userId={userId}
          paths={paths}
          features={features}
        />
      </div>
    </PageBody>
  );
}

export default withI18n(PersonalAccountSettingsPage);
