import type { JwtPayload } from '@supabase/supabase-js';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarNavigation,
  SidebarTrigger,
} from '@kit/ui/shadcn-sidebar';

import { AppLogo } from '~/components/app-logo';
import { ProfileAccountDropdownContainer } from '~/components/personal-account-dropdown-container';
import { navigationConfig } from '~/config/navigation.config';
import { Tables } from '~/lib/database.types';

export function HomeSidebar(props: {
  account?: Tables<'accounts'>;
  user: JwtPayload;
  role?: string;
}) {
  const isAdministrador = props.role === 'administrador';
  const isProfesor = props.role === 'profesor';
  const isStaff = isAdministrador || isProfesor;
  
  // Clonamos y filtramos la configuración basada en el rol
  const filteredConfig = {
    ...navigationConfig,
    routes: navigationConfig.routes.map(group => ({
      ...group,
      children: group.children?.filter(child => {
        if (!isStaff) {
          // Ocultar rutas de admin si no es admin ni profesor
          const adminPaths = ['/home/admin-cohorts', '/home/admin-courses', '/home/admin-users'];
          if (child.path && adminPaths.includes(child.path)) {
            return false;
          }
        } else if (isProfesor) {
          if (child.path === '/home/admin-users') {
            return false;
          }
        }
        return true;
      })
    }))
  };

  return (
    <Sidebar collapsible={'icon'}>
      <SidebarHeader className={'h-16 justify-center'}>
        <div className={'flex w-full items-center justify-center'}>
          <div className="flex w-full justify-center overflow-hidden">
            <AppLogo className={'max-w-full'} />
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarNavigation config={filteredConfig} />
      </SidebarContent>

      <SidebarFooter>
        <ProfileAccountDropdownContainer
          user={props.user}
          account={props.account}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
