# Home Page (HomePage)

**Created:** 2026-02-20
**Last Updated:** 2026-02-20
**Version:** 1.0.0
**Status:** Complete

## Overview

The Home Page is the dashboard landing page after login. It displays a time-of-day greeting, domain quick-action cards, and a recent content section showing the user's latest artifacts.

**Route:** `/` (redirects to `/portfolio` in some configurations)
**Component:** `frontend/src/features/portfolio/pages/HomePage.tsx`

---

## Layout

```
+--------------------------------------------------------------+
|  Welcome Banner (gradient card)                              |
|  "Good [morning/afternoon/evening]!"                         |
|  "Let's create something today."                             |
+--------------------------------------------------------------+
|  Domain Cards Grid (2x2 on md+, 1 column on mobile)         |
|  +---------------------------+---------------------------+   |
|  | [FileText] Create Content | [Lightbulb] Explore Topics|   |
|  | Turn expertise into       | Discover what to write     |   |
|  | content                   | about                      |   |
|  | [Start Creating ->]       | [Find Topics ->]           |   |
|  +---------------------------+---------------------------+   |
|  | [User] Build Your Profile | [BarChart3] Track Skills   |   |
|  | Help AI understand you    | Document your expertise    |   |
|  | [Set Up Profile ->]       | [Add Skills ->]            |   |
|  +---------------------------+---------------------------+   |
+--------------------------------------------------------------+
|  Recent Content                           [View All ->]      |
|  +----------+ +----------+ +----------+ +----------+         |
|  |ArtifactCd| |ArtifactCd| |ArtifactCd| |ArtifactCd|        |
|  +----------+ +----------+ +----------+ +----------+         |
|  (or empty state: "No content yet. Start creating...")       |
+--------------------------------------------------------------+
```

---

## Component Hierarchy

```
HomePage
├── Welcome Banner (gradient bg-card → surface-hover)
│   ├── Greeting (time-based: morning/afternoon/evening)
│   └── Subtitle
├── Domain Cards Grid (2 columns on md+)
│   ├── Create Content → /portfolio (primary CTA)
│   ├── Explore Topics → /topics
│   ├── Build Your Profile → /profile
│   └── Track Skills → /skills
└── Recent Content section
    ├── Header ("Recent Content" + "View All" link)
    └── Content (one of):
        ├── Loading: 4x CardSkeleton
        ├── Empty: empty state card with "Create Your First Content" CTA
        └── Artifacts: up to 4 ArtifactCards in 4-column grid
```

---

## Data & State

| Hook | Purpose |
|------|---------|
| `useArtifacts()` | Fetches all user artifacts |
| `useNavigate()` | React Router navigation |

**Derived data:**
- `recentArtifacts` = first 4 artifacts from the list (pre-sorted by API)
- `greeting` = computed from `new Date().getHours()` (morning < 12, afternoon < 18, evening otherwise)

---

## Key Behaviors

### Greeting
- Dynamic based on browser's local time
- Morning: before 12:00
- Afternoon: 12:00-17:59
- Evening: 18:00+

### Domain Cards
- 4 cards configured via `DOMAIN_CARDS` constant
- "Create Content" is the primary card (default button variant)
- Others use secondary button variant
- Each card navigates to its respective route on click (both card and button)
- `e.stopPropagation()` on button prevents double navigation

### Recent Content
- Shows up to 4 most recent artifacts
- Uses `ArtifactCard` component (same as PortfolioPage)
- Clicking a card navigates to `/portfolio/artifacts/:id`
- "View All" link only shown when artifacts exist
- Empty state encourages first creation with CTA button

---

## Related Pages

- `/portfolio` — Full portfolio grid
- `/profile` — Profile setup
- `/settings/style` — Writing style management
