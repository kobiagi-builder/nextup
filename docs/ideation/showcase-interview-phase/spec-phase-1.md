# Implementation Spec: Showcase Interview Phase - Phase 1

**PRD**: ./prd-phase-1.md
**Estimated Effort**: L (Large)

## Technical Approach

The interview phase is a chat-driven flow, not a pipeline-driven flow. The AI agent orchestrates the interview through the existing `POST /api/ai/chat/stream` endpoint using two new tools and updated system prompt instructions. No new API routes are needed.

The key design decision is that the interview is orchestrated entirely by Claude's reasoning, guided by system prompt instructions. Coverage scoring happens inside Claude's reasoning (not as a separate API call). The two tools (`startShowcaseInterview` and `completeShowcaseInterview`) handle database operations (status transitions, data persistence) while Claude handles question generation, follow-up logic, and brief synthesis.

This approach is chosen because: (1) it reuses the existing chat infrastructure with zero frontend changes to the chat mechanism, (2) it keeps the conversation natural (Claude controls pacing), and (3) it avoids building a separate stateful interview engine.

## File Changes

### New Files

| File Path | Purpose |
|-----------|---------|
| `backend/src/services/ai/tools/interviewTools.ts` | Two AI tools: `startShowcaseInterview` and `completeShowcaseInterview` with coverage scoring types |

### Modified Files

| File Path | Changes |
|-----------|---------|
| `backend/src/types/portfolio.ts` | Add `interviewing` to `ArtifactStatus` union type |
| `frontend/src/features/portfolio/types/portfolio.ts` | Add `interviewing` to `ArtifactStatus`, update `ARTIFACT_TRANSITIONS` |
| `frontend/src/features/portfolio/validators/stateMachine.ts` | Add `interviewing` to `STATUS_COLORS`, `STATUS_ICONS`, `STATUS_LABELS`, `PROCESSING_STATES` |
| `backend/src/services/ai/tools/index.ts` | Export new interview tools |
| `backend/src/services/ai/AIService.ts` | Register interview tools in `AVAILABLE_TOOLS` |
| `backend/src/services/ai/prompts/systemPrompts.ts` | Add interview orchestration instructions for showcase artifacts |
| `backend/src/services/ai/tools/researchTools.ts` | Allow `conductDeepResearch` to accept artifacts in `interviewing` status (transition `interviewing` -> `research`) |
| `backend/src/services/ai/PipelineExecutor.ts` | Update first step `expectedStatusBefore` to also accept `interviewing` for showcases |

### Database Migration

Applied via Supabase MCP `apply_migration` tool.

## Implementation Details

### 1. Database Migration: `artifact_interviews` Table

**Overview**: Create the interview data table and add `interviewing` to the allowed artifact statuses.

```sql
-- Create artifact_interviews table
CREATE TABLE artifact_interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  dimension TEXT NOT NULL CHECK (dimension IN (
    'case_context', 'problem_challenge', 'approach_methodology',
    'results_outcomes', 'lessons_insights'
  )),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  coverage_scores JSONB NOT NULL DEFAULT '{
    "case_context": 0,
    "problem_challenge": 0,
    "approach_methodology": 0,
    "results_outcomes": 0,
    "lessons_insights": 0
  }'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups by artifact
CREATE INDEX idx_artifact_interviews_artifact_id ON artifact_interviews(artifact_id);

-- Unique constraint: one entry per question number per artifact
CREATE UNIQUE INDEX idx_artifact_interviews_unique_question
  ON artifact_interviews(artifact_id, question_number);

-- RLS policies
ALTER TABLE artifact_interviews ENABLE ROW LEVEL SECURITY;

-- Users can read interviews for their own artifacts
CREATE POLICY "Users can view own artifact interviews"
  ON artifact_interviews FOR SELECT
  USING (
    artifact_id IN (
      SELECT id FROM artifacts WHERE user_id = auth.uid()
    )
  );

-- Service role can insert/update (tools run with service role)
CREATE POLICY "Service role full access on artifact_interviews"
  ON artifact_interviews FOR ALL
  USING (auth.role() = 'service_role');
```

