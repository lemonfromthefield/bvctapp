/**
 * Audit & Activity Logging Types
 */

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  changes: Record<string, { old_value: unknown; new_value: unknown }>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  description: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  ACCEPT = 'ACCEPT',
  REJECT = 'REJECT',
  CHANGE_PRIORITY = 'CHANGE_PRIORITY',
  ASSIGN_BUDGET = 'ASSIGN_BUDGET',
  UPLOAD_FILE = 'UPLOAD_FILE',
  DELETE_FILE = 'DELETE_FILE',
  ADD_COMMENT = 'ADD_COMMENT',
  VIEW = 'VIEW',
  EXPORT = 'EXPORT',
}
