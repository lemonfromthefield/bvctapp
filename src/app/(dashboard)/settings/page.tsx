"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabaseClient } from '@/lib/supabase/client';
import { getCurrentUser, signOut } from '@/lib/auth/supabase-auth';
import { ROLES_INFO, UserRole } from '@/types/roles';
import type { Profile } from '@/types/users';

type Area = {
  id: string;
  name: string;
  code: string;
};

export default function SettingsPage() {
  const router = useRouter();
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [selectedRoleById, setSelectedRoleById] = useState<Record<string, UserRole>>({});
  const [selectedAreaById, setSelectedAreaById] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
      const { data: ownProfile, error: ownProfileError } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('user_id', currentUser.id)
        .single();

      if (ownProfileError) {
        setError(ownProfileError.message);
      } else {
        const normalizedProfile = ownProfile as Profile;
        setCurrentProfile(normalizedProfile);
        setProfileName(normalizedProfile.full_name ?? '');
        setProfileEmail(normalizedProfile.email ?? '');
      }

      if (currentUser.role !== UserRole.COMISION_DIRECTIVA && currentUser.role !== UserRole.ADMIN) {
        setLoading(false);
        return;
      }

      const [profilesResult, areasResult] = await Promise.all([
        supabaseClient.from('profiles').select('*').order('created_at', { ascending: false }),
        supabaseClient.from('areas').select('id, name, code').order('name', { ascending: true }),
      ]);

      const { data, error: profilesError } = profilesResult;
      const { data: areasData, error: areasError } = areasResult;

      if (profilesError) {
        setError(profilesError.message);
      } else {
        setProfiles((data ?? []) as Profile[]);
      }

      if (areasError) {
        setError(areasError.message);
      } else {
        setAreas((areasData ?? []) as Area[]);
      }

      setLoading(false);
    };

    loadSettings();
  }, []);

  const updateUserStatus = async (profile: Profile, isActive: boolean) => {
    setSavingId(profile.id);
    setError(null);

    const roleToSave = selectedRoleById[profile.id] ?? profile.role;
    const areaToSave =
      roleToSave === UserRole.REPRESENTANTE_AREA
        ? selectedAreaById[profile.id] ?? profile.area_id ?? null
        : null;

    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({
        is_active: isActive,
        role: roleToSave,
        area_id: areaToSave,
      })
      .eq('id', profile.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setProfiles((current) =>
        current.map((currentProfile) =>
          currentProfile.id === profile.id
            ? {
                ...currentProfile,
                is_active: isActive,
                role: roleToSave,
                area_id: areaToSave ?? undefined,
              }
            : currentProfile
        )
      );
    }

    setSavingId(null);
  };

  const updateMyProfile = async () => {
    if (!currentProfile) {
      return;
    }

    if (profileName.trim().length < 3) {
      setError('El nombre debe tener al menos 3 caracteres.');
      return;
    }

    setSavingProfile(true);
    setError(null);
    setSuccessMessage(null);

    const { error: profileError } = await supabaseClient
      .from('profiles')
      .update({
        full_name: profileName.trim(),
      })
      .eq('id', currentProfile.id);

    if (profileError) {
      setError(profileError.message);
      setSavingProfile(false);
      return;
    }

    if (profileEmail.trim() !== currentProfile.email) {
      const { error: authError } = await supabaseClient.auth.updateUser({
        email: profileEmail.trim(),
      });

      if (authError) {
        setError(authError.message);
        setSavingProfile(false);
        return;
      }
    }

    setCurrentProfile((current) =>
      current
        ? {
            ...current,
            full_name: profileName.trim(),
            email: profileEmail.trim(),
          }
        : null
    );
    setSuccessMessage('Perfil actualizado. Si cambiaste el correo, revisá tu email para confirmar el nuevo acceso.');
    setSavingProfile(false);
  };

  const updateMyPassword = async () => {
    if (newPassword.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('La confirmación de contraseña no coincide.');
      return;
    }

    setSavingPassword(true);
    setError(null);
    setSuccessMessage(null);

    const { error: passwordError } = await supabaseClient.auth.updateUser({
      password: newPassword,
    });

    if (passwordError) {
      setError(passwordError.message);
      setSavingPassword(false);
      return;
    }

    setNewPassword('');
    setConfirmPassword('');
    setSuccessMessage('Contraseña actualizada correctamente.');
    setSavingPassword(false);
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    setError(null);

    try {
      await signOut();
      router.replace('/login');
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : 'No se pudo cerrar sesión.');
    } finally {
      setSigningOut(false);
    }
  };

  if (loading) {
    return <p className="text-slate-600">Cargando configuración...</p>;
  }

  if (!canManageUsers) {
    return (
      <div className="space-y-4">
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="space-y-3 rounded-3xl border border-white/70 bg-[var(--surface)] p-6 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl">
          <h1 className="text-2xl font-bold text-[#1f120f]">Configuración</h1>
          <p className="text-slate-600">
            Este módulo queda reservado para Comisión Directiva y Administradores.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sesión</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-600">Podés cerrar tu sesión de forma manual desde aquí.</p>
            <Button variant="outline" onClick={handleSignOut} isLoading={signingOut}>
              Cerrar sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1f120f]">Configuración</h1>
        <p className="text-slate-600">Aprobación de usuarios y control básico de acceso.</p>
      </div>

      {successMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Mi perfil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Nombre y apellido"
            value={profileName}
            onChange={(event) => setProfileName(event.target.value)}
          />
          <Input
            label="Correo electrónico"
            type="email"
            value={profileEmail}
            onChange={(event) => setProfileEmail(event.target.value)}
          />
          <Button onClick={updateMyProfile} isLoading={savingProfile} disabled={savingProfile}>
            Guardar perfil
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Seguridad de acceso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Nueva contraseña"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
          <Input
            label="Confirmar nueva contraseña"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
          <Button onClick={updateMyPassword} isLoading={savingPassword} disabled={savingPassword}>
            Actualizar contraseña
          </Button>
        </CardContent>
      </Card>

      {canManageUsers ? (
      <Card>
        <CardHeader>
          <CardTitle>Usuarios registrados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {profiles.length === 0 ? (
            <p className="text-slate-600">Todavía no hay usuarios registrados.</p>
          ) : (
            <div className="space-y-3">
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  className="flex flex-col gap-3 rounded-3xl border border-white/70 bg-[var(--surface)] p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-semibold text-[#1f120f]">{profile.full_name}</p>
                    <p className="text-sm text-slate-600">{profile.email}</p>
                    <p className="text-xs text-slate-500">
                      Estado: {profile.is_active ? 'Activo' : 'Pendiente'}
                    </p>

                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      <label className="space-y-1 text-xs text-slate-500">
                        <span className="block font-medium text-slate-700">Rol</span>
                        <select
                          value={selectedRoleById[profile.id] ?? profile.role}
                          onChange={(e) =>
                            setSelectedRoleById((current) => ({
                              ...current,
                              [profile.id]: e.target.value as UserRole,
                            }))
                          }
                          className="w-full rounded-xl border border-[#d9c2b7] bg-white/90 px-3 py-2 text-sm shadow-sm outline-none"
                        >
                          {Object.values(UserRole).map((userRole) => (
                            <option key={userRole} value={userRole}>
                              {ROLES_INFO[userRole].displayName}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="space-y-1 text-xs text-slate-500">
                        <span className="block font-medium text-slate-700">Área</span>
                        <select
                          value={selectedAreaById[profile.id] ?? profile.area_id ?? ''}
                          onChange={(e) =>
                            setSelectedAreaById((current) => ({
                              ...current,
                              [profile.id]: e.target.value,
                            }))
                          }
                          className="w-full rounded-xl border border-[#d9c2b7] bg-white/90 px-3 py-2 text-sm shadow-sm outline-none"
                        >
                          <option value="">Sin área</option>
                          {areas.map((area) => {
                            return (
                              <option key={area.id} value={area.id}>
                                {area.name}
                              </option>
                            );
                          })}
                        </select>
                      </label>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={profile.is_active ? 'outline' : 'default'}
                      onClick={() => updateUserStatus(profile, !profile.is_active)}
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
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Sesión</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600">Podés cerrar tu sesión de forma manual desde aquí.</p>
          <Button variant="outline" onClick={handleSignOut} isLoading={signingOut}>
            Cerrar sesión
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