**Key decisions**:
- `ON DELETE CASCADE` ensures interview data is cleaned up when artifacts are deleted
- RLS mirrors the existing artifact security model
- Coverage scores stored as JSONB per row to enable score-over-time analysis

### 2. Backend Type Updates

**Pattern to follow**: Existing `ArtifactStatus` in `backend/src/types/portfolio.ts`

**Overview**: Add `interviewing` to the status union.

```typescript
// backend/src/types/portfolio.ts
export type ArtifactStatus =
  | 'draft'
  | 'interviewing'            // NEW: AI interviewing user about showcase
  | 'research'
  | 'foundations'
  | 'skeleton'
  | 'foundations_approval'
  | 'writing'
  | 'humanity_checking'
  | 'creating_visuals'
  | 'ready'
  | 'published'
```

**Implementation steps**:
1. Add `'interviewing'` after `'draft'` in the `ArtifactStatus` type union

### 3. Frontend Type & State Machine Updates

**Pattern to follow**: Existing status definitions in `frontend/src/features/portfolio/types/portfolio.ts` and `stateMachine.ts`

**Overview**: Add `interviewing` status with transitions, colors, icons, labels, and processing state.

```typescript
// frontend/src/features/portfolio/types/portfolio.ts
export type ArtifactStatus =
  | 'draft'
  | 'interviewing'            // NEW
  | 'research'
  // ... rest unchanged

export const ARTIFACT_TRANSITIONS: Record<ArtifactStatus, ArtifactStatus[]> = {
  draft: ['research', 'interviewing'],   // CHANGED: add interviewing
  interviewing: ['research'],             // NEW: interview -> research
  research: ['foundations'],
  // ... rest unchanged
}
```

```typescript
// frontend/src/features/portfolio/validators/stateMachine.ts

// Add to STATUS_COLORS
interviewing: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',

// Add to STATUS_ICONS
interviewing: 'MessageCircleQuestion',

// Add to STATUS_LABELS
interviewing: 'Interviewing',

// Add to PROCESSING_STATES array
export const PROCESSING_STATES: ArtifactStatus[] = [
  'interviewing',  // NEW - but note: chat must remain interactive
  'research', 'foundations', 'skeleton', 'writing', 'humanity_checking', 'creating_visuals'
]
```

**Key decisions**:
- `draft` can transition to both `research` (for blogs/social posts) and `interviewing` (for showcases)
- `interviewing` is in `PROCESSING_STATES` to lock the editor, but the chat panel remains interactive (chat is always active regardless of processing state)
- Indigo color chosen to differentiate from the blue research/foundations states

**Implementation steps**:
1. Add `interviewing` to `ArtifactStatus` type
2. Update `ARTIFACT_TRANSITIONS` - add `interviewing` to `draft`'s targets, add `interviewing` entry
3. Add entries to all 4 status maps in `stateMachine.ts`
4. Add to `PROCESSING_STATES` array

### 4. Interview Tools (`interviewTools.ts`)

**Pattern to follow**: `backend/src/services/ai/tools/profileTools.ts` (simple tool with Supabase queries)

**Overview**: Two tools - one to start the interview (status transition + first question context), one to complete it (save all Q&A + synthesize brief + transition to research).

