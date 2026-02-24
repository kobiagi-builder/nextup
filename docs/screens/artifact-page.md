# Artifact Page (ArtifactPage)

**Created:** 2026-02-19
**Last Updated:** 2026-02-19
**Version:** 1.0.0
**Status:** Complete

## Overview

The Artifact Page is the primary editor screen for viewing, editing, and managing individual content artifacts. It supports the full 11-status workflow with dynamic UI behavior based on artifact status.

**Route:** `/portfolio/artifacts/:id`
**Component:** `frontend/src/features/portfolio/pages/ArtifactPage.tsx`

---

## Layout

### Desktop (>768px)

```
┌──────────────────────────────────────────────────────────────────────┐
│  AppShell (Sidebar + Main)                                           │
│  ┌────────────────────────────────────────────────────┬─────────────┐│
│  │  ArtifactPage                                      │ ChatPanel   ││
│  │  ┌──────────────────────────────────────────────┐  │ (resizable) ││
│  │  │  Header: Title, Status Badge, Actions        │  │             ││
│  │  ├──────────────────────────────────────────────┤  │             ││
│  │  │  ContentGenerationLoader (if processing)     │  │             ││
│  │  ├──────────────────────────────────────────────┤  │             ││
│  │  │  FoundationsSection (if applicable)          │  │             ││
│  │  ├──────────────────────────────────────────────┤  │             ││
│  │  │  ArtifactEditor (RichTextEditor + controls)  │  │             ││
│  │  ├──────────────────────────────────────────────┤  │             ││
│  │  │  ResearchArea (collapsible)                  │  │             ││
│  │  └──────────────────────────────────────────────┘  │             ││
│  └────────────────────────────────────────────────────┴─────────────┘│
└──────────────────────────────────────────────────────────────────────┘
```

### Mobile (<768px)

ChatPanel renders as a Sheet overlay instead of a side panel.

---

## Component Hierarchy

```
ArtifactPage
├── Header (title, back button, status badge, action buttons)
├── ContentGenerationLoader (shimmer during writing/humanity_checking)
├── FoundationsSection
│   ├── WritingCharacteristicsDisplay
│   ├── TipTap skeleton editor (editable during foundations_approval)
│   └── FoundationsApprovedButton
├── ArtifactEditor
│   ├── RichTextEditor (TipTap)
│   │   ├── Formatting toolbar
│   │   ├── TextSelectionAIButton (floating)
│   │   └── ImageBubbleMenu (context menu)
│   ├── TagsInput
│   ├── ToneSelector
│   └── ImageApprovalPanel (during creating_visuals)
├── ResearchArea (collapsible, shows sources)
└── ChatPanel (desktop: resizable panel / mobile: sheet)
```

---

## Query Parameters

| Param | Type | Description |
|-------|------|-------------|
| `startCreation` | boolean | Auto-trigger content creation on mount |
| `autoResearch` | boolean | Auto-start research pipeline |
| `createSocialPost` | boolean | Create social post from this artifact |
| `sourceId` | string | Source artifact ID for social post |

---

## Hooks Used

| Hook | Purpose |
|------|---------|
| `useArtifact(id)` | Fetch artifact data, polls during processing states |
| `useUpdateArtifact(id)` | Update content, title, tags, tone |
| `useResearch(id)` | Fetch research data, polls during research status |
| `useWritingCharacteristics(id)` | Fetch writing characteristics, polls during foundations |
| `useFoundationsApproval(id)` | Approve foundations and resume pipeline |
| `useImageGeneration(id)` | Approve/reject/regenerate images |
| `useChatLayoutStore` | Desktop chat panel state (open/close, panel size) |

---

## UI Behavior by Status

| Status | Editor | FoundationsSection | ResearchArea | ContentLoader | CTAs |
|--------|--------|-------------------|--------------|---------------|------|
| `draft` | Visible, editable | Hidden | Hidden | Hidden | "Create Content" |
| `interviewing` | Locked overlay | Hidden | Hidden | Hidden | — (chat-based) |
| `research` | Locked overlay | Hidden | Loading | Hidden | — |
| `foundations` | Hidden | Loading | Collapsed | Hidden | — |
| `skeleton` | Hidden | Expanded, editable | Collapsed | Hidden | "Foundations Approved" |
| `foundations_approval` | Hidden | Expanded | Collapsed | Hidden | "Foundations Approved" |
| `writing` | Locked overlay | Collapsed | Collapsed | **Shimmer** | — |
| `humanity_checking` | Locked overlay | Collapsed | Collapsed | **Shimmer** | — |
| `creating_visuals` | Locked overlay | Collapsed | Collapsed | Hidden | — |
| `ready` | Visible, editable | Collapsed | Collapsed | Hidden | "Mark as Published" |
| `published` | Visible, editable | Collapsed | Collapsed | Hidden | — |

---

## Key Interactions

### Create Content
1. User clicks "Create Content" button in header
2. Enables draft polling (`enableDraftPolling = true`)
3. Opens ChatPanel with initial message: `"Create content: {title}"`
4. Content Agent begins pipeline execution

### Foundations Approval
1. FoundationsSection auto-expands when status reaches `skeleton`
2. User reviews writing characteristics display
3. User optionally edits skeleton in embedded TipTap editor
4. User clicks "Foundations Approved" button
5. `POST /api/artifacts/:id/approve-foundations` with optional `skeleton_content`
6. Pipeline resumes: writing → humanity_checking → creating_visuals → ready

### Content Editing (ready/published)
1. Editor is unlocked with full TipTap formatting toolbar
2. Text selection shows floating AI button (TextSelectionAIButton)
3. Clicking AI button opens ChatPanel with selection context
4. User can request improvements; tool result replaces selected text
5. If `published` artifact is edited, status auto-transitions to `ready`

### Image Workflow
1. During `creating_visuals`, images generate automatically
2. After images are placed in content, user can:
   - Click image → ImageBubbleMenu (crop, regenerate, delete)
   - Open ImageCropModal for cropping
   - Trigger regeneration via ImageRegenerationModal

---

## Realtime Subscription

```typescript
// ArtifactPage subscribes to artifacts table updates
supabase
  .channel(`artifact-${id}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'artifacts',
    filter: `id=eq.${id}`,
  }, (payload) => {
    // Invalidate React Query cache → UI updates
    queryClient.invalidateQueries(['artifacts', 'detail', id])
    // If status changed, also invalidate research
    if (payload.new.status !== payload.old.status) {
      queryClient.invalidateQueries(['research', id])
    }
  })
  .subscribe()
```

---

## Related Documentation

- [artifact-creation-flow.md](../flows/artifact-creation-flow.md) - Full creation flow
- [STATUS_VALUES_REFERENCE.md](../artifact-statuses/STATUS_VALUES_REFERENCE.md) - Status reference
- [content-creation-agent.md](../features/content-creation-agent.md) - AI pipeline feature
