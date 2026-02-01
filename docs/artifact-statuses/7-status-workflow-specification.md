# 9-Status Workflow Specification

**Version:** 3.0.0
**Last Updated:** 2026-01-29
**Status:** Complete (Phase 4 Writing Quality Enhancement)

> **⚠️ IMPORTANT UPDATE**: This document has been updated from 7-status to 9-status workflow as of Phase 4. The new workflow introduces `foundations` and `foundations_approval` statuses with a user approval gate for writing quality enhancement.
>
> **See Also**: [status-flow-reference.md](./status-flow-reference.md) (v3.0.0) for the detailed 9-status reference.

## Overview

The 9-status workflow is a linear, AI-driven content creation pipeline that guides artifacts from draft to publication. **Phase 4 introduced a user approval gate** after skeleton generation, where users review writing characteristics and the content skeleton before continuing to content writing.

**Key Characteristics:**
- **Linear Progression** - Single path from draft to published with one approval gate
- **Approval Gate** - User reviews foundations (skeleton + characteristics) before writing
- **Auto-Transitions** - AI automatically advances between processing states (except at approval)
- **Editor Locking** - Editor locked during AI processing (research, foundations, writing, creating_visuals)
- **Skeleton Editing** - Skeleton is EDITABLE in FoundationsSection during `foundations_approval` status
- **Three Editable States** - Users can edit in draft, ready, and published states
- **Auto-Revert** - Editing published content automatically reverts to ready

---

## Status Overview

### Complete Workflow (Phase 4)

```
draft → research → foundations → skeleton → foundations_approval → [UI BUTTON] → writing → creating_visuals → ready → published
                                                                                                                          ↓
                                                                                                                       ready (on edit)
```

**Phase 4 Approval Gate**: After skeleton generation, the status changes to `foundations_approval` and the pipeline PAUSES. User reviews:
1. Writing characteristics (tone, voice, structure, etc.)
2. Content skeleton (editable in FoundationsSection)
3. Clicks "Foundations Approved" button to continue

### Status Categories

**Editable States** (3 states):
- `draft` - Initial state, user can edit before AI starts
- `ready` - Content complete, user can edit and review
- `published` - Published content, editable (reverts to ready on edit)

**Processing States** (4 states) - Editor locked, AI working:
- `research` - AI researching topic from multiple sources (15% progress)
- `foundations` - AI analyzing writing characteristics (30% progress)
- `writing` - AI writing full content for each section (70% progress)
- `creating_visuals` - AI generating cover image/visuals (90% progress)

**Approval States** (2 states) - Pipeline paused:
- `skeleton` - AI generating H1 title + H2 section headings (45% progress)
- `foundations_approval` - User reviews skeleton + characteristics (50% progress, **REQUIRES USER APPROVAL**)

---

## Status Definitions

### 1. draft

**User-Facing Label:** "Draft"

**Description:**
- Artifact created but AI content generation not started
- User can edit title and content manually
- Starting point for content creation

**Editor State:** Unlocked (editable)

**Processing:** No

**Available User Actions:**
- Edit title
- Edit content
- Click "Create Content" to start AI workflow
- Delete artifact

**Backend Operations:**
- Store artifact with `status = 'draft'`
- No AI processing

**Frontend Behavior:**
- Render editable editor
- Show "Create Content" button
- No polling active
- No WritingProgress component

**Transition Out:**
```typescript
// User clicks "Create Content"
await updateArtifact({ id, status: 'research' })
await conductDeepResearch({ artifactId: id, minRequired: 5 })
```

**Transition In:**
- From nowhere (initial creation)

---

### 2. research

**User-Facing Label:** "Creating the Foundations" (15% progress)

**Description:**
- AI conducting deep research on the artifact topic
- Querying multiple sources (Reddit, LinkedIn, Quora, Medium, Substack)
- Extracting relevant excerpts with relevance scores
- Storing research in artifact_research table

**Editor State:** Locked (read-only)

**Processing:** Yes (AI active, 15% progress)

**Available User Actions:**
- None (wait for completion)