```typescript
// backend/src/services/ai/tools/interviewTools.ts

import { tool } from 'ai';
import { z } from 'zod';
import { supabaseAdmin } from '../../../lib/supabase.js';
import { logger, logToFile } from '../../../lib/logger.js';

// Coverage dimension enum
const DIMENSIONS = [
  'case_context',
  'problem_challenge',
  'approach_methodology',
  'results_outcomes',
  'lessons_insights',
] as const;

// Coverage scores schema (reused in both tools)
const coverageScoresSchema = z.object({
  case_context: z.number().min(0).max(20),
  problem_challenge: z.number().min(0).max(20),
  approach_methodology: z.number().min(0).max(20),
  results_outcomes: z.number().min(0).max(20),
  lessons_insights: z.number().min(0).max(20),
});

export const startShowcaseInterview = tool({
  description: 'Start a showcase interview for an artifact. Call this when a showcase artifact needs content creation. Validates the artifact is a showcase in draft status, transitions to interviewing, and returns user profile context for adaptive questioning.',
  inputSchema: z.object({
    artifactId: z.string().describe('The artifact ID from screenContext'),
  }),
  execute: async ({ artifactId }) => {
    logToFile('TOOL EXECUTED: startShowcaseInterview', { artifactId });

    // 1. Validate artifact exists, is showcase, is in draft status
    const { data: artifact, error: fetchError } = await supabaseAdmin
      .from('artifacts')
      .select('id, type, status, title, content, metadata')
      .eq('id', artifactId)
      .single();

    if (fetchError || !artifact) {
      return { success: false, error: 'Artifact not found' };
    }

    if (artifact.type !== 'showcase') {
      return { success: false, error: `Interview is only for showcase artifacts. This is a ${artifact.type}.` };
    }

    if (artifact.status !== 'draft') {
      return { success: false, error: `Artifact must be in draft status to start interview. Current: ${artifact.status}` };
    }

    // 2. Transition to interviewing
    const { error: updateError } = await supabaseAdmin
      .from('artifacts')
      .update({
        status: 'interviewing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', artifactId);

    if (updateError) {
      return { success: false, error: `Failed to update status: ${updateError.message}` };
    }

    logger.info('[Artifact status] status changed', {
      artifactId,
      title: artifact.title || 'Untitled',
      previousStatus: 'draft',
      newStatus: 'interviewing',
    });

    // 3. Fetch user profile for adaptive questioning
    const { data: userContext } = await supabaseAdmin
      .from('user_context')
      .select('about_me, profession, customers, goals')
      .limit(1)
      .single();

    const { data: skills } = await supabaseAdmin
      .from('skills')
      .select('name, category, proficiency, years_experience')
      .order('proficiency', { ascending: false });

    return {
      success: true,
      statusTransition: { from: 'draft', to: 'interviewing' },
      artifactTitle: artifact.title,
      artifactDescription: artifact.content, // Initial description if any
      userProfile: userContext ? {
        aboutMe: userContext.about_me,
        profession: userContext.profession,
        customers: userContext.customers,
        goals: userContext.goals,
      } : null,
      userSkills: skills?.map(s => ({
        name: s.name,
        category: s.category,
        proficiency: s.proficiency,
        yearsExperience: s.years_experience,
      })) || [],
      initialCoverageScores: {
        case_context: 0,
        problem_challenge: 0,
        approach_methodology: 0,
        results_outcomes: 0,
        lessons_insights: 0,
      },
      instructions: 'Interview started. Ask the first question targeting the lowest coverage dimension. Use the user profile to ask adaptive, targeted questions.',
    };
  },
});

export const completeShowcaseInterview = tool({
  description: 'Complete a showcase interview. Call this after coverage score reaches >=95 and the user confirms the summary. Saves all Q&A pairs, synthesizes the author brief, and stores it for the research phase.',
  inputSchema: z.object({
    artifactId: z.string().describe('The artifact ID'),
    interviewPairs: z.array(z.object({
      questionNumber: z.number(),
      dimension: z.enum(DIMENSIONS),
      question: z.string(),
      answer: z.string(),
    })).describe('All Q&A pairs from the interview'),
    coverageScores: coverageScoresSchema.describe('Final coverage scores'),
    synthesizedBrief: z.string().describe('The comprehensive brief synthesized from all answers. This becomes the author_brief for the research phase.'),
  }),
  execute: async ({ artifactId, interviewPairs, coverageScores, synthesizedBrief }) => {
    logToFile('TOOL EXECUTED: completeShowcaseInterview', {
      artifactId,
      pairCount: interviewPairs.length,
      totalScore: Object.values(coverageScores).reduce((a, b) => a + b, 0),
    });

    // 1. Validate artifact is in interviewing status
    const { data: artifact, error: fetchError } = await supabaseAdmin
      .from('artifacts')
      .select('id, status, title')
      .eq('id', artifactId)
      .single();

    if (fetchError || !artifact) {
      return { success: false, error: 'Artifact not found' };
    }

    if (artifact.status !== 'interviewing') {
      return { success: false, error: `Expected interviewing status, got: ${artifact.status}` };
    }

    // 2. Save all Q&A pairs to artifact_interviews
    const rows = interviewPairs.map(pair => ({
      artifact_id: artifactId,
      question_number: pair.questionNumber,
      dimension: pair.dimension,
      question: pair.question,
      answer: pair.answer,
      coverage_scores: coverageScores,
    }));

    const { error: insertError } = await supabaseAdmin
      .from('artifact_interviews')
      .insert(rows);

    if (insertError) {
      logger.error('[completeShowcaseInterview] Failed to save interview pairs', {
        error: insertError.message,
      });
      return { success: false, error: `Failed to save interview data: ${insertError.message}` };
    }

    // 3. Store synthesized brief in artifacts.metadata.author_brief
    //    This is the same field used by conductDeepResearch and downstream tools
    const { data: currentArtifact } = await supabaseAdmin
      .from('artifacts')
      .select('metadata')
      .eq('id', artifactId)
      .single();

    const updatedMetadata = {
      ...(currentArtifact?.metadata || {}),
      author_brief: synthesizedBrief,
      interview_completed: true,
      interview_coverage_scores: coverageScores,
      interview_question_count: interviewPairs.length,
    };

    const { error: updateError } = await supabaseAdmin
      .from('artifacts')
      .update({
        metadata: updatedMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', artifactId);

    if (updateError) {
      return { success: false, error: `Failed to update artifact metadata: ${updateError.message}` };
    }

    logger.info('[completeShowcaseInterview] Interview completed', {
      artifactId,
      title: artifact.title || 'Untitled',
      questionCount: interviewPairs.length,
      totalScore: Object.values(coverageScores).reduce((a, b) => a + b, 0),
    });

    // NOTE: Status stays as 'interviewing' here.
    // conductDeepResearch will transition from 'interviewing' -> 'research'
    // This is called by Claude immediately after completeShowcaseInterview.

    return {
      success: true,
      briefSaved: true,
      questionCount: interviewPairs.length,
      totalCoverageScore: Object.values(coverageScores).reduce((a, b) => a + b, 0),
      instructions: 'Interview data saved. Now call conductDeepResearch with the artifactId to begin the research phase. The synthesized brief is already stored as author_brief.',
    };
  },
});
```

