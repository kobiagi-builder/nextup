# Rich Text Editor

**Created:** 2026-02-20
**Last Updated:** 2026-02-20
**Version:** 1.0.0
**Status:** Complete

## Overview

The Rich Text Editor is the content editing surface for all artifact types. Built on TipTap (ProseMirror), it provides formatting, image handling, and AI-powered text/image improvement via in-editor selection menus.

---

## What It Does (User Perspective)

1. **Formats text** with headings, bold, italic, lists, blockquotes, code, and links
2. **Displays images** inline with alignment controls (left/center/right)
3. **Resizes images** via drag handles with live preview
4. **Crops images** via a modal crop tool
5. **Triggers AI improvement** by selecting text and clicking the sparkle button
6. **Triggers AI image improvement** by clicking on an image and using the bubble menu

---

## How It Works (Technical Perspective)

### Component Architecture

```
ArtifactEditor (container)
├── RichTextEditor (TipTap core)
│   ├── Toolbar (formatting buttons)
│   ├── EditorContent (TipTap editor area)
│   ├── ToneSelector (artifact tone display/change)
│   ├── TextSelectionAIButton (floating AI button on text selection)
│   ├── ImageBubbleMenu (floating menu on image click)
│   └── ImageCropModal (crop dialog)
├── TagsInput (artifact tags)
├── ImageApprovalPanel (Phase 3: image generation approval)
└── ChatPanel (via Sheet on mobile, direct on desktop)
```

### Key Files

| File | Purpose |
|------|---------|
| `frontend/src/features/portfolio/components/editor/ArtifactEditor.tsx` | Container with image approval, tags, chat integration |
| `frontend/src/features/portfolio/components/editor/RichTextEditor.tsx` | TipTap editor with toolbar and extensions |
| `frontend/src/features/portfolio/components/editor/TextSelectionAIButton.tsx` | Floating AI button on text selection |
| `frontend/src/features/portfolio/components/editor/ImageBubbleMenu.tsx` | Floating menu on image click (align, crop, AI improve) |
| `frontend/src/features/portfolio/components/editor/ImageCropModal.tsx` | Image cropping dialog |
| `frontend/src/features/portfolio/stores/editorSelectionStore.ts` | Zustand store for selection context |

### TipTap Extensions

| Extension | Purpose |
|-----------|---------|
| `StarterKit` | Base formatting (bold, italic, headings, lists, blockquote, code) |
| `Placeholder` | Ghost text ("Start writing...") |
| `Link` | Hyperlink support with auto-detect |
| `AlignableImage` | Custom Image extension with `data-align` attribute and resize |

### AlignableImage Extension

Custom extension that extends TipTap's `Image`:
- Adds `data-align` attribute (left/center/right) with default "center"
- Overrides `addNodeView()` to sync alignment as CSS `justify-content` on the resize container
- Fixes a TipTap v3 bug where `ResizableNodeView.onUpdate` doesn't sync `el.src` to the DOM

---

## AI Integration

### Text Selection AI (TextSelectionAIButton)

**Trigger:** User selects text in the editor
**Behavior:**
1. TipTap `BubbleMenu` detects non-empty text selection
2. Sparkle button appears floating near selection
3. On click, captures selection context:
   - `selectedText` — the highlighted text
   - `surroundingContext` — 2 paragraphs before/after + nearest heading
   - `type: "text"`
4. Stores context in `editorSelectionStore` (Zustand)
5. Opens chat sidebar for AI improvement conversation
6. Backend `improveTextContent` tool processes and returns replacement text

### Image AI (ImageBubbleMenu)

**Trigger:** User clicks on an image in the editor
**Behavior:**
1. Bubble menu appears with options: align left/center/right, crop, AI improve
2. AI improve captures image context and opens chat
3. Backend `improveImageContent` tool handles regeneration/improvement

---

## Editability

The editor supports a read-only mode controlled by the `editable` prop:
- `editable={true}` — Normal editing (default)
- `editable={false}` — Locked during AI processing (writing, creating_visuals statuses)

The `ArtifactEditor` component also manages collapse/expand state for the editor area.

---

## Related Features

- [Content Improvement](content-improvement.md) — AI text/image improvement tools
- [Image Generation](image-generation.md) — Image approval and regeneration workflow
- [Foundations Approval](foundations-approval.md) — Skeleton editing in FoundationsSection uses a separate RichTextEditor instance
