"use client";

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { supabaseClient } from '@/lib/supabase/client';
import { getCurrentUser } from '@/lib/auth/supabase-auth';

const FIRE_STATION_NAME = 'Bomberos Voluntarios Colonia Tirolesa';
const FIRE_STATION_LOGO_URL = 'https://bomberosvoluntarioscoloniatirolesa.org/Images/Logo%20png.png';

type ConfirmState = 'verifying' | 'ok' | 'error';

export default function ConfirmEmailClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<ConfirmState>('verifying');
  const [message, setMessage] = useState('Estamos validando tu acceso.');

  const destinationLabel = useMemo(() => {
    const next = searchParams?.get('next');
    return next ? `Destino sugerido: ${next}` : 'Te llevaremos al sistema en segundos.';
  }, [searchParams]);

  useEffect(() => {
    let active = true;

    const finalizeConfirmation = async () => {
      try {
        const code = searchParams?.get('code');

        if (code) {
          const { error } = await supabaseClient.auth.exchangeCodeForSession(code);
          if (error) {
            throw error;
          }
        }

        const currentUser = await getCurrentUser();
        if (!active) {
          return;
        }

        if (!currentUser) {
          setState('error');
          setMessage('Se verificó el enlace, pero no pudimos iniciar sesión automáticamente. Ingresá con tu correo y contraseña.');
          return;
        }

        setState('ok');
        setMessage('Correo validado correctamente. Tu acceso ya está habilitado.');
        window.setTimeout(() => {
          router.replace('/dashboard');
        }, 1400);
      } catch {
        if (!active) {
          return;
        }

        setState('error');
        setMessage('El enlace de verificación no es válido o ya expiró. Solicitá uno nuevo desde el inicio de sesión.');
      }
    };

    finalizeConfirmation();

    return () => {
      active = false;
    };
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_20%,rgba(249,115,22,0.2),transparent_28%),radial-gradient(circle_at_80%_10%,rgba(180,35,24,0.18),transparent_22%),linear-gradient(180deg,#fff9f5_0%,#f7ebe1_100%)] px-4 py-10">
      <div className="mx-auto w-full max-w-2xl rounded-[2rem] border border-white/70 bg-white/85 p-8 shadow-[0_30px_80px_rgba(76,29,20,0.16)] backdrop-blur-xl sm:p-10">
        <div className="flex items-center gap-4">
          <Image
            src={FIRE_STATION_LOGO_URL}
            alt={FIRE_STATION_NAME}
            width={64}
            height={64}
            className="h-16 w-16 rounded-full border border-[#f0d2be] bg-white object-contain p-1"
            priority
          />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#b42318]">Verificación de acceso</p>
            <h1 className="text-2xl font-semibold text-[#1f120f]">{FIRE_STATION_NAME}</h1>
          </div>
        </div>

        <div className={`mt-8 rounded-2xl border px-5 py-4 ${state === 'error' ? 'border-red-200 bg-red-50' : state === 'ok' ? 'border-emerald-200 bg-emerald-50' : 'border-[#f0d8cc] bg-[#fff7f1]'}`}>
          <p className={`text-sm font-semibold ${state === 'error' ? 'text-red-700' : state === 'ok' ? 'text-emerald-700' : 'text-[#9a3d12]'}`}>
            {state === 'verifying' ? 'Validando enlace de correo...' : state === 'ok' ? 'Correo confirmado' : 'No pudimos completar la verificación'}
          </p>
          <p className={`mt-1 text-sm ${state === 'error' ? 'text-red-700' : state === 'ok' ? 'text-emerald-700' : 'text-[#6b4b42]'}`}>
            {message}
          </p>
          <p className="mt-2 text-xs text-[#7d5a4f]">{destinationLabel}</p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/login">
            <Button variant="outline">Ir a iniciar sesión</Button>
          </Link>
          {state === 'ok' ? (
            <Button onClick={() => router.replace('/dashboard')}>Ir al sistema ahora</Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
