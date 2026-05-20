"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, CircleDollarSign, Layers3, Ticket, TrendingUp, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCurrentUser } from '@/lib/auth/supabase-auth';
import { supabaseClient } from '@/lib/supabase/client';
import { fetchBudgetTotals, formatCurrency, type BudgetTotals } from '@/lib/utils/budget-utils';
import { getTicketPriorityLabel, getTicketPriorityCardStyles, isInCourseStatus, isPendingReviewStatus } from '@/lib/utils/ticket-display';
import { parseTicketPriority } from '@/lib/utils/priority-utils';
import { UserRole } from '@/types/roles';
import { TicketPriority } from '@/types/tickets';

type DashboardTicketRow = {
  id: string;
  user_id: string;
  status: string;
  assigned_priority: string;
  request_date: string;
  budget_assigned_amount: number | null;
  budget_status: string | null;
};

type DashboardBudgetRow = {
  ticket_id: string;
  assigned_amount: number;
  disbursed_amount: number | null;
  status: 'ASIGNADO' | 'ABONADO' | 'COMPROBADO' | 'CANCELADO';
};

type ScopeFilter = 'all' | 'mine';
type StatsPeriod = 'weekly' | 'monthly' | 'yearly';

const PRIORITY_ORDER = Object.values(TicketPriority).sort((left, right) => {
  const leftPriority = parseTicketPriority(left);
  const rightPriority = parseTicketPriority(right);
  const order = {
    [TicketPriority.URGENTE]: 5,
    [TicketPriority.ALTA_IMPORTANCIA]: 4,
    [TicketPriority.MEDIA_IMPORTANCIA]: 3,
    [TicketPriority.BAJA_IMPORTANCIA]: 2,
    [TicketPriority.SIN_PRIORIDAD]: 1,
  };

  return order[rightPriority] - order[leftPriority];
});

