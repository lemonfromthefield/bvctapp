-- Migration: Allow COMISION_DIRECTIVA to assign ticket priorities
-- Generated: 2026-06-10
-- Run in Supabase SQL editor or via psql against the target database.

BEGIN;

-- Update the assign_ticket_priority function to allow COMISION_DIRECTIVA
CREATE OR REPLACE FUNCTION public.assign_ticket_priority(
  p_ticket_id UUID,
  p_priority TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ticket_record RECORD;
  normalized_priority TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para asignar prioridades';
  END IF;

  IF public.get_my_role() NOT IN ('JEFATURA', 'COMISION_DIRECTIVA', 'ADMIN') THEN
    RAISE EXCEPTION 'Solo Jefatura, Comisión Directiva o Admin pueden asignar prioridades';
  END IF;

  normalized_priority := UPPER(REPLACE(BTRIM(COALESCE(p_priority, '')), ' ', '_'));

  IF normalized_priority = '' THEN
    RAISE EXCEPTION 'Debes indicar una prioridad válida';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM unnest(enum_range(NULL::ticket_priority_enum)) AS allowed_priority
    WHERE allowed_priority::TEXT = normalized_priority
  ) THEN
    RAISE EXCEPTION 'La prioridad indicada no es válida';
  END IF;

  SELECT id, status, assigned_priority
  INTO ticket_record
  FROM tickets
  WHERE id = p_ticket_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró el ticket solicitado';
  END IF;

  IF ticket_record.status NOT IN ('BORRADOR', 'PENDIENTE', 'ACEPTADO', 'PRESUPUESTADO', 'EN_PROCESO') THEN
    RAISE EXCEPTION 'Solo se puede asignar prioridad a tickets activos';
  END IF;

  UPDATE tickets
  SET assigned_priority = normalized_priority::ticket_priority_enum,
      priority_assigned_by = auth.uid(),
      priority_assigned_date = now(),
      updated_at = now(),
      version = version + 1
  WHERE id = p_ticket_id;

  IF NULLIF(BTRIM(COALESCE(p_notes, '')), '') IS NOT NULL THEN
    INSERT INTO ticket_history (ticket_id, user_id, action, field_changed, old_value, new_value, timestamp)
    VALUES (
      p_ticket_id,
      auth.uid(),
      'PRIORITY_ASSIGNED',
      'priority_note',
      NULL,
      NULLIF(BTRIM(COALESCE(p_notes, '')), ''),
      now()
    );
  END IF;
END;
$$;

COMMIT;
