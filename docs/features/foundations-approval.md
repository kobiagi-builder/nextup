# Foundations Approval

**Created:** 2026-02-20
**Last Updated:** 2026-02-20
**Version:** 1.0.0
**Status:** Complete

## Overview

Foundations Approval is the human-in-the-loop gate between content skeleton generation and full content writing. It pauses the AI pipeline so the user can review and edit the generated skeleton and writing characteristics before the AI writes the final content.

---

## What It Does (User Perspective)

1. After the AI generates a content skeleton and analyzes writing characteristics, the pipeline **pauses**
2. The FoundationsSection auto-expands showing:
   - **Writing Characteristics** — AI-analyzed style traits from the user's writing examples
   - **Content Skeleton** — H1 title + H2 sections (editable)
3. The user can:
   - Review the writing characteristics analysis
   - **Edit the skeleton** directly in a rich text editor
   - Click **"Approve & Continue"** to resume the pipeline
4. The pipeline then writes full content section-by-section using the approved skeleton

---

## How It Works (Technical Perspective)

### Status Flow

```
research → foundations → skeleton → foundations_approval → writing
                                         ↑
                                    User approves here
```

- `foundations` — AI is generating skeleton + analyzing characteristics
- `skeleton` — Skeleton is ready for review (editable)
- `foundations_approval` — User is actively reviewing (same as skeleton, legacy compatibility)
- `writing` — Approved, AI is writing full content

### Frontend Components

| Component | File | Purpose |
|-----------|------|---------|
| `FoundationsSection` | `frontend/src/features/portfolio/components/artifact/FoundationsSection.tsx` | Collapsible section with skeleton editor + characteristics display |
| `FoundationsApprovedButton` | `frontend/src/features/portfolio/components/artifact/FoundationsApprovedButton.tsx` | Approval CTA button |
| `WritingCharacteristicsDisplay` | `frontend/src/features/portfolio/components/artifact/WritingCharacteristicsDisplay.tsx` | Renders analyzed writing traits |
| `RichTextEditor` | `frontend/src/features/portfolio/components/editor/RichTextEditor.tsx` | Embedded editor for skeleton editing |

### FoundationsSection Behavior

**Visibility:** Shows when status is in `foundations`, `skeleton`, `foundations_approval`, `writing`, `creating_visuals`, `ready`, `published`

**Auto-expand:** Automatically expands when status is `skeleton` or `foundations_approval`

**Skeleton editability by status:**

| Status | Editable? | Why |
|--------|-----------|-----|
| `foundations` | No | AI is still generating |
| `skeleton` | Yes | Ready for user review |
| `foundations_approval` | Yes | User is reviewing |
| `writing` | No | AI is writing from approved skeleton |
| `creating_visuals` | No | Pipeline past approval |
| `ready` / `published` | Yes | Post-pipeline editing |

### Backend API

**Endpoint:** `POST /api/artifacts/:id/approve-foundations`
**Controller:** `backend/src/controllers/foundations.controller.ts`

**Request:**
```json
{
  "skeleton_content": "<h1>Edited Title</h1><h2>Section 1</h2>..."
}
```

**Behavior:**
1. Validates artifact exists and belongs to user
2. Checks status is `skeleton` or `foundations_approval`
3. Saves user's skeleton edits (if `skeleton_content` provided)
4. Calls `pipelineExecutor.resumeFromApproval(artifactId)`
5. Pipeline resumes with `writeFullContent` step

**Response:**
```json
{
  "success": true,
  "message": "Foundations approved, content generation started",
  "artifactId": "...",
  "traceId": "...",
  "pipelineResult": {
    "stepsCompleted": 3,
    "totalSteps": 5,
    "duration": 45000
  }
}
```

### Writing Characteristics API

**Endpoint:** `GET /api/artifacts/:id/writing-characteristics`

Returns analyzed characteristics (tone, sentence structure, vocabulary patterns, etc.) for the artifact, fetched from the `artifact_writing_characteristics` table.

---

## Database

**Characteristics stored in:** `artifact_writing_characteristics` table
- `characteristics` (JSONB) — `Record<string, WritingCharacteristicValue>`
- `summary` (text) — Human-readable analysis summary
- `recommendations` (text) — Style recommendations

---

## Related Features

- [Content Creation Agent](content-creation-agent.md) — The pipeline that includes foundations approval
- [Writing Style Analysis](writing-style-analysis.md) — How writing characteristics are generated
- [Rich Text Editor](rich-text-editor.md) — The editor used for skeleton editing
