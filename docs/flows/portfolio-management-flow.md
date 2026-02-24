# Portfolio Management Flow

**Created:** 2026-02-19
**Last Updated:** 2026-02-19
**Version:** 1.0.0
**Status:** Complete

## Overview

The Portfolio Management flow covers the CRUD operations and browsing experience on the main Portfolio page — creating artifacts, filtering/searching, editing, deleting, and creating social posts from existing content.

---

## Entry Points

| Entry | Screen | Action |
|-------|--------|--------|
| App launch | AppShell | Default route redirects to `/portfolio` |
| Sidebar nav | Any page | Click Portfolio icon in sidebar |

---

## Flow: Browse & Filter

```mermaid
sequenceDiagram
    actor User
    participant Portfolio as PortfolioPage
    participant API as Backend API
    participant DB as Supabase

    User->>Portfolio: Navigate to /portfolio
    Portfolio->>API: GET /api/artifacts (with user auth)
    API->>DB: SELECT from artifacts WHERE user_id = auth.uid()
    DB-->>Portfolio: Return artifact list

    User->>Portfolio: Click type filter (e.g., "Blogs")
    Portfolio->>Portfolio: Client-side filter by type = 'blog'

    User->>Portfolio: Click status filter (e.g., "Ready")
    Portfolio->>Portfolio: Client-side filter by status = 'ready'

    User->>Portfolio: Type in search box
    Portfolio->>Portfolio: Client-side filter by title/content match
```

### Filters

| Filter | Options | Default | Type |
|--------|---------|---------|------|
| Type | All, Posts (social_post), Blogs (blog), Showcases (showcase) | All | Client-side |
| Status | All, Draft, Ready, Published | All | Client-side |
| Search | Free text | Empty | Client-side, matches title + content |

---

## Flow: Create Artifact

```mermaid
sequenceDiagram
    actor User
    participant Portfolio as PortfolioPage
    participant Form as ArtifactForm
    participant API as Backend API
    participant DB as Supabase
    participant Editor as ArtifactPage

    User->>Portfolio: Click "+" button
    Portfolio->>Form: Open ArtifactForm dialog

    User->>Form: Select type (blog / showcase / social_post)
    User->>Form: Enter title
    User->>Form: Set tone
    User->>Form: Click "Save as Draft" or "Create Content"

    Form->>API: POST /api/artifacts
    API->>DB: INSERT artifact (status: draft)
    DB-->>Form: Return { id }
    Form-->>Editor: Navigate to /portfolio/artifacts/:id

    alt "Create Content" was clicked
        Editor->>Editor: Auto-open ChatPanel
        Editor->>Editor: Send "Create content: {title}"
        Note over Editor: Pipeline begins (see artifact-creation-flow.md)
    end
```

---

## Flow: Delete Artifact

```mermaid
sequenceDiagram
    actor User
    participant Portfolio as PortfolioPage
    participant Dialog as AlertDialog
    participant API as Backend API
    participant DB as Supabase

    User->>Portfolio: Click three-dot menu on ArtifactCard
    User->>Portfolio: Click "Delete"
    Portfolio->>Dialog: Show confirmation dialog
    User->>Dialog: Click "Delete" to confirm
    Dialog->>API: DELETE /api/artifacts/:id
    API->>DB: DELETE from artifacts WHERE id = :id AND user_id = auth.uid()
    DB-->>Portfolio: Success
    Portfolio->>Portfolio: Invalidate artifacts cache, card removed
```

---

## Flow: Create Social Post from Artifact

```mermaid
sequenceDiagram
    actor User
    participant Portfolio as PortfolioPage
    participant API as Backend API
    participant DB as Supabase
    participant New as ArtifactPage (new)

    User->>Portfolio: Click three-dot menu on ArtifactCard
    Note over Portfolio: Only visible for blog/showcase in ready/published status
    User->>Portfolio: Click "Create Social Post"

    Portfolio->>API: POST /api/artifacts
    Note over API: type: social_post, metadata.sourceArtifactId = original.id
    API->>DB: INSERT social_post artifact
    DB-->>New: Navigate to /portfolio/artifacts/:newId?createSocialPost=true&sourceId=:originalId

    New->>API: POST /api/content-agent/execute
    Note over API: writeSocialPostContent tool reads source artifact
    API-->>New: Social post content generated
    New->>New: Status → ready
```

### Social Post Eligibility

```typescript
canCreateSocialPost(artifact) =
  artifact.type IN ('blog', 'showcase') AND
  artifact.status IN ('ready', 'published')
```

---

## ArtifactCard States

| Status | Card Appearance |
|--------|----------------|
| `draft` | Default card, "Draft" badge |
| Processing states | Animated processing badge, progress indicator |
| `ready` | Green "Ready" badge |
| `published` | Blue "Published" badge |

---

## Related Documentation

- [portfolio-page.md](../screens/portfolio-page.md) - Screen doc
- [artifact-creation-flow.md](./artifact-creation-flow.md) - Full creation flow
- [artifact-page.md](../screens/artifact-page.md) - Artifact editor
