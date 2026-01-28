# Artifact Status Flow Reference

**Version:** 2.0.0
**Last Updated:** 2026-01-25
**Status:** Active

---

## Overview

The artifact status system implements a simplified **7-status linear workflow** from creation to publication. The flow is designed to be automatic during AI processing phases with minimal user intervention.

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
┌──────────┐
│ skeleton │ ← AI: generateContentSkeleton (automatic)
└────┬─────┘
     │ Auto-transition
     ▼
┌─────────┐
│ writing │ ← AI: writeFullContent (automatic)
└────┬────┘
     │ Auto-transition
     ▼
┌──────────────────┐
│ creating_visuals │ ← AI: generateContentImages (automatic)
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
- ✅ "Create Content" - Triggers AI workflow

**Backend Actions:**
- Create artifact with `status = 'draft'`
- Store user-provided title and type

**Frontend Actions:**
- Render editable editor
- Show "Create Content" button
- No polling active

**Triggers:**
- **Entry:** User clicks "Save as Draft" in create modal
- **Exit:** User clicks "Create Content" button → transitions to `research`

**UI Components:**
- Status Badge: "Draft" (gray)
- Editor: Unlocked
- WritingProgress: Hidden
- CTAs: "Create Content" button visible

---

### 2. research

**User-Facing Label:** "Creating Content"
**Description:** AI conducting deep research on the artifact topic
**Editor State:** Locked
**Processing:** Yes (25% progress)

**Available CTAs:**
- ❌ No action buttons during processing

**Backend Actions:**
- Update `status = 'research'`
- AI calls `conductDeepResearch` tool
- Store research results in `research_data` table
- Auto-transition to `skeleton` when complete

**Frontend Actions:**
- Lock editor with overlay
- Display WritingProgress component
- Start polling (every 2 seconds)
- Show "Researching" step with spinner

**Triggers:**
- **Entry:** User clicks "Create Content" OR AI Assistant sends research message
- **Exit:** `conductDeepResearch` completes → auto-transitions to `skeleton`

**UI Components:**
- Status Badge: "Creating Content" (blue)
- Editor: Locked with overlay message "Content is being generated..."
- WritingProgress: Visible, showing step 1/4 (Researching) with spinner
- Progress Bar: 25%
- CTAs: No buttons visible

**Polling:**
- Artifact query: Every 2 seconds
- Research query: Continues until research data loaded

---

### 3. skeleton

**User-Facing Label:** "Creating Content"
**Description:** AI generating content structure (headings, sections)
**Editor State:** Locked
**Processing:** Yes (50% progress)

**Available CTAs:**
- ❌ No action buttons during processing

**Backend Actions:**
- Update `status = 'skeleton'`
- AI calls `generateContentSkeleton` tool
- Store skeleton structure in `content` field (markdown with H2 sections)
- Auto-transition to `writing` when complete

**Frontend Actions:**
- Keep editor locked
- Update WritingProgress to step 2
- Continue polling (every 2 seconds)
- Show "Creating Structure" step with spinner
- Mark "Researching" as complete (checkmark)

**Triggers:**
- **Entry:** `conductDeepResearch` completes (automatic)
- **Exit:** `generateContentSkeleton` completes → auto-transitions to `writing`

**UI Components:**
- Status Badge: "Creating Content" (blue)
- Editor: Locked
- WritingProgress: Visible, showing step 2/4 (Creating Structure) with spinner
- Progress Bar: 50%
- Steps: Researching (✓), Creating Structure (⟳), Writing Content (○), Generating Images (○)
- CTAs: No buttons visible

**Polling:**
- Artifact query: Every 2 seconds
- Research query: Stopped (data already loaded)

---

### 4. writing

**User-Facing Label:** "Creating Content"
**Description:** AI writing full content for each section
**Editor State:** Locked
**Processing:** Yes (75% progress)

**Available CTAs:**
- ❌ No action buttons during processing

