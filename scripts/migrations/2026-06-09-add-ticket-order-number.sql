-- Migration: Add order_number to tickets
-- Generated: 2026-06-09
-- Run in Supabase SQL editor or via psql against the target database.

BEGIN;

ALTER TABLE IF EXISTS tickets
  ADD COLUMN IF NOT EXISTS order_number INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_tickets_order_number ON tickets(order_number);

-- Initialize order_number using ticket_number for existing tickets so the ordering is deterministic.
UPDATE tickets
SET order_number = ticket_number
WHERE order_number IS NULL OR order_number = 0;

COMMIT;
