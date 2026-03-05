# Implementation Spec: Reference Picker for Content Creation - Phase 1

**PRD**: ./prd-phase-1.md
**Estimated Effort**: L

## Technical Approach

Phase 1 builds a reusable `ReferencePicker` component, integrates it into the `ArtifactForm` creation dialog, and modifies the backend AI pipeline to accept and filter by selected reference IDs.

The approach reuses existing patterns heavily: the `ReferenceCard` editorial aesthetic (left accent stripe, source icons, word counts), the `useWritingExamples` hook for data fetching, and the existing upload dialog patterns for inline reference creation. The picker is a controlled component receiving `selectedIds` and `onSelectionChange` — making it trivially reusable across Phase 2 flows.

Backend changes are minimal: the `selectedReferenceIds` array is stored in the existing `artifacts.metadata` JSONB field (no migration needed), and pipeline tools receive this array to filter their `user_writing_examples` queries.

## File Changes

### New Files

| File Path | Purpose |
|-----------|---------|
| `frontend/src/features/portfolio/components/writing-references/ReferencePicker.tsx` | Core multi-select picker component with inline previews, type filter, and selection state |
| `frontend/src/features/portfolio/components/writing-references/ReferencePickerCard.tsx` | Selectable variant of ReferenceCard optimized for the picker context |
| `frontend/src/features/portfolio/components/writing-references/ReferencePickerEmptyState.tsx` | Educational empty state component |
| `frontend/src/features/portfolio/components/writing-references/InlineAddReferenceDialog.tsx` | Modal for adding new references inline during content creation |

### Modified Files

| File Path | Changes |
|-----------|---------|
| `frontend/src/features/portfolio/components/forms/ArtifactForm.tsx` | Add ReferencePicker as collapsible section between tone/tags separator and title input |
| `frontend/src/features/portfolio/types/portfolio.ts` | Add `selectedReferenceIds?: string[]` to artifact metadata type |
| `backend/src/services/ai/agents/portfolio/tools/researchTools.ts` | Accept `selectedReferenceIds`, filter `user_writing_examples` query |
| `backend/src/services/ai/agents/portfolio/tools/foundationTools.ts` | Accept `selectedReferenceIds`, pass to writing characteristics analysis |
| `backend/src/services/ai/agents/portfolio/tools/writingTools.ts` | Accept `selectedReferenceIds`, use filtered references in content generation |
| `backend/src/services/ai/PipelineExecutor.ts` | Read `selectedReferenceIds` from artifact metadata and pass to pipeline tools |

## Implementation Details

### 1. ReferencePickerCard Component

**Pattern to follow**: `frontend/src/features/portfolio/components/writing-references/ReferenceCard.tsx`

**Overview**: A selectable variant of the existing ReferenceCard. Removes delete/retry actions, adds checkbox selection, and expands the inline content preview.

```typescript
interface ReferencePickerCardProps {
  reference: UserWritingExample
  isSelected: boolean
  onToggle: (id: string) => void
  previewLines?: 2 | 4  // line-clamp value, default 4
}
```

**Key decisions**:
- Reuse `getSourceIcon`, `stripMarkdown`, `STATUS_CONFIG` from existing `ReferenceCard`
- Selected state: `border-brand-300/40` border + `bg-brand-300` left stripe (3px)
- Unselected state: standard `border-border` + `bg-muted-foreground` stripe
- Checkbox position: inline with header row, before source icon
- Content preview: `line-clamp-{previewLines}` with CSS mask fade at bottom
- Only show references with `extraction_status === 'success'` (skip pending/extracting/failed)

**Implementation steps**:
1. Create component file with props interface
2. Copy source icon and status helpers from ReferenceCard (or extract to shared util)
3. Build card layout: checkbox + source icon + name/meta + word count
4. Add inline content preview with configurable line clamp
5. Apply selection border/stripe styling based on `isSelected`
6. Handle click on entire card to toggle selection

