# Implementation Spec: Reference Picker for Content Creation - Phase 2

**PRD**: ./prd-phase-2.md
**Estimated Effort**: M

## Technical Approach

Phase 2 extends the `ReferencePicker` component from Phase 1 into the remaining two creation flows: topic suggestion acceptance and foundation approval. It also adds a backend endpoint for re-analyzing foundations with different reference selections.

For topic suggestions, we intercept the "Create Content" click on `ArtifactSuggestionCard` with an intermediate selection dialog. For foundation approval, we embed a compact reference summary in `FoundationsSection` with the ability to expand into the full picker and trigger re-analysis.

All frontend components reuse the `ReferencePicker` from Phase 1. The only new backend work is a `POST /api/artifacts/:id/re-analyze-foundations` endpoint.

## File Changes

### New Files

| File Path | Purpose |
|-----------|---------|
| `frontend/src/features/portfolio/components/writing-references/ReferenceSelectionDialog.tsx` | Dialog that wraps ReferencePicker for topic suggestion flow |
| `frontend/src/features/portfolio/components/artifact/FoundationsReferences.tsx` | Compact reference summary + expandable picker for FoundationsSection |
| `frontend/src/features/portfolio/hooks/useReanalyzeFoundations.ts` | Mutation hook for re-analyze foundations endpoint |
| `backend/src/controllers/foundationsReanalyze.controller.ts` | Handler for re-analyze foundations endpoint |

### Modified Files

| File Path | Changes |
|-----------|---------|
| `frontend/src/features/portfolio/components/chat/ArtifactSuggestionCard.tsx` | Intercept "Create Content" click to show ReferenceSelectionDialog |
| `frontend/src/features/portfolio/components/artifact/FoundationsSection.tsx` | Add FoundationsReferences component above writing characteristics |
| `frontend/src/features/portfolio/pages/ArtifactPage.tsx` | Pass selectedReferenceIds to FoundationsSection |
| `backend/src/routes/artifact.routes.ts` | Add re-analyze foundations route |
| `backend/src/services/ai/PipelineExecutor.ts` | Add `reanalyzeFoundations` method |

## Implementation Details

### 1. ReferenceSelectionDialog Component

**Overview**: A `Dialog` wrapping `ReferencePicker` that appears as an intermediate step when accepting a topic suggestion via "Create Content".

```typescript
interface ReferenceSelectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The artifact type from the suggestion */
  contentType: ArtifactType
  /** Called when user clicks "Skip" */
  onSkip: () => void
  /** Called when user clicks "Create with N selected" */
  onCreateWithReferences: (selectedIds: string[]) => void
  /** Loading state while creating */
  isCreating?: boolean
}
```

**Key decisions**:
- Uses `Dialog` from shadcn/ui with `data-portal-ignore-click-outside`
- Title: "Select Writing References"
- Subtitle: "Choose references for the AI to match your voice when writing this {contentType label}."
- Full `ReferencePicker` inside dialog body with `previewLines={4}` and `maxHeightClass="max-h-[400px]"`
- Footer buttons: "Skip" (outline) and "Create with N selected" (primary, shows count)
- "Create with N selected" is always enabled (0 selected = proceed without refs)
- **Dialog NOT shown** when user has zero references (checked before opening)

**Implementation steps**:
1. Create dialog with title and subtitle
2. Embed `ReferencePicker` with local selection state
3. Add footer with Skip and Create buttons
4. Wire up callbacks for both actions

```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent
    data-portal-ignore-click-outside
    className="max-w-2xl max-h-[80vh] flex flex-col"
  >
    <DialogHeader>
      <DialogTitle>Select Writing References</DialogTitle>
      <DialogDescription>
        Choose references for the AI to match your voice when writing this {typeLabel}.
      </DialogDescription>
    </DialogHeader>

    <div className="flex-1 overflow-hidden">
      <ReferencePicker
        contentType={contentType}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        previewLines={4}
        maxHeightClass="max-h-[400px]"
      />
    </div>

    <DialogFooter>
      <Button variant="outline" onClick={onSkip} disabled={isCreating}>
        Skip
      </Button>
      <Button onClick={() => onCreateWithReferences(selectedIds)} disabled={isCreating}>
        {isCreating ? (
          <><Loader2 className="h-4 w-4 animate-spin mr-2" />Creating...</>
        ) : (
          <><Sparkles className="h-4 w-4 mr-2" />
          {selectedIds.length > 0
            ? `Create with ${selectedIds.length} selected`
            : 'Create without references'
          }</>
        )}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### 2. ArtifactSuggestionCard Integration

**File**: `frontend/src/features/portfolio/components/chat/ArtifactSuggestionCard.tsx`

**Overview**: Modify the "Create Content" button flow to check for references and show the selection dialog.

**Key decisions**:
- Check `useWritingExamples()` count to determine if dialog should show
- If user has 0 references: bypass dialog, proceed with existing behavior
- If user has 1+ references: show `ReferenceSelectionDialog` before creating
- Selected reference IDs passed through to artifact creation metadata

**Implementation steps**:
1. Import `ReferenceSelectionDialog` and `useWritingExamples`
2. Add `showRefDialog` state
3. Modify `handleCreateContent` to open dialog instead of creating immediately
4. Add dialog callbacks: `handleSkip` (creates without refs) and `handleCreateWithRefs` (creates with refs)
5. Render `ReferenceSelectionDialog` at bottom of component

```typescript
// Check if user has references
const { data: writingExamples = [] } = useWritingExamples()
const hasReferences = writingExamples.some(r => r.extraction_status === 'success')

