"use client";

import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  CircleHelp,
  Menu,
  X,
} from 'lucide-react';
import { PendingUsersNotification } from '@/components/dashboard/pending-users-notification';
import { SessionInactivityGuard } from '@/components/auth/session-inactivity-guard';
import { DashboardSidebarNav } from '@/components/layout/dashboard-sidebar-nav';
import { UserInfoBar } from '@/components/layout/user-info-bar';
import { NotificationsDropdown } from '@/components/notifications/notifications-dropdown';

const FIRE_STATION_NAME = 'Bomberos Voluntarios Colonia Tirolesa';
const FIRE_STATION_LOGO_URL = 'https://bomberosvoluntarioscoloniatirolesa.org/Images/Logo%20png.png';

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? 'hidden' : '';

    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileNavOpen]);

  return (
    <div className="flex min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.12),transparent_30%),radial-gradient(circle_at_90%_15%,rgba(180,35,24,0.16),transparent_24%),linear-gradient(180deg,#fffaf5_0%,#f3e8df_100%)] text-[#1f120f]">
      <SessionInactivityGuard />
      <div className="relative hidden w-72 shrink-0 flex-col overflow-hidden border-r border-[#e7d3c8] bg-[linear-gradient(180deg,rgba(127,29,29,0.98)_0%,rgba(83,24,20,0.98)_100%)] text-white shadow-[20px_0_40px_rgba(76,29,20,0.12)] lg:flex">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#f97316] via-[#ffb36b] to-[#f2d6c3]" />
        <div className="min-h-20 flex items-center gap-3 border-b border-white/10 px-5 py-4">
          <Image
            src={FIRE_STATION_LOGO_URL}
            alt={FIRE_STATION_NAME}
            width={44}
            height={44}
            className="h-11 w-11 rounded-full border border-white/20 bg-white object-contain p-0.5 shadow-lg"
            priority
          />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#ffd9c0]">BVCT</p>
            <p className="text-sm font-semibold leading-tight">Bomberos Voluntarios</p>
            <p className="text-xs leading-tight text-white/70">Colonia Tirolesa</p>
          </div>
        </div>

        <DashboardSidebarNav />

        <div className="border-t border-white/10 p-4">
          <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.2em] text-[#ffd9c0]">Centro operativo</p>
            <p className="mt-2 text-sm text-white/85">Gestión institucional de tickets, prioridades y compras.</p>
          </div>
        </div>
      </div>

      {mobileNavOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            className="absolute inset-0 bg-[#2f160f]/55 backdrop-blur-[2px]"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="relative flex h-full w-[min(88vw,22rem)] flex-col overflow-hidden border-r border-[#e7d3c8] bg-[linear-gradient(180deg,rgba(127,29,29,0.99)_0%,rgba(83,24,20,0.99)_100%)] text-white shadow-[20px_0_40px_rgba(76,29,20,0.2)]">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#f97316] via-[#ffb36b] to-[#f2d6c3]" />
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-3">
                <Image
                  src={FIRE_STATION_LOGO_URL}
                  alt={FIRE_STATION_NAME}
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-full border border-white/20 bg-white object-contain p-0.5 shadow-lg"
                  priority
                />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#ffd9c0]">BVCT</p>
                  <p className="text-sm font-semibold leading-tight">Bomberos Voluntarios</p>
                  <p className="text-xs leading-tight text-white/70">Colonia Tirolesa</p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Cerrar menú"
                onClick={() => setMobileNavOpen(false)}
                className="rounded-2xl border border-white/15 bg-white/10 p-2 text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <DashboardSidebarNav onItemClick={() => setMobileNavOpen(false)} />

            <div className="border-t border-white/10 p-4">
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[#ffd9c0]">Acceso rápido</p>
                <p className="mt-2 text-sm text-white/85">Abrí módulos, revisá notificaciones y cambiá de contexto sin perder la vista actual.</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-20 border-b border-white/70 bg-white/90 shadow-[0_10px_30px_rgba(76,29,20,0.08)]">
          <div className="flex min-h-20 flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                aria-label="Abrir menú"
                onClick={() => setMobileNavOpen(true)}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#ead8cf] bg-white text-[#9a3d12] shadow-sm lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#b42318]">Sistema de gestión</p>
                <h1 className="truncate text-base font-semibold tracking-tight text-[#1f120f] md:text-2xl">{FIRE_STATION_NAME}</h1>
                <p className="text-xs text-[#6b4b42]">Tickets, prioridades, compras y usuarios.</p>
              </div>
            </div>
            <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:flex-nowrap">
              <PendingUsersNotification />
              <NotificationsDropdown />
              <Link
                href="/help"
                className="hidden items-center gap-2 rounded-full border border-[#ef9f62]/40 bg-gradient-to-r from-[#fff5ec] to-[#fde7d8] px-4 py-2 text-sm font-semibold text-[#9a3d12] shadow-sm transition hover:shadow-md sm:inline-flex"
              >
                <CircleHelp className="h-4 w-4" />
                Ayuda
              </Link>
              <UserInfoBar />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="relative p-4 md:p-8 lg:p-10">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute -right-24 top-10 h-56 w-56 rounded-full bg-[#f97316]/10 blur-3xl" />
              <div className="absolute left-0 top-1/3 h-64 w-64 rounded-full bg-[#b42318]/8 blur-3xl" />
            </div>
            <div className="relative">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
