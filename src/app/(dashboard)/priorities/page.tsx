"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getCurrentUser } from '@/lib/auth/supabase-auth';
import { supabaseClient } from '@/lib/supabase/client';
import { fetchBudgetTotals, formatCurrency, type BudgetTotals } from '@/lib/utils/budget-utils';
import { UserRole } from '@/types/roles';
import { PRIORITY_RULES, TicketPriority } from '@/types/tickets';

type PriorityTicket = {
  id: string;
  ticket_number: number;
  concept: string;
  status: string;
  assigned_priority: TicketPriority;
  request_date: string;
  budget_assigned_amount: number | null;
  budget_status: string | null;
};

const PRIORITY_ORDER = Object.values(TicketPriority).sort(
  (left, right) => PRIORITY_RULES[right].precedence - PRIORITY_RULES[left].precedence
);

const ACTIVE_STATUSES = ['ACEPTADO', 'PRESUPUESTADO', 'EN_PROCESO', 'COMPLETADO'] as const;

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

function getStatusBadgeVariant(status: string): 'default' | 'red' | 'orange' | 'yellow' | 'blue' | 'gray' {
  switch (status) {
    case 'ACEPTADO':
      return 'blue';
    case 'PRESUPUESTADO':
      return 'orange';
    case 'EN_PROCESO':
      return 'yellow';
    case 'COMPLETADO':
      return 'default';
    default:
      return 'gray';
  }
}