**Key decisions**:
- `startShowcaseInterview` fetches user profile and returns it to Claude so Claude can use it for adaptive questioning without making additional tool calls
- `completeShowcaseInterview` saves all Q&A pairs in a single batch (Phase 2 adds incremental saving)
- The synthesized brief is stored in `artifacts.metadata.author_brief` - the same field already used by `conductDeepResearch`, `generateContentSkeleton`, and `writeFullContent`. This means zero changes to downstream tools
- Status stays at `interviewing` after completion; `conductDeepResearch` handles the `interviewing` -> `research` transition

**Implementation steps**:
1. Create the file with both tool definitions
2. Define coverage dimension types and Zod schemas
3. Implement `startShowcaseInterview` with validation, status transition, and profile fetching
4. Implement `completeShowcaseInterview` with Q&A persistence and brief storage

### 5. Tool Registration

**Pattern to follow**: Existing registrations in `AIService.ts` and `index.ts`

```typescript
// backend/src/services/ai/tools/index.ts - add export
export {
  startShowcaseInterview,
  completeShowcaseInterview,
} from './interviewTools.js'

// backend/src/services/ai/AIService.ts - add to AVAILABLE_TOOLS
// Interview tools (showcase-specific)
startShowcaseInterview: interviewTools.startShowcaseInterview,
completeShowcaseInterview: interviewTools.completeShowcaseInterview,
```

Also add the import at the top of `AIService.ts`:
```typescript
import * as interviewTools from './tools/interviewTools.js'
```

**Implementation steps**:
1. Add exports to `index.ts`
2. Add import to `AIService.ts`
3. Register both tools in `AVAILABLE_TOOLS`

