'use client';

import { usePathname } from 'next/navigation';

import { AppLogo } from '~/components/app-logo';
import { HomeMobileNavigation } from './home-mobile-navigation';

export function MobileNavigation({ role }: { role?: string }) {
  const pathname = usePathname();
  const isLearnPage = pathname?.startsWith('/home/learn');

  // Modo Aula Inmersiva en celulares:
  // Si el estudiante está dentro de una lección o evaluación (/home/learn/...),
  // ocultamos la barra global de navegación para que la pantalla del celular sea 100% para el contenido.
  if (isLearnPage) {
    return <span className="hide-parent-mobile-nav hidden" />;
  }

  return (
    <>
      <AppLogo />
      <HomeMobileNavigation role={role} />
    </>
  );
}
