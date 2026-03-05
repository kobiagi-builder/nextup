# PRD: Reference Picker for Content Creation - Phase 1

**Contract**: ./contract.md
**Phase**: 1 of 2
**Focus**: Core reference picker component, backend pipeline integration, and manual creation flow

## Phase Overview

Phase 1 delivers the foundational reference picker experience integrated into the manual content creation flow (ArtifactForm dialog). This is the most natural entry point since users are already making deliberate choices about tone, type, and tags when creating content manually.

This phase establishes the reusable `ReferencePicker` component that Phase 2 will integrate into topic suggestions and foundation approval flows. It also includes the backend changes to accept selected reference IDs and filter the AI pipeline to use only those references.

After Phase 1, users creating content manually can select which writing references the AI should emulate, see inline previews to make informed choices, and add new references without leaving the creation dialog.

## User Stories

1. As a content creator, I want to select which writing references the AI uses when I create a new piece of content, so that the generated content matches my intended voice for this specific piece
2. As a content creator, I want to see a preview of each reference's content in the picker, so that I can make an informed selection without opening each reference separately
3. As a content creator, I want references pre-filtered by the content type I'm creating (e.g., Blog references for a Blog), so that I see the most relevant references first
4. As a content creator, I want to toggle the filter to see all my references regardless of type, so that I can use a social post reference when writing a blog if the voice fits
5. As a content creator, I want to add a new reference inline during content creation, so that I don't have to leave the flow to add a reference I just discovered
6. As a content creator, I want newly added references to be automatically selected, so that I can immediately use them without an extra click
7. As a content creator, I want to proceed without selecting any references when I have none, so that the feature doesn't block my workflow

## Functional Requirements

### Reference Picker Component

- **FR-1.1**: Create a reusable `ReferencePicker` component that displays all user writing references as selectable cards
- **FR-1.2**: Each reference card shows: name, source type icon (pasted/file/URL), word count, platform badge (LinkedIn/Medium/etc.), and an inline content preview (~200 words, truncated with fade)
- **FR-1.3**: Support multi-select - users can select multiple references via checkboxes or click-to-toggle
- **FR-1.4**: Show selected count badge (e.g., "3 selected") and selected reference names as summary chips
- **FR-1.5**: Pre-filter references by the current artifact type (Blog/Social Post/Showcase) with a toggle switch "Show all types" to remove the filter
- **FR-1.6**: When filter is active, show a subtle indicator of how many other-type references are hidden (e.g., "+5 other references")
- **FR-1.7**: Include an "Add Reference" button that opens the inline reference creation modal
- **FR-1.8**: Show educational empty state when user has no references, explaining how references improve content quality with a CTA to add one
- **FR-1.9**: When user has references but none match the filtered type, show count of available references in other types with prompt to toggle filter

### Inline Reference Creation Modal

- **FR-1.10**: Create a modal that provides the same upload capabilities as the existing WritingReferencesManager: paste text, file upload, URL extraction, and publication URL extraction
- **FR-1.11**: The modal must include `data-portal-ignore-click-outside` attribute (portal pattern)
- **FR-1.12**: After successful creation, the new reference is automatically selected in the picker
- **FR-1.13**: The modal should pre-set the artifact type to match the current content type being created
- **FR-1.14**: Reuse existing hooks: `useCreateWritingExample`, `useUploadWritingExample`, `useExtractFromUrl`, `useExtractPublication`

### ArtifactForm Integration

- **FR-1.15**: Add a "Writing References" section in the ArtifactForm dialog, below the tone selector and tags
- **FR-1.16**: The section is collapsible, defaulting to expanded if user has references, collapsed if none
- **FR-1.17**: When collapsed, show summary of selection (e.g., "3 references selected" or "No references selected - optional")
- **FR-1.18**: Selected reference IDs are included in the artifact creation payload as `metadata.selectedReferenceIds: string[]`

### Data Storage

- **FR-1.19**: Store selected reference IDs in the `artifacts.metadata` JSONB field under `selectedReferenceIds` key
- **FR-1.20**: No database migration needed - leverages existing JSONB metadata field

### Backend Pipeline Integration

- **FR-1.21**: Modify AI pipeline tools (`analyzeWritingCharacteristics`, `generateContentSkeleton`, `writeFullContent`) to accept and use `selectedReferenceIds` parameter
- **FR-1.22**: When `selectedReferenceIds` is provided and non-empty, filter `user_writing_examples` query to only include those IDs
- **FR-1.23**: When `selectedReferenceIds` is empty or not provided, fall back to existing behavior (all active references of matching type)
- **FR-1.24**: Pass `selectedReferenceIds` from artifact metadata through the PipelineExecutor to each tool

## Non-Functional Requirements

- **NFR-1.1**: Reference picker must render within 200ms even with 50+ references
- **NFR-1.2**: Inline content preview must not cause layout shift during loading
- **NFR-1.3**: Reference picker must be keyboard-navigable (tab through cards, space/enter to select)
- **NFR-1.4**: All portaled components must include `data-portal-ignore-click-outside` attribute

## Dependencies

### Prerequisites

- Existing `user_writing_examples` table and CRUD endpoints
- Existing `useWritingExamples` hook and related mutation hooks
- Existing `ArtifactForm` dialog component
- Existing AI pipeline tools and PipelineExecutor

### Outputs for Next Phase

- Reusable `ReferencePicker` component ready for integration in topic suggestions and foundation approval
- Backend pipeline accepting `selectedReferenceIds` from artifact metadata
- Inline reference creation modal component

## Acceptance Criteria

- [ ] User can see a "Writing References" section in the ArtifactForm dialog
- [ ] References display with name, type icon, word count, and ~200 word inline preview
- [ ] User can multi-select references by clicking cards
- [ ] Type filter is active by default, matching the selected artifact type
- [ ] "Show all types" toggle reveals references of other types
- [ ] "Add Reference" button opens modal with paste/file/URL/publication upload methods
- [ ] Newly added reference appears in picker and is auto-selected
- [ ] Selected reference IDs are stored in artifact metadata after creation
- [ ] AI pipeline tools filter writing examples by selected IDs
- [ ] Creating content with no references selected works (falls back to all active)
- [ ] Educational empty state displays when user has no references
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] No critical bugs open

## Open Questions

- Should the reference picker show extraction status indicators (pending/extracting/failed) for references still being processed, or only show fully extracted references?
- Should there be a max selection limit, or can users select all references?

---

*Review this PRD and provide feedback before spec generation.*
