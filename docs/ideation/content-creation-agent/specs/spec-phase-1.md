# Implementation Spec: Phase 1 - Research & Skeleton Generation

**Phase**: 1 of 4
**Status**: Ready for Implementation
**Dependencies**: None (foundational phase)
**Estimated Effort**: 3-4 weeks

---

## Overview

This specification details the technical implementation for Phase 1, covering:
1. Two-button content creation flow (AI suggestions + manual creation)
2. Deep research system with intelligent source matching
3. LLM-generated content skeletons
4. Research area UI with real-time updates
5. Tone selection system (integrated into rich text editor toolbox)
6. Artifact page layout (vertical stack: collapsible research + editor)
7. Skeleton approval workflow (Approve Skeleton button)

**Spec Revision Notes:**
- Layout changed from 60/40 horizontal to vertical stack with collapsible sections
- ToneSelector moved from header to rich text editor toolbox
- Manual research entry deferred (see Known Gaps document)

---

## Database Changes

### Migration: `002_add_research_and_statuses.sql`

**Location**: `backend/src/db/migrations/002_add_research_and_statuses.sql`

```sql
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
-- Check if artifact_status type exists and update it
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'artifact_status') THEN
    -- Add new statuses if they don't exist
    ALTER TYPE artifact_status ADD VALUE IF NOT EXISTS 'researching';
    ALTER TYPE artifact_status ADD VALUE IF NOT EXISTS 'skeleton_ready';
    ALTER TYPE artifact_status ADD VALUE IF NOT EXISTS 'skeleton_approved';
  END IF;
END$$;

-- Step 4: Add tone field to artifacts table (optional metadata)
ALTER TABLE artifacts ADD COLUMN IF NOT EXISTS tone TEXT CHECK (tone IN (
  'formal', 'casual', 'professional', 'conversational',
  'technical', 'friendly', 'authoritative', 'humorous'
));

-- Step 5: Set default tone to 'professional'
ALTER TABLE artifacts ALTER COLUMN tone SET DEFAULT 'professional';

-- Step 6: Grant permissions (adjust role names as needed)
GRANT SELECT, INSERT, UPDATE, DELETE ON artifact_research TO authenticated;
GRANT USAGE ON SEQUENCE artifact_research_id_seq TO authenticated;
```

**Validation Commands**:
```bash
# Apply migration
mcp__supabase__apply_migration({
  project_id: "ohwubfmipnpguunryopl",
  name: "002_add_research_and_statuses",
  query: "<SQL above>"
})

# Verify tables
mcp__supabase__list_tables({ project_id: "ohwubfmipnpguunryopl" })
# Expected: artifact_research table exists

# Verify indexes
mcp__supabase__execute_sql({
  project_id: "ohwubfmipnpguunryopl",
  query: "SELECT indexname FROM pg_indexes WHERE tablename = 'artifact_research'"
})
# Expected: 3 indexes (artifact_id, source_type, relevance_score)

# Check security advisors
mcp__supabase__get_advisors({
  project_id: "ohwubfmipnpguunryopl",
  type: "security"
})
# Verify RLS policies are recommended if needed
```

---

## Backend Implementation

### 1. AI Tool: `conductDeepResearch`

**Location**: `backend/src/services/ai/tools/researchTools.ts` (NEW FILE)

```typescript
import { tool } from 'ai';
import { z } from 'zod';
import { supabase } from '../../lib/supabaseClient.js';
import { LoggerService } from '../LoggerService.js';

/**
 * Conducts deep research on artifact topic using multiple sources
 * Returns research results with sources, excerpts, and relevance scores
 */
export const conductDeepResearch = tool({
  description: `Conduct deep research on a topic using multiple sources (Reddit, LinkedIn, Quora, Medium, Substack).
Returns structured research results with sources, excerpts, and relevance scores.

Source selection strategy:
- Technical topics → Medium, Substack (priority)
- Professional insights → LinkedIn, Medium
- Community sentiment → Reddit, Quora
- Consumer experiences → Reddit, Quora
- Industry trends → LinkedIn, Medium, Substack