const [showRefDialog, setShowRefDialog] = useState(false)

const handleCreateContent = async () => {
  if (hasReferences) {
    // Show reference selection dialog
    setShowRefDialog(true)
  } else {
    // No references — proceed with existing behavior
    await originalCreateContent()
  }
}

const handleCreateWithRefs = async (selectedIds: string[]) => {
  setShowRefDialog(false)
  // Create artifact with selectedReferenceIds in metadata
  await onCreateContent?.({
    ...suggestion,
    metadata: { selectedReferenceIds: selectedIds.length > 0 ? selectedIds : undefined },
  })
}

const handleSkipRefs = async () => {
  setShowRefDialog(false)
  await originalCreateContent()
}
```

### 3. FoundationsReferences Component

**Overview**: Compact reference summary for the FoundationsSection with expandable picker and re-analyze capability.

```typescript
interface FoundationsReferencesProps {
  artifactId: string
  artifactType: ArtifactType
  selectedReferenceIds: string[]
  onSelectionChange: (ids: string[]) => void
  /** Whether the section is editable (not during AI processing) */
  editable: boolean
  /** Current artifact status */
  status: ArtifactStatus
}
```

**Key decisions**:
- Two modes: **compact** (default) and **expanded** (after clicking "Change")
- **Compact mode**: Shows selected reference names as a list with word counts, "Change" button
- **Expanded mode**: Full `ReferencePicker` with `previewLines={4}`
- "Re-analyze with new references" button appears when selection differs from original
- Re-analyze triggers `useReanalyzeFoundations` mutation
- Disabled when `editable === false` (during AI processing)

**Implementation steps**:
1. Create component with compact/expanded state
2. Compact mode: Fetch selected references by ID, display as summary list
3. "Change" button toggles to expanded mode
4. Expanded mode: Full `ReferencePicker`, track if selection changed
5. "Re-analyze" button: calls mutation, shows loading, resets to compact on success
6. Handle "Cancel" to revert selection changes

```tsx
// Compact view
{!isExpanded && (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
        Writing References
        <span className="text-xs font-normal">
          {selectedReferenceIds.length} selected
        </span>
      </h4>
      {editable && (
        <Button variant="ghost" size="sm" onClick={() => setIsExpanded(true)}>
          Change
        </Button>
      )}
    </div>
    <div className="space-y-1">
      {selectedReferences.map(ref => (
        <div key={ref.id} className="flex items-center gap-2 text-xs text-muted-foreground">
          <SourceIcon className="h-3 w-3" />
          <span className="truncate">{ref.name}</span>
          <span className="text-muted-foreground/50 tabular-nums">{ref.word_count}w</span>
        </div>
      ))}
    </div>
  </div>
)}

