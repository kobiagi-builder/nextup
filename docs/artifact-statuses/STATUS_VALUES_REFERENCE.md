# Artifact Status Values Reference

**Version:** 1.0.0
**Last Updated:** 2026-01-27
**Purpose:** Quick reference for internal values, database values, and user-facing labels

---

## Complete Status Mapping

| Internal Value (TypeScript) | Database Value | User-Facing Label | Color | Icon | Editor State | Progress |
|------------------------------|----------------|-------------------|-------|------|--------------|----------|
| `draft` | `draft` | **Draft** | Gray | FileEdit | Unlocked | 0% |
| `research` | `research` | **Creating Content** | Blue | Search | Locked | 25% |
| `skeleton` | `skeleton` | **Creating Content** | Blue | Layout | Locked | 50% |
| `writing` | `writing` | **Creating Content** | Blue | PenLine | Locked | 75% |
| `creating_visuals` | `creating_visuals` | **Creating Content** | Purple | Image | Locked | 90% |
| `ready` | `ready` | **Content Ready** | Green | CheckCircle | Unlocked | 100% |
| `published` | `published` | **Published** | Emerald | Send | Unlocked | 100% |

---

## Key Principles

### 1. Internal = Database
All 7 status values are **identical** in:
- TypeScript types (`backend/src/types/portfolio.ts`)
- Database constraint (`artifacts_status_check`)
- No mapping or transformation needed

### 2. User-Facing Consolidation
Multiple internal statuses display as the same label to simplify UX:
- `research`, `skeleton`, `writing`, `creating_visuals` → **"Creating Content"**
- This creates a simple 3-label system for users: Draft → Creating Content → Content Ready → Published

### 3. Processing States
These 4 statuses lock the editor while AI is working:
```typescript
const PROCESSING_STATES = ['research', 'skeleton', 'writing', 'creating_visuals']
```

---

## Status Categories

### Editable States (3)
User can edit content:
- `draft` - Initial creation
- `ready` - Content complete, ready to publish
- `published` - Published content (editing → ready)

### Processing States (4)
Editor locked, AI actively working:
- `research` - AI researching from multiple sources
- `skeleton` - AI generating structure (H1 + H2 headings)
- `writing` - AI writing full content
- `creating_visuals` - AI generating cover image

---

## Database Constraint

```sql
ALTER TABLE artifacts ADD CONSTRAINT artifacts_status_check
  CHECK (status IN (
    'draft',              -- Initial state, editable
    'research',           -- AI researching (user-facing: Creating Content)
    'skeleton',           -- AI creating structure (user-facing: Creating Content)
    'writing',            -- AI writing content (user-facing: Creating Content)
    'creating_visuals',   -- AI generating images (user-facing: Creating Content)
    'ready',              -- Content ready (user-facing: Content Ready)
    'published',          -- Published, editable
    'archived'            -- Archived (kept for backward compatibility)
  ));
```

**Note:** `archived` is kept for backward compatibility but not actively used in the 7-status workflow.

---

## Frontend Implementation

### Status Labels
Located in: `frontend/src/features/portfolio/validators/stateMachine.ts`

```typescript
export const STATUS_LABELS: Record<ArtifactStatus, string> = {
  draft: 'Draft',
  research: 'Creating Content',
  skeleton: 'Creating Content',
  writing: 'Creating Content',
  creating_visuals: 'Creating Content',
  ready: 'Content Ready',
  published: 'Published',
}
```

### Status Colors
```typescript
export const STATUS_COLORS: Record<ArtifactStatus, string> = {
  draft: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  research: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  skeleton: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  writing: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  creating_visuals: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  ready: 'bg-green-500/10 text-green-400 border-green-500/20',
  published: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
}
```

---

## Backend Implementation

### TypeScript Types
Located in: `backend/src/types/portfolio.ts`

```typescript
// Unified Content Agent Architecture: 7-status linear workflow (no approval gates)
export type ArtifactStatus =
  | 'draft'                 // Initial state, editable
  | 'research'              // AI researching, editor locked
  | 'skeleton'              // AI creating structure, editor locked
  | 'writing'               // AI writing content, editor locked
  | 'creating_visuals'      // AI generating images, editor locked
  | 'ready'                 // Content ready, editable, can publish
  | 'published'             // Published, editable (editing → ready)
```

### Pipeline Executor
Located in: `backend/src/services/ai/PipelineExecutor.ts`

```typescript
const PIPELINE_STEPS: PipelineStep[] = [
  {
    toolName: 'conductDeepResearch',
    expectedStatusBefore: 'draft',
    expectedStatusAfter: 'research',
  },
  {
    toolName: 'generateContentSkeleton',
    expectedStatusBefore: 'research',
    expectedStatusAfter: 'skeleton',
  },
  {
    toolName: 'writeFullContent',
    expectedStatusBefore: 'skeleton',
    expectedStatusAfter: 'writing',
  },
  {
    toolName: 'generateContentVisuals',
    expectedStatusBefore: 'creating_visuals',
    expectedStatusAfter: 'ready',
  },
]
```

---

## Status Transition Flow

### Linear Workflow
```
draft → research → skeleton → writing → creating_visuals → ready → published
                                                                      ↓
                                                                   ready (on edit)
```

### Valid Transitions

| From | To | Trigger | Auto/Manual |
|------|----|---------| ------------|
| `draft` | `research` | User clicks "Create Content" | Manual |
| `research` | `skeleton` | Research completes | Auto |
| `skeleton` | `writing` | Skeleton completes | Auto |
| `writing` | `creating_visuals` | Writing completes | Auto |
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
  const percentages = {
    draft: 0,
    research: 25,
    skeleton: 50,
    writing: 75,
    creating_visuals: 90,
    ready: 100,
    published: 100
  }
  return percentages[status] ?? 0
}
```

---

## Migration History

### 2026-01-27: Database Constraint Update
- **Migration:** `update_artifact_status_constraint`
- **Change:** Updated database CHECK constraint to support all 7 statuses
- **Affected Tools:**
  - `conductDeepResearch` - Now uses `research` (was `researching`)
  - `generateContentSkeleton` - Now uses `skeleton` (was `skeleton_ready`)
  - `writeFullContent` - Now uses `writing` (unchanged)

---

## Related Documentation

- **[7-status-workflow-specification.md](./7-status-workflow-specification.md)** - Complete workflow specification
- **[status-flow-reference.md](./status-flow-reference.md)** - Detailed status reference
- **[pipeline-execution-flow.md](../ai-agents-and-prompts/pipeline-execution-flow.md)** - Pipeline execution details
- **[artifact-schema-and-workflow.md](../Architecture/database/artifact-schema-and-workflow.md)** - Database schema

---

## Quick Lookup

### "What status should I use when...?"

| Scenario | Status | Label |
|----------|--------|-------|
| User creates new artifact | `draft` | Draft |
| AI starts researching | `research` | Creating Content |
| AI generates outline | `skeleton` | Creating Content |
| AI writes full content | `writing` | Creating Content |
| AI generates images | `creating_visuals` | Creating Content |
| Content ready for review | `ready` | Content Ready |
| User publishes content | `published` | Published |

### "What label displays for...?"

| Status(es) | User-Facing Label |
|-----------|-------------------|
| `draft` | Draft |
| `research`, `skeleton`, `writing`, `creating_visuals` | Creating Content |
| `ready` | Content Ready |
| `published` | Published |

---

**Version History:**
- **1.0.0** (2026-01-27) - Initial consolidated status reference