Minimum 5 sources required, relevance score > 0.6`,

  parameters: z.object({
    artifactId: z.string().uuid().describe('Artifact ID to research'),
    topic: z.string().min(3).describe('Research topic (from artifact title/description)'),
    artifactType: z.enum(['blog', 'social_post', 'showcase']).describe('Artifact type for context'),
  }),

  execute: async ({ artifactId, topic, artifactType }) => {
    try {
      LoggerService.info('conductDeepResearch', 'Starting research', {
        artifactId,
        topic,
        artifactType,
      });

      // Determine source priority based on topic characteristics
      const sourcePriority = determineSourcePriority(topic, artifactType);

      // Query multiple sources in parallel
      const researchPromises = sourcePriority.map(source =>
        querySource(source, topic)
      );

      const allResults = await Promise.allSettled(researchPromises);

      // Filter successful results and extract data
      const researchResults = allResults
        .filter(result => result.status === 'fulfilled')
        .flatMap(result => result.value)
        .filter(result => result.relevance_score > 0.6)
        .sort((a, b) => b.relevance_score - a.relevance_score)
        .slice(0, 20); // Max 20 sources

      if (researchResults.length < 5) {
        LoggerService.warn('conductDeepResearch', 'Insufficient sources found', {
          artifactId,
          foundCount: researchResults.length,
        });

        return {
          success: false,
          error: 'Insufficient sources found',
          minRequired: 5,
          found: researchResults.length,
          message: 'Could not find enough relevant sources. Please provide manual research data or adjust the topic.',
        };
      }

      // Store research results in database
      const { data: storedResults, error: dbError } = await supabase
        .from('artifact_research')
        .insert(
          researchResults.map(result => ({
            artifact_id: artifactId,
            source_type: result.source_type,
            source_name: result.source_name,
            source_url: result.source_url,
            excerpt: result.excerpt,
            relevance_score: result.relevance_score,
          }))
        )
        .select();

      if (dbError) {
        LoggerService.error('conductDeepResearch', dbError, {
          artifactId,
          sourceCode: 'database_insert',
        });

        return {
          success: false,
          error: 'Failed to store research results',
          message: dbError.message,
        };
      }

      LoggerService.info('conductDeepResearch', 'Research completed', {
        artifactId,
        sourceCount: storedResults.length,
      });

      return {
        success: true,
        sourceCount: storedResults.length,
        sources: storedResults,
        message: `Found ${storedResults.length} relevant sources`,
      };
    } catch (error) {
      LoggerService.error('conductDeepResearch', error instanceof Error ? error : new Error(String(error)), {
        artifactId,
        sourceCode: 'research_execution',
      });

      return {
        success: false,
        error: 'Research execution failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});

/**
 * Determine source priority based on topic and artifact type
 */
function determineSourcePriority(topic: string, artifactType: string): string[] {
  const topicLower = topic.toLowerCase();

  // Technical topics
  if (
    topicLower.includes('technical') ||
    topicLower.includes('code') ||
    topicLower.includes('programming') ||
    topicLower.includes('software')
  ) {
    return ['medium', 'substack', 'reddit', 'linkedin', 'quora'];
  }

  // Professional/business topics
  if (
    topicLower.includes('business') ||
    topicLower.includes('strategy') ||
    topicLower.includes('management') ||
    topicLower.includes('leadership')
  ) {
    return ['linkedin', 'medium', 'substack', 'quora', 'reddit'];
  }

  // Community/consumer topics
  if (
    topicLower.includes('experience') ||
    topicLower.includes('review') ||
    topicLower.includes('community') ||
    topicLower.includes('discussion')
  ) {
    return ['reddit', 'quora', 'medium', 'linkedin', 'substack'];
  }

  // Default: balanced approach
  return ['medium', 'linkedin', 'reddit', 'quora', 'substack'];
}

/**
 * Query specific source for research data
 * NOTE: This is a placeholder. Actual implementation requires web search integration
 * (e.g., Perplexity, Tavily, or custom scraping with Firecrawl/Jina)
 */
async function querySource(source: string, topic: string): Promise<any[]> {
  // TODO: Implement actual web search integration
  // For now, return mock data for testing
  LoggerService.warn('querySource', 'Using mock data - web search not implemented', {
    source,
    topic,
  });

  return [
    {
      source_type: source,
      source_name: `Mock ${source} result`,
      source_url: `https://${source}.example.com/mock-article`,
      excerpt: `Mock excerpt about ${topic} from ${source}`,
      relevance_score: 0.75,
    },
  ];
}
```

**Testing**:
```bash
# Test research tool with Claude
curl -X POST http://localhost:3001/api/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "message": "Research this topic: AI in product strategy",
    "artifactId": "artifact-uuid-here",
    "artifactType": "blog"
  }'

# Verify results in database
mcp__supabase__execute_sql({
  project_id: "ohwubfmipnpguunryopl",
  query: "SELECT * FROM artifact_research WHERE artifact_id = 'artifact-uuid-here'"
})
```

---

### 2. AI Tool: `generateContentSkeleton`

**Location**: `backend/src/services/ai/tools/skeletonTools.ts` (NEW FILE)

```typescript
import { tool } from 'ai';
import { z } from 'zod';
import { supabase } from '../../lib/supabaseClient.js';
import { LoggerService } from '../LoggerService.js';

/**
 * Generates LLM-created content skeleton based on artifact type and research
 */
