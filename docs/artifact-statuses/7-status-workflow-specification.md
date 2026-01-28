# 7-Status Workflow Specification

**Version:** 2.0.0
**Last Updated:** 2026-01-28
**Status:** Complete (Phase 3 Image Generation)

## Overview

The 7-status workflow is a linear, AI-driven content creation pipeline that guides artifacts from draft to publication. The workflow eliminates approval gates and branching paths, creating a streamlined experience where AI handles all content generation phases automatically.

**Key Characteristics:**
- **Linear Progression** - No branching, single path from draft to published
- **Auto-Transitions** - AI automatically advances between processing states
- **Editor Locking** - Editor locked during AI processing (research, skeleton, writing, creating_visuals)
- **Two Editable States** - Users can edit in draft, ready, and published states
- **Auto-Revert** - Editing published content automatically reverts to ready

---

## Status Overview

### Complete Workflow

```
draft → research → skeleton → writing → creating_visuals → ready → published
                                                                      ↓
                                                                   ready (on edit)
```

### Status Categories

**Editable States** (3 states):
- `draft` - Initial state, user can edit before AI starts
- `ready` - Content complete, user can edit and review
- `published` - Published content, editable (reverts to ready on edit)

**Processing States** (4 states):
- `research` - AI researching topic from multiple sources
- `skeleton` - AI generating H1 title + H2 section headings
- `writing` - AI writing full content for each section
- `creating_visuals` - AI generating cover image/visuals

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

**User-Facing Label:** "Creating Content" (25% progress)

**Description:**
- AI conducting deep research on the artifact topic
- Querying multiple sources (Reddit, LinkedIn, Quora, Medium, Substack)
- Extracting relevant excerpts with relevance scores
- Storing research in artifact_research table

**Editor State:** Locked (read-only)

**Processing:** Yes (AI active, 25% progress)

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

// Status transitions automatically on completion
await updateArtifact({ id, status: 'skeleton' })
```

**Frontend Behavior:**
- Editor locked (no editing)
- WritingProgress visible (25% complete)
- ResearchArea shows loading state
- Polling active (every 2 seconds)

**Transition Out:**
```typescript
// Auto-transition when research completes
await updateArtifact({ id, status: 'skeleton' })
await generateContentSkeleton({ artifactId: id })
```

**Transition In:**
- From `draft` (user clicks "Create Content")

---

### 3. skeleton

**User-Facing Label:** "Creating Content" (50% progress)

**Description:**
- AI generating content structure (H1 title + H2 section headings)
- Creating estimated word counts per section
- Storing skeleton as markdown in artifact.content

**Editor State:** Locked (read-only)

**Processing:** Yes (AI active, 50% progress)

**Available User Actions:**
- None (wait for completion)

**Backend Operations:**
```typescript
// Tool: generateContentSkeleton
const result = await generateContentSkeleton.execute({
  artifactId,
  researchResults  // From artifact_research table
})

// Claude Sonnet 4 generates:
// # Main Title (H1)
// ## Section 1 (H2)
// [Estimated: 300 words]
// ## Section 2 (H2)
// [Estimated: 400 words]
// ## Section 3 (H2)
// [Estimated: 300 words]

// Store skeleton in artifact.content
await updateArtifact({ id, content: skeleton })

