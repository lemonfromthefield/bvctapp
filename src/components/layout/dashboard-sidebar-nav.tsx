"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Ticket, TrendingUp, Wallet, Settings, CircleHelp } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { getCurrentUser } from '@/lib/auth/supabase-auth';
import { UserRole } from '@/types/roles';

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

type DashboardSidebarNavProps = {
  className?: string;
  onItemClick?: () => void;
};

export function DashboardSidebarNav({ className, onItemClick }: DashboardSidebarNavProps) {
  const pathname = usePathname();
  const [role, setRole] = useState<UserRole | null>(null);

  useEffect(() => {
    const loadRole = async () => {
      const currentUser = await getCurrentUser();
      setRole(currentUser?.role ?? null);
    };

    loadRole();
  }, []);

  const navItems = useMemo<NavItem[]>(() => {
    const baseItems: NavItem[] = [
      { href: '/dashboard', label: 'Dashboard', icon: <Home className="h-5 w-5" /> },
      { href: '/tickets', label: 'Tickets', icon: <Ticket className="h-5 w-5" /> },
      { href: '/priorities', label: 'Prioridades', icon: <TrendingUp className="h-5 w-5" /> },
    ];

    if (
      role === UserRole.JEFATURA ||
      role === UserRole.COMISION_DIRECTIVA ||
      role === UserRole.ADMIN
    ) {
      baseItems.push({ href: '/compras', label: 'Compras', icon: <Wallet className="h-5 w-5" /> });
    }

    baseItems.push({ href: '/help', label: 'Ayuda', icon: <CircleHelp className="h-5 w-5" /> });
    baseItems.push({ href: '/settings', label: 'Configuración', icon: <Settings className="h-5 w-5" /> });

    return baseItems;
  }, [role]);

  return (
    <nav className={cn('flex-1 space-y-2 px-3 py-5', className)}>
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`) === true;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onItemClick}
            className={`group flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all ${
              isActive
                ? 'border-white/30 bg-white/18 text-white'
                : 'border-transparent text-white/78 hover:border-white/10 hover:bg-white/10 hover:text-white'
            }`}
            title={item.label}
          >
            <span className={`rounded-xl p-2 transition ${isActive ? 'bg-white/25' : 'bg-white/10 group-hover:bg-white/20'}`}>
              {item.icon}
            </span>
            <span className="text-sm font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}