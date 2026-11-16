'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Clock } from 'lucide-react';
import { toast } from 'sonner';

export function InactivityNotice() {
  const searchParams = useSearchParams();
  const [showNotice, setShowNotice] = useState(false);

  useEffect(() => {
    const hasParam = searchParams.get('inactivity') === 'true';
    const hasStorage =
      typeof window !== 'undefined' &&
      sessionStorage.getItem('sebibe_inactivity_logout') === 'true';

    if (hasParam || hasStorage) {
      setShowNotice(true);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('sebibe_inactivity_logout');
      }

      toast.warning('Tu sesión se cerró por inactividad', {
        description: 'Por seguridad, ingresa tus credenciales de nuevo.',
        duration: 6000,
      });
    }
  }, [searchParams]);

  if (!showNotice) {
    return null;
  }

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 p-3.5 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5 animate-in fade-in duration-300 mb-2">
      <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
      <div>
        <p className="font-semibold text-xs">Sesión finalizada por inactividad</p>
        <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5 leading-relaxed">
          Por motivos de seguridad, tu sesión se cerró automáticamente tras un periodo sin interacción. Por favor, inicia sesión para continuar.
        </p>
      </div>
    </div>
  );
}

