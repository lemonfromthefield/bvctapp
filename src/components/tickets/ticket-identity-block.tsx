import { Badge } from '@/components/ui/badge';
import { getTicketPriorityBadgeVariant, getTicketPriorityLabel, getTicketStatusBadgeVariant, TICKET_STATUS_LABELS } from '@/lib/utils/ticket-display';
import { parseTicketPriority } from '@/lib/utils/priority-utils';

type TicketIdentityBlockProps = {
  ticketNumber: number;
  concept: string;
  status: string;
  assignedPriority: string | null | undefined;
  requestDate?: string | null;
  compact?: boolean;
};

export function TicketIdentityBlock({
  ticketNumber,
  concept,
  status,
  assignedPriority,
  requestDate,
  budgetStatus,
  budgetAmount,
  compact = false,
}: TicketIdentityBlockProps) {
  const normalizedPriority = parseTicketPriority(assignedPriority);

  return (
    <div className="min-w-0 space-y-2">
      <div>
        <p className={`font-semibold text-[#1f120f] ${compact ? 'text-sm' : 'text-base'}`}>
          #{ticketNumber} - {concept}
        </p>
        {requestDate ? (
          <p className="mt-1 text-xs text-slate-500">
            Solicitado el {new Date(requestDate).toLocaleDateString('es-AR')}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant={getTicketStatusBadgeVariant(status)}>{TICKET_STATUS_LABELS[status] ?? status.replace(/_/g, ' ')}</Badge>
        <Badge variant={status === 'COMPLETADO' || status === 'RECHAZADO' ? 'priorityTerminado' : getTicketPriorityBadgeVariant(normalizedPriority)}>
          {status === 'COMPLETADO' || status === 'RECHAZADO' ? 'Terminado' : getTicketPriorityLabel(assignedPriority)}
        </Badge>
      </div>
    </div>
  );
}