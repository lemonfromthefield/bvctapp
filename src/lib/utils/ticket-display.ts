import { formatCurrency } from '@/lib/utils/budget-utils';
import { parseTicketPriority } from '@/lib/utils/priority-utils';
import { PRIORITY_RULES, TicketPriority } from '@/types/tickets';

export const REVIEW_PENDING_STATUSES = ['BORRADOR', 'PENDIENTE'] as const;
export const IN_COURSE_STATUSES = ['ACEPTADO', 'PRESUPUESTADO', 'EN_PROCESO'] as const;

export const TICKET_STATUS_LABELS: Record<string, string> = {
  BORRADOR: 'Pendiente',
  PENDIENTE: 'Pendiente',
  ACEPTADO: 'Aceptado',
  RECHAZADO: 'Denegado',
  PRESUPUESTADO: 'Presupuestado',
  EN_PROCESO: 'Seleccionado para Compras',
  COMPLETADO: 'Completado',
  CANCELADO: 'Cancelado',
};

export function isPendingReviewStatus(status: string) {
  return REVIEW_PENDING_STATUSES.includes(status as (typeof REVIEW_PENDING_STATUSES)[number]);
}

export function isInCourseStatus(status: string) {
  return IN_COURSE_STATUSES.includes(status as (typeof IN_COURSE_STATUSES)[number]);
}

export function getTicketStatusBadgeVariant(status: string): 'default' | 'red' | 'orange' | 'yellow' | 'blue' | 'gray' {
  switch (status) {
    case 'ACEPTADO':
      return 'blue';
    case 'RECHAZADO':
      return 'red';
    case 'PENDIENTE':
    case 'BORRADOR':
      return 'yellow';
    case 'PRESUPUESTADO':
      return 'orange';
    case 'EN_PROCESO':
      return 'orange';
    case 'COMPLETADO':
      return 'default';
    default:
      return 'gray';
  }
}

export function getTicketPriorityBadgeVariant(
  priority: TicketPriority | 'TERMINADO'
): 'priorityUrgent' | 'priorityHigh' | 'priorityMedium' | 'priorityLow' | 'priorityNone' | 'priorityTerminado' {
  if (priority === 'TERMINADO') return 'priorityTerminado';
  switch (priority) {
    case TicketPriority.URGENTE:
      return 'priorityUrgent';
    case TicketPriority.ALTA_IMPORTANCIA:
      return 'priorityHigh';
    case TicketPriority.MEDIA_IMPORTANCIA:
      return 'priorityMedium';
    case TicketPriority.BAJA_IMPORTANCIA:
      return 'priorityLow';
    default:
      return 'priorityNone';
  }
}

export function getTicketPriorityCardStyles(priority: TicketPriority | 'TERMINADO') {
  if (priority === 'TERMINADO') {
    return {
      container: 'border-gray-300 bg-gray-100 text-gray-500',
      title: 'text-gray-500',
      value: 'text-gray-500',
      description: 'text-gray-400',
      iconContainer: 'bg-gray-200',
      icon: 'text-gray-400',
    };
  }
  switch (priority) {
    case TicketPriority.URGENTE:
      return {
        container: 'border-[#7f1d1d] bg-[#b91c1c] text-white priority-urgent-pulse',
        title: 'text-white/95',
        value: 'text-white',
        description: 'text-white/85',
        iconContainer: 'bg-white/20',
        icon: 'text-white',
      };
    case TicketPriority.ALTA_IMPORTANCIA:
      return {
        container: 'border-[#14532d] bg-white text-[#14532d]',
        title: 'text-[#14532d]',
        value: 'text-[#14532d]',
        description: 'text-[#166534]',
        iconContainer: 'bg-[#bbf7d0]',
        icon: 'text-[#14532d]',
      };
    case TicketPriority.MEDIA_IMPORTANCIA:
      return {
        container: 'border-[#15803d] bg-white text-[#15803d]',
        title: 'text-[#15803d]',
        value: 'text-[#15803d]',
        description: 'text-[#166534]',
        iconContainer: 'bg-[#bbf7d0]',
        icon: 'text-[#15803d]',
      };
    case TicketPriority.BAJA_IMPORTANCIA:
      return {
        container: 'border-[#4ade80] bg-white text-[#166534]',
        title: 'text-[#166534]',
        value: 'text-[#166534]',
        description: 'text-[#166534]',
        iconContainer: 'bg-[#dcfce7]',
        icon: 'text-[#166534]',
      };
    default:
      return {
        container: 'border-[#1d4ed8] bg-white text-[#1e3a8a]',
        title: 'text-[#1e3a8a]',
        value: 'text-[#1e3a8a]',
        description: 'text-[#1e40af]',
        iconContainer: 'bg-[#dbeafe]',
        icon: 'text-[#1e3a8a]',
      };
  }
}

export function getTicketPriorityLabel(priority: string | null | undefined) {
  return PRIORITY_RULES[parseTicketPriority(priority)].displayName;
}

export function getBudgetSummaryLabel(budgetStatus?: string | null, budgetAmount?: number | null) {
  if (budgetAmount == null) {
    return 'Presupuesto pendiente';
  }

  return `${budgetStatus ?? 'ASIGNADO'} · ${formatCurrency(budgetAmount)}`;
}