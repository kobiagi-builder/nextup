# PRD: Inline Research References - Phase 1

**Contract**: ./contract.md
**Phase**: 1 of 1
**Focus**: End-to-end inline research reference indicators from backend marker generation to frontend hover cards

## Phase Overview

This is a single-phase feature because all components are tightly coupled: the backend must generate markers, the content must store them, and the frontend must render and interact with them. Shipping any part in isolation delivers zero user value.

The feature adds transparent research provenance to artifact content. During the existing content-writing LLM call, the model outputs `{{ref:N}}` markers after sentences informed by research. Post-processing converts these into semantic HTML. The frontend renders them as small superscript indicators with hover cards showing source details.

After this phase, users will see exactly which research informed each sentence, inspect source details on hover, and open original sources in one click — all at zero additional API cost.

## User Stories

1. As a content creator, I want to see which sentences in my artifact were informed by research so that I can understand my content's foundations and verify its credibility
2. As a content creator, I want to hover over a reference indicator to see the source title, type, and excerpt preview so that I can quickly understand the research without leaving the content
3. As a content creator, I want to click "Open Source" to view the full research source in a new tab so that I can dive deeper when needed
4. As a content creator, I want to delete reference indicators I don't want to show so that I have full control over my content's presentation
5. As a content creator, I want reference indicators stripped when I copy content so that my LinkedIn posts and emails look clean

## Functional Requirements

### Backend - Marker Generation

- **FR-1.1**: The content-writing prompt in `contentWritingTools.ts` instructs the LLM to append `{{ref:N}}` markers after sentences informed by research, where N is the 1-based index of the research item in the provided context
- **FR-1.2**: The `mapResearchToSections()` function provides research items with stable indices that correspond to the `{{ref:N}}` markers
- **FR-1.3**: A post-processing function converts `{{ref:N}}` text markers into semantic HTML: `<span data-ref-id="<artifact_research.id>" data-ref-index="N" class="ref-indicator" contenteditable="false">N</span>`
- **FR-1.4**: The post-processing resolves N indices to actual `artifact_research.id` UUIDs by matching the index to the research items provided to the LLM
- **FR-1.5**: If a `{{ref:N}}` marker references a non-existent research index, it is silently stripped (graceful degradation)

### Backend - Humanizer Preservation

- **FR-1.6**: The humanizer prompt in `humanityCheckTools.ts` is instructed to preserve `{{ref:N}}` markers in their exact positions relative to the sentence they follow
- **FR-1.7**: If the humanizer rewrites a sentence, the `{{ref:N}}` marker must remain attached to the rewritten version
- **FR-1.8**: The humanizer must NOT interpret `{{ref:N}}` markers as AI patterns to remove

### Frontend - TipTap Extension

- **FR-1.9**: A custom TipTap inline node `ResearchRef` renders reference indicators as small superscript badges inline with text
- **FR-1.10**: The node stores `refId` (artifact_research UUID) and `refIndex` (display number) as attributes
- **FR-1.11**: The node is set to `inline: true`, `group: 'inline'`, `atom: true` (single unit, not partially selectable)
- **FR-1.12**: In edit mode, the indicator is deletable — pressing Backspace/Delete when cursor is adjacent removes the indicator node
- **FR-1.13**: In read-only mode, the indicator is not deletable
- **FR-1.14**: When the user deletes text containing an indicator, the indicator is removed with the text (standard DOM behavior)

### Frontend - Hover Card

- **FR-1.15**: Hovering over an indicator for 200ms opens a floating card positioned above/below the indicator
- **FR-1.16**: The hover card displays: source type icon (Reddit/LinkedIn/Medium/Substack), source title (truncated to 2 lines), first sentence of the excerpt, and an "Open Source" button
- **FR-1.17**: If the source has no URL (`source_url` is null), the "Open Source" button is hidden
- **FR-1.18**: The hover card has `data-portal-ignore-click-outside` attribute to prevent click-outside bugs
- **FR-1.19**: The hover card is dismissible by moving the mouse away (with 100ms grace period to move into the card)
- **FR-1.20**: Multiple indicators on the same sentence show sequential badges; each has its own independent hover card
- **FR-1.21**: On mobile (touch devices), tapping an indicator shows the hover card; tapping outside dismisses it

### Frontend - Clipboard Export

- **FR-1.22**: The InlineStyleCopy extension strips all `ref-indicator` elements from the clipboard HTML
- **FR-1.23**: Copied text contains no trace of reference indicators (no numbers, no brackets, no data attributes)

### Frontend - Data Fetching

- **FR-1.24**: The existing `useResearch(artifactId)` hook provides all research data needed for hover cards
- **FR-1.25**: Research data is cached in React Query — no additional API calls when hovering indicators

## Non-Functional Requirements

- **NFR-1.1**: Hover card appears within 200ms of hover start (no perceptible delay beyond the intentional debounce)
- **NFR-1.2**: Reference indicators add less than 1KB to typical artifact HTML (lightweight markup)
- **NFR-1.3**: The LLM marker generation adds zero additional API cost and negligible latency (< 100 extra tokens per section)
- **NFR-1.4**: Indicators must be accessible: sufficient color contrast, keyboard-navigable, screen-reader announces "Reference N"

## Dependencies

### Prerequisites

- Research integration fixes complete (skeleton + content use research effectively) -- DONE
- `artifact_research` table populated with research data per artifact -- DONE
- `useResearch()` hook fetches research data on frontend -- DONE
- TipTap v3 editor with custom extension infrastructure -- DONE

### Outputs

- Inline reference indicators visible in all artifacts generated after this feature ships
- Existing artifacts (generated before this feature) will NOT have indicators (no backfill)

## Acceptance Criteria

- [ ] New blog artifact: at least 3-5 reference indicators appear after content generation
- [ ] Hovering an indicator shows a card with correct source title, type icon, and excerpt
- [ ] Clicking "Open Source" opens the correct URL in a new tab
- [ ] Deleting an indicator removes only the indicator, not the sentence
- [ ] Deleting a sentence removes the indicator with it
- [ ] Copying content to clipboard produces clean text without indicators
- [ ] Indicators persist through the humanization pipeline step
- [ ] Indicators render correctly in both edit and read-only modes
- [ ] Mobile: tapping an indicator shows the card
- [ ] No extra LLM calls in the pipeline (verify via backend logs)
- [ ] Backend build passes (`npm run build`)
- [ ] Frontend build passes (`npm run build`)

## Open Questions

- Should there be a visual "reference density" indicator showing how research-heavy a section is? (Deferred — can add later based on user feedback)
- Should we show a "Referenced by" count in the Research panel for each source? (Nice to have — defer)

---

*Review this PRD and provide feedback before spec generation.*
