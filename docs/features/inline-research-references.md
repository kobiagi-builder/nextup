# Inline Research References

**Created:** 2026-03-20
**Last Updated:** 2026-03-20
**Version:** 1.0.0
**Status:** Complete

## Overview

Inline research reference indicators are small superscript numbers that appear after sentences in AI-generated content that were directly informed by research sources. Hovering over an indicator shows a floating card with the research source details — type, title, excerpt, and a link to open the original source. Zero additional API cost: markers are generated during existing content-writing LLM calls.

---

## What It Does (User Perspective)

1. After the AI writes content, sentences backed by research show a small superscript number (e.g., ¹, ², ³)
2. Hovering over the number reveals a card showing:
   - Source type icon (reddit, linkedin, medium, substack, quora, user_provided)
   - Source title (truncated to 2 lines)
   - Excerpt preview (first ~150 characters)
   - "Open Source" link (opens in new tab, hidden if no URL)
3. Multiple references on one sentence appear as sequential badges: ¹²³
4. Indicators are deletable in edit mode (Backspace removes them as atomic units)
5. Copying content strips indicators — pasted text is clean
6. In read-only mode, indicators render but are not deletable

---

## How It Works (Technical Perspective)

### Architecture

```
Content Pipeline (backend)
├── contentWritingTools.ts — LLM prompt includes {{ref:N}} instruction
│   └── Gemini outputs: "Sentence text.{{ref:1}}{{ref:3}}"
├── humanityCheckTools.ts — Preserves {{ref:N}} markers through humanization
└── referenceMarkerUtils.ts — Converts {{ref:N}} → <span> HTML with UUIDs

Frontend (TipTap editor)
├── researchRef.ts — Custom TipTap inline atom node
├── ResearchRefNodeView.tsx — React NodeView wrapper
├── ResearchRefCard.tsx — HoverCard component (Radix)
├── ResearchContext.ts — React context for research data
└── inlineStyleCopy.ts — Strips indicators on clipboard copy
```

### Data Flow

```
1. LLM (Gemini) writes content with {{ref:N}} text markers
   ↓
2. Humanizer (Claude Sonnet) preserves markers while rewriting
   ↓
3. convertRefMarkersToHTML() maps N → artifact_research UUID
   ↓
4. HTML stored: <span data-ref-id="UUID" data-ref-index="N" class="ref-indicator">N</span>
   ↓
5. TipTap ResearchRef node parses span.ref-indicator[data-ref-id]
   ↓
6. ReactNodeViewRenderer renders ResearchRefCard with HoverCard
   ↓
7. useResearchContext() provides research data for UUID lookup
```

### Key Files

| File | Purpose |
|------|---------|
| `backend/src/services/ai/agents/portfolio/tools/referenceMarkerUtils.ts` | `convertRefMarkersToHTML()`, `stripRefMarkers()`, `buildResearchItemsForRef()` |
| `backend/src/services/ai/agents/portfolio/tools/contentWritingTools.ts` | LLM prompt with `{{ref:N}}` instruction, post-processing conversion |
| `backend/src/services/ai/agents/portfolio/tools/humanityCheckTools.ts` | Marker preservation instruction for humanizer |
| `frontend/src/lib/tiptap/researchRef.ts` | TipTap custom Node extension (inline, atom) |
| `frontend/src/features/portfolio/components/editor/ResearchRefNodeView.tsx` | React NodeView wrapper |
| `frontend/src/features/portfolio/components/editor/ResearchRefCard.tsx` | HoverCard with source details |
| `frontend/src/features/portfolio/contexts/ResearchContext.ts` | React context for passing research data to NodeViews |
| `frontend/src/lib/tiptap/inlineStyleCopy.ts` | Strips `.ref-indicator` elements before clipboard write |
| `frontend/src/components/ui/hover-card.tsx` | shadcn/Radix HoverCard primitive |

### Backend: Marker Generation

During content writing (`writeFullContent` and `writeContentSection`), the LLM prompt includes a `### Reference Markers` section that instructs the model to append `{{ref:N}}` after sentences directly informed by research item `[N]` from the research context.

Rules in the prompt:
- Only mark sentences with clear research lineage (30-50% density)
- Place markers after terminal punctuation: `"End of sentence.{{ref:3}}"`
- Multiple markers allowed: `"Sentence.{{ref:2}}{{ref:5}}"`
- Only added for non-showcase artifacts with research context

### Backend: Marker Preservation

