import { ReactNode } from 'react';
import Link from 'next/link';
import {
  Home,
  Ticket,
  TrendingUp,
  Wallet,
  Settings,
} from 'lucide-react';

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
    <div className="flex h-screen bg-gray-50">
      <div className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-800">
          <span className="font-bold text-lg">BVCT</span>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-2">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-2 text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
              title={item.label}
            >
              {item.icon}
              <span className="text-sm">{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="h-16 bg-white border-b border-gray-200 px-8 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">BVCT - Sistema de Tickets</h1>
          <span className="text-sm text-gray-600">Panel institucional</span>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="p-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
