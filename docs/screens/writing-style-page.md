# Writing Style Page (WritingStylePage)

**Created:** 2026-02-19
**Last Updated:** 2026-02-19
**Version:** 1.0.0
**Status:** Complete

## Overview

The Writing Style Page allows users to manage their writing examples — the samples that teach the AI how to match their unique voice. Users can add, preview, and delete writing examples with a minimum 500-word requirement.

**Route:** `/settings/style`
**Component:** `frontend/src/features/portfolio/pages/WritingStylePage.tsx`

---

## Layout

```
┌──────────────────────────────────────────────────────────────┐
│  Header: ← Back | "Writing Style" + subtitle                 │
├──────────────────────────────────────────────────────────────┤
│  Progress Card                                                │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Progress: 2/5 examples  [██░░░]                       │  │
│  │  "Add 3 more examples for best results."               │  │
│  └────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────┤
│  [+ Add Writing Example] button                               │
│  — OR —                                                       │
│  Upload Form (when expanded)                                  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Example Name [input]                                  │  │
│  │  Content Type: [Paste Text] [Upload File]              │  │
│  │  Content [textarea, 12 rows]                           │  │
│  │  Word count: 342/500 minimum                           │  │
│  │  [Cancel] [Add Example]                                │  │
│  └────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────┤
│  Your Examples                                                │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 📄 My Best Blog Post  •  1,200 words  •  pasted  [🗑]  │  │
│  │ Preview: "In my experience with product consulting..." │  │
│  │ ✓ Style analyzed                                       │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 📄 LinkedIn Article  •  800 words  •  file_upload [🗑]  │  │
│  │ Preview: "When I first started building..."            │  │
│  └────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────┤
│  Tips for Best Results                                        │
│  • Choose samples that represent your best writing            │
│  • Include variety: blog posts, emails, social content        │
│  • Each sample should be at least 500 words                   │
│  • 5 examples gives the AI enough data                        │
└──────────────────────────────────────────────────────────────┘
```

---

## Component Hierarchy

```
WritingStylePage
├── Header (← back to /settings, title, subtitle)
├── Progress Card
│   ├── Progress bar (5 segments, filled by example count)
│   └── Progress message (conditional)
├── UploadForm (conditionally shown)
│   ├── Name input
│   ├── Source type selector (pasted / file_upload)
│   ├── Content textarea (with file upload link)
│   ├── Word count indicator (green ✓ at 500+)
│   └── Action buttons (Cancel, Add Example)
├── Examples List
│   └── WritingExampleCard (for each example)
│       ├── File icon + name + word count + source type
│       ├── Content preview (first 200 chars)
│       ├── "Style analyzed" badge (if analyzed_characteristics exists)
│       └── Delete button
├── Empty State (when no examples)
│   └── "Add Your First Example" CTA
└── Tips Section (static content)
```

---

## Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `MIN_WORD_COUNT` | 500 | Minimum words per example |
| `TARGET_EXAMPLES` | 5 | Target number for optimal style matching |

---

## Hooks Used

| Hook | Purpose |
|------|---------|
| `useWritingExamples()` | Fetch all user writing examples |
| `useCreateWritingExample()` | Create new example (mutation) |
| `useDeleteWritingExample()` | Delete example (mutation) |

---

## Key Interactions

| Action | Trigger | Result |
|--------|---------|--------|
| Navigate back | Click ← button | Navigate to `/settings` |
| Open upload form | Click "+ Add Writing Example" | Show UploadForm, hide button |
| Paste content | Type in textarea | Live word count update |
| Upload file | Click "Upload file" link → select `.txt/.md/.doc/.docx` | Content populated, name auto-filled from filename |
| Submit example | Click "Add Example" (valid: name + 500+ words) | POST to API, close form, example appears in list |
| Delete example | Click trash icon on card → confirm | DELETE to API, remove from list |

---

## Validation Rules

| Field | Rule |
|-------|------|
| Name | Required, non-empty |
| Content | Minimum 500 words (counted by splitting on whitespace) |
| Source type | `pasted` or `file_upload` (auto-detected) |
| File types | `.txt`, `.md`, `.doc`, `.docx` |

---

## Related Documentation

- [writing-style-setup-flow.md](../flows/writing-style-setup-flow.md) - User flow
- [writing-style-analysis.md](../features/writing-style-analysis.md) - Feature doc
- [content-creation-agent.md](../features/content-creation-agent.md) - How characteristics are used