The humanizer (`humanityCheckTools.ts`) receives a `### Reference Markers (PRESERVE EXACTLY)` instruction telling it to:
- Never remove, modify, or reposition `{{ref:N}}` markers
- Keep markers at END of rewritten sentences
- Treat markers as invisible structural metadata

### Backend: HTML Conversion

After humanization, `convertRefMarkersToHTML()` converts text markers to semantic HTML:

```typescript
// Input:  "Startups save 60% on costs.{{ref:1}}"
// Output: "Startups save 60% on costs.<span data-ref-id="uuid-abc" data-ref-index="1" class="ref-indicator" contenteditable="false">1</span>"
```

The function:
1. Matches `{{ref:N}}` via regex
2. Finds the research item with matching 1-based index
3. Sanitizes the UUID (strips HTML-special characters for defense-in-depth)
4. Generates a `<span>` with `data-ref-id` (UUID), `data-ref-index`, `class="ref-indicator"`, and `contenteditable="false"`
5. Invalid indices are silently stripped (graceful degradation)

### Frontend: TipTap ResearchRef Node

Custom TipTap node (`researchRef.ts`):
- `group: 'inline'`, `inline: true`, `atom: true` (single unit, not partially selectable)
- Attributes: `refId` (from `data-ref-id`), `refIndex` (from `data-ref-index`)
- `parseHTML`: matches `span.ref-indicator[data-ref-id]`
- `addNodeView()`: uses `ReactNodeViewRenderer` for React integration
- Registered in both `RichTextEditor` (editable) and `RichTextContent` (read-only)

### Frontend: ResearchRefCard Component

Radix HoverCard with:
- **Trigger**: Superscript number styled with `text-[10px]`, `text-muted-foreground`, `hover:text-primary`, `transition-colors`, `vertical-align: super`
- **Content**: Opens on hover (200ms delay), closes on mouse-out (100ms grace period)
- **Card layout**: Source type icon + label → title (line-clamp-2) → excerpt preview (150 chars) → "Open Source" link
- **Portal**: Uses `data-portal-ignore-click-outside` to prevent click-outside detection bugs
- **Accessibility**: `role="button"`, `tabIndex={0}`, `aria-label`, focus ring

Source type icon mapping:

| Source Type | Icon | Color |
|-------------|------|-------|
| reddit | MessageCircle | orange-400 |
| linkedin | Linkedin | blue-400 |
| medium | BookOpen | foreground |
| substack | Mail | orange-500 |
| quora | HelpCircle | red-400 |
| user_provided | User | muted-foreground |

### Frontend: ResearchContext

React context (`ResearchContext.ts`) created in `ArtifactPage.tsx` wrapping the editor section. Populated with data from `useResearch(artifactId)`. TipTap NodeViews access it via `useResearchContext()` to look up research items by UUID.

### Frontend: Clipboard Stripping

In `inlineStyleCopy.ts`, before writing to clipboard, all `.ref-indicator` elements are removed from the cloned DOM:

```typescript
container.querySelectorAll('.ref-indicator').forEach(el => el.remove())
```

This ensures pasted content in external apps (LinkedIn, Gmail, Google Docs) is clean.

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Showcase artifacts | No markers generated (showcases use personal evidence, not web research) |
| No research data | No markers generated, no errors |
| Humanizer strips markers | Content is still valid, just without indicators |
| Research deleted after content | Hover card shows "Source unavailable" |
| Missing source URL | "Open Source" button is hidden |
| User deletes indicator | Backspace removes the atom node cleanly |
| Copy/paste | Indicators stripped from clipboard output |
| Mobile | Tap opens card, tap outside dismisses (Radix handles this) |
| Very long source titles | Truncated to 2 lines via `line-clamp-2` |

---

## Conditional Gating

- Only generated for **non-showcase** artifact types with research context
- Prompt instruction and post-processing both gated on `artifactType !== 'showcase'` and `researchResults.length > 0`

---

## Test Coverage

| File | Type | Tests |
|------|------|-------|
| `backend/src/__tests__/unit/tools/referenceMarkerUtils.test.ts` | Unit | 14 tests: single/multiple markers, invalid indices, empty research, HTML adjacency, stripRefMarkers, buildResearchItemsForRef |

---

## Related Documentation

- [Rich Text Editor](rich-text-editor.md) — TipTap editor extensions
- [Content Creation Agent](content-creation-agent.md) — Pipeline that generates content with markers
- [Research Pipeline](research-pipeline.md) — Research data that markers reference
- [Humanity Check](humanity-check.md) — Humanizer that preserves markers
