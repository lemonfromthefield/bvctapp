"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ModuleFoldSection } from '@/components/ui/module-fold-section';
import { TicketIdentityBlock } from '@/components/tickets/ticket-identity-block';
import { supabaseClient } from '@/lib/supabase/client';
import { getCurrentUser } from '@/lib/auth/supabase-auth';
import { isPendingReviewStatus } from '@/lib/utils/ticket-display';
import { parseTicketPriority } from '@/lib/utils/priority-utils';
import { UserRole } from '@/types/roles';
import { TicketPriority } from '@/types/tickets';

type TicketSummary = {
  id: string;
  ticket_number: number;
  user_id: string;
  concept: string;
  status: string;
  suggested_priority: TicketPriority;
  assigned_priority: string;
  request_date: string;
  budget_assigned_amount: number | null;
  budget_status: string | null;
};

type TicketMetrics = {
  pending: number;
  accepted: number;
  denied: number;
};

export default function TicketsPage() {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [metrics, setMetrics] = useState<TicketMetrics>({
    pending: 0,
    accepted: 0,
    denied: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOnlyMine, setShowOnlyMine] = useState(false);
  const [pendingSectionOpen, setPendingSectionOpen] = useState(true);
  const [determinedSectionOpen, setDeterminedSectionOpen] = useState(false);
  const [actionTicketId, setActionTicketId] = useState<string | null>(null);
  const [revertingTicketId, setRevertingTicketId] = useState<string | null>(null);
  const [rejectingTicketId, setRejectingTicketId] = useState<string | null>(null);
  const [rejectionNotesById, setRejectionNotesById] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadTickets = async () => {
      setLoading(true);
      setError(null);

      const user = await getCurrentUser();

      if (!user) {
        router.replace('/login');
        return;
      }

      setCurrentUserId(user.id);
      setCurrentRole(user.role);

      const [ticketsResult, pendingResult, acceptedResult, deniedResult] = await Promise.all([
        supabaseClient
          .from('tickets')
          .select('id, ticket_number, user_id, concept, status, suggested_priority, assigned_priority, request_date, budget_assigned_amount, budget_status')
          .order('request_date', { ascending: false })
          ,
        supabaseClient
          .from('tickets')
          .select('id', { count: 'exact', head: true })
          .in('status', ['BORRADOR', 'PENDIENTE']),
        supabaseClient
          .from('tickets')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'ACEPTADO'),
        supabaseClient
          .from('tickets')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'RECHAZADO'),
      ]);

      const requestError =
        ticketsResult.error ?? pendingResult.error ?? acceptedResult.error ?? deniedResult.error;

      if (requestError) {
        setError(requestError.message);
      } else {
        setTickets((ticketsResult.data ?? []) as TicketSummary[]);
        setMetrics({
          pending: pendingResult.count ?? 0,
          accepted: acceptedResult.count ?? 0,
          denied: deniedResult.count ?? 0,
        });
      }

      setLoading(false);
    };

    loadTickets();
  }, [router]);

  const visibleTickets = useMemo(() => {
    if (!showOnlyMine || !currentUserId) {
      return tickets;
    }

    return tickets.filter((ticket) => ticket.user_id === currentUserId);
  }, [tickets, showOnlyMine, currentUserId]);

  const pendingTickets = useMemo(
    () => visibleTickets.filter((ticket) => isPendingReviewStatus(ticket.status)),
    [visibleTickets]
  );

  const acceptedTickets = useMemo(
    () => visibleTickets.filter((ticket) => ticket.status === 'ACEPTADO'),
    [visibleTickets]
  );

  const deniedTickets = useMemo(
    () => visibleTickets.filter((ticket) => ticket.status === 'RECHAZADO'),
    [visibleTickets]
  );

  const resolvedTicketsCount = acceptedTickets.length + deniedTickets.length;

  const canReviewTickets =
    currentRole === UserRole.JEFATURA ||
    currentRole === UserRole.COMISION_DIRECTIVA ||
    currentRole === UserRole.ADMIN;

  const getPreviewPriority = (ticket: TicketSummary) => {
    const assignedPriority = parseTicketPriority(ticket.assigned_priority);
    const shouldUseSuggested = isPendingReviewStatus(ticket.status) && assignedPriority === TicketPriority.SIN_PRIORIDAD;

    return shouldUseSuggested ? ticket.suggested_priority : assignedPriority;
  };

  const handleTicketDecision = async (
    ticket: TicketSummary,
    action: 'accept' | 'reject',
    rejectionReason?: string
  ) => {
    if (!canReviewTickets) {
      return;
    }

    if (action === 'reject' && (!rejectionReason || rejectionReason.trim().length < 5)) {
        setError('La denegación requiere un motivo breve para quedar registrada.');
        return;
    }

    setActionTicketId(ticket.id);
    setError(null);

    const nextStatus = action === 'accept' ? 'ACEPTADO' : 'RECHAZADO';
    const now = new Date().toISOString();
    const { error: updateError } = await supabaseClient
      .from('tickets')
      .update({
        status: nextStatus,
        acceptance_date: action === 'accept' ? now : null,
        rejection_date: action === 'reject' ? now : null,
        rejection_reason: action === 'reject' ? rejectionReason : null,
      })
      .eq('id', ticket.id);

    if (updateError) {
      setError(updateError.message);
      setActionTicketId(null);
      return;
    }

    setTickets((current) =>
      current.map((currentTicket) =>
        currentTicket.id === ticket.id
          ? {
              ...currentTicket,
              status: nextStatus,
            }
          : currentTicket
      )
    );

    setMetrics((current) => ({
      pending: isPendingReviewStatus(ticket.status) ? Math.max(current.pending - 1, 0) : current.pending,
      accepted: action === 'accept' ? current.accepted + 1 : current.accepted,
      denied: action === 'reject' ? current.denied + 1 : current.denied,
    }));

    if (action === 'reject') {
      setRejectionNotesById((current) => ({
        ...current,
        [ticket.id]: '',
      }));
      setRejectingTicketId(null);
    }

    setActionTicketId(null);
  };

  const revertTicketStage = async (ticket: TicketSummary) => {
    if (!canReviewTickets) {
      return;
    }

    setRevertingTicketId(ticket.id);
    setError(null);

    const { error: revertError } = await supabaseClient.rpc('reopen_ticket_review', {
      p_ticket_id: ticket.id,
      p_reason: 'Reversion manual desde modulo tickets',
    });

    if (revertError) {
      setError(revertError.message);
      setRevertingTicketId(null);
      return;
    }

    setTickets((current) =>
      current.map((currentTicket) =>
        currentTicket.id === ticket.id
          ? {
              ...currentTicket,
              status: 'PENDIENTE',
            }
          : currentTicket
      )
    );

    setMetrics((current) => ({
      pending: current.pending + 1,
      accepted: ticket.status === 'ACEPTADO' ? Math.max(current.accepted - 1, 0) : current.accepted,
      denied: ticket.status === 'RECHAZADO' ? Math.max(current.denied - 1, 0) : current.denied,
    }));

    setRevertingTicketId(null);
  };

  const renderTicketRow = (ticket: TicketSummary, allowReviewActions: boolean) => {
    const previewPriority = getPreviewPriority(ticket);

    return (
      <div
        key={ticket.id}
        className="rounded-2xl border border-[#ead8cf] bg-[#fff9f5] p-4"
      >
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <TicketIdentityBlock
            ticketNumber={ticket.ticket_number}
            concept={ticket.concept}
            status={ticket.status}
            assignedPriority={previewPriority}
            requestDate={ticket.request_date}
            budgetStatus={ticket.budget_status}
            budgetAmount={ticket.budget_assigned_amount}
          />
          <div className="flex flex-wrap items-center gap-2">
            {allowReviewActions && canReviewTickets && isPendingReviewStatus(ticket.status) ? (
              <>
                <Button
                  size="sm"
                  onClick={() => handleTicketDecision(ticket, 'accept')}
                  isLoading={actionTicketId === ticket.id}
                  disabled={actionTicketId === ticket.id}
                >
                  Aceptar
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setRejectingTicketId((current) => (current === ticket.id ? null : ticket.id))}
                  disabled={actionTicketId === ticket.id}
                >
                  Denegar
                </Button>
              </>
            ) : null}

            {!allowReviewActions && canReviewTickets && (ticket.status === 'ACEPTADO' || ticket.status === 'RECHAZADO') ? (
              <Button
                size="sm"
                variant="outline"
                disabled={revertingTicketId === ticket.id}
                onClick={() => revertTicketStage(ticket)}
              >
                {revertingTicketId === ticket.id ? 'Revirtiendo...' : 'Revertir etapa'}
              </Button>
            ) : null}

            <Link
              href={`/tickets/${ticket.id}`}
              className="rounded-xl border border-[#d9c2b7] bg-white px-3 py-1.5 text-xs font-semibold text-[#9a3d12] transition hover:bg-[#fde7d8]"
            >
              Ver detalle
            </Link>
          </div>
        </div>

        {allowReviewActions && rejectingTicketId === ticket.id ? (
          <div className="mt-4 space-y-2 rounded-2xl border border-red-100 bg-red-50 p-3">
            <p className="text-sm font-medium text-red-800">Devolución de denegación</p>
            <textarea
              value={rejectionNotesById[ticket.id] ?? ''}
              onChange={(event) =>
                setRejectionNotesById((current) => ({
                  ...current,
                  [ticket.id]: event.target.value,
                }))
              }
              rows={3}
              className="w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-sm text-[#1f120f] outline-none"
              placeholder="Explicá el motivo de la denegación para cerrar el ticket"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="destructive"
                isLoading={actionTicketId === ticket.id}
                disabled={actionTicketId === ticket.id}
                onClick={() => handleTicketDecision(ticket, 'reject', rejectionNotesById[ticket.id])}
              >
                Confirmar denegación
              </Button>
              <Button size="sm" variant="outline" onClick={() => setRejectingTicketId(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
        <h1 className="text-2xl font-bold text-gray-900">Tickets</h1>
        <p className="mt-1 text-slate-600">Central de solicitudes, seguimiento y validación operativa.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => router.push('/tickets/new')}>Nuevo Ticket</Button>
          <Button variant="outline" onClick={() => router.push('/overview')}>Ver Reportes</Button>
          <Button variant="outline" onClick={() => setShowOnlyMine((current) => !current)}>
            {showOnlyMine ? 'Ver todos' : 'Mis Tickets'}
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <ModuleFoldSection
        title="Hay nuevas acciones por realizar"
        count={pendingTickets.length}
        status="pending"
        isOpen={pendingSectionOpen}
        onToggle={() => setPendingSectionOpen((current) => !current)}
        emptyMessage="No hay tickets pendientes."
      >
        <p className="text-xs text-slate-600">
          {showOnlyMine ? 'Mostrando solo tus tickets para revisión.' : 'Mostrando tickets visibles para tu rol.'}
        </p>

        {loading ? (
          <p className="text-sm text-slate-600">Cargando tickets...</p>
        ) : visibleTickets.length === 0 ? (
          <p className="text-sm text-slate-600">No hay tickets para mostrar.</p>
        ) : (
          <div className="space-y-3">{pendingTickets.map((ticket) => renderTicketRow(ticket, true))}</div>
        )}
      </ModuleFoldSection>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-3xl border border-white/70 bg-[var(--surface)] p-5 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl">
          <p className="text-sm font-medium text-[#6b4b42]">Pendientes</p>
          <p className="mt-2 text-3xl font-bold text-[#1f120f]">{metrics.pending}</p>
          <p className="mt-1 text-sm text-slate-600">Solicitudes en espera de revisión.</p>
        </div>
        <div className="rounded-3xl border border-white/70 bg-[var(--surface)] p-5 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl">
          <p className="text-sm font-medium text-[#6b4b42]">Aceptados</p>
          <p className="mt-2 text-3xl font-bold text-[#1f120f]">{metrics.accepted}</p>
          <p className="mt-1 text-sm text-slate-600">Tickets aprobados para avanzar.</p>
        </div>
        <div className="rounded-3xl border border-white/70 bg-[var(--surface)] p-5 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl">
          <p className="text-sm font-medium text-[#6b4b42]">Denegados</p>
          <p className="mt-2 text-3xl font-bold text-[#1f120f]">{metrics.denied}</p>
          <p className="mt-1 text-sm text-slate-600">Solicitudes rechazadas.</p>
        </div>
        <div className="rounded-3xl border border-white/70 bg-[var(--surface)] p-5 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl">
          <p className="text-sm font-medium text-[#6b4b42]">Determinado</p>
          <p className="mt-2 text-3xl font-bold text-[#1f120f]">{resolvedTicketsCount}</p>
          <p className="mt-1 text-sm text-slate-600">Tickets que ya salieron de revisión.</p>
        </div>
      </div>

      <ModuleFoldSection
        title="Ya determinado"
        count={resolvedTicketsCount}
        status="done"
        isOpen={determinedSectionOpen}
        onToggle={() => setDeterminedSectionOpen((current) => !current)}
        emptyMessage="No hay tickets determinados todavía."
      >
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-[#1f120f]">Aceptados</h2>
          {acceptedTickets.length === 0 ? (
            <p className="text-sm text-slate-600">No hay tickets aceptados.</p>
          ) : (
            <div className="space-y-3">{acceptedTickets.map((ticket) => renderTicketRow(ticket, false))}</div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-[#1f120f]">Denegados</h2>
          {deniedTickets.length === 0 ? (
            <p className="text-sm text-slate-600">No hay tickets denegados.</p>
          ) : (
            <div className="space-y-3">{deniedTickets.map((ticket) => renderTicketRow(ticket, false))}</div>
          )}
        </section>
      </ModuleFoldSection>
    </div>
  );
}
