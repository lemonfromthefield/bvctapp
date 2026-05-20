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
  EN_PROCESO: 'En curso',
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

export function getTicketPriorityBadgeVariant(priority: TicketPriority): 'red' | 'orange' | 'yellow' | 'blue' | 'gray' {
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

export function getTicketPriorityLabel(priority: string | null | undefined) {
  return PRIORITY_RULES[parseTicketPriority(priority)].displayName;
}

export function getBudgetSummaryLabel(budgetStatus?: string | null, budgetAmount?: number | null) {
  if (budgetAmount == null) {
    return 'Presupuesto pendiente';
  }

  return `${budgetStatus ?? 'ASIGNADO'} · ${formatCurrency(budgetAmount)}`;
}