**Backend Operations:**
```typescript
// Tool: conductDeepResearch
const result = await conductDeepResearch.execute({
  artifactId,
  minRequired: 5
})

// Tavily API queries:
// - Search for topic with domain filters
// - Rank results by relevance
// - Extract top 5-7 sources
// - Store in artifact_research table

// Status transitions automatically on completion (Phase 4)
await updateArtifact({ id, status: 'foundations' })  // NOT 'skeleton'
await analyzeWritingCharacteristics({ artifactId: id })
```

**Frontend Behavior:**
- Editor locked (no editing)
- WritingProgress visible (15% complete)
- ResearchArea shows loading state
- Polling active (every 2 seconds)

**Transition Out:**
```typescript
// Auto-transition when research completes (Phase 4)
await updateArtifact({ id, status: 'foundations' })
await analyzeWritingCharacteristics({ artifactId: id })
```

**Transition In:**
- From `draft` (user clicks "Create Content")

---

### 3. foundations (Phase 4 NEW)

**User-Facing Label:** "Creating the Foundations" (30% progress)

**Description:**
- AI analyzing writing style from user's writing examples
- Extracting 20+ writing characteristics (tone, voice, pacing, structure, etc.)
- Creating style profile for content generation
- Storing characteristics in artifact_writing_characteristics table

**Editor State:** Locked (read-only)

**Processing:** Yes (AI active, 30% progress)

**Available User Actions:**
- None (wait for completion)

**Backend Operations:**
```typescript
// Tool: analyzeWritingCharacteristics
const result = await analyzeWritingCharacteristics.execute({
  artifactId,
  artifactType
})

// Claude analyzes:
// - User's writing examples (500+ words each)
// - User context (profession, goals, audience)
// - Research context
// - Returns 20+ writing characteristics

// Store in artifact_writing_characteristics table
await supabase.from('artifact_writing_characteristics').upsert({
  artifact_id: artifactId,
  characteristics,
  summary,
  recommendations
})

// Status transitions automatically on completion
await updateArtifact({ id, status: 'skeleton' })
await generateContentSkeleton({ artifactId: id, characteristics })
```

**Frontend Behavior:**
- Editor locked (no editing)
- WritingProgress visible (30% complete)
- Polling active (every 2 seconds)

**Transition Out:**
```typescript
// Auto-transition when characteristics analysis completes
await updateArtifact({ id, status: 'skeleton' })
await generateContentSkeleton({ artifactId: id })
```

**Transition In:**
- From `research` (automatic after research completes)

---

### 4. skeleton

**User-Facing Label:** "Creating the Foundations" (45% progress)

**Description:**
- AI generating content structure (H1 title + H2 section headings)
- Using writing characteristics to guide structure
- Creating estimated word counts per section
- Storing skeleton in skeleton_content or artifact.content

**Editor State:** Locked (read-only)

**Processing:** Yes (AI active, 45% progress)

**Available User Actions:**
- None (wait for completion)

**Backend Operations:**
```typescript
// Tool: generateContentSkeleton
const result = await generateContentSkeleton.execute({
  artifactId,
  tone,
  // Phase 4: Uses writing characteristics for structure
  characteristics: await fetchWritingCharacteristics(artifactId)
})

// Claude Sonnet generates:
// # Main Title (H1)
// ## Section 1 (H2)
// [Estimated: 300 words]
// ## Section 2 (H2)
// [Estimated: 400 words]
// ## Section 3 (H2)
// [Estimated: 300 words]

// Store skeleton in artifact (Phase 4: skeleton_content field)
await updateArtifact({ id, skeleton_content: skeleton })

// Status transitions to foundations_approval (Phase 4: PAUSE FOR USER)
await updateArtifact({ id, status: 'foundations_approval' })
```

