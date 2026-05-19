"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getCurrentUser } from '@/lib/auth/supabase-auth';
import { supabaseClient } from '@/lib/supabase/client';
import { UserRole } from '@/types/roles';

type BudgetRow = {
  id: string;
  assigned_amount: number;
  disbursed_amount: number | null;
  status: 'ASIGNADO' | 'DESEMBOLSADO' | 'COMPROBADO' | 'CANCELADO';
};

export default function BudgetsPage() {
  const router = useRouter();
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [budgets, setBudgets] = useState<BudgetRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBudgets = async () => {
      const currentUser = await getCurrentUser();

      if (!currentUser) {
        router.replace('/login');
        return;
      }

      const canViewBudgets =
        currentUser.role === UserRole.JEFATURA ||
        currentUser.role === UserRole.COMISION_DIRECTIVA ||
        currentUser.role === UserRole.ADMIN;

      if (!canViewBudgets) {
        router.replace('/dashboard');
        return;
      }

      setCurrentRole(currentUser.role);

      const { data } = await supabaseClient
        .from('budgets')
        .select('id, assigned_amount, disbursed_amount, status')
        .order('assigned_date', { ascending: false })
        .limit(50);

      setBudgets((data ?? []) as BudgetRow[]);
      setLoading(false);
    };

    loadBudgets();
  }, [router]);

  const canEditBudgets =
    currentRole === UserRole.COMISION_DIRECTIVA ||
    currentRole === UserRole.ADMIN;

  const totals = useMemo(() => {
    const assigned = budgets.reduce((acc, budget) => acc + (budget.assigned_amount ?? 0), 0);
    const disbursed = budgets.reduce((acc, budget) => acc + (budget.disbursed_amount ?? 0), 0);
    const checked = budgets
      .filter((budget) => budget.status === 'COMPROBADO')
      .reduce((acc, budget) => acc + (budget.disbursed_amount ?? budget.assigned_amount ?? 0), 0);

    return { assigned, disbursed, checked };
  }, [budgets]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Presupuestos</h1>
        <p className="mt-1 text-slate-600">Control de fondos asignados, desembolsados y comprobados.</p>
      </div>

      <div className="rounded-3xl border border-white/70 bg-[var(--surface)] p-4 text-sm text-slate-700 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl">
        {canEditBudgets
          ? 'Edición habilitada para tu rol. Podés gestionar presupuestos y actualizar estados.'
          : 'Vista solo lectura para Jefatura. La edición de presupuestos corresponde a Comisión Directiva.'}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-white/70 bg-[var(--surface)] p-5 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl">
          <p className="text-sm font-medium text-[#6b4b42]">Asignados</p>
          <p className="mt-2 text-3xl font-bold text-[#1f120f]">${totals.assigned.toLocaleString('es-AR')}</p>
        </div>
        <div className="rounded-3xl border border-white/70 bg-[var(--surface)] p-5 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl">
          <p className="text-sm font-medium text-[#6b4b42]">Desembolsados</p>
          <p className="mt-2 text-3xl font-bold text-[#1f120f]">${totals.disbursed.toLocaleString('es-AR')}</p>
        </div>
        <div className="rounded-3xl border border-white/70 bg-[var(--surface)] p-5 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl">
          <p className="text-sm font-medium text-[#6b4b42]">Comprobados</p>
          <p className="mt-2 text-3xl font-bold text-[#1f120f]">${totals.checked.toLocaleString('es-AR')}</p>
        </div>
      </div>

      <div className="rounded-3xl border border-dashed border-[#e7d3c8] bg-[#fff9f5] p-6 text-sm text-[#6b4b42] shadow-sm">
        {loading ? (
          <p>Cargando presupuestos...</p>
        ) : budgets.length === 0 ? (
          <p>No hay presupuestos cargados todavía.</p>
        ) : (
          <div className="space-y-3">
            {budgets.slice(0, 10).map((budget) => (
              <div key={budget.id} className="flex flex-col gap-2 rounded-2xl border border-[#ead8cf] bg-white/70 p-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-medium text-[#1f120f]">Presupuesto #{budget.id.slice(0, 8).toUpperCase()}</p>
                <div className="flex items-center gap-2 text-xs">
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">Estado: {budget.status}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
                    Monto: ${(budget.assigned_amount ?? 0).toLocaleString('es-AR')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4">
          <Button variant="outline" disabled={!canEditBudgets}>
            {canEditBudgets ? 'Edición de presupuestos habilitada' : 'Solo Comisión Directiva puede editar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
