# Artifact Status Flow Reference

**Version:** 3.0.0
**Last Updated:** 2026-01-29
**Status:** Active (Phase 4 Foundations Approval)

---

## Overview

The artifact status system implements a **9-status workflow** with a **user approval gate** between skeleton generation and content writing. This allows users to review the content structure and writing characteristics before full content generation begins.

### Status Flow Diagram

```
┌─────────┐
│  draft  │ ← Manual creation
└────┬────┘
     │ User clicks "Create Content"
     ▼
┌──────────┐
│ research │ ← AI: conductDeepResearch (automatic)
└────┬─────┘
     │ Auto-transition
     ▼
┌─────────────┐
│ foundations │ ← AI: analyzeWritingCharacteristics (automatic)
└────┬────────┘
     │ Auto-transition
     ▼
┌──────────┐
│ skeleton │ ← AI: generateContentSkeleton
└────┬─────┘
     │                    ╔══════════════════════════════╗
     │                    ║  APPROVAL GATE               ║
     │                    ║  Pipeline PAUSES here        ║
     │                    ║  User reviews skeleton       ║
     │                    ║  User edits if needed        ║
     │                    ╚══════════════════════════════╝
     │ User clicks "Foundations Approved"
     ▼
┌───────────────────────┐
│ foundations_approval  │ ← Brief transition state
└────┬──────────────────┘
     │ Auto-transition
     ▼
┌─────────┐
│ writing │ ← AI: writeFullContent (automatic)
└────┬────┘
     │ Auto-transition
     ▼
┌──────────────────┐
│ creating_visuals │ ← AI: identifyImageNeeds (automatic)
└────┬─────────────┘
     │ Auto-transition
     ▼
┌────────┐
│ ready  │ ← User can edit, review content
└────┬───┘
     │ User clicks "Mark as Published"
     ▼
┌───────────┐
│ published │ ← Final state, editable
└─────┬─────┘
      │ Auto-transition on edit
      └──────────────────────┐
                             ▼
                        ┌────────┐
                        │ ready  │ (loop back)
                        └────────┘
```

---

## Status Definitions

### 1. draft

**User-Facing Label:** "Draft"
**Description:** Artifact created but AI content generation not started
**Editor State:** Unlocked (editable)
**Processing:** No

**Available CTAs:**
- "Create Content" - Triggers AI workflow

**Triggers:**
- **Entry:** User clicks "Save as Draft" in create modal
- **Exit:** User clicks "Create Content" button → transitions to `research`

**UI Components:**
- Status Badge: "Draft" (gray)
- Editor: Unlocked
- WritingProgress: Hidden
- FoundationsSection: Hidden
- CTAs: "Create Content" button visible

---

### 2. research

**User-Facing Label:** "Creating the Foundations"
**Description:** AI conducting deep research on the artifact topic
**Editor State:** Locked
**Processing:** Yes (20% progress)

**Available CTAs:**
- No action buttons during processing

**Backend Actions:**
- Update `status = 'research'`
- AI calls `conductDeepResearch` tool
- Store research results in `artifact_research` table
- Auto-transition to `foundations` when complete

**Frontend Actions:**
- Lock editor with overlay
- Display WritingProgress component
- Start polling (every 2 seconds)
- Show "Researching" step with spinner

**Triggers:**
- **Entry:** User clicks "Create Content" OR AI Assistant sends research message
- **Exit:** `conductDeepResearch` completes → auto-transitions to `foundations`

**Polling:**
- Artifact query: Every 2 seconds
- Research query: Continues until research data loaded

---

### 3. foundations [NEW IN PHASE 4]

**User-Facing Label:** "Creating the Foundations"
**Description:** AI analyzing writing characteristics based on user's writing examples and context
**Editor State:** Locked
**Processing:** Yes (40% progress)

**Available CTAs:**
- No action buttons during processing

**Backend Actions:**
- Update `status = 'foundations'`
- AI calls `analyzeWritingCharacteristics` tool
- Fetch user writing examples from `user_writing_examples` table
- Fetch user context from `user_context` table
- Store characteristics in `artifact_writing_characteristics` table
- Auto-transition to `skeleton` when complete

