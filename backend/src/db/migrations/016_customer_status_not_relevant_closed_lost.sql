-- =============================================================================
-- Add 'not_relevant' and 'closed_lost' to customer status CHECK constraint
-- =============================================================================
-- 'not_relevant' was used in code but never migrated to DB constraint.
-- 'closed_lost' is a new status for deals that didn't convert.

ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_status_check;
ALTER TABLE customers ADD CONSTRAINT customers_status_check
  CHECK (status IN ('lead', 'prospect', 'negotiation', 'live', 'on_hold', 'archive', 'not_relevant', 'closed_lost'));
