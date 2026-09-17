import { CalendarDays, GraduationCap, Home, PencilRuler, User, Users } from 'lucide-react';
import { z } from 'zod';

import { NavigationConfigSchema } from '@kit/ui/navigation-schema';

import pathsConfig from '~/config/paths.config';

const iconClasses = 'w-4';

const routes = [
  {
    label: 'common:routes.application',
    children: [
      {
        label: 'Ruta Teológica',
        path: '/home/courses',
        Icon: <Home className={iconClasses} />,
        end: true,
      },
      {
        label: 'Gestión de Cohortes',
        path: '/home/admin-cohorts',
        Icon: <CalendarDays className={iconClasses} />,
      },
      {
        label: 'Gestión de Materias',
        path: '/home/admin-courses',
        Icon: <PencilRuler className={iconClasses} />,
      },
      {
        label: 'Gestión de Usuarios',
        path: '/home/admin-users',
        Icon: <Users className={iconClasses} />,
      },
    ],
  },
  {
    label: 'common:routes.settings',
    children: [
      {
        label: 'common:routes.profile',
        path: pathsConfig.app.profileSettings,
        Icon: <User className={iconClasses} />,
      },
    ],
  },
] satisfies z.infer<typeof NavigationConfigSchema>['routes'];

export const navigationConfig = NavigationConfigSchema.parse({
  routes,
  style: process.env.NEXT_PUBLIC_NAVIGATION_STYLE,
  sidebarCollapsed: process.env.NEXT_PUBLIC_HOME_SIDEBAR_COLLAPSED,
});
