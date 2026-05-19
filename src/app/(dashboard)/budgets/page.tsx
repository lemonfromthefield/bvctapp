"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { getCurrentUser } from '@/lib/auth/supabase-auth';
import { supabaseClient } from '@/lib/supabase/client';
import { fetchBudgetTotals, formatCurrency, type BudgetTotals } from '@/lib/utils/budget-utils';
import { UserRole } from '@/types/roles';
import { PRIORITY_RULES, TicketPriority } from '@/types/tickets';

type BudgetRow = {
  id: string;
  ticket_id: string;
  assigned_amount: number;
  disbursed_amount: number | null;
  status: 'ASIGNADO' | 'DESEMBOLSADO' | 'COMPROBADO' | 'CANCELADO';
  assigned_date: string;
};

type TicketLookup = {
  id: string;
  ticket_number: number;
  concept: string;
  assigned_priority: TicketPriority;
  status: string;
};

function getPriorityBadgeVariant(priority: TicketPriority): 'red' | 'orange' | 'yellow' | 'blue' | 'gray' {
  switch (priority) {
    case TicketPriority.URGENTE:
      return 'red';
    case TicketPriority.ALTA_IMPORTANCIA:
      return 'orange';
    case TicketPriority.MEDIA_IMPORTANCIA:
      return 'yellow';
    case TicketPriority.BAJA_IMPORTANCIA:
      return 'blue';
    default:
      return 'gray';
  }
}

