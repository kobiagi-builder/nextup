-- Customers Management Platform - Phase 1 Schema
-- Creates all 7 customer tables, indexes, RLS policies, triggers, and helper functions

-- =============================================================================
-- Tables
-- =============================================================================

-- Customers table (soft delete via deleted_at)
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'lead'
    CHECK (status IN ('lead', 'prospect', 'negotiation', 'live', 'on_hold', 'archive')),
  info JSONB DEFAULT '{}'::jsonb,
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer agreements (override_status for terminated/suspended)
CREATE TABLE customer_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  scope TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'retainer',
  start_date DATE,
  end_date DATE,
  pricing JSONB DEFAULT '{}'::jsonb,
  override_status TEXT DEFAULT NULL CHECK (override_status IN ('terminated', 'suspended')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer receivables
CREATE TABLE customer_receivables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('invoice', 'payment')),
  amount NUMERIC(12,2) NOT NULL,
  date DATE NOT NULL,
  status TEXT DEFAULT 'sent',
  description TEXT,
  reference TEXT,
  linked_invoice_id UUID REFERENCES customer_receivables(id) ON DELETE SET NULL,
  linked_agreement_id UUID REFERENCES customer_agreements(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer projects (product workflows)
CREATE TABLE customer_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'planning'
    CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'archived')),
  agreement_id UUID REFERENCES customer_agreements(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer artifacts (project deliverables)
CREATE TABLE customer_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES customer_projects(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'custom',
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'in_progress', 'review', 'final', 'archived')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer events (interaction log)
CREATE TABLE customer_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL DEFAULT 'update',
  title TEXT NOT NULL,
  description TEXT,
  participants TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,
  event_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer chat messages (schema-only in Phase 1, activated in Phase 4)
CREATE TABLE customer_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  agent_type TEXT CHECK (agent_type IN ('customer_mgmt', 'product_mgmt')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- Indexes
-- =============================================================================

CREATE INDEX idx_customers_user_id ON customers(user_id);
CREATE INDEX idx_customers_user_id_id ON customers(user_id, id);  -- Composite for RLS helper
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_deleted_at ON customers(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_customer_agreements_customer_id ON customer_agreements(customer_id);
CREATE INDEX idx_customer_receivables_customer_id ON customer_receivables(customer_id);
CREATE INDEX idx_customer_receivables_type ON customer_receivables(type);
CREATE INDEX idx_customer_projects_customer_id ON customer_projects(customer_id);
CREATE INDEX idx_customer_artifacts_project_id ON customer_artifacts(project_id);
CREATE INDEX idx_customer_artifacts_customer_id ON customer_artifacts(customer_id);
CREATE INDEX idx_customer_events_customer_id ON customer_events(customer_id);
CREATE INDEX idx_customer_events_event_date ON customer_events(event_date DESC);
CREATE INDEX idx_customer_chat_messages_customer_id ON customer_chat_messages(customer_id);

-- =============================================================================
-- Triggers
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER customer_agreements_updated_at BEFORE UPDATE ON customer_agreements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER customer_receivables_updated_at BEFORE UPDATE ON customer_receivables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER customer_projects_updated_at BEFORE UPDATE ON customer_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER customer_artifacts_updated_at BEFORE UPDATE ON customer_artifacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- Row Level Security
-- =============================================================================

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_receivables ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_chat_messages ENABLE ROW LEVEL SECURITY;

-- Helper function for performant child-table ownership checks
-- Uses the composite index (user_id, id) for O(1) lookup
CREATE OR REPLACE FUNCTION is_customer_owner(cid UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM customers
    WHERE id = cid AND user_id = auth.uid() AND deleted_at IS NULL
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Customers: direct user_id check + soft delete filter
CREATE POLICY customers_select ON customers FOR SELECT
  USING (user_id = auth.uid() AND deleted_at IS NULL);
CREATE POLICY customers_insert ON customers FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY customers_update ON customers FOR UPDATE
  USING (user_id = auth.uid() AND deleted_at IS NULL);
CREATE POLICY customers_delete ON customers FOR DELETE
  USING (user_id = auth.uid());

-- Agreements
CREATE POLICY agreements_select ON customer_agreements FOR SELECT
  USING (is_customer_owner(customer_id));
CREATE POLICY agreements_insert ON customer_agreements FOR INSERT
  WITH CHECK (is_customer_owner(customer_id));
CREATE POLICY agreements_update ON customer_agreements FOR UPDATE
  USING (is_customer_owner(customer_id));
CREATE POLICY agreements_delete ON customer_agreements FOR DELETE
  USING (is_customer_owner(customer_id));

-- Receivables
CREATE POLICY receivables_select ON customer_receivables FOR SELECT
  USING (is_customer_owner(customer_id));
CREATE POLICY receivables_insert ON customer_receivables FOR INSERT
  WITH CHECK (is_customer_owner(customer_id));
CREATE POLICY receivables_update ON customer_receivables FOR UPDATE
  USING (is_customer_owner(customer_id));
CREATE POLICY receivables_delete ON customer_receivables FOR DELETE
  USING (is_customer_owner(customer_id));

-- Projects
CREATE POLICY projects_select ON customer_projects FOR SELECT
  USING (is_customer_owner(customer_id));
CREATE POLICY projects_insert ON customer_projects FOR INSERT
  WITH CHECK (is_customer_owner(customer_id));
CREATE POLICY projects_update ON customer_projects FOR UPDATE
  USING (is_customer_owner(customer_id));
CREATE POLICY projects_delete ON customer_projects FOR DELETE
  USING (is_customer_owner(customer_id));

-- Artifacts
CREATE POLICY artifacts_select ON customer_artifacts FOR SELECT
  USING (is_customer_owner(customer_id));
CREATE POLICY artifacts_insert ON customer_artifacts FOR INSERT
  WITH CHECK (is_customer_owner(customer_id));
CREATE POLICY artifacts_update ON customer_artifacts FOR UPDATE
  USING (is_customer_owner(customer_id));
CREATE POLICY artifacts_delete ON customer_artifacts FOR DELETE
  USING (is_customer_owner(customer_id));

-- Events
CREATE POLICY events_select ON customer_events FOR SELECT
  USING (is_customer_owner(customer_id));
CREATE POLICY events_insert ON customer_events FOR INSERT
  WITH CHECK (is_customer_owner(customer_id));
CREATE POLICY events_update ON customer_events FOR UPDATE
  USING (is_customer_owner(customer_id));
CREATE POLICY events_delete ON customer_events FOR DELETE
  USING (is_customer_owner(customer_id));

-- Chat Messages
CREATE POLICY chat_messages_select ON customer_chat_messages FOR SELECT
  USING (is_customer_owner(customer_id));
CREATE POLICY chat_messages_insert ON customer_chat_messages FOR INSERT
  WITH CHECK (is_customer_owner(customer_id));
CREATE POLICY chat_messages_update ON customer_chat_messages FOR UPDATE
  USING (is_customer_owner(customer_id));
CREATE POLICY chat_messages_delete ON customer_chat_messages FOR DELETE
  USING (is_customer_owner(customer_id));

-- =============================================================================
-- Service Role Access (bypasses RLS for backend operations)
-- =============================================================================

GRANT ALL ON customers TO service_role;
GRANT ALL ON customer_agreements TO service_role;
GRANT ALL ON customer_receivables TO service_role;
GRANT ALL ON customer_projects TO service_role;
GRANT ALL ON customer_artifacts TO service_role;
GRANT ALL ON customer_events TO service_role;
GRANT ALL ON customer_chat_messages TO service_role;
