# Reference Picker for Content Creation

**Created:** 2026-03-05
**Last Updated:** 2026-03-05
**Version:** 3.0.0
**Status:** Complete (Phase 1 + Phase 2 + Phase 3)

## Overview

The Reference Picker allows users to select specific writing references during content creation. Instead of the AI using all active references of the matching type, users can choose exactly which writing samples inform the AI's voice matching. This gives users granular control over how their content sounds.

---

## User Perspective

### What It Does

When creating a new artifact (blog, social post, or case study), users see a collapsible "Writing References" section in the creation dialog. Expanding it reveals their writing reference library with:

- **Selectable cards** showing reference name, source icon, word count, and content preview
- **Type filtering** — pre-filtered to the matching content type with a toggle to show all
- **Selection count** — badge showing how many references are selected
- **Inline add** — ability to add new references without leaving the creation flow

### Where It Appears

| Location | Behavior |
|----------|----------|
| ArtifactForm dialog (create mode) | Collapsible section between tone selector and title input |
| ArtifactForm dialog (edit mode) | Not shown (references only affect initial AI generation) |
| Topic suggestion "Create Content" | Intermediate dialog (when references exist) lets user select before creating |
| FoundationsSection (foundations_approval) | Compact display of selected references with "Change" to re-select and re-analyze |

### User Flow

1. User clicks "+" to create new content
2. Selects type (blog/social_post/showcase) and tone
3. Expands "Writing References" section (optional)
4. Sees references filtered to the selected content type
5. Clicks cards to select/deselect (multi-select)
6. Optionally clicks "Add new reference" to add inline
7. Clicks "Save as Draft" or "Create Content"
8. Selected reference IDs are stored in artifact metadata
9. AI pipeline uses only selected references for voice matching

### Empty State

When no writing references exist, an educational empty state appears:
- Heading: "Your writing, your voice"
- Contextual message based on content type
- CTA button to add first reference
- Note: "This step is optional"

---

## Technical Perspective

### Component Architecture

```
ArtifactForm
└── Collapsible (Writing References)
    └── ReferencePicker
        ├── ReferencePickerCard (per reference, selectable)
        ├── ReferencePickerEmptyState (when no references)
        ├── "Add new reference" button
        └── InlineAddReferenceDialog (4-tab modal: Paste/File/URL/Publication)
```

### Components

| Component | File | Purpose |
|-----------|------|---------|
| `ReferencePicker` | `frontend/src/features/portfolio/components/writing-references/ReferencePicker.tsx` | Main picker with filtering, selection state, inline add |
| `ReferencePickerCard` | `...writing-references/ReferencePickerCard.tsx` | Selectable card variant (no delete/retry actions) |
| `ReferencePickerEmptyState` | `...writing-references/ReferencePickerEmptyState.tsx` | Educational empty state |
| `InlineAddReferenceDialog` | `...writing-references/InlineAddReferenceDialog.tsx` | Dialog for adding references inline (Paste/File/URL/Publication tabs) |

### Props Interface

```typescript
interface ReferencePickerProps {
  contentType: ArtifactType          // Pre-filter by content type
  selectedIds: string[]              // Currently selected reference IDs
  onSelectionChange: (ids: string[]) => void  // Selection callback
  previewLines?: 2 | 4              // Content preview line clamp
  maxHeightClass?: string            // Scrollable container height
}
```

### Data Flow

1. **Selection state** managed in `ArtifactForm` via `useState<string[]>([])`
2. **On submit**, selected IDs included in `metadata.selectedReferenceIds`
3. **Backend** reads `selectedReferenceIds` from `artifacts.metadata` JSONB
4. **Writing characteristics tool** uses `.in('id', selectedReferenceIds)` instead of `.eq('artifact_type', artifactType)` when selections exist

### Backend Integration

**File:** `backend/src/services/ai/agents/portfolio/tools/writingCharacteristicsTools.ts`

The `analyzeWritingCharacteristics` tool:
- Reads `selectedReferenceIds` from artifact metadata (same query as initial artifact fetch)
- When IDs provided: queries `user_writing_examples` with `.in('id', selectedReferenceIds)`, limit 10
- When no IDs: falls back to existing behavior — `.eq('artifact_type', artifactType)`, limit 5
- Also filters by `extraction_status === 'success'` and `is_active === true`

### Storage

Selected reference IDs are stored in the existing `artifacts.metadata` JSONB column:

```json
{
  "selectedReferenceIds": ["uuid-1", "uuid-2"],
  "author_brief": "...",
  "platform": "linkedin"
}
```

No database migration required.

### Type Definitions

`selectedReferenceIds?: string[]` added to:
- `SocialPostMetadata`
- `BlogMetadata`
- `ShowcaseMetadata`

(File: `frontend/src/features/portfolio/types/portfolio.ts`)