### 6. System Prompt: Interview Orchestration

**Pattern to follow**: Existing `getBaseSystemPrompt()` in `systemPrompts.ts`

**Overview**: Add conditional interview instructions that activate when the artifact is a showcase in `draft` or `interviewing` status. This is the most critical piece - it tells Claude exactly how to conduct the interview.

The instructions should be injected in the screen context section (after line ~131 in `systemPrompts.ts`), inside the `if (screenContext.artifactId)` block, when `screenContext.artifactType === 'showcase'`.

```typescript
// Add after the existing screenContext.artifactId block (~line 131)

if (screenContext.artifactType === 'showcase' &&
    ['draft', 'interviewing'].includes(screenContext.artifactStatus || '')) {
  prompt += `
## SHOWCASE INTERVIEW MODE

This is a **showcase** artifact. Showcases tell the story of a REAL, SPECIFIC case.
Before research and writing can begin, you MUST conduct an interview to extract the full case details.

### Interview Flow

**When artifact status is "draft" and user triggers "Create content:":**
1. Call \`startShowcaseInterview\` with the artifactId from screenContext
2. Use the returned user profile to adapt your questions
3. Ask your FIRST question targeting the lowest-coverage dimension

**When artifact status is "interviewing" (interview in progress):**
1. After each user answer, internally update your coverage scores for all 5 dimensions
2. Ask the NEXT question targeting the lowest-scoring dimension
3. Continue until total coverage >= 95/100 or 15 questions asked

### Coverage Dimensions (score each 0-20)

1. **Case Context** (0-20): Client/project identity, industry, timeline, engagement type, team size
2. **Problem/Challenge** (0-20): The specific problem, its business impact, what had been tried, why it was hard
3. **Approach/Methodology** (0-20): What was done, why this approach, what made it unique, tools/frameworks used
4. **Results/Outcomes** (0-20): Measurable results, metrics before/after, ROI, client reaction, timeline to results
5. **Lessons/Insights** (0-20): What was learned, what would be done differently, transferable insight, surprising findings

### Scoring Guidelines

- 0-5: Not mentioned at all or only vaguely referenced
- 6-10: Basic information provided but lacks specifics (no numbers, no names, no concrete examples)
- 11-15: Good detail with some specifics (has metrics OR examples, but not both)
- 16-20: Excellent detail with concrete specifics (has metrics AND examples AND context)

### Question Strategy

**Rules:**
- Ask ONE question at a time. Never list multiple questions.
- Keep questions conversational and natural. You're a curious colleague, not a form.
- Use the user's profile to skip what you already know (don't ask "what do you do?" if profession is set)
- When an answer is vague, ask a follow-up: "Can you be more specific about the results? For example, were there measurable improvements in [relevant metric]?"
- When an answer reveals something interesting, probe deeper: "That's fascinating. What specifically about [detail] made the difference?"
- Vary your question style: open-ended, specific, comparative ("How did this compare to similar projects?")

**First question:** Always start with Case Context - ask about the project/engagement in a way that gets the user talking naturally. Example: "Tell me about this project - what was the engagement about and who were you working with?"

**Transition signals:** When moving between dimensions, briefly acknowledge what you've learned: "Great, I have a clear picture of the challenge. Now I'm curious about your approach..."

### Completion Flow

When total score >= 95/100 (or 15 questions reached):
1. Synthesize ALL answers into a comprehensive, structured brief (500-1000 words)
2. The brief should be organized by dimension but read as a coherent narrative
3. Present the summary in chat: "Here's what I've captured from our conversation: [summary]"
4. Ask: "Does this capture your case accurately? Anything to add or correct?"
5. If user confirms (or provides minor corrections), call \`completeShowcaseInterview\` with all Q&A pairs, final scores, and the synthesized brief
6. Then IMMEDIATELY call \`conductDeepResearch\` with the artifactId - the brief is already stored as author_brief

### CRITICAL: Override "Create content:" detection for showcases

When a "Create content:" message arrives for a showcase artifact:
- Do NOT call conductDeepResearch directly
- INSTEAD call startShowcaseInterview first
- The interview MUST happen before research begins
`
}
```

**Key decisions**:
- The interview instructions override the default "Create content:" detection for showcases specifically
- Coverage scoring is internal to Claude's reasoning (no tool calls for scoring)
- The synthesized brief is written as a narrative, not bullet points, so it flows naturally into the research prompt
- The interview summary confirmation is lightweight (chat-only, no separate UI)

**Implementation steps**:
1. Add the showcase interview conditional block after the existing screenContext injection
2. Ensure the `Create content:` override section is clear and takes precedence for showcases
3. Test that the prompt is only injected for showcase artifacts in draft/interviewing status

### 7. Research Tools Update

**Pattern to follow**: Existing `conductDeepResearch` in `researchTools.ts`

**Overview**: Allow `conductDeepResearch` to accept artifacts in `interviewing` status and transition to `research`. Currently it expects `draft` status.

Find the status validation in `conductDeepResearch.execute` and update:

```typescript
// In researchTools.ts, inside conductDeepResearch.execute
// Change the status check from:
if (artifact.status !== 'draft') {
  return { success: false, error: `Expected draft status, got: ${artifact.status}` };
}

