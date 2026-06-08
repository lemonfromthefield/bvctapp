-- Migration: Allow COMISION_DIRECTIVA/JEFATURA/Admin to update accepted tickets for workflow transitions
-- Generated: 2026-06-10
-- Run in Supabase SQL editor or via psql against the target database.

BEGIN;

ALTER POLICY "tickets_update_owner_draft" ON tickets
  USING (
    (user_id = auth.uid() AND status IN ('BORRADOR', 'PENDIENTE')) OR
    (get_my_role() IN ('JEFATURA', 'COMISION_DIRECTIVA', 'ADMIN')
      AND status NOT IN ('RECHAZADO', 'COMPLETADO', 'CANCELADO'))
  );

COMMIT;
