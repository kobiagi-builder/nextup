# Artifact Status Values Reference

**Version:** 3.0.0
**Last Updated:** 2026-02-19
**Purpose:** Quick reference for internal values, database values, and user-facing labels

---

## Complete Status Mapping (11 Active Statuses)

| Internal Value (TypeScript) | Database Value | User-Facing Label | Color | Icon | Editor State | Progress |
|------------------------------|----------------|-------------------|-------|------|--------------|----------|
| `draft` | `draft` | **Draft** | Gray | FileEdit | Unlocked | 0% |
| `interviewing` | `interviewing` | **Interviewing** | Indigo | MessageCircleQuestion | Locked | 5% |
| `research` | `research` | **Creating Foundations** | Blue | Search | Locked | 15% |
| `foundations` | `foundations` | **Creating Foundations** | Blue | Lightbulb | Locked | 30% |
| `skeleton` | `skeleton` | **Creating Foundations** | Blue | Layout | Locked | 45% |
| `foundations_approval` | `foundations_approval` | **Foundations Approval** | Amber | ClipboardCheck | Skeleton Editable | 50% |
| `writing` | `writing` | **Creating Content** | Blue | PenLine | Locked | 70% |
| `humanity_checking` | `humanity_checking` | **Creating Content** | Orange | Sparkles | Locked | 80% |
| `creating_visuals` | `creating_visuals` | **Creating Content** | Purple | Image | Locked | 90% |
| `ready` | `ready` | **Content Ready** | Green | CheckCircle | Unlocked | 100% |
| `published` | `published` | **Published** | Emerald | Send | Unlocked | 100% |

---

## Key Principles

### 1. Internal = Database
All 11 active status values are **identical** in:
- TypeScript types (`backend/src/types/portfolio.ts`, `frontend/src/features/portfolio/types/portfolio.ts`)
- Database constraint (`artifacts_status_check`) — DB has 12 values (includes `archived`)
- No mapping or transformation needed

### 2. User-Facing Consolidation
Multiple internal statuses display as the same label to simplify UX:
- `research`, `foundations`, `skeleton` → **"Creating Foundations"**
- `interviewing` → **"Interviewing"** (showcase-only flow)
- `foundations_approval` → **"Foundations Approval"** (user approval gate)
- `writing`, `humanity_checking`, `creating_visuals` → **"Creating Content"**

### 3. Processing States (7 states)
These statuses lock the main editor while AI is working (polling enabled):
```typescript
const PROCESSING_STATES: ArtifactStatus[] = [
  'interviewing', 'research', 'foundations', 'skeleton',
  'writing', 'humanity_checking', 'creating_visuals'
]
```

### 4. Two Pipeline Paths
- **Blog pipeline**: `draft → research → foundations → skeleton → foundations_approval → writing → humanity_checking → creating_visuals → ready → published`
- **Showcase pipeline**: `draft → interviewing → research → foundations → ... → published` (adds interview phase)

---

## Status Categories

### Editable States (3)
User can edit content:
- `draft` - Initial creation
- `ready` - Content complete, ready to publish
- `published` - Published content (editing → ready)

### Processing States (7)
Editor locked, AI actively working, polling enabled:
- `interviewing` - AI interviewing user about showcase (5%)
- `research` - AI researching from multiple sources (15%)
- `foundations` - AI analyzing writing characteristics (30%)
- `skeleton` - AI generating content structure (45%)
- `writing` - AI writing full content (70%)
- `humanity_checking` - AI humanizing content, removing AI patterns (80%)
- `creating_visuals` - AI generating cover image (90%)

### Approval States (1)
Pipeline paused, waiting for user action:
- `foundations_approval` - User reviews and approves skeleton + characteristics (50%)

### Archived State (DB only)
- `archived` - Present in database CHECK constraint but **not** in TypeScript types. Reserved for future use.

---

## Database Constraint (12 values)

```sql
ALTER TABLE artifacts DROP CONSTRAINT IF EXISTS artifacts_status_check;

ALTER TABLE artifacts ADD CONSTRAINT artifacts_status_check
  CHECK (status IN (
    'draft',                -- Initial state, editable
    'interviewing',         -- AI interviewing user (showcase flow)
    'research',             -- AI researching (user-facing: Creating Foundations)
    'foundations',          -- AI analyzing characteristics (user-facing: Creating Foundations)
    'skeleton',             -- AI creating structure (user-facing: Creating Foundations)
    'foundations_approval', -- User approval gate (user-facing: Foundations Approval)
    'writing',              -- AI writing content (user-facing: Creating Content)
    'humanity_checking',    -- AI humanizing content (user-facing: Creating Content)
    'creating_visuals',     -- AI generating images (user-facing: Creating Content)
    'ready',                -- Content ready (user-facing: Content Ready)
    'published',            -- Published, editable
    'archived'              -- Reserved (not in TypeScript types)
  ));
```

