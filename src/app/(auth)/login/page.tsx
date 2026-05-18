"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getCurrentUser, signInWithEmail, signOut, signUpWithEmail } from '@/lib/auth/supabase-auth';
import { UserRole } from '@/types/roles';

type Mode = 'login' | 'register';

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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.28),_transparent_35%),linear-gradient(135deg,#7f1d1d_0%,#dc2626_45%,#fb923c_100%)] flex items-center justify-center p-4">
      <Card className="w-full max-w-lg border-white/20 bg-white/95 shadow-2xl backdrop-blur">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-700">BVCT</p>
              <CardTitle className="mt-1 text-3xl">Acceso al sistema</CardTitle>
            </div>
            <div className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
              Seguridad y roles
            </div>
          </div>
          <p className="text-sm text-gray-600">
            Ingresá con tu usuario y contraseña. Según tu rol, el sistema te llevará al área correspondiente.
          </p>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                mode === 'login' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                mode === 'register' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
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
                <p className="text-xs text-gray-500">
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
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {message ? (
              <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                {message}
              </div>
            ) : null}

            <Button type="submit" className="w-full" isLoading={loading}>
              {mode === 'login' ? 'Entrar' : 'Crear usuario'}
            </Button>
          </form>

          <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
            <p className="font-semibold text-gray-900">Destino por rol</p>
            <ul className="mt-2 space-y-1">
              <li>Representante: Tickets</li>
              <li>Jefatura: Prioridades</li>
              <li>Comisión Directiva: Presupuestos</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