```typescript
// Selection styling
const cardClasses = cn(
  'group relative rounded-xl border bg-card overflow-hidden transition-all duration-200 cursor-pointer',
  isSelected
    ? 'border-brand-300/40 shadow-md shadow-brand-300/5'
    : 'border-border hover:border-brand-300/20',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
)

// Left accent stripe
const stripeClasses = cn(
  'absolute left-0 top-0 bottom-0 w-[3px] transition-colors duration-200',
  isSelected ? 'bg-brand-300' : 'bg-muted-foreground/30'
)

// Inline preview with fade
<p
  className={cn(
    'text-xs text-muted-foreground/70 pl-11 leading-relaxed',
    previewLines === 2 ? 'line-clamp-2' : 'line-clamp-4'
  )}
  style={{
    maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
    WebkitMaskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
  }}
>
  {stripMarkdown(reference.content).substring(0, 500)}
</p>
```

### 2. ReferencePicker Component

**Overview**: Core multi-select picker that fetches writing examples and renders selectable cards with type filtering.

```typescript
interface ReferencePickerProps {
  /** Pre-filter to this content type */
  contentType: ArtifactType
  /** Currently selected reference IDs */
  selectedIds: string[]
  /** Called when selection changes */
  onSelectionChange: (ids: string[]) => void
  /** Line clamp for preview text (2 for compact/dialog, 4 for full) */
  previewLines?: 2 | 4
  /** Max height CSS class (e.g., 'max-h-[240px]' for dialog context) */
  maxHeightClass?: string
  /** Called when a new reference is added inline */
  onReferenceAdded?: (reference: UserWritingExample) => void
}
```

**Key decisions**:
- Uses `useWritingExamples()` hook to fetch all references
- Filters by `artifact_type === contentType` when filter is active
- Only displays references where `extraction_status === 'success'`
- Type filter: `Switch` from shadcn/ui with label "Show all types"
- Header shows: "Writing References" label + "N selected" badge
- Hidden count: calculates non-matching type count and shows "+N other references"
- Add button: dashed-border card at bottom

**Implementation steps**:
1. Create component with props interface
2. Fetch references with `useWritingExamples()`
3. Implement type filtering logic with `showAllTypes` state
4. Render header with label, selected count, and type filter toggle
5. Map filtered references to `ReferencePickerCard` components
6. Add hidden count indicator when filter is active
7. Add "Add new reference" dashed card that opens `InlineAddReferenceDialog`
8. Render `ReferencePickerEmptyState` when no references exist

```typescript
// Type filtering
const [showAllTypes, setShowAllTypes] = useState(false)
const { data: allReferences = [] } = useWritingExamples()

const successfulRefs = allReferences.filter(r => r.extraction_status === 'success')
const filteredRefs = showAllTypes
  ? successfulRefs
  : successfulRefs.filter(r => r.artifact_type === contentType)
const hiddenCount = successfulRefs.length - filteredRefs.length

// Selection toggle
const handleToggle = (id: string) => {
  onSelectionChange(
    selectedIds.includes(id)
      ? selectedIds.filter(x => x !== id)
      : [...selectedIds, id]
  )
}
```

### 3. ReferencePickerEmptyState Component

**Overview**: Educational empty state explaining the value of writing references.

```typescript
interface ReferencePickerEmptyStateProps {
  onAddReference: () => void
  contentType: ArtifactType
}
```

**Key decisions**:
- Icon: `PenLine` from lucide-react (writing-themed, not generic)
- Heading: "Your writing, your voice"
- Body: Contextual message explaining how references improve the specific content type
- CTA button: "Add your first reference" (primary variant, small size)
- Below CTA: "This step is optional" in muted text

**Implementation steps**:
1. Create component with educational copy
2. Contextualize message based on content type
3. Add CTA button that triggers `onAddReference`
4. Add optional skip note

### 4. InlineAddReferenceDialog Component

**Pattern to follow**: `frontend/src/features/portfolio/components/writing-references/ReferenceUploadDialog.tsx`

**Overview**: Modal dialog for adding a new reference without leaving the content creation flow.

```typescript
interface InlineAddReferenceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pre-populate the artifact type selector */
  defaultArtifactType: ArtifactType
  /** Called when reference is successfully created */
  onSuccess: (reference: UserWritingExample) => void
}
```