---

## Frontend Implementation (11 statuses)

### Status Labels
Located in: `frontend/src/features/portfolio/validators/stateMachine.ts`

```typescript
export const STATUS_LABELS: Record<ArtifactStatus, string> = {
  draft: 'Draft',
  interviewing: 'Interviewing',
  research: 'Creating Foundations',
  foundations: 'Creating Foundations',
  skeleton: 'Creating Foundations',
  foundations_approval: 'Foundations Approval',
  writing: 'Creating Content',
  humanity_checking: 'Creating Content',
  creating_visuals: 'Creating Content',
  ready: 'Content Ready',
  published: 'Published',
}
```

### Status Colors
```typescript
export const STATUS_COLORS: Record<ArtifactStatus, string> = {
  draft: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  interviewing: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  research: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  foundations: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  skeleton: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  foundations_approval: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  writing: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  humanity_checking: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  creating_visuals: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  ready: 'bg-green-500/10 text-green-400 border-green-500/20',
  published: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
}
```

### Status Icons
```typescript
export const STATUS_ICONS: Record<ArtifactStatus, string> = {
  draft: 'FileEdit',
  interviewing: 'MessageCircleQuestion',
  research: 'Search',
  foundations: 'Lightbulb',
  skeleton: 'Layout',
  foundations_approval: 'ClipboardCheck',
  writing: 'PenLine',
  humanity_checking: 'Sparkles',
  creating_visuals: 'Image',
  ready: 'CheckCircle',
  published: 'Send',
}
```

---

## Backend Implementation (11 statuses)

### TypeScript Types
Located in: `backend/src/types/portfolio.ts`

```typescript
export type ArtifactStatus =
  | 'draft'                 // Initial state, editable
  | 'interviewing'          // AI interviewing user about showcase case
  | 'research'              // AI researching, editor locked
  | 'foundations'           // AI analyzing writing characteristics
  | 'skeleton'              // AI creating structure, editor locked
  | 'foundations_approval'  // Skeleton ready, waiting for user approval
  | 'writing'               // AI writing content, editor locked
  | 'humanity_checking'     // AI humanizing content, editor locked
  | 'creating_visuals'      // AI generating images, editor locked
  | 'ready'                 // Content ready, editable, can publish
  | 'published'             // Published, editable (editing → ready)
```

---

## Status Transition Flow

### Blog/Showcase Pipeline (11-status workflow)

```
draft → [interviewing*] → research → foundations → skeleton → foundations_approval
  → [UI BUTTON] → writing → humanity_checking → creating_visuals → ready → published
                                                                              ↓
                                                                           ready (on edit)
```
*`interviewing` only for showcase type artifacts

### Valid Transitions

```typescript
export const ARTIFACT_TRANSITIONS: Record<ArtifactStatus, ArtifactStatus[]> = {
  draft: ['research', 'interviewing'],       // Blog: research, Showcase: interviewing
  interviewing: ['research'],                 // Interview complete → research
  research: ['foundations'],                   // Research → foundations analysis
  foundations: ['skeleton', 'foundations_approval'], // → skeleton or directly to approval
  skeleton: ['foundations_approval'],          // Skeleton → approval gate
  foundations_approval: ['writing'],           // User approves → writing begins
  writing: ['humanity_checking'],             // Writing → humanity check
  humanity_checking: ['creating_visuals'],    // Humanity check → visuals
  creating_visuals: ['ready'],                // Visuals → ready
  ready: ['published'],                       // User publishes
  published: ['ready'],                       // Edit triggers return to ready
}
```

### Transitions Table

| From | To | Trigger | Auto/Manual |
|------|----|---------| ------------|
| `draft` | `research` | User clicks "Create Content" (blog) | Manual |
| `draft` | `interviewing` | User clicks "Create Content" (showcase) | Manual |
| `interviewing` | `research` | 6 interview Q&A complete | Auto |
| `research` | `foundations` | Research completes, characteristics analysis starts | Auto |
| `foundations` | `skeleton` | Characteristics analysis completes | Auto |
| `skeleton` | `foundations_approval` | Skeleton generated, pipeline pauses | Auto |
| `foundations_approval` | `writing` | User clicks "Foundations Approved" button | **Manual (UI)** |
| `writing` | `humanity_checking` | Writing completes | Auto |
| `humanity_checking` | `creating_visuals` | Humanity check completes | Auto |
| `creating_visuals` | `ready` | Visuals complete | Auto |
| `ready` | `published` | User clicks "Mark as Published" | Manual |
| `published` | `ready` | User edits content | Auto |

