-- Migration: Add visuals_metadata column to artifacts table
-- Date: 2026-01-26
-- Purpose: Support visual generation metadata storage for content creation agent

-- Add visuals_metadata column to store visual generation metadata
ALTER TABLE artifacts
ADD COLUMN IF NOT EXISTS visuals_metadata JSONB DEFAULT '{}';

-- Add comment describing the column
COMMENT ON COLUMN artifacts.visuals_metadata IS 'Metadata for generated visuals: traceId, visualsDetected, visualsGenerated, placeholders, mvpStub, completedAt';

-- Create index for querying visuals metadata
CREATE INDEX IF NOT EXISTS idx_artifacts_visuals_metadata
ON artifacts USING GIN (visuals_metadata);
