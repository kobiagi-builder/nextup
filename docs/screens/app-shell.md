# App Shell (AppShell)

**Created:** 2026-02-19
**Last Updated:** 2026-02-19
**Version:** 1.0.0
**Status:** Complete

## Overview

The AppShell is the root layout component that wraps the entire application. It provides desktop sidebar navigation, mobile header/bottom nav, a resizable split-view chat panel, and route-change cleanup. All pages render inside the AppShell via React Router's `<Outlet />`.

**Component:** `frontend/src/components/layout/AppShell.tsx`

---

## Layout

### Desktop (>= 768px), Chat Closed

```
┌─────────┬────────────────────────────────────────┐
│ Sidebar │  Content Area (max-w-7xl)               │
│  72px   │  (with left padding for sidebar)        │
│ (hover  │                                         │
│  expand)│  <Outlet /> renders current page         │
└─────────┴────────────────────────────────────────┘
```

### Desktop (>= 768px), Chat Open (Split View)

```
┌─────────┬─────────────┬──────────────────────────┐
│ Sidebar │  Chat Panel  │  Content Area             │
│  72px   │  (resizable) │  (resizable)              │
│         │  20%-50%     │◄──►  50%-80%              │
└─────────┴─────────────┴──────────────────────────┘
```

### Mobile (< 768px)

```
┌────────────────────────────────────────────────┐
│ Mobile Header (56px)                            │
├────────────────────────────────────────────────┤
│ Content Area                                    │
│ <Outlet /> renders current page                 │
├────────────────────────────────────────────────┤
│ Bottom Navigation (64px)                        │
└────────────────────────────────────────────────┘
(Chat opens as Sheet overlay on mobile)
```

---

## Component Hierarchy

```
AppShell
├── ConnectionBanner (shows when API/Supabase is down)
├── SkipToMain (accessibility — skip link)
├── Sidebar (desktop only)
├── MobileHeader (mobile only)
│   └── Menu button → opens MobileNavDrawer
├── MobileNavDrawer (mobile only, slide-out)
├── <main> content area
│   ├── [Chat Open] ResizablePanelGroup (horizontal)
│   │   ├── ResizablePanel id="chat-panel" (20%-50%)
│   │   │   └── ChatPanelWrapper
│   │   │       ├── Chat header (Sparkles icon + title)
│   │   │       └── ChatPanel (keyed by configVersion)
│   │   ├── ResizableHandle (with drag handle)
│   │   └── ResizablePanel id="content-panel" (50%-80%)
│   │       └── <Outlet /> (current page)
│   └── [Chat Closed] max-w-7xl container
│       └── <Outlet /> (current page)
└── BottomNav (mobile only)
```

---

## State Management

| State | Source | Purpose |
|-------|--------|---------|
| `isMobile` | `useIsMobile()` hook | Responsive breakpoint detection (768px) |
| `drawerOpen` | Local `useState` | Mobile navigation drawer open/close |
| `isChatOpen` | `useChatLayoutStore` | Whether chat panel is visible |
| `chatConfig` | `useChatLayoutStore` | Chat panel configuration (title, context, callbacks) |
| `configVersion` | `useChatLayoutStore` | Counter to force ChatPanel re-mount on config change |
| `panelSize` | `useChatLayoutStore` | Persisted chat panel width (percentage) |

---

## Key Behaviors

### Route Change Cleanup
The AppShell watches `location.pathname` and calls `closeChat()` when the path changes. This is placed in AppShell (not child pages) because AppShell never unmounts, avoiding cleanup-cycle bugs with Zustand persist.

```typescript
useEffect(() => {
  if (location.pathname !== prevPathRef.current) {
    prevPathRef.current = location.pathname
    closeChat()
  }
}, [location.pathname, closeChat])
```

### Resizable Panel Persistence
When the user drags the panel divider, `handleLayoutChanged` extracts the chat panel size from the layout map and persists it to the store:

```typescript
const handleLayoutChanged = (layout: Record<string, number>) => {
  const chatSize = layout['chat-panel']
  if (chatSize !== undefined) setPanelSize(chatSize)
}
```

### ChatPanel Re-mounting
The ChatPanel is keyed by `configVersion` — when a new chat config is pushed (e.g., user clicks "Create Content" on a different artifact), the panel re-mounts with fresh state.

---

## Routes (rendered inside AppShell)

| Route | Page Component |
|-------|---------------|
| `/portfolio` | PortfolioPage |
| `/portfolio/artifacts/:id` | ArtifactPage |
| `/settings` | SettingsPage |
| `/settings/style` | WritingStylePage |
| `/profile` | ProfilePage |

---

## Related Documentation

- [portfolio-page.md](./portfolio-page.md) - Main landing page
- [artifact-page.md](./artifact-page.md) - Artifact editor page
- [writing-style-page.md](./writing-style-page.md) - Writing examples page
