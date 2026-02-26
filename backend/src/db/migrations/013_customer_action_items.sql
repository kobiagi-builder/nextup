-- =============================================================================
-- Migration 013: Customer Action Items
-- =============================================================================
-- Per-customer action items for tracking follow-ups, deliverables, meetings, etc.
-- Follows the same patterns as customer_agreements / customer_receivables / customer_projects.

CREATE TABLE customer_action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'follow_up',
  description TEXT NOT NULL,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'todo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for filtered and sorted queries
CREATE INDEX idx_customer_action_items_customer_status
  ON customer_action_items(customer_id, status);
CREATE INDEX idx_customer_action_items_customer_due_date
  ON customer_action_items(customer_id, due_date);

-- Updated_at trigger (function already exists from migration 010)
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON customer_action_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Row Level Security (function is_customer_owner already exists from migration 010)
ALTER TABLE customer_action_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own customer action items"
  ON customer_action_items
  FOR ALL
  USING (is_customer_owner(customer_id))
  WITH CHECK (is_customer_owner(customer_id));