**Key decisions**:
- Uses `Dialog` from shadcn/ui with `data-portal-ignore-click-outside`
- Reuses the tab structure from existing `ReferenceUploadDialog`: Paste, File, URL, Platform
- Type selector pre-populated with `defaultArtifactType`
- On successful creation, calls `onSuccess` with the new reference, then closes
- Reuses hooks: `useCreateWritingExample`, `useUploadWritingExample`, `useExtractFromUrl`, `useExtractPublication`

**Implementation steps**:
1. Create dialog shell with tabs
2. Implement Paste tab (name + type + textarea + word count)
3. Implement File tab (reuse `FileDropZone`)
4. Implement URL tab (name + url input + type)
5. Implement Platform tab (reuse `PublicationUrlInput`)
6. Wire up mutation hooks
7. On success: call `onSuccess`, invalidate writing examples query, close dialog

### 5. ArtifactForm Integration

**Pattern to follow**: Existing `ToneSelector` and `TagsInput` integration in `ArtifactForm.tsx`

**Overview**: Add a collapsible `ReferencePicker` section to the ArtifactForm, managing selection state and passing selected IDs through the creation payload.

**Key decisions**:
- Position: Between the `border-t border-border` separator (after tone) and the Title input
- Uses `Collapsible` from shadcn/ui
- Collapsed summary: "Writing References · N selected"
- Selection state managed locally in form, included in `CreateArtifactInput` output
- When no references exist: section shows but collapsed, with subtle "(optional)" label

**Implementation steps**:
1. Add `selectedReferenceIds` state to ArtifactForm
2. Import and render `ReferencePicker` in a `Collapsible` wrapper
3. Add collapsible trigger with selection summary
4. Pass `selectedReferenceIds` through `handleSaveDraft` and `handleCreateContent` callbacks
5. Include in `CreateArtifactInput` as `metadata.selectedReferenceIds`

```typescript
// In ArtifactForm
const [selectedReferenceIds, setSelectedReferenceIds] = useState<string[]>([])
const [refsCollapsed, setRefsCollapsed] = useState(false)

// In form submission handlers
const handleCreateContent = handleSubmit((data: ArtifactFormData) => {
  onCreateContent?.({
    type: data.type,
    title: data.title,
    content: data.content,
    tone: data.tone,
    tags: data.tags,
    metadata: {
      selectedReferenceIds: selectedReferenceIds.length > 0 ? selectedReferenceIds : undefined,
    },
  })
})
```

### 6. CreateArtifactInput Type Update

**File**: `frontend/src/features/portfolio/types/portfolio.ts`

Add `selectedReferenceIds` to the metadata type:

```typescript
export interface ArtifactMetadata {
  // ... existing fields
  selectedReferenceIds?: string[]
  // ... existing fields
}
```

Also update `CreateArtifactInput` if metadata isn't already included:

```typescript
export interface CreateArtifactInput {
  type: ArtifactType
  title: string
  content?: string
  tone?: ToneOption
  tags?: string[]
  metadata?: Partial<ArtifactMetadata>
}
```

### 7. Backend Pipeline Integration

**Overview**: Modify the AI pipeline to read `selectedReferenceIds` from artifact metadata and filter writing examples queries accordingly.

**Key decisions**:
- `PipelineExecutor` reads `selectedReferenceIds` from artifact metadata at pipeline start
- Passes the array to each tool that queries `user_writing_examples`
- When array is provided and non-empty: `WHERE id = ANY($1)` filter
- When array is empty or undefined: existing behavior (all active references of matching type)
- No new API endpoints needed — metadata is saved during artifact creation

**Implementation steps**:
1. In `PipelineExecutor.ts`: extract `selectedReferenceIds` from artifact metadata
2. Pass to tool context/params
3. In `foundationTools.ts` (`analyzeWritingCharacteristics`): add optional `selectedReferenceIds` param to the writing examples query
4. In `writingTools.ts` (`writeFullContent`): same filter
5. In `researchTools.ts`: if applicable, same filter (research may not use writing examples)

