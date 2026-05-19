"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, User } from 'lucide-react';
import { getCurrentUser, signOut } from '@/lib/auth/supabase-auth';
import { ROLES_INFO, UserRole } from '@/types/roles';
import type { UserSession } from '@/types/users';

export function UserInfoBar() {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    };

    loadUser();
  }, []);

  const handleSignOut = async () => {
    setSigningOut(true);

    try {
      await signOut();
      router.replace('/login');
    } finally {
      setSigningOut(false);
    }
  };

  if (!user) {
    return null;
  }

  const roleInfo = ROLES_INFO[user.role as UserRole];

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-[#ead8cf] bg-white/80 px-3 py-2 shadow-sm backdrop-blur">
      <span className="rounded-xl bg-[#fff1e8] p-1.5 text-[#b42318]">
        <User className="h-4 w-4" />
      </span>
      <div className="hidden sm:block">
        <p className="text-sm font-semibold leading-tight text-[#1f120f]">{user.full_name}</p>
        <p className="text-xs leading-tight text-[#7d5a4f]">{roleInfo?.displayName ?? user.role}</p>
      </div>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={signingOut}
        title="Cerrar sesión"
        className="ml-1 rounded-xl border border-[#d7bfb0] bg-white/90 p-1.5 text-[#b42318] transition hover:bg-[#fff0e8] disabled:opacity-50"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}
