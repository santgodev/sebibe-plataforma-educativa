import { use } from 'react';

import { cookies } from 'next/headers';

import {
  Page,
  PageLayoutStyle,
  PageMobileNavigation,
  PageNavigation,
} from '@kit/ui/page';
import { SidebarProvider } from '@kit/ui/shadcn-sidebar';

import { AppLogo } from '~/components/app-logo';
import { navigationConfig } from '~/config/navigation.config';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { withI18n } from '~/lib/i18n/with-i18n';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';

// home imports
import { HomeMenuNavigation } from './_components/home-menu-navigation';
import { HomeMobileNavigation } from './_components/home-mobile-navigation';
import { HomeSidebar } from './_components/home-sidebar';

function HomeLayout({ children }: React.PropsWithChildren) {
  const style = use(getLayoutStyle());
  const [user] = use(Promise.all([requireUserInServerComponent()]));
  const role = use(getUserRole(user.id));

  if (style === 'sidebar') {
    return <SidebarLayout role={role}>{children}</SidebarLayout>;
  }

  return <HeaderLayout role={role}>{children}</HeaderLayout>;
}

export default withI18n(HomeLayout);

async function getUserRole(userId: string) {
  const client = getSupabaseServerClient();
  const { data } = await client.from('user_roles').select('role').eq('id', userId).single();
  return data?.role || 'student';
}

function SidebarLayout({ children, role }: React.PropsWithChildren<{ role?: string }>) {
  const sidebarMinimized = navigationConfig.sidebarCollapsed;
  const [user] = use(Promise.all([requireUserInServerComponent()]));

  return (
    <SidebarProvider defaultOpen={sidebarMinimized}>
      <Page style={'sidebar'}>
        <PageNavigation>
          <HomeSidebar user={user} role={role} />
        </PageNavigation>

        <PageMobileNavigation className={'flex items-center justify-between'}>
          <MobileNavigation role={role} />
        </PageMobileNavigation>

        {children}
      </Page>
    </SidebarProvider>
  );
}

function HeaderLayout({ children, role }: React.PropsWithChildren<{ role?: string }>) {
  return (
    <Page style={'header'}>
      <PageNavigation>
        <HomeMenuNavigation role={role} />
      </PageNavigation>

      <PageMobileNavigation className={'flex items-center justify-between'}>
        <MobileNavigation role={role} />
      </PageMobileNavigation>

      {children}
    </Page>
  );
}

function MobileNavigation({ role }: { role?: string }) {
  return (
    <>
      <AppLogo />

      <HomeMobileNavigation role={role} />
    </>
  );
}

async function getLayoutStyle() {
  const cookieStore = await cookies();

  return (
    (cookieStore.get('layout-style')?.value as PageLayoutStyle) ??
    navigationConfig.style
  );
}