**Frontend Behavior:**
- Editor locked (shows skeleton as it's generated)
- WritingProgress visible (45% complete, sections list)
- Polling active (every 2 seconds)

**Transition Out:**
```typescript
// Auto-transition to foundations_approval (NOT writing)
await updateArtifact({ id, status: 'foundations_approval' })
// PIPELINE PAUSES - User must approve
```

**Transition In:**
- From `foundations` (automatic after characteristics analysis)

---

### 5. foundations_approval (Phase 4 NEW)

**User-Facing Label:** "Foundations Approval" (50% progress)

**Description:**
- Pipeline PAUSED - waiting for user approval
- User reviews writing characteristics display
- User can EDIT skeleton in FoundationsSection (TipTap editor)
- User clicks "Foundations Approved" button to continue

**Editor State:** Main editor locked, **Skeleton EDITABLE in FoundationsSection**

**Processing:** No (waiting for user)

**Available User Actions:**
- Review writing characteristics
- **Edit skeleton content** (in FoundationsSection)
- Click "Foundations Approved" button to continue
- Cancel and return to draft (if implemented)

**Backend Operations:**
```typescript
// No automatic operations
// User edits skeleton via API:
// PUT /api/artifacts/:id { skeleton_content: editedSkeleton }

// User clicks "Foundations Approved" button:
// POST /api/artifacts/:id/approve-foundations
const result = await pipelineExecutor.resumeFromApproval(artifactId)
// Status changes: foundations_approval → writing
```

**Frontend Behavior:**
- FoundationsSection auto-expanded
- WritingCharacteristicsDisplay shows style profile
- TipTap editor in FoundationsSection is EDITABLE
- "Foundations Approved" button visible and enabled
- No polling (pipeline paused)
- Main ArtifactEditor hidden or locked

**Transition Out:**
```typescript
// User clicks "Foundations Approved" button
await api.post(`/api/artifacts/${id}/approve-foundations`)
// Backend resumes pipeline: foundations_approval → writing
await writeFullContent({ artifactId: id, characteristics })
```

**Transition In:**
- From `skeleton` (automatic after skeleton generation)

---

### 6. writing

**User-Facing Label:** "Writing Content" (70% progress)

**Description:**
- AI writing full content for each section
- Using research excerpts and skeleton structure
- Generating rich, detailed paragraphs
- Applying selected tone (professional, casual, technical, etc.)

**Editor State:** Locked (read-only, content streams in)

**Processing:** Yes (AI active, 75% progress)

**Available User Actions:**
- None (wait for completion)

**Backend Operations:**
```typescript
// Tool: writeFullContent
const result = await writeFullContent.execute({
  artifactId,
  tone: artifact.tone,
  skeleton,
  researchResults
})

// Gemini 2.0 Flash generates full content:
// - Introduction paragraph
// - Section 1: [300-400 words of detailed content]
// - Section 2: [400-500 words of detailed content]
// - Section 3: [300-400 words of detailed content]
// - Conclusion paragraph

// Stream content to artifact.content as it's generated
await updateArtifact({ id, content: fullContent })

// Status transitions automatically on completion
await updateArtifact({ id, status: 'creating_visuals' })
```

**Frontend Behavior:**
- Editor locked (shows content as it streams in)
- WritingProgress visible (75% complete, current section highlighted)
- Polling active (every 2 seconds)
- Content updates in real-time via WebSocket or Realtime

**Transition Out:**
```typescript
// Auto-transition when writing completes
await updateArtifact({ id, status: 'creating_visuals' })
await generateContentVisuals({ artifactId: id })
```

**Transition In:**
- From `skeleton` (automatic after skeleton completes)

---

### 7. creating_visuals

**User-Facing Label:** "Creating Visuals" (90% progress)

**Description:**
- AI extracting `[IMAGE: description]` placeholders from content
- Generating high-quality images using DALL-E 3 (primary) or Gemini Imagen 4 (fallback)
- Uploading images to Supabase storage (`artifacts/{id}/images/final/`)
- Replacing placeholders with embedded image markdown (`![alt](url)`)
- Updating `visuals_metadata` with generation results
- Final processing step before ready

**Editor State:** Locked (read-only)

**Processing:** Yes (AI active, 90% progress)

**Available User Actions:**
- None (wait for completion)
- Optional: "Humanize" button (applies humanity check during processing)

**Backend Operations:**
```typescript
// Tool: identifyImageNeeds (Phase 3 implementation)
const result = await identifyImageNeeds.execute({
  artifactId
})

// Phase 3 Image Generation Flow:
// 1. Extract [IMAGE: ...] placeholders via regex
// 2. Infer purpose (hero, illustration, diagram, photo) from context
// 3. Select optimal resolution based on artifact type and purpose
// 4. Generate images via DALL-E 3 (primary), fallback to Gemini Imagen 4
// 5. Upload to Supabase storage: artifacts/{artifactId}/images/final/{imageId}.png
// 6. Replace placeholders with markdown: ![description](url)
// 7. Update visuals_metadata with phase: complete

await updateArtifact({
  id,
  content: contentWithEmbeddedImages,
  visuals_metadata: {
    phase: { phase: 'complete' },
    needs: imageNeeds,
    finals: finalImages,
    generation_stats: { total_needed, finals_generated, failures }
  }
})

// Status transitions automatically on completion
await updateArtifact({ id, status: 'ready' })

// Optional: Apply humanity check before ready
if (userRequestedHumanityCheck) {
  await applyHumanityCheck({ artifactId: id })
}
```

**visuals_metadata Structure:**
```typescript
interface VisualsMetadata {
  phase: { phase: 'identifying_needs' | 'generating_images' | 'complete' };
  needs: Array<{
    id: string;
    placement_after: string;
    description: string;
    purpose: 'hero' | 'illustration' | 'diagram' | 'photo' | 'screenshot' | 'chart';
    style: 'professional' | 'modern' | 'abstract' | 'realistic';
    approved: boolean;
  }>;
  finals: Array<{
    id: string;
    image_need_id: string;
    url: string;
    storage_path: string;
    resolution: { width: number; height: number };
    file_size_kb: number;
    generated_at: string;
    generation_attempts: number;
  }>;
  generation_stats: {
    total_needed: number;
    finals_generated: number;
    failures: number;
  };
}
```

**Frontend Behavior:**
- Editor locked (shows content, images appear as they're generated)
- WritingProgress visible (90% complete with image generation progress)
- Image generation progress indicator: "Generating images... 2/4"
- Optional "Humanize" button visible
- Polling active (every 2 seconds)

**Transition Out:**
```typescript
// Auto-transition when visuals complete
await updateArtifact({ id, status: 'ready' })

// OR if humanity check applied
await applyHumanityCheck({ artifactId: id })
await updateArtifact({ id, status: 'ready' })
```

**Transition In:**
- From `writing` (automatic after writing completes)

---

### 8. ready

**User-Facing Label:** "Content Ready" (100% progress)

**Description:**
- Content fully generated and ready for review
- User can edit content, apply final touches
- Optional: Apply humanity check to remove AI patterns
- User decides when to publish

**Editor State:** Unlocked (editable)

**Processing:** No

**Available User Actions:**
- Edit title
- Edit content
- Apply humanity check (optional)
- Mark as published
- Delete artifact

**Backend Operations:**
- No automatic processing
- Store user edits
- Optional: Execute applyHumanityCheck tool

**Frontend Behavior:**
- Editor unlocked (fully editable)
- "Mark as Published" button visible
- "Humanize" button visible
- No WritingProgress component
- No polling

**Transition Out:**
```typescript
// User clicks "Mark as Published"
await updateArtifact({ id, status: 'published', published_at: new Date() })
```

**Transition In:**
- From `creating_visuals` (automatic after visuals complete)
- From `published` (automatic when user edits published content)

---

### 9. published

**User-Facing Label:** "Published" (100% progress)

**Description:**
- Content published to target platform
- Final state in workflow
- Still editable (reverts to ready on edit)

**Editor State:** Unlocked (editable, auto-reverts to ready)

**Processing:** No

**Available User Actions:**
- Edit content (auto-transitions to ready)
- View published URL
- Delete artifact

**Backend Operations:**
```typescript
// Auto-transition to ready when user edits
if (userEditedContent && artifact.status === 'published') {
  await updateArtifact({ id, status: 'ready' })
}
```

**Frontend Behavior:**
- Editor unlocked (fully editable)
- Status badge shows "Published"
- Published URL displayed (if available)
- No "Mark as Published" button
- No polling

**Transition Out:**
```typescript
// Auto-transition when user edits content
await updateArtifact({ id, status: 'ready' })
```

**Transition In:**
- From `ready` (user clicks "Mark as Published")

---

## Status Transition Rules

### Valid Transitions (Phase 4 - 9 Status Workflow)

| From | To | Trigger | Auto/Manual | Tool/Operation |
|------|----|---------| ------------|----------------|
| `draft` | `research` | User clicks "Create Content" | Manual | conductDeepResearch |
| `research` | `foundations` | Research completes | Auto | analyzeWritingCharacteristics |
| `foundations` | `skeleton` | Characteristics analysis completes | Auto | generateContentSkeleton |
| `skeleton` | `foundations_approval` | Skeleton generated | Auto | (pipeline pauses) |
| `foundations_approval` | `writing` | User clicks "Foundations Approved" | **Manual (UI)** | writeFullContent |
| `writing` | `creating_visuals` | Writing completes | Auto | identifyImageNeeds |
| `creating_visuals` | `ready` | Visuals complete | Auto | (automatic) |
| `ready` | `published` | User clicks "Mark as Published" | Manual | (manual) |
| `published` | `ready` | User edits content | Auto | (automatic) |

### Phase 4 Key Changes

1. **New `foundations` status**: AI analyzes writing characteristics after research
2. **New `foundations_approval` status**: Pipeline PAUSES for user review
3. **Editable skeleton**: User can edit skeleton in FoundationsSection during `foundations_approval`
4. **UI button approval**: User clicks "Foundations Approved" button to continue (not chat-based)

### Invalid Transitions

```typescript
// Cannot skip research
draft → foundations  ❌
draft → skeleton  ❌

// Cannot skip foundations (Phase 4)
research → skeleton  ❌
research → writing  ❌

// Cannot skip skeleton
foundations → writing  ❌
foundations → foundations_approval  ❌

// Cannot skip approval gate (Phase 4)
skeleton → writing  ❌

// Cannot skip writing
foundations_approval → creating_visuals  ❌

// Cannot skip visuals
writing → ready  ❌

// Cannot go backwards (except published → ready)
ready → writing  ❌
skeleton → research  ❌
writing → skeleton  ❌
foundations_approval → skeleton  ❌
```

### Transition Validation

```typescript
function isValidTransition(
  from: ArtifactStatus,
  to: ArtifactStatus
): boolean {
  const validTransitions: Record<ArtifactStatus, ArtifactStatus[]> = {
    draft: ['research'],
    research: ['foundations'],
    foundations: ['skeleton'],
    skeleton: ['foundations_approval'],
    foundations_approval: ['writing'],
    writing: ['creating_visuals'],
    creating_visuals: ['ready'],
    ready: ['published'],
    published: ['ready']
  }

  return validTransitions[from]?.includes(to) ?? false
}
```

---

## Processing States vs Editable States

### Processing States (4 states)

Editor locked, AI actively processing, **polling enabled**:
```typescript
const PROCESSING_STATES: ArtifactStatus[] = [
  'research',      // AI researching topic
  'foundations',   // AI analyzing writing characteristics (Phase 4)
  'writing',       // AI writing full content
  'creating_visuals' // AI generating images
]

function isProcessingState(status: ArtifactStatus): boolean {
  return PROCESSING_STATES.includes(status)
}
```

**Characteristics:**
- ✅ Editor locked (user cannot edit)
- ✅ WritingProgress component visible
- ✅ Polling active (every 2 seconds)
- ✅ Auto-transitions when AI completes
- ❌ No user action buttons

### Non-Processing States (5 states)

States where AI is NOT actively processing, **no polling**:
```typescript
const NON_PROCESSING_STATES: ArtifactStatus[] = [
  'draft',               // User can edit, no AI active
  'skeleton',            // AI generating skeleton (brief, transitions quickly)
  'foundations_approval', // Pipeline PAUSED, waiting for user approval
  'ready',               // Content complete, user can edit
  'published'            // Published, user can edit (reverts to ready)
]
```

**Note on `skeleton` status**: Although AI is generating the skeleton, it transitions quickly to `foundations_approval`. Polling is technically active but brief.

### Editable States (3 states)

Editor unlocked, user can edit:
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

**Characteristics:**
- ✅ Editor unlocked (user can edit)
- ✅ Action buttons visible (Create Content, Mark as Published)
- ❌ No WritingProgress component
- ❌ No polling
- ✅ Manual transitions only (except published → ready auto-revert)

### Approval States (Phase 4)

States where pipeline is paused waiting for user action:
```typescript
const APPROVAL_STATES: ArtifactStatus[] = [
  'foundations_approval' // User must click "Foundations Approved" button
]

function isApprovalState(status: ArtifactStatus): boolean {
  return APPROVAL_STATES.includes(status)
}
```

**Characteristics:**
- ✅ Main editor locked
- ✅ Skeleton EDITABLE in FoundationsSection
- ✅ WritingCharacteristicsDisplay visible
- ✅ "Foundations Approved" button enabled
- ❌ No polling (pipeline paused)
- ✅ Manual transition via UI button

---

## Frontend UI Behavior

### Status Badge (Phase 4 - 9 statuses)

```typescript
function getStatusBadge(status: ArtifactStatus): {
  label: string
  color: 'gray' | 'blue' | 'amber' | 'green' | 'purple' | 'emerald'
} {
  const badgeMap = {
    draft: { label: 'Draft', color: 'gray' },
    research: { label: 'Creating the Foundations', color: 'blue' },
    foundations: { label: 'Creating the Foundations', color: 'blue' },
    skeleton: { label: 'Creating the Foundations', color: 'blue' },
    foundations_approval: { label: 'Foundations Approval', color: 'amber' }, // Phase 4
    writing: { label: 'Writing Content', color: 'blue' },
    creating_visuals: { label: 'Creating Visuals', color: 'purple' },
    ready: { label: 'Content Ready', color: 'green' },
    published: { label: 'Published', color: 'emerald' }
  }
  return badgeMap[status]
}
```

### WritingProgress Component (Phase 4)

```typescript
function shouldShowWritingProgress(status: ArtifactStatus): boolean {
  // Show progress for processing states AND approval state
  return isProcessingState(status) || status === 'foundations_approval'
}

function getProgressPercentage(status: ArtifactStatus): number {
  const percentages = {
    draft: 0,
    research: 15,
    foundations: 30,        // Phase 4
    skeleton: 45,
    foundations_approval: 50, // Phase 4 - paused
    writing: 70,
    creating_visuals: 90,
    ready: 100,
    published: 100
  }
  return percentages[status] ?? 0
}
```

### Editor Locking

```typescript
function isEditorLocked(status: ArtifactStatus): boolean {
  return isProcessingState(status)
}

// Usage in ArtifactEditor component
<ArtifactEditor
  editable={!isProcessingState(artifact.status)}
  content={artifact.content}
  onContentChange={handleContentChange}
/>
```

### Polling Behavior

```typescript
// useArtifact hook auto-polls during processing states
refetchInterval: (query) => {
  const artifact = query.state.data
  if (!artifact) return false

  return isProcessingState(artifact.status) ? 2000 : false
}
```

---

## Backend Tool Execution

### Tool Sequence

```typescript
// Full pipeline execution
async function executeContentPipeline(artifactId: string) {
  try {
    // 1. Research (draft → research)
    await updateStatus(artifactId, 'research')
    const research = await conductDeepResearch.execute({ artifactId, minRequired: 5 })

    // 2. Skeleton (research → skeleton)
    await updateStatus(artifactId, 'skeleton')
    const skeleton = await generateContentSkeleton.execute({ artifactId, research })

    // 3. Writing (skeleton → writing)
    await updateStatus(artifactId, 'writing')
    const content = await writeFullContent.execute({ artifactId, skeleton, research })

    // 4. Visuals (writing → creating_visuals)
    // Phase 3: Full image generation with DALL-E 3 / Gemini Imagen 4
    await updateStatus(artifactId, 'creating_visuals')
    const visuals = await identifyImageNeeds.execute({ artifactId })
    // Result: { needs, finals, contentWithImages, stats }

    // 5. Ready (creating_visuals → ready)
    await updateStatus(artifactId, 'ready')

    return { success: true }
  } catch (error) {
    // Rollback to previous status
    await rollbackStatus(artifactId)
    throw error
  }
}
```

### Checkpoint/Rollback

```typescript
// Create checkpoint before each tool execution
await checkpointManager.createCheckpoint(artifactId, currentStatus)

try {
  await tool.execute(params)
} catch (error) {
  // Rollback to checkpoint on failure
  await checkpointManager.rollback(artifactId)
}
```

---

## Error Handling

### Tool Execution Failure

```typescript
// If tool fails, artifact remains in current status
if (toolExecutionFailed) {
  // Status: research (stays at research)
  // Error displayed to user
  // User can retry or cancel
}
```

### Retry Policy

```typescript
const RETRY_POLICY = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  retryableStatuses: ['research', 'skeleton', 'writing', 'creating_visuals']
}

// Automatic retry for recoverable errors
if (error.recoverable && retries < 3) {
  await delay(exponentialBackoff(retries))
  return executeTool(artifactId)
}
```

---

## Database Schema

### Status Constraint (Phase 4 - 9 statuses)

```sql
-- Phase 4 Migration: 007_phase4_new_statuses.sql
-- Add new artifact statuses for writing quality enhancement

ALTER TABLE artifacts
  DROP CONSTRAINT IF EXISTS artifacts_status_check;

ALTER TABLE artifacts
  ADD CONSTRAINT artifacts_status_check CHECK (status IN (
    'draft',                -- Initial state, editable
    'research',             -- AI researching (processing, polling)
    'foundations',          -- AI analyzing characteristics (processing, polling) - Phase 4
    'skeleton',             -- AI creating structure (brief processing)
    'foundations_approval', -- Pipeline PAUSED, user approval required - Phase 4
    'writing',              -- AI writing content (processing, polling)
    'creating_visuals',     -- AI generating images (processing, polling)
    'ready',                -- Content ready, editable
    'published'             -- Published, editable (reverts to ready on edit)
  ));
```

### Phase 4 New Tables

```sql
-- 008_artifact_writing_characteristics.sql
CREATE TABLE artifact_writing_characteristics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
  characteristics JSONB NOT NULL DEFAULT '{}',
  summary TEXT,
  recommendations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT artifact_writing_characteristics_artifact_id_key UNIQUE (artifact_id)
);

CREATE INDEX idx_artifact_writing_characteristics_artifact_id
  ON artifact_writing_characteristics(artifact_id);

-- 009_user_writing_examples.sql
CREATE TABLE user_writing_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  word_count INTEGER NOT NULL CHECK (word_count >= 500),
  source_type VARCHAR(50) DEFAULT 'manual',
  analyzed_characteristics JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_writing_examples_user_id ON user_writing_examples(user_id);
CREATE INDEX idx_user_writing_examples_active ON user_writing_examples(user_id, is_active);
```

### Status Index

```sql
CREATE INDEX idx_artifacts_status ON artifacts(status);
```

---

## Related Documentation

- [status-flow-reference.md](./status-flow-reference.md) - Detailed 9-status reference (v3.0.0)
- [STATUS_VALUES_REFERENCE.md](./STATUS_VALUES_REFERENCE.md) - Quick status values reference
- [content-creation-flow-fix.md](./content-creation-flow-fix.md) - Historical flow fixes
- [pipeline-execution-flow.md](../ai-agents-and-prompts/pipeline-execution-flow.md) - Complete pipeline documentation (v2.0.0)
- [artifact-schema-and-workflow.md](../Architecture/database/artifact-schema-and-workflow.md) - Database schema
- [core-tools-reference.md](../ai-agents-and-prompts/core-tools-reference.md) - Tool documentation (v2.0.0)

---

**Version History:**
- **3.0.0** (2026-01-29) - **Phase 4 Writing Quality Enhancement**:
  - Updated from 7-status to 9-status workflow
  - Added `foundations` status (AI analyzes writing characteristics)
  - Added `foundations_approval` status (user approval gate)
  - Added `analyzeWritingCharacteristics` tool documentation
  - Updated processing states to include `foundations`
  - Added approval states category
  - Added Phase 4 database schema (artifact_writing_characteristics, user_writing_examples)
  - Updated transition rules for 9-status flow
- **2.0.0** (2026-01-28) - Phase 3 image generation: Updated creating_visuals status with DALL-E 3 / Gemini Imagen implementation, visuals_metadata structure, content embedding
- **1.0.0** (2026-01-26) - Initial 7-status workflow specification