export default function BudgetsPage() {
  const router = useRouter();
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [budgets, setBudgets] = useState<BudgetRow[]>([]);
  const [ticketById, setTicketById] = useState<Record<string, TicketLookup>>({});
  const [budgetTotals, setBudgetTotals] = useState<BudgetTotals>({
    totalIncome: 0,
    totalAssigned: 0,
    totalAvailable: 0,
  });
  const [fundAmount, setFundAmount] = useState('');
  const [fundConcept, setFundConcept] = useState('Carga de fondos disponibles');
  const [loading, setLoading] = useState(true);
  const [submittingFunds, setSubmittingFunds] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadBudgets = async () => {
      setLoading(true);
      setError(null);

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

      const [budgetsResult, totalsResult] = await Promise.all([
        supabaseClient
          .from('budgets')
          .select('id, ticket_id, assigned_amount, disbursed_amount, status, assigned_date')
          .order('assigned_date', { ascending: false }),
        fetchBudgetTotals(),
      ]);

      if (budgetsResult.error) {
        setError(budgetsResult.error.message);
        setLoading(false);
        return;
      }

      if (totalsResult.error) {
        setError(totalsResult.error.message);
      } else if (totalsResult.data) {
        setBudgetTotals(totalsResult.data);
      }

      const budgetRows = (budgetsResult.data ?? []) as BudgetRow[];
      setBudgets(budgetRows);

      const ticketIds = budgetRows.map((budget) => budget.ticket_id);
      if (ticketIds.length > 0) {
        const { data: ticketsData, error: ticketsError } = await supabaseClient
          .from('tickets')
          .select('id, ticket_number, concept, assigned_priority, status')
          .in('id', ticketIds);

        if (ticketsError) {
          setError(ticketsError.message);
        } else {
          const lookup = ((ticketsData ?? []) as TicketLookup[]).reduce<Record<string, TicketLookup>>((accumulator, ticket) => {
            accumulator[ticket.id] = ticket;
            return accumulator;
          }, {});
          setTicketById(lookup);
        }
      }

      setLoading(false);
    };

    loadBudgets();
  }, [router]);

  const canEditBudgets =
    currentRole === UserRole.COMISION_DIRECTIVA ||
    currentRole === UserRole.ADMIN;

  const handleLoadFunds = async () => {
    const amount = Number(fundAmount);

    if (!canEditBudgets) {
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Ingresá un monto válido para cargar fondos.');
      return;
    }

    setSubmittingFunds(true);
    setError(null);
    setSuccessMessage(null);

    const { error: rpcError } = await supabaseClient.rpc('register_budget_funds', {
      p_amount: amount,
      p_concept: fundConcept,
    });

    if (rpcError) {
      setError(rpcError.message);
      setSubmittingFunds(false);
      return;
    }

    setBudgetTotals((current) => ({
      totalIncome: current.totalIncome + amount,
      totalAssigned: current.totalAssigned,
      totalAvailable: current.totalAvailable + amount,
    }));
    setFundAmount('');
    setSuccessMessage('Los fondos quedaron cargados y ya están disponibles para asignar.');
    setSubmittingFunds(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Presupuestos</h1>
        <p className="mt-1 text-slate-600">Seguimiento de fondos disponibles, monto comprometido y tickets con presupuesto asignado.</p>
      </div>

      <div className="rounded-3xl border border-white/70 bg-[var(--surface)] p-4 text-sm text-slate-700 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl">
        {canEditBudgets
          ? 'Comisión Directiva puede cargar fondos y luego asignarlos desde la cola de prioridades.'
          : 'Jefatura tiene visibilidad completa de las asignaciones, pero la carga y asignación corresponden a Comisión Directiva.'}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-white/70 bg-[var(--surface)] p-5 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl">
          <p className="text-sm font-medium text-[#6b4b42]">Fondos disponibles</p>
          <p className="mt-2 text-3xl font-bold text-[#1f120f]">{formatCurrency(budgetTotals.totalAvailable)}</p>
        </div>
        <div className="rounded-3xl border border-white/70 bg-[var(--surface)] p-5 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl">
          <p className="text-sm font-medium text-[#6b4b42]">Total desembolsado</p>
          <p className="mt-2 text-3xl font-bold text-[#1f120f]">{formatCurrency(budgetTotals.totalAssigned)}</p>
        </div>
        <div className="rounded-3xl border border-white/70 bg-[var(--surface)] p-5 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl">
          <p className="text-sm font-medium text-[#6b4b42]">Fondos cargados</p>
          <p className="mt-2 text-3xl font-bold text-[#1f120f]">{formatCurrency(budgetTotals.totalIncome)}</p>
        </div>
        <div className="rounded-3xl border border-white/70 bg-[var(--surface)] p-5 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl">
          <p className="text-sm font-medium text-[#6b4b42]">Tickets presupuestados</p>
          <p className="mt-2 text-3xl font-bold text-[#1f120f]">{budgets.length}</p>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      {canEditBudgets ? (
        <div className="rounded-3xl border border-white/70 bg-[var(--surface)] p-6 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[#1f120f]">Cargar monto disponible</h2>
              <p className="mt-1 text-sm text-slate-600">Cada carga suma al fondo general y queda lista para asignaciones posteriores.</p>
            </div>
            <Link href="/priorities">
              <Button variant="outline">Ir a Prioridades</Button>
            </Link>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto]">
            <Input
              label="Monto"
              type="number"
              min="0"
              step="1"
              value={fundAmount}
              onChange={(event) => setFundAmount(event.target.value)}
              placeholder="Ej. 250000"
            />
            <Input
              label="Concepto"
              value={fundConcept}
              onChange={(event) => setFundConcept(event.target.value)}
              placeholder="Detalle de la carga"
            />
            <div className="flex items-end">
              <Button className="w-full md:w-auto" onClick={handleLoadFunds} isLoading={submittingFunds} disabled={submittingFunds}>
                Cargar fondos
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-3xl border border-dashed border-[#e7d3c8] bg-[#fff9f5] p-6 text-sm text-[#6b4b42] shadow-sm">
        {loading ? (
          <p>Cargando asignaciones...</p>
        ) : budgets.length === 0 ? (
          <p>No hay presupuestos cargados todavía.</p>
        ) : (
          <div className="space-y-3">
            {budgets.map((budget) => {
              const ticket = ticketById[budget.ticket_id];

              return (
                <div key={budget.id} className="rounded-2xl border border-[#ead8cf] bg-white/80 p-4">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <p className="font-semibold text-[#1f120f]">
                        {ticket ? `#${ticket.ticket_number} - ${ticket.concept}` : `Ticket ${budget.ticket_id}`}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        {ticket ? (
                          <Badge variant={getPriorityBadgeVariant(ticket.assigned_priority)}>
                            {PRIORITY_RULES[ticket.assigned_priority]?.displayName ?? ticket.assigned_priority}
                          </Badge>
                        ) : null}
                        <Badge variant="gray">Estado ticket: {ticket?.status ?? 'Sin dato'}</Badge>
                        <Badge variant="gray">Presupuesto: {budget.status}</Badge>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 text-sm text-slate-700 xl:items-end">
                      <p className="font-semibold text-[#1f120f]">{formatCurrency(budget.assigned_amount)}</p>
                      <p>Asignado el {new Date(budget.assigned_date).toLocaleDateString('es-AR')}</p>
                      {budget.disbursed_amount != null ? <p>Rendido: {formatCurrency(budget.disbursed_amount)}</p> : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}