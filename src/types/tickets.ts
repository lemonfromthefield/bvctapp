/**
 * Ticket Types
 * Core domain model for fire station procurement workflow
 */

export enum TicketStatus {
  BORRADOR = 'BORRADOR',
  PENDIENTE = 'PENDIENTE',
  ACEPTADO = 'ACEPTADO',
  RECHAZADO = 'RECHAZADO',
  PRESUPUESTADO = 'PRESUPUESTADO',
  EN_PROCESO = 'EN_PROCESO',
  COMPLETADO = 'COMPLETADO',
  CANCELADO = 'CANCELADO',
}

export enum TicketPriority {
  SIN_PRIORIDAD = 'SIN_PRIORIDAD',
  BAJA_IMPORTANCIA = 'BAJA_IMPORTANCIA',
  MEDIA_IMPORTANCIA = 'MEDIA_IMPORTANCIA',
  ALTA_IMPORTANCIA = 'ALTA_IMPORTANCIA',
  URGENTE = 'URGENTE',
}

export interface PriorityRule {
  priority: TicketPriority;
  displayName: string;
  expectedCoverageInDays: number;
  color: string;
  bgColor: string;
  precedence: number;
}

export const PRIORITY_RULES: Record<TicketPriority, PriorityRule> = {
  [TicketPriority.URGENTE]: {
    priority: TicketPriority.URGENTE,
    displayName: 'Urgente',
    expectedCoverageInDays: 7,
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    precedence: 5,
  },
  [TicketPriority.ALTA_IMPORTANCIA]: {
    priority: TicketPriority.ALTA_IMPORTANCIA,
    displayName: 'Alta Importancia',
    expectedCoverageInDays: 30,
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    precedence: 4,
  },
  [TicketPriority.MEDIA_IMPORTANCIA]: {
    priority: TicketPriority.MEDIA_IMPORTANCIA,
    displayName: 'Media Importancia',
    expectedCoverageInDays: 90,
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    precedence: 3,
  },
  [TicketPriority.BAJA_IMPORTANCIA]: {
    priority: TicketPriority.BAJA_IMPORTANCIA,
    displayName: 'Baja Importancia',
    expectedCoverageInDays: 180,
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    precedence: 2,
  },
  [TicketPriority.SIN_PRIORIDAD]: {
    priority: TicketPriority.SIN_PRIORIDAD,
    displayName: 'Sin Prioridad',
    expectedCoverageInDays: 365,
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    precedence: 1,
  },
};

export interface Ticket {
  id: string; // UUID
  ticket_number: number; // Visible incremental number
  user_id: string; // Creator user ID
  area_id: string;

  // Content
  concept: string;
  quantity: number;
  observations?: string;

  // Dates
  request_date: string; // ISO 8601
  acceptance_date?: string;
  rejection_date?: string;

  // Status & Priority
  status: TicketStatus;
  suggested_priority: TicketPriority;
  assigned_priority: TicketPriority;
  priority_assigned_date?: string;

  // Rejection details
  rejection_reason?: string;
  rejection_user_id?: string;

  // Budget
  budget_assigned_amount?: number;
  budget_assignment_date?: string;
  budget_status?: string;

  // Financial
  final_status?: string;
  disbursement_date?: string;
  voucher_path?: string;

  // Metadata
  created_at: string;
  updated_at: string;
  version: number; // Optimistic locking

  // Relations (can be loaded)
  area?: Area;
  creator?: User;
  rejection_user?: User;
}

export interface TicketHistory {
  id: string;
  ticket_id: string;
  user_id: string;
  action: string;
  field_changed?: string;
  old_value?: string;
  new_value?: string;
  timestamp: string;
  user?: User;
}

export interface TicketComment {
  id: string;
  ticket_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at?: string;
  user?: User;
}

export interface Area {
  id: string;
  name: string;
  code: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  area_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TicketFilter {
  status?: TicketStatus | TicketStatus[];
  priority?: TicketPriority | TicketPriority[];
  area_id?: string;
  user_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface TicketCreateInput {
  concept: string;
  quantity: number;
  area_id: string;
  observations?: string;
  suggested_priority?: TicketPriority;
  attachments?: File[];
}

export interface TicketUpdateInput {
  concept?: string;
  quantity?: number;
  observations?: string;
  suggested_priority?: TicketPriority;
}

export interface TicketActionInput {
  ticket_id: string;
  action: 'accept' | 'reject' | 'budget' | 'complete' | 'cancel';
  metadata?: Record<string, unknown>;
}
