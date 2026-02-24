# Portfolio Page (PortfolioPage)

**Created:** 2026-02-19
**Last Updated:** 2026-02-19
**Version:** 1.0.0
**Status:** Complete

## Overview

The Portfolio Page is the main landing page showing all artifacts in a filterable card grid. Users can create, filter, search, and navigate to individual artifacts.

**Route:** `/portfolio`
**Component:** `frontend/src/features/portfolio/pages/PortfolioPage.tsx`

---

## Layout

```
┌──────────────────────────────────────────────────────────────┐
│  Header: "Portfolio" + "+" Create button                     │
├──────────────────────────────────────────────────────────────┤
│  Filter bar: Type filter | Status filter | Search input      │
├──────────────────────────────────────────────────────────────┤
│  ┌────────────┐  ┌────────────┐  ┌────────────┐             │
│  │ ArtifactCard│  │ ArtifactCard│  │ ArtifactCard│            │
│  │ (blog)     │  │ (showcase) │  │ (social)   │             │
│  │ Status     │  │ Status     │  │ Status     │             │
│  │ Preview... │  │ Preview... │  │ Preview... │             │
│  └────────────┘  └────────────┘  └────────────┘             │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐             │
│  │            │  │            │  │            │              │
│  └────────────┘  └────────────┘  └────────────┘             │
├──────────────────────────────────────────────────────────────┤
│  Empty state (if no artifacts match filters)                 │
└──────────────────────────────────────────────────────────────┘
```

---

## Component Hierarchy

```
PortfolioPage
├── Header ("Portfolio" title, "+" create button)
├── Filter bar
│   ├── Type filter (All / Posts / Blogs / Showcases)
│   ├── Status filter (All / Draft / Ready / Published)
│   └── Search input
├── Artifact grid (responsive: 1-3 columns)
│   └── ArtifactCard (for each artifact)
│       ├── Type icon + badge
│       ├── Title
│       ├── Status badge (with processing animation)
│       ├── Content preview (truncated)
│       ├── Tags
│       └── Actions dropdown (Edit, Delete, Create Social Post)
├── ArtifactForm dialog (create new artifact)
├── AlertDialog (delete confirmation)
└── EmptyState (when no results)
```

---

## Filters

| Filter | Options | Default |
|--------|---------|---------|
| Type | All, Posts (social_post), Blogs (blog), Showcases (showcase) | All |
| Status | All, Draft, Ready, Published | All |
| Search | Free text (matches title, content) | Empty |

---

## Hooks Used

| Hook | Purpose |
|------|---------|
| `useArtifacts(filters)` | Fetch filtered artifact list |
| `useCreateArtifact()` | Create new artifact |
| `useDeleteArtifact()` | Delete artifact |
| `useChatLayoutStore` | Manage chat panel state |

---

## Key Interactions

| Action | Trigger | Result |
|--------|---------|--------|
| Create artifact | Click "+" → Fill form → Submit | Navigate to `/portfolio/artifacts/:id` |
| Open artifact | Click ArtifactCard | Navigate to `/portfolio/artifacts/:id` |
| Delete artifact | Three-dot menu → Delete → Confirm | Remove from list, invalidate cache |
| Create social post | Three-dot menu → "Create Social Post" | Navigate to new social_post |
| Filter by type | Click type button | Re-filter artifact list |
| Search | Type in search input | Filter by title/content match |

---

## Related Documentation

- [artifact-page.md](./artifact-page.md) - Individual artifact editor
- [artifact-creation-flow.md](../flows/artifact-creation-flow.md) - Creation flow
