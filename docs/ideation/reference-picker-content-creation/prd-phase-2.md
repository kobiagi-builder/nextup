# PRD: Reference Picker for Content Creation - Phase 2

**Contract**: ./contract.md
**Phase**: 2 of 2
**Focus**: Topic suggestions flow, foundation approval re-run, and polished empty states

## Phase Overview

Phase 2 extends the reference picker into the remaining two content creation flows: topic suggestion acceptance and foundation approval. These integrations require different UX patterns than the manual creation dialog.

For topic suggestions, users need an intermediate selection step when clicking "Create Content" on a suggestion card. For foundation approval, users need to view and change their reference selection, then re-trigger the writing analysis with updated references.

This phase completes the feature by ensuring reference selection is available at every content creation touchpoint, making voice control a first-class citizen of the content pipeline.

## User Stories

1. As a content creator, I want to select references when I accept an AI topic suggestion, so that the generated content uses my intended voice for that specific idea
2. As a content creator, I want to see and change which references were used during foundation approval, so that I can adjust the voice direction before the AI writes the full content
3. As a content creator, I want to re-run the writing analysis with different references, so that I can compare how different reference selections affect the content direction
4. As a content creator, I want to understand the value of adding references when I have none, so that I'm motivated to invest time in setting up my reference library

## Functional Requirements

### Topic Suggestion Integration

- **FR-2.1**: When user clicks "Create Content" on an `ArtifactSuggestionCard`, display a reference selection dialog before triggering the AI pipeline
- **FR-2.2**: The dialog uses the `ReferencePicker` component from Phase 1, pre-filtered to the suggestion's content type
- **FR-2.3**: Dialog has "Skip" and "Create with References" action buttons
- **FR-2.4**: "Skip" proceeds without reference selection (existing behavior)
- **FR-2.5**: "Create with References" creates the artifact with `selectedReferenceIds` in metadata, then triggers AI pipeline
- **FR-2.6**: If user has no references, skip the dialog entirely and proceed with existing behavior (no interruption for users who haven't set up references)

### Foundation Approval Integration

- **FR-2.7**: Add a "Writing References" section to the `FoundationsSection` component, above or alongside the skeleton editor
- **FR-2.8**: Display currently selected references (from artifact metadata) as summary cards
- **FR-2.9**: Allow user to modify the reference selection using the `ReferencePicker` component
- **FR-2.10**: When reference selection changes, show a "Re-analyze with new references" button
- **FR-2.11**: Clicking "Re-analyze" triggers re-run of `analyzeWritingCharacteristics` and `generateContentSkeleton` with the updated reference IDs
- **FR-2.12**: During re-analysis, show loading state and disable the "Foundations Approved" button
- **FR-2.13**: After re-analysis completes, update the FoundationsSection with new writing characteristics and skeleton
- **FR-2.14**: Update the artifact metadata with the new `selectedReferenceIds`

### Backend Re-analysis Support

- **FR-2.15**: Create endpoint `POST /api/artifacts/:id/re-analyze-foundations` that accepts `{ selectedReferenceIds: string[] }`
- **FR-2.16**: Endpoint updates artifact metadata, resets status to `foundations`, and re-runs analysis pipeline steps (analyzeWritingCharacteristics + generateContentSkeleton)
- **FR-2.17**: Endpoint validates artifact is in `skeleton` or `foundations_approval` status before allowing re-analysis

### Educational Empty States

- **FR-2.18**: When user has no references in any flow, show contextual educational content explaining how references work and their value
- **FR-2.19**: Include quick-add CTA in empty states that opens the inline reference creation modal
- **FR-2.20**: Vary the educational message based on context (creation vs. suggestion vs. approval)

## Non-Functional Requirements

- **NFR-2.1**: Topic suggestion dialog must not add more than 200ms to the "Create Content" flow for users with references
- **NFR-2.2**: Foundation re-analysis must show clear progress indication (reuse existing research loading pattern)
- **NFR-2.3**: Re-analysis cancellation must be supported if user navigates away

## Dependencies

### Prerequisites

- Phase 1 complete (ReferencePicker component, inline modal, backend pipeline integration)
- Existing `ArtifactSuggestionCard` component
- Existing `FoundationsSection` component
- Existing `approveFoundations` endpoint

### Outputs for Next Phase

- N/A (final phase)

## Acceptance Criteria

- [ ] Clicking "Create Content" on a suggestion card shows reference picker dialog (when user has references)
- [ ] Clicking "Skip" in suggestion dialog proceeds without references
- [ ] Clicking "Create with References" creates artifact with selected reference IDs
- [ ] Topic suggestion dialog is skipped entirely when user has no references
- [ ] FoundationsSection shows currently selected references
- [ ] User can change reference selection during foundation approval
- [ ] "Re-analyze" button appears when selection changes
- [ ] Re-analysis re-runs writing characteristics and skeleton generation with new references
- [ ] Loading state shows during re-analysis
- [ ] "Foundations Approved" button is disabled during re-analysis
- [ ] Educational empty states display contextually in all three flows
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] No critical bugs open

---

*Review this PRD and provide feedback before spec generation.*
