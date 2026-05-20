"use client";

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FilePicker } from '@/components/ui/file-picker';
import { Input } from '@/components/ui/input';
import { getCurrentUser } from '@/lib/auth/supabase-auth';
import { supabaseClient } from '@/lib/supabase/client';
import { fetchBudgetTotals, formatCurrency, type BudgetTotals } from '@/lib/utils/budget-utils';
import { parseTicketPriority } from '@/lib/utils/priority-utils';
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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [budgets, setBudgets] = useState<BudgetRow[]>([]);
  const [ticketById, setTicketById] = useState<Record<string, TicketLookup>>({});
  const [budgetTotals, setBudgetTotals] = useState<BudgetTotals>({
    totalIncome: 0,
    totalBudgeted: 0,
    totalDisbursed: 0,
    totalAvailable: 0,
  });
  const [fundAmount, setFundAmount] = useState('');
  const [fundConcept, setFundConcept] = useState('Carga de fondos disponibles');
  const [disbursementAmountByBudgetId, setDisbursementAmountByBudgetId] = useState<Record<string, string>>({});
  const [disbursementNotesByBudgetId, setDisbursementNotesByBudgetId] = useState<Record<string, string>>({});
  const [disbursementFilesByBudgetId, setDisbursementFilesByBudgetId] = useState<Record<string, File[]>>({});
  const [loading, setLoading] = useState(true);
  const [submittingFunds, setSubmittingFunds] = useState(false);
  const [confirmingDisbursementId, setConfirmingDisbursementId] = useState<string | null>(null);
  const [revertingDisbursementId, setRevertingDisbursementId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const pendingDisbursementBudgets = budgets.filter((budget) => budget.status === 'ASIGNADO');
  const determinedBudgets = budgets.filter((budget) => budget.status !== 'ASIGNADO');

  const canEditBudgets =
    currentRole === UserRole.COMISION_DIRECTIVA ||
    currentRole === UserRole.ADMIN;

  const loadData = useCallback(async () => {
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
    setCurrentUserId(currentUser.id);

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
          accumulator[ticket.id] = {
            ...ticket,
            assigned_priority: parseTicketPriority(ticket.assigned_priority),
          };
          return accumulator;
        }, {});
        setTicketById(lookup);
      }
    }

    setLoading(false);
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

    await loadData();
    setFundAmount('');
    setSuccessMessage('Los fondos quedaron cargados y listos para nuevas asignaciones.');
    setSubmittingFunds(false);
  };

  const uploadDisbursementAttachments = async (ticketId: string, files: File[]) => {
    if (!currentUserId || files.length === 0) {
      return;
    }

    for (const file of files) {
      const sanitizedFileName = file.name.replace(/\s+/g, '_');
      const filePath = `${currentUserId}/${ticketId}/disbursement-${Date.now()}-${sanitizedFileName}`;

      const { error: storageError } = await supabaseClient.storage
        .from('ticket-attachments')
        .upload(filePath, file, { upsert: false });

      if (storageError) {
        continue;
      }

      await supabaseClient
        .from('attachments')
        .insert({
          ticket_id: ticketId,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type || null,
          uploaded_by: currentUserId,
        });
    }
  };

  const confirmDisbursement = async (budget: BudgetRow) => {
    if (!canEditBudgets) {
      return;
    }

    const amountInput = disbursementAmountByBudgetId[budget.id];
    const amount = amountInput ? Number(amountInput) : budget.assigned_amount;

    if (!Number.isFinite(amount) || amount <= 0) {
      setError('El monto de desembolso debe ser válido y mayor a cero.');
      return;
    }

    setConfirmingDisbursementId(budget.id);
    setError(null);
    setSuccessMessage(null);

    const { error: rpcError } = await supabaseClient.rpc('confirm_budget_disbursement', {
      p_budget_id: budget.id,
      p_disbursed_amount: amount,
      p_notes: disbursementNotesByBudgetId[budget.id] ?? null,
    });

    if (rpcError) {
      setError(rpcError.message);
      setConfirmingDisbursementId(null);
      return;
    }

    await uploadDisbursementAttachments(budget.ticket_id, disbursementFilesByBudgetId[budget.id] ?? []);
    await loadData();

    setDisbursementAmountByBudgetId((current) => ({ ...current, [budget.id]: '' }));
    setDisbursementNotesByBudgetId((current) => ({ ...current, [budget.id]: '' }));
    setDisbursementFilesByBudgetId((current) => ({ ...current, [budget.id]: [] }));
    setSuccessMessage('Desembolso confirmado. El ticket quedó cerrado como completado.');
    setConfirmingDisbursementId(null);
  };

  const revertDisbursement = async (budget: BudgetRow) => {
    if (!canEditBudgets) {
      return;
    }

    setRevertingDisbursementId(budget.id);
    setError(null);
    setSuccessMessage(null);

    const { error: rpcError } = await supabaseClient.rpc('revert_budget_disbursement', {
      p_budget_id: budget.id,
      p_reason: 'Reversion manual desde modulo presupuestos',
    });

    if (rpcError) {
      setError(rpcError.message);
      setRevertingDisbursementId(null);
      return;
    }

    await loadData();
    setSuccessMessage('Desembolso revertido. El ticket volvió a etapa presupuestaria.');
    setRevertingDisbursementId(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Presupuestos</h1>
        <p className="mt-1 text-slate-600">Asignación ya realizada en prioridades y confirmación de desembolsos desde este módulo.</p>
      </div>

      <div className="rounded-3xl border border-white/70 bg-[var(--surface)] p-4 text-sm text-slate-700 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl">
        {canEditBudgets
          ? 'Comisión/Admin cargan disponibilidad y confirman o revierten desembolsos.'
          : 'Jefatura puede visualizar estado financiero y pagos confirmados.'}
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="space-y-4 rounded-3xl border border-white/70 bg-[var(--surface)] p-6 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#1f120f]">Pendiente de resolver</h2>
          <Badge variant="yellow">{pendingDisbursementBudgets.length}</Badge>
        </div>
        <p className="text-sm text-slate-600">Presupuestos ya asignados, pendientes de confirmación de pago efectivo y registro documental.</p>

        {loading ? (
          <p>Cargando asignaciones...</p>
        ) : pendingDisbursementBudgets.length === 0 ? (
          <p>No hay presupuestos pendientes de desembolso.</p>
        ) : (
          <div className="space-y-3">
            {pendingDisbursementBudgets.map((budget) => {
              const ticket = ticketById[budget.ticket_id];

              return (
                <details key={budget.id} className="group rounded-2xl border border-[#ead8cf] bg-white/85 p-4">
                  <summary className="cursor-pointer list-none">
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

                      <div className="flex items-center gap-3">
                        <p className="text-sm font-semibold text-[#1f120f]">{formatCurrency(budget.assigned_amount)}</p>
                        <span className="rounded-full border border-[#d7bfb0] bg-white px-3 py-1 text-xs font-semibold text-[#7d5a4f] transition group-open:bg-[#fde7d8]">Gestionar</span>
                      </div>
                    </div>
                  </summary>

                  {canEditBudgets ? (
                    <div className="mt-4 grid gap-4 border-t border-[#ecd9cf] pt-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                      <div className="space-y-2">
                        <Input
                          label="Monto desembolsado"
                          type="number"
                          min="0"
                          step="1"
                          value={disbursementAmountByBudgetId[budget.id] ?? ''}
                          onChange={(event) =>
                            setDisbursementAmountByBudgetId((current) => ({
                              ...current,
                              [budget.id]: event.target.value,
                            }))
                          }
                          placeholder={`Por defecto: ${budget.assigned_amount}`}
                        />
                        <FilePicker
                          label="Comprobantes o respaldos"
                          description="Adjuntá recibos, constancias o cualquier documentación del desembolso."
                          files={disbursementFilesByBudgetId[budget.id] ?? []}
                          onFilesChange={(files) =>
                            setDisbursementFilesByBudgetId((current) => ({
                              ...current,
                              [budget.id]: files,
                            }))
                          }
                          buttonText="Agregar archivos del desembolso"
                          emptyStateText="Todavía no cargaste comprobantes para este pago."
                          disabled={confirmingDisbursementId === budget.id}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-900">Observaciones del desembolso</label>
                        <textarea
                          rows={3}
                          value={disbursementNotesByBudgetId[budget.id] ?? ''}
                          onChange={(event) =>
                            setDisbursementNotesByBudgetId((current) => ({
                              ...current,
                              [budget.id]: event.target.value,
                            }))
                          }
                          placeholder="Detalle del pago, proveedor, comprobante, etc."
                          className="w-full rounded-xl border border-[#d9c2b7] bg-white/90 px-3 py-2 text-sm text-[#1f120f] shadow-sm outline-none"
                        />
                        <div className="rounded-2xl border border-[#f0ddd2] bg-[#fff8f3] px-4 py-3 text-xs text-[#7d5a4f]">
                          El sistema confirmará el pago, cerrará el ticket y conservará estos adjuntos en su trazabilidad.
                        </div>
                        <Button
                          className="w-full sm:w-auto"
                          onClick={() => confirmDisbursement(budget)}
                          isLoading={confirmingDisbursementId === budget.id}
                          disabled={confirmingDisbursementId === budget.id}
                        >
                          Confirmar desembolso
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-4 border-t border-[#ecd9cf] pt-4 text-xs text-slate-500">Solo Comisión/Admin puede confirmar desembolsos.</p>
                  )}
                </details>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-white/70 bg-[var(--surface)] p-5 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl">
          <p className="text-sm font-medium text-[#6b4b42]">Total disponible</p>
          <p className="mt-2 text-3xl font-bold text-[#1f120f]">{formatCurrency(budgetTotals.totalAvailable)}</p>
        </div>
        <div className="rounded-3xl border border-white/70 bg-[var(--surface)] p-5 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl">
          <p className="text-sm font-medium text-[#6b4b42]">Total presupuestado</p>
          <p className="mt-2 text-3xl font-bold text-[#1f120f]">{formatCurrency(budgetTotals.totalBudgeted)}</p>
        </div>
        <div className="rounded-3xl border border-white/70 bg-[var(--surface)] p-5 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl">
          <p className="text-sm font-medium text-[#6b4b42]">Total desembolsado</p>
          <p className="mt-2 text-3xl font-bold text-[#1f120f]">{formatCurrency(budgetTotals.totalDisbursed)}</p>
          <p className="mt-1 text-sm text-slate-600">Pagos confirmados y ya abonados.</p>
        </div>
      </div>

      {successMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      {canEditBudgets ? (
        <div className="rounded-3xl border border-white/70 bg-[var(--surface)] p-6 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[#1f120f]">Cargar disponibilidad</h2>
              <p className="mt-1 text-sm text-slate-600">Este monto incrementa el total disponible para asignar presupuestos.</p>
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
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#1f120f]">Ya determinado</h2>
          <Badge variant="default">{determinedBudgets.length}</Badge>
        </div>
        <p className="mb-4 text-sm text-slate-600">Desembolsos confirmados o movimientos cerrados con trazabilidad completa.</p>

        {loading ? (
          <p>Cargando asignaciones...</p>
        ) : determinedBudgets.length === 0 ? (
          <p>No hay desembolsos confirmados todavía.</p>
        ) : (
          <div className="space-y-3">
            {determinedBudgets.map((budget) => {
              const ticket = ticketById[budget.ticket_id];

              return (
                <div key={budget.id} className="rounded-2xl border border-[#ead8cf] bg-white/80 p-4">
                  <div className="flex flex-col gap-3">
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
                        {budget.disbursed_amount != null ? <p>Desembolsado: {formatCurrency(budget.disbursed_amount)}</p> : null}
                      </div>
                    </div>

                    {canEditBudgets && (budget.status === 'DESEMBOLSADO' || budget.status === 'COMPROBADO') ? (
                      <div>
                        <Button
                          variant="outline"
                          disabled={revertingDisbursementId === budget.id}
                          onClick={() => revertDisbursement(budget)}
                        >
                          {revertingDisbursementId === budget.id ? 'Revirtiendo...' : 'Revertir desembolso'}
                        </Button>
                      </div>
                    ) : null}
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