**Frontend Actions:**
- Keep editor locked
- Update WritingProgress to show "Analyzing Writing Style"
- Continue polling (every 2 seconds)
- Mark "Researching" as complete (checkmark)

**Triggers:**
- **Entry:** `conductDeepResearch` completes (automatic)
- **Exit:** `analyzeWritingCharacteristics` completes → auto-transitions to `skeleton`

**UI Components:**
- Status Badge: "Creating the Foundations" (blue)
- Editor: Locked
- WritingProgress: Visible, showing "Analyzing Writing Style" with spinner
- Progress Bar: 40%
- FoundationsSection: May start appearing with loading state

**Data Written:**
- `artifact_writing_characteristics.characteristics` (JSONB)
- `artifact_writing_characteristics.summary` (TEXT)
- `artifact_writing_characteristics.recommendations` (TEXT)

---

### 4. skeleton

**User-Facing Label:** "Creating the Foundations"
**Description:** AI has generated content skeleton, **PIPELINE PAUSED for user approval**
**Editor State:** Locked (main editor), **Unlocked in FoundationsSection**
**Processing:** No (waiting for user)

**Available CTAs:**
- "Foundations Approved" - Resumes pipeline

**Backend Actions:**
- Update `status = 'skeleton'`
- Skeleton stored in `artifact.content` field
- **Pipeline PAUSES** - waiting for user approval

**Frontend Actions:**
- Keep main editor locked (but show hidden/collapsed)
- **FoundationsSection auto-expands**
- Display writing characteristics
- Display **editable** skeleton in TipTap editor within FoundationsSection
- Show "Foundations Approved" button
- **STOP polling** (not a processing state)

**Triggers:**
- **Entry:** `generateContentSkeleton` completes (automatic)
- **Exit:** User clicks "Foundations Approved" → transitions to `foundations_approval`

**UI Components:**
- Status Badge: "Foundations Approval" (amber)
- Main Editor: Hidden/Collapsed (no content yet)
- FoundationsSection: **Expanded**, showing:
  - WritingCharacteristicsDisplay (grouped by source)
  - **Editable** skeleton in TipTap editor
  - "Foundations Approved" button (prominent, full-width)
- "NEEDS APPROVAL" badge visible in collapsed state

**CRITICAL:** This status does NOT trigger polling. The pipeline is paused waiting for user action.

---

### 5. foundations_approval [NEW IN PHASE 4]

**User-Facing Label:** "Foundations Approval"
**Description:** User has approved foundations, pipeline resuming
**Editor State:** Locked
**Processing:** Brief transition state

**Available CTAs:**
- No buttons (brief transition)

**Backend Actions:**
- User clicked "Foundations Approved"
- API call: `POST /api/artifact/:id/approve-foundations`
- Backend calls `pipelineExecutor.executeSingleTool('writeFullContent', artifactId)`
- Auto-transition to `writing` almost immediately

**Frontend Actions:**
- Brief loading state
- Transition to `writing` status quickly

**Triggers:**
- **Entry:** User clicks "Foundations Approved" button
- **Exit:** `writeFullContent` starts → auto-transitions to `writing`

**UI Components:**
- Status Badge: "Starting Writing..." (blue)
- Brief loading indicator

**Note:** This is a very brief transition state. Users will see `writing` status within seconds.

---

### 6. writing

**User-Facing Label:** "Creating Content"
**Description:** AI writing full content for each section
**Editor State:** Locked
**Processing:** Yes (60% progress)

**Available CTAs:**
- No action buttons during processing

**Backend Actions:**
- Update `status = 'writing'`
- AI calls `writeFullContent` tool
- Uses writing characteristics for tone, voice, pacing
- Writes content section by section
- Updates `content` field with full HTML/markdown
- Auto-transition to `creating_visuals` when complete

**Frontend Actions:**
- Keep editor locked
- Update WritingProgress to step 4
- Continue polling (every 2 seconds)
- Show "Writing Content" step with spinner
- Mark previous steps as complete (checkmarks)
- FoundationsSection collapses (user can still expand to review)

