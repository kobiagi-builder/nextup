-- ============================================
-- Phase 6: Security - Enable RLS on All Tables
-- Fixes all security advisor warnings/errors
-- ============================================
-- Migration: 006_enable_rls_all_tables
-- Description: Enable RLS and create policies for all public tables
-- Author: Claude Opus 4.5
-- Date: 2026-01-28
-- Status: APPLIED

-- ============================================
-- STEP 1: Fix update_updated_at function search_path
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- ============================================
-- STEP 2: Enable RLS on all tables
-- ============================================
ALTER TABLE public.artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artifact_research ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.style_examples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 3: Create RLS policies for artifacts
-- ============================================
DROP POLICY IF EXISTS "Users can view own artifacts" ON public.artifacts;
DROP POLICY IF EXISTS "Users can insert own artifacts" ON public.artifacts;
DROP POLICY IF EXISTS "Users can update own artifacts" ON public.artifacts;
DROP POLICY IF EXISTS "Users can delete own artifacts" ON public.artifacts;

CREATE POLICY "Users can view own artifacts"
  ON public.artifacts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own artifacts"
  ON public.artifacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own artifacts"
  ON public.artifacts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own artifacts"
  ON public.artifacts FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- STEP 4: Create RLS policies for ai_conversations
-- ============================================
DROP POLICY IF EXISTS "Users can view own conversations" ON public.ai_conversations;
DROP POLICY IF EXISTS "Users can insert own conversations" ON public.ai_conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON public.ai_conversations;
DROP POLICY IF EXISTS "Users can delete own conversations" ON public.ai_conversations;

CREATE POLICY "Users can view own conversations"
  ON public.ai_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations"
  ON public.ai_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
  ON public.ai_conversations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations"
  ON public.ai_conversations FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- STEP 5: Create RLS policies for artifact_research
-- (Links to artifacts table for user ownership)
-- ============================================
DROP POLICY IF EXISTS "Users can view research for own artifacts" ON public.artifact_research;
DROP POLICY IF EXISTS "Users can insert research for own artifacts" ON public.artifact_research;
DROP POLICY IF EXISTS "Users can update research for own artifacts" ON public.artifact_research;
DROP POLICY IF EXISTS "Users can delete research for own artifacts" ON public.artifact_research;

CREATE POLICY "Users can view research for own artifacts"
  ON public.artifact_research FOR SELECT
  USING (
    artifact_id IN (
      SELECT id FROM public.artifacts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert research for own artifacts"
  ON public.artifact_research FOR INSERT
  WITH CHECK (
    artifact_id IN (
      SELECT id FROM public.artifacts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update research for own artifacts"
  ON public.artifact_research FOR UPDATE
  USING (
    artifact_id IN (
      SELECT id FROM public.artifacts WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    artifact_id IN (
      SELECT id FROM public.artifacts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete research for own artifacts"
  ON public.artifact_research FOR DELETE
  USING (
    artifact_id IN (
      SELECT id FROM public.artifacts WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- STEP 6: Create RLS policies for user_context
-- ============================================
DROP POLICY IF EXISTS "Users can view own context" ON public.user_context;
DROP POLICY IF EXISTS "Users can insert own context" ON public.user_context;
DROP POLICY IF EXISTS "Users can update own context" ON public.user_context;
DROP POLICY IF EXISTS "Users can delete own context" ON public.user_context;

CREATE POLICY "Users can view own context"
  ON public.user_context FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own context"
  ON public.user_context FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own context"
  ON public.user_context FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own context"
  ON public.user_context FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- STEP 7: Create RLS policies for skills
-- ============================================
DROP POLICY IF EXISTS "Users can view own skills" ON public.skills;
DROP POLICY IF EXISTS "Users can insert own skills" ON public.skills;
DROP POLICY IF EXISTS "Users can update own skills" ON public.skills;
DROP POLICY IF EXISTS "Users can delete own skills" ON public.skills;

CREATE POLICY "Users can view own skills"
  ON public.skills FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own skills"
  ON public.skills FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own skills"
  ON public.skills FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own skills"
  ON public.skills FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- STEP 8: Create RLS policies for style_examples
-- ============================================
DROP POLICY IF EXISTS "Users can view own style examples" ON public.style_examples;
DROP POLICY IF EXISTS "Users can insert own style examples" ON public.style_examples;
DROP POLICY IF EXISTS "Users can update own style examples" ON public.style_examples;
DROP POLICY IF EXISTS "Users can delete own style examples" ON public.style_examples;

CREATE POLICY "Users can view own style examples"
  ON public.style_examples FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own style examples"
  ON public.style_examples FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own style examples"
  ON public.style_examples FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own style examples"
  ON public.style_examples FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- STEP 9: Create RLS policies for user_preferences
-- ============================================
DROP POLICY IF EXISTS "Users can view own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can delete own preferences" ON public.user_preferences;

CREATE POLICY "Users can view own preferences"
  ON public.user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON public.user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON public.user_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences"
  ON public.user_preferences FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- STEP 10: Grant service_role bypass for backend operations
-- ============================================
-- Service role bypasses RLS by default, but explicitly grant for clarity
GRANT ALL ON public.artifacts TO service_role;
GRANT ALL ON public.ai_conversations TO service_role;
GRANT ALL ON public.artifact_research TO service_role;
GRANT ALL ON public.user_context TO service_role;
GRANT ALL ON public.skills TO service_role;
GRANT ALL ON public.style_examples TO service_role;
GRANT ALL ON public.user_preferences TO service_role;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Check RLS status:
-- SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- Count policies per table:
-- SELECT tablename, COUNT(*) FROM pg_policies WHERE schemaname = 'public' GROUP BY tablename;

-- List all policies:
-- SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, cmd;
