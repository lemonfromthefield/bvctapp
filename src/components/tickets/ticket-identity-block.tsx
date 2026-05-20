import { Badge } from '@/components/ui/badge';
import { getBudgetSummaryLabel, getTicketPriorityBadgeVariant, getTicketPriorityLabel, getTicketStatusBadgeVariant, TICKET_STATUS_LABELS } from '@/lib/utils/ticket-display';
import { parseTicketPriority } from '@/lib/utils/priority-utils';

type TicketIdentityBlockProps = {
  ticketNumber: number;
  concept: string;
  status: string;
  assignedPriority: string | null | undefined;
  requestDate?: string | null;
  budgetStatus?: string | null;
  budgetAmount?: number | null;
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
        <Badge variant={getTicketPriorityBadgeVariant(normalizedPriority)}>{getTicketPriorityLabel(assignedPriority)}</Badge>
        <span className="rounded-full border border-[#d7bfb0] bg-white px-3 py-1 font-semibold text-[#7d5a4f]">
          {getBudgetSummaryLabel(budgetStatus, budgetAmount)}
        </span>
      </div>
    </div>
  );
}