// To:
const validStartStatuses = ['draft', 'interviewing'];
if (!validStartStatuses.includes(artifact.status)) {
  return { success: false, error: `Expected draft or interviewing status, got: ${artifact.status}` };
}
```

Also update the `author_brief` logic: if the artifact already has `metadata.author_brief` (set by `completeShowcaseInterview`), use that instead of the `topicDescription` parameter:

```typescript
// When saving author_brief, prefer existing interview brief over topicDescription
const existingBrief = artifact.metadata?.author_brief;
const briefToUse = existingBrief || topicDescription || '';

// Use briefToUse for query generation and metadata storage
```

**Implementation steps**:
1. Update status validation to accept `interviewing`
2. Update `author_brief` logic to prefer existing interview brief
3. Update status transition logging to reflect `interviewing` -> `research` when applicable

### 8. Pipeline Executor Update

**Pattern to follow**: Existing `PIPELINE_STEPS` in `PipelineExecutor.ts`

**Overview**: The first pipeline step (`conductDeepResearch`) currently expects `expectedStatusBefore: 'draft'`. For showcases that went through the interview, the status will be `interviewing`. Since the pipeline's status check is used for checkpoint validation, we need to be flexible here.

However, the interview flow is chat-driven. By the time the pipeline runs (if it runs at all), `conductDeepResearch` has already been called by the chat flow. The pipeline executor is more relevant for the `resumeFromApproval` path. So the change here is minimal:

```typescript
// In PIPELINE_STEPS, update the first step:
{
  toolName: 'conductDeepResearch',
  execute: async (artifactId: string) => { /* ... unchanged ... */ },
  expectedStatusBefore: 'draft',  // Keep as 'draft' - the pipeline is for non-interview flow
  expectedStatusAfter: 'research',
  required: true,
},
```

Actually, no changes needed to PipelineExecutor for Phase 1. The interview flow bypasses the pipeline - it's handled entirely through the chat stream. The pipeline only kicks in for non-showcase artifacts or when explicitly called. The `conductDeepResearch` tool itself handles the status transition.

**Implementation steps**:
1. No changes needed to PipelineExecutor in Phase 1
2. The interview is chat-driven; `conductDeepResearch` is called directly by Claude after the interview

## Data Model

### Schema Changes

```sql
-- New table: artifact_interviews
CREATE TABLE artifact_interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  dimension TEXT NOT NULL CHECK (dimension IN (
    'case_context', 'problem_challenge', 'approach_methodology',
    'results_outcomes', 'lessons_insights'
  )),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  coverage_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_artifact_interviews_artifact_id ON artifact_interviews(artifact_id);
