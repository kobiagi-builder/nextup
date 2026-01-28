-- ============================================
-- Phase 5: Cascade Delete for Storage Objects
-- Automatically delete storage files when artifact is deleted
-- ============================================
-- Migration: 005_cascade_delete_storage_objects
-- Description: Add trigger to delete storage objects when artifact is deleted
-- Author: Claude Opus 4.5
-- Date: 2026-01-28
-- Status: APPLIED

-- ============================================
-- STEP 1: Enable pg_net extension for HTTP calls
-- (Available for future use if needed)
-- ============================================
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ============================================
-- STEP 2: Create function to delete storage objects
-- Uses direct table deletion (more reliable than HTTP API)
-- ============================================
CREATE OR REPLACE FUNCTION delete_artifact_storage_objects()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete all storage objects for this artifact
  -- Objects are stored with path pattern: {artifact_id}/...
  DELETE FROM storage.objects
  WHERE bucket_id = 'artifacts'
    AND name LIKE OLD.id::text || '/%';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  IF deleted_count > 0 THEN
    RAISE NOTICE 'Deleted % storage objects for artifact %', deleted_count, OLD.id;
  END IF;

  RETURN OLD;
END;
$$;

-- ============================================
-- STEP 3: Create trigger
-- Fires BEFORE DELETE to clean up storage first
-- ============================================
DROP TRIGGER IF EXISTS trigger_delete_artifact_storage_objects ON artifacts;

CREATE TRIGGER trigger_delete_artifact_storage_objects
  BEFORE DELETE ON artifacts
  FOR EACH ROW
  EXECUTE FUNCTION delete_artifact_storage_objects();

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify pg_net extension is enabled
-- SELECT extname, extversion FROM pg_extension WHERE extname = 'pg_net';

-- Verify trigger exists
-- SELECT tgname, tgenabled FROM pg_trigger WHERE tgrelid = 'artifacts'::regclass AND tgname = 'trigger_delete_artifact_storage_objects';

-- Verify function exists with correct security
-- SELECT routine_name, security_type FROM information_schema.routines WHERE routine_name = 'delete_artifact_storage_objects';

-- ============================================
-- CASCADE DELETE SUMMARY
-- ============================================
-- When an artifact is deleted, the following happens automatically:
--
-- 1. TRIGGER: delete_artifact_storage_objects (BEFORE DELETE)
--    - Deletes all files in storage.objects where path starts with {artifact_id}/
--
-- 2. FK CASCADE: ai_conversations_artifact_id_fkey
--    - Deletes all ai_conversations where artifact_id matches
--
-- 3. FK CASCADE: artifact_research_artifact_id_fkey
--    - Deletes all artifact_research where artifact_id matches
--
-- 4. The artifact row itself is deleted
-- ============================================