---

## Common Use Cases

### Check if Editor Should Be Locked
```typescript
import { isProcessingState } from '@/features/portfolio/validators'

const editable = !isProcessingState(artifact.status)
```

### Get User-Facing Label
```typescript
import { STATUS_LABELS } from '@/features/portfolio/validators'

const label = STATUS_LABELS[artifact.status] // "Creating Content"
```

### Get Status Color
```typescript
import { STATUS_COLORS } from '@/features/portfolio/validators'

const colorClasses = STATUS_COLORS[artifact.status]
```

### Determine Progress Percentage
```typescript
function getProgressPercentage(status: ArtifactStatus): number {
  const percentages: Record<ArtifactStatus, number> = {
    draft: 0,
    interviewing: 5,
    research: 15,
    foundations: 30,
    skeleton: 45,
    foundations_approval: 50,
    writing: 70,
    humanity_checking: 80,
    creating_visuals: 90,
    ready: 100,
    published: 100,
  }
  return percentages[status] ?? 0
}
```

---

## Quick Lookup (11 statuses)

### "What status should I use when...?"

| Scenario | Status | Label | Progress |
|----------|--------|-------|----------|
| User creates new artifact | `draft` | Draft | 0% |
| AI interviews user (showcase) | `interviewing` | Interviewing | 5% |
| AI starts researching | `research` | Creating Foundations | 15% |
| AI analyzes writing style | `foundations` | Creating Foundations | 30% |
| AI generates outline | `skeleton` | Creating Foundations | 45% |
| User reviews and approves | `foundations_approval` | Foundations Approval | 50% |
| AI writes full content | `writing` | Creating Content | 70% |
| AI humanizes content | `humanity_checking` | Creating Content | 80% |
| AI generates images | `creating_visuals` | Creating Content | 90% |
| Content ready for review | `ready` | Content Ready | 100% |
| User publishes content | `published` | Published | 100% |

### "What label displays for...?"

| Status(es) | User-Facing Label |
|-----------|-------------------|
| `draft` | Draft |
| `interviewing` | Interviewing |
| `research`, `foundations`, `skeleton` | Creating Foundations |
| `foundations_approval` | Foundations Approval |
| `writing`, `humanity_checking`, `creating_visuals` | Creating Content |
| `ready` | Content Ready |
| `published` | Published |

---

## Migration History

### 2026-01-27: Database Constraint Update
- **Migration:** `update_artifact_status_constraint`
- **Change:** Updated database CHECK constraint to support all 7 statuses

### 2026-01-29: Phase 4 Status Update
- **Migration:** `007_phase4_new_statuses.sql`
- **Change:** Updated database CHECK constraint from 7 to 9 statuses
- **New Statuses:** `foundations`, `foundations_approval`

### 2026-02-xx: Phase 5+ Status Updates
- **New Statuses:** `interviewing` (showcase interview flow), `humanity_checking` (humanity check step)
- **Database:** Constraint expanded to 12 values (includes reserved `archived`)
- **Processing States:** Updated from 4 to 7

---

## Related Documentation

- **[status-flow-reference.md](./status-flow-reference.md)** - Detailed status reference with UI behavior
- **[pipeline-execution-flow.md](../ai-agents-and-prompts/pipeline-execution-flow.md)** - Pipeline execution details
- **[artifact-schema-and-workflow.md](../Architecture/database/artifact-schema-and-workflow.md)** - Database schema

---

**Version History:**
- **3.0.0** (2026-02-19) - **Full 11-status workflow**:
  - Updated from 9-status to 11-status documentation
  - Added `interviewing` status (showcase interview flow)
  - Added `humanity_checking` status (AI content humanization step)
  - Documented `archived` as DB-only reserved status
  - Updated processing states from 4 to 7
  - Updated transitions, labels, colors, icons from actual code
  - Added dual pipeline path documentation (blog vs showcase)
- **2.0.0** (2026-01-29) - Phase 4 Writing Quality Enhancement (9 statuses)
- **1.0.0** (2026-01-27) - Initial consolidated status reference
