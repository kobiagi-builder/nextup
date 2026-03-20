-- Add style_excerpts column to artifact_writing_characteristics
-- Stores verbatim excerpts from writing references that demonstrate style patterns
-- Used to bridge cross-model style drift (Claude analyzes → Gemini writes)
ALTER TABLE artifact_writing_characteristics
  ADD COLUMN IF NOT EXISTS style_excerpts TEXT;