---

## Filtering Logic

| Scenario | Query |
|----------|-------|
| User selected 3 references | `.in('id', ['id1', 'id2', 'id3']).limit(10)` |
| User selected nothing | `.eq('artifact_type', artifactType).limit(5)` |
| Type filter toggle "Show all" | Client-side: shows all `extraction_status === 'success'` |
| Type filter toggle "Matching only" | Client-side: filters by `artifact_type === contentType` |

---

## Known Limitations

- Reference picker only appears in **create mode**, not edit mode
- References only affect the `analyzeWritingCharacteristics` pipeline step (not `writeFullContent` directly — that tool uses pre-analyzed characteristics)
- When user changes artifact type after selecting references, selected IDs persist but may be hidden by the type filter. The "+N other references" indicator shows the hidden count.
- URL/file extraction creates references in `pending` status — they are auto-selected by ID but won't appear in the picker until extraction completes (2s polling)

---

## Phase 2: Topic Suggestions & Foundations Re-analyze

Phase 2 extends reference selection to two additional content creation flows.

### Flow 1: Topic Suggestion Reference Dialog

When clicking "Create Content" on an `ArtifactSuggestionCard` in the chat panel, an intermediate reference selection dialog appears if the user has any writing references with `extraction_status === 'success'`.

**Component:** `ReferenceSelectionDialog` (`frontend/src/features/portfolio/components/writing-references/ReferenceSelectionDialog.tsx`)

**Props:**
```typescript
interface ReferenceSelectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contentType: ArtifactType
  onSkip: () => void
  onCreateWithReferences: (ids: string[]) => void
  isCreating?: boolean
}
```

**User Flow:**
1. User sees topic suggestion in chat → clicks "Create Content"
2. If user has references: `ReferenceSelectionDialog` opens
3. User selects references (multi-select) or clicks "Skip"
4. On "Create with N selected": artifact created with `metadata.selectedReferenceIds`
5. On "Skip": artifact created without references (default voice matching)
6. If user has zero references: dialog is bypassed, artifact creates immediately

**Callback chain:**
```
ArtifactSuggestionCard.onCreateContent(suggestion, metadata?)
  → StructuredChatMessage (pass-through)
    → ChatPanel.handleCreateContent(suggestion, metadata?)
      → createArtifactMutation.mutateAsync({ ...suggestion, metadata })
```

### Flow 2: Foundations References & Re-analyze

During `foundations_approval` or `skeleton` status, the `FoundationsSection` displays the selected writing references with the ability to change the selection and trigger re-analysis.

**Component:** `FoundationsReferences` (`frontend/src/features/portfolio/components/artifact/FoundationsReferences.tsx`)

**Props:**
```typescript
interface FoundationsReferencesProps {
  artifactType: ArtifactType
  selectedReferenceIds: string[]
  onReanalyze: (selectedIds: string[]) => void
  reanalyzeLoading: boolean
  editable: boolean
}
```

**Two modes:**
- **Compact** (default): Shows selected reference names, icons, word counts. "Using default voice matching" if none selected. "Change" button to expand.
- **Expanded**: Full `ReferencePicker` with local selection state. "Re-analyze with new references" button appears when selection differs from original. "Cancel" reverts and collapses.

**Re-analyze behavior:**
1. User clicks "Change" → expanded mode with `ReferencePicker`
2. User modifies selection → amber "Re-analyze with new references" button appears
3. Click re-analyze → `POST /api/artifacts/:id/re-analyze-foundations`
4. Backend updates `metadata.selectedReferenceIds`, re-runs foundations pipeline (steps 1-3)
5. Pipeline pauses at `foundations_approval` with new characteristics + skeleton
6. FoundationsReferences auto-collapses back to compact mode

**Disabled states:**
- During AI processing (`foundations`, `writing`, `creating_visuals`): editable=false, no "Change" button
- During re-analyze loading: approval button disabled, cancel button disabled

### Phase 2 Component Architecture

```
ArtifactSuggestionCard
├── ReferenceSelectionDialog (intermediate, when references exist)
│   └── ReferencePicker

FoundationsSection
├── FoundationsReferences (compact/expanded)
│   ├── Compact: reference names + "Change" button
│   └── Expanded: ReferencePicker + "Re-analyze" / "Cancel"
├── WritingCharacteristicsDisplay
├── RichTextEditor (skeleton)
└── FoundationsApprovedButton (disabled during re-analyze)
```

### Phase 2 Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useReanalyzeFoundations` | `frontend/src/features/portfolio/hooks/useReanalyzeFoundations.ts` | Mutation: POST re-analyze endpoint, invalidates artifact + characteristics queries |

### Phase 2 Backend

**Endpoint:** `POST /api/artifacts/:id/re-analyze-foundations`
**Controller:** `backend/src/controllers/foundationsReanalyze.controller.ts`

