"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Clock, FileText, Paperclip, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabaseClient } from '@/lib/supabase/client';
import { PRIORITY_RULES, TicketPriority } from '@/types/tickets';
import { parseTicketPriority } from '@/lib/utils/priority-utils';
import type { UserRole } from '@/types/roles';
import { ROLES_INFO } from '@/types/roles';

// ─── Types ────────────────────────────────────────────────────────────────────

type TicketDetail = {
  id: string;
  ticket_number: number;
  concept: string;
  quantity: number;
  observations: string | null;
  status: string;
  suggested_priority: string;
  assigned_priority: string;
  order_number: number;
  request_date: string;
  acceptance_date: string | null;
  rejection_date: string | null;
  rejection_reason: string | null;
  priority_assigned_date: string | null;
  areas: { name: string; code: string } | null;
  profiles: { full_name: string; role: string } | null;
};

type HistoryRow = {
  id: string;
  action: string;
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  timestamp: string;
  user_id: string;
  profiles: { full_name: string; role: string } | null;
};

type AttachmentRow = {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
};

type MaybeArray<T> = T | T[] | null;

type RawTicketDetail = Omit<TicketDetail, 'areas' | 'profiles'> & {
  areas: MaybeArray<{ name: string; code: string }>;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  BORRADOR: 'Borrador',
  PENDIENTE: 'Pendiente',
  ACEPTADO: 'Aceptado',
  RECHAZADO: 'Rechazado',
  PRESUPUESTADO: 'Presupuestado',
  EN_PROCESO: 'En proceso',
  COMPLETADO: 'Completado',
  CANCELADO: 'Cancelado',
};

const ACTION_LABELS: Record<string, string> = {
  CREATED: 'Ticket creado',
  SUBMITTED: 'Enviado a revisión',
  ACCEPTED: 'Aceptado',
  REJECTED: 'Rechazado',
  PRIORITY_ASSIGNED: 'Prioridad asignada',
  PRIORITY_CHANGED: 'Prioridad modificada',
  STATUS_CHANGED: 'Estado modificado',
  BUDGET_ASSIGNED: 'Presupuesto asignado',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
  UPDATED: 'Actualizado',
};

function fmtDate(iso: string | null, includeTime = false): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-AR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

function fmtSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function statusVariant(status: string): 'default' | 'red' | 'orange' | 'yellow' | 'blue' | 'gray' {
  const map: Record<string, 'default' | 'red' | 'orange' | 'yellow' | 'blue' | 'gray'> = {
    ACEPTADO: 'blue',
    RECHAZADO: 'red',
    PENDIENTE: 'yellow',
    EN_PROCESO: 'orange',
    COMPLETADO: 'default',
  };
  return map[status] ?? 'gray';
}

