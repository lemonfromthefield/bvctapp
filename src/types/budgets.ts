/**
 * Budget Management Types
 */

export interface Budget {
  id: string;
  ticket_id: string;
  assigned_amount: number;
  status: BudgetStatus;
  assigned_date: string;
  assigned_by: string;
  disbursement_date?: string;
  disbursed_amount?: number;
  voucher_path?: string;
  created_at: string;
  updated_at: string;
}

export enum BudgetStatus {
  ASIGNADO = 'ASIGNADO',
  ABONADO = 'ABONADO',
  COMPROBADO = 'COMPROBADO',
  CANCELADO = 'CANCELADO',
}

export interface BudgetMovement {
  id: string;
  area_id: string;
  movement_type: 'INGRESO' | 'EGRESO';
  amount: number;
  concept: string;
  ticket_id?: string;
  created_by: string;
  created_at: string;
}

export interface AvailableFunds {
  total: number;
  reserved: number;
  available: number;
  by_area: Record<string, number>;
}
