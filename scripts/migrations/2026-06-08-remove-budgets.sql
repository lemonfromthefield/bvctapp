-- Migration: Remove budget-related schema, functions and columns
-- Generated: 2026-06-08
-- WARNING: This will permanently remove budget tables, functions and columns.
-- Run in Supabase SQL editor or via psql against the target database.

BEGIN;

-- Drop budget-related RPCs and triggers that reference budgets
DROP TRIGGER IF EXISTS update_budgets_updated_at ON budgets;
DROP TRIGGER IF EXISTS funds_notifications_trigger ON budget_movements;

DROP FUNCTION IF EXISTS public.assign_budget_to_ticket(UUID, NUMERIC, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.unassign_budget_from_ticket(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.confirm_budget_disbursement(UUID, NUMERIC, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.revert_budget_disbursement(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.register_budget_funds(NUMERIC, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.get_budget_totals() CASCADE;

-- Remove budget-specific tables (and dependent objects)
DROP TABLE IF EXISTS budgets CASCADE;
DROP TABLE IF EXISTS budget_movements CASCADE;

-- Remove budget columns from tickets
ALTER TABLE IF EXISTS tickets
  DROP COLUMN IF EXISTS budget_assigned_amount,
  DROP COLUMN IF EXISTS budget_assignment_date,
  DROP COLUMN IF EXISTS budget_status,
  DROP COLUMN IF EXISTS final_status,
  DROP COLUMN IF EXISTS disbursement_date,
  DROP COLUMN IF EXISTS voucher_path;

-- Remove budget type
DROP TYPE IF EXISTS budget_status_enum;

-- Remove policies that referenced budgets (if still present)
DROP POLICY IF EXISTS budgets_read_hierarchy ON budgets;
DROP POLICY IF EXISTS budgets_modify_admin ON budgets;

-- Replace notify_on_ticket_changes with a simplified version that does not reference budget fields
CREATE OR REPLACE FUNCTION public.notify_on_ticket_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jefatura_user RECORD;
  comision_user RECORD;
BEGIN
  IF TG_OP = 'INSERT' THEN
    FOR jefatura_user IN
      SELECT user_id
      FROM profiles
      WHERE role = 'JEFATURA' AND is_active = true
    LOOP
      PERFORM public.insert_notification(
        jefatura_user.user_id,
        'TICKET_CREATED',
        'Nuevo ticket para autorizar',
        '¡Nuevo ticket para autorizar!',
        NEW.id,
        jsonb_build_object('ticket_number', NEW.ticket_number)
      );
    END LOOP;

    RETURN NEW;
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'ACEPTADO' THEN
      PERFORM public.insert_notification(
        NEW.user_id,
        'TICKET_ACCEPTED',
        'Ticket aceptado',
        'Tu ticket fue aceptado',
        NEW.id,
        jsonb_build_object('ticket_number', NEW.ticket_number)
      );
    ELSIF NEW.status = 'RECHAZADO' THEN
      PERFORM public.insert_notification(
        NEW.user_id,
        'TICKET_REJECTED',
        'Ticket denegado',
        COALESCE('Tu ticket fue denegado. ' || NULLIF(BTRIM(NEW.rejection_reason), ''), 'Tu ticket fue denegado'),
        NEW.id,
        jsonb_build_object('ticket_number', NEW.ticket_number)
      );
    ELSIF NEW.status = 'PENDIENTE' AND OLD.status IN ('ACEPTADO', 'RECHAZADO', 'PRESUPUESTADO', 'EN_PROCESO', 'COMPLETADO') THEN
      PERFORM public.insert_notification(
        NEW.user_id,
        'TICKET_MODIFIED',
        'Ticket reabierto a revision',
        'Tu ticket volvió a estado pendiente para una nueva revisión',
        NEW.id,
        jsonb_build_object('ticket_number', NEW.ticket_number, 'previous_status', OLD.status)
      );
    ELSIF OLD.status = 'COMPLETADO' AND NEW.status IN ('PRESUPUESTADO', 'ACEPTADO') THEN
      PERFORM public.insert_notification(
        NEW.user_id,
        'TICKET_MODIFIED',
        'Abono revertido',
        'Se revirtió el abono de tu ticket y volvió a etapa presupuestaria',
        NEW.id,
        jsonb_build_object('ticket_number', NEW.ticket_number)
      );
    END IF;
  END IF;

  IF OLD.assigned_priority IS DISTINCT FROM NEW.assigned_priority THEN
    PERFORM public.insert_notification(
      NEW.user_id,
      'PRIORITY_CHANGED',
      'Prioridad modificada',
      'La prioridad de tu ticket fue modificada',
      NEW.id,
      jsonb_build_object(
        'ticket_number', NEW.ticket_number,
        'previous_priority', OLD.assigned_priority,
        'new_priority', NEW.assigned_priority
      )
    );

    IF NEW.assigned_priority = 'URGENTE' AND OLD.assigned_priority IS DISTINCT FROM 'URGENTE' THEN
      FOR comision_user IN
        SELECT user_id
        FROM profiles
        WHERE role = 'COMISION_DIRECTIVA' AND is_active = true
      LOOP
        PERFORM public.insert_notification(
          comision_user.user_id,
          'PRIORITY_CHANGED',
          'Ticket urgente',
          'Hay un nuevo ticket urgente',
          NEW.id,
          jsonb_build_object('ticket_number', NEW.ticket_number)
        );
      END LOOP;
    END IF;
  END IF;

  IF (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'COMPLETADO') THEN
    PERFORM public.insert_notification(
      NEW.user_id,
      'TICKET_COMPLETED',
      'Ticket finalizado',
      'Tu ticket ya se encuentra finalizado',
      NEW.id,
      jsonb_build_object('ticket_number', NEW.ticket_number)
    );
  END IF;

  IF NEW.status = 'ACEPTADO'
     AND (NEW.assigned_priority = 'URGENTE' OR NEW.suggested_priority = 'URGENTE')
     AND OLD.status IS DISTINCT FROM 'ACEPTADO' THEN
    FOR comision_user IN
      SELECT user_id
      FROM profiles
      WHERE role = 'COMISION_DIRECTIVA' AND is_active = true
    LOOP
      PERFORM public.insert_notification(
        comision_user.user_id,
        'PRIORITY_CHANGED',
        'Ticket urgente',
        'Hay un nuevo ticket urgente',
        NEW.id,
        jsonb_build_object('ticket_number', NEW.ticket_number)
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

COMMIT;

-- End migration
