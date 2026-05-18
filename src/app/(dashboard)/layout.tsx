import { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Home,
  Ticket,
  TrendingUp,
  Wallet,
  Settings,
} from 'lucide-react';
import { PendingUsersNotification } from '@/components/dashboard/pending-users-notification';

const FIRE_STATION_NAME = 'Bomberos Voluntarios Colonia Tirolesa';
const FIRE_STATION_LOGO_URL = 'https://bomberosvoluntarioscoloniatirolesa.org/Images/Logo%20png.png';

interface NavItem {
  icon: ReactNode;
  label: string;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { icon: <Home className="w-5 h-5" />, label: 'Dashboard', href: '/dashboard' },
  { icon: <Ticket className="w-5 h-5" />, label: 'Tickets', href: '/tickets' },
  { icon: <TrendingUp className="w-5 h-5" />, label: 'Prioridades', href: '/priorities' },
  { icon: <Wallet className="w-5 h-5" />, label: 'Presupuestos', href: '/budgets' },
  { icon: <Settings className="w-5 h-5" />, label: 'Configuración', href: '/settings' },
];

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.12),transparent_30%),radial-gradient(circle_at_90%_15%,rgba(180,35,24,0.16),transparent_24%),linear-gradient(180deg,#fffaf5_0%,#f3e8df_100%)] text-[#1f120f]">
      <div className="relative flex w-72 flex-col overflow-hidden border-r border-[#e7d3c8] bg-[linear-gradient(180deg,rgba(127,29,29,0.98)_0%,rgba(83,24,20,0.98)_100%)] text-white shadow-[20px_0_40px_rgba(76,29,20,0.12)]">
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

        <nav className="flex-1 px-3 py-5 space-y-2">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center gap-3 rounded-2xl border border-transparent px-4 py-3 text-white/78 transition-all hover:border-white/10 hover:bg-white/10 hover:text-white"
              title={item.label}
            >
              <span className="rounded-xl bg-white/10 p-2 transition group-hover:bg-white/20">{item.icon}</span>
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.2em] text-[#ffd9c0]">Centro operativo</p>
            <p className="mt-2 text-sm text-white/85">Gestión institucional de tickets, prioridades y presupuestos.</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-white/70 bg-white/65 px-8 backdrop-blur-xl">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#b42318]">Sistema de gestión</p>
            <h1 className="text-lg font-semibold tracking-tight text-[#1f120f] md:text-2xl">{FIRE_STATION_NAME}</h1>
            <p className="text-xs text-[#6b4b42]">Tickets, prioridades, presupuestos y usuarios.</p>
          </div>
          <PendingUsersNotification />
        </div>

        <div className="flex-1 overflow-auto">
          <div className="relative p-6 md:p-8 lg:p-10">
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
