# Profile Page (ProfilePage)

**Created:** 2026-02-20
**Last Updated:** 2026-02-20
**Version:** 1.0.0
**Status:** Complete

## Overview

The Profile Page lets users set up personal and professional information that the AI uses to personalize content. It organizes data into 4 sections plus a skills inventory, with a completion progress indicator.

**Route:** `/profile`
**Component:** `frontend/src/features/portfolio/pages/ProfilePage.tsx`

---

## Layout

```
+--------------------------------------------------------------+
|  Header: "Your Profile" + "Edit Profile" button              |
+--------------------------------------------------------------+
|  Profile Completion bar (0-100%)                             |
+--------------------------------------------------------------+
|  +--------------------------------------------------------+  |
|  | About Me section                          [Edit]        |  |
|  | Bio, Background, Value Proposition                      |  |
|  +--------------------------------------------------------+  |
|  +--------------------------------------------------------+  |
|  | Profession section                        [Edit]        |  |
|  | Expertise Areas, Industries, Methods, Certifications    |  |
|  +--------------------------------------------------------+  |
|  +--------------------------------------------------------+  |
|  | Skills section (inserted after Profession)              |  |
|  | SkillsSection component with CRUD                       |  |
|  +--------------------------------------------------------+  |
|  +--------------------------------------------------------+  |
|  | Customers section                         [Edit]        |  |
|  | Target Audience, Ideal Client                           |  |
|  +--------------------------------------------------------+  |
|  +--------------------------------------------------------+  |
|  | Goals section                             [Edit]        |  |
|  | Content Goals, Business Goals                           |  |
|  +--------------------------------------------------------+  |
+--------------------------------------------------------------+
|  Edit Dialog (modal, opens per section)                      |
+--------------------------------------------------------------+
```

---

## Component Hierarchy

```
ProfilePage
├── Header (title + "Edit Profile" button)
├── Completion progress bar (bg-brand-300)
├── Section cards (4 sections from SECTIONS config)
│   ├── About Me (User icon)
│   │   └── Fields: bio, background, value_proposition
│   ├── Profession (Briefcase icon)
│   │   └── Fields: expertise_areas, industries, methodologies, certifications
│   ├── SkillsSection (inserted after Profession, index === 1)
│   ├── Customers (Target icon)
│   │   └── Fields: target_audience, ideal_client
│   └── Goals (Star icon)
│       └── Fields: content_goals, business_goals
└── Edit Dialog (shadcn Dialog)
    └── UserContextForm (section-specific editing)
```

---

## Data & State

| Hook | Purpose |
|------|---------|
| `useUserContext()` | Fetches user_context JSONB data from Supabase |
| `useUpdateUserContext()` | Mutation to update specific sections |
| `useState<SectionType>` | Tracks which section is being edited |
| `useMemo` (completion) | Calculates percentage of non-empty sections |

**Section type mapping:**
- `about` → `about_me` (in DB)
- `profession` → `profession`
- `customers` → `customers`
- `goals` → `goals`

---

## Key Behaviors

### Completion Tracking
- Counts how many of 4 sections have at least one non-empty field
- Displays percentage: `(completedSections / totalSections) * 100`
- Green progress bar using `bg-brand-300`

### Section Cards
- Each section shows a colored icon (brand color when filled, muted when empty)
- Check icon appears next to title when section has content
- Empty sections show "No information added yet" placeholder
- Array values render as tag chips (e.g., expertise areas, industries)
- String values render as paragraph text

### Edit Dialog
- Opens as a modal (`data-portal-ignore-click-outside` on DialogContent)
- Renders `UserContextForm` scoped to the editing section
- Success toast on save, destructive toast on error
- Form closes automatically after successful save

---

## Database Table

**Table:** `user_context`

| Column | Type | Description |
|--------|------|-------------|
| about_me | JSONB | `{ bio, background, value_proposition }` |
| profession | JSONB | `{ expertise_areas[], industries[], methodologies[], certifications[] }` |
| customers | JSONB | `{ target_audience, ideal_client }` |
| goals | JSONB | `{ content_goals, business_goals }` |

---

## Related Components

- `UserContextForm` — Section-specific form with field inputs
- `SkillsSection` — Skills CRUD (separate component, inserted between Profession and Customers)
- `SkillBadge` — Visual skill display