// Expanded view
{isExpanded && (
  <div className="space-y-3">
    <ReferencePicker
      contentType={artifactType}
      selectedIds={localSelectedIds}
      onSelectionChange={setLocalSelectedIds}
      previewLines={4}
    />
    <div className="flex gap-2">
      <Button variant="ghost" size="sm" onClick={handleCancel}>
        Cancel
      </Button>
      {hasSelectionChanged && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleReanalyze}
          disabled={reanalyzeLoading}
          className="text-amber-500 border-amber-500/30 hover:bg-amber-500/10"
        >
          {reanalyzeLoading ? (
            <><Loader2 className="h-3 w-3 animate-spin mr-1.5" />Re-analyzing...</>
          ) : (
            <><RotateCcw className="h-3 w-3 mr-1.5" />Re-analyze with new references</>
          )}
        </Button>
      )}
    </div>
  </div>
)}
```

### 4. FoundationsSection Integration

**File**: `frontend/src/features/portfolio/components/artifact/FoundationsSection.tsx`

**Overview**: Add `FoundationsReferences` above the writing characteristics display.

**Key decisions**:
- Render `FoundationsReferences` as first item in the content area
- Pass artifact metadata's `selectedReferenceIds` and artifact type
- Editable only when skeleton is editable (not during AI processing)
- When re-analysis triggers, section shows loading state

**Implementation steps**:
1. Add `selectedReferenceIds` and `artifactType` to `FoundationsSectionProps`
2. Add `onReanalyze` callback prop
3. Render `FoundationsReferences` before `WritingCharacteristicsDisplay`
4. Wire up re-analyze to update metadata and trigger pipeline restart

```typescript
// New props
export interface FoundationsSectionProps {
  // ... existing props
  artifactType?: ArtifactType
  selectedReferenceIds?: string[]
  onSelectedReferencesChange?: (ids: string[]) => void
  onReanalyze?: (selectedIds: string[]) => void
  reanalyzeLoading?: boolean
}

// In expanded content area, before WritingCharacteristicsDisplay:
{artifactType && (
  <FoundationsReferences
    artifactId={artifactId}
    artifactType={artifactType}
    selectedReferenceIds={selectedReferenceIds ?? []}
    onSelectionChange={onSelectedReferencesChange ?? (() => {})}
    editable={isSkeletonEditable}
    status={status}
  />
)}
```

### 5. useReanalyzeFoundations Hook

**Overview**: React Query mutation hook for the re-analyze foundations endpoint.

```typescript
export function useReanalyzeFoundations() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      artifactId,
      selectedReferenceIds,
    }: {
      artifactId: string
      selectedReferenceIds: string[]
    }) => {
      const response = await api.post(
        `/api/artifacts/${artifactId}/re-analyze-foundations`,
        { selectedReferenceIds }
      )
      return response
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: artifactKeys.detail(variables.artifactId),
      })
      queryClient.invalidateQueries({
        queryKey: ['writing-characteristics', variables.artifactId],
      })
    },
  })
}
```

### 6. Backend Re-analyze Endpoint

**File**: `backend/src/controllers/foundationsReanalyze.controller.ts`

**Overview**: Endpoint that updates artifact metadata with new reference IDs and restarts the foundations analysis pipeline.

```typescript
// POST /api/artifacts/:id/re-analyze-foundations
export const reanalyzeFoundations = async (req: Request, res: Response) => {
  const { id } = req.params
  const { selectedReferenceIds } = req.body
  const userId = req.user.id

  // Validate artifact exists and belongs to user
  const artifact = await getArtifact(id, userId)
  if (!artifact) {
    throw new ApiError(404, 'Artifact not found')
  }

  // Validate artifact is in an approval-eligible status
  const allowedStatuses = ['skeleton', 'foundations_approval']
  if (!allowedStatuses.includes(artifact.status)) {
    throw new ApiError(400, `Cannot re-analyze in ${artifact.status} status`)
  }

  // Update artifact metadata with new reference IDs
  const updatedMetadata = {
    ...artifact.metadata,
    selectedReferenceIds,
  }
  await updateArtifactMetadata(id, updatedMetadata)

  // Reset status to 'foundations' to re-trigger analysis
  await updateArtifactStatus(id, 'foundations')

  // Re-run foundations pipeline (analyzeWritingCharacteristics + generateContentSkeleton)
  const result = await pipelineExecutor.reanalyzeFoundations(id, selectedReferenceIds)

  return res.json({
    success: true,
    message: 'Re-analysis started',
  })
}
```

**Route registration** in `backend/src/routes/artifact.routes.ts`:

```typescript
router.post(
  '/artifacts/:id/re-analyze-foundations',
  requireAuth,
  reanalyzeFoundations
)
```

### 7. PipelineExecutor.reanalyzeFoundations

**File**: `backend/src/services/ai/PipelineExecutor.ts`

**Overview**: Method that re-runs only the foundations analysis steps (not the full pipeline).

```typescript
async reanalyzeFoundations(artifactId: string, selectedReferenceIds: string[]) {
  // Run only foundations-related tools:
  // 1. analyzeWritingCharacteristics (with selectedReferenceIds)
  // 2. generateContentSkeleton (with selectedReferenceIds, pauseForApproval: true)

  // Set status to 'foundations'
  await this.updateStatus(artifactId, 'foundations')

  // Run analysis
  await this.runTool('analyzeWritingCharacteristics', {
    artifactId,
    selectedReferenceIds,
  })

  // Run skeleton generation
  await this.runTool('generateContentSkeleton', {
    artifactId,
    selectedReferenceIds,
    pauseForApproval: true,
  })

  // Status will be set to 'foundations_approval' by generateContentSkeleton
}
```

### 8. Educational Empty States

**Overview**: Contextual messages for each flow when user has no references.

**Key decisions**:
- Reuse `ReferencePickerEmptyState` from Phase 1
- Vary the message based on the context prop
- All empty states include the inline add reference CTA

```typescript
// Context-specific messaging
const CONTEXT_MESSAGES: Record<string, { heading: string; body: string }> = {
  creation: {
    heading: 'Your writing, your voice',
    body: 'Add writing samples so the AI learns your unique style and tone. Better references = more authentic content.',
  },
  suggestion: {
    heading: 'Personalize AI-generated content',
    body: 'The AI can match your writing style when you provide reference samples. Add your best work to get started.',
  },
  foundations: {
    heading: 'No references selected',
    body: 'The AI used its default voice for this content. Add writing references to get content that sounds like you.',
  },
}
```

## API Design

### New Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/artifacts/:id/re-analyze-foundations` | Re-run foundations analysis with new reference selection |

