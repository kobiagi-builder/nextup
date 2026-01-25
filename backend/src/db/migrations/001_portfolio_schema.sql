-- =============================================================================
-- Portfolio MVP Database Schema
-- =============================================================================
-- This migration creates all tables required for the Consulting Toolkit Portfolio MVP.
-- Tables: user_context, artifacts, topics, skills, style_examples, ai_conversations, user_preferences
-- All tables include user_id and account_id for future multi-tenancy support.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. User Context (Manual entry for AI personalization)
-- -----------------------------------------------------------------------------
-- Stores user information that AI uses for personalization:
-- about_me, profession, customers, and goals
CREATE TABLE IF NOT EXISTS user_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  account_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  about_me JSONB DEFAULT '{}',      -- { bio, background, years_experience, value_proposition }
  profession JSONB DEFAULT '{}',    -- { expertise_areas, industries, methodologies, certifications }
  customers JSONB DEFAULT '{}',     -- { target_audience, ideal_client, industries_served }
  goals JSONB DEFAULT '{}',         -- { content_goals, business_goals, priorities }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- -----------------------------------------------------------------------------
-- 2. Artifacts (Social Posts, Blogs, Showcases)
-- -----------------------------------------------------------------------------
-- Main content items with type-specific metadata stored in JSONB
CREATE TABLE IF NOT EXISTS artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  account_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  type VARCHAR(50) NOT NULL CHECK (type IN ('social_post', 'blog', 'showcase')),
  status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'ready', 'published', 'archived')),
  title VARCHAR(500),
  content TEXT,
  metadata JSONB DEFAULT '{}',      -- Type-specific fields (platform, hashtags, metrics, etc.)
  tags TEXT[] DEFAULT '{}',
  published_url TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_artifacts_user_id ON artifacts(user_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_type ON artifacts(type);
CREATE INDEX IF NOT EXISTS idx_artifacts_status ON artifacts(status);
CREATE INDEX IF NOT EXISTS idx_artifacts_updated_at ON artifacts(updated_at DESC);

-- -----------------------------------------------------------------------------
-- 3. Topics (Content Ideas Backlog)
-- -----------------------------------------------------------------------------
-- Kanban-style topic backlog with status progression
CREATE TABLE IF NOT EXISTS topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  account_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  title VARCHAR(500) NOT NULL,
  description TEXT,
  source VARCHAR(50) DEFAULT 'manual' CHECK (source IN ('manual', 'ai_suggested')),
  target_artifact_type VARCHAR(50) CHECK (target_artifact_type IN ('social_post', 'blog', 'showcase')),
  status VARCHAR(50) DEFAULT 'idea' CHECK (status IN ('idea', 'researching', 'ready', 'executed')),
  priority INTEGER DEFAULT 0,
  executed_artifact_id UUID REFERENCES artifacts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for topic queries
CREATE INDEX IF NOT EXISTS idx_topics_user_id ON topics(user_id);
CREATE INDEX IF NOT EXISTS idx_topics_status ON topics(status);
CREATE INDEX IF NOT EXISTS idx_topics_created_at ON topics(created_at DESC);

-- -----------------------------------------------------------------------------
-- 4. Skills Matrix
-- -----------------------------------------------------------------------------
-- Track user competencies for content angle suggestions
CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  account_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  name VARCHAR(200) NOT NULL,
  category VARCHAR(100) NOT NULL,   -- Product Strategy, Technical, Leadership, Industry
  proficiency INTEGER CHECK (proficiency >= 1 AND proficiency <= 5),
  years_experience INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skills_user_id ON skills(user_id);
CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category);

-- -----------------------------------------------------------------------------
-- 5. Writing Style Examples
-- -----------------------------------------------------------------------------
-- Store 4-5 writing samples for AI style mimicking
CREATE TABLE IF NOT EXISTS style_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  account_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  label VARCHAR(200) NOT NULL,      -- e.g., "LinkedIn tone", "Technical blog"
  content TEXT NOT NULL,
  analysis JSONB,                   -- AI-generated style analysis
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_style_examples_user_id ON style_examples(user_id);

-- -----------------------------------------------------------------------------
-- 6. AI Conversations (Session Persistence)
-- -----------------------------------------------------------------------------
-- Store chat history per artifact/topic for context retention
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  account_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  artifact_id UUID REFERENCES artifacts(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  messages JSONB NOT NULL DEFAULT '[]',  -- Array of { role, content, tool_calls, etc. }
  pinned BOOLEAN DEFAULT FALSE,          -- Pinned conversations are retained longer
  summary TEXT,                          -- Summarized content after 24h
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_artifact_id ON ai_conversations(artifact_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_topic_id ON ai_conversations(topic_id);

-- -----------------------------------------------------------------------------
-- 7. User Preferences (Theme, Interaction Mode, etc.)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  account_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  theme VARCHAR(20) DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  preferred_interaction_mode VARCHAR(50) DEFAULT 'chat' CHECK (preferred_interaction_mode IN ('chat', 'inline', 'direct')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- -----------------------------------------------------------------------------
-- 8. Updated_at Trigger Function
-- -----------------------------------------------------------------------------
-- Automatically update the updated_at timestamp on row modification
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables
DROP TRIGGER IF EXISTS update_user_context_updated_at ON user_context;
CREATE TRIGGER update_user_context_updated_at
  BEFORE UPDATE ON user_context
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_artifacts_updated_at ON artifacts;
CREATE TRIGGER update_artifacts_updated_at
  BEFORE UPDATE ON artifacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_topics_updated_at ON topics;
CREATE TRIGGER update_topics_updated_at
  BEFORE UPDATE ON topics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_skills_updated_at ON skills;
CREATE TRIGGER update_skills_updated_at
  BEFORE UPDATE ON skills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_style_examples_updated_at ON style_examples;
CREATE TRIGGER update_style_examples_updated_at
  BEFORE UPDATE ON style_examples
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_ai_conversations_updated_at ON ai_conversations;
CREATE TRIGGER update_ai_conversations_updated_at
  BEFORE UPDATE ON ai_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- -----------------------------------------------------------------------------
-- 9. Topic Templates (Optional - for AI research fallback)
-- -----------------------------------------------------------------------------
-- Curated topic templates that AI can suggest based on industry/expertise
CREATE TABLE IF NOT EXISTS topic_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  industries TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  artifact_type VARCHAR(50) CHECK (artifact_type IN ('social_post', 'blog', 'showcase')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_topic_templates_industries ON topic_templates USING GIN(industries);
CREATE INDEX IF NOT EXISTS idx_topic_templates_tags ON topic_templates USING GIN(tags);

-- =============================================================================
-- End of Migration
-- =============================================================================
