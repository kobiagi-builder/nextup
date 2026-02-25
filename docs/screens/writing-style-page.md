# Writing References (Embedded in Settings)

**Created:** 2026-02-19
**Last Updated:** 2026-02-25
**Version:** 3.0.0
**Status:** Complete

## Overview

The Writing References section manages per-artifact-type writing examples. Users upload reference samples of their own writing — categorized by Blog, Social Post, or Showcase — so the AI can learn their voice for each content format. Supports 4 upload methods: paste text, file upload (DOCX/PDF/MD/TXT), file URL extraction, and publication URL scraping (LinkedIn, Medium, Substack, Reddit).

**Route:** `/settings` (writing references are embedded in SettingsPage; `/settings/style` redirects here)
**Component:** `WritingReferencesManager` embedded in `frontend/src/features/portfolio/pages/SettingsPage.tsx`

---

## Layout

```
+--------------------------------------------------------------+
|  Header: <- Back | "Writing References" + subtitle            |
+--------------------------------------------------------------+
|  Tabs: [Blog] [Social Post] [Showcase]  (with count badges)  |
+--------------------------------------------------------------+
|  Tab Content (per tab):                                       |
|  +----------------------------------------------------------+|
|  |  "3 references"                 [+ Add Reference]         ||
|  +----------------------------------------------------------+|
|  |  +------------------------------------------------------+||
|  |  | [icon] My LinkedIn article  |  1,200 words  | [del]  |||
|  |  | Preview: "In my experience..."     source: pasted     |||
|  |  | Status: green check (success)                         |||
|  |  +------------------------------------------------------+||
|  |  +------------------------------------------------------+||
|  |  | [LinkedIn] My Product Launch Post  |  650 words | [del]||
|  |  | Preview: "When building..."   source: linkedin.com    |||
|  |  | Status: green check (success)                         |||
|  |  +------------------------------------------------------+||
|  |                                                           ||
|  |  Empty State (when no refs for this tab):                 ||
|  |  +------------------------------------------------------+||
|  |  |  [icon] No blog references yet                        |||
|  |  |  Add examples of your blog writing to teach the AI... |||
|  |  |  [+ Add Your First Reference]                         |||
|  |  +------------------------------------------------------+||
+--------------------------------------------------------------+
```

---

## Component Hierarchy

```
WritingStylePage
+-- Header (back arrow -> /settings, title, subtitle)
+-- Tabs (shadcn Tabs component)
|   +-- TabsList (3 tabs: blog, social_post, showcase)
|   |   +-- TabsTrigger (icon + label + count badge per tab)
|   +-- TabsContent (per tab, shows filtered references)
|       +-- Tab header row (count text + "Add Reference" button)
|       +-- Loading spinner (when fetching)
|       +-- Empty state (icon + title + description + CTA)
|       +-- Reference list
|           +-- ReferenceCard (per reference)
|               +-- Source type icon (paste/file/link/platform)
|               +-- Name (truncated)
|               +-- Word count badge
|               +-- Extraction status indicator
|               +-- Content preview (first ~150 chars)
|               +-- Source URL (clickable, for URL-based refs)
|               +-- Delete button (trash icon)
|               +-- onClick -> opens detail sheet
+-- ReferenceUploadDialog (Sheet from right)
|   +-- SheetHeader (title: "Add {Type} Reference")
|   +-- Method tabs (Paste | File | File URL | Publication)
|   |   +-- Paste: name input + textarea with word count
|   |   +-- File: name input + FileDropZone (drag-and-drop)
|   |   +-- File URL: URL input + optional name
|   |   +-- Publication: PublicationUrlInput (with platform detection) + name
|   +-- Submit footer (Cancel + Add Reference button)
+-- ReferenceDetailSheet (full content view on card click)
    +-- Name, word count, source type, extraction status
    +-- Full extracted content (read-only, scrollable)
    +-- Source URL (clickable, for URL-based refs)
```

---

## Tab Configuration

| Tab | Value | Icon | Empty Title |
|-----|-------|------|-------------|
| Blog | `blog` | FileText | "No blog references yet" |
| Social Post | `social_post` | MessageSquare | "No social post references yet" |
| Showcase | `showcase` | Trophy | "No showcase references yet" |

Active tab state stored in `activeTab` (default: `blog`). References grouped by `artifact_type` using `useMemo`.

---

## Hooks Used

