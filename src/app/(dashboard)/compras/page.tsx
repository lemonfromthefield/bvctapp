"use client";

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { TicketIdentityBlock } from '@/components/tickets/ticket-identity-block';
import { getCurrentUser } from '@/lib/auth/supabase-auth';
import { supabaseClient } from '@/lib/supabase/client';
import { parseTicketPriority } from '@/lib/utils/priority-utils';
import { UserRole } from '@/types/roles';

type CompraTicket = {
  id: string;
  ticket_number: number;
  concept: string;
  status: string;
  assigned_priority: string;
  request_date: string;
};

export default function ComprasPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<CompraTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError(null);

    const user = await getCurrentUser();
    if (!user) {
      router.replace('/login');
      return;
    }

    setCurrentRole(user.role);

    const result = await supabaseClient
      .from('tickets')
      .select('id, ticket_number, concept, status, assigned_priority, request_date')
      .eq('status', 'EN_PROCESO')
      .order('request_date', { ascending: false });

    if (result.error) {
      setError(result.error.message);
      setLoading(false);
      return;
    }

    setTickets((result.data ?? []) as CompraTicket[]);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const canManage = currentRole === UserRole.COMISION_DIRECTIVA || currentRole === UserRole.ADMIN;

  const acceptTicket = async (id: string) => {
    setError(null);
    const { error } = await supabaseClient.from('tickets').update({ status: 'COMPLETADO' }).eq('id', id);
    if (error) return setError(error.message);
    await loadTickets();
  };

  const rejectTicket = async (id: string) => {
    setError(null);
    const { error } = await supabaseClient.from('tickets').update({ status: 'PENDIENTE' }).eq('id', id);
    if (error) return setError(error.message);
    await loadTickets();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Compras</h1>
        <p className="mt-1 text-slate-600">Tickets seleccionados para el proceso de compras. Desde aquí podés aceptar o devolver solicitudes.</p>
      </div>

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      {loading ? (
        <div className="rounded-2xl border border-white/70 bg-[var(--surface)] p-6 text-sm text-slate-600">Cargando tickets seleccionados...</div>
      ) : tickets.length === 0 ? (
        <div className="rounded-2xl border border-white/70 bg-[var(--surface)] p-6 text-sm text-slate-600">No hay tickets en la cola de Compras.</div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="rounded-2xl border border-[#ead8cf] bg-[#fff9f5] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <TicketIdentityBlock
                  ticketNumber={ticket.ticket_number}
                  concept={ticket.concept}
                  status={ticket.status}
                  assignedPriority={parseTicketPriority(ticket.assigned_priority)}
                  requestDate={ticket.request_date}
                />

                <div className="flex flex-col gap-2 w-full sm:w-auto sm:ml-4">
                  <Link href={`/tickets/${ticket.id}`} className="text-xs font-semibold text-[#9a3d12] underline-offset-2 hover:underline">Ver detalle</Link>
                  {canManage ? (
                    <div className="flex gap-2 mt-2">
                      <Button onClick={() => acceptTicket(ticket.id)}>Aprobar</Button>
                      <Button variant="outline" onClick={() => rejectTicket(ticket.id)}>Revertir</Button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
