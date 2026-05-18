/**
 * Notification Types
 */

export enum NotificationType {
  TICKET_CREATED = 'TICKET_CREATED',
  TICKET_ACCEPTED = 'TICKET_ACCEPTED',
  TICKET_REJECTED = 'TICKET_REJECTED',
  PRIORITY_CHANGED = 'PRIORITY_CHANGED',
  BUDGET_ASSIGNED = 'BUDGET_ASSIGNED',
  TICKET_COMPLETED = 'TICKET_COMPLETED',
  COMMENT_ADDED = 'COMMENT_ADDED',
  TICKET_MODIFIED = 'TICKET_MODIFIED',
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  ticket_id?: string;
  data?: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

export interface NotificationPreferences {
  user_id: string;
  email_notifications: boolean;
  push_notifications: boolean;
  inapp_notifications: boolean;
  notification_types: NotificationType[];
}
