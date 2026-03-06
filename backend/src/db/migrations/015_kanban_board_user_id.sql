-- =============================================================================
-- Migration 015: Kanban Board — user_id, nullable customer_id, compound RLS
-- =============================================================================
-- Adds user_id for direct ownership (cross-customer queries), makes customer_id
-- nullable for general action items, updates RLS with compound policy.

-- Step 1: Add user_id with DEFAULT auth.uid()
ALTER TABLE customer_action_items
  ADD COLUMN user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id);

-- Step 2: Backfill from customers table
UPDATE customer_action_items ai
SET user_id = c.user_id
FROM customers c
WHERE ai.customer_id = c.id;

-- Step 2b: Safety — remove orphans
DELETE FROM customer_action_items WHERE user_id IS NULL;

-- Step 3: Make NOT NULL
ALTER TABLE customer_action_items
  ALTER COLUMN user_id SET NOT NULL;

-- Step 4: Make customer_id nullable
ALTER TABLE customer_action_items
  ALTER COLUMN customer_id DROP NOT NULL;

-- Step 5: Add composite index
CREATE INDEX idx_customer_action_items_user_status
  ON customer_action_items(user_id, status);

-- Step 6: Drop old RLS, create compound policy
DROP POLICY IF EXISTS "Users can manage their own customer action items" ON customer_action_items;

CREATE POLICY "Users can manage their own action items"
  ON customer_action_items
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND (
      customer_id IS NULL
      OR is_customer_owner(customer_id)
    )
  );

-- =============================================================================
-- Feature Flag: action_items_kanban
-- =============================================================================

INSERT INTO feature_flags (name, description, default_state)
VALUES (
  'action_items_kanban',
  'Enables the Action Items Kanban Board screen and sidebar navigation',
  false
);

-- Enable for all accounts that have customer_management enabled
INSERT INTO customer_features (uid, feature_id, flag_state)
SELECT cf.uid, ff_new.id, true
FROM customer_features cf
JOIN feature_flags ff_existing ON cf.feature_id = ff_existing.id
JOIN feature_flags ff_new ON ff_new.name = 'action_items_kanban'
WHERE ff_existing.name = 'customer_management'
  AND cf.flag_state = true
ON CONFLICT (uid, feature_id) DO NOTHING;
