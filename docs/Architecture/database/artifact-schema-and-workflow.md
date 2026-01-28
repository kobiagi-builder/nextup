# Database Artifact Schema and Workflow

**Version:** 1.0.0
**Last Updated:** 2026-01-26
**Status:** Complete

## Overview

The artifacts table stores all user-generated content (social posts, blogs, showcases) with a 7-status linear workflow. The schema supports AI-driven content creation with research storage, tone customization, and type-specific metadata in JSONB fields.

**Key Features:**
- **7-Status Linear Workflow** - draft → research → skeleton → writing → creating_visuals → ready → published
- **Type System** - social_post, blog, showcase with extensible metadata
- **Research Storage** - Separate artifact_research table for multi-source research
- **Tone Customization** - 8 tone options for content generation
- **Indexes** - Optimized for common query patterns

---

## Artifacts Table Schema

### Core Fields

```sql
CREATE TABLE IF NOT EXISTS artifacts (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Multi-Tenancy (MVP: Default values, Future: Actual user IDs)
  user_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  account_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',

  -- Content Type (3 types)
  type VARCHAR(50) NOT NULL CHECK (type IN ('social_post', 'blog', 'showcase')),

  -- Workflow Status (7 statuses)
  status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',
    'research',
    'skeleton',
    'writing',
    'creating_visuals',
    'ready',
    'published'
  )),

  -- Content Fields
  title VARCHAR(500),                 -- Artifact title (required)
  content TEXT,                       -- Markdown or HTML content
  metadata JSONB DEFAULT '{}',        -- Type-specific fields (platform, hashtags, etc.)
  tags TEXT[] DEFAULT '{}',           -- User-defined tags
  tone TEXT CHECK (tone IN (
    'formal',
    'casual',
    'professional',
    'conversational',
    'technical',
    'friendly',
    'authoritative',
    'humorous'
  )) DEFAULT 'professional',          -- Tone for AI content generation

  -- Publishing
  published_url TEXT,                 -- URL where content was published
  published_at TIMESTAMPTZ,           -- Timestamp of publishing

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Indexes

```sql
-- Optimize common query patterns
CREATE INDEX IF NOT EXISTS idx_artifacts_user_id ON artifacts(user_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_type ON artifacts(type);
CREATE INDEX IF NOT EXISTS idx_artifacts_status ON artifacts(status);
CREATE INDEX IF NOT EXISTS idx_artifacts_updated_at ON artifacts(updated_at DESC);
```

**Query Patterns Optimized:**
- Fetch all artifacts for a user: `WHERE user_id = ?`
- Filter by type: `WHERE type = ?`
- Filter by status: `WHERE status = ?`
- Sort by recency: `ORDER BY updated_at DESC`

---

## 7-Status Linear Workflow

### Status Definitions

```mermaid
stateDiagram-v2
    [*] --> draft
    draft --> research: conductDeepResearch
    research --> skeleton: generateContentSkeleton
    skeleton --> writing: writeFullContent (start)
    writing --> creating_visuals: writeFullContent (complete)
    creating_visuals --> ready: generateContentVisuals
    creating_visuals --> ready: applyHumanityCheck
    ready --> published: Manual publish
    published --> ready: User edits content
    ready --> [*]
    published --> [*]

    note right of draft
        Editable
        User can edit content
    end note

    note right of research
        Locked
        AI is researching
    end note

    note right of skeleton
        Locked
        AI creating structure
    end note

    note right of writing
        Locked
        AI writing content
    end note

    note right of creating_visuals
        Locked
        AI generating images
    end note

    note right of ready
        Editable
        Content ready to publish
    end note

    note right of published
        Editable
        Auto-transition to ready on edit
    end note
```

| Status | Description | Editor State | User Actions | AI Operations |
|--------|-------------|--------------|--------------|---------------|
| **draft** | Initial state after creation | Editable | Edit content, Research | conductDeepResearch |
| **research** | AI researching topic from multiple sources | Locked | Wait | Tavily API queries |
| **skeleton** | AI creating H1 title + H2 section headings | Locked | Wait | Claude Sonnet 4 generation |
| **writing** | AI writing full content for each section | Locked | Wait | Gemini 2.0 Flash generation |
| **creating_visuals** | AI generating cover image/visuals | Locked | Wait, Humanize | DALL-E 3 generation |
| **ready** | Content ready to publish | Editable | Edit, Humanize, Publish | applyHumanityCheck (optional) |
| **published** | Content published to platform | Editable | Edit (→ ready) | None |

### Processing States

States where editor is locked (user cannot edit content):

```typescript
const PROCESSING_STATES: ArtifactStatus[] = [
  'research',
  'skeleton',
  'writing',
  'creating_visuals'
]

function isProcessingState(status: ArtifactStatus): boolean {
  return PROCESSING_STATES.includes(status)
}
```

### Editable States

States where editor is unlocked (user can edit content):

```typescript
const EDITABLE_STATES: ArtifactStatus[] = [
  'draft',
  'ready',
  'published'
]

function isEditableState(status: ArtifactStatus): boolean {
  return EDITABLE_STATES.includes(status)
}
```

---

## Status Transitions

### Valid Transitions Matrix

| From Status | To Status | Trigger | Tool/Service |
|------------|-----------|---------|--------------|
| `draft` | `research` | User clicks "Create Content" | conductDeepResearch |
| `research` | `skeleton` | Research completes | generateContentSkeleton |
| `skeleton` | `writing` | Skeleton generation starts | writeFullContent (start) |
| `writing` | `creating_visuals` | Content writing completes | writeFullContent (complete) |
| `creating_visuals` | `ready` | Visuals generated | generateContentVisuals |
| `creating_visuals` | `ready` | Humanity check applied | applyHumanityCheck |
| `ready` | `published` | User clicks "Publish" | Manual action |
| `published` | `ready` | User edits content | Automatic (auto-transition) |

### Invalid Transitions

```typescript
// Examples of invalid transitions (enforced by backend):

// Cannot skip research step
draft → skeleton  ❌ Must research first

// Cannot skip skeleton step
research → writing  ❌ Must create skeleton first

// Cannot write before skeleton
draft → writing  ❌ Must research + skeleton first

// Cannot humanize before visuals
writing → ready  ❌ Must complete visuals first

// Cannot go backwards (except published → ready)
ready → skeleton  ❌ One-way flow
```

### Auto-Transition: Published → Ready

```typescript
// Backend: When user edits published content
if (artifact.status === 'published' && userEditedContent) {
  await updateArtifact({
    id: artifact.id,
    status: 'ready'  // Auto-transition
  })
}
```

**Why?**
- Editing published content makes it "unpublished" (needs re-publishing)
- User can make multiple edits before republishing
- Clear distinction between "published" (final) and "ready" (editable)

---

## Artifact Types

### Type Enum

```typescript
type ArtifactType = 'social_post' | 'blog' | 'showcase'
```

### Type-Specific Metadata (JSONB)

Each artifact type stores additional fields in the `metadata` JSONB column:

#### social_post

```json
{
  "platform": "linkedin" | "twitter" | "facebook" | "instagram",
  "hashtags": ["#productmanagement", "#leadership"],
  "character_count": 1500,
  "engagement_metrics": {
    "likes": 42,
    "comments": 8,
    "shares": 12
  }
}
```

#### blog

```json
{
  "platform": "medium" | "substack" | "custom",
  "seo_title": "SEO-optimized title",
  "seo_description": "Meta description for SEO",
  "featured_image_url": "https://...",
  "reading_time_minutes": 8,
  "canonical_url": "https://..."
}
```

#### showcase

```json
{
  "project_type": "mobile_app" | "web_app" | "product_launch" | "case_study",
  "client": "Company Name",
  "industry": "SaaS",
  "outcomes": {
    "metric_1": "40% increase in user engagement",
    "metric_2": "2x faster onboarding"
  },
  "tech_stack": ["React", "Node.js", "PostgreSQL"]
}
```

### Querying Type-Specific Fields

```sql
-- Get all LinkedIn posts
SELECT * FROM artifacts
WHERE type = 'social_post'
  AND metadata->>'platform' = 'linkedin';

-- Get showcases for specific industry
SELECT * FROM artifacts
WHERE type = 'showcase'
  AND metadata->>'industry' = 'SaaS';

-- Get blogs with high reading time
SELECT * FROM artifacts
WHERE type = 'blog'
  AND (metadata->>'reading_time_minutes')::INTEGER > 10;
```

---

## Artifact Research Table

### Schema

```sql
CREATE TABLE IF NOT EXISTS artifact_research (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN (
    'reddit',
    'linkedin',
    'quora',
    'medium',
    'substack',
    'user_provided'
  )),
  source_name TEXT NOT NULL,
  source_url TEXT,
  excerpt TEXT NOT NULL,
  relevance_score DECIMAL(3,2) CHECK (relevance_score >= 0 AND relevance_score <= 1),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_artifact_research_artifact_id ON artifact_research(artifact_id);
CREATE INDEX idx_artifact_research_source_type ON artifact_research(source_type);
CREATE INDEX idx_artifact_research_relevance_score ON artifact_research(relevance_score DESC);
```

### Research Sources

| Source Type | Description | API |
|------------|-------------|-----|
| `reddit` | Reddit posts/comments | Tavily API |
| `linkedin` | LinkedIn articles/posts | Tavily API |
| `quora` | Quora questions/answers | Tavily API |
| `medium` | Medium articles | Tavily API |
| `substack` | Substack newsletters | Tavily API |
| `user_provided` | Manual research entry | User input |

### Example Research Entry

```sql
INSERT INTO artifact_research (artifact_id, source_type, source_name, source_url, excerpt, relevance_score)
VALUES (
  'abc-123',
  'reddit',
  'r/ProductManagement',
  'https://reddit.com/r/ProductManagement/comments/xyz',
  'Product managers should focus on outcome metrics, not output...',
  0.92
);
```

### Fetching Research for Artifact

```sql
-- Get all research for artifact, sorted by relevance
SELECT * FROM artifact_research
WHERE artifact_id = 'abc-123'
ORDER BY relevance_score DESC;

-- Get research grouped by source type
SELECT source_type, COUNT(*) as count
FROM artifact_research
WHERE artifact_id = 'abc-123'
GROUP BY source_type;
```

---

## Tone Options

### Available Tones

```typescript
type ToneOption =
  | 'formal'          // Formal business tone
  | 'casual'          // Relaxed, everyday language
  | 'professional'    // Balanced professional tone (default)
  | 'conversational'  // Natural, dialogue-style
  | 'technical'       // Technical jargon, precise
  | 'friendly'        // Warm, approachable
  | 'authoritative'   // Expert, confident
  | 'humorous'        // Witty, playful
```

### Tone Usage

```typescript
// Backend: Content Agent uses tone in AI prompts
const prompt = `
Write a ${artifact.tone} blog post about "${artifact.title}".

Tone Guidelines:
- ${getToneGuidelines(artifact.tone)}

Content:
${content}
`

function getToneGuidelines(tone: ToneOption): string {
  const guidelines = {
    formal: 'Use formal language, avoid contractions, maintain professional distance',
    casual: 'Use relaxed language, contractions allowed, friendly and approachable',
    professional: 'Balanced professional tone, clear and concise',
    conversational: 'Natural dialogue style, as if speaking to a colleague',
    technical: 'Precise terminology, technical accuracy, detailed explanations',
    friendly: 'Warm and inviting, use "you" pronouns, build rapport',
    authoritative: 'Confident expert voice, cite sources, demonstrate expertise',
    humorous: 'Witty and playful, appropriate humor, engaging'
  }
  return guidelines[tone]
}
```

### Querying by Tone

```sql
-- Get all artifacts with technical tone
SELECT * FROM artifacts WHERE tone = 'technical';

-- Distribution of tones
SELECT tone, COUNT(*) as count
FROM artifacts
GROUP BY tone
ORDER BY count DESC;
```

---

## Database Triggers

### Updated_at Trigger

```sql
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on artifacts table
CREATE TRIGGER update_artifacts_updated_at
  BEFORE UPDATE ON artifacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Purpose:**
- Automatically updates `updated_at` timestamp on every UPDATE
- No manual timestamp management needed
- Accurate audit trail

---

## Row Level Security (RLS)

### RLS Policies (Future Implementation)

```sql
-- Enable RLS on artifacts table
ALTER TABLE artifacts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own artifacts
CREATE POLICY artifacts_user_isolation ON artifacts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can only insert their own artifacts
CREATE POLICY artifacts_user_insert ON artifacts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only update their own artifacts
CREATE POLICY artifacts_user_update ON artifacts
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can only delete their own artifacts
CREATE POLICY artifacts_user_delete ON artifacts
  FOR DELETE
  USING (auth.uid() = user_id);
```

**Current State (MVP):**
- RLS not yet enabled
- All artifacts use default `user_id = '00000000-0000-0000-0000-000000000001'`
- Backend enforces ownership validation via middleware

**Future State:**
- RLS enabled for multi-tenant security
- Database-level isolation between users
- Automatic user_id injection via Supabase auth

---

## Query Examples

### Common Queries

**Fetch all artifacts for user:**
```sql
SELECT * FROM artifacts
WHERE user_id = '00000000-0000-0000-0000-000000000001'
ORDER BY updated_at DESC;
```

**Fetch draft artifacts:**
```sql
SELECT * FROM artifacts
WHERE status = 'draft'
  AND user_id = '00000000-0000-0000-0000-000000000001'
ORDER BY created_at DESC;
```

**Fetch published blogs:**
```sql
SELECT * FROM artifacts
WHERE type = 'blog'
  AND status = 'published'
ORDER BY published_at DESC NULLS LAST;
```

**Fetch artifacts with research:**
```sql
SELECT
  a.*,
  COUNT(r.id) as research_count
FROM artifacts a
LEFT JOIN artifact_research r ON r.artifact_id = a.id
WHERE a.user_id = '00000000-0000-0000-0000-000000000001'
GROUP BY a.id
HAVING COUNT(r.id) > 0
ORDER BY a.updated_at DESC;
```

**Full-text search:**
```sql
SELECT * FROM artifacts
WHERE (
  title ILIKE '%product management%'
  OR content ILIKE '%product management%'
)
ORDER BY updated_at DESC;
```

---

## Performance Optimization

### Index Usage

```sql
-- Explain query plan to verify index usage
EXPLAIN ANALYZE
SELECT * FROM artifacts
WHERE user_id = '00000000-0000-0000-0000-000000000001'
  AND status = 'draft'
ORDER BY updated_at DESC;

-- Expected: Index Scan using idx_artifacts_user_id
```

### JSONB Indexes

For frequent metadata queries, add GIN indexes:

```sql
-- Index metadata for faster JSONB queries
CREATE INDEX idx_artifacts_metadata ON artifacts USING GIN (metadata);

-- Query using GIN index
SELECT * FROM artifacts
WHERE metadata @> '{"platform": "linkedin"}';
```

### Query Statistics

```sql
-- Table statistics
SELECT
  schemaname,
  tablename,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes,
  n_live_tup as live_rows
FROM pg_stat_user_tables
WHERE tablename = 'artifacts';

-- Index usage statistics
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE tablename = 'artifacts';
```

---

## Migration History

### 001_portfolio_schema.sql

Created initial artifacts table with 5 statuses:
- `draft`, `in_progress`, `ready`, `published`, `archived`

### 002_add_research_and_statuses.sql

**Added:**
- `artifact_research` table for multi-source research
- New statuses: `researching`, `skeleton_ready`, `skeleton_approved`
- `tone` field (8 tone options)

### 002_remove_topics.sql (Cleanup)

**Removed:**
- Old topic-based workflow tables

### 003_add_visuals_metadata.sql

**Added:**
- Visuals metadata fields for DALL-E 3 integration

---

## Database Constraints

### Check Constraints

```sql
-- Type constraint (3 valid types)
CHECK (type IN ('social_post', 'blog', 'showcase'))

-- Status constraint (7 valid statuses)
CHECK (status IN (
  'draft',
  'research',
  'skeleton',
  'writing',
  'creating_visuals',
  'ready',
  'published'
))

-- Tone constraint (8 valid tones)
CHECK (tone IN (
  'formal',
  'casual',
  'professional',
  'conversational',
  'technical',
  'friendly',
  'authoritative',
  'humorous'
))

-- Relevance score constraint (0.0 to 1.0)
CHECK (relevance_score >= 0 AND relevance_score <= 1)
```

### Foreign Key Constraints

```sql
-- Research references artifact (cascade on delete)
artifact_research.artifact_id REFERENCES artifacts(id) ON DELETE CASCADE
```

**Cascade Behavior:**
- When artifact is deleted, all related research entries are automatically deleted
- Maintains referential integrity

---

## Backup and Recovery

### Manual Backup

```bash
# Backup artifacts table to SQL file
pg_dump -h localhost -U postgres -d consultant_helper -t artifacts > artifacts_backup.sql

# Backup entire database
pg_dump -h localhost -U postgres -d consultant_helper > full_backup.sql
```

### Restore from Backup

```bash
# Restore artifacts table
psql -h localhost -U postgres -d consultant_helper < artifacts_backup.sql

# Restore entire database
psql -h localhost -U postgres -d consultant_helper < full_backup.sql
```

### Supabase Backups

Supabase provides automatic daily backups:
- Point-in-time recovery (PITR)
- 7-day retention (Free Plan)
- 30-day retention (Pro Plan)

---

## Related Documentation

- [7-status-workflow-specification.md](../../artifact-statuses/7-status-workflow-specification.md) - Complete workflow specification
- [content-agent-architecture.md](../backend/content-agent-architecture.md) - How Content Agent interacts with database
- [screen-context-specification.md](../../api/screen-context-specification.md) - How frontend sends artifact metadata

---

**Version History:**
- **1.0.0** (2026-01-26) - Initial database schema and workflow documentation
