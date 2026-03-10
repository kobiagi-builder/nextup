# Rich Text Editor

**Created:** 2026-02-20
**Last Updated:** 2026-03-09
**Version:** 1.1.0
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
7. **Writes right-to-left** using the RTL toggle button (Pilcrow icon) in the toolbar — works per paragraph, enabling mixed LTR/RTL content in the same document

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
| `frontend/src/features/customers/components/projects/CustomerRichTextEditor.tsx` | Simplified TipTap editor for customer documents |
| `frontend/src/lib/text-direction.ts` | Utility functions for RTL character detection |
| `frontend/src/lib/markdown.ts` | Markdown/HTML conversion with `preserveDirection` Turndown rule |

### TipTap Extensions

| Extension | Purpose |
|-----------|---------|
| `StarterKit` | Base formatting (bold, italic, headings, lists, blockquote, code) |
| `Placeholder` | Ghost text ("Start writing...") |
| `Link` | Hyperlink support with auto-detect |
| `AlignableImage` | Custom Image extension with `data-align` attribute and resize |
| `TextDirection` | Per-block RTL/LTR direction via `dir` attribute on paragraph, heading, blockquote, listItem |

### AlignableImage Extension

Custom extension that extends TipTap's `Image`:
- Adds `data-align` attribute (left/center/right) with default "center"
- Overrides `addNodeView()` to sync alignment as CSS `justify-content` on the resize container
- Fixes a TipTap v3 bug where `ResizableNodeView.onUpdate` doesn't sync `el.src` to the DOM

---

## RTL and Hebrew Support

### Overview

The editor supports right-to-left writing at the paragraph level. Each block element (paragraph, heading, blockquote, list item) carries its own `dir` attribute independently, so a single document can contain both Hebrew RTL paragraphs and English LTR paragraphs without conflict.

### Extension: TextDirection

The `tiptap-text-direction` package (`RichTextEditor.tsx:523`, `CustomerRichTextEditor.tsx:373`) adds `setTextDirection` and `unsetTextDirection` commands to the editor. It is configured for the node types that users write prose in:

```typescript
TextDirection.configure({
  types: ['heading', 'paragraph', 'blockquote', 'listItem'],
})
```

The `TextDirection` extension is registered in both the editable `RichTextEditor` and the read-only `RichTextContent` renderer so that stored `dir` attributes are preserved when displaying content.

### RTL toggle button

The toolbar includes a **Pilcrow** icon button (the paragraph mark symbol) at the right end of the formatting controls. Clicking it toggles the current paragraph between RTL and LTR:

```typescript
// RichTextEditor.tsx:437-449
onClick={() => {
  const currentDir = editor.getAttributes('paragraph').dir
  if (currentDir === 'rtl') {
    editor.commands.unsetTextDirection()
  } else {
    editor.commands.setTextDirection('rtl')
  }
}}
isActive={editor.getAttributes('paragraph').dir === 'rtl'}
```

The button highlights (active state) when the cursor is inside an RTL block. The same button and logic are present in `CustomerRichTextEditor.tsx:322-335`.

### CSS: RTL text alignment

`frontend/src/index.css` contains a dedicated RTL/Hebrew section that overrides text alignment inside ProseMirror when a `dir` attribute is present:

```css
/* index.css:434-448 */
.ProseMirror [dir="rtl"],
.ProseMirror[dir="rtl"] {
  text-align: right;
}

.ProseMirror [dir="ltr"],
.ProseMirror[dir="ltr"] {
  text-align: left;
}

/* Placeholder floats to the right for RTL empty blocks */
.ProseMirror [dir="rtl"].is-empty::before {
  text-align: right;
  float: right;
}
```

Table headers use `text-align: start` (`index.css:369`) instead of the previously hard-coded `text-align: left`, so they respect the surrounding writing direction without additional overrides.

### CSS: logical properties for blockquotes and lists

Blockquote and list indentation in both editors uses CSS logical properties instead of physical left-side properties, so layout mirrors correctly in RTL without extra rules:

```
prose-blockquote:border-s-4   (instead of border-l-4)
prose-blockquote:ps-4         (instead of pl-4)
prose-ul:ps-6                 (instead of pl-6)
prose-ol:ps-6                 (instead of pl-6)
```

`border-s` and `ps` resolve to the block-start side, which is the right side when `dir="rtl"` is in effect.

### Font: Heebo for Hebrew characters

The Google Fonts import (`index.css:17`) includes the Heebo typeface, which covers the Hebrew Unicode block. Heebo is added to the `--font-display` and `--font-body` CSS variables (`index.css:29-30`) as the second entry in the stack after Plus Jakarta Sans, so Hebrew glyphs fall back to it automatically without requiring any per-element font assignment.

### Markdown: preserving direction in HTML-to-Markdown conversion

When the editor content is serialized to Markdown (used by the customer document editor), the `htmlToMarkdown` function in `frontend/src/lib/markdown.ts` runs Turndown with a custom rule called `preserveDirection` (`markdown.ts:39-57`). This rule intercepts any block element that carries a `dir` attribute and outputs it as raw HTML rather than collapsing it to plain Markdown:

```typescript
// markdown.ts:46-56
replacement: (content, node) => {
  const el = node as HTMLElement
  const dir = el.getAttribute('dir')
  const tag = el.tagName.toLowerCase()

  if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'li'].includes(tag)) {
    return `<${tag} dir="${dir}">${content.trim()}</${tag}>\n\n`
  }

  return content
}
```

This guarantees that direction information survives a round-trip through Markdown storage and is correctly restored when the Markdown is parsed back to HTML by `markdownToHTML`.

### Utility: text-direction.ts

`frontend/src/lib/text-direction.ts` provides two standalone functions for direction detection based on Unicode character ranges:

| Function | Signature | Behavior |
|---|---|---|
| `detectTextDirection` | `(text: string) => 'rtl' \| 'ltr'` | Scans for the first strong directional character; returns `'rtl'` if a Hebrew/Arabic/Syriac character is found first, `'ltr'` if a Latin character is found first, defaults to `'ltr'` |
| `containsRTL` | `(text: string) => boolean` | Returns `true` if the string contains any character in the Hebrew (`\u0590-\u05FF`), Arabic (`\u0600-\u06FF`), or Syriac (`\u0700-\u074F`) Unicode ranges |

These utilities are available for use by AI tools or other features that need to infer writing direction from user-supplied text without rendering it in the editor.

### Test coverage

| File | Type | Tests |
|------|------|-------|
| `frontend/src/lib/__tests__/text-direction.test.ts` | Unit | 10 tests covering Hebrew/Arabic detection, mixed strings, empty input, defaults |
| `frontend/src/lib/__tests__/markdown-rtl.test.ts` | Unit | 6 tests for `preserveDirection` Turndown rule across block element types |
| `frontend/src/features/portfolio/components/editor/__tests__/RichTextEditor-rtl.test.ts` | Integration | 8 tests for TipTap `TextDirection` extension behavior in the editor |
| `frontend/tests/e2e/hebrew-rtl-editor.spec.ts` | E2E (Playwright) | 4 tests for the full Hebrew editing workflow in a real browser |

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
