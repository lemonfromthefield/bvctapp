"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TicketIdentityBlock } from '@/components/tickets/ticket-identity-block';
import { ModuleFoldSection } from '@/components/ui/module-fold-section';
import { getCurrentUser } from '@/lib/auth/supabase-auth';
import { supabaseClient } from '@/lib/supabase/client';
import { getTicketPriorityBadgeVariant, getTicketPriorityCardStyles } from '@/lib/utils/ticket-display';
import { parseTicketPriority } from '@/lib/utils/priority-utils';
import { UserRole } from '@/types/roles';
import { PRIORITY_RULES, TicketPriority } from '@/types/tickets';

type PriorityTicket = {
  id: string;
  ticket_number: number;
  concept: string;
  status: string;
  assigned_priority: TicketPriority;
  request_date: string;
};

const PRIORITY_ORDER = Object.values(TicketPriority).sort((left, right) => PRIORITY_RULES[right].precedence - PRIORITY_RULES[left].precedence);

const ACTIVE_STATUSES = ['ACEPTADO', 'PRESUPUESTADO', 'EN_PROCESO', 'COMPLETADO'] as const;

export default function PrioritiesPage() {
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [tickets, setTickets] = useState<PriorityTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [selectedPriorityById, setSelectedPriorityById] = useState<Record<string, TicketPriority>>({});
  const [pendingSectionOpen, setPendingSectionOpen] = useState(true);
  const [determinedSectionOpen, setDeterminedSectionOpen] = useState(false);
  const [expandedPriorityByKey, setExpandedPriorityByKey] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const canModifyPriorities =
    currentRole === UserRole.JEFATURA ||
    currentRole === UserRole.ADMIN;

  const canSelectForCompras =
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

    const ticketsResult = await supabaseClient
      .from('tickets')
      .select('id, ticket_number, concept, status, assigned_priority, request_date')
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
        assigned_priority: parseTicketPriority(ticket.assigned_priority as string | undefined),
        request_date: ticket.request_date ?? new Date().toISOString(),
      }))
    );

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

  const selectedTickets = useMemo(() => orderedTickets.filter((ticket) => ticket.status === 'EN_PROCESO'), [orderedTickets]);

  const pendingResolutionTickets = useMemo(
    () => orderedTickets.filter((ticket) => ticket.status !== 'COMPLETADO' && ticket.status !== 'EN_PROCESO'),
    [orderedTickets]
  );

  const determinedTickets = useMemo(() => orderedTickets.filter((ticket) => ticket.status === 'COMPLETADO'), [orderedTickets]);

  const updateTicketPriority = async (ticket: PriorityTicket) => {
    if (!canModifyPriorities || !currentUserId) {
      return;
    }

    const newPriority = selectedPriorityById[ticket.id] ?? ticket.assigned_priority;

    setUpdatingId(ticket.id);
    setError(null);

    const { error: updateError } = await supabaseClient.rpc('assign_ticket_priority', {
      p_ticket_id: ticket.id,
      p_priority: newPriority,
      p_notes: null,
    });

    if (updateError) {
      setError(updateError.message);
    } else {
      await loadData();
    }

    setUpdatingId(null);
  };

  const selectForCompras = async (ticketId: string) => {
    if (!canSelectForCompras) return;
    setSelectingId(ticketId);
    setError(null);

    const { error } = await supabaseClient.from('tickets').update({ status: 'EN_PROCESO' }).eq('id', ticketId);
    if (error) {
      setError(error.message);
      setSelectingId(null);
      return;
    }

    await loadData();
    setSelectingId(null);
  };

  const unselectForCompras = async (ticketId: string) => {
    if (!canSelectForCompras) return;
    setSelectingId(ticketId);
    setError(null);

    const { error } = await supabaseClient.from('tickets').update({ status: 'PENDIENTE' }).eq('id', ticketId);
    if (error) {
      setError(error.message);
      setSelectingId(null);
      return;
    }

    await loadData();
    setSelectingId(null);
  };


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Prioridades</h1>
        <p className="mt-1 text-slate-600">Jefatura ordena prioridades y Comisión selecciona solicitudes para Compras.</p>
      </div>

      <div className="rounded-3xl border border-white/70 bg-[var(--surface)] p-4 text-sm text-slate-700 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl">
        {canModifyPriorities
          ? 'Jefatura/Admin pueden cambiar prioridades. Comisión usa esta vista para seleccionar tickets para Compras.'
          : 'Vista orientada a selección y seguimiento para tu rol.'}
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <ModuleFoldSection
        title="Hay nuevas acciones por realizar"
        count={pendingResolutionTickets.length}
        status="pending"
        isOpen={pendingSectionOpen}
        onToggle={() => setPendingSectionOpen((current) => !current)}
        emptyMessage="No hay tickets pendientes por resolver en prioridades."
      >
        {loading ? (
          <p className="text-sm text-slate-600">Cargando cola priorizada...</p>
        ) : (
          <div className="space-y-3">
            {pendingResolutionTickets.map((ticket) => (
              <details key={ticket.id} className="group rounded-2xl border border-[#ead8cf] bg-[#fff9f5] p-4">
                <summary className="cursor-pointer list-none">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <TicketIdentityBlock
                      ticketNumber={ticket.ticket_number}
                      concept={ticket.concept}
                      status={ticket.status}
                      assignedPriority={ticket.assigned_priority}
                      requestDate={ticket.request_date}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-[#d7bfb0] bg-white px-3 py-1 text-xs font-semibold text-[#7d5a4f] transition group-open:bg-[#fde7d8]">Ver panel</span>
                    </div>
                  </div>
                </summary>

                <div className="mt-4 grid gap-4 border-t border-[#ecd9cf] pt-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.3fr)]">
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

                  <div className="space-y-2 rounded-2xl border border-[#ead8cf] bg-white px-3 py-3 text-sm text-slate-700">
                    <p className="font-semibold text-[#1f120f]">Compras</p>
                    <p className="text-xs text-slate-500">Este módulo gestiona prioridades y seguimiento de compras, sin asignación presupuestaria directa.</p>

                    {canSelectForCompras ? (
                      ticket.status !== 'EN_PROCESO' ? (
                        <Button className="w-full" disabled={selectingId === ticket.id} onClick={() => selectForCompras(ticket.id)}>
                          {selectingId === ticket.id ? 'Seleccionando...' : 'Seleccionar para Compras'}
                        </Button>
                      ) : (
                        <Button variant="destructive" className="w-full" disabled={selectingId === ticket.id} onClick={() => unselectForCompras(ticket.id)}>
                          {selectingId === ticket.id ? 'Quitando...' : 'Quitar de Compras'}
                        </Button>
                      )
                    ) : (
                      <p className="text-xs text-slate-500">Visible solo para Comisión Directiva y Admin.</p>
                    )}
                  </div>
                </div>
              </details>
            ))}
          </div>
        )}
      </ModuleFoldSection>

      <ModuleFoldSection
        title="Seleccionados para Compras"
        count={selectedTickets.length}
        status="pending"
        isOpen={true}
        onToggle={() => {}}
        emptyMessage="No hay tickets seleccionados para Compras."
      >
        {loading ? (
          <p className="text-sm text-slate-600">Cargando seleccionados...</p>
        ) : (
          <div className="space-y-2">
            {selectedTickets.map((ticket) => (
              <div key={ticket.id} className="rounded-2xl border border-[#ead8cf] bg-[#fff9f5] p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <TicketIdentityBlock
                    compact
                    ticketNumber={ticket.ticket_number}
                    concept={ticket.concept}
                    status={ticket.status}
                    assignedPriority={ticket.assigned_priority}
                    requestDate={ticket.request_date}
                  />
                  <div className="flex items-center gap-2">
                    <Link href={`/tickets/${ticket.id}`} className="text-xs font-semibold text-[#9a3d12] underline-offset-2 hover:underline">Ver ticket</Link>
                    {canSelectForCompras ? (
                      <Button variant="destructive" disabled={selectingId === ticket.id} onClick={() => unselectForCompras(ticket.id)}>
                        {selectingId === ticket.id ? 'Quitando...' : 'Quitar de Compras'}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ModuleFoldSection>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-3xl border border-white/70 bg-[var(--surface)] p-5 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl">
          <p className="text-sm font-medium text-[#6b4b42]">Tickets Activos</p>
          <p className="mt-2 text-3xl font-bold text-[#1f120f]">{pendingResolutionTickets.length}</p>
        </div>
        <div className="rounded-3xl border border-white/70 bg-[var(--surface)] p-5 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl">
          <p className="text-sm font-medium text-[#6b4b42]">Seleccionados (Compras)</p>
          <p className="mt-2 text-3xl font-bold text-[#1f120f]">{selectedTickets.length}</p>
        </div>
        <div className="rounded-3xl border border-white/70 bg-[var(--surface)] p-5 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl">
          <p className="text-sm font-medium text-[#6b4b42]">Total tickets</p>
          <p className="mt-2 text-3xl font-bold text-[#1f120f]">{tickets.length}</p>
        </div>
      </div>

      <ModuleFoldSection
        title="Ya determinado"
        count={determinedTickets.length}
        status="done"
        isOpen={determinedSectionOpen}
        onToggle={() => setDeterminedSectionOpen((current) => !current)}
        emptyMessage="Todavía no hay tickets cerrados en esta etapa."
      >
        <div className="space-y-2">
          {determinedTickets.map((ticket) => (
            <div key={ticket.id} className="rounded-2xl border border-[#ead8cf] bg-[#fff9f5] p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <TicketIdentityBlock
                  compact
                  ticketNumber={ticket.ticket_number}
                  concept={ticket.concept}
                  status={ticket.status}
                  assignedPriority={ticket.assigned_priority}
                  requestDate={ticket.request_date}
                />
                <div className="flex items-center gap-2">
                  <Link href={`/tickets/${ticket.id}`} className="text-xs font-semibold text-[#9a3d12] underline-offset-2 hover:underline">Ver ticket</Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ModuleFoldSection>

      <div className="space-y-4 rounded-3xl border border-[#f0d8cc] bg-[linear-gradient(145deg,#fff8f2_0%,#ffeedd_100%)] p-6 shadow-[0_20px_45px_rgba(111,45,27,0.14)]">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-[#1f120f]">Panel de prioridades</h2>
          <p className="text-xs uppercase tracking-[0.16em] text-[#7d5a4f]">Top 5 por categoría</p>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {groupedTickets.map(({ priority, tickets: priorityTickets }) => (
            <div
              key={priority}
              className={`rounded-3xl border p-5 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl ${getTicketPriorityCardStyles(priority).container}`}
            >
              <div className="flex items-center justify-between gap-3 border-b border-black/10 pb-3">
                <h3 className={`text-lg font-semibold ${getTicketPriorityCardStyles(priority).title}`}>{PRIORITY_RULES[priority].displayName}</h3>
                <Badge variant={getTicketPriorityBadgeVariant(priority)}>{priorityTickets.length}</Badge>
              </div>
              {priorityTickets.length === 0 ? (
                <p className={`mt-3 text-sm ${getTicketPriorityCardStyles(priority).description}`}>No hay tickets en esta categoria.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {priorityTickets.slice(0, expandedPriorityByKey[priority] ? priorityTickets.length : 5).map((ticket) => (
                    <div key={ticket.id} className="rounded-xl border border-black/10 bg-white/90 px-3 py-2">
                      <TicketIdentityBlock
                        compact
                        ticketNumber={ticket.ticket_number}
                        concept={ticket.concept}
                        status={ticket.status}
                        assignedPriority={ticket.assigned_priority}
                        requestDate={ticket.request_date}
                      />
                    </div>
                  ))}

                  {priorityTickets.length > 5 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedPriorityByKey((current) => ({
                          ...current,
                          [priority]: !current[priority],
                        }))
                      }
                      className="rounded-xl border border-[#d7bfb0] bg-white px-3 py-1.5 text-xs font-semibold text-[#7d5a4f] transition hover:bg-[#fff3ea]"
                    >
                      {expandedPriorityByKey[priority]
                        ? 'Volver a top 5'
                        : `Ver ${priorityTickets.length - 5} más`}
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}