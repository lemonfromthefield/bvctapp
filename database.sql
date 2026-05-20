-- ============================================
-- BVCT: Fire Station Procurement System
-- Supabase Schema with Row Level Security
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE user_role_enum AS ENUM (
  'REPRESENTANTE_AREA',
  'JEFATURA',
  'COMISION_DIRECTIVA',
  'ADMIN'
);

CREATE TYPE ticket_status_enum AS ENUM (
  'BORRADOR',
  'PENDIENTE',
  'ACEPTADO',
  'RECHAZADO',
  'PRESUPUESTADO',
  'EN_PROCESO',
  'COMPLETADO',
  'CANCELADO'
);

CREATE TYPE ticket_priority_enum AS ENUM (
  'SIN_PRIORIDAD',
  'BAJA_IMPORTANCIA',
  'MEDIA_IMPORTANCIA',
  'ALTA_IMPORTANCIA',
  'URGENTE'
);

CREATE TYPE budget_status_enum AS ENUM (
  'ASIGNADO',
  'DESEMBOLSADO',
  'COMPROBADO',
  'CANCELADO'
);

-- ============================================
-- TABLES
-- ============================================

-- Areas (Fire Station departments)
CREATE TABLE IF NOT EXISTS areas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Profiles (User profiles extended from auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role user_role_enum NOT NULL DEFAULT 'REPRESENTANTE_AREA',
  area_id UUID REFERENCES areas(id) ON DELETE SET NULL,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_area_id ON profiles(area_id);

-- Tickets (Main entity)
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number BIGSERIAL UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  area_id UUID NOT NULL REFERENCES areas(id) ON DELETE RESTRICT,
  
  -- Content
  concept TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  observations TEXT,
  
  -- Dates
  request_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  acceptance_date TIMESTAMP WITH TIME ZONE,
  rejection_date TIMESTAMP WITH TIME ZONE,
  
  -- Status & Priority
  status ticket_status_enum DEFAULT 'BORRADOR',
  suggested_priority ticket_priority_enum DEFAULT 'SIN_PRIORIDAD',
  assigned_priority ticket_priority_enum DEFAULT 'SIN_PRIORIDAD',
  priority_assigned_date TIMESTAMP WITH TIME ZONE,
  priority_assigned_by UUID REFERENCES auth.users ON DELETE SET NULL,
  
  -- Rejection details
  rejection_reason TEXT,
  rejection_user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  
  -- Budget
  budget_assigned_amount DECIMAL(10, 2),
  budget_assignment_date TIMESTAMP WITH TIME ZONE,
  budget_status TEXT,
  
  -- Financial
  final_status TEXT,
  disbursement_date TIMESTAMP WITH TIME ZONE,
  voucher_path TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  version INTEGER DEFAULT 1,
  
  -- Full-text search index
  CONSTRAINT positive_quantity CHECK (quantity > 0)
);

CREATE INDEX idx_tickets_user_id ON tickets(user_id);
CREATE INDEX idx_tickets_area_id ON tickets(area_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_priority ON tickets(assigned_priority);
CREATE INDEX idx_tickets_created_at ON tickets(created_at DESC);
CREATE INDEX idx_tickets_request_date ON tickets(request_date DESC);
CREATE INDEX idx_tickets_concept_gin ON tickets USING gin(concept gin_trgm_ops);

-- Ticket History (Audit trail)
CREATE TABLE IF NOT EXISTS ticket_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  action TEXT NOT NULL,
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_ticket_history_ticket_id ON ticket_history(ticket_id);
CREATE INDEX idx_ticket_history_user_id ON ticket_history(user_id);
CREATE INDEX idx_ticket_history_timestamp ON ticket_history(timestamp DESC);

-- Ticket Comments
CREATE TABLE IF NOT EXISTS ticket_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_ticket_comments_ticket_id ON ticket_comments(ticket_id);
CREATE INDEX idx_ticket_comments_user_id ON ticket_comments(user_id);

-- Attachments (Files)
CREATE TABLE IF NOT EXISTS attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_attachments_ticket_id ON attachments(ticket_id);

-- Budgets
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL UNIQUE REFERENCES tickets(id) ON DELETE CASCADE,
  assigned_amount DECIMAL(10, 2) NOT NULL CHECK (assigned_amount > 0),
  status budget_status_enum DEFAULT 'ASIGNADO',
  assigned_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  assigned_by UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  disbursement_date TIMESTAMP WITH TIME ZONE,
  disbursed_amount DECIMAL(10, 2),
  voucher_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_budgets_ticket_id ON budgets(ticket_id);
CREATE INDEX idx_budgets_status ON budgets(status);

-- Budget Movements (Fund tracking)
CREATE TABLE IF NOT EXISTS budget_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  area_id UUID REFERENCES areas(id) ON DELETE SET NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('INGRESO', 'EGRESO')),
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  concept TEXT NOT NULL,
  ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_budget_movements_area_id ON budget_movements(area_id);
CREATE INDEX idx_budget_movements_created_at ON budget_movements(created_at DESC);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  data JSONB,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_read ON notifications(read);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  changes JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- Activity Logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  action TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- ============================================
-- TRIGGERS & FUNCTIONS
-- ============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_areas_updated_at
BEFORE UPDATE ON areas
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_tickets_updated_at
BEFORE UPDATE ON tickets
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_budgets_updated_at
BEFORE UPDATE ON budgets
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile when auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.user_metadata->>'full_name', 'User'),
    COALESCE((new.user_metadata->>'role')::user_role_enum, 'REPRESENTANTE_AREA')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Log ticket changes to history
CREATE OR REPLACE FUNCTION log_ticket_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO ticket_history (ticket_id, user_id, action, timestamp)
    VALUES (NEW.id, NEW.user_id, 'CREATED', now());
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      INSERT INTO ticket_history (ticket_id, user_id, action, field_changed, old_value, new_value, timestamp)
      VALUES (NEW.id, auth.uid(), 'STATUS_CHANGED', 'status', OLD.status::text, NEW.status::text, now());
    END IF;
    
    IF OLD.assigned_priority != NEW.assigned_priority THEN
      INSERT INTO ticket_history (ticket_id, user_id, action, field_changed, old_value, new_value, timestamp)
      VALUES (NEW.id, COALESCE(NEW.priority_assigned_by, auth.uid()), 'PRIORITY_CHANGED', 'priority', 
              OLD.assigned_priority::text, NEW.assigned_priority::text, now());
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.insert_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_ticket_id UUID DEFAULT NULL,
  p_data JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO notifications (user_id, type, title, message, ticket_id, data, read)
  VALUES (
    p_user_id,
    p_type,
    p_title,
    p_message,
    p_ticket_id,
    COALESCE(p_data, '{}'::jsonb),
    false
  );
END;
$$;

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
        'Desembolso revertido',
        'Se revirtió el desembolso de tu ticket y volvió a etapa presupuestaria',
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

  IF OLD.budget_assigned_amount IS DISTINCT FROM NEW.budget_assigned_amount
     AND NEW.budget_assigned_amount IS NOT NULL THEN
    PERFORM public.insert_notification(
      NEW.user_id,
      'BUDGET_ASSIGNED',
      'Presupuesto asignado',
      'Tu ticket tiene un presupuesto asignado',
      NEW.id,
      jsonb_build_object(
        'ticket_number', NEW.ticket_number,
        'assigned_amount', NEW.budget_assigned_amount
      )
    );
  ELSIF OLD.budget_assigned_amount IS DISTINCT FROM NEW.budget_assigned_amount
     AND OLD.budget_assigned_amount IS NOT NULL
     AND NEW.budget_assigned_amount IS NULL THEN
    PERFORM public.insert_notification(
      NEW.user_id,
      'TICKET_MODIFIED',
      'Presupuesto revertido',
      'La asignación de presupuesto de tu ticket fue revertida',
      NEW.id,
      jsonb_build_object('ticket_number', NEW.ticket_number)
    );
  END IF;

  IF (OLD.disbursement_date IS DISTINCT FROM NEW.disbursement_date AND NEW.disbursement_date IS NOT NULL)
     OR (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'COMPLETADO') THEN
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

CREATE OR REPLACE FUNCTION public.notify_on_fund_load()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jefatura_user RECORD;
BEGIN
  FOR jefatura_user IN
    SELECT user_id
    FROM profiles
    WHERE role = 'JEFATURA' AND is_active = true
  LOOP
    PERFORM public.insert_notification(
      jefatura_user.user_id,
      'TICKET_MODIFIED',
      'Disponibilidad de pagos actualizada',
      CASE
        WHEN NEW.movement_type = 'INGRESO' THEN 'Se registró un ingreso de fondos disponibles'
        ELSE 'Se registró un ajuste negativo de fondos disponibles'
      END,
      NULL,
      jsonb_build_object('amount', NEW.amount, 'movement_type', NEW.movement_type)
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER ticket_history_trigger
AFTER INSERT OR UPDATE ON tickets
FOR EACH ROW EXECUTE FUNCTION log_ticket_changes();

CREATE TRIGGER ticket_notifications_trigger
AFTER INSERT OR UPDATE ON tickets
FOR EACH ROW EXECUTE FUNCTION public.notify_on_ticket_changes();

CREATE TRIGGER funds_notifications_trigger
AFTER INSERT ON budget_movements
FOR EACH ROW EXECUTE FUNCTION public.notify_on_fund_load();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;


CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM profiles WHERE user_id = auth.uid();
$$;

DROP FUNCTION IF EXISTS public.get_budget_totals();

CREATE OR REPLACE FUNCTION public.get_budget_totals()
RETURNS TABLE(total_income NUMERIC, total_budgeted NUMERIC, total_disbursed NUMERIC, total_available NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH movement_totals AS (
    SELECT
      COALESCE(SUM(CASE WHEN movement_type = 'INGRESO' THEN amount ELSE 0 END), 0)::NUMERIC AS total_income,
      COALESCE(SUM(CASE WHEN movement_type = 'EGRESO' THEN amount ELSE 0 END), 0)::NUMERIC AS total_expense
    FROM budget_movements
  ),
  budgeted_totals AS (
    SELECT COALESCE(SUM(assigned_amount), 0)::NUMERIC AS total_budgeted
    FROM budgets
    WHERE status = 'ASIGNADO'
  ),
  disbursed_totals AS (
    SELECT COALESCE(SUM(COALESCE(disbursed_amount, assigned_amount)), 0)::NUMERIC AS total_disbursed
    FROM budgets
    WHERE status IN ('DESEMBOLSADO', 'COMPROBADO')
  )
  SELECT
    movement_totals.total_income,
    budgeted_totals.total_budgeted,
    disbursed_totals.total_disbursed,
    (movement_totals.total_income - movement_totals.total_expense - budgeted_totals.total_budgeted - disbursed_totals.total_disbursed)::NUMERIC AS total_available
  FROM movement_totals, budgeted_totals, disbursed_totals;
END;
$$;

CREATE OR REPLACE FUNCTION public.register_budget_funds(p_amount NUMERIC, p_concept TEXT DEFAULT 'Carga de fondos disponibles')
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  movement_record RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para cargar fondos';
  END IF;

  IF public.get_my_role() NOT IN ('COMISION_DIRECTIVA', 'ADMIN') THEN
    RAISE EXCEPTION 'Solo Comisión Directiva o Admin pueden cargar fondos';
  END IF;

  IF p_amount IS NULL OR p_amount = 0 THEN
    RAISE EXCEPTION 'El monto no puede ser cero';
  END IF;

  INSERT INTO budget_movements (movement_type, amount, concept, created_by)
  VALUES (
    CASE WHEN p_amount > 0 THEN 'INGRESO' ELSE 'EGRESO' END,
    ABS(p_amount),
    COALESCE(NULLIF(BTRIM(COALESCE(p_concept, '')), ''), 'Carga de fondos disponibles'),
    auth.uid()
  )
  RETURNING id, movement_type, amount, concept INTO movement_record;

  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes)
  VALUES (
    auth.uid(),
    CASE WHEN movement_record.movement_type = 'INGRESO' THEN 'FUNDS_ADDED' ELSE 'FUNDS_WITHDRAWN' END,
    'budget_movement',
    movement_record.id::TEXT,
    jsonb_build_object(
      'movement_type', movement_record.movement_type,
      'amount', movement_record.amount,
      'concept', movement_record.concept,
      'signed_amount', p_amount
    )
  );
END;
$$;

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

  IF public.get_my_role() NOT IN ('JEFATURA', 'ADMIN') THEN
    RAISE EXCEPTION 'Solo Jefatura o Admin pueden asignar prioridades';
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

CREATE OR REPLACE FUNCTION public.assign_budget_to_ticket(
  p_ticket_id UUID,
  p_amount NUMERIC,
  p_notes TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ticket_record RECORD;
  current_totals RECORD;
  budget_record RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para asignar presupuestos';
  END IF;

  IF public.get_my_role() NOT IN ('COMISION_DIRECTIVA', 'ADMIN') THEN
    RAISE EXCEPTION 'Solo Comisión Directiva o Admin pueden asignar presupuestos';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'El monto a asignar debe ser mayor a cero';
  END IF;

  SELECT id, ticket_number, concept, status, area_id
  INTO ticket_record
  FROM tickets
  WHERE id = p_ticket_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró el ticket solicitado';
  END IF;

  IF ticket_record.status NOT IN ('ACEPTADO', 'PRESUPUESTADO', 'EN_PROCESO') THEN
    RAISE EXCEPTION 'Solo se puede asignar presupuesto a tickets aceptados o en gestión';
  END IF;

  IF EXISTS (SELECT 1 FROM budgets WHERE ticket_id = p_ticket_id) THEN
    RAISE EXCEPTION 'Ese ticket ya tiene un presupuesto asignado';
  END IF;

  SELECT *
  INTO current_totals
  FROM public.get_budget_totals();

  IF COALESCE(current_totals.total_available, 0) < p_amount THEN
    RAISE EXCEPTION 'No hay fondos disponibles suficientes para esa asignación';
  END IF;

  INSERT INTO budgets (ticket_id, assigned_amount, status, assigned_by, voucher_path)
  VALUES (p_ticket_id, p_amount, 'ASIGNADO', auth.uid(), NULLIF(BTRIM(COALESCE(p_notes, '')), ''))
  RETURNING id, assigned_amount, status INTO budget_record;

  UPDATE tickets
  SET budget_assigned_amount = p_amount,
      budget_assignment_date = now(),
      budget_status = 'ASIGNADO',
      status = CASE WHEN status = 'ACEPTADO' THEN 'PRESUPUESTADO' ELSE status END,
      updated_at = now(),
      version = version + 1
  WHERE id = p_ticket_id;

  INSERT INTO ticket_history (ticket_id, user_id, action, field_changed, old_value, new_value, timestamp)
  VALUES (
    p_ticket_id,
    auth.uid(),
    'BUDGET_ASSIGNED',
    'budget_assigned_amount',
    NULL,
    p_amount::TEXT,
    now()
  );

  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes)
  VALUES (
    auth.uid(),
    'BUDGET_ASSIGNED',
    'budget',
    budget_record.id::TEXT,
    jsonb_build_object(
      'ticket_id', p_ticket_id,
      'assigned_amount', budget_record.assigned_amount,
      'status', budget_record.status,
      'notes', NULLIF(BTRIM(COALESCE(p_notes, '')), '')
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.unassign_budget_from_ticket(
  p_ticket_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  budget_record RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para revertir presupuestos';
  END IF;

  IF public.get_my_role() NOT IN ('COMISION_DIRECTIVA', 'ADMIN') THEN
    RAISE EXCEPTION 'Solo Comisión Directiva o Admin pueden revertir presupuestos';
  END IF;

  SELECT *
  INTO budget_record
  FROM budgets
  WHERE ticket_id = p_ticket_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El ticket no tiene presupuesto asignado';
  END IF;

  IF budget_record.status <> 'ASIGNADO' THEN
    RAISE EXCEPTION 'Solo se pueden revertir presupuestos aun no desembolsados';
  END IF;

  DELETE FROM budgets WHERE id = budget_record.id;

  UPDATE tickets
  SET budget_assigned_amount = NULL,
      budget_assignment_date = NULL,
      budget_status = NULL,
      status = CASE WHEN status = 'PRESUPUESTADO' THEN 'ACEPTADO' ELSE status END,
      updated_at = now(),
      version = version + 1
  WHERE id = p_ticket_id;

  INSERT INTO ticket_history (ticket_id, user_id, action, field_changed, old_value, new_value, timestamp)
  VALUES (
    p_ticket_id,
    auth.uid(),
    'BUDGET_UNASSIGNED',
    'budget_assigned_amount',
    budget_record.assigned_amount::TEXT,
    NULLIF(BTRIM(COALESCE(p_reason, '')), ''),
    now()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_budget_disbursement(
  p_budget_id UUID,
  p_disbursed_amount NUMERIC DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  budget_record RECORD;
  final_amount NUMERIC;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para confirmar desembolsos';
  END IF;

  IF public.get_my_role() NOT IN ('COMISION_DIRECTIVA', 'ADMIN') THEN
    RAISE EXCEPTION 'Solo Comisión Directiva o Admin pueden confirmar desembolsos';
  END IF;

  SELECT *
  INTO budget_record
  FROM budgets
  WHERE id = p_budget_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró el presupuesto';
  END IF;

  IF budget_record.status <> 'ASIGNADO' THEN
    RAISE EXCEPTION 'Solo se puede desembolsar un presupuesto asignado';
  END IF;

  final_amount := COALESCE(p_disbursed_amount, budget_record.assigned_amount);

  IF final_amount <= 0 THEN
    RAISE EXCEPTION 'El monto desembolsado debe ser mayor a cero';
  END IF;

  UPDATE budgets
  SET status = 'DESEMBOLSADO',
      disbursement_date = now(),
      disbursed_amount = final_amount,
      voucher_path = COALESCE(NULLIF(BTRIM(COALESCE(p_notes, '')), ''), voucher_path),
      updated_at = now()
  WHERE id = p_budget_id;

  UPDATE tickets
  SET status = 'COMPLETADO',
      budget_status = 'DESEMBOLSADO',
      disbursement_date = now(),
      final_status = 'DESEMBOLSADO',
      updated_at = now(),
      version = version + 1
  WHERE id = budget_record.ticket_id;

  INSERT INTO ticket_history (ticket_id, user_id, action, field_changed, old_value, new_value, timestamp)
  VALUES (
    budget_record.ticket_id,
    auth.uid(),
    'DISBURSEMENT_CONFIRMED',
    'disbursed_amount',
    NULL,
    final_amount::TEXT,
    now()
  );

  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes)
  VALUES (
    auth.uid(),
    'DISBURSEMENT_CONFIRMED',
    'budget',
    budget_record.id::TEXT,
    jsonb_build_object(
      'ticket_id', budget_record.ticket_id,
      'assigned_amount', budget_record.assigned_amount,
      'disbursed_amount', final_amount,
      'notes', NULLIF(BTRIM(COALESCE(p_notes, '')), '')
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.revert_budget_disbursement(
  p_budget_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  budget_record RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para revertir desembolsos';
  END IF;

  IF public.get_my_role() NOT IN ('COMISION_DIRECTIVA', 'ADMIN') THEN
    RAISE EXCEPTION 'Solo Comisión Directiva o Admin pueden revertir desembolsos';
  END IF;

  SELECT *
  INTO budget_record
  FROM budgets
  WHERE id = p_budget_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró el presupuesto';
  END IF;

  IF budget_record.status NOT IN ('DESEMBOLSADO', 'COMPROBADO') THEN
    RAISE EXCEPTION 'Solo se pueden revertir desembolsos confirmados';
  END IF;

  UPDATE budgets
  SET status = 'ASIGNADO',
      disbursement_date = NULL,
      disbursed_amount = NULL,
      updated_at = now()
  WHERE id = p_budget_id;

  UPDATE tickets
  SET status = 'PRESUPUESTADO',
      budget_status = 'ASIGNADO',
      disbursement_date = NULL,
      final_status = NULL,
      updated_at = now(),
      version = version + 1
  WHERE id = budget_record.ticket_id;

  INSERT INTO ticket_history (ticket_id, user_id, action, field_changed, old_value, new_value, timestamp)
  VALUES (
    budget_record.ticket_id,
    auth.uid(),
    'DISBURSEMENT_REVERTED',
    'disbursement_date',
    budget_record.disbursement_date::TEXT,
    NULLIF(BTRIM(COALESCE(p_reason, '')), ''),
    now()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.reopen_ticket_review(
  p_ticket_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ticket_record RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para revertir estados';
  END IF;

  IF public.get_my_role() NOT IN ('JEFATURA', 'COMISION_DIRECTIVA', 'ADMIN') THEN
    RAISE EXCEPTION 'No tienes permisos para revertir este ticket';
  END IF;

  SELECT *
  INTO ticket_record
  FROM tickets
  WHERE id = p_ticket_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró el ticket';
  END IF;

  IF ticket_record.status NOT IN ('ACEPTADO', 'RECHAZADO') THEN
    RAISE EXCEPTION 'Solo se pueden revertir tickets aceptados o denegados';
  END IF;

  UPDATE tickets
  SET status = 'PENDIENTE',
      acceptance_date = NULL,
      rejection_date = NULL,
      rejection_reason = NULL,
      updated_at = now(),
      version = version + 1
  WHERE id = p_ticket_id;

  INSERT INTO ticket_history (ticket_id, user_id, action, field_changed, old_value, new_value, timestamp)
  VALUES (
    p_ticket_id,
    auth.uid(),
    'STATUS_REVERTED',
    'status',
    ticket_record.status::TEXT,
    COALESCE(NULLIF(BTRIM(COALESCE(p_reason, '')), ''), 'PENDIENTE'),
    now()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.suspend_ticket_to_draft(
  p_ticket_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ticket_record RECORD;
  suspension_reason TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para suspender tickets';
  END IF;

  IF public.get_my_role() NOT IN ('COMISION_DIRECTIVA', 'ADMIN') THEN
    RAISE EXCEPTION 'Solo Comisión Directiva o Admin pueden suspender tickets';
  END IF;

  SELECT *
  INTO ticket_record
  FROM tickets
  WHERE id = p_ticket_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró el ticket';
  END IF;

  IF ticket_record.status <> 'ACEPTADO' THEN
    RAISE EXCEPTION 'Solo se pueden suspender tickets en estado aceptado';
  END IF;

  suspension_reason := COALESCE(NULLIF(BTRIM(COALESCE(p_reason, '')), ''), 'Suspension administrativa: vuelve a borrador');

  UPDATE tickets
  SET status = 'BORRADOR',
      acceptance_date = NULL,
      rejection_date = NULL,
      rejection_reason = NULL,
      updated_at = now(),
      version = version + 1
  WHERE id = p_ticket_id;

  INSERT INTO ticket_history (ticket_id, user_id, action, field_changed, old_value, new_value, timestamp)
  VALUES (
    p_ticket_id,
    auth.uid(),
    'TICKET_SUSPENDED',
    'status',
    ticket_record.status::TEXT,
    'BORRADOR',
    now()
  );

  INSERT INTO ticket_history (ticket_id, user_id, action, field_changed, old_value, new_value, timestamp)
  VALUES (
    p_ticket_id,
    auth.uid(),
    'SUSPENSION_REASON',
    'suspension_reason',
    NULL,
    suspension_reason,
    now()
  );

  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes)
  VALUES (
    auth.uid(),
    'TICKET_SUSPENDED',
    'ticket',
    p_ticket_id::TEXT,
    jsonb_build_object(
      'old_status', ticket_record.status,
      'new_status', 'BORRADOR',
      'reason', suspension_reason
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_budget_totals() TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_budget_funds(NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_ticket_priority(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_budget_to_ticket(UUID, NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unassign_budget_from_ticket(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_budget_disbursement(UUID, NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revert_budget_disbursement(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reopen_ticket_review(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.suspend_ticket_to_draft(UUID, TEXT) TO authenticated;

-- Areas: Everyone can read, only ADMIN can modify
CREATE POLICY "areas_read_all" ON areas FOR SELECT
  USING (true);

CREATE POLICY "areas_modify_admin" ON areas FOR INSERT
  WITH CHECK (get_my_role() = 'ADMIN');

CREATE POLICY "areas_update_admin" ON areas FOR UPDATE
  USING (get_my_role() = 'ADMIN')
  WITH CHECK (get_my_role() = 'ADMIN');

-- Profiles: Users can read their own, JEFATURA/COMISION/ADMIN can read all
CREATE POLICY "profiles_read_own" ON profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "profiles_read_hierarchy" ON profiles FOR SELECT
  USING (
    user_id = auth.uid() OR
    get_my_role() IN ('JEFATURA', 'COMISION_DIRECTIVA', 'ADMIN')
  );

CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "profiles_update_manage" ON profiles FOR UPDATE
  USING (get_my_role() IN ('JEFATURA', 'COMISION_DIRECTIVA', 'ADMIN'))
  WITH CHECK (get_my_role() IN ('JEFATURA', 'COMISION_DIRECTIVA', 'ADMIN'));

-- Tickets: Complex visibility rules
CREATE POLICY "tickets_read_own_or_visible" ON tickets FOR SELECT
  USING (
    user_id = auth.uid() OR
    get_my_role() IN ('JEFATURA', 'COMISION_DIRECTIVA', 'ADMIN') OR
    (
      get_my_role() = 'REPRESENTANTE_AREA'
      AND status IN ('ACEPTADO', 'COMPLETADO', 'PRESUPUESTADO', 'EN_PROCESO')
    )
  );

CREATE POLICY "tickets_create" ON tickets FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "tickets_update_owner_draft" ON tickets FOR UPDATE
  USING (
    (user_id = auth.uid() AND status IN ('BORRADOR', 'PENDIENTE')) OR
    (get_my_role() IN ('JEFATURA', 'COMISION_DIRECTIVA', 'ADMIN')
      AND status NOT IN ('ACEPTADO', 'RECHAZADO', 'COMPLETADO', 'CANCELADO'))
  )
  WITH CHECK (
    (user_id = auth.uid() AND status IN ('BORRADOR', 'PENDIENTE')) OR
    get_my_role() IN ('JEFATURA', 'COMISION_DIRECTIVA', 'ADMIN')
  );

-- Ticket History: Read based on ticket visibility
CREATE POLICY "ticket_history_read" ON ticket_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tickets
      WHERE tickets.id = ticket_history.ticket_id
        AND (
          tickets.user_id = auth.uid() OR
          get_my_role() IN ('JEFATURA', 'COMISION_DIRECTIVA', 'ADMIN')
        )
    )
  );

CREATE POLICY "ticket_history_insert" ON ticket_history FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM tickets
      WHERE tickets.id = ticket_history.ticket_id
    )
  );

-- Ticket Comments: Same visibility as tickets
CREATE POLICY "ticket_comments_read" ON ticket_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tickets
      WHERE tickets.id = ticket_comments.ticket_id
      AND (
        tickets.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles
          WHERE user_id = auth.uid()
          AND role IN ('JEFATURA', 'COMISION_DIRECTIVA', 'ADMIN')
        )
      )
    )
  );

CREATE POLICY "ticket_comments_create" ON ticket_comments FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM tickets
      WHERE tickets.id = ticket_comments.ticket_id
    )
  );

-- Attachments: Same visibility as tickets
CREATE POLICY "attachments_read" ON attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tickets
      WHERE tickets.id = attachments.ticket_id
      AND (
        tickets.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles
          WHERE user_id = auth.uid()
          AND role IN ('JEFATURA', 'COMISION_DIRECTIVA', 'ADMIN')
        )
      )
    )
  );

CREATE POLICY "attachments_create" ON attachments FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM tickets
      WHERE tickets.id = attachments.ticket_id
      AND (
        tickets.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles
          WHERE user_id = auth.uid()
          AND role IN ('JEFATURA', 'COMISION_DIRECTIVA', 'ADMIN')
        )
      )
    )
  );

-- Budgets: COMISION_DIRECTIVA and ADMIN can manage
CREATE POLICY "budgets_read_hierarchy" ON budgets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('JEFATURA', 'COMISION_DIRECTIVA', 'ADMIN')
    )
  );

CREATE POLICY "budgets_modify_admin" ON budgets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('COMISION_DIRECTIVA', 'ADMIN')
    )
  );

-- Notifications: Users can only read their own
CREATE POLICY "notifications_read_own" ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Audit Logs: Only ADMIN can read
CREATE POLICY "audit_logs_read_admin" ON audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'ADMIN'
    )
  );

-- Activity Logs: Read own activity, ADMIN can read all
CREATE POLICY "activity_logs_read" ON activity_logs FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'ADMIN'
    )
  );

-- ============================================
-- INITIAL DATA
-- ============================================

-- Insert default areas if they don't exist
INSERT INTO areas (name, code, description) VALUES
  ('Administración', 'ADM', 'Área de administración y gestión'),
  ('Operaciones', 'OPE', 'Área de operaciones'),
  ('Mantenimiento', 'MAN', 'Área de mantenimiento'),
  ('Logística', 'LOG', 'Área de logística')
ON CONFLICT (code) DO NOTHING;