**Triggers:**
- **Entry:** User approved foundations → `writeFullContent` starts
- **Exit:** `writeFullContent` completes → auto-transitions to `creating_visuals`

**UI Components:**
- Status Badge: "Creating Content" (blue)
- Editor: Locked with overlay
- WritingProgress: Visible, showing "Writing Content" with spinner
- Progress Bar: 60%
- FoundationsSection: Collapsed (can be expanded to review)

**Polling:**
- Artifact query: Every 2 seconds

---

### 7. creating_visuals

**User-Facing Label:** "Creating Content"
**Description:** AI generating images for placeholders using DALL-E 3 / Gemini Imagen 4
**Editor State:** Locked
**Processing:** Yes (80% progress)

**Available CTAs:**
- No action buttons during processing

**Backend Actions:**
- Update `status = 'creating_visuals'`
- AI calls `identifyImageNeeds` tool
- Extracts `[IMAGE: description]` placeholders
- Generates images using DALL-E 3 (primary) or Gemini Imagen 4 (fallback)
- Uploads images to Supabase storage
- Embeds images in content as markdown
- Auto-transition to `ready` when complete

**Frontend Actions:**
- Keep editor locked
- Update WritingProgress to step 5
- Continue polling (every 2 seconds)
- Show "Generating Images" step with spinner
- Mark all previous steps as complete

**Triggers:**
- **Entry:** `writeFullContent` completes (automatic)
- **Exit:** `identifyImageNeeds` completes → auto-transitions to `ready`

**UI Components:**
- Status Badge: "Creating Content" (purple)
- Editor: Locked
- WritingProgress: Visible, showing "Generating Images" with spinner
- Progress Bar: 80-100%

**Polling:**
- Artifact query: Every 2 seconds

---

### 8. ready

**User-Facing Label:** "Content Ready"
**Description:** AI content generation complete, ready for user review and publication
**Editor State:** Unlocked (editable)
**Processing:** No

**Available CTAs:**
- "Mark as Published" - Transitions to `published` status

**Backend Actions:**
- Update `status = 'ready'`
- Content populated with AI-generated text and images
- No further automatic transitions

**Frontend Actions:**
- Unlock main editor
- **Show final content in ArtifactEditor**
- Hide WritingProgress component
- Stop polling
- Show "Mark as Published" button
- Allow user to edit content
- FoundationsSection collapsed (but accessible for reference)

**Triggers:**
- **Entry:** `identifyImageNeeds` completes (automatic) OR user edits `published` artifact
- **Exit:** User clicks "Mark as Published" → transitions to `published`

**UI Components:**
- Status Badge: "Content Ready" (green)
- Editor: **Unlocked**, showing final generated content
- WritingProgress: Hidden
- FoundationsSection: Collapsed (can expand to review characteristics)
- CTAs: "Mark as Published" button visible

**Polling:**
- All polling stopped

---

### 9. published

**User-Facing Label:** "Published"
**Description:** Content marked as final and published
**Editor State:** Unlocked (editable)
**Processing:** No

**Available CTAs:**
- No action buttons (content is published)

**Backend Actions:**
- Update `status = 'published'`
- Track `published_at` timestamp

**Frontend Actions:**
- Keep editor unlocked
- No WritingProgress
- No polling
- No action buttons
- **Auto-transition to `ready` on content edit**

**Triggers:**
- **Entry:** User clicks "Mark as Published" from `ready` status
- **Exit:** User edits content → auto-transitions to `ready`

**UI Components:**
- Status Badge: "Published" (emerald)
- Editor: Unlocked, user can edit
- WritingProgress: Hidden
- CTAs: No buttons visible

**Special Behavior:**
- **Edit Detection:** When user modifies content, status automatically changes to `ready`

---

## CTA Visibility Matrix

| Status | Create Content | Foundations Approved | Mark as Published | Editor | Polling |
|--------|---------------|---------------------|-------------------|--------|---------|
| draft | Visible | Hidden | Hidden | Unlocked | No |
| research | Hidden | Hidden | Hidden | Locked | Yes (2s) |
| foundations | Hidden | Hidden | Hidden | Locked | Yes (2s) |
| skeleton | Hidden | **Visible** | Hidden | Locked* | **No** |
| foundations_approval | Hidden | Hidden | Hidden | Locked | No |
| writing | Hidden | Hidden | Hidden | Locked | Yes (2s) |
| creating_visuals | Hidden | Hidden | Hidden | Locked | Yes (2s) |
| ready | Hidden | Hidden | Visible | Unlocked | No |
| published | Hidden | Hidden | Hidden | Unlocked | No |

