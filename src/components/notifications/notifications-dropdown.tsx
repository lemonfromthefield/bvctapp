"use client";

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { supabaseClient } from '@/lib/supabase/client';

type NotificationRow = {
  id: string;
  title: string;
  message: string;
  ticket_id: string | null;
  read: boolean;
  created_at: string;
};

function formatNotificationDate(iso: string) {
  const createdAt = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - createdAt.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) {
    return 'Ahora';
  }

  if (diffMinutes < 60) {
    return `Hace ${diffMinutes} min`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `Hace ${diffHours} h`;
  }

  return createdAt.toLocaleDateString('es-AR');
}

export function NotificationsDropdown() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications]
  );

  useEffect(() => {
    let isMounted = true;

    const loadNotifications = async () => {
      const { data, error } = await supabaseClient
        .from('notifications')
        .select('id, title, message, ticket_id, read, created_at')
        .order('created_at', { ascending: false })
        .limit(15);

      if (!isMounted || error) {
        if (isMounted) {
          setLoading(false);
        }
        return;
      }

      setNotifications((data ?? []) as NotificationRow[]);
      setLoading(false);
    };

    loadNotifications();

    const intervalId = window.setInterval(loadNotifications, 30000);

    const channel = supabaseClient
      .channel('notifications-dropdown')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      supabaseClient.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!wrapperRef.current) {
        return;
      }

      if (!wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  const markAsRead = async (notificationId: string) => {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId
          ? {
              ...notification,
              read: true,
            }
          : notification
      )
    );

    await supabaseClient
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter((notification) => !notification.read).map((notification) => notification.id);

    if (unreadIds.length === 0) {
      return;
    }

    setMarkingAllRead(true);
    setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));

    await supabaseClient
      .from('notifications')
      .update({ read: true })
      .in('id', unreadIds);

    setMarkingAllRead(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#ead8cf] bg-white/80 text-[#9a3d12] shadow-sm transition hover:bg-[#fff5ec]"
        title="Notificaciones"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#b42318] px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-[#e7d3c8] bg-white shadow-[0_20px_50px_rgba(76,29,20,0.18)]">
          <div className="flex items-center justify-between border-b border-[#f1dfd5] px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-[#1f120f]">Notificaciones</p>
              <p className="text-xs text-[#7d5a4f]">
                {unreadCount > 0 ? `${unreadCount} novedad${unreadCount === 1 ? '' : 'es'} sin leer` : 'Sin novedades pendientes'}
              </p>
            </div>
            <button
              type="button"
              onClick={markAllAsRead}
              disabled={markingAllRead || unreadCount === 0}
              className="inline-flex items-center gap-1 rounded-xl border border-[#d7bfb0] bg-white px-2.5 py-1 text-xs font-semibold text-[#8f3a14] transition hover:bg-[#fff2e8] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Marcar leídas
            </button>
          </div>

          <div className="max-h-[420px] overflow-y-auto p-2">
            {loading ? (
              <p className="px-2 py-4 text-sm text-[#6b4b42]">Cargando notificaciones...</p>
            ) : notifications.length === 0 ? (
              <p className="px-2 py-4 text-sm text-[#6b4b42]">Todavía no hay novedades para mostrar.</p>
            ) : (
              <div className="space-y-2">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`rounded-xl border px-3 py-2 ${notification.read ? 'border-[#ead8cf] bg-white' : 'border-[#ffd7c0] bg-[#fff3ea]'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-[#1f120f]">{notification.title}</p>
                      {!notification.read ? (
                        <button
                          type="button"
                          onClick={() => markAsRead(notification.id)}
                          className="rounded-lg border border-[#d7bfb0] bg-white px-2 py-0.5 text-[11px] font-semibold text-[#8f3a14]"
                        >
                          Leer
                        </button>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-[#5f362d]">{notification.message}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[11px] text-[#8f6a60]">{formatNotificationDate(notification.created_at)}</span>
                      {notification.ticket_id ? (
                        <Link
                          href={`/tickets/${notification.ticket_id}`}
                          onClick={() => {
                            markAsRead(notification.id);
                            setOpen(false);
                          }}
                          className="text-[11px] font-semibold text-[#9a3d12] underline-offset-2 hover:underline"
                        >
                          Ver ticket
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}