function firstOrNull<T>(value: MaybeArray<T>): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [attachments, setAttachments] = useState<AttachmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [selecting, setSelecting] = useState(false);

  const loadTicket = async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    const [ticketResult, profileResult, historyResult, attachmentsResult, currentUser] = await Promise.all([
      supabaseClient
        .from('tickets')
        .select(`
          id, ticket_number, concept, quantity, observations,
          status, suggested_priority, assigned_priority, order_number,
          request_date, acceptance_date, rejection_date, rejection_reason,
          priority_assigned_date, user_id,
          areas ( name, code )
        `)
        .eq('id', id)
        .single(),

      // Fetch profile separately since it's not a direct relation
      (async () => {
        const ticketRes = await supabaseClient
          .from('tickets')
          .select('user_id')
          .eq('id', id)
          .single();
        
        if (ticketRes.error || !ticketRes.data) return { data: null, error: ticketRes.error };
        
        return supabaseClient
          .from('profiles')
          .select('full_name, role')
          .eq('user_id', ticketRes.data.user_id)
          .single();
      })(),

      supabaseClient
        .from('ticket_history')
        .select(`
          id, action, field_changed, old_value, new_value, timestamp, user_id
        `)
        .eq('ticket_id', id)
        .order('timestamp', { ascending: true }),

      supabaseClient
        .from('attachments')
        .select('id, file_name, file_path, file_size, mime_type, created_at')
        .eq('ticket_id', id)
        .order('created_at', { ascending: true }),

      // current user
      (async () => {
        const { data } = await supabaseClient.auth.getUser();
        return data?.user ?? null;
      })(),
    ]);

    if (ticketResult.error) {
      setError(ticketResult.error.message);
    } else {
      const rawTicket = ticketResult.data as unknown as RawTicketDetail;

      // Get profile from separate query result
      const profileData = !profileResult.error && profileResult.data 
        ? profileResult.data as { full_name: string; role: string }
        : null;

      setTicket({
        ...rawTicket,
        areas: firstOrNull(rawTicket.areas),
        profiles: profileData,
      });
    }

    if (!historyResult.error) {
      const historyData = (historyResult.data ?? []) as Array<{
        id: string;
        action: string;
        field_changed: string | null;
        old_value: string | null;
        new_value: string | null;
        timestamp: string;
        user_id: string;
      }>;

      // Get unique user IDs from history
      const userIds = [...new Set(historyData.map(entry => entry.user_id))];
      
      if (userIds.length > 0) {
        // Fetch profiles for these users
        const { data: profilesData, error: profilesError } = await supabaseClient
          .from('profiles')
          .select('user_id, full_name, role')
          .in('user_id', userIds);

        if (!profilesError && profilesData) {
          // Create a map for quick lookup
          const profileMap = new Map(
            (profilesData as Array<{ user_id: string; full_name: string; role: string }>)
              .map(p => [p.user_id, { full_name: p.full_name, role: p.role }])
          );

          // Merge history with profiles
          const normalizedHistory: HistoryRow[] = historyData.map(entry => ({
            ...entry,
            profiles: profileMap.get(entry.user_id) ?? null,
          }));
          setHistory(normalizedHistory);
        } else {
          setHistory(historyData.map(entry => ({ ...entry, profiles: null })));
        }
      } else {
        setHistory([]);
      }
    }

    if (!attachmentsResult.error) {
      setAttachments((attachmentsResult.data ?? []) as AttachmentRow[]);
    }

    // Set current role if we have a signed user
    if (currentUser) {
      try {
        const { data: profileData, error: profileError } = await supabaseClient
          .from('profiles')
          .select('full_name, role, user_id')
          .eq('user_id', currentUser.id)
          .single();

        if (!profileError && profileData) {
          setCurrentRole(profileData.role as UserRole);
        }
      } catch {
        // ignore
      }
    }

    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadTicket();
  }, [id]);

  const handleDownload = async (attachment: AttachmentRow) => {
    setDownloadingFile(attachment.id);
    try {
      const { data, error: dlError } = await supabaseClient.storage
        .from('ticket-attachments')
        .createSignedUrl(attachment.file_path, 60);

      if (dlError || !data?.signedUrl) {
        alert('No se pudo generar el enlace de descarga.');
        return;
      }

      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.download = attachment.file_name;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.click();
    } finally {
      setDownloadingFile(null);
    }
  };

  // ── Loading / error states ──
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-500 text-sm">
        Cargando ticket...
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => router.push('/tickets')}>
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error ?? 'No se encontró el ticket.'}
        </div>
      </div>
    );
  }

  const assignedPriority = parseTicketPriority(ticket.assigned_priority);
  const priorityRule = PRIORITY_RULES[assignedPriority] ?? PRIORITY_RULES[TicketPriority.SIN_PRIORIDAD];
  const creatorRole = ticket.profiles?.role as UserRole | undefined;

  // Compute time remaining using priority rule. Use priority_assigned_date if present, else request_date
  const referenceDate = ticket.priority_assigned_date ? new Date(ticket.priority_assigned_date) : new Date(ticket.request_date);
  const ageDays = Math.floor((Date.now() - referenceDate.getTime()) / (1000 * 60 * 60 * 24));
  const remainingDays = Math.max(0, priorityRule.expectedCoverageInDays - ageDays);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-[#1f120f]">
              Ticket #{ticket.ticket_number}
            </h1>
            <span className="rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              Orden {ticket.order_number}
            </span>
          </div>
          <p className="mt-1 text-slate-600">{ticket.concept}</p>
        </div>
        <Button variant="outline" onClick={() => router.push('/tickets')}>
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
      </div>

      {/* ── Status bar ── */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#ead8cf] bg-[#fff9f5] px-4 py-3">
        <Badge variant={statusVariant(ticket.status)}>
          {STATUS_LABELS[ticket.status] ?? ticket.status}
        </Badge>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${priorityRule.bgColor} ${priorityRule.color}`}>
          {priorityRule.displayName}
        </span>
        <span className="ml-auto text-xs text-slate-500">
          Solicitado el {fmtDate(ticket.request_date, true)}
        </span>
      </div>

      {/* ── Action buttons (select for Compras) ── */}
      {(currentRole === 'COMISION_DIRECTIVA' || currentRole === 'ADMIN') && (
        <div className="flex items-center gap-2">
          {ticket.status !== 'EN_PROCESO' ? (
            <Button disabled={selecting} onClick={async () => {
              setSelecting(true);
              setError(null);
              const { data, error } = await supabaseClient
                .from('tickets')
                .update({ status: 'EN_PROCESO' })
                .eq('id', ticket.id)
                .select();

              if (error) setError(error.message);
              else if (!data || data.length === 0) setError('No se pudo actualizar el ticket.');
              else await loadTicket();

              setSelecting(false);
            }}>
              {selecting ? 'Seleccionando...' : 'Seleccionar'}
            </Button>
          ) : (
            <Button variant="destructive" disabled={selecting} onClick={async () => {
              setSelecting(true);
              setError(null);
              const { data, error } = await supabaseClient
                .from('tickets')
                .update({ status: 'PENDIENTE' })
                .eq('id', ticket.id)
                .select();

              if (error) setError(error.message);
              else if (!data || data.length === 0) setError('No se pudo actualizar el ticket.');
              else await loadTicket();

              setSelecting(false);
            }}>
              {selecting ? 'Quitando...' : 'Quitar de Compras'}
            </Button>
          )}
        </div>
      )}

      {/* ── Main data ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#b42318]" />
            Datos de la solicitud
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-y-3 sm:grid-cols-2">
            <DataRow label="Concepto" value={ticket.concept} />
            <DataRow label="Cantidad" value={String(ticket.quantity)} />
            <DataRow label="Área" value={ticket.areas ? `${ticket.areas.name} (${ticket.areas.code})` : '—'} />
            <DataRow
              label="Solicitante"
              value={
                ticket.profiles
                  ? `${ticket.profiles.full_name} — ${creatorRole && ROLES_INFO[creatorRole] ? ROLES_INFO[creatorRole].displayName : ticket.profiles.role}`
                  : '—'
              }
            />
            <DataRow label="Prioridad sugerida" value={PRIORITY_RULES[ticket.suggested_priority as TicketPriority]?.displayName ?? ticket.suggested_priority} />
            <DataRow label="Prioridad asignada" value={priorityRule.displayName} />
            <DataRow label="Tiempo restante" value={
              remainingDays === 0 && ageDays > priorityRule.expectedCoverageInDays
                ? `Vencido por ${ageDays - priorityRule.expectedCoverageInDays} días`
                : `${remainingDays} días restantes`
            } />
            {ticket.observations ? (
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium text-slate-500">Observaciones</dt>
                <dd className="mt-0.5 whitespace-pre-wrap text-sm text-[#1f120f]">{ticket.observations}</dd>
              </div>
            ) : null}
          </dl>
        </CardContent>
      </Card>

      {/* ── Timeline ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-[#b42318]" />
            Línea de tiempo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-y-2 sm:grid-cols-2">
            <DataRow label="Fecha de solicitud" value={fmtDate(ticket.request_date, true)} />
            <DataRow label="Aceptación" value={fmtDate(ticket.acceptance_date, true)} pending={!ticket.acceptance_date} />
            <DataRow label="Rechazo" value={fmtDate(ticket.rejection_date, true)} pending={!ticket.rejection_date && ticket.status !== 'RECHAZADO'} hide={ticket.status !== 'RECHAZADO' && !ticket.rejection_date} />
            {ticket.rejection_reason ? (
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium text-slate-500">Motivo de rechazo</dt>
                <dd className="mt-0.5 text-sm text-red-700">{ticket.rejection_reason}</dd>
              </div>
            ) : null}
            <DataRow label="Prioridad asignada el" value={fmtDate(ticket.priority_assigned_date, true)} pending={!ticket.priority_assigned_date} />
            <div className="sm:col-span-2 rounded-2xl border border-[#ead8cf] bg-[#fff9f5] px-4 py-3 text-sm text-[#6b4b42]">
              El detalle presupuestario ya no forma parte de esta vista.
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* ── Attachments ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Paperclip className="h-5 w-5 text-[#b42318]" />
            Archivos adjuntos
            {attachments.length > 0 ? (
              <span className="ml-1 rounded-full bg-[#fff1e8] px-2 py-0.5 text-xs font-semibold text-[#b42318]">
                {attachments.length}
              </span>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {attachments.length === 0 ? (
            <p className="text-sm text-slate-500">Sin archivos adjuntos.</p>
          ) : (
            <ul className="space-y-2">
              {attachments.map((att) => (
                <li key={att.id} className="flex items-center justify-between rounded-xl border border-[#ead8cf] bg-white px-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[#1f120f]">{att.file_name}</p>
                    <p className="text-xs text-slate-500">
                      {fmtSize(att.file_size)}{att.mime_type ? ` · ${att.mime_type}` : ''} · {fmtDate(att.created_at)}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={downloadingFile === att.id}
                    onClick={() => handleDownload(att)}
                    className="ml-4 shrink-0 rounded-xl border border-[#d9c2b7] bg-[#fff9f5] px-3 py-1.5 text-xs font-semibold text-[#9a3d12] transition hover:bg-[#fde7d8] disabled:opacity-50"
                  >
                    {downloadingFile === att.id ? 'Generando...' : 'Descargar'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ── History / Traceability ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-[#b42318]" />
            Trazabilidad
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-slate-500">Sin registros de actividad.</p>
          ) : (
            <ol className="relative border-l-2 border-[#ead8cf] pl-5 space-y-5">
              {history.map((entry) => {
                const role = entry.profiles?.role as UserRole | undefined;
                const roleLabel = role && ROLES_INFO[role] ? ROLES_INFO[role].displayName : entry.profiles?.role ?? '';
                return (
                  <li key={entry.id} className="relative">
                    <span className="absolute -left-[1.4rem] top-1 h-3 w-3 rounded-full border-2 border-[#b42318] bg-white" />
                    <p className="text-sm font-semibold text-[#1f120f]">
                      {ACTION_LABELS[entry.action] ?? entry.action}
                    </p>
                    {entry.profiles ? (
                      <p className="text-xs text-slate-500">
                        por {entry.profiles.full_name}
                        {roleLabel ? ` · ${roleLabel}` : ''}
                      </p>
                    ) : null}
                    <p className="text-xs text-slate-400">{fmtDate(entry.timestamp, true)}</p>
                    {entry.field_changed ? (
                      <div className="mt-1.5 rounded-xl border border-[#ead8cf] bg-[#fff9f5] px-3 py-2 text-xs text-slate-600">
                        <span className="font-medium">{entry.field_changed}:</span>{' '}
                        {entry.old_value ? (
                          <>
                            <span className="line-through text-slate-400">{entry.old_value}</span>
                            {' → '}
                          </>
                        ) : null}
                        <span className="font-medium text-[#1f120f]">{entry.new_value ?? '—'}</span>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>

    </div>
  );
}

// ─── Small helper component ───────────────────────────────────────────────────

function DataRow({
  label,
  value,
  pending = false,
  hide = false,
}: {
  label: string;
  value?: string;
  pending?: boolean;
  hide?: boolean;
}) {
  if (hide) return null;
  return (
    <div>
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className={`mt-0.5 text-sm ${pending && !value ? 'italic text-slate-400' : 'text-[#1f120f]'}`}>
        {value ?? (pending ? 'Pendiente' : '—')}
      </dd>
    </div>
  );
}
