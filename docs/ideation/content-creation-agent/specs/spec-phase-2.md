# Implementation Spec: Phase 2 - Content Writing & Humanity Check

**Phase**: 2 of 4
**Status**: Ready for Implementation
**Dependencies**: Phase 1 (skeleton approved, research available, tone selected)
**Estimated Effort**: 2-3 weeks

---

## Overview

This specification details the technical implementation for Phase 2, covering:
1. Gemini API integration for content writing
2. Section-by-section content generation with streaming
3. Tone application (8 preset tones)
4. Humanity check using humanizer skill patterns
5. Content approval workflow
6. Real-time UI updates during writing

---

## Database Changes

### Migration: `003_add_content_writing_statuses.sql`

**Location**: `backend/src/db/migrations/003_add_content_writing_statuses.sql`

```sql
-- ============================================================================
-- Phase 2 Migration: Content Writing + Humanity Check Statuses
-- ============================================================================

-- Step 1: Add new artifact statuses (Phase 2)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'artifact_status') THEN
    -- Add content writing statuses
    ALTER TYPE artifact_status ADD VALUE IF NOT EXISTS 'writing';
    ALTER TYPE artifact_status ADD VALUE IF NOT EXISTS 'humanity_checking';
    ALTER TYPE artifact_status ADD VALUE IF NOT EXISTS 'review_ready';
    ALTER TYPE artifact_status ADD VALUE IF NOT EXISTS 'content_approved';
  END IF;
END$$;

-- Step 2: Add metadata columns for tracking writing progress
ALTER TABLE artifacts ADD COLUMN IF NOT EXISTS writing_metadata JSONB DEFAULT '{}'::jsonb;

-- Step 3: Create index for writing_metadata queries
CREATE INDEX IF NOT EXISTS idx_artifacts_writing_metadata ON artifacts USING gin (writing_metadata);

-- Note: No new tables needed for Phase 2, using existing artifacts table
```

**Validation Commands**:
```bash
# Apply migration
mcp__supabase__apply_migration({
  project_id: "ohwubfmipnpguunryopl",
  name: "003_add_content_writing_statuses",
  query: "<SQL above>"
})

# Verify new statuses
mcp__supabase__execute_sql({
  project_id: "ohwubfmipnpguunryopl",
  query: "SELECT unnest(enum_range(NULL::artifact_status))"
})
# Expected: writing, humanity_checking, review_ready, content_approved in list

# Verify new column
mcp__supabase__execute_sql({
  project_id: "ohwubfmipnpguunryopl",
  query: "SELECT column_name FROM information_schema.columns WHERE table_name = 'artifacts' AND column_name = 'writing_metadata'"
})
# Expected: writing_metadata column exists
```

---

## Backend Implementation

### 1. Gemini API Integration

**Location**: `backend/src/lib/geminiClient.ts` (NEW FILE)

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';
import { LoggerService } from '../services/LoggerService.js';

/**
 * Gemini API client for text generation
 * Using Gemini 1.5 Pro or Gemini 2.0 Flash
 */
export class GeminiClient {
  private client: GoogleGenerativeAI;
  private model: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable not set');
    }

    this.client = new GoogleGenerativeAI(apiKey);
    this.model = process.env.GEMINI_MODEL || 'gemini-1.5-pro';

    LoggerService.info('GeminiClient', 'Initialized', {
      model: this.model,
      hasApiKey: !!apiKey,
    });
  }

  /**
   * Generate text content with streaming support
   */
  async generateContent(
    prompt: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
      stopSequences?: string[];
    }
  ): Promise<string> {
    try {
      const model = this.client.getGenerativeModel({
        model: this.model,
      });

      const generationConfig = {
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxTokens ?? 2000,
        stopSequences: options?.stopSequences,
      };

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig,
      });

      const response = result.response;
      const text = response.text();

      LoggerService.info('GeminiClient', 'Content generated', {
        promptLength: prompt.length,
        responseLength: text.length,
        temperature: generationConfig.temperature,
      });

      return text;
    } catch (error) {
      LoggerService.error('GeminiClient', error instanceof Error ? error : new Error(String(error)), {
        sourceCode: 'generateContent',
      });
      throw error;
    }
  }

  /**
   * Generate content with streaming (for real-time UI updates)
   */
  async *generateContentStream(
    prompt: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
    }
  ): AsyncGenerator<string, void, unknown> {
    try {
      const model = this.client.getGenerativeModel({
        model: this.model,
      });

      const generationConfig = {
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxTokens ?? 2000,
      };

      const result = await model.generateContentStream({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig,
      });

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        yield chunkText;
      }

      LoggerService.info('GeminiClient', 'Streaming completed', {
        promptLength: prompt.length,
        temperature: generationConfig.temperature,
      });
    } catch (error) {
      LoggerService.error('GeminiClient', error instanceof Error ? error : new Error(String(error)), {
        sourceCode: 'generateContentStream',
      });
      throw error;
    }
  }
}

