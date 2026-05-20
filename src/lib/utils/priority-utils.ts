import { TicketPriority, PRIORITY_RULES } from '@/types/tickets';

export function parseTicketPriority(priority: string | null | undefined): TicketPriority {
  if (!priority) {
    return TicketPriority.SIN_PRIORIDAD;
  }

  const normalizedPriority = priority.trim().toUpperCase().replace(/\s+/g, '_');
  return normalizedPriority in PRIORITY_RULES
    ? (normalizedPriority as TicketPriority)
    : TicketPriority.SIN_PRIORIDAD;
}

export function getPriorityDisplayName(priority: string | null | undefined): string {
  return PRIORITY_RULES[parseTicketPriority(priority)].displayName;
}

/**
 * Get next priority in the escalation sequence
 * SIN_PRIORIDAD → BAJA_IMPORTANCIA → MEDIA_IMPORTANCIA → ALTA_IMPORTANCIA → URGENTE
 */
export function getNextPriority(currentPriority: TicketPriority): TicketPriority | null {
  const escalationMap: Record<TicketPriority, TicketPriority | null> = {
    [TicketPriority.SIN_PRIORIDAD]: TicketPriority.BAJA_IMPORTANCIA,
    [TicketPriority.BAJA_IMPORTANCIA]: TicketPriority.MEDIA_IMPORTANCIA,
    [TicketPriority.MEDIA_IMPORTANCIA]: TicketPriority.ALTA_IMPORTANCIA,
    [TicketPriority.ALTA_IMPORTANCIA]: TicketPriority.URGENTE,
    [TicketPriority.URGENTE]: null, // Cannot escalate further
  };

  return escalationMap[currentPriority];
}

/**
 * Check if ticket should be auto-escalated based on age
 */
export function shouldAutoEscalatePriority(
  currentPriority: TicketPriority,
  ticketCreatedDate: Date
): boolean {
  const rule = PRIORITY_RULES[currentPriority];
  const ageInDays = Math.floor(
    (new Date().getTime() - ticketCreatedDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return ageInDays >= rule.expectedCoverageInDays;
}

/**
 * Get priority info for display
 */
export function getPriorityInfo(priority: TicketPriority) {
  return PRIORITY_RULES[priority];
}

/**
 * Sort priorities by precedence (highest first)
 */
export function sortPrioritiesByPrecedence(priorities: TicketPriority[]): TicketPriority[] {
  return priorities.sort(
    (a, b) => PRIORITY_RULES[b].precedence - PRIORITY_RULES[a].precedence
  );
}