*Note: In `skeleton` status, main editor is locked but FoundationsSection has an **editable** TipTap editor for skeleton editing.

---

## Processing States vs Non-Processing States

### Processing States (Polling Enabled)

```typescript
const processingStates = ['research', 'foundations', 'writing', 'creating_visuals'];
```

These states indicate AI is actively working. Frontend polls every 2 seconds.

### Non-Processing States (No Polling)

```typescript
const nonProcessingStates = ['draft', 'skeleton', 'foundations_approval', 'ready', 'published'];
```

These states are:
- `draft` - Waiting for user to start content creation
- `skeleton` - **Waiting for user approval** (pipeline paused)
- `foundations_approval` - Brief transition state
- `ready` - Content complete, user reviewing
- `published` - Final state

**CRITICAL:** `skeleton` and `foundations_approval` are NOT processing states. The pipeline is paused waiting for user action.

---

## UI State by Status

### FoundationsSection Visibility

| Status | FoundationsSection | State |
|--------|-------------------|-------|
| draft | Hidden | - |
| research | Hidden | - |
| foundations | Visible (loading) | Characteristics loading |
| skeleton | **Visible (expanded)** | Editable skeleton, approval button |
| foundations_approval | Visible (collapsed) | Brief transition |
| writing | Visible (collapsed) | Reference only |
| creating_visuals | Visible (collapsed) | Reference only |
| ready | Visible (collapsed) | Reference only |
| published | Visible (collapsed) | Reference only |

### ArtifactEditor Visibility

| Status | ArtifactEditor | Content |
|--------|----------------|---------|
| draft | Visible | Empty or user input |
| research | Locked overlay | "Content being generated..." |
| foundations | **Hidden** | Skeleton not yet generated |
| skeleton | **Hidden** | Skeleton in FoundationsSection |
| foundations_approval | **Hidden** | Brief transition |
| writing | Locked overlay | Writing in progress |
| creating_visuals | Locked overlay | Images being generated |
| ready | **Visible, Unlocked** | Final content with images |
| published | **Visible, Unlocked** | Published content |

---

## State Machine Configuration

### Allowed Transitions

```typescript
export const ARTIFACT_TRANSITIONS: Record<ArtifactStatus, ArtifactStatus[]> = {
  draft: ['research'],
  research: ['foundations'],
  foundations: ['skeleton'],
  skeleton: ['foundations_approval'],  // User approval required
  foundations_approval: ['writing'],
  writing: ['creating_visuals'],
  creating_visuals: ['ready'],
  ready: ['published'],
  published: ['ready'],  // Edit triggers return to ready
}
```

### Status Labels

```typescript
export const STATUS_LABELS: Record<ArtifactStatus, string> = {
  draft: 'Draft',
  research: 'Creating the Foundations',
  foundations: 'Creating the Foundations',
  skeleton: 'Creating the Foundations',  // Same label, but awaiting approval
  foundations_approval: 'Foundations Approval',
  writing: 'Creating Content',
  creating_visuals: 'Creating Content',
  ready: 'Content Ready',
  published: 'Published',
}
```

---

## Backend Responsibilities

### AI Tools (Phase 4)

**Research Tool:** `conductDeepResearch`
- Changes status from `draft` to `research`
- Performs deep research via Tavily API
- Auto-transitions to `foundations` when complete

**Characteristics Tool:** `analyzeWritingCharacteristics` [NEW]
- Changes status from `research` to `foundations`
- Fetches user writing examples and context
- Analyzes with Claude API
- Stores in `artifact_writing_characteristics` table
- Auto-transitions to `skeleton` when complete

**Skeleton Tool:** `generateContentSkeleton`
- Changes status from `foundations` to `skeleton`
- Uses writing characteristics for structure
- **Pipeline PAUSES after this tool**

