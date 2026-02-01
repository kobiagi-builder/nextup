-- ============================================================================
-- Phase 4 Migration: User Writing Examples Table
-- ============================================================================
-- Stores user-provided writing samples for style analysis
-- Minimum 500 words required for meaningful analysis

-- Step 1: Create source_type enum for writing examples
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'writing_example_source_type') THEN
    CREATE TYPE writing_example_source_type AS ENUM (
      'pasted',       -- User pasted text directly
      'file_upload',  -- Uploaded from file
      'artifact',     -- Imported from existing artifact
      'url'           -- Imported from URL
    );
  END IF;
END$$;

-- Step 2: Create user_writing_examples table
CREATE TABLE IF NOT EXISTS user_writing_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Example metadata
  name TEXT NOT NULL,
  source_type writing_example_source_type NOT NULL DEFAULT 'pasted',

  -- Content (must be at least 500 words)
  content TEXT NOT NULL,
  word_count INTEGER NOT NULL CHECK (word_count >= 500),

  -- Source reference (artifact_id or URL if applicable)
  source_reference TEXT,

  -- AI-analyzed characteristics from this example
  -- Structure: { [characteristic_name]: { value, confidence, reasoning } }
  analyzed_characteristics JSONB DEFAULT '{}',

  -- Whether this example is actively used for analysis
  is_active BOOLEAN DEFAULT TRUE,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Step 3: Create indexes
CREATE INDEX IF NOT EXISTS idx_user_writing_examples_user_id
  ON user_writing_examples(user_id);

CREATE INDEX IF NOT EXISTS idx_user_writing_examples_active
  ON user_writing_examples(user_id, is_active)
  WHERE is_active = TRUE;

-- Step 4: Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_user_writing_examples_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_writing_examples_updated_at
  ON user_writing_examples;

CREATE TRIGGER trigger_update_user_writing_examples_updated_at
  BEFORE UPDATE ON user_writing_examples
  FOR EACH ROW
  EXECUTE FUNCTION update_user_writing_examples_updated_at();

-- Step 5: Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON user_writing_examples TO authenticated;

-- Step 6: Enable RLS
ALTER TABLE user_writing_examples ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS policy (users can only access their own examples)
CREATE POLICY "Users can access their own writing examples"
  ON user_writing_examples
  FOR ALL
  USING (user_id = auth.uid());
