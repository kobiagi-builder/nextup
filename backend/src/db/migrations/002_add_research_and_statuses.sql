-- ============================================================================
-- Phase 1 Migration: Research System + New Artifact Statuses
-- ============================================================================

-- Step 1: Create artifact_research table
CREATE TABLE IF NOT EXISTS artifact_research (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('reddit', 'linkedin', 'quora', 'medium', 'substack', 'user_provided')),
  source_name TEXT NOT NULL,
  source_url TEXT,
  excerpt TEXT NOT NULL,
  relevance_score DECIMAL(3,2) CHECK (relevance_score >= 0 AND relevance_score <= 1),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Step 2: Create indexes for performance
CREATE INDEX idx_artifact_research_artifact_id ON artifact_research(artifact_id);
CREATE INDEX idx_artifact_research_source_type ON artifact_research(source_type);
CREATE INDEX idx_artifact_research_relevance_score ON artifact_research(relevance_score DESC);

-- Step 3: Add new artifact statuses (Phase 1)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'artifact_status') THEN
    ALTER TYPE artifact_status ADD VALUE IF NOT EXISTS 'researching';
    ALTER TYPE artifact_status ADD VALUE IF NOT EXISTS 'skeleton_ready';
    ALTER TYPE artifact_status ADD VALUE IF NOT EXISTS 'skeleton_approved';
  END IF;
END$$;

-- Step 4: Add tone field to artifacts table
ALTER TABLE artifacts ADD COLUMN IF NOT EXISTS tone TEXT CHECK (tone IN (
  'formal', 'casual', 'professional', 'conversational',
  'technical', 'friendly', 'authoritative', 'humorous'
));

-- Step 5: Set default tone
ALTER TABLE artifacts ALTER COLUMN tone SET DEFAULT 'professional';

-- Step 6: Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON artifact_research TO authenticated;
