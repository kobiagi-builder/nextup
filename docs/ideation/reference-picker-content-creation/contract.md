# Reference Picker for Content Creation - Contract

**Created**: 2026-03-05
**Confidence Score**: 95/100
**Status**: Draft

## Problem Statement

When creating content in NextUp, the AI pipeline automatically uses all active writing references of the matching content type to analyze and replicate the user's voice. Users have no control over which specific references influence a given piece of content.

This matters because advisors and consultants often write in different styles depending on the audience, topic, or publication context. A LinkedIn thought leadership post about AI strategy should draw from different reference material than a casual blog about team culture. Without the ability to select specific references, the AI blends all available voices into an averaged output that may not match the user's intent for a particular piece.

The problem surfaces in three critical moments:
1. **Manual topic creation** - User creates content from scratch but can't specify which writing samples to emulate
2. **Topic suggestions** - User accepts an AI-suggested topic but can't guide which voice to use
3. **Foundation approval** - User reviews the AI's writing analysis but can't adjust which references were analyzed

## Goals

1. **Give users control over voice selection** - Users can multi-select which writing references the AI uses when generating content, directly from the content creation flows
2. **Enable informed selection through preview** - Users can see inline content previews (~200 words) of each reference to make informed choices without leaving the flow
3. **Support all creation entry points** - Reference selection works consistently in manual creation (ArtifactForm), topic suggestion acceptance (ArtifactSuggestionCard), and foundation approval (FoundationsSection)
4. **Allow inline reference addition** - Users can add new references without leaving the content creation flow, with auto-selection of newly added references
5. **Support re-evaluation** - During foundation approval, users can change reference selection and re-run the writing analysis

## Success Criteria

- [ ] User can multi-select writing references in the ArtifactForm dialog (manual topic creation)
- [ ] User can multi-select writing references when accepting a topic suggestion via "Create Content"
- [ ] User can view and change selected references during foundation approval, with re-run capability
- [ ] Each reference shows an inline preview (~200 words of content) in the picker
- [ ] References are pre-filtered by matching content type with a toggle to show all types
- [ ] User can add a new reference inline (modal opens with same upload methods as WritingStylePage)
- [ ] Newly added references are automatically selected for the current content
- [ ] Selected reference IDs are stored in artifact metadata and passed to the AI pipeline
- [ ] AI pipeline tools (analyzeWritingCharacteristics, generateContentSkeleton, writeFullContent) use only the selected references instead of all active references
- [ ] When no references are selected (or none exist), user can proceed without selection (optional) with an educational prompt explaining the value of references
- [ ] Empty state shows clear CTA explaining how references improve content quality

## Scope Boundaries

### In Scope

- Reference picker component (multi-select, inline preview, type filter toggle)
- Integration into ArtifactForm dialog (below tone/tags section)
- Integration into topic suggestion "Create Content" flow (intermediate selection step)
- Integration into FoundationsSection (changeable reference selection with re-run)
- Inline "Add Reference" button opening a modal with existing WritingReferencesManager upload capabilities
- Auto-selection of newly created references
- Storing selected reference IDs in artifact metadata (`metadata.selectedReferenceIds`)
- Backend: Passing selected references to AI pipeline tools
- Backend: Filtering writing examples by selected IDs in analysis/generation tools
- Educational empty state when no references exist

### Out of Scope

- Changes to the existing WritingStylePage/WritingReferencesManager UI - not part of this project
- Reference recommendation engine (AI suggesting which references to use) - future feature
- Reference analytics (tracking which references produce best content) - future feature
- Bulk operations on references - managed via existing WritingStylePage
- Changes to the research system (artifact_research) - separate system

### Future Considerations

- AI-powered reference recommendations based on topic/tone
- "Reference sets" - saved combinations of references for common content types
- Analytics showing which reference combinations yield highest engagement
- Auto-detect reference relevance based on topic similarity

---

*This contract was generated from brain dump input. Review and approve before proceeding to PRD generation.*