**Backend Actions:**
- Update `status = 'writing'`
- AI calls `writeFullContent` tool
- Writes content section by section
- Updates `content` field with full HTML/markdown
- Auto-transition to `creating_visuals` when complete

**Frontend Actions:**
- Keep editor locked
- Update WritingProgress to step 3
- Continue polling (every 2 seconds)
- Show "Writing Content" step with spinner
- Display section details if skeleton has H2 sections
- Mark previous steps as complete (checkmarks)

**Triggers:**
- **Entry:** `generateContentSkeleton` completes (automatic)
- **Exit:** `writeFullContent` completes → auto-transitions to `creating_visuals`

**UI Components:**
- Status Badge: "Creating Content" (blue)
- Editor: Locked
- WritingProgress: Visible, showing step 3/4 (Writing Content) with spinner
- Progress Bar: 75%
- Steps: Researching (✓), Creating Structure (✓), Writing Content (⟳), Generating Images (○)
- Section Details: If skeleton has sections, show list of H2 headings being written
- CTAs: No buttons visible

**Polling:**
- Artifact query: Every 2 seconds

**Special Features:**
- **Section Tracking:** If `content` has H2 sections, WritingProgress displays "Writing Sections" with list of section titles

---

### 5. creating_visuals

**User-Facing Label:** "Creating Content"
**Description:** AI generating images for placeholders (MVP: stub, immediately completes)
**Editor State:** Locked
**Processing:** Yes (100% progress)

**Available CTAs:**
- ❌ No action buttons during processing

**Backend Actions:**
- Update `status = 'creating_visuals'`
- AI calls `generateContentImages` tool (MVP: stub that immediately completes)
- Auto-transition to `ready` when complete

**Frontend Actions:**
- Keep editor locked
- Update WritingProgress to step 4
- Continue polling (every 2 seconds)
- Show "Generating Images" step with spinner
- Mark all previous steps as complete

**Triggers:**
- **Entry:** `writeFullContent` completes (automatic)
- **Exit:** `generateContentImages` completes → auto-transitions to `ready`

**UI Components:**
- Status Badge: "Creating Content" (purple)
- Editor: Locked
- WritingProgress: Visible, showing step 4/4 (Generating Images) with spinner
- Progress Bar: 100%
- Steps: Researching (✓), Creating Structure (✓), Writing Content (✓), Generating Images (⟳)
- CTAs: No buttons visible

**Polling:**
- Artifact query: Every 2 seconds

**MVP Note:**
- Image generation is currently stubbed - it immediately transitions to `ready`
- Future implementation will actually generate images for `![alt](placeholder)` tags

---

### 6. ready

**User-Facing Label:** "Content Ready"
**Description:** AI content generation complete, ready for user review and publication
**Editor State:** Unlocked (editable)
**Processing:** No

**Available CTAs:**
- ✅ "Mark as Published" - Transitions to `published` status

**Backend Actions:**
- Update `status = 'ready'`
- Content populated with AI-generated text
- No further automatic transitions

**Frontend Actions:**
- Unlock editor
- Hide WritingProgress component
- Stop polling
- Show "Mark as Published" button
- Allow user to edit content

**Triggers:**
- **Entry:** `generateContentImages` completes (automatic) OR user edits `published` artifact
- **Exit:** User clicks "Mark as Published" → transitions to `published`

**UI Components:**
- Status Badge: "Content Ready" (green)
- Editor: Unlocked, user can edit
- WritingProgress: Hidden
- CTAs: "Mark as Published" button visible

**Polling:**
- All polling stopped

**User Actions:**
- User can edit content freely
- User can click "Mark as Published" to publish

**Special Behavior:**
- If user edits a `published` artifact, status auto-transitions back to `ready`

---

### 7. published

**User-Facing Label:** "Published"
**Description:** Content marked as final and published
**Editor State:** Unlocked (editable)
**Processing:** No

**Available CTAs:**
- ❌ No action buttons (content is published)

**Backend Actions:**
- Update `status = 'published'`
- Track `published_at` timestamp (optional future enhancement)

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