**Request:**
```json
{
  "selectedReferenceIds": ["uuid-1", "uuid-2"]
}
```

**Validation:**
- `selectedReferenceIds` must be an array of non-empty strings (or empty array for default voice)
- Artifact must exist and belong to authenticated user
- Status must be `skeleton` or `foundations_approval`

**Behavior:**
1. Merges `selectedReferenceIds` into existing artifact metadata JSONB
2. Calls `pipelineExecutor.reanalyzeFoundations(artifactId)`
3. Runs foundation steps (analyzeWritingCharacteristics → analyzeStorytellingStructure → generateContentSkeleton)
4. Pipeline pauses at `foundations_approval` with `pauseForApproval`

**Response (200):**
```json
{
  "success": true,
  "message": "Re-analysis complete",
  "traceId": "trace-xxx",
  "stepsCompleted": 3,
  "totalSteps": 3,
  "duration": 5000
}
```

**Error responses:** 400 (missing ID, invalid body, wrong status), 401 (unauthorized), 403 (not owner), 404 (not found), 500 (pipeline failure)

### Phase 2 PipelineExecutor Method

`PipelineExecutor.reanalyzeFoundations(artifactId: string)`:
- Sets status to `foundations` before starting
- Runs `PIPELINE_STEPS[1]` (analyzeWritingCharacteristics), `[2]` (analyzeStorytellingStructure), `[3]` (generateContentSkeleton)
- Handles `pauseForApproval` on the skeleton step
- On error, rolls back to `foundations_approval` status
- Each tool reads `selectedReferenceIds` from metadata internally (Phase 1 backend work)

---

## Phase 3: Post-Creation Reference Change with Content Regeneration

Phase 3 extends reference selection to artifacts that have already completed the content pipeline (`ready` or `published` status).

### What It Does

When an artifact is in `ready` or `published` status, users can change their writing references in the FoundationsSection and trigger a full content regeneration. A confirmation modal warns that existing content and images will be replaced.

### User Flow

1. User opens an artifact in `ready` or `published` status
2. Scrolls to FoundationsSection → clicks "Change" on references
3. Modifies selection → button shows **"Regenerate with new references"** (amber)
4. Clicks regenerate → **Confirmation modal** appears:
   - Title: "Regenerate Content?"
   - Warning: content and images will be replaced
   - Cancel / "Regenerate Content" (amber) buttons
5. Confirms → pipeline runs all steps except research (foundations → writing → images)
6. Artifact returns to `ready` status with regenerated content

### Differences from Phase 2 (Foundations Approval Re-analyze)

| Aspect | Phase 2 (skeleton/foundations_approval) | Phase 3 (ready/published) |
|--------|----------------------------------------|--------------------------|
| Button text | "Re-analyze with new references" | "Regenerate with new references" |
| Confirmation modal | None | Yes (AlertDialog) |
| Pipeline method | `reanalyzeFoundations` (steps 1-3, pauses) | `regenerateContent` (steps 1-5, no pause) |
| Rollback on failure | → `foundations_approval` | → original status (ready/published) |
| Result | New skeleton for approval | Fully regenerated content |

### Frontend Changes

**FoundationsReferences** — Added `reanalyzeButtonLabel?: string` prop for custom button text.

**FoundationsSection** — Passes `reanalyzeButtonLabel` through to FoundationsReferences.

**ArtifactPage** — Added:
- `isPostCreation` derived variable for status routing
- `handleReanalyze` routes to confirmation modal for ready/published, direct execution for skeleton/foundations_approval
- `AlertDialog` confirmation modal with `data-portal-ignore-click-outside`

### Backend Changes

**Controller:** `POST /api/artifacts/:id/re-analyze-foundations`
- Status guard expanded to `['skeleton', 'foundations_approval', 'ready', 'published']`
- Routes to `regenerateContent` for ready/published, `reanalyzeFoundations` for skeleton/foundations_approval

**PipelineExecutor.regenerateContent(artifactId)**:
- Status guard: `ready` or `published` only
- Runs `PIPELINE_STEPS.slice(1)` — all except `conductDeepResearch`
- Does NOT honor `pauseForApproval` — runs straight through
- Rolls back to original status on failure
- Intermediate status transitions are expected (foundations → foundations_approval → writing → etc.)

### Phase 3 Response (200)

```json
{
  "success": true,
  "message": "Content regeneration started",
  "traceId": "trace-xxx",
  "stepsCompleted": 5,
  "totalSteps": 5,
  "duration": 120000
}
```

---

## Related Documentation

- [Artifact Creation Flow](../flows/artifact-creation-flow.md)
- [Writing Style Analysis](./writing-style-analysis.md)
- [Content Creation Agent](./content-creation-agent.md)
- [Writing Style Page](../screens/writing-style-page.md)
