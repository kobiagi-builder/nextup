-- Migration: Remove Topics Entity
-- Description: Convert existing topics to draft artifacts and remove topics table
-- Date: 2026-01-24

-- Step 1: Convert existing topics to draft artifacts
INSERT INTO artifacts (
  id,
  user_id,
  account_id,
  type,
  title,
  content,
  status,
  tags,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  user_id,
  account_id,
  COALESCE(target_artifact_type, 'social_post'),  -- Default to social_post if null
  title,
  description,  -- Use description as initial content
  'draft',  -- All converted topics become drafts
  ARRAY[]::TEXT[],  -- Empty tags array
  created_at,
  NOW()
FROM topics;

-- Step 2: Drop foreign key constraints
ALTER TABLE ai_conversations DROP CONSTRAINT IF EXISTS ai_conversations_topic_id_fkey;

-- Step 3: Drop topic_id column from ai_conversations
ALTER TABLE ai_conversations DROP COLUMN IF EXISTS topic_id;

-- Step 4: Drop indexes
DROP INDEX IF EXISTS idx_topics_user_id;
DROP INDEX IF EXISTS idx_topics_status;
DROP INDEX IF EXISTS idx_topics_created_at;

-- Step 5: Drop trigger
DROP TRIGGER IF EXISTS update_topics_updated_at ON topics;

-- Step 6: Drop topics table
DROP TABLE IF EXISTS topics CASCADE;

-- Step 7: Drop topic_templates table (if exists)
DROP TABLE IF EXISTS topic_templates CASCADE;