**Polling:**
- No polling

**Special Behavior:**
- **Edit Detection:** When user modifies content, status automatically changes to `ready`
- This allows republishing workflow without manual status management

---

## CTA Visibility Matrix

| Status | Create Content | Mark as Published | Editor | Polling |
|--------|---------------|-------------------|--------|---------|
| draft | ✅ Visible | ❌ Hidden | Unlocked | No |
| research | ❌ Hidden | ❌ Hidden | Locked | Yes (2s) |
| skeleton | ❌ Hidden | ❌ Hidden | Locked | Yes (2s) |
| writing | ❌ Hidden | ❌ Hidden | Locked | Yes (2s) |
| creating_visuals | ❌ Hidden | ❌ Hidden | Locked | Yes (2s) |
| ready | ❌ Hidden | ✅ Visible | Unlocked | No |
| published | ❌ Hidden | ❌ Hidden | Unlocked | No |

---

## Backend Responsibilities

### Service: `ArtifactService`

**Status Change Methods:**
```typescript
// Manual status changes
async updateStatus(artifactId: string, status: ArtifactStatus): Promise<void>

// Status validation
validateStatusTransition(currentStatus: ArtifactStatus, newStatus: ArtifactStatus): boolean
```

**Business Logic:**
- Validate status transitions follow allowed paths
- Update database with new status
- Handle timestamps (created_at, updated_at, published_at)

### AI Tools

**Research Tool:** `conductDeepResearch`
- Changes status from `draft` to `research`
- Performs deep research
- Auto-transitions to `skeleton` when complete

**Skeleton Tool:** `generateContentSkeleton`
- Expects status `research` or `skeleton`
- Generates H2 section structure
- Auto-transitions to `writing` when complete

**Writing Tool:** `writeFullContent`
- Expects status `skeleton` or `writing`
- Writes full content for all sections
- Includes humanity check (integrated, no separate status)
- Auto-transitions to `creating_visuals` when complete

**Image Tool:** `generateContentImages` (MVP: stub)
- Expects status `writing` or `creating_visuals`
- MVP: Immediately completes
- Auto-transitions to `ready` when complete

---

## Frontend Responsibilities

### Hooks: `useArtifacts.ts`

**Polling Configuration:**
```typescript
refetchInterval: (query) => {
  const artifact = query.state.data
  const processingStates = ['research', 'skeleton', 'writing', 'creating_visuals']
  if (processingStates.includes(artifact?.status)) {
    return 2000 // Poll every 2 seconds
  }
  return false // No polling
}
```

### Hooks: `useResearch.ts`

**Research Polling:**
```typescript
// Poll for research data when status is processing OR when research not loaded yet
const isInProcessingState = ['research', 'skeleton', 'writing', 'creating_visuals'].includes(status)
const shouldPollResearch = isInProcessingState || (status === 'ready' && !researchData)
```

### Components: `ArtifactPage.tsx`

**Editor Lock Logic:**
```typescript
import { isProcessingState } from '../validators/stateMachine'

const isEditorLocked = artifact ? isProcessingState(artifact.status) : false

<ArtifactEditor
  editable={!isEditorLocked}
  // ... other props
/>
```

**CTA Display Logic:**
```typescript
// Create Content button (draft only)
{artifact.status === 'draft' && (
  <Button onClick={handleCreateContent}>
    <Sparkles className="h-4 w-4" />
    Create Content
  </Button>
)}

// Mark as Published button (ready only)
{artifact.status === 'ready' && (
  <Button onClick={handleMarkAsPublished}>
    <CheckCircle className="h-4 w-4" />
    Mark as Published
  </Button>
)}
```

**Auto-Transition: Published → Ready**
```typescript
const handleContentChange = useCallback(
  async (newContent: string) => {
    setLocalContent(newContent)
    setHasUnsavedChanges(true)

    // Auto-transition published → ready on edit
    if (artifact?.status === 'published') {
      await updateArtifact.mutateAsync({
        id: artifact.id,
        updates: { status: 'ready' },
      })
    }
  },
  [artifact?.id, artifact?.status, updateArtifact]
)
```

### Components: `WritingProgress.tsx`

**4-Step Progress Indicator:**
```typescript
const PROGRESS_STEPS = [
  { status: 'research', label: 'Researching', icon: Search, percent: 25 },
  { status: 'skeleton', label: 'Creating Structure', icon: Layout, percent: 50 },
  { status: 'writing', label: 'Writing Content', icon: PenLine, percent: 75 },
  { status: 'creating_visuals', label: 'Generating Images', icon: Image, percent: 100 },
]
```

**Display Logic:**
- Only shown when status is in `['research', 'skeleton', 'writing', 'creating_visuals']`
- Current step shows spinner icon
- Completed steps show checkmark icon
- Pending steps show circle icon
- Progress bar shows percentage based on current step

---

## Status Validation

### State Machine: `stateMachine.ts`

**Allowed Transitions:**
```typescript
export const ARTIFACT_TRANSITIONS: Record<ArtifactStatus, ArtifactStatus[]> = {
  draft: ['research'],
  research: ['skeleton'],
  skeleton: ['writing'],
  writing: ['creating_visuals'],
  creating_visuals: ['ready'],
  ready: ['published'],
  published: ['ready'],  // Edit triggers return to ready
}
```

**Processing State Detection:**
```typescript
export const PROCESSING_STATES: ArtifactStatus[] = [
  'research', 'skeleton', 'writing', 'creating_visuals'
]

export const isProcessingState = (status: ArtifactStatus): boolean =>
  PROCESSING_STATES.includes(status)
```

---

## URL Parameters

### `startCreation=true`

**Purpose:** Automatically trigger AI content creation when navigating to artifact page
**Usage:** Added when user clicks "Create Content" in modal
**Behavior:**
1. Create artifact with status `draft`
2. Navigate to `/portfolio/artifacts/{id}?startCreation=true`
3. ArtifactPage detects param, opens AI Assistant, sends research message
4. Param removed from URL after triggering

**Implementation:**
```typescript
useEffect(() => {
  const startCreation = searchParams.get('startCreation')

  if (startCreation === 'true' && artifact?.title && artifact.status === 'draft') {
    const researchMessage = `Research and create skeleton for artifact ${artifact.id}: "${artifact.title}"`
    setInitialResearchMessage(researchMessage)
    setIsAIAssistantOpen(true)
    setSearchParams({}, { replace: true }) // Remove param
  }
}, [searchParams, artifact])
```

---

## Polling Behavior

### When Polling is Active

**Artifact Query:**
- ✅ Active during: `research`, `skeleton`, `writing`, `creating_visuals`
- ❌ Inactive during: `draft`, `ready`, `published`
- **Interval:** 2 seconds
- **Purpose:** Detect status changes and content updates

**Research Query:**
- ✅ Active during: Processing states OR when research not loaded yet
- ❌ Inactive when: Research data loaded AND status is `ready` or `published`
- **Interval:** 2 seconds
- **Purpose:** Load research data for display in ResearchArea

### Polling Stop Conditions

**Artifact Polling Stops When:**
- Status transitions to `ready` (content complete)
- Status transitions to `published`
- User navigates away from page

**Research Polling Stops When:**
- Research data loaded successfully
- Status transitions to `ready` or `published`
- User navigates away from page

---

## Edge Cases & Special Handling

### 1. Published → Ready Auto-Transition

**Scenario:** User edits content of a published artifact
**Behavior:**
- Frontend detects content change
- Automatically updates status to `ready`
- "Mark as Published" button reappears
- User can re-publish after edits

**Implementation:**
```typescript
const handleContentChange = async (newContent: string) => {
  if (artifact?.status === 'published') {
    await updateArtifact.mutateAsync({
      id: artifact.id,
      updates: { status: 'ready' },
    })
  }
}
```

### 2. Browser Refresh During Processing

