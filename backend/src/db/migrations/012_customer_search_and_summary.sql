-- =============================================================================
-- Phase 5: Customer Search, Summary, and Dashboard Stats
-- =============================================================================

-- 1. Full-text search vector (generated column on customers)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS search_vector TSVECTOR
  GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(name, '') || ' ' ||
      coalesce(info->>'vertical', '') || ' ' ||
      coalesce(info->>'about', '') || ' ' ||
      coalesce(info->>'persona', ''))
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_customers_search ON customers USING GIN (search_vector);

-- 2. Customer list summary RPC
-- Returns all customer columns plus aggregated summary data in a single query.
-- Uses dynamic SQL for sort to avoid CASE expression limitations with ORDER BY.
CREATE OR REPLACE FUNCTION get_customer_list_summary(
  p_status TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_sort TEXT DEFAULT 'updated_at'
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  name TEXT,
  status TEXT,
  info JSONB,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  active_agreements_count BIGINT,
  outstanding_balance NUMERIC(12,2),
  active_projects_count BIGINT,
  last_activity TIMESTAMPTZ
) AS $$
BEGIN
  -- Validate sort to prevent injection
  IF p_sort NOT IN ('name', 'status', 'created_at', 'updated_at', 'last_activity', 'outstanding_balance') THEN
    p_sort := 'updated_at';
  END IF;

  RETURN QUERY EXECUTE format(
    'SELECT
      c.id, c.user_id, c.name, c.status, c.info,
      c.deleted_at, c.created_at, c.updated_at,
      (SELECT COUNT(*) FROM customer_agreements ca
       WHERE ca.customer_id = c.id
       AND ca.override_status IS NULL
       AND (ca.end_date IS NULL OR ca.end_date >= CURRENT_DATE))::BIGINT AS active_agreements_count,
      (
        COALESCE(
          (SELECT SUM(cr.amount) FROM customer_receivables cr
           WHERE cr.customer_id = c.id AND cr.type = ''invoice'' AND cr.status != ''cancelled''),
          0
        ) -
        COALESCE(
          (SELECT SUM(cr.amount) FROM customer_receivables cr
           WHERE cr.customer_id = c.id AND cr.type = ''payment''),
          0
        )
      )::NUMERIC(12,2) AS outstanding_balance,
      (SELECT COUNT(*) FROM customer_projects cp
       WHERE cp.customer_id = c.id AND cp.status IN (''planning'', ''active''))::BIGINT AS active_projects_count,
      (SELECT MAX(ce.event_date) FROM customer_events ce
       WHERE ce.customer_id = c.id) AS last_activity
    FROM customers c
    WHERE c.user_id = auth.uid()
      AND c.deleted_at IS NULL
      AND ($1 IS NULL OR c.status = $1)
      AND ($2 IS NULL OR c.search_vector @@ websearch_to_tsquery(''english'', $2))
    ORDER BY %s',
    CASE p_sort
      WHEN 'name' THEN 'c.name ASC'
      WHEN 'status' THEN 'c.status ASC, c.updated_at DESC'
      WHEN 'created_at' THEN 'c.created_at DESC'
      WHEN 'last_activity' THEN '(SELECT MAX(ce2.event_date) FROM customer_events ce2 WHERE ce2.customer_id = c.id) DESC NULLS LAST'
      WHEN 'outstanding_balance' THEN '(
        COALESCE((SELECT SUM(cr2.amount) FROM customer_receivables cr2 WHERE cr2.customer_id = c.id AND cr2.type = ''invoice'' AND cr2.status NOT IN (''cancelled'', ''paid'')), 0) -
        COALESCE((SELECT SUM(cr2.amount) FROM customer_receivables cr2 WHERE cr2.customer_id = c.id AND cr2.type = ''payment''), 0)
      ) DESC'
      ELSE 'c.updated_at DESC'
    END
  ) USING p_status, p_search;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- 3. Dashboard stats RPC
CREATE OR REPLACE FUNCTION get_customer_dashboard_stats()
RETURNS TABLE (
  total_customers BIGINT,
  active_customers BIGINT,
  total_outstanding NUMERIC(12,2),
  expiring_agreements BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM customers WHERE user_id = auth.uid() AND deleted_at IS NULL)::BIGINT,
    (SELECT COUNT(*) FROM customers WHERE user_id = auth.uid() AND deleted_at IS NULL AND status = 'live')::BIGINT,
    COALESCE(
      (SELECT
        SUM(
          COALESCE((SELECT SUM(cr.amount) FROM customer_receivables cr WHERE cr.customer_id = c.id AND cr.type = 'invoice' AND cr.status != 'cancelled'), 0) -
          COALESCE((SELECT SUM(cr.amount) FROM customer_receivables cr WHERE cr.customer_id = c.id AND cr.type = 'payment'), 0)
        )
       FROM customers c
       WHERE c.user_id = auth.uid() AND c.deleted_at IS NULL),
      0
    )::NUMERIC(12,2),
    (SELECT COUNT(*) FROM customer_agreements ca
     JOIN customers c ON c.id = ca.customer_id
     WHERE c.user_id = auth.uid() AND c.deleted_at IS NULL
     AND ca.override_status IS NULL
     AND ca.end_date IS NOT NULL
     AND ca.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days')::BIGINT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- 4. GIN index for cross-module reverse lookup (portfolio artifacts linking to customer artifacts)
CREATE INDEX IF NOT EXISTS idx_artifacts_linked_customer_artifacts
  ON artifacts USING GIN ((metadata->'linkedCustomerArtifacts') jsonb_path_ops);
