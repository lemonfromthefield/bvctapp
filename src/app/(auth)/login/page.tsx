"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getCurrentUser, signInWithEmail, signOut, signUpWithEmail } from '@/lib/auth/supabase-auth';
import { UserRole } from '@/types/roles';

type Mode = 'login' | 'register';

const FIRE_STATION_NAME = 'Bomberos Voluntarios Colonia Tirolesa';
const FIRE_STATION_LOGO_URL = 'https://bomberosvoluntarioscoloniatirolesa.org/Images/Logo%20png.png';

function getRoleDestination(role?: UserRole) {
  switch (role) {
    case UserRole.REPRESENTANTE_AREA:
      return '/tickets';
    case UserRole.JEFATURA:
      return '/priorities';
    case UserRole.COMISION_DIRECTIVA:
      return '/budgets';
    case UserRole.ADMIN:
      return '/dashboard';
    default:
      return '/dashboard';
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      await signInWithEmail(email, password);
      const currentUser = await getCurrentUser();

      if (!currentUser) {
        setError('No se pudo cargar tu perfil. Verificá que exista en Supabase.');
        return;
      }

      if (!currentUser.is_active) {
        await signOut();
        setError('Tu usuario todavía está pendiente de aprobación por Comisión.');
        return;
      }

      router.push(getRoleDestination(currentUser.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const result = await signUpWithEmail(email, password, fullName);

      if (result.session || result.user?.confirmed_at) {
        const currentUser = await getCurrentUser();
        router.push(getRoleDestination(currentUser?.role ?? UserRole.REPRESENTANTE_AREA));
        return;
      }

      setMessage('Usuario creado. Si activaste confirmación por correo, revisa tu inbox antes de iniciar sesión.');
      setMode('login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el usuario.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/70 bg-white/70 shadow-[0_30px_80px_rgba(76,29,20,0.18)] backdrop-blur-xl lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative flex flex-col justify-between overflow-hidden bg-[linear-gradient(160deg,#7f1d1d_0%,#a61b1b_38%,#f97316_100%)] p-8 text-white sm:p-10 lg:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_30%),radial-gradient(circle_at_20%_80%,rgba(255,255,255,0.12),transparent_28%)]" />
          <div className="relative flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Image
                src={FIRE_STATION_LOGO_URL}
                alt={FIRE_STATION_NAME}
                width={64}
                height={64}
                className="h-16 w-16 rounded-full border border-white/30 bg-white object-contain p-1 shadow-xl"
                priority
              />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#ffe4d3]">BVCT</p>
                <h1 className="mt-1 text-3xl font-semibold tracking-tight leading-tight sm:text-4xl">
                  Bomberos Voluntarios
                  <br />
                  Colonia Tirolesa
                </h1>
              </div>
            </div>
            <div className="hidden rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#ffe4d3] sm:block">
              Sistema institucional
            </div>
          </div>

          <div className="relative mt-12 max-w-md space-y-5">
            <p className="text-base leading-7 text-white/86 sm:text-lg">
              Una plataforma pensada para ordenar tickets, priorizar urgencias y acompañar la gestión operativa con una interfaz clara, cálida y profesional.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/16 bg-white/10 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.18em] text-[#ffe4d3]">Flujo</p>
                <p className="mt-2 text-sm text-white/88">Tickets, prioridades, presupuestos y control institucional en un solo lugar.</p>
              </div>
              <div className="rounded-2xl border border-white/16 bg-white/10 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.18em] text-[#ffe4d3]">Acceso</p>
                <p className="mt-2 text-sm text-white/88">Roles diferenciados para áreas, jefatura, comisión y administración.</p>
              </div>
            </div>
          </div>

          <div className="relative mt-10 rounded-2xl border border-white/16 bg-white/10 p-4 text-sm text-white/84 backdrop-blur">
            {FIRE_STATION_NAME}
          </div>
        </section>

        <section className="flex items-center justify-center p-6 sm:p-8 lg:p-12">
          <Card className="w-full max-w-xl border-white/70 bg-white/88 shadow-[0_24px_60px_rgba(76,29,20,0.14)]">
            <CardHeader className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#b42318]">Acceso seguro</p>
                  <CardTitle className="mt-2 text-3xl leading-tight text-[#1f120f]">Ingresar al sistema</CardTitle>
                </div>
                <div className="rounded-full border border-[#ef9f62]/30 bg-[#fff4eb] px-3 py-1 text-xs font-semibold text-[#9a3d12]">
                  Seguridad y roles
                </div>
              </div>
              <p className="text-sm leading-6 text-[#6b4b42]">
                Ingresá con tu correo y contraseña. Según tu rol, el sistema te llevará al área correspondiente.
              </p>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#f6ede6] p-1">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                    mode === 'login'
                      ? 'bg-white text-[#1f120f] shadow-sm ring-1 ring-[#e7d3c8]'
                      : 'text-[#7d5a4f] hover:text-[#1f120f]'
                  }`}
                >
                  Iniciar sesión
                </button>
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                    mode === 'register'
                      ? 'bg-white text-[#1f120f] shadow-sm ring-1 ring-[#e7d3c8]'
                      : 'text-[#7d5a4f] hover:text-[#1f120f]'
                  }`}
                >
                  Registrar usuario
                </button>
              </div>

              <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-4">
                {mode === 'register' ? (
                  <>
                    <Input
                      label="Nombre completo"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Nombre y apellido"
                      required
                    />
                    <p className="text-xs leading-5 text-[#7d5a4f]">
                      Comisión Directiva definirá el rol y el área cuando revise tu solicitud.
                    </p>
                  </>
                ) : null}

                <Input
                  label="Correo electrónico"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@ejemplo.com"
                  required
                />
                <Input
                  label="Contraseña"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />

                {error ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                ) : null}

                {message ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {message}
                  </div>
                ) : null}

                <Button type="submit" className="w-full" isLoading={loading}>
                  {mode === 'login' ? 'Entrar' : 'Crear usuario'}
                </Button>
              </form>

              <div className="rounded-2xl border border-[#ead8cf] bg-[#fff9f5] p-4 text-sm text-[#5f362d]">
                <p className="font-semibold text-[#1f120f]">Destino por rol</p>
                <ul className="mt-2 space-y-1">
                  <li>Representante: Tickets</li>
                  <li>Jefatura: Prioridades</li>
                  <li>Comisión Directiva: Presupuestos</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
