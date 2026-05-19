"use client";

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from '@/lib/auth/supabase-auth';

const ONE_HOUR_MS = 60 * 60 * 1000;

export function SessionInactivityGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLoggingOutRef = useRef(false);

  useEffect(() => {
    if (pathname === '/login') {
      return;
    }

    const clearTimer = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };

    const logoutForInactivity = async () => {
      if (isLoggingOutRef.current) {
        return;
      }

      isLoggingOutRef.current = true;

      try {
        await signOut();
      } finally {
        router.replace('/login?reason=inactividad');
      }
    };

    const resetInactivityTimer = () => {
      clearTimer();
      timeoutRef.current = setTimeout(logoutForInactivity, ONE_HOUR_MS);
    };

    const events: Array<keyof WindowEventMap> = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
      'click',
    ];

    events.forEach((eventName) => {
      window.addEventListener(eventName, resetInactivityTimer, { passive: true });
    });

    resetInactivityTimer();

    return () => {
      clearTimer();

      events.forEach((eventName) => {
        window.removeEventListener(eventName, resetInactivityTimer);
      });
    };
  }, [pathname, router]);

  return null;
}