CREATE UNIQUE INDEX idx_artifact_interviews_unique_question ON artifact_interviews(artifact_id, question_number);
```

### Metadata Shape

```typescript
// artifacts.metadata additions (no schema change needed - JSONB)
interface ArtifactMetadata {
  // ... existing fields ...
  author_brief?: string;            // Existing - now populated by interview
  interview_completed?: boolean;     // NEW: flag for downstream tools
  interview_coverage_scores?: {      // NEW: final scores
    case_context: number;
    problem_challenge: number;
    approach_methodology: number;
    results_outcomes: number;
    lessons_insights: number;
  };
  interview_question_count?: number; // NEW: how many questions were asked
}
```

## Testing Requirements

### Unit Tests

| Test File | Coverage |
|-----------|----------|
| `backend/src/__tests__/unit/services/ai/tools/interviewTools.test.ts` | `startShowcaseInterview` and `completeShowcaseInterview` tool execution |

**Key test cases**:
- `startShowcaseInterview` validates artifact is a showcase in draft status
- `startShowcaseInterview` rejects non-showcase artifacts
- `startShowcaseInterview` rejects non-draft status artifacts
- `startShowcaseInterview` transitions status to `interviewing`
- `startShowcaseInterview` returns user profile and skills
- `completeShowcaseInterview` saves Q&A pairs to `artifact_interviews`
- `completeShowcaseInterview` stores synthesized brief in `artifacts.metadata.author_brief`
- `completeShowcaseInterview` rejects non-interviewing status
- `completeShowcaseInterview` handles empty interview pairs gracefully
- `conductDeepResearch` accepts `interviewing` status and transitions to `research`
- `conductDeepResearch` uses existing `author_brief` from interview when available

### Integration Tests

| Test File | Coverage |
|-----------|----------|
| `backend/src/__tests__/integration/interviewPipeline.integration.test.ts` | Full interview -> research -> skeleton flow |

**Key scenarios**:
- Happy path: start interview -> complete interview -> conduct research -> verify enriched brief flows through
- Showcase detection: verify non-showcase artifacts skip interview
- State transitions: `draft` -> `interviewing` -> `research` (via `conductDeepResearch`)
- Data integrity: Q&A pairs match what was submitted, brief stored correctly

### Manual Testing

- [ ] Create a showcase artifact and trigger "Create content"
- [ ] Verify the AI starts an interview (asks a question, doesn't start research)
- [ ] Answer 5-8 questions and verify the AI asks follow-up questions
- [ ] Verify the AI presents a summary when it determines coverage is sufficient
- [ ] Confirm the summary and verify research begins with the enriched brief
- [ ] Create a blog artifact and verify the interview is skipped (goes straight to research)
- [ ] Verify the `interviewing` status appears correctly in the frontend (color, icon, label)

## Error Handling

| Error Scenario | Handling Strategy |
|----------------|-------------------|
| Artifact not found | Return `{ success: false, error: 'Artifact not found' }` from tools |
| Non-showcase artifact triggers interview | Tool returns error, Claude falls back to direct research |
| Database insert fails for Q&A pairs | Return error from tool, Claude reports to user |
| `conductDeepResearch` called on artifact without `author_brief` | Falls back to `topicDescription` parameter (existing behavior) |
| User sends messages during interview that aren't answers | System prompt instructs Claude to stay on track, acknowledge the message, and re-ask the question |

## Validation Commands

```bash
# Type checking
cd backend && npx tsc --noEmit
cd frontend && npx tsc --noEmit

# Unit tests
cd backend && npm run test:unit

# Integration tests
cd backend && npm run test:integration

# Full build
npm run build
```

## Rollout Considerations

- **Feature flag**: Not needed - the interview only activates for showcase artifacts via system prompt logic. Existing blog/social post flows are unchanged.
- **Monitoring**: Check Supabase logs for `startShowcaseInterview` and `completeShowcaseInterview` tool calls. Monitor `artifact_interviews` table for data growth.
- **Rollback plan**: Remove interview tools from `AVAILABLE_TOOLS` in `AIService.ts` and revert the system prompt changes. The `interviewing` status and `artifact_interviews` table can remain (unused but harmless).

---

*This spec is ready for implementation. Follow the patterns and validate at each step.*
