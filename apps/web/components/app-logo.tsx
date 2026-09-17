import Link from 'next/link';

import { cn } from '@kit/ui/utils';

function LogoImage({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center justify-center', className)}>
      <img
        src="/img/logo-main.png"
        alt="Sebibe Logo"
        className="block h-10 w-auto object-contain group-data-[collapsible=icon]:hidden"
      />
      <img
        src="/img/logo-main.png"
        alt="Sebibe Logo Icon"
        className="hidden h-8 w-auto object-contain group-data-[collapsible=icon]:block"
      />
    </span>
  );
}

export function AppLogo({
  href,
  label,
  className,
}: {
  href?: string | null;
  className?: string;
  label?: string;
}) {
  if (href === null) {
    return <LogoImage className={className} />;
  }

  return (
    <Link aria-label={label ?? 'Home Page'} href={href ?? '/'}>
      <LogoImage className={className} />
    </Link>
  );
}