export const generateContentSkeleton = tool({
  description: `Generate a content skeleton in Markdown format based on artifact type and research data.

Skeleton structure by type:
- Blog: Title (H1), Hook/Preface, 3-5 H2 Sections with bullet points, Conclusion, CTA
- Social Post: Hook, 2-3 Main Points, CTA, Hashtag suggestions
- Showcase: Project Overview, Problem Statement, Solution Approach, Results/Impact, Key Learnings

Requirements:
- Include placeholders: [Write hook here], [Expand on this point], etc.
- Reference research sources where relevant: "According to [Source]..."
- Match selected tone of voice
- Valid Markdown format
- Max 2000 characters (skeleton only, not full content)`,

  parameters: z.object({
    artifactId: z.string().uuid().describe('Artifact ID'),
    artifactType: z.enum(['blog', 'social_post', 'showcase']).describe('Artifact type'),
    title: z.string().min(3).describe('Artifact title'),
    tone: z.enum([
      'formal',
      'casual',
      'professional',
      'conversational',
      'technical',
      'friendly',
      'authoritative',
      'humorous',
    ]).describe('Tone of voice'),
    researchExcerpts: z.array(z.object({
      source: z.string(),
      excerpt: z.string(),
    })).describe('Research excerpts to reference'),
  }),

  execute: async ({ artifactId, artifactType, title, tone, researchExcerpts }) => {
    try {
      LoggerService.info('generateContentSkeleton', 'Generating skeleton', {
        artifactId,
        artifactType,
        tone,
      });

      // Build skeleton generation prompt based on artifact type
      const prompt = buildSkeletonPrompt(artifactType, title, tone, researchExcerpts);

      // Call Claude to generate skeleton
      // NOTE: This requires Claude API integration (not OpenAI)
      // Using Vercel AI SDK with Anthropic provider
      const { generateText } = await import('ai');
      const { anthropic } = await import('@ai-sdk/anthropic');

      const { text: skeleton } = await generateText({
        model: anthropic('claude-sonnet-4-5'),
        prompt,
        maxTokens: 2000,
      });

      // Validate skeleton
      if (!skeleton || skeleton.length > 2000) {
        throw new Error('Invalid skeleton generated');
      }

      // Update artifact with skeleton content
      const { data: updatedArtifact, error: dbError } = await supabase
        .from('artifacts')
        .update({
          content: skeleton,
          status: 'skeleton_ready',
        })
        .eq('id', artifactId)
        .select()
        .single();

      if (dbError) {
        LoggerService.error('generateContentSkeleton', dbError, {
          artifactId,
          sourceCode: 'database_update',
        });

        return {
          success: false,
          error: 'Failed to update artifact',
          message: dbError.message,
        };
      }

      LoggerService.info('generateContentSkeleton', 'Skeleton generated successfully', {
        artifactId,
        skeletonLength: skeleton.length,
      });

      return {
        success: true,
        skeleton,
        artifactId,
        status: 'skeleton_ready',
        message: 'Skeleton generated and saved',
      };
    } catch (error) {
      LoggerService.error('generateContentSkeleton', error instanceof Error ? error : new Error(String(error)), {
        artifactId,
        sourceCode: 'skeleton_generation',
      });

      return {
        success: false,
        error: 'Skeleton generation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});

/**
 * Build skeleton generation prompt based on artifact type
 */
function buildSkeletonPrompt(
  artifactType: string,
  title: string,
  tone: string,
  researchExcerpts: Array<{ source: string; excerpt: string }>
): string {
  const toneModifiers = {
    formal: 'Use academic language, passive voice where appropriate, complex sentence structures.',
    casual: 'Use contractions, simple everyday language, active voice, short sentences.',
    professional: 'Be clear and direct, use industry terminology appropriately, maintain confidence.',
    conversational: 'Write in first-person, ask rhetorical questions, use "you" to address reader.',
    technical: 'Use precise terminology, include detailed explanations, assume technical background.',
    friendly: 'Use warm and encouraging language, include personal anecdotes, be supportive.',
    authoritative: 'Make strong declarative statements, position as expert, use evidence-based claims.',
    humorous: 'Include light jokes, use wordplay, add entertaining examples.',
  };

  const researchContext = researchExcerpts
    .map(r => `Source: ${r.source}\nExcerpt: ${r.excerpt}`)
    .join('\n\n');

  if (artifactType === 'blog') {
    return `You are creating a blog post skeleton.

Title: ${title}
Tone: ${tone} - ${toneModifiers[tone as keyof typeof toneModifiers]}

Research findings:
${researchContext}

Generate a blog post skeleton in Markdown format with:
1. Title (H1): ${title}
2. Hook/Preface: [Write compelling hook here]
3. 3-5 H2 Sections with:
   - Section heading
   - 2-3 bullet points as placeholders
   - Research reference where relevant: "According to [Source]..."
4. Conclusion: [Write conclusion here]
5. CTA: [Write call-to-action here]

Use placeholders like [Write X here] for content that will be filled later.
Reference research sources naturally.
Match the ${tone} tone.
Max 2000 characters.`;
  }

  if (artifactType === 'social_post') {
    return `You are creating a social media post skeleton.

Title/Topic: ${title}
Tone: ${tone} - ${toneModifiers[tone as keyof typeof toneModifiers]}

Research findings:
${researchContext}

Generate a social post skeleton in Markdown format with:
1. Hook: [Write attention-grabbing hook here]
2. Main Point 1: [Expand on this point]
3. Main Point 2: [Expand on this point]
4. Main Point 3 (optional): [Expand on this point]
5. CTA: [Write call-to-action here]
6. Hashtags: Suggest 5-10 relevant hashtags

Use placeholders like [Write X here].
Reference research if relevant.
Match the ${tone} tone.
Keep concise (social media format).
Max 2000 characters.`;
  }

  if (artifactType === 'showcase') {
    return `You are creating a case study/showcase skeleton.

Project: ${title}
Tone: ${tone} - ${toneModifiers[tone as keyof typeof toneModifiers]}

Research findings:
${researchContext}

Generate a showcase skeleton in Markdown format with:
1. Project Overview: [Write overview here]
2. Problem Statement:
   - [Describe problem here]
   - [Impact/urgency]
3. Solution Approach:
   - [Method 1]
   - [Method 2]
   - [Method 3]
4. Results/Impact:
   - [Quantifiable result 1]
   - [Quantifiable result 2]
   - [Qualitative impact]
5. Key Learnings: [Write learnings here]

Use placeholders like [Write X here].
Reference research where relevant.
Match the ${tone} tone.
Max 2000 characters.`;
  }

  throw new Error(`Unknown artifact type: ${artifactType}`);
}
```

**Testing**:
```bash
# Test skeleton generation
curl -X POST http://localhost:3001/api/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "message": "Generate skeleton for artifact",
    "artifactId": "artifact-uuid-here",
    "artifactType": "blog",
    "title": "AI in Product Strategy",
    "tone": "professional"
  }'

# Verify artifact updated
mcp__supabase__execute_sql({
  project_id: "ohwubfmipnpguunryopl",
  query: "SELECT content, status FROM artifacts WHERE id = 'artifact-uuid-here'"
})
# Expected: status = 'skeleton_ready', content contains skeleton
```

---

### 3. Register New Tools in AIService

**Location**: `backend/src/services/ai/AIService.ts`

```typescript
// Add imports
import { conductDeepResearch } from './tools/researchTools.js';
import { generateContentSkeleton } from './tools/skeletonTools.js';

// Update AVAILABLE_TOOLS object
const AVAILABLE_TOOLS = {
  // ... existing tools

  // NEW: Research & Skeleton tools
  conductDeepResearch,
  generateContentSkeleton,
};
```

---

### 4. Update System Prompts

**Location**: `backend/src/services/ai/prompts/systemPrompts.ts`

```typescript
// Add to system prompt
export function getBaseSystemPrompt(userContext: UserContext): string {
  return `You are a helpful AI assistant for the Product Consultant Helper application.

... [existing prompt content]

## Content Creation Workflow

When users request content creation, follow this workflow:

1. **Research Phase**: Use conductDeepResearch tool
   - Query multiple sources (Reddit, LinkedIn, Quora, Medium, Substack)
   - Prioritize sources based on topic characteristics
   - Minimum 5 relevant sources required (relevance > 0.6)
   - Store results with source references

2. **Skeleton Generation**: Use generateContentSkeleton tool
   - Generate structure based on artifact type (blog/social_post/showcase)
   - Include placeholders for content
   - Reference research sources naturally
   - Match user's selected tone of voice

3. **User Approval**: Present skeleton for review
   - User can approve, provide feedback, or edit manually
   - Wait for explicit approval before proceeding

Example research query:
"Research this topic: AI in product strategy for a blog post with professional tone"

Example skeleton generation:
"Generate a blog skeleton about AI in product strategy with professional tone, using the research data from artifact [ID]"

## Research Source Selection

Match sources to topic characteristics:
- Technical topics → Medium, Substack (priority)
- Professional insights → LinkedIn, Medium
- Community sentiment → Reddit, Quora
- Consumer experiences → Reddit, Quora
- Industry trends → LinkedIn, Medium, Substack

## Tone Application

Available tones:
- Formal: Academic language, passive voice, complex sentences
- Casual: Contractions, simple language, active voice
- Professional: Clear and direct, industry terminology, confident
- Conversational: First-person, questions, friendly
- Technical: Precise terminology, detailed explanations
- Friendly: Warm language, personal anecdotes, supportive
- Authoritative: Strong statements, expert positioning
- Humorous: Light jokes, wordplay, entertaining examples

Apply tone consistently in skeleton generation and content writing.`;
}
```

---

## Frontend Implementation

### 1. Update ArtifactSuggestionCard Component

**Location**: `frontend/src/features/portfolio/components/chat/ArtifactSuggestionCard.tsx`

```tsx
import { useState } from 'react';
import { FileText, MessageSquare, Trophy, Loader2, Check, Edit, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { ArtifactType } from '../../types/portfolio';

export interface ArtifactSuggestion {
  id: string;
  title: string;
  description: string;
  type: ArtifactType;
  rationale: string;
  tags?: string[];
}

export interface ArtifactSuggestionCardProps {
  suggestion: ArtifactSuggestion;
  isAdded?: boolean;
  onAddAndEdit: (suggestion: ArtifactSuggestion) => Promise<void>;
  onCreateContent: (suggestion: ArtifactSuggestion) => Promise<void>;
}

const ARTIFACT_TYPE_CONFIG = {
  social_post: { icon: MessageSquare, label: 'Social Post', color: 'text-blue-500' },
  blog: { icon: FileText, label: 'Blog Post', color: 'text-purple-500' },
  showcase: { icon: Trophy, label: 'Case Study', color: 'text-amber-500' },
};

export function ArtifactSuggestionCard({
  suggestion,
  isAdded = false,
  onAddAndEdit,
  onCreateContent,
}: ArtifactSuggestionCardProps) {
  const [isAddingAndEditing, setIsAddingAndEditing] = useState(false);
  const [isCreatingContent, setIsCreatingContent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = ARTIFACT_TYPE_CONFIG[suggestion.type];
  const Icon = config.icon;

  const handleAddAndEdit = async () => {
    if (isAdded || isAddingAndEditing || isCreatingContent) return;

    setIsAddingAndEditing(true);
    setError(null);

    try {
      await onAddAndEdit(suggestion);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add artifact');
    } finally {
      setIsAddingAndEditing(false);
    }
  };

  const handleCreateContent = async () => {
    if (isAdded || isAddingAndEditing || isCreatingContent) return;

    setIsCreatingContent(true);
    setError(null);

    try {
      await onCreateContent(suggestion);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create content');
    } finally {
      setIsCreatingContent(false);
    }
  };

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      {/* Header: Type badge + Button group */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className={cn('flex items-center gap-2 text-sm font-medium', config.color)}>
          <Icon className="h-4 w-4" />
          <span>{config.label}</span>
        </div>

        {/* NEW: Two-button layout */}
        <div className="flex flex-col gap-1.5 w-full sm:flex-row sm:gap-2 sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddAndEdit}
            disabled={isAdded || isAddingAndEditing || isCreatingContent}
            className="gap-2"
          >
            {isAddingAndEditing ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Adding...
              </>
            ) : isAdded ? (
              <>
                <Check className="h-3 w-3" />
                Added
              </>
            ) : (
              <>
                <Edit className="h-3 w-3" />
                Add & Edit
              </>
            )}
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleCreateContent}
            disabled={isAdded || isAddingAndEditing || isCreatingContent}
            className="gap-2"
          >
            {isCreatingContent ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3" />
                Create Content
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Title */}
      <h4 className="font-semibold text-base mb-2">{suggestion.title}</h4>

      {/* Description */}
      <p className="text-sm text-muted-foreground mb-3">
        {suggestion.description}
      </p>

      {/* Rationale */}
      <div className="text-xs text-muted-foreground italic border-l-2 border-muted pl-3">
        {suggestion.rationale}
      </div>

      {/* Tags */}
      {suggestion.tags && suggestion.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {suggestion.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-3 text-xs text-destructive bg-destructive/10 p-2 rounded">
          {error}
        </div>
      )}
    </Card>
  );
}

export default ArtifactSuggestionCard;
```

---

### 2. Create ResearchArea Component

**Location**: `frontend/src/features/portfolio/components/artifact/ResearchArea.tsx` (NEW FILE)

```tsx
import { useState } from 'react';
import { Search, ChevronRight, ChevronDown, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ArtifactResearch } from '../../types/portfolio';

export interface ResearchAreaProps {
  artifactId: string;
  research: ArtifactResearch[];
  status: 'empty' | 'loading' | 'loaded' | 'error';
  error?: string;
  onRetry?: () => void;
  onManualEntry?: () => void;
}

export function ResearchArea({
  artifactId,
  research,
  status,
  error,
  onRetry,
  onManualEntry,
}: ResearchAreaProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Group research by source type
  const groupedSources = research.reduce((acc, item) => {
    if (!acc[item.source_type]) {
      acc[item.source_type] = [];
    }
    acc[item.source_type].push(item);
    return acc;
  }, {} as Record<string, ArtifactResearch[]>);

  return (
    <Card className={cn(
      'h-full flex flex-col rounded-none border-0 border-l transition-all duration-300',
      isCollapsed && 'w-12'
    )}>
      {/* Header with collapse toggle */}
      <div className="flex items-center justify-between border-b px-4 py-3 bg-background">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Research Sources</h3>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="ml-auto"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Content area */}
      {!isCollapsed && (
        <>
          {/* Empty state */}
          {status === 'empty' && (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center space-y-3">
                <Search className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
                <p className="text-sm text-muted-foreground">
                  No research data yet.
                </p>
                <p className="text-xs text-muted-foreground">
                  Click "Create Content" to start research.
                </p>
              </div>
            </div>
          )}

          {/* Loading state */}
          {status === 'loading' && (
            <div className="flex-1 p-4 space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="font-medium">Researching sources...</span>
              </div>

              {/* Progress indicators - mock for now */}
              <div className="space-y-2">
                {['Reddit', 'LinkedIn', 'Medium', 'Quora', 'Substack'].map((source, index) => (
                  <div key={source} className="flex items-center gap-3 text-xs">
                    {index < 2 ? (
                      <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                        <div className="h-2 w-2 rounded-full bg-background" />
                      </div>
                    ) : index === 2 ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-muted" />
                    )}
                    <span className={cn(
                      index < 2 && 'text-muted-foreground',
                      index === 2 && 'font-medium',
                      index > 2 && 'text-muted-foreground/50'
                    )}>
                      {source}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Loaded state */}
          {status === 'loaded' && (
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {Object.entries(groupedSources).map(([sourceType, sources]) => (
                  <div key={sourceType} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="text-xs font-semibold uppercase text-muted-foreground">
                        {sourceType}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        ({sources.length})
                      </div>
                    </div>

                    <div className="space-y-2">
                      {sources.map((source) => (
                        <SourceCard key={source.id} source={source} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Error state */}
          {status === 'error' && (
            <div className="flex-1 p-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                  <div className="space-y-2 flex-1">
                    <p className="text-sm font-medium">Research Failed</p>
                    <p className="text-xs text-muted-foreground">
                      {error || 'Could not complete research. Please try again or provide manual research data.'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {onRetry && (
                    <Button variant="outline" size="sm" onClick={onRetry} className="w-full">
                      Retry Research
                    </Button>
                  )}
                  {onManualEntry && (
                    <Button variant="default" size="sm" onClick={onManualEntry} className="w-full">
                      Enter Research Manually
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

/**
 * Individual source card component
 */
function SourceCard({ source }: { source: ArtifactResearch }) {
  const getSourceIcon = (type: string) => {
    // Return appropriate icon based on source type
    return <Search className="h-4 w-4" />;
  };

  const renderRelevanceStars = (score: number) => {
    const stars = Math.round(score * 5);
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-3 w-3 rounded-full',
              i < stars ? 'bg-amber-400' : 'bg-muted'
            )}
          />
        ))}
      </div>
    );
  };

  return (
    <Card className="p-3 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
          {getSourceIcon(source.source_type)}
        </div>

        <div className="flex-1 space-y-2 min-w-0">
          <div className="font-medium text-sm truncate">
            {source.source_name}
          </div>

          <p className="text-xs text-muted-foreground line-clamp-2">
            {source.excerpt}
          </p>

          <div className="flex items-center justify-between">
            {/* Relevance score */}
            <div className="flex items-center gap-1">
              {renderRelevanceStars(source.relevance_score)}
            </div>

            {/* View Source link */}
            {source.source_url && (
              <a
                href={source.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                View Source
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

export default ResearchArea;
```

---

### 3. Create ToneSelector Component

**Location**: `frontend/src/features/portfolio/components/artifact/ToneSelector.tsx` (NEW FILE)

**Integration**: The ToneSelector is integrated into the ArtifactEditor toolbox (not the page header).

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type ToneOption =
  | 'formal'
  | 'casual'
  | 'professional'
  | 'conversational'
  | 'technical'
  | 'friendly'
  | 'authoritative'
  | 'humorous';

export interface ToneSelectorProps {
  value: ToneOption;
  onChange: (tone: ToneOption) => void;
  disabled?: boolean;
}

const TONE_OPTIONS: Array<{ value: ToneOption; label: string }> = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'formal', label: 'Formal' },
  { value: 'conversational', label: 'Conversational' },
  { value: 'technical', label: 'Technical' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'authoritative', label: 'Authoritative' },
  { value: 'humorous', label: 'Humorous' },
];

export function ToneSelector({ value, onChange, disabled }: ToneSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium text-muted-foreground">
        Tone:
      </label>
      <Select
        value={value}
        onValueChange={onChange as (value: string) => void}
        disabled={disabled}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Select tone" />
        </SelectTrigger>
        <SelectContent>
          {TONE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default ToneSelector;
```

---

### 4. Update Artifact Page Layout

**Location**: `frontend/src/features/portfolio/pages/ArtifactPage.tsx`

**Layout Pattern**: Vertical stack with collapsible sections
- Research area at top (collapsible, default collapsed)
- Editor area below (main content area)
- ToneSelector integrated into editor toolbox (not header)

**Key Features**:
- "Approve Skeleton" button visible when `status = 'skeleton_ready'`
- "Create Content" button visible when `status = 'draft'`
- AI Assistant as slide-out sheet

```tsx
// Vertical stack layout (not 60/40 horizontal)
<div className="flex-1 flex flex-col overflow-hidden">
  {/* Research Area - Collapsible at top (default: collapsed) */}
  <div className={isResearchCollapsed ? 'h-auto' : 'h-1/3 min-h-[300px]'}>
    <ResearchArea
      artifactId={artifact.id}
      research={research}
      status={researchStatus}
      isCollapsed={isResearchCollapsed}
      onCollapsedChange={setIsResearchCollapsed}
    />
  </div>

  {/* Editor Area - Below research */}
  <div className="flex-1 overflow-hidden">
    <ArtifactEditor
      artifactId={artifact.id}
      content={localContent}
      onContentChange={handleContentChange}
      tone={localTone}
      onToneChange={handleToneChange}  // ToneSelector inside editor toolbox
    />
  </div>
</div>

{/* Approve Skeleton Button - in header, visible when skeleton_ready */}
{artifact.status === 'skeleton_ready' && (
  <Button onClick={handleApproveSkeleton}>
    <Check className="h-4 w-4" />
    Approve Skeleton
  </Button>
)}
```

**Note**: ToneSelector is now part of the ArtifactEditor toolbox, not the page header.
Manual research entry deferred to future phase (see Known Gaps document).

---

### 5. Create Research Hook

**Location**: `frontend/src/features/portfolio/hooks/useResearch.ts` (NEW FILE)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ArtifactResearch } from '../types/portfolio';

/**
 * Fetch research data for an artifact
 */
export function useResearch(artifactId: string) {
  return useQuery({
    queryKey: ['research', artifactId],
    queryFn: async () => {
      const response = await api.get<ArtifactResearch[]>(
        `/api/artifacts/${artifactId}/research`
      );
      return response.data;
    },
    enabled: !!artifactId,
  });
}

/**
 * Manually add research data
 */
export function useAddResearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      artifactId,
      sourceType,
      sourceName,
      sourceUrl,
      excerpt,
    }: {
      artifactId: string;
      sourceType: string;
      sourceName: string;
      sourceUrl?: string;
      excerpt: string;
    }) => {
      const response = await api.post(`/api/artifacts/${artifactId}/research`, {
        source_type: sourceType,
        source_name: sourceName,
        source_url: sourceUrl,
        excerpt,
        relevance_score: 1.0, // Manual entries get max relevance
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate research query to refetch
      queryClient.invalidateQueries({
        queryKey: ['research', variables.artifactId],
      });
    },
  });
}
```

---

### 6. Update Types

**Location**: `frontend/src/features/portfolio/types/portfolio.ts`

```typescript
// Add new artifact statuses
export type ArtifactStatus =
  | 'draft'
  | 'researching'              // NEW
  | 'skeleton_ready'           // NEW
  | 'skeleton_approved'        // NEW
  | 'writing'
  | 'humanity_checking'
  | 'review_ready'
  | 'content_approved'
  | 'identifying_images'
  | 'generating_placeholders'
  | 'placeholder_review'
  | 'generating_images'
  | 'complete'
  | 'ready'
  | 'published';

// Add tone type
export type ToneOption =
  | 'formal'
  | 'casual'
  | 'professional'
  | 'conversational'
  | 'technical'
  | 'friendly'
  | 'authoritative'
  | 'humorous';

// Add research interface
export interface ArtifactResearch {
  id: string;
  artifact_id: string;
  source_type: 'reddit' | 'linkedin' | 'quora' | 'medium' | 'substack' | 'user_provided';
  source_name: string;
  source_url?: string;
  excerpt: string;
  relevance_score: number;
  created_at: string;
}

// Update Artifact interface
export interface Artifact {
  id: string;
  user_id: string;
  account_id: string;
  type: ArtifactType;
  title: string;
  content: string | null;
  status: ArtifactStatus;
  tags: string[];
  tone?: ToneOption;           // NEW
  created_at: string;
  updated_at: string;
}
```

---

## Testing Requirements

### Unit Tests

**Backend Tests** (`backend/src/services/ai/tools/__tests__/`):

1. `researchTools.test.ts`:
   - Test `determineSourcePriority()` logic
   - Test `conductDeepResearch` success case (min 5 sources)
   - Test `conductDeepResearch` failure case (< 5 sources)
   - Test research result storage

2. `skeletonTools.test.ts`:
   - Test `buildSkeletonPrompt()` for each artifact type
   - Test skeleton validation (length, format)
   - Test artifact status update

**Frontend Tests** (`frontend/src/features/portfolio/__tests__/`):

1. `ArtifactSuggestionCard.test.tsx`:
   - Test two-button rendering
   - Test "Add & Edit" flow
   - Test "Create Content" flow
   - Test button states (loading, disabled, success)

2. `ResearchArea.test.tsx`:
   - Test 4 states (empty, loading, loaded, error)
   - Test research grouping by source type
   - Test collapse/expand functionality

3. `ToneSelector.test.tsx`:
   - Test all 8 tone options render
   - Test tone selection callback
   - Test disabled state

---

### Integration Tests

**API Endpoint Tests** (`backend/src/__tests__/integration/`):

1. Test research workflow:
   - POST `/api/ai/chat` with "Research topic: X"
   - Verify research results stored in database
   - Verify artifact status updated to `researching`

2. Test skeleton generation:
   - POST `/api/ai/chat` with "Generate skeleton"
   - Verify skeleton content in artifact
   - Verify artifact status updated to `skeleton_ready`

3. Test manual research entry:
   - POST `/api/artifacts/:id/research`
   - Verify research stored with `user_provided` source type

---

### E2E Tests (Playwright)

**Critical User Journeys**:

1. **AI Suggestion → Create Content**:
   - User asks AI for content suggestions
   - AI returns artifact suggestions
   - User clicks "Create Content" button
   - Verify artifact created with status `researching`
   - Wait for research completion
   - Verify research displayed in ResearchArea
   - Verify skeleton generated
   - Verify artifact status `skeleton_ready`

2. **Manual Creation → Research**:
   - User creates artifact manually
   - User clicks "Create Content" button
   - Verify research starts
   - Verify research area shows loading state
   - Verify research results appear
   - Verify skeleton generated

3. **Research Failure → Manual Entry**:
   - Mock research API to return < 5 sources
   - User starts content creation
   - Verify error displayed in ResearchArea
   - User clicks "Enter Research Manually"
   - User adds manual research data
   - Verify research stored
   - Verify skeleton generation continues

4. **Tone Selection**:
   - User opens artifact
   - User selects different tone
   - Verify tone saved
   - User triggers skeleton generation
   - Verify skeleton matches selected tone

---

## Validation Commands

### Backend Validation

```bash
# 1. TypeScript compilation
cd backend && npm run build
# Expected: No errors

# 2. Run unit tests
cd backend && npm run test:unit
# Expected: All tests pass

# 3. Run integration tests
cd backend && npm run test:integration
# Expected: All tests pass

# 4. Verify new tools registered
grep -r "conductDeepResearch" backend/src/services/ai/AIService.ts
grep -r "generateContentSkeleton" backend/src/services/ai/AIService.ts
# Expected: Both tools found in AVAILABLE_TOOLS
```

### Frontend Validation

```bash
# 1. TypeScript compilation
cd frontend && npm run build
# Expected: No errors

# 2. Run unit tests
cd frontend && npm run test:unit
# Expected: All tests pass

# 3. Verify imports
grep -r "ResearchArea" frontend/src/features/portfolio/pages/ArtifactPage.tsx
grep -r "ToneSelector" frontend/src/features/portfolio/pages/ArtifactPage.tsx
# Expected: Both components imported
```

### Database Validation

```bash
# 1. Verify migration applied
mcp__supabase__list_tables({ project_id: "ohwubfmipnpguunryopl" })
# Expected: artifact_research table exists

# 2. Check indexes
mcp__supabase__execute_sql({
  project_id: "ohwubfmipnpguunryopl",
  query: "SELECT indexname FROM pg_indexes WHERE tablename = 'artifact_research'"
})
# Expected: 3 indexes

# 3. Verify new statuses work
mcp__supabase__execute_sql({
  project_id: "ohwubfmipnpguunryopl",
  query: "SELECT unnest(enum_range(NULL::artifact_status))"
})
# Expected: researching, skeleton_ready, skeleton_approved in list

# 4. Security check
mcp__supabase__get_advisors({
  project_id: "ohwubfmipnpguunryopl",
  type: "security"
})
# Review: RLS policies recommended for artifact_research
```

---

## Error Handling

### Research Failures

**Scenario**: Less than 5 relevant sources found

**Backend Response**:
```json
{
  "success": false,
  "error": "Insufficient sources found",
  "minRequired": 5,
  "found": 3,
  "message": "Could not find enough relevant sources. Please provide manual research data or adjust the topic."
}
```

**Frontend Handling**:
- Display error in ResearchArea
- Show "Retry Research" button
- Show "Enter Research Manually" button
- Allow user to input manual research data

### Skeleton Generation Failures

**Scenario**: Claude API error or invalid skeleton generated

**Backend Response**:
```json
{
  "success": false,
  "error": "Skeleton generation failed",
  "message": "API timeout"
}
```

**Frontend Handling**:
- Display error toast
- Revert artifact status to previous state
- Allow user to retry or edit manually

---

## Deployment Checklist

- [x] Database migration applied (`002_add_research_and_statuses.sql`)
- [x] All new backend files created (researchTools.ts, skeletonTools.ts)
- [x] Tools registered in AIService
- [x] System prompts updated
- [x] All new frontend components created (ResearchArea, ToneSelector, updated ArtifactSuggestionCard)
- [x] Artifact page layout updated (vertical stack with collapsible research)
- [x] ToneSelector integrated into editor toolbox
- [x] Types updated (statuses, tone, research interface)
- [x] Research hook implemented
- [ ] "Approve Skeleton" button added (visible when `status = 'skeleton_ready'`)
- [ ] Status flow corrected (`researching` → `skeleton_ready`)
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] E2E tests written and passing
- [ ] Security advisors checked (RLS policies)
- [ ] Build succeeds (frontend + backend)

---

## Known Limitations

1. **Web Search Integration**: Research tool uses mock data. Requires integration with Perplexity, Tavily, or custom web scraping.

2. **Source-Specific APIs**: Reddit, LinkedIn, Quora APIs may require authentication/API keys.

3. **Research Quality**: Relevance scoring is placeholder logic. Needs semantic similarity implementation.

4. **Skeleton Templates**: First iteration may produce inconsistent skeletons. Requires prompt engineering iteration.

5. **Tone Consistency**: Phase 1 applies tone to skeleton only. Full tone application happens in Phase 2 (content writing).

6. **Manual Research Entry**: UI for manually adding research entries is deferred to a future phase. See `known-gaps-phase-1.md` for details.

---

## Next Steps (After Phase 1 Complete)

1. **Phase 2**: Content Writing & Humanity Check
   - Integrate Gemini API for text writing
   - Implement humanity check using humanizer skill patterns
   - Apply tone to full content

2. **Phase 3**: Graphics & Completion
   - Configure Gemini Nano Banana
   - Implement placeholder generation
   - Implement final image generation

3. **Phase 4**: Tone Enhancement (Future)
   - User-provided tone examples
   - Custom tone analysis and learning
   - Multi-tone blending

---

**Spec Status**: Ready for Implementation
**Awaiting**: User approval to begin Phase 1 development
