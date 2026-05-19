"use client";

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getCurrentUser } from '@/lib/auth/supabase-auth';
import { supabaseClient } from '@/lib/supabase/client';
import { UserRole } from '@/types/roles';
import { TicketPriority } from '@/types/tickets';

type PriorityTicket = {
  id: string;
  ticket_number: number;
  concept: string;
  status: string;
  assigned_priority: TicketPriority;
};

export default function PrioritiesPage() {
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [tickets, setTickets] = useState<PriorityTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedPriorityById, setSelectedPriorityById] = useState<Record<string, TicketPriority>>({});
  const [error, setError] = useState<string | null>(null);

  const canModifyPriorities =
    currentRole === UserRole.JEFATURA ||
    currentRole === UserRole.COMISION_DIRECTIVA ||
    currentRole === UserRole.ADMIN;

  useEffect(() => {
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

      const { data, error: ticketsError } = await supabaseClient
        .from('tickets')
        .select('id, ticket_number, concept, status, assigned_priority')
        .eq('status', 'ACEPTADO')
        .order('request_date', { ascending: false })
        .limit(40);

      if (ticketsError) {
        setError(ticketsError.message);
      } else {
        setTickets((data ?? []) as PriorityTicket[]);
      }

      setLoading(false);
    };

    loadData();
  }, []);

  const counts = useMemo(() => {
    return {
      sinPrioridad: tickets.filter((ticket) => ticket.assigned_priority === TicketPriority.SIN_PRIORIDAD).length,
      alta: tickets.filter((ticket) => ticket.assigned_priority === TicketPriority.ALTA_IMPORTANCIA).length,
      urgente: tickets.filter((ticket) => ticket.assigned_priority === TicketPriority.URGENTE).length,
      total: tickets.length,
    };
  }, [tickets]);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Prioridades</h1>
        <p className="mt-1 text-slate-600">Asignación y seguimiento del orden de atención de cada solicitud.</p>
      </div>

      <div className="rounded-3xl border border-white/70 bg-[var(--surface)] p-4 text-sm text-slate-700 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl">
        {canModifyPriorities
          ? 'Modo edición habilitado para tu rol. Podés reasignar y reordenar prioridades.'
          : 'Modo solo lectura para tu rol. Podés consultar prioridades pero no modificarlas.'}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-3xl border border-white/70 bg-[var(--surface)] p-5 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl">
          <p className="text-sm font-medium text-[#6b4b42]">Sin prioridad</p>
          <p className="mt-2 text-3xl font-bold text-[#1f120f]">{counts.sinPrioridad}</p>
        </div>
        <div className="rounded-3xl border border-white/70 bg-[var(--surface)] p-5 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl">
          <p className="text-sm font-medium text-[#6b4b42]">Alta</p>
          <p className="mt-2 text-3xl font-bold text-[#1f120f]">{counts.alta}</p>
        </div>
        <div className="rounded-3xl border border-white/70 bg-[var(--surface)] p-5 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl">
          <p className="text-sm font-medium text-[#6b4b42]">Urgente</p>
          <p className="mt-2 text-3xl font-bold text-[#1f120f]">{counts.urgente}</p>
        </div>
        <div className="rounded-3xl border border-white/70 bg-[var(--surface)] p-5 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl">
          <p className="text-sm font-medium text-[#6b4b42]">Tickets aceptados</p>
          <p className="mt-2 text-3xl font-bold text-[#1f120f]">{counts.total}</p>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="space-y-3 rounded-3xl border border-white/70 bg-[var(--surface)] p-6 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl">
        <p className="font-semibold text-[#1f120f]">Tickets aceptados para priorizar</p>

        {loading ? (
          <p className="text-sm text-slate-600">Cargando tickets...</p>
        ) : tickets.length === 0 ? (
          <p className="text-sm text-slate-600">No hay tickets aceptados para priorizar.</p>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="rounded-2xl border border-[#ead8cf] bg-[#fff9f5] p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-[#1f120f]">#{ticket.ticket_number} - {ticket.concept}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant="blue">{ticket.status}</Badge>
                      <Badge variant="gray">Actual: {ticket.assigned_priority}</Badge>
                    </div>
                  </div>

                  {canModifyPriorities ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedPriorityById[ticket.id] ?? ticket.assigned_priority}
                        onChange={(event) =>
                          setSelectedPriorityById((current) => ({
                            ...current,
                            [ticket.id]: event.target.value as TicketPriority,
                          }))
                        }
                        className="rounded-xl border border-[#d9c2b7] bg-white/90 px-3 py-2 text-sm shadow-sm outline-none"
                        disabled={updatingId === ticket.id}
                      >
                        {Object.values(TicketPriority).map((priority) => (
                          <option key={priority} value={priority}>
                            {priority}
                          </option>
                        ))}
                      </select>
                      <Button
                        variant="outline"
                        disabled={updatingId === ticket.id}
                        onClick={() => updateTicketPriority(ticket)}
                      >
                        {updatingId === ticket.id ? 'Guardando...' : 'Reasignar'}
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-white/70 bg-[var(--surface)] p-6 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl">
        <p className="font-semibold text-[#1f120f]">Flujo sugerido</p>
        <ol className="mt-3 space-y-2 text-sm text-slate-700">
          <li>1. Revisar el ticket pendiente.</li>
          <li>2. Asignar una prioridad según urgencia e impacto.</li>
          <li>3. Registrar el cambio para trazabilidad.</li>
        </ol>
      </div>
    </div>
  );
}
