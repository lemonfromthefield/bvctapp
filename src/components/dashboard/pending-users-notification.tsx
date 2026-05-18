"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/supabase-auth';
import { supabaseClient } from '@/lib/supabase/client';
import { UserRole } from '@/types/roles';

export function PendingUsersNotification() {
  const [pendingCount, setPendingCount] = useState(0);
  const [canReview, setCanReview] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadPendingUsers = async () => {
      const currentUser = await getCurrentUser();

      if (!isMounted || !currentUser) {
        return;
      }

      const hasReviewAccess =
        currentUser.role === UserRole.COMISION_DIRECTIVA ||
        currentUser.role === UserRole.ADMIN;

      setCanReview(hasReviewAccess);

      if (!hasReviewAccess) {
        return;
      }

      const { count } = await supabaseClient
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', false);

      if (isMounted) {
        setPendingCount(count ?? 0);
      }
    };

    loadPendingUsers();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!canReview) {
    return <span className="rounded-full border border-[#ead8cf] bg-white/70 px-3 py-1 text-sm text-[#5f362d] shadow-sm">Panel institucional</span>;
  }

  if (pendingCount <= 0) {
    return <span className="rounded-full border border-[#ead8cf] bg-white/70 px-3 py-1 text-sm text-[#5f362d] shadow-sm">Sin solicitudes pendientes</span>;
  }

  return (
    <Link
      href="/settings"
      className="inline-flex items-center gap-2 rounded-full border border-[#ef9f62]/40 bg-gradient-to-r from-[#fff5ec] to-[#fde7d8] px-4 py-2 text-sm font-semibold text-[#9a3d12] shadow-sm transition hover:shadow-md"
    >
      <Bell className="h-4 w-4" />
      {pendingCount} solicitud{pendingCount === 1 ? '' : 'es'} pendiente{pendingCount === 1 ? '' : 's'}
    </Link>
  );
}