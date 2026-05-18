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
  is_active BOOLEAN DEFAULT true,
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

CREATE TRIGGER ticket_history_trigger
AFTER INSERT OR UPDATE ON tickets
FOR EACH ROW EXECUTE FUNCTION log_ticket_changes();

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

-- Areas: Everyone can read, only ADMIN can modify
CREATE POLICY "areas_read_all" ON areas FOR SELECT
  USING (true);

CREATE POLICY "areas_modify_admin" ON areas FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY "areas_update_admin" ON areas FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Profiles: Users can read their own, JEFATURA/COMISION/ADMIN can read all
CREATE POLICY "profiles_read_own" ON profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "profiles_read_hierarchy" ON profiles FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('JEFATURA', 'COMISION_DIRECTIVA', 'ADMIN')
    )
  );

CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Tickets: Complex visibility rules
CREATE POLICY "tickets_read_own_or_visible" ON tickets FOR SELECT
  USING (
    -- Creator can always see own
    user_id = auth.uid() OR
    -- JEFATURA, COMISION, ADMIN can see all
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('JEFATURA', 'COMISION_DIRECTIVA', 'ADMIN')
    ) OR
    -- REPRESENTANTE can see ACEPTADO and COMPLETADO tickets from others
    (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE user_id = auth.uid()
        AND role = 'REPRESENTANTE_AREA'
      )
      AND status IN ('ACEPTADO', 'COMPLETADO', 'PRESUPUESTADO', 'EN_PROCESO')
    )
  );

CREATE POLICY "tickets_create" ON tickets FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "tickets_update_owner_draft" ON tickets FOR UPDATE
  USING (
    -- Owner can update BORRADOR/PENDIENTE tickets
    (user_id = auth.uid() AND status IN ('BORRADOR', 'PENDIENTE')) OR
    -- JEFATURA/COMISION can update any non-final ticket
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('JEFATURA', 'COMISION_DIRECTIVA', 'ADMIN')
      AND status NOT IN ('ACEPTADO', 'RECHAZADO', 'COMPLETADO', 'CANCELADO')
    )
  )
  WITH CHECK (
    (user_id = auth.uid() AND status IN ('BORRADOR', 'PENDIENTE')) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('JEFATURA', 'COMISION_DIRECTIVA', 'ADMIN')
    )
  );

-- Ticket History: Read based on ticket visibility
CREATE POLICY "ticket_history_read" ON ticket_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tickets
      WHERE tickets.id = ticket_history.ticket_id
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