**Writing Tool:** `writeFullContent`
- Changes status from `foundations_approval` to `writing`
- Uses writing characteristics for tone, voice, pacing
- Auto-transitions to `creating_visuals` when complete

**Image Tool:** `identifyImageNeeds`
- Changes status from `writing` to `creating_visuals`
- Generates images with DALL-E 3 / Gemini Imagen 4
- Auto-transitions to `ready` when complete

### Approval Endpoint

```typescript
// POST /api/artifact/:id/approve-foundations
// Called when user clicks "Foundations Approved" button
// Changes status to foundations_approval and resumes pipeline
```

---

## Frontend Responsibilities

### Hooks: `useArtifacts.ts`

**Polling Configuration:**
```typescript
refetchInterval: (query) => {
  const artifact = query.state.data
  // CRITICAL: skeleton and foundations_approval are NOT processing states
  const processingStates = ['research', 'foundations', 'writing', 'creating_visuals']
  if (processingStates.includes(artifact?.status)) {
    return 2000 // Poll every 2 seconds
  }
  return false // No polling
}
```

### Components: `ArtifactPage.tsx`

**Editor Visibility:**
```typescript
// Hide editor during skeleton workflow (content is in FoundationsSection)
{!['foundations', 'skeleton', 'foundations_approval'].includes(artifact.status) && (
  <ArtifactEditor ... />
)}
```

### Components: `FoundationsSection.tsx`

**Auto-Expand Logic:**
```typescript
// Auto-expand when status reaches approval stage
useEffect(() => {
  if (['skeleton', 'foundations_approval'].includes(status) && isCollapsed && !hasBeenViewed) {
    setIsCollapsed(false)
  }
}, [status, isCollapsed, hasBeenViewed])
```

**Approval Button:**
```typescript
// Show approval button when skeleton is ready
const showApprovalButton = status === 'skeleton' || status === 'foundations_approval'

{showApprovalButton && onApprove && (
  <FoundationsApprovedButton onClick={onApprove} loading={approvalLoading} />
)}
```

---

## Migration Notes

### From 7-Status to 9-Status System (Phase 4)

**New Statuses:**
- `foundations` - Writing characteristics analysis
- `foundations_approval` - User approval transition

**Database Migration:**
```sql
-- Add new statuses to artifact_status enum
ALTER TYPE artifact_status ADD VALUE IF NOT EXISTS 'foundations';
ALTER TYPE artifact_status ADD VALUE IF NOT EXISTS 'foundations_approval';

-- Create artifact_writing_characteristics table
CREATE TABLE artifact_writing_characteristics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artifact_id UUID REFERENCES artifacts(id) ON DELETE CASCADE UNIQUE,
  characteristics JSONB NOT NULL,
  summary TEXT,
  recommendations TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_awc_artifact_id ON artifact_writing_characteristics(artifact_id);
```

**Frontend Changes:**
- Added FoundationsSection component
- Added WritingCharacteristicsDisplay component
- Added FoundationsApprovedButton component
- Updated processingStates to exclude `skeleton` and `foundations_approval`
- Added conditional rendering to hide editor during skeleton workflow

**Backend Changes:**
- Added `analyzeWritingCharacteristics` tool
- Updated PipelineExecutor with pause mechanism
- Added `/api/artifact/:id/approve-foundations` endpoint

---

## Related Documentation

- **Pipeline Execution:** [pipeline-execution-flow.md](../ai-agents-and-prompts/pipeline-execution-flow.md)
- **Status Values:** [STATUS_VALUES_REFERENCE.md](./STATUS_VALUES_REFERENCE.md)
- **Core Tools:** [core-tools-reference.md](../ai-agents-and-prompts/core-tools-reference.md)
- **Frontend Types:** `/frontend/src/features/portfolio/types/portfolio.ts`
- **State Machine:** `/frontend/src/features/portfolio/validators/stateMachine.ts`

---

**Document Version History:**
- v3.0.0 (2026-01-29): Phase 4 - Added foundations approval workflow with 9-status system
- v2.0.0 (2026-01-25): 7-status linear workflow
