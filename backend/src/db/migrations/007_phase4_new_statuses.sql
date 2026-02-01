-- ============================================================================
-- Phase 4 Migration: Add New Artifact Statuses
-- ============================================================================
-- Adds 'foundations' and 'foundations_approval' statuses for Phase 4 workflow
-- Status is stored as VARCHAR with CHECK constraint (not enum type)

-- Step 1: Drop existing constraint
ALTER TABLE artifacts DROP CONSTRAINT IF EXISTS artifacts_status_check;

-- Step 2: Add updated constraint with new statuses
-- New statuses:
--   'foundations' - Writing characteristics analyzed, ready for skeleton
--   'foundations_approval' - Skeleton ready, waiting for user approval
ALTER TABLE artifacts ADD CONSTRAINT artifacts_status_check
  CHECK (status::text = ANY (ARRAY[
    'draft',
    'research',
    'foundations',          -- NEW: After characteristics analysis
    'skeleton',
    'foundations_approval', -- NEW: Waiting for user to approve foundations
    'writing',
    'creating_visuals',
    'ready',
    'published',
    'archived'
  ]::text[]));