```typescript
// In tool's writing examples query
const query = supabase
  .from('user_writing_examples')
  .select('*')
  .eq('user_id', userId)
  .eq('is_active', true)
  .eq('extraction_status', 'success')

// Apply selected references filter if provided
if (selectedReferenceIds && selectedReferenceIds.length > 0) {
  query.in('id', selectedReferenceIds)
} else {
  // Fall back to type-based filtering (existing behavior)
  query.eq('artifact_type', artifactType)
}
```

## Data Model

### No Schema Changes Required

Selected reference IDs are stored in the existing `artifacts.metadata` JSONB column:

```json
{
  "selectedReferenceIds": ["uuid-1", "uuid-2", "uuid-3"],
  "linkedArtifacts": [],
  "visuals_metadata": {}
}
```

### State Shape

```typescript
// ReferencePicker local state
interface ReferencePickerState {
  selectedIds: string[]      // Managed by parent via props
  showAllTypes: boolean      // Local filter toggle
  addDialogOpen: boolean     // Inline add reference modal
}

// ArtifactForm additions
interface ArtifactFormState {
  selectedReferenceIds: string[]  // Passed to metadata on submit
  refsCollapsed: boolean          // Collapsible state
}
```

## Testing Requirements

### Unit Tests

| Test File | Coverage |
|-----------|----------|
| `frontend/src/features/portfolio/components/writing-references/__tests__/ReferencePicker.test.tsx` | Selection, filtering, empty states |
| `frontend/src/features/portfolio/components/writing-references/__tests__/ReferencePickerCard.test.tsx` | Selection styling, preview rendering |

**Key test cases**:
- Renders all successful references
- Filters references by content type
- Toggle "show all types" reveals hidden references
- Selecting a card adds ID to selection
- Deselecting a card removes ID from selection
- Empty state renders when no references
- Hidden count shows correct number
- Only shows references with `extraction_status === 'success'`

### Integration Tests

| Test File | Coverage |
|-----------|----------|
| `frontend/src/features/portfolio/components/forms/__tests__/ArtifactForm.test.tsx` | ReferencePicker integration in form |

**Key scenarios**:
- ArtifactForm includes reference picker section
- Selected reference IDs are passed in form submission
- Collapsible section expands/collapses correctly
- Creating content without references proceeds normally

### Manual Testing

- [ ] Open ArtifactForm, verify reference picker appears below tone selector
- [ ] Select 2 references, verify selection summary shows "2 selected"
- [ ] Toggle "Show all types" and verify hidden references appear
- [ ] Click "Add new reference", verify modal opens with correct upload tabs
- [ ] Add a reference via paste, verify it appears in picker and is auto-selected
- [ ] Create content with selected references, verify metadata includes IDs
- [ ] Create content with no references selected, verify it proceeds normally
- [ ] Verify the AI-generated content reflects the selected reference's voice

## Error Handling

| Error Scenario | Handling Strategy |
|----------------|-------------------|
| Writing examples fetch fails | Show error message in picker area, allow proceeding without references |
| Inline add reference fails | Show error in modal, keep modal open for retry |
| No references match content type | Show hidden count with toggle prompt |
| Pipeline receives invalid reference IDs | Log warning, fall back to all active references |
| Reference deleted after selection | Filter out missing IDs at pipeline start, proceed with remaining |

## Validation Commands

```bash
# Type checking
cd frontend && npx tsc --noEmit

# Unit tests
cd frontend && npm run test

# Build
npm run build

# Integration tests (if available)
cd frontend && npm run test:integration
```

## Rollout Considerations

- **Feature flag**: None (available to all)
- **Monitoring**: Track `selectedReferenceIds` usage in artifact metadata to measure adoption
- **Rollback plan**: Remove `ReferencePicker` from `ArtifactForm`, pipeline falls back to existing behavior (all active references)
- **Backward compatibility**: Existing artifacts without `selectedReferenceIds` continue working unchanged

---

*This spec is ready for implementation. Follow the patterns and validate at each step.*
