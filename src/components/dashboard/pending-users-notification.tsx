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
    return <span className="text-sm text-gray-600">Panel institucional</span>;
  }

  if (pendingCount <= 0) {
    return <span className="text-sm text-gray-600">Sin solicitudes pendientes</span>;
  }

  return (
    <Link
      href="/settings"
      className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-100"
    >
      <Bell className="h-4 w-4" />
      {pendingCount} solicitud{pendingCount === 1 ? '' : 'es'} pendiente{pendingCount === 1 ? '' : 's'}
    </Link>
  );
}