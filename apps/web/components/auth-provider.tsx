'use client';

import { useAuthChangeListener } from '@kit/supabase/hooks/use-auth-change-listener';

import pathsConfig from '~/config/paths.config';
import { SessionInactivityTimeout } from '~/components/session-inactivity-timeout';

export function AuthProvider(props: React.PropsWithChildren) {
  useAuthChangeListener({
    appHomePath: pathsConfig.app.home,
  });

  return (
    <>
      <SessionInactivityTimeout />
      {props.children}
    </>
  );
}
