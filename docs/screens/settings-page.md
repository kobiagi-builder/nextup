# Settings Page (SettingsPage)

**Created:** 2026-02-20
**Last Updated:** 2026-02-20
**Version:** 1.0.0
**Status:** Complete

## Overview

The Settings Page provides user preferences for appearance and AI interaction mode. Currently implements theme switching with placeholder AI interaction modes.

**Route:** `/settings`
**Component:** `frontend/src/features/portfolio/pages/SettingsPage.tsx`

---

## Layout

```
+--------------------------------------------------------------+
|  Header: "Settings"                                          |
|  "Customize your experience."                                |
+--------------------------------------------------------------+
|  Appearance                                                  |
|  +------------------+------------------+------------------+  |
|  |   [Sun] Light    |   [Moon] Dark    | [Monitor] System |  |
|  +------------------+------------------+------------------+  |
+--------------------------------------------------------------+
|  AI Interaction                                              |
|  +--------------------------------------------------------+  |
|  | [MessageSquare] Chat Mode (selected)                   |  |
|  | Conversational AI assistance in a side panel            |  |
|  +--------------------------------------------------------+  |
|  +--------------------------------------------------------+  |
|  | [Zap] Inline Mode                                      |  |
|  | AI suggestions appear as you type                       |  |
|  +--------------------------------------------------------+  |
|  +--------------------------------------------------------+  |
|  | [Edit3] Direct Mode                                    |  |
|  | AI writes full content based on topic                   |  |
|  +--------------------------------------------------------+  |
+--------------------------------------------------------------+
|  Writing Style                                               |
|  "Add 4-5 writing samples..."        [Manage Examples ->]   |
|  [o o o o o] 0/5 examples                                   |
+--------------------------------------------------------------+
```

---

## Component Hierarchy

```
SettingsPage (max-w-2xl)
├── Header ("Settings" title)
├── Appearance section
│   └── Theme selector grid (3 columns)
│       ├── Light (Sun icon)
│       ├── Dark (Moon icon)
│       └── System (Monitor icon)
├── AI Interaction section
│   ├── Chat Mode (MessageSquare icon) — currently selected/default
│   ├── Inline Mode (Zap icon)
│   └── Direct Mode (Edit3 icon)
└── Writing Style section
    ├── Description text
    ├── Progress dots (5 dots)
    ├── Example count (0/5)
    └── "Manage Examples ->" link → /settings/style
```

---

## Data & State

| Hook | Purpose |
|------|---------|
| `useTheme()` | Theme context (light/dark/system) from ThemeProvider |

**Note:** AI interaction mode selection is currently visual-only (hardcoded to "chat"). Not persisted to database yet. Writing examples count is hardcoded to 0 — full implementation planned for a later step.

---

## Key Behaviors

### Theme Switching
- 3 options: Light, Dark, System
- Active option highlighted with `border-brand-300` and `bg-surface-selected`
- Immediately applies via `setTheme()` from ThemeProvider
- Persisted to localStorage by ThemeProvider

### AI Interaction Mode
- 3 modes displayed but only Chat Mode is active (hardcoded `isSelected = mode.value === 'chat'`)
- Future: will persist to `user_preferences` table

### Writing Style Link
- Links to `/settings/style` (WritingStylePage) for managing writing examples
- Shows placeholder dot indicators for 0/5 examples

---

## Related Pages

- `/settings/style` — WritingStylePage (manage writing examples)
- `/profile` — ProfilePage (separate from settings)