// Status transitions automatically on completion
await updateArtifact({ id, status: 'writing' })
```

**Frontend Behavior:**
- Editor locked (shows skeleton as it's generated)
- WritingProgress visible (50% complete, sections list)
- Polling active (every 2 seconds)

**Transition Out:**
```typescript
// Auto-transition when skeleton completes
await updateArtifact({ id, status: 'writing' })
await writeFullContent({ artifactId: id })
```

**Transition In:**
- From `research` (automatic after research completes)

---

### 4. writing

**User-Facing Label:** "Creating Content" (75% progress)

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

### 5. creating_visuals

**User-Facing Label:** "Creating Content" (90% progress)

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

### 6. ready

**User-Facing Label:** "Ready to Publish"

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

### 7. published

**User-Facing Label:** "Published"

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

### Valid Transitions

| From | To | Trigger | Tool/Operation |
|------|----|---------| --------------|
| `draft` | `research` | User clicks "Create Content" | conductDeepResearch |
| `research` | `skeleton` | Research completes | generateContentSkeleton |
| `skeleton` | `writing` | Skeleton completes | writeFullContent |
| `writing` | `creating_visuals` | Writing completes | generateContentVisuals |
| `creating_visuals` | `ready` | Visuals complete | (automatic) |
| `creating_visuals` | `ready` | Humanity check applied | applyHumanityCheck |
| `ready` | `published` | User clicks "Mark as Published" | (manual) |
| `published` | `ready` | User edits content | (automatic) |

### Invalid Transitions

```typescript
// Cannot skip research
draft → skeleton  ❌

// Cannot skip skeleton
research → writing  ❌

// Cannot skip writing
skeleton → ready  ❌

// Cannot skip visuals
writing → ready  ❌

// Cannot go backwards (except published → ready)
ready → writing  ❌
skeleton → research  ❌
writing → skeleton  ❌
```

### Transition Validation

```typescript
function isValidTransition(
  from: ArtifactStatus,
  to: ArtifactStatus
): boolean {
  const validTransitions: Record<ArtifactStatus, ArtifactStatus[]> = {
    draft: ['research'],
    research: ['skeleton'],
    skeleton: ['writing'],
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

Editor locked, AI actively processing:
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

**Characteristics:**
- ✅ Editor locked (user cannot edit)
- ✅ WritingProgress component visible
- ✅ Polling active (every 2 seconds)
- ✅ Auto-transitions when AI completes
- ❌ No user action buttons

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

---

## Frontend UI Behavior

### Status Badge

```typescript
function getStatusBadge(status: ArtifactStatus): {
  label: string
  color: 'gray' | 'blue' | 'green' | 'purple'
} {
  const badgeMap = {
    draft: { label: 'Draft', color: 'gray' },
    research: { label: 'Creating Content', color: 'blue' },
    skeleton: { label: 'Creating Content', color: 'blue' },
    writing: { label: 'Creating Content', color: 'blue' },
    creating_visuals: { label: 'Creating Content', color: 'blue' },
    ready: { label: 'Ready to Publish', color: 'green' },
    published: { label: 'Published', color: 'purple' }
  }
  return badgeMap[status]
}
```

### WritingProgress Component

```typescript
function shouldShowWritingProgress(status: ArtifactStatus): boolean {
  return isProcessingState(status)
}

function getProgressPercentage(status: ArtifactStatus): number {
  const percentages = {
    research: 25,
    skeleton: 50,
    writing: 75,
    creating_visuals: 90
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

### Status Constraint

```sql
CREATE TABLE artifacts (
  id UUID PRIMARY KEY,
  status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',
    'research',
    'skeleton',
    'writing',
    'creating_visuals',
    'ready',
    'published'
  )),
  -- ... other fields
);
```

### Status Index

```sql
CREATE INDEX idx_artifacts_status ON artifacts(status);
```

---

## Related Documentation

- [status-flow-reference.md](./status-flow-reference.md) - Detailed status reference (v2.0.0)
- [content-creation-flow-fix.md](./content-creation-flow-fix.md) - Historical flow fixes
- [pipeline-execution-flow.md](../ai-agents-and-prompts/pipeline-execution-flow.md) - Complete pipeline documentation
- [artifact-schema-and-workflow.md](../Architecture/database/artifact-schema-and-workflow.md) - Database schema

---

**Version History:**
- **2.0.0** (2026-01-28) - Phase 3 image generation: Updated creating_visuals status with DALL-E 3 / Gemini Imagen implementation, visuals_metadata structure, content embedding
- **1.0.0** (2026-01-26) - Initial 7-status workflow specification