### Request/Response Examples

```typescript
// POST /api/artifacts/:id/re-analyze-foundations
// Request
{
  "selectedReferenceIds": ["uuid-1", "uuid-2"]
}

// Response (200)
{
  "success": true,
  "message": "Re-analysis started"
}

// Error Response (400)
{
  "error": "Cannot re-analyze in writing status"
}
```

## Testing Requirements

### Unit Tests

| Test File | Coverage |
|-----------|----------|
| `frontend/src/features/portfolio/components/writing-references/__tests__/ReferenceSelectionDialog.test.tsx` | Dialog rendering, skip/create callbacks |
| `frontend/src/features/portfolio/components/artifact/__tests__/FoundationsReferences.test.tsx` | Compact/expanded modes, re-analyze button |

**Key test cases**:
- Dialog shows ReferencePicker with correct content type
- Skip button calls onSkip callback
- Create button passes selected IDs
- Dialog not shown when hasReferences is false
- FoundationsReferences compact mode shows reference names
- "Change" button expands to full picker
- Re-analyze button appears only when selection changed
- Re-analyze button disabled during loading

### Integration Tests

| Test File | Coverage |
|-----------|----------|
| `backend/src/controllers/__tests__/foundationsReanalyze.test.ts` | Endpoint validation, status checks |

**Key scenarios**:
- Re-analyze succeeds from `foundations_approval` status
- Re-analyze fails from `writing` status (wrong status)
- Selected reference IDs are stored in metadata
- Pipeline re-runs with updated references

### Manual Testing

- [ ] Click "Create Content" on suggestion card with references — dialog appears
- [ ] Click "Skip" — artifact created without reference selection
- [ ] Select references and click "Create with N selected" — artifact created with references
- [ ] Click "Create Content" with zero references — no dialog, proceeds normally
- [ ] In FoundationsSection, verify selected references displayed in compact mode
- [ ] Click "Change", modify selection, verify "Re-analyze" button appears
- [ ] Click "Re-analyze", verify loading state and pipeline restart
- [ ] After re-analysis, verify new writing characteristics and skeleton
- [ ] Verify "Foundations Approved" button disabled during re-analysis
- [ ] Cancel reference change, verify selection reverts

## Error Handling

| Error Scenario | Handling Strategy |
|----------------|-------------------|
| Re-analyze from wrong status | Return 400 with clear message |
| Re-analyze with invalid reference IDs | Log warning, proceed with valid IDs only |
| Pipeline fails during re-analysis | Set artifact status to `foundations_approval` with error, show error in FoundationsSection |
| User navigates away during re-analysis | Pipeline continues in background, status updates on return |
| Network error on re-analyze | Show toast error, keep current selection, allow retry |

## Validation Commands

```bash
# Type checking
cd frontend && npx tsc --noEmit

# Unit tests
cd frontend && npm run test

# Build
npm run build

# Backend type checking
cd backend && npx tsc --noEmit
```

## Rollout Considerations

- **Feature flag**: None (available to all)
- **Monitoring**: Track re-analyze frequency to understand if users change references often
- **Rollback plan**: Remove `ReferenceSelectionDialog` from suggestion cards (bypasses dialog), remove `FoundationsReferences` from `FoundationsSection` (hides reference summary)
- **Backward compatibility**: Existing artifacts without `selectedReferenceIds` continue working unchanged

---

*This spec is ready for implementation. Follow the patterns and validate at each step.*
