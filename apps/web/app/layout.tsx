

import { Toaster } from '@kit/ui/sonner';
import { cn } from '@kit/ui/utils';

import { RootProviders } from '~/components/root-providers';
import { heading, sans } from '~/lib/fonts';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { generateRootMetadata } from '~/lib/root-metdata';

import '../styles/globals.css';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { language } = await createI18nServerInstance();
  const className = getClassName();

  return (
    <html lang={language} className={className} suppressHydrationWarning>
      <body className="bg-background text-foreground min-h-screen antialiased">
        <RootProviders theme="light" lang={language}>
          {children}
        </RootProviders>

        <Toaster richColors={true} theme="light" position="top-center" />
      </body>
    </html>
  );
}

function getClassName() {
  const font = [sans.variable, heading.variable].reduce<string[]>(
    (acc, curr) => {
      if (acc.includes(curr)) return acc;

      return [...acc, curr];
    },
    [],
  );

  return cn('light', ...font);
}

export const generateMetadata = generateRootMetadata;
