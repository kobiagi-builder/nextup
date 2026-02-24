# Content Improvement

**Created:** 2026-02-19
**Last Updated:** 2026-02-19
**Version:** 1.0.0
**Status:** Complete

## Overview

Content Improvement allows users to select text or images in the editor and request AI-powered improvements via the chat panel. The AI considers surrounding context, writing characteristics, and user feedback to generate targeted improvements.

---

## What It Does (User Perspective)

### Text Improvement
1. Select text in the editor
2. Floating AI button (Sparkles) appears
3. Click the button — chat panel opens with selection context
4. Type feedback (e.g., "Make this more concise")
5. AI returns improved text, which replaces the selection

### Image Improvement
1. Click on an image in the editor
2. ImageBubbleMenu appears (crop, regenerate, delete)
3. Click "Regenerate" — chat panel opens
4. Describe desired changes
5. AI generates a new image, replacing the original

---

## How It Works (Technical)

### Tools

| Tool | Input | Output | API |
|------|-------|--------|-----|
| `improveTextContent` | selectedText, surroundingContext, userInstruction, tone | improvedText | Claude Sonnet (temp 0.6) |
| `improveImageContent` | currentImageUrl, currentDescription, userFeedback, imageStyle | newImageUrl, refinedDescription | DALL-E 3 / Claude Haiku |

### Text Improvement Flow

1. `TextSelectionAIButton` captures selection + 2 paragraphs before/after + nearest heading
2. Stored in `editorSelectionStore` (Zustand)
3. `SelectionContextBanner` shows preview in ChatPanel
4. User feedback sent to Content Agent
5. `improveTextContent` tool:
   - Builds prompt with surrounding context
   - Claude Sonnet generates improved text (max tokens: 2x selection length)
   - Warns if output > 200% of original
6. Frontend replaces selection range via TipTap editor API

### Image Improvement Flow

1. Try image-to-image editing (preserves composition)
2. If fails, fallback to text-to-image:
   - Claude Haiku refines description based on feedback
   - DALL-E 3 generates new image
3. Upload to Supabase Storage
4. Frontend replaces image node at position

### Context Data

```typescript
{
  selectedText: string          // 10-5000 chars
  surroundingContext: {
    before: string              // Up to 2 paragraphs
    after: string               // Up to 2 paragraphs
    sectionHeading?: string     // Nearest heading
  }
  userInstruction: string       // 3-1000 chars
  tone: ArtifactTone
}
```

---

## Key Components

| Component | Location | Role |
|-----------|----------|------|
| TextSelectionAIButton | `editor/TextSelectionAIButton.tsx` | Floating BubbleMenu, captures context |
| ImageBubbleMenu | `editor/ImageBubbleMenu.tsx` | Image context menu |
| SelectionContextBanner | `chat/SelectionContextBanner.tsx` | Shows selection preview in chat |
| editorSelectionStore | `stores/editorSelectionStore.ts` | Bridges editor ↔ chat |

---

## Database Operations

- **Text improvement:** No DB writes (returns text only, frontend handles insertion)
- **Image improvement:** No DB writes (returns URL only, frontend handles insertion)
- Both save updated content when user manually saves or on auto-save

---

## Known Limitations

- Minimum 3 characters for text selection
- Image-to-image editing may fail for non-standard image formats
- Max 3 regeneration attempts per image
- Context window limited to 2 paragraphs before/after (token efficiency)

---

## Related Documentation

- [content-improvement-flow.md](../flows/content-improvement-flow.md) - User flow
- [artifact-page.md](../screens/artifact-page.md) - Editor UI
