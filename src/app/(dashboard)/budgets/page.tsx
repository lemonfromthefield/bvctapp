"use client";

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { TicketIdentityBlock } from '@/components/tickets/ticket-identity-block';
import { FilePicker } from '@/components/ui/file-picker';
import { Input } from '@/components/ui/input';
import { ModuleFoldSection } from '@/components/ui/module-fold-section';
import { getCurrentUser } from '@/lib/auth/supabase-auth';
import { supabaseClient } from '@/lib/supabase/client';
import { fetchBudgetTotals, formatCurrency, type BudgetTotals } from '@/lib/utils/budget-utils';
import { parseTicketPriority } from '@/lib/utils/priority-utils';
import { UserRole } from '@/types/roles';
import { TicketPriority } from '@/types/tickets';

type BudgetRow = {
  id: string;
  ticket_id: string;
  assigned_amount: number;
  disbursed_amount: number | null;
  status: 'ASIGNADO' | 'ABONADO' | 'COMPROBADO' | 'CANCELADO';
  assigned_date: string;
};

type TicketLookup = {
  id: string;
  ticket_number: number;
  concept: string;
  assigned_priority: TicketPriority;
  import { BudgetHistoryDropdown } from '@/components/budgets/budget-history-dropdown';
  status: string;
  request_date: string;
};

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
  const [pendingSectionOpen, setPendingSectionOpen] = useState(true);
  const [determinedSectionOpen, setDeterminedSectionOpen] = useState(false);
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
        .select('id, ticket_number, concept, assigned_priority, status, request_date')
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

    if (!Number.isFinite(amount) || amount === 0) {
      setError('Ingresá un monto válido distinto de cero.');
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
    setSuccessMessage(
      amount > 0
        ? 'Los fondos quedaron cargados y listos para nuevas asignaciones.'
        : 'Se registró el ajuste negativo y se descontó del disponible.'
    );
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
      setError('El monto de abono debe ser válido y mayor a cero.');
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
    setSuccessMessage('Abono confirmado. El ticket quedó cerrado como completado.');
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
    setSuccessMessage('Abono revertido. El ticket volvió a etapa presupuestaria.');
    setRevertingDisbursementId(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Presupuestos</h1>
        <p className="mt-1 text-slate-600">Asignación ya realizada en prioridades y confirmación de abonos desde este módulo.</p>
      </div>

      <div className="rounded-3xl border border-white/70 bg-[var(--surface)] p-4 text-sm text-slate-700 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl">
        {canEditBudgets
          ? 'Comisión/Admin cargan disponibilidad y confirman o revierten abonos.'
          : 'Jefatura puede visualizar estado financiero y pagos confirmados.'}
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <ModuleFoldSection
        title="Hay nuevas acciones por realizar"
        count={pendingDisbursementBudgets.length}
        status="pending"
        isOpen={pendingSectionOpen}
        onToggle={() => setPendingSectionOpen((current) => !current)}
        emptyMessage="No hay presupuestos pendientes de abono."
      >
        <p className="text-sm text-slate-600">Presupuestos ya asignados, pendientes de confirmación de pago efectivo y registro documental.</p>

        {loading ? (
          <p>Cargando asignaciones...</p>
        ) : (
          <div className="space-y-3">
            {pendingDisbursementBudgets.map((budget) => {
              const ticket = ticketById[budget.ticket_id];

              return (
                <details key={budget.id} className="group rounded-2xl border border-[#ead8cf] bg-white/85 p-4">
                  <summary className="cursor-pointer list-none">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                      {ticket ? (
                        <TicketIdentityBlock
                          ticketNumber={ticket.ticket_number}
                          concept={ticket.concept}
                          status={ticket.status}
                          assignedPriority={ticket.assigned_priority}
                          requestDate={ticket.request_date}
                          budgetStatus={budget.status}
                          budgetAmount={budget.assigned_amount}
                        />
                      ) : (
                        <p className="font-semibold text-[#1f120f]">Ticket {budget.ticket_id}</p>
                      )}

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
                          label="Monto abonado"
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
                          description="Adjuntá recibos, constancias o cualquier documentación del abono."
                          files={disbursementFilesByBudgetId[budget.id] ?? []}
                          onFilesChange={(files) =>
                            setDisbursementFilesByBudgetId((current) => ({
                              ...current,
                              [budget.id]: files,
                            }))
                          }
                          buttonText="Agregar archivos del abono"
                          emptyStateText="Todavía no cargaste comprobantes para este pago."
                          disabled={confirmingDisbursementId === budget.id}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-900">Observaciones del abono</label>
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
                          Confirmar abono
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-4 border-t border-[#ecd9cf] pt-4 text-xs text-slate-500">Solo Comisión/Admin puede confirmar abonos.</p>
                  )}
                </details>
              );
            })}
          </div>
        )}
      </ModuleFoldSection>

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
          <p className="text-sm font-medium text-[#6b4b42]">Total abonado</p>
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
              <p className="mt-1 text-sm text-slate-600">Podés registrar montos positivos (ingreso) o negativos (ajuste que descuenta del disponible).</p>
            </div>
            <Link href="/priorities">
              <Button variant="outline">Ir a Prioridades</Button>
            </Link>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto]">
            <Input
              label="Monto"
              type="number"
              step="0.01"
              value={fundAmount}
              onChange={(event) => setFundAmount(event.target.value)}
              placeholder="Ej. 250000 o -15000"
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

      <ModuleFoldSection
        title="Ya determinado"
        count={determinedBudgets.length}
        status="done"
        isOpen={determinedSectionOpen}
        onToggle={() => setDeterminedSectionOpen((current) => !current)}
        emptyMessage="No hay abonos confirmados todavía."
      >
        <p className="mb-2 text-sm text-slate-600">Abonos confirmados o movimientos cerrados con trazabilidad completa.</p>
        {loading ? (
          <p>Cargando asignaciones...</p>
        ) : (
          <div className="space-y-3">
            {determinedBudgets.map((budget) => {
              const ticket = ticketById[budget.ticket_id];

              return (
                <div key={budget.id} className="rounded-2xl border border-[#ead8cf] bg-white/80 p-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                      {ticket ? (
                        <TicketIdentityBlock
                          ticketNumber={ticket.ticket_number}
                          concept={ticket.concept}
                          status={ticket.status}
                          assignedPriority={ticket.assigned_priority}
                          requestDate={ticket.request_date}
                          budgetStatus={budget.status}
                          budgetAmount={budget.disbursed_amount ?? budget.assigned_amount}
                        />
                      ) : (
                        <p className="font-semibold text-[#1f120f]">Ticket {budget.ticket_id}</p>
                      )}

                      <div className="flex flex-col gap-1 text-sm text-slate-700 xl:items-end">
                        <p className="font-semibold text-[#1f120f]">{formatCurrency(budget.assigned_amount)}</p>
                        <p>Asignado el {new Date(budget.assigned_date).toLocaleDateString('es-AR')}</p>
                        {budget.disbursed_amount != null ? <p>Abonado: {formatCurrency(budget.disbursed_amount)}</p> : null}
                      </div>
                    </div>

                    {canEditBudgets && (budget.status === 'ABONADO' || budget.status === 'COMPROBADO') ? (
                      <div>
                        <Button
                          variant="outline"
                          disabled={revertingDisbursementId === budget.id}
                          onClick={() => revertDisbursement(budget)}
                        >
                          {revertingDisbursementId === budget.id ? 'Revirtiendo...' : 'Revertir abono'}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ModuleFoldSection>
    </div>
  );
}