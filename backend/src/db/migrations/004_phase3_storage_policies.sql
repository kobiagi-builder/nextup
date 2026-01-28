-- ============================================
-- Phase 3: Storage Security Policies
-- No status changes - backward compatible
-- ============================================
-- Migration: 004_phase3_storage_policies
-- Description: Add RLS policies for Supabase storage (artifacts bucket)
-- Author: Claude Sonnet 4.5
-- Date: 2026-01-27

-- Create artifacts storage bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('artifacts', 'artifacts', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Policy 1: Users can upload images to their own artifacts
CREATE POLICY "Users can upload to their artifacts"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'artifacts' AND
  auth.uid() = (
    SELECT user_id FROM public.artifacts
    WHERE id::text = (storage.foldername(name))[1]
  )
);

-- Policy 2: Users can view their own images + public images from published artifacts
CREATE POLICY "Users can view artifact images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'artifacts' AND
  (
    -- Owner can view
    auth.uid() = (
      SELECT user_id FROM public.artifacts
      WHERE id::text = (storage.foldername(name))[1]
    )
    OR
    -- Public read for published artifacts
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.artifacts WHERE status = 'published'
    )
  )
);

-- Policy 3: Users can delete their own images
CREATE POLICY "Users can delete their images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'artifacts' AND
  auth.uid() = (
    SELECT user_id FROM public.artifacts
    WHERE id::text = (storage.foldername(name))[1]
  )
);

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify bucket created
SELECT
  id,
  name,
  public,
  created_at
FROM storage.buckets
WHERE id = 'artifacts';

-- Verify policies created
SELECT
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%artifact%';
