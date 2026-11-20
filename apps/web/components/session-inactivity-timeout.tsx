'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { Clock, LogOut, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

import { useSupabase } from '@kit/supabase/hooks/use-supabase';
import { Button } from '@kit/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@kit/ui/alert-dialog';

// Configuración de tiempos (24 horas por defecto, con aviso 60 segundos antes)
const DEFAULT_TIMEOUT_MINUTES = 24 * 60;
const WARNING_SECONDS = 60;

const STORAGE_LAST_ACTIVITY_KEY = 'sebibe_last_activity';
const STORAGE_LOGGED_OUT_KEY = 'sebibe_session_logged_out';
const SESSION_INACTIVITY_FLAG = 'sebibe_inactivity_logout';

export function SessionInactivityTimeout() {
  const client = useSupabase();
  const pathname = usePathname();

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isWarningOpen, setIsWarningOpen] = useState<boolean>(false);
  const [secondsLeft, setSecondsLeft] = useState<number>(WARNING_SECONDS);

  const lastSavedRef = useRef<number>(0);
  const isLoggingOutRef = useRef<boolean>(false);

  // Determinar el tiempo de expiración total en milisegundos
  const timeoutMinutes =
    typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SESSION_INACTIVITY_TIMEOUT_MINUTES
      ? parseInt(process.env.NEXT_PUBLIC_SESSION_INACTIVITY_TIMEOUT_MINUTES, 10) || DEFAULT_TIMEOUT_MINUTES
      : DEFAULT_TIMEOUT_MINUTES;

  const timeoutMs = timeoutMinutes * 60 * 1000;
  const warningMs = WARNING_SECONDS * 1000;

  const isAuthRoute = pathname ? pathname.startsWith('/auth') : false;

  // 1. Manejador de cierre de sesión por inactividad
  const handleLogout = useCallback(async () => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;

    setIsWarningOpen(false);

    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_LAST_ACTIVITY_KEY);
        localStorage.setItem(STORAGE_LOGGED_OUT_KEY, Date.now().toString());
        sessionStorage.setItem(SESSION_INACTIVITY_FLAG, 'true');
      }

      await client.auth.signOut();
    } catch (error) {
      console.error('Error al cerrar sesión por inactividad:', error);
    } finally {
      window.location.href = '/auth/sign-in?inactivity=true';
    }
  }, [client]);

  // 2. Renovar / Extender la sesión
  const extendSession = useCallback(() => {
    const now = Date.now();
    lastSavedRef.current = now;
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_LAST_ACTIVITY_KEY, now.toString());
    }
    setIsWarningOpen(false);
    setSecondsLeft(WARNING_SECONDS);

    toast.success('Sesión activa confirmada', {
      description: 'El temporizador de inactividad ha sido reiniciado.',
      duration: 3500,
    });
  }, []);

  // 3. Monitorear estado de autenticación de Supabase
  useEffect(() => {
    let isMounted = true;

    client.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      const hasSession = !!data.session;
      setIsAuthenticated(hasSession);
      if (hasSession && typeof window !== 'undefined') {
        const existing = localStorage.getItem(STORAGE_LAST_ACTIVITY_KEY);
        if (!existing) {
          localStorage.setItem(STORAGE_LAST_ACTIVITY_KEY, Date.now().toString());
        }
      }
    });

    const { data: authListener } = client.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      const hasSession = !!session;
      setIsAuthenticated(hasSession);

      if (hasSession && typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_LAST_ACTIVITY_KEY, Date.now().toString());
        isLoggingOutRef.current = false;
      } else if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_LAST_ACTIVITY_KEY);
        setIsWarningOpen(false);
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [client]);

  // 4. Registrar interacciones del usuario (ratón, teclado, scroll, touch)
  useEffect(() => {
    if (!isAuthenticated || isAuthRoute) return;

    const handleUserActivity = () => {
      // Si la ventana de advertencia ya está abierta, no la quitamos silenciosamente
      // Requerimos que el usuario confirme haciendo clic en "Continuar sesión"
      if (isWarningOpen) return;

      const now = Date.now();
      // Limitar escritura a localStorage a máximo una vez cada 1500ms
      if (now - lastSavedRef.current > 1500) {
        lastSavedRef.current = now;
        localStorage.setItem(STORAGE_LAST_ACTIVITY_KEY, now.toString());
      }
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'];
    events.forEach((eventName) => {
      window.addEventListener(eventName, handleUserActivity, { passive: true });
    });

    return () => {
      events.forEach((eventName) => {
        window.removeEventListener(eventName, handleUserActivity);
      });
    };
  }, [isAuthenticated, isAuthRoute, isWarningOpen]);

  // 5. Sincronización multi-pestaña (si el usuario interactúa o cierra sesión en otra pestaña)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_LAST_ACTIVITY_KEY && e.newValue) {
        // Otra pestaña registró actividad del usuario
        setIsWarningOpen(false);
        setSecondsLeft(WARNING_SECONDS);
      } else if (e.key === STORAGE_LOGGED_OUT_KEY) {
        // Otra pestaña cerró la sesión
        window.location.href = '/auth/sign-in?inactivity=true';
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // 6. Verificador periódico cada segundo
  useEffect(() => {
    if (!isAuthenticated || isAuthRoute) return;

    const interval = setInterval(() => {
      if (isLoggingOutRef.current) return;

      const lastActivityStr = localStorage.getItem(STORAGE_LAST_ACTIVITY_KEY);
      const now = Date.now();

      if (!lastActivityStr) {
        localStorage.setItem(STORAGE_LAST_ACTIVITY_KEY, now.toString());
        return;
      }

      const lastActivity = parseInt(lastActivityStr, 10);
      const elapsed = now - lastActivity;

      if (elapsed >= timeoutMs) {
        // El tiempo total expiró -> Cerrar sesión
        handleLogout();
      } else if (elapsed >= timeoutMs - warningMs) {
        // Periodo de advertencia (últimos 60 segundos)
        const remaining = Math.max(0, Math.ceil((timeoutMs - elapsed) / 1000));
        setSecondsLeft(remaining);
        setIsWarningOpen(true);
      } else {
        // Aún activo
        if (isWarningOpen) {
          setIsWarningOpen(false);
          setSecondsLeft(WARNING_SECONDS);
        }
      }
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [isAuthenticated, isAuthRoute, timeoutMs, warningMs, isWarningOpen, handleLogout]);

  // Si no está autenticado o está en rutas de autenticación, no mostrar modal
  if (!isAuthenticated || isAuthRoute) {
    return null;
  }

  return (
    <AlertDialog open={isWarningOpen}>
      <AlertDialogContent className="sm:max-w-[460px] border-amber-200 dark:border-amber-900/50 shadow-2xl bg-card">
        <AlertDialogHeader className="flex flex-col items-center text-center space-y-3">
          <div className="h-14 w-14 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center animate-pulse shadow-xs">
            <Clock className="h-7 w-7" />
          </div>

          <AlertDialogTitle className="text-xl font-bold text-foreground">
            ¿Sigues interactuando con la plataforma?
          </AlertDialogTitle>

          <AlertDialogDescription className="text-xs sm:text-sm text-muted-foreground text-center leading-relaxed">
            Hemos detectado inactividad en tu sesión. Por seguridad institucional, la sesión se cerrará automáticamente en:
          </AlertDialogDescription>

          {/* Reloj numérico destacado */}
          <div className="py-2 flex flex-col items-center justify-center">
            <div className="text-4xl font-mono font-extrabold text-amber-600 dark:text-amber-400 tracking-wider">
              {String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:
              {String(secondsLeft % 60).padStart(2, '0')}
            </div>
            <span className="text-[11px] text-muted-foreground mt-1 font-medium">
              segundos restantes
            </span>
          </div>

          {/* Barra visual de progreso regresivo */}
          <div className="w-full bg-muted/80 rounded-full h-2 overflow-hidden">
            <div
              className="bg-amber-500 h-full transition-all duration-1000 ease-linear rounded-full"
              style={{
                width: `${Math.max(0, Math.min(100, (secondsLeft / WARNING_SECONDS) * 100))}%`,
              }}
            />
          </div>
        </AlertDialogHeader>

        <AlertDialogFooter className="sm:justify-between gap-2 mt-4 pt-4 border-t flex-col-reverse sm:flex-row">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="gap-2 text-muted-foreground hover:text-destructive text-xs"
          >
            <LogOut className="h-4 w-4" />
            <span>Cerrar sesión ahora</span>
          </Button>

          <Button
            type="button"
            size="default"
            onClick={extendSession}
            className="gap-2 font-semibold shadow-xs"
          >
            <span>Continuar sesión</span>
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

