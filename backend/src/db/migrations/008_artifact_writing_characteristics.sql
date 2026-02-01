-- ============================================================================
-- Phase 4 Migration: Artifact Writing Characteristics Table
-- ============================================================================
-- Stores AI-analyzed writing characteristics for each artifact
-- Used to guide content generation matching user's writing style

-- Step 1: Create artifact_writing_characteristics table
CREATE TABLE IF NOT EXISTS artifact_writing_characteristics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,

  -- Writing characteristics as flexible JSONB
  -- Structure: { [characteristic_name]: { value, confidence, source, reasoning } }
  characteristics JSONB NOT NULL DEFAULT '{}',

  -- Human-readable summary of the writing style
  summary TEXT,

  -- Recommendations for content generation
  recommendations TEXT,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Step 2: Create indexes
CREATE INDEX IF NOT EXISTS idx_artifact_writing_characteristics_artifact_id
  ON artifact_writing_characteristics(artifact_id);

-- Step 3: Add unique constraint (one characteristics record per artifact)
ALTER TABLE artifact_writing_characteristics
  ADD CONSTRAINT unique_artifact_characteristics UNIQUE (artifact_id);

-- Step 4: Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_artifact_writing_characteristics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_artifact_writing_characteristics_updated_at
  ON artifact_writing_characteristics;

CREATE TRIGGER trigger_update_artifact_writing_characteristics_updated_at
  BEFORE UPDATE ON artifact_writing_characteristics
  FOR EACH ROW
  EXECUTE FUNCTION update_artifact_writing_characteristics_updated_at();

-- Step 5: Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON artifact_writing_characteristics TO authenticated;

-- Step 6: Enable RLS
ALTER TABLE artifact_writing_characteristics ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS policy (users can only access their own artifacts' characteristics)
CREATE POLICY "Users can access their own artifacts' characteristics"
  ON artifact_writing_characteristics
  FOR ALL
  USING (
    artifact_id IN (
      SELECT id FROM artifacts WHERE user_id = auth.uid()
    )
  );