export default function PrioritiesPage() {
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [tickets, setTickets] = useState<PriorityTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [budgetSubmittingId, setBudgetSubmittingId] = useState<string | null>(null);
  const [budgetRevertingId, setBudgetRevertingId] = useState<string | null>(null);
  const [selectedPriorityById, setSelectedPriorityById] = useState<Record<string, TicketPriority>>({});
  const [budgetAmountById, setBudgetAmountById] = useState<Record<string, string>>({});
  const [budgetNotesById, setBudgetNotesById] = useState<Record<string, string>>({});
  const [budgetFilesById, setBudgetFilesById] = useState<Record<string, File[]>>({});
  const [budgetTotals, setBudgetTotals] = useState<BudgetTotals>({
    totalIncome: 0,
    totalBudgeted: 0,
    totalDisbursed: 0,
    totalAvailable: 0,
  });
  const [error, setError] = useState<string | null>(null);

  const canModifyPriorities =
    currentRole === UserRole.JEFATURA ||
    currentRole === UserRole.ADMIN;

  const canAssignBudgets =
    currentRole === UserRole.COMISION_DIRECTIVA ||
    currentRole === UserRole.ADMIN;

  const loadData = async () => {
    setLoading(true);
    setError(null);

    const currentUser = await getCurrentUser();

    if (!currentUser) {
      setLoading(false);
      return;
    }

    setCurrentRole(currentUser.role);
    setCurrentUserId(currentUser.id);

    const canCurrentUserViewBudgetAssignments =
      currentUser.role === UserRole.JEFATURA ||
      currentUser.role === UserRole.COMISION_DIRECTIVA ||
      currentUser.role === UserRole.ADMIN;

    const ticketsResult = await supabaseClient
      .from('tickets')
      .select(
        canCurrentUserViewBudgetAssignments
          ? 'id, ticket_number, concept, status, assigned_priority, request_date, budget_assigned_amount, budget_status'
          : 'id, ticket_number, concept, status, assigned_priority, request_date'
      )
      .in('status', [...ACTIVE_STATUSES])
      .order('request_date', { ascending: true });

    if (ticketsResult.error) {
      setError(ticketsResult.error.message);
      setLoading(false);
      return;
    }

    setTickets(
      ((ticketsResult.data ?? []) as Array<Partial<PriorityTicket>>).map((ticket) => ({
        id: ticket.id ?? '',
        ticket_number: ticket.ticket_number ?? 0,
        concept: ticket.concept ?? '',
        status: ticket.status ?? '',
        assigned_priority: (ticket.assigned_priority as TicketPriority | undefined) ?? TicketPriority.SIN_PRIORIDAD,
        request_date: ticket.request_date ?? new Date().toISOString(),
        budget_assigned_amount: canCurrentUserViewBudgetAssignments ? (ticket.budget_assigned_amount ?? null) : null,
        budget_status: canCurrentUserViewBudgetAssignments ? (ticket.budget_status ?? null) : null,
      }))
    );

    if (canCurrentUserViewBudgetAssignments) {
      const totalsResult = await fetchBudgetTotals();

      if (totalsResult.error) {
        setError(totalsResult.error.message);
      } else if (totalsResult.data) {
        setBudgetTotals(totalsResult.data);
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const groupedTickets = useMemo(() => {
    return PRIORITY_ORDER.map((priority) => ({
      priority,
      tickets: tickets
        .filter((ticket) => ticket.assigned_priority === priority)
        .sort((left, right) => new Date(left.request_date).getTime() - new Date(right.request_date).getTime()),
    }));
  }, [tickets]);

  const orderedTickets = useMemo(() => {
    return [...tickets].sort((left, right) => {
      const priorityDiff =
        PRIORITY_RULES[right.assigned_priority].precedence - PRIORITY_RULES[left.assigned_priority].precedence;

      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      return new Date(left.request_date).getTime() - new Date(right.request_date).getTime();
    });
  }, [tickets]);

  const pendingResolutionTickets = useMemo(
    () => orderedTickets.filter((ticket) => ticket.status !== 'COMPLETADO'),
    [orderedTickets]
  );

  const determinedTickets = useMemo(
    () => orderedTickets.filter((ticket) => ticket.status === 'COMPLETADO'),
    [orderedTickets]
  );

  const updateTicketPriority = async (ticket: PriorityTicket) => {
    if (!canModifyPriorities || !currentUserId) {
      return;
    }

    const newPriority = selectedPriorityById[ticket.id] ?? ticket.assigned_priority;

    setUpdatingId(ticket.id);
    setError(null);

    const { error: updateError } = await supabaseClient
      .from('tickets')
      .update({
        assigned_priority: newPriority,
        priority_assigned_by: currentUserId,
        priority_assigned_date: new Date().toISOString(),
      })
      .eq('id', ticket.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setTickets((current) =>
        current.map((currentTicket) =>
          currentTicket.id === ticket.id
            ? {
                ...currentTicket,
                assigned_priority: newPriority,
              }
            : currentTicket
        )
      );
    }

    setUpdatingId(null);
  };

  const uploadBudgetAttachments = async (ticketId: string, files: File[]) => {
    if (!currentUserId || files.length === 0) {
      return;
    }

    for (const file of files) {
      const sanitizedFileName = file.name.replace(/\s+/g, '_');
      const filePath = `${currentUserId}/${ticketId}/budget-${Date.now()}-${sanitizedFileName}`;

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

  const assignBudget = async (ticket: PriorityTicket) => {
    if (!canAssignBudgets) {
      return;
    }

    if (ticket.budget_assigned_amount != null) {
      setError('Ese ticket ya tiene un presupuesto asignado.');
      return;
    }

    const amount = Number(budgetAmountById[ticket.id]);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Ingresá un monto válido para asignar el presupuesto.');
      return;
    }

    if (amount > budgetTotals.totalAvailable) {
      setError('El monto supera los fondos disponibles.');
      return;
    }

    setBudgetSubmittingId(ticket.id);
    setError(null);

    const { error: assignError } = await supabaseClient.rpc('assign_budget_to_ticket', {
      p_ticket_id: ticket.id,
      p_amount: amount,
      p_notes: budgetNotesById[ticket.id] ?? null,
    });

    if (assignError) {
      setError(assignError.message);
      setBudgetSubmittingId(null);
      return;
    }

    await uploadBudgetAttachments(ticket.id, budgetFilesById[ticket.id] ?? []);
    await loadData();

    setBudgetAmountById((current) => ({ ...current, [ticket.id]: '' }));
    setBudgetNotesById((current) => ({ ...current, [ticket.id]: '' }));
    setBudgetFilesById((current) => ({ ...current, [ticket.id]: [] }));
    setBudgetSubmittingId(null);
  };

  const revertBudgetAssignment = async (ticket: PriorityTicket) => {
    if (!canAssignBudgets) {
      return;
    }

    setBudgetRevertingId(ticket.id);
    setError(null);

    const { error: revertError } = await supabaseClient.rpc('unassign_budget_from_ticket', {
      p_ticket_id: ticket.id,
      p_reason: 'Reversion manual desde modulo prioridades',
    });

    if (revertError) {
      setError(revertError.message);
      setBudgetRevertingId(null);
      return;
    }

    await loadData();
    setBudgetRevertingId(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Prioridades</h1>
        <p className="mt-1 text-slate-600">Jefatura ordena prioridades y Comisión asigna presupuestos con respaldo documental.</p>
      </div>

      <div className="rounded-3xl border border-white/70 bg-[var(--surface)] p-4 text-sm text-slate-700 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl">
        {canModifyPriorities
          ? 'Jefatura/Admin pueden cambiar prioridades. Comisión usa esta vista para presupuesto y seguimiento.'
          : 'Vista orientada a presupuesto y seguimiento para tu rol.'}
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="space-y-4 rounded-3xl border border-white/70 bg-[var(--surface)] p-6 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#1f120f]">Pendiente de resolver</h2>
          <Badge variant="yellow">{pendingResolutionTickets.length}</Badge>
        </div>
        <p className="text-sm text-slate-600">Orden operativo con paneles desplegables para trabajar ticket por ticket sin saturación visual.</p>

        {loading ? (
          <p className="text-sm text-slate-600">Cargando cola priorizada...</p>
        ) : pendingResolutionTickets.length === 0 ? (
          <p className="text-sm text-slate-600">No hay tickets pendientes por resolver en prioridades.</p>
        ) : (
          <div className="space-y-3">
            {pendingResolutionTickets.map((ticket) => (
              <details key={ticket.id} className="group rounded-2xl border border-[#ead8cf] bg-[#fff9f5] p-4">
                <summary className="cursor-pointer list-none">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-[#1f120f]">#{ticket.ticket_number} - {ticket.concept}</p>
                      <p className="mt-1 text-xs text-slate-500">Solicitado el {new Date(ticket.request_date).toLocaleDateString('es-AR')}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={getPriorityBadgeVariant(ticket.assigned_priority)}>{PRIORITY_RULES[ticket.assigned_priority].displayName}</Badge>
                      <Badge variant={getStatusBadgeVariant(ticket.status)}>{ticket.status}</Badge>
                      <span className="rounded-full border border-[#d7bfb0] bg-white px-3 py-1 text-xs font-semibold text-[#7d5a4f] transition group-open:bg-[#fde7d8]">Ver panel</span>
                    </div>
                  </div>
                </summary>

                <div className="mt-4 grid gap-4 border-t border-[#ecd9cf] pt-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.2fr)]">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/tickets/${ticket.id}`} className="text-xs font-semibold text-[#9a3d12] underline-offset-2 hover:underline">Ver detalle del ticket</Link>
                    </div>
                    <p className="text-xs text-slate-500">Abrí solo los tickets que quieras trabajar y mantené limpia la vista general.</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-[#1f120f]">Prioridad</p>
                    {canModifyPriorities ? (
                      <>
                        <select
                          value={selectedPriorityById[ticket.id] ?? ticket.assigned_priority}
                          onChange={(event) => setSelectedPriorityById((current) => ({ ...current, [ticket.id]: event.target.value as TicketPriority }))}
                          className="w-full rounded-xl border border-[#d9c2b7] bg-white/90 px-3 py-2 text-sm shadow-sm outline-none"
                          disabled={updatingId === ticket.id}
                        >
                          {PRIORITY_ORDER.map((priority) => (
                            <option key={priority} value={priority}>{PRIORITY_RULES[priority].displayName}</option>
                          ))}
                        </select>
                        <Button variant="outline" className="w-full" disabled={updatingId === ticket.id} onClick={() => updateTicketPriority(ticket)}>
                          {updatingId === ticket.id ? 'Guardando...' : 'Guardar prioridad'}
                        </Button>
                      </>
                    ) : (
                      <p className="rounded-2xl border border-[#ead8cf] bg-white px-3 py-3 text-sm text-slate-600">Prioridad actual: {PRIORITY_RULES[ticket.assigned_priority].displayName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-[#1f120f]">Presupuesto</p>

                    {ticket.budget_assigned_amount != null ? (
                      <div className="space-y-2 rounded-2xl border border-[#ead8cf] bg-white px-3 py-3 text-sm text-slate-700">
                        <p className="font-semibold text-[#1f120f]">{formatCurrency(ticket.budget_assigned_amount)}</p>
                        <p className="text-xs text-slate-500">Estado: {ticket.budget_status ?? 'ASIGNADO'}</p>
                        {canAssignBudgets && ticket.budget_status === 'ASIGNADO' ? (
                          <Button variant="outline" className="w-full" disabled={budgetRevertingId === ticket.id} onClick={() => revertBudgetAssignment(ticket)}>
                            {budgetRevertingId === ticket.id ? 'Revirtiendo...' : 'Revertir asignación'}
                          </Button>
                        ) : null}
                      </div>
                    ) : canAssignBudgets ? (
                      <>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={budgetAmountById[ticket.id] ?? ''}
                          onChange={(event) => setBudgetAmountById((current) => ({ ...current, [ticket.id]: event.target.value }))}
                          placeholder="Monto a asignar"
                          className="w-full rounded-xl border border-[#d9c2b7] bg-white/90 px-3 py-2.5 text-[#1f120f] placeholder:text-[#8f6a60] shadow-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-[#b42318]/35"
                          disabled={budgetSubmittingId === ticket.id}
                        />
                        <textarea
                          rows={2}
                          value={budgetNotesById[ticket.id] ?? ''}
                          onChange={(event) => setBudgetNotesById((current) => ({ ...current, [ticket.id]: event.target.value }))}
                          placeholder="Observaciones de asignación"
                          className="w-full rounded-xl border border-[#d9c2b7] bg-white/90 px-3 py-2 text-sm text-[#1f120f] placeholder:text-[#8f6a60] shadow-sm outline-none"
                          disabled={budgetSubmittingId === ticket.id}
                        />
                        <input
                          type="file"
                          multiple
                          onChange={(event) => setBudgetFilesById((current) => ({ ...current, [ticket.id]: Array.from(event.target.files ?? []) }))}
                          className="w-full text-xs text-slate-600"
                          disabled={budgetSubmittingId === ticket.id}
                        />
                        <Button className="w-full" disabled={budgetSubmittingId === ticket.id} onClick={() => assignBudget(ticket)}>
                          {budgetSubmittingId === ticket.id ? 'Asignando...' : 'Asignar presupuesto'}
                        </Button>
                      </>
                    ) : (
                      <p className="rounded-2xl border border-[#ead8cf] bg-white px-3 py-3 text-xs text-slate-500">Visible para Jefatura. Solo Comisión/Admin puede asignar o revertir presupuesto.</p>
                    )}
                  </div>
                </div>
              </details>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
        </div>
        <div className="rounded-3xl border border-white/70 bg-[var(--surface)] p-5 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl">
          <p className="text-sm font-medium text-[#6b4b42]">Determinado</p>
          <p className="mt-2 text-3xl font-bold text-[#1f120f]">{determinedTickets.length}</p>
          <p className="mt-1 text-sm text-slate-600">Tickets finalizados en esta etapa.</p>
        </div>
      </div>

      <div className="space-y-4 rounded-3xl border border-white/70 bg-[var(--surface)] p-6 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#1f120f]">Ya determinado</h2>
          <Badge variant="default">{determinedTickets.length}</Badge>
        </div>
        {determinedTickets.length === 0 ? (
          <p className="text-sm text-slate-600">Todavía no hay tickets cerrados en esta etapa.</p>
        ) : (
          <div className="space-y-2">
            {determinedTickets.map((ticket) => (
              <div key={ticket.id} className="rounded-2xl border border-[#ead8cf] bg-[#fff9f5] p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-semibold text-[#1f120f]">#{ticket.ticket_number} - {ticket.concept}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusBadgeVariant(ticket.status)}>{ticket.status}</Badge>
                    <Link href={`/tickets/${ticket.id}`} className="text-xs font-semibold text-[#9a3d12] underline-offset-2 hover:underline">Ver ticket</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-[#1f120f]">Categorias de prioridad</h2>
          <p className="text-xs uppercase tracking-[0.16em] text-[#7d5a4f]">Vista sintetica</p>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {groupedTickets.map(({ priority, tickets: priorityTickets }) => (
            <div key={priority} className="rounded-3xl border border-white/70 bg-[linear-gradient(180deg,#fffefe_0%,#fff7f1_100%)] p-5 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl">
              <div className="flex items-center justify-between gap-3 border-b border-[#ecd9cf] pb-3">
                <h3 className="text-lg font-semibold text-[#1f120f]">{PRIORITY_RULES[priority].displayName}</h3>
                <Badge variant={getPriorityBadgeVariant(priority)}>{priorityTickets.length}</Badge>
              </div>
              {priorityTickets.length === 0 ? (
                <p className="mt-3 text-sm text-slate-600">No hay tickets en esta categoria.</p>
              ) : (
                <div className="mt-3 max-h-40 space-y-2 overflow-y-auto pr-1">
                  {priorityTickets.map((ticket) => (
                    <div key={ticket.id} className="rounded-xl border border-[#f0ddd2] bg-white/80 px-3 py-2">
                      <p className="text-sm text-slate-700">#{ticket.ticket_number} - {ticket.concept}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}