| Hook | Purpose |
|------|---------|
| `useWritingExamples()` | Fetch all user writing examples (polls every 2s when any are extracting) |
| `useCreateWritingExample()` | Create via paste text |
| `useDeleteWritingExample()` | Delete example |
| `useUploadWritingExample()` | File upload (multipart FormData) |
| `useExtractFromUrl()` | File URL extraction (async 202+poll) |
| `useRetryExtraction()` | Retry failed extractions |
| `useExtractPublication()` | Publication URL scraping (async 202+poll) |

---

## Upload Methods

### 1. Paste Text
- Name input (required)
- Textarea with live word count
- Submits via `POST /api/user/writing-examples` with `source_type: 'pasted'`

### 2. File Upload
- FileDropZone with drag-and-drop + file picker
- Accepted: `.md`, `.txt`, `.docx`, `.pdf` (10MB limit)
- Name auto-detected from filename
- Submits via `POST /api/user/writing-examples/upload` (multipart)
- Binary formats (DOCX/PDF) parsed server-side via `contentExtractor` service

### 3. File URL
- URL input (must be HTTPS)
- Supported file types at URL: `.md`, `.txt`, `.docx`, `.pdf`
- Returns 202 immediately; extraction happens asynchronously
- Frontend polls via `refetchInterval` (2s) until `extraction_status` resolves
- Submits via `POST /api/user/writing-examples/extract-url`

### 4. Publication URL
- URL input with platform auto-detection badge
- Supported platforms: LinkedIn, Medium, Substack, Reddit
- Unknown URLs use generic scraper (article/main/paragraph heuristic)
- Returns 202; scraping async
- Rate limited: 5 requests/user/minute
- Submits via `POST /api/user/writing-examples/extract-publication`

---

## Extraction Status

| Status | UI Indicator | Description |
|--------|-------------|-------------|
| `success` | Green check | Content extracted successfully |
| `extracting` | Spinner | Extraction in progress |
| `failed` | Red badge + retry button | Extraction failed |
| `pending` | Spinner | Waiting to start |

Failed extractions show a retry button. Only URL-based references can be retried (file uploads must be re-uploaded).

---

## Key Interactions

| Action | Trigger | Result |
|--------|---------|--------|
| Navigate back | Click back arrow | Navigate to `/settings` |
| Switch tab | Click tab trigger | Show filtered references for that artifact type |
| Open upload dialog | Click "Add Reference" | Sheet slides in from right |
| Submit paste | Fill name + content, click "Add Reference" | POST to API, close sheet |
| Submit file | Drop or select file, click "Add Reference" | POST multipart, close sheet |
| Submit file URL | Enter HTTPS URL, click "Add Reference" | 202 response, sheet closes, card appears with spinner |
| Submit publication URL | Enter URL (platform detected), click "Add Reference" | 202 response, sheet closes, card appears with spinner |
| View reference detail | Click reference card | Detail sheet opens with full content |
| Delete reference | Click trash icon on card | DELETE to API, card removed |
| Retry extraction | Click retry on failed card | 202 response, card shows spinner |

---

## Validation Rules

| Context | Rule |
|---------|------|
| Paste: name | Required, non-empty |
| Paste: content | Required, non-empty |
| File: file | Required (accepted: .md, .txt, .docx, .pdf, max 10MB) |
| File URL | Must start with `https://` |
| Publication URL | Must start with `https://` |
| artifact_type | Must be `blog`, `social_post`, or `showcase` |

---

## Sub-Components

### ReferenceCard
**File:** `frontend/src/features/portfolio/components/writing-references/ReferenceCard.tsx`

Displays a single writing reference with source icon, name, word count, status badge, content preview, and delete action. Click opens detail sheet.

### ReferenceDetailSheet
**File:** `frontend/src/features/portfolio/components/writing-references/ReferenceDetailSheet.tsx`

Full-content read-only view in a Sheet. Shows name, word count, source type, extraction status, and scrollable content.

### ReferenceUploadDialog
**File:** `frontend/src/features/portfolio/components/writing-references/ReferenceUploadDialog.tsx`

Sheet with 4 method tabs for adding references. Uses `data-portal-ignore-click-outside` on SheetContent.

### FileDropZone
**File:** `frontend/src/features/portfolio/components/writing-references/FileDropZone.tsx`

Drag-and-drop file upload area with accepted format display.

### PublicationUrlInput
**File:** `frontend/src/features/portfolio/components/writing-references/PublicationUrlInput.tsx`

URL input with automatic platform detection badge. Uses `detectPlatform()` from `platform-utils.ts`.

---

## Related Documentation

- [writing-style-setup-flow.md](../flows/writing-style-setup-flow.md) - User flow
- [writing-style-analysis.md](../features/writing-style-analysis.md) - Feature doc
- [content-agent-endpoints.md](../api/content-agent-endpoints.md) - API endpoints
