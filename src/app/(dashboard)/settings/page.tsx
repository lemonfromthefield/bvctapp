"use client";

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabaseClient } from '@/lib/supabase/client';
import { getCurrentUser } from '@/lib/auth/supabase-auth';
import { ROLES_INFO, UserRole } from '@/types/roles';
import type { Profile } from '@/types/users';

export default function SettingsPage() {
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canManageUsers = useMemo(
    () => currentRole === UserRole.COMISION_DIRECTIVA || currentRole === UserRole.ADMIN,
    [currentRole]
  );

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      setError(null);

      const currentUser = await getCurrentUser();

      if (!currentUser) {
        setError('No se pudo cargar tu sesión.');
        setLoading(false);
        return;
      }

      setCurrentRole(currentUser.role);

      if (currentUser.role !== UserRole.COMISION_DIRECTIVA && currentUser.role !== UserRole.ADMIN) {
        setLoading(false);
        return;
      }

      const { data, error: profilesError } = await supabaseClient
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) {
        setError(profilesError.message);
      } else {
        setProfiles((data ?? []) as Profile[]);
      }

      setLoading(false);
    };

    loadSettings();
  }, []);

  const updateUserStatus = async (userId: string, isActive: boolean) => {
    setSavingId(userId);
    setError(null);

    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({ is_active: isActive })
      .eq('id', userId);

    if (updateError) {
      setError(updateError.message);
    } else {
      setProfiles((current) =>
        current.map((profile) =>
          profile.id === userId ? { ...profile, is_active: isActive } : profile
        )
      );
    }

    setSavingId(null);
  };

  if (loading) {
    return <p className="text-gray-600">Cargando configuración...</p>;
  }

  if (!canManageUsers) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-600">
          Este módulo queda reservado para Comisión Directiva y Administradores.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-600">Aprobación de usuarios y control básico de acceso.</p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Usuarios registrados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {profiles.length === 0 ? (
            <p className="text-gray-600">Todavía no hay usuarios registrados.</p>
          ) : (
            <div className="space-y-3">
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-semibold text-gray-900">{profile.full_name}</p>
                    <p className="text-sm text-gray-600">{profile.email}</p>
                    <p className="text-xs text-gray-500">
                      Rol: {ROLES_INFO[profile.role].displayName} · Estado:{' '}
                      {profile.is_active ? 'Activo' : 'Pendiente'}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={profile.is_active ? 'outline' : 'default'}
                      onClick={() => updateUserStatus(profile.id, !profile.is_active)}
                      isLoading={savingId === profile.id}
                    >
                      {profile.is_active ? 'Desactivar' : 'Aprobar'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