**Scenario:** User refreshes page while status is `writing`
**Behavior:**
- Page reloads
- Artifact query fetches current status
- WritingProgress renders correct step
- Editor remains locked
- Polling resumes automatically

**Implementation:**
- No special handling needed
- React Query refetches on mount
- Polling restarts based on status

### 3. Direct URL Access to Processing Artifact

**Scenario:** User navigates directly to `/portfolio/artifacts/{id}` where artifact is in `skeleton` status
**Behavior:**
- Page loads
- Detects status is `skeleton`
- Renders WritingProgress at step 2
- Editor locked
- Polling starts

**Implementation:**
- Standard page load behavior
- Status-based rendering logic handles all cases

### 4. Network Disconnect During Processing

**Scenario:** Network connection lost while artifact is in `research` status
**Behavior:**
- Polling fails silently
- React Query retries with exponential backoff
- When connection restored, polling resumes
- Status catches up to current state

**Implementation:**
- React Query handles retry logic
- No manual intervention needed

### 5. AI Service Failure

**Scenario:** `conductDeepResearch` tool throws error
**Behavior:**
- Error logged in backend
- Artifact remains in `research` status
- Frontend continues polling
- User may need to manually retry or cancel

**Implementation:**
- Backend catches errors, doesn't transition status
- Frontend shows persistent processing state
- Manual intervention may be required

---

## Testing Considerations

### Test Data Requirements

**For Status-Specific Tests:**
- Need artifacts in each status (`draft`, `research`, `skeleton`, `writing`, `creating_visuals`, `ready`, `published`)
- Need artifact with multi-section skeleton (for section tracking in `writing`)
- Need artifact with research data (for research polling tests)

**Setup Methods:**
1. **UI Creation:** Create via modal, wait for transitions (slow, E2E)
2. **MCP Tools:** Use `mcp__supabase__execute_sql` to insert test data
3. **API Endpoints:** Create test data endpoints for E2E tests
4. **AI Service Mock:** Mock AI tools to control transitions

### E2E Test Scenarios

**Critical Paths:**
1. Create draft → Create Content → Wait for all transitions → Mark as Published
2. Create draft → Save as Draft → Edit → Create Content → Transitions → Publish
3. Published artifact → Edit content → Auto-transition to ready → Re-publish

**Edge Cases:**
1. Refresh during processing → Maintains state
2. Direct URL to processing artifact → Renders correctly
3. Network disconnect → Recovers gracefully

---

## Migration Notes

### From 12-Status to 7-Status System

**Removed Statuses:**
- `skeleton_ready` → Merged into automatic `skeleton` transition
- `skeleton_approved` → Removed (no approval gate)
- `review_ready` → Merged into automatic `writing` transition
- `content_approved` → Removed (no approval gate)
- `humanity_checking` → Integrated into `writeFullContent` tool
- `researching` → Renamed to `research`
- `in_progress` → Split into specific processing statuses

**Database Migration:**
```sql
UPDATE artifacts
SET status = 'draft'
WHERE status IN ('skeleton_ready', 'skeleton_approved', 'review_ready', 'content_approved', 'humanity_checking', 'researching', 'in_progress');
```

**Frontend Changes:**
- Removed approval button components
- Simplified status badge logic
- Updated polling conditions
- Removed approval workflow UI

**Backend Changes:**
- Removed approval endpoints
- Updated AI tools to auto-transition
- Simplified status validation
- Integrated humanity check into writing tool

---

## Related Documentation

📖 **Testing Plan:** `/testing/playwright/status-flow-testing-plan.md`
📖 **State Machine:** `/frontend/src/features/portfolio/validators/stateMachine.ts`
📖 **Type Definitions:** `/frontend/src/features/portfolio/types/portfolio.ts`
📖 **Implementation Plan:** `/.claude/plans/wondrous-petting-rabin.md`

---

**Document Version History:**
- v2.0.0 (2026-01-25): Initial comprehensive documentation for 7-status system
