/**
 * Validation schemas using Zod
 */

import { z } from 'zod';
import { TicketPriority } from '@/types/tickets';
import { UserRole } from '@/types/roles';

export const createTicketSchema = z.object({
  concept: z.string().min(5, 'El concepto debe tener al menos 5 caracteres'),
  quantity: z.number().int().positive('La cantidad debe ser positiva'),
  area_id: z.string().uuid('Selecciona un área válida'),
  observations: z.string().optional(),
  suggested_priority: z.nativeEnum(TicketPriority).optional(),
});

export const updateTicketSchema = z.object({
  concept: z.string().min(5, 'El concepto debe tener al menos 5 caracteres').optional(),
  quantity: z.number().int().positive('La cantidad debe ser positiva').optional(),
  observations: z.string().optional(),
});

export const ticketActionSchema = z.object({
  ticket_id: z.string().uuid(),
  action: z.enum(['accept', 'reject', 'budget', 'complete', 'cancel']),
  rejection_reason: z.string().min(10, 'Proporciona una razón válida').optional(),
  assigned_amount: z.number().positive().optional(),
  new_priority: z.nativeEnum(TicketPriority).optional(),
});

export const assignPrioritySchema = z.object({
  ticket_id: z.string().uuid(),
  priority: z.nativeEnum(TicketPriority),
  assigned_by: z.string().uuid(),
});

export const assignBudgetSchema = z.object({
  ticket_id: z.string().uuid(),
  amount: z.number().positive('El monto debe ser positivo'),
  assigned_by: z.string().uuid(),
});

export const signInSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export const signUpSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  confirm_password: z.string(),
  full_name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  role: z.nativeEnum(UserRole),
  area_id: z.string().uuid().optional(),
}).refine((data) => data.password === data.confirm_password, {
  message: 'Las contraseñas no coinciden',
  path: ['confirm_password'],
});

// Type exports for use in forms
export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
export type TicketActionInput = z.infer<typeof ticketActionSchema>;
export type AssignPriorityInput = z.infer<typeof assignPrioritySchema>;
export type AssignBudgetInput = z.infer<typeof assignBudgetSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