function SummaryCard({
  title,
  value,
  description,
  icon,
  accent,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <div className="rounded-3xl border border-white/70 bg-[var(--surface)] p-5 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[#6b4b42]">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-[#1f120f]">{value}</p>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        </div>
        <div className={`rounded-2xl p-3 ${accent}`}>{icon}</div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [scope, setScope] = useState<ScopeFilter>('all');
  const [tickets, setTickets] = useState<DashboardTicketRow[]>([]);
  const [budgets, setBudgets] = useState<DashboardBudgetRow[]>([]);
  const [budgetTotals, setBudgetTotals] = useState<BudgetTotals>({
    totalIncome: 0,
    totalBudgeted: 0,
    totalDisbursed: 0,
    totalAvailable: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statsPeriod, setStatsPeriod] = useState<StatsPeriod>('weekly');

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setError(null);

      const currentUser = await getCurrentUser();

      if (!currentUser) {
        router.replace('/login');
        return;
      }

      setCurrentUserId(currentUser.id);
      setCurrentRole(currentUser.role);

      const [ticketsResult, budgetsResult, budgetTotalsResult] = await Promise.all([
        supabaseClient
          .from('tickets')
          .select('id, user_id, status, assigned_priority, request_date, budget_assigned_amount, budget_status')
          .order('request_date', { ascending: false }),
        supabaseClient
          .from('budgets')
          .select('ticket_id, assigned_amount, disbursed_amount, status'),
        fetchBudgetTotals(),
      ]);

      if (ticketsResult.error) {
        setError(ticketsResult.error.message);
        setLoading(false);
        return;
      }

      if (budgetsResult.error) {
        setError(budgetsResult.error.message);
        setLoading(false);
        return;
      }

      if (budgetTotalsResult.error) {
        setError(budgetTotalsResult.error.message);
        setLoading(false);
        return;
      }

      setTickets((ticketsResult.data ?? []) as DashboardTicketRow[]);
      setBudgets((budgetsResult.data ?? []) as DashboardBudgetRow[]);
      if (budgetTotalsResult.data) {
        setBudgetTotals(budgetTotalsResult.data);
      }
      setLoading(false);
    };

    loadDashboard();
  }, [router]);

  const canViewSystemScope = currentRole === UserRole.JEFATURA || currentRole === UserRole.COMISION_DIRECTIVA || currentRole === UserRole.ADMIN;
  const canViewExecutiveStats = currentRole === UserRole.JEFATURA || currentRole === UserRole.COMISION_DIRECTIVA;

  const visibleTickets = useMemo(() => {
    if (scope === 'mine' && currentUserId) {
      return tickets.filter((ticket) => ticket.user_id === currentUserId);
    }

    return tickets;
  }, [tickets, scope, currentUserId]);

  const visibleTicketIds = useMemo(() => new Set(visibleTickets.map((ticket) => ticket.id)), [visibleTickets]);

  const visibleBudgets = useMemo(
    () => budgets.filter((budget) => visibleTicketIds.has(budget.ticket_id)),
    [budgets, visibleTicketIds]
  );

  const pendingTickets = useMemo(() => visibleTickets.filter((ticket) => isPendingReviewStatus(ticket.status)), [visibleTickets]);
  const inCourseTickets = useMemo(() => visibleTickets.filter((ticket) => isInCourseStatus(ticket.status)), [visibleTickets]);
  const completedTickets = useMemo(() => visibleTickets.filter((ticket) => ticket.status === 'COMPLETADO'), [visibleTickets]);
  const deniedTickets = useMemo(() => visibleTickets.filter((ticket) => ticket.status === 'RECHAZADO'), [visibleTickets]);

  const priorityCounts = useMemo(
    () =>
      PRIORITY_ORDER.map((priority) => ({
        priority,
        count: inCourseTickets.filter((ticket) => parseTicketPriority(ticket.assigned_priority) === priority).length,
      })),
    [inCourseTickets]
  );

  const pendingBudgetsCount = useMemo(
    () => inCourseTickets.filter((ticket) => ticket.budget_assigned_amount == null).length,
    [inCourseTickets]
  );

  const budgetedCount = useMemo(
    () => inCourseTickets.filter((ticket) => ticket.budget_assigned_amount != null).length,
    [inCourseTickets]
  );

  const disbursedCount = useMemo(
    () => completedTickets.filter((ticket) => ticket.budget_status === 'ABONADO' || ticket.budget_status === 'COMPROBADO' || ticket.budget_assigned_amount != null).length,
    [completedTickets]
  );

  const assignedAmount = useMemo(() => {
    if (scope === 'all') {
      return budgetTotals.totalBudgeted;
    }

    return visibleBudgets
      .filter((budget) => budget.status === 'ASIGNADO')
      .reduce((sum, budget) => sum + budget.assigned_amount, 0);
  }, [scope, budgetTotals.totalBudgeted, visibleBudgets]);

  const disbursedAmount = useMemo(() => {
    if (scope === 'all') {
      return budgetTotals.totalDisbursed;
    }

    return visibleBudgets
      .filter((budget) => budget.status === 'ABONADO' || budget.status === 'COMPROBADO')
      .reduce((sum, budget) => sum + (budget.disbursed_amount ?? budget.assigned_amount), 0);
  }, [scope, budgetTotals.totalDisbursed, visibleBudgets]);

  const statsWindowStart = useMemo(() => {
    const now = new Date();
    if (statsPeriod === 'weekly') {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    }

    if (statsPeriod === 'monthly') {
      return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    }

    return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  }, [statsPeriod]);

  const periodTickets = useMemo(
    () => visibleTickets.filter((ticket) => new Date(ticket.request_date) >= statsWindowStart),
    [visibleTickets, statsWindowStart]
  );

  const periodPending = useMemo(() => periodTickets.filter((ticket) => isPendingReviewStatus(ticket.status)).length, [periodTickets]);
  const periodInCourse = useMemo(() => periodTickets.filter((ticket) => isInCourseStatus(ticket.status)).length, [periodTickets]);
  const periodCompleted = useMemo(() => periodTickets.filter((ticket) => ticket.status === 'COMPLETADO').length, [periodTickets]);
  const periodDenied = useMemo(() => periodTickets.filter((ticket) => ticket.status === 'RECHAZADO').length, [periodTickets]);

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(135deg,rgba(127,29,29,0.96)_0%,rgba(180,35,24,0.94)_55%,rgba(249,115,22,0.92)_100%)] p-8 text-white shadow-[0_24px_60px_rgba(76,29,20,0.16)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.12),transparent_24%)]" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#ffe2d2]">Bomberos Voluntarios Colonia Tirolesa</p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Resumen general del sistema</h1>
            <p className="max-w-2xl text-sm leading-6 text-white/85 sm:text-base">
              El dashboard consolida los otros módulos en una lectura rápida: tickets, prioridades y estado presupuestario, con foco general o personal.
            </p>
          </div>

          <div className="rounded-3xl border border-white/15 bg-white/10 p-2 backdrop-blur">
            <div className="flex flex-wrap gap-2">
              {canViewSystemScope ? (
                <button
                  type="button"
                  onClick={() => setScope('all')}
                  className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${scope === 'all' ? 'bg-white text-[#7f1d1d]' : 'text-white/82 hover:bg-white/10'}`}
                >
                  General
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setScope('mine')}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${scope === 'mine' || !canViewSystemScope ? 'bg-white text-[#7f1d1d]' : 'text-white/82 hover:bg-white/10'}`}
              >
                Mis tickets
              </button>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      {loading ? (
        <div className="rounded-3xl border border-white/70 bg-[var(--surface)] p-6 text-sm text-slate-600 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl">
          Cargando resumen institucional...
        </div>
      ) : (
        <>
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-[#1f120f]">Tickets</h2>
                <p className="text-sm text-slate-600">Estado de solicitudes en revisión, gestión y cierre.</p>
              </div>
              <Ticket className="h-6 w-6 text-[#b42318]" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <SummaryCard title="Pendientes" value={pendingTickets.length} description="Faltan aceptar o denegar." icon={<AlertCircle className="h-6 w-6 text-[#f97316]" />} accent="bg-[#fff4e5]" />
              <SummaryCard title="En curso" value={inCourseTickets.length} description="Tickets aceptados en gestión." icon={<Layers3 className="h-6 w-6 text-[#c2410c]" />} accent="bg-[#fff1e8]" />
              <SummaryCard title="Completados" value={completedTickets.length} description="Finalizados con abono." icon={<CheckCircle2 className="h-6 w-6 text-[#16a34a]" />} accent="bg-[#ecfdf3]" />
              <SummaryCard title="Denegados" value={deniedTickets.length} description="No aceptados originalmente." icon={<AlertCircle className="h-6 w-6 text-[#b42318]" />} accent="bg-[#fdecec]" />
              <SummaryCard title="Totales" value={pendingTickets.length + inCourseTickets.length + completedTickets.length + deniedTickets.length} description="Suma de todos los estados visibles." icon={<Ticket className="h-6 w-6 text-[#7f1d1d]" />} accent="bg-[#fce7e4]" />
            </div>
          </section>

          {canViewExecutiveStats ? (
            <section className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-[#1f120f]">Estadísticas ejecutivas</h2>
                  <p className="text-sm text-slate-600">Lectura por período para seguimiento institucional.</p>
                </div>
                <div className="rounded-2xl border border-[#ead7cc] bg-white p-1">
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => setStatsPeriod('weekly')}
                      className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${statsPeriod === 'weekly' ? 'bg-[#7f1d1d] text-white' : 'text-[#7f1d1d] hover:bg-[#fce7e4]'}`}
                    >
                      Semanal
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatsPeriod('monthly')}
                      className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${statsPeriod === 'monthly' ? 'bg-[#7f1d1d] text-white' : 'text-[#7f1d1d] hover:bg-[#fce7e4]'}`}
                    >
                      Mensual
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatsPeriod('yearly')}
                      className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${statsPeriod === 'yearly' ? 'bg-[#7f1d1d] text-white' : 'text-[#7f1d1d] hover:bg-[#fce7e4]'}`}
                    >
                      Anual
                    </button>
                  </div>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <SummaryCard title="Total período" value={periodTickets.length} description="Tickets creados en la ventana seleccionada." icon={<TrendingUp className="h-6 w-6 text-[#7f1d1d]" />} accent="bg-[#fce7e4]" />
                <SummaryCard title="Pendientes" value={periodPending} description="Aún sin resolución en el período." icon={<AlertCircle className="h-6 w-6 text-[#f97316]" />} accent="bg-[#fff4e5]" />
                <SummaryCard title="En curso" value={periodInCourse} description="En gestión activa." icon={<Layers3 className="h-6 w-6 text-[#c2410c]" />} accent="bg-[#fff1e8]" />
                <SummaryCard title="Completados" value={periodCompleted} description="Cerrados con abono." icon={<CheckCircle2 className="h-6 w-6 text-[#16a34a]" />} accent="bg-[#ecfdf3]" />
                <SummaryCard title="Denegados" value={periodDenied} description="No aprobados dentro del período." icon={<AlertCircle className="h-6 w-6 text-[#b42318]" />} accent="bg-[#fdecec]" />
              </div>
            </section>
          ) : null}

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-[#1f120f]">Prioridades</h2>
                <p className="text-sm text-slate-600">Distribución de tickets aceptados que siguen en curso.</p>
              </div>
              <TrendingUp className="h-6 w-6 text-[#b42318]" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {priorityCounts.map(({ priority, count }) => (
                <div
                  key={priority}
                  className={`rounded-3xl border p-5 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl ${getTicketPriorityCardStyles(priority).container}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={`text-sm font-medium ${getTicketPriorityCardStyles(priority).title}`}>{getTicketPriorityLabel(priority)}</p>
                      <p className={`mt-2 text-3xl font-bold tracking-tight ${getTicketPriorityCardStyles(priority).value}`}>{count}</p>
                      <p className={`mt-1 text-sm ${getTicketPriorityCardStyles(priority).description}`}>Tickets en curso con esta prioridad.</p>
                    </div>
                    <div className={`rounded-2xl p-3 ${getTicketPriorityCardStyles(priority).iconContainer}`}>
                      <TrendingUp className={`h-6 w-6 ${getTicketPriorityCardStyles(priority).icon}`} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-[#1f120f]">Presupuestos</h2>
                <p className="text-sm text-slate-600">Estado presupuestario y lectura financiera resumida del sistema.</p>
              </div>
              <Wallet className="h-6 w-6 text-[#b42318]" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <SummaryCard title="Pendientes" value={pendingBudgetsCount} description="En curso sin presupuesto cargado." icon={<AlertCircle className="h-6 w-6 text-[#f97316]" />} accent="bg-[#fff4e5]" />
              <SummaryCard title="Presupuestados" value={budgetedCount} description="En curso con presupuesto asignado." icon={<Layers3 className="h-6 w-6 text-[#b42318]" />} accent="bg-[#fff1e8]" />
              <SummaryCard title="Abonados" value={disbursedCount} description="Finalizados con abono registrado." icon={<CheckCircle2 className="h-6 w-6 text-[#16a34a]" />} accent="bg-[#ecfdf3]" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <SummaryCard title={scope === 'mine' ? 'Disponible institucional' : 'Disponible'} value={formatCurrency(budgetTotals.totalAvailable)} description={scope === 'mine' ? 'Fondo general del sistema aun no asignado.' : 'Monto aun no comprometido en presupuestos.'} icon={<Wallet className="h-6 w-6 text-[#15803d]" />} accent="bg-[#ecfdf3]" />
              <SummaryCard title="Asignado" value={formatCurrency(assignedAmount)} description={scope === 'mine' ? 'Monto asignado a tickets visibles en tu filtro.' : 'Monto contemplado actualmente en presupuestos.'} icon={<CircleDollarSign className="h-6 w-6 text-[#c2410c]" />} accent="bg-[#fff1e8]" />
              <SummaryCard title="Abonado" value={formatCurrency(disbursedAmount)} description={scope === 'mine' ? 'Monto abonado en tickets visibles en tu filtro.' : 'Monto efectivamente abonado.'} icon={<CircleDollarSign className="h-6 w-6 text-[#7f1d1d]" />} accent="bg-[#fdecec]" />
            </div>
          </section>

          <div className="flex flex-wrap gap-3">
            <Button onClick={() => router.push('/tickets/new')}>Nuevo ticket</Button>
            <Button variant="outline" onClick={() => router.push('/tickets')}>Ir a Tickets</Button>
            <Button variant="outline" onClick={() => router.push('/priorities')}>Ir a Prioridades</Button>
            <Button variant="outline" onClick={() => router.push('/budgets')}>Ir a Presupuestos</Button>
          </div>
        </>
      )}
    </div>
  );
}
