"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabaseClient } from '@/lib/supabase/client';
import { getCurrentUser } from '@/lib/auth/supabase-auth';

type TicketSummary = {
  id: string;
  ticket_number: number;
  user_id: string;
  concept: string;
  status: string;
  assigned_priority: string;
  request_date: string;
};

function getStatusBadgeVariant(status: string): 'default' | 'red' | 'orange' | 'yellow' | 'blue' | 'gray' {
  switch (status) {
    case 'ACEPTADO':
      return 'blue';
    case 'RECHAZADO':
      return 'red';
    case 'PENDIENTE':
      return 'yellow';
    case 'EN_PROCESO':
      return 'orange';
    case 'COMPLETADO':
      return 'default';
    default:
      return 'gray';
  }
}

export default function TicketsPage() {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOnlyMine, setShowOnlyMine] = useState(false);

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

      const { data, error: ticketsError } = await supabaseClient
        .from('tickets')
        .select('id, ticket_number, user_id, concept, status, assigned_priority, request_date')
        .order('request_date', { ascending: false })
        .limit(50);

      if (ticketsError) {
        setError(ticketsError.message);
      } else {
        setTickets((data ?? []) as TicketSummary[]);
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

  const acceptedCount = tickets.filter((ticket) => ticket.status === 'ACEPTADO').length;
  const deniedCount = tickets.filter((ticket) => ticket.status === 'RECHAZADO').length;
  const pendingCount = tickets.filter((ticket) => ticket.status === 'PENDIENTE').length;

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

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-white/70 bg-[var(--surface)] p-5 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl">
          <p className="text-sm font-medium text-[#6b4b42]">Pendientes</p>
          <p className="mt-2 text-3xl font-bold text-[#1f120f]">{pendingCount}</p>
          <p className="mt-1 text-sm text-slate-600">Solicitudes en espera de revisión.</p>
        </div>
        <div className="rounded-3xl border border-white/70 bg-[var(--surface)] p-5 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl">
          <p className="text-sm font-medium text-[#6b4b42]">Aceptados</p>
          <p className="mt-2 text-3xl font-bold text-[#1f120f]">{acceptedCount}</p>
          <p className="mt-1 text-sm text-slate-600">Tickets aprobados para avanzar.</p>
        </div>
        <div className="rounded-3xl border border-white/70 bg-[var(--surface)] p-5 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl">
          <p className="text-sm font-medium text-[#6b4b42]">Denegados</p>
          <p className="mt-2 text-3xl font-bold text-[#1f120f]">{deniedCount}</p>
          <p className="mt-1 text-sm text-slate-600">Solicitudes rechazadas.</p>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="space-y-3 rounded-3xl border border-white/70 bg-[var(--surface)] p-5 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl">
        <p className="text-sm font-semibold text-[#1f120f]">
          {showOnlyMine ? 'Mostrando solo tus tickets' : 'Mostrando tickets visibles para tu rol'}
        </p>

        {loading ? (
          <p className="text-sm text-slate-600">Cargando tickets...</p>
        ) : visibleTickets.length === 0 ? (
          <p className="text-sm text-slate-600">No hay tickets para mostrar.</p>
        ) : (
          <div className="space-y-3">
            {visibleTickets.map((ticket) => (
              <div
                key={ticket.id}
                className="rounded-2xl border border-[#ead8cf] bg-[#fff9f5] p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-[#1f120f]">#{ticket.ticket_number} - {ticket.concept}</p>
                    <p className="text-xs text-slate-500">
                      Fecha: {new Date(ticket.request_date).toLocaleString('es-AR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusBadgeVariant(ticket.status)}>{ticket.status}</Badge>
                    <Badge variant="gray">Prioridad: {ticket.assigned_priority}</Badge>
                    <Link
                      href={`/tickets/${ticket.id}`}
                      className="rounded-xl border border-[#d9c2b7] bg-white px-3 py-1.5 text-xs font-semibold text-[#9a3d12] transition hover:bg-[#fde7d8]"
                    >
                      Ver detalle
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