// Singleton instance
export const geminiClient = new GeminiClient();
```

**Environment Variables** (add to `backend/.env`):
```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-pro  # or gemini-2.0-flash
```

---

### 2. AI Tool: `writeContentSection`

**Location**: `backend/src/services/ai/tools/contentWritingTools.ts` (NEW FILE)

```typescript
import { tool } from 'ai';
import { z } from 'zod';
import { supabase } from '../../../lib/supabaseClient.js';
import { geminiClient } from '../../../lib/geminiClient.js';
import { LoggerService } from '../../LoggerService.js';

/**
 * Write content for a specific skeleton section using Gemini
 */
export const writeContentSection = tool({
  description: `Write content for a skeleton section using Gemini.

Takes skeleton section, research excerpts, and tone to generate high-quality content.
Uses Gemini for text generation (not OpenAI).

Content length by artifact type:
- Blog: 800-1500 words
- Social Post: 150-280 characters
- Showcase: 600-1000 words

Returns section content in Markdown format.`,

  parameters: z.object({
    artifactId: z.string().uuid().describe('Artifact ID'),
    sectionIndex: z.number().int().min(0).describe('Section index (0-based)'),
    sectionHeading: z.string().describe('Section heading from skeleton'),
    sectionPlaceholder: z.string().describe('Placeholder text from skeleton'),
    artifactType: z.enum(['blog', 'social_post', 'showcase']).describe('Artifact type'),
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
    })).describe('Relevant research excerpts for this section'),
  }),

  execute: async ({
    artifactId,
    sectionIndex,
    sectionHeading,
    sectionPlaceholder,
    artifactType,
    tone,
    researchExcerpts,
  }) => {
    try {
      LoggerService.info('writeContentSection', 'Generating content', {
        artifactId,
        sectionIndex,
        sectionHeading,
        tone,
      });

      // Build content writing prompt
      const prompt = buildContentPrompt({
        artifactType,
        tone,
        sectionHeading,
        sectionPlaceholder,
        researchExcerpts,
      });

      // Generate content using Gemini
      const content = await geminiClient.generateContent(prompt, {
        temperature: getTemperatureForTone(tone),
        maxTokens: getMaxTokensForType(artifactType),
      });

      LoggerService.info('writeContentSection', 'Content generated', {
        artifactId,
        sectionIndex,
        contentLength: content.length,
      });

      return {
        success: true,
        sectionIndex,
        content,
        message: `Section ${sectionIndex + 1} written successfully`,
      };
    } catch (error) {
      LoggerService.error('writeContentSection', error instanceof Error ? error : new Error(String(error)), {
        artifactId,
        sectionIndex,
        sourceCode: 'content_generation',
      });

      return {
        success: false,
        sectionIndex,
        error: 'Content generation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});

/**
 * Build content writing prompt with tone application
 */
function buildContentPrompt(params: {
  artifactType: string;
  tone: string;
  sectionHeading: string;
  sectionPlaceholder: string;
  researchExcerpts: Array<{ source: string; excerpt: string }>;
}): string {
  const { artifactType, tone, sectionHeading, sectionPlaceholder, researchExcerpts } = params;

  // Tone modifiers (same as Phase 1)
  const toneModifiers: Record<string, string> = {
    formal: 'Use academic language, passive voice where appropriate, complex sentence structures, avoid contractions, cite sources formally.',
    casual: 'Use contractions (it\'s, you\'re), simple everyday language, active voice, short sentences, conversational flow.',
    professional: 'Be clear and direct, use industry terminology appropriately, maintain confidence, avoid fluff, get to the point.',
    conversational: 'Write in first-person, ask rhetorical questions, use "you" to address reader, friendly and approachable, share personal insights.',
    technical: 'Use precise terminology, include detailed explanations, reference data and metrics, assume reader has technical background, avoid oversimplification.',
    friendly: 'Use warm and encouraging language, include personal anecdotes, show empathy, use exclamation points sparingly, be supportive.',
    authoritative: 'Make strong declarative statements, position as expert, use evidence-based claims, demonstrate deep knowledge, inspire confidence.',
    humorous: 'Include light jokes, use wordplay, add entertaining examples, keep humor tasteful and relevant, balance entertainment with information.',
  };

  const researchContext = researchExcerpts
    .map(r => `Source: ${r.source}\nExcerpt: ${r.excerpt}`)
    .join('\n\n');

  return `You are a professional content writer creating high-quality ${artifactType} content.

Section Heading: ${sectionHeading}
Section Placeholder: ${sectionPlaceholder}

Tone: ${tone}
Tone Guidelines: ${toneModifiers[tone]}

Research Context:
${researchContext}

Instructions:
1. Write compelling, well-researched content for this section
2. Match the ${tone} tone of voice consistently
3. Reference research findings naturally (don't force citations)
4. Use specific details and examples, not vague claims
5. Vary sentence structure for natural flow
6. Write in Markdown format

Type-Specific Guidelines:
${getTypeSpecificGuidelines(artifactType)}

Write the section content now:`;
}

/**
 * Get type-specific writing guidelines
 */
function getTypeSpecificGuidelines(artifactType: string): string {
  if (artifactType === 'blog') {
    return `- Target length: 200-300 words per section
- Use subheadings (H3) if needed for longer sections
- Include bullet points or numbered lists where appropriate
- Add concrete examples to illustrate points
- End sections with a clear transition to next topic`;
  }

  if (artifactType === 'social_post') {
    return `- Target length: 150-280 characters total
- Make every word count - be concise
- Use line breaks for readability
- Include a clear call-to-action
- Social media friendly formatting`;
  }

  if (artifactType === 'showcase') {
    return `- Target length: 150-250 words per section
- Use quantifiable metrics where possible
- Include specific methodologies and approaches
- Highlight tangible results and impact
- Professional case study tone`;
  }

  return '';
}

/**
 * Get temperature based on tone
 */
function getTemperatureForTone(tone: string): number {
  const temperatureMap: Record<string, number> = {
    formal: 0.5,          // More deterministic
    casual: 0.7,          // Balanced
    professional: 0.6,    // Slightly conservative
    conversational: 0.7,  // Balanced
    technical: 0.4,       // Very deterministic
    friendly: 0.7,        // Balanced
    authoritative: 0.5,   // Conservative
    humorous: 0.8,        // More creative
  };

  return temperatureMap[tone] ?? 0.7;
}

/**
 * Get max tokens based on artifact type
 */
function getMaxTokensForType(artifactType: string): number {
  const tokenMap: Record<string, number> = {
    blog: 2000,         // ~1500 words
    social_post: 500,   // ~300 words
    showcase: 1500,     // ~1000 words
  };

  return tokenMap[artifactType] ?? 2000;
}
```

---

### 3. AI Tool: `applyHumanityCheck`

**Location**: `backend/src/services/ai/tools/humanityCheckTools.ts` (NEW FILE)

```typescript
import { tool } from 'ai';
import { z } from 'zod';
import { supabase } from '../../../lib/supabaseClient.js';
import { LoggerService } from '../../LoggerService.js';
import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * Apply humanity check to remove AI-sounding patterns
 * Uses patterns from .claude/skills/humanizer/SKILL.md
 */
export const applyHumanityCheck = tool({
  description: `Apply humanity check to content to remove AI-sounding patterns.

Uses 24 patterns from Wikipedia's "Signs of AI writing":
- AI vocabulary (crucial, delve, tapestry, landscape)
- Promotional language (nestled, vibrant, stunning)
- Superficial "-ing" analyses
- Em dash overuse
- "Serves as"/"stands as" constructions
- Vague attributions
- Filler phrases

Uses Claude for pattern detection and refinement (better than Gemini for this task).

Returns humanized content and summary of changes made.`,

  parameters: z.object({
    artifactId: z.string().uuid().describe('Artifact ID'),
    content: z.string().min(100).describe('Content to humanize'),
  }),

  execute: async ({ artifactId, content }) => {
    try {
      LoggerService.info('applyHumanityCheck', 'Starting humanity check', {
        artifactId,
        contentLength: content.length,
      });

      // Load humanizer patterns from skill file
      const humanizerPatterns = await loadHumanizerPatterns();

      // Build humanity check prompt
      const prompt = buildHumanityCheckPrompt(content, humanizerPatterns);

      // Use Claude for humanity check (better for pattern detection)
      const { generateText } = await import('ai');
      const { anthropic } = await import('@ai-sdk/anthropic');

      const { text: response } = await generateText({
        model: anthropic('claude-sonnet-4-5'),
        prompt,
        maxTokens: 4000,
      });

      // Parse response (expect JSON with humanized content + changes summary)
      const parsed = JSON.parse(response);

      LoggerService.info('applyHumanityCheck', 'Humanity check completed', {
        artifactId,
        changesCount: parsed.changes?.length ?? 0,
      });

      return {
        success: true,
        humanizedContent: parsed.humanizedContent,
        changesSummary: parsed.changesSummary,
        changes: parsed.changes,
        message: `Removed ${parsed.changes?.length ?? 0} AI patterns`,
      };
    } catch (error) {
      LoggerService.error('applyHumanityCheck', error instanceof Error ? error : new Error(String(error)), {
        artifactId,
        sourceCode: 'humanity_check',
      });

      return {
        success: false,
        error: 'Humanity check failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});

/**
 * Load humanizer patterns from skill file
 */
async function loadHumanizerPatterns(): Promise<string> {
  try {
    const skillPath = join(process.cwd(), '..', '.claude', 'skills', 'humanizer', 'SKILL.md');
    const content = await readFile(skillPath, 'utf-8');

    // Extract the patterns section (simplified - actual implementation should parse properly)
    const patternsStart = content.indexOf('## 24 Patterns');
    const patternsEnd = content.indexOf('## Example', patternsStart);

    if (patternsStart === -1) {
      LoggerService.warn('loadHumanizerPatterns', 'Patterns section not found in humanizer skill');
      return getDefaultPatterns();
    }

    const patterns = content.slice(patternsStart, patternsEnd > 0 ? patternsEnd : undefined);
    return patterns;
  } catch (error) {
    LoggerService.warn('loadHumanizerPatterns', 'Could not load humanizer skill, using defaults', {
      error: error instanceof Error ? error.message : String(error),
    });
    return getDefaultPatterns();
  }
}

/**
 * Get default humanizer patterns (fallback)
 */
function getDefaultPatterns(): string {
  return `## 24 Patterns from Wikipedia's "Signs of AI writing"

1. AI Vocabulary: crucial, delve, tapestry, landscape, testament, realm
2. Promotional Language: nestled, vibrant, stunning, quaint, charm
3. Superficial -ing Analyses: showcasing, highlighting, underscoring
4. Em Dash Overuse: More than 2 em dashes per paragraph
5. "Serves as"/"Stands as": Replace with active verbs
6. Vague Attributions: "experts believe", "studies show"
7. Filler Phrases: "it is important to note", "in conclusion"
8. Rule of Three: Excessive use of triads
9. Negative Parallelism: "not just X, but also Y"
10. Conjunctive Phrases: "moreover", "furthermore", "additionally"

[... full list continues ...]`;
}

/**
 * Build humanity check prompt
 */
function buildHumanityCheckPrompt(content: string, patterns: string): string {
  return `You are an expert editor removing AI-sounding patterns from text.

${patterns}

Original Content:
${content}

Instructions:
1. Identify all AI patterns present in the content
2. Rewrite to remove these patterns while preserving meaning
3. Add personality and natural voice
4. Vary sentence structure naturally
5. Use specific details over vague claims
6. Maintain the original content length (±10%)

Return JSON format:
{
  "humanizedContent": "the rewritten content in Markdown",
  "changesSummary": "brief summary of what was changed",
  "changes": [
    {
      "pattern": "AI vocabulary",
      "original": "crucial aspect",
      "replacement": "key point",
      "reason": "Removed AI vocabulary"
    }
  ]
}

Return only valid JSON, no additional text.`;
}
```

---

### 4. Content Writing Controller

**Location**: `backend/src/controllers/contentWriting.controller.ts` (NEW FILE)

```typescript
import { Request, Response } from 'express';
import { supabase } from '../lib/supabaseClient.js';
import { geminiClient } from '../lib/geminiClient.js';
import { LoggerService } from '../services/LoggerService.js';

/**
 * Start content writing workflow
 * Called when user approves skeleton
 */
export const startContentWriting = async (req: Request, res: Response) => {
  try {
    const { artifactId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate artifact ownership
    const { data: artifact } = await supabase
      .from('artifacts')
      .select('*')
      .eq('id', artifactId)
      .eq('user_id', userId)
      .single();

    if (!artifact) {
      return res.status(404).json({ error: 'Artifact not found' });
    }

    if (artifact.status !== 'skeleton_approved') {
      return res.status(400).json({
        error: 'Invalid status',
        message: 'Artifact must be in skeleton_approved status to start writing',
      });
    }

    // Update status to writing
    await supabase
      .from('artifacts')
      .update({ status: 'writing' })
      .eq('id', artifactId);

    // Trigger AI to start writing sections
    // This will be handled by AI agent through chat interface

    LoggerService.info('startContentWriting', 'Content writing started', {
      artifactId,
      userId,
    });

    return res.status(200).json({
      success: true,
      artifactId,
      status: 'writing',
      message: 'Content writing started',
    });
  } catch (error) {
    LoggerService.error('startContentWriting', error instanceof Error ? error : new Error(String(error)), {
      sourceCode: 'controller',
    });

    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Approve content after review
 */
export const approveContent = async (req: Request, res: Response) => {
  try {
    const { artifactId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate artifact ownership
    const { data: artifact } = await supabase
      .from('artifacts')
      .select('*')
      .eq('id', artifactId)
      .eq('user_id', userId)
      .single();

    if (!artifact) {
      return res.status(404).json({ error: 'Artifact not found' });
    }

    if (artifact.status !== 'review_ready') {
      return res.status(400).json({
        error: 'Invalid status',
        message: 'Artifact must be in review_ready status to approve',
      });
    }

    // Update status to content_approved
    const { data: updated } = await supabase
      .from('artifacts')
      .update({ status: 'content_approved' })
      .eq('id', artifactId)
      .select()
      .single();

    LoggerService.info('approveContent', 'Content approved', {
      artifactId,
      userId,
    });

    return res.status(200).json({
      success: true,
      artifact: updated,
      message: 'Content approved. Image generation will begin in Phase 3.',
    });
  } catch (error) {
    LoggerService.error('approveContent', error instanceof Error ? error : new Error(String(error)), {
      sourceCode: 'controller',
    });

    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
```

**Routes** (`backend/src/routes/contentWriting.routes.ts`):
```typescript
import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { startContentWriting, approveContent } from '../controllers/contentWriting.controller.js';

const router = express.Router();

router.post('/artifacts/:artifactId/content/start', requireAuth, startContentWriting);
router.post('/artifacts/:artifactId/content/approve', requireAuth, approveContent);

export default router;
```

---

### 5. Register New Tools in AIService

**Location**: `backend/src/services/ai/AIService.ts`

```typescript
// Add imports
import { writeContentSection } from './tools/contentWritingTools.js';
import { applyHumanityCheck } from './tools/humanityCheckTools.js';

// Update AVAILABLE_TOOLS object
const AVAILABLE_TOOLS = {
  // ... existing tools

  // Phase 2: Content Writing & Humanity Check
  writeContentSection,
  applyHumanityCheck,
};
```

---

### 6. Update System Prompts

**Location**: `backend/src/services/ai/prompts/systemPrompts.ts`

```typescript
export function getBaseSystemPrompt(userContext: UserContext): string {
  return `... [existing content] ...

## Phase 2: Content Writing & Humanity Check

After user approves skeleton (status = skeleton_approved), proceed with content writing:

### Content Writing Workflow:

1. **Parse Skeleton into Sections**:
   - Identify H2 headings as section boundaries
   - Extract section heading and placeholder text
   - Determine relevant research excerpts for each section

2. **Write Section-by-Section**:
   - Use writeContentSection tool for each section
   - Pass: sectionIndex, heading, placeholder, tone, research
   - Wait for each section to complete before starting next
   - Insert generated content into skeleton

3. **Stream Progress to User**:
   - Update artifact status to 'writing'
   - Show progress: "Writing section 2 of 5..."
   - Display completed sections with checkmarks

4. **Apply Humanity Check**:
   - After all sections written, use applyHumanityCheck tool
   - Update artifact status to 'humanity_checking'
   - Tool removes AI patterns (24 patterns from humanizer skill)
   - Returns humanized content + changes summary

5. **Present for Review**:
   - Update artifact status to 'review_ready'
   - Notify user: "Content ready for review"
   - Show changes summary (optional)
   - Wait for user approval

6. **Content Approval**:
   - User clicks "Approve Content" button
   - Update status to 'content_approved'
   - Ready for Phase 3 (image generation)

### Content Writing Best Practices:

- **Use Gemini for writing** (not Claude/OpenAI)
- **Match tone consistently** across all sections
- **Reference research naturally** (don't force citations)
- **Vary sentence structure** for natural flow
- **Use specific details** over vague claims
- **Respect content length** by artifact type:
  - Blog: 800-1500 words total
  - Social Post: 150-280 characters
  - Showcase: 600-1000 words total

### Humanity Check Patterns:

Remove these AI patterns:
- AI vocabulary: crucial, delve, tapestry, landscape
- Promotional language: nestled, vibrant, stunning
- Superficial "-ing" analyses
- Em dash overuse (>2 per paragraph)
- "Serves as"/"stands as" constructions
- Vague attributions: "experts believe"
- Filler phrases: "it is important to note"

Example content writing query:
"Write the Introduction section for the blog skeleton with professional tone"

Example humanity check query:
"Apply humanity check to the completed content"`;
}
```

---

## Frontend Implementation

### 1. Create WritingProgress Component

**Location**: `frontend/src/features/portfolio/components/artifact/WritingProgress.tsx` (NEW FILE)

```tsx
import { Loader2, Check, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export interface WritingSection {
  index: number;
  heading: string;
  status: 'pending' | 'writing' | 'completed' | 'failed';
}

export interface WritingProgressProps {
  sections: WritingSection[];
  currentSection: number;
  totalSections: number;
}

export function WritingProgress({
  sections,
  currentSection,
  totalSections,
}: WritingProgressProps) {
  const progress = (currentSection / totalSections) * 100;

  return (
    <Card className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="font-medium text-sm">
          Writing content... Section {currentSection} of {totalSections}
        </span>
      </div>

      {/* Section list */}
      <div className="space-y-2">
        {sections.map((section) => (
          <div
            key={section.index}
            className={cn(
              'flex items-center gap-3 text-sm p-2 rounded transition-colors',
              section.status === 'writing' && 'bg-primary/10',
              section.status === 'completed' && 'bg-muted/50'
            )}
          >
            {/* Status icon */}
            {section.status === 'completed' && (
              <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <Check className="h-3 w-3 text-primary-foreground" />
              </div>
            )}
            {section.status === 'writing' && (
              <Loader2 className="h-4 w-4 animate-spin text-primary flex-shrink-0" />
            )}
            {section.status === 'pending' && (
              <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )}
            {section.status === 'failed' && (
              <div className="h-4 w-4 rounded-full bg-destructive flex items-center justify-center flex-shrink-0">
                <span className="text-xs text-destructive-foreground">✕</span>
              </div>
            )}

            {/* Section heading */}
            <span
              className={cn(
                'flex-1 truncate',
                section.status === 'pending' && 'text-muted-foreground',
                section.status === 'writing' && 'font-medium',
                section.status === 'failed' && 'text-destructive'
              )}
            >
              {section.heading}
            </span>

            {/* Status text */}
            <span className="text-xs text-muted-foreground">
              {section.status === 'completed' && 'Done'}
              {section.status === 'writing' && 'Writing...'}
              {section.status === 'failed' && 'Failed'}
            </span>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <Progress value={progress} className="h-2" />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{Math.round(progress)}% complete</span>
          <span>
            {sections.filter(s => s.status === 'completed').length}/{totalSections} sections
          </span>
        </div>
      </div>
    </Card>
  );
}

export default WritingProgress;
```

---

### 2. Update ArtifactEditor Component

**Location**: `frontend/src/features/portfolio/components/artifact/ArtifactEditor.tsx`

Add approve skeleton and approve content buttons:

```tsx
import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

export function ArtifactEditor({ artifactId, content, status, onUpdate }: ArtifactEditorProps) {
  const [isApproving, setIsApproving] = useState(false);
  const { toast } = useToast();

  const handleApproveSkeleton = async () => {
    setIsApproving(true);
    try {
      await api.post(`/api/artifacts/${artifactId}/skeleton/approve`);
      toast({
        title: 'Skeleton Approved',
        description: 'Content writing will begin shortly.',
      });
      onUpdate?.();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Approval Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleApproveContent = async () => {
    setIsApproving(true);
    try {
      await api.post(`/api/artifacts/${artifactId}/content/approve`);
      toast({
        title: 'Content Approved',
        description: 'Image generation will begin in Phase 3.',
      });
      onUpdate?.();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Approval Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b px-4 py-2 bg-background">
        <div className="flex items-center gap-2">
          {/* ... existing toolbar items ... */}
        </div>

        <div className="flex items-center gap-2">
          {/* Approve Skeleton button */}
          {status === 'skeleton_ready' && (
            <Button
              variant="default"
              size="sm"
              onClick={handleApproveSkeleton}
              disabled={isApproving || !content}
              className="gap-2"
            >
              {isApproving ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <Check className="h-3 w-3" />
                  Approve Skeleton
                </>
              )}
            </Button>
          )}

          {/* Approve Content button */}
          {status === 'review_ready' && (
            <Button
              variant="default"
              size="sm"
              onClick={handleApproveContent}
              disabled={isApproving}
              className="gap-2"
            >
              {isApproving ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <Check className="h-3 w-3" />
                  Approve Content
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Editor content */}
      <div className="flex-1 overflow-auto">
        {/* ... existing editor implementation ... */}
      </div>
    </div>
  );
}
```

---

### 3. Update Types

**Location**: `frontend/src/features/portfolio/types/portfolio.ts`

```typescript
// Update artifact statuses (add Phase 2 statuses)
export type ArtifactStatus =
  | 'draft'
  | 'researching'
  | 'skeleton_ready'
  | 'skeleton_approved'
  | 'writing'                  // NEW
  | 'humanity_checking'        // NEW
  | 'review_ready'             // NEW
  | 'content_approved'         // NEW
  | 'identifying_images'
  | 'generating_placeholders'
  | 'placeholder_review'
  | 'generating_images'
  | 'complete'
  | 'ready'
  | 'published';
```

---

## Testing Requirements

### Unit Tests

**Backend Tests**:

1. `contentWritingTools.test.ts`:
   - Test `buildContentPrompt()` for each tone
   - Test `getTemperatureForTone()` returns correct values
   - Test `getMaxTokensForType()` returns correct values
   - Test section content generation

2. `humanityCheckTools.test.ts`:
   - Test `loadHumanizerPatterns()` success and fallback
   - Test `buildHumanityCheckPrompt()` format
   - Test pattern detection and removal

3. `geminiClient.test.ts`:
   - Test Gemini API initialization
   - Test content generation
   - Test streaming generation

**Frontend Tests**:

1. `WritingProgress.test.tsx`:
   - Test section status rendering
   - Test progress calculation
   - Test all 4 section states (pending, writing, completed, failed)

2. `ArtifactEditor.test.tsx`:
   - Test approve skeleton button (status = skeleton_ready)
   - Test approve content button (status = review_ready)
   - Test button disabled states

---

### Integration Tests

1. Test content writing workflow:
   - POST `/api/artifacts/:id/content/start`
   - Verify status changed to 'writing'
   - Verify AI writes sections
   - Verify humanity check applied
   - Verify status changed to 'review_ready'

2. Test content approval:
   - POST `/api/artifacts/:id/content/approve`
   - Verify status changed to 'content_approved'

---

### E2E Tests (Playwright)

1. **Skeleton Approval → Content Writing**:
   - User opens artifact with skeleton
   - User clicks "Approve Skeleton"
   - Verify status changes to 'writing'
   - Verify progress indicator shows
   - Wait for content writing completion
   - Verify status changes to 'review_ready'
   - Verify content visible in editor

2. **Content Approval**:
   - User reviews content
   - User clicks "Approve Content"
   - Verify status changes to 'content_approved'
   - Verify toast notification shown

3. **Tone Application**:
   - User creates skeleton with "casual" tone
   - User approves skeleton
   - Verify generated content matches casual tone (contractions, simple language)

---

## Validation Commands

### Backend

```bash
# 1. Install Gemini SDK
cd backend && npm install @google/generative-ai

# 2. TypeScript compilation
npm run build

# 3. Verify Gemini client
node -e "import('./dist/lib/geminiClient.js').then(m => console.log('GeminiClient loaded'))"

# 4. Run tests
npm run test:unit
```

### Frontend

```bash
# 1. TypeScript compilation
cd frontend && npm run build

# 2. Verify components
grep -r "WritingProgress" frontend/src/features/portfolio/

# 3. Run tests
npm run test:unit
```

### Database

```bash
# Verify new statuses
mcp__supabase__execute_sql({
  project_id: "ohwubfmipnpguunryopl",
  query: "SELECT unnest(enum_range(NULL::artifact_status))"
})
# Expected: writing, humanity_checking, review_ready, content_approved
```

---

## Deployment Checklist

- [ ] Gemini API key configured in `backend/.env`
- [ ] Database migration applied (`003_add_content_writing_statuses.sql`)
- [ ] Gemini client created (`geminiClient.ts`)
- [ ] Content writing tools created (writeContentSection, applyHumanityCheck)
- [ ] Tools registered in AIService
- [ ] System prompts updated
- [ ] Content writing controller and routes created
- [ ] WritingProgress component created
- [ ] ArtifactEditor updated with approval buttons
- [ ] Types updated (new statuses)
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Build succeeds (backend + frontend)

---

## Known Limitations

1. **Humanizer Skill**: Requires `.claude/skills/humanizer/SKILL.md` file. Uses fallback patterns if not found.

2. **Streaming Implementation**: Initial version uses batch generation. Streaming to frontend requires WebSocket or SSE implementation.

3. **Section Parsing**: Assumes H2 headings as section boundaries. May need enhancement for complex skeletons.

4. **Retry Logic**: First iteration doesn't retry failed sections automatically. User must manually retry.

---

## Next Steps (After Phase 2 Complete)

Proceed to **Phase 3**: Graphics & Completion
- Configure Gemini Nano Banana
- Implement image needs identification
- Implement placeholder generation
- Implement final image generation
- Add completion notification system

---

**Spec Status**: Ready for Implementation
**Awaiting**: Phase 1 completion + User approval for Phase 2
