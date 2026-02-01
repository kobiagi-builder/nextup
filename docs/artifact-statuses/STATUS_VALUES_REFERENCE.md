# Artifact Status Values Reference

**Version:** 2.0.0
**Last Updated:** 2026-01-29
**Purpose:** Quick reference for internal values, database values, and user-facing labels

---

## Complete Status Mapping

| Internal Value (TypeScript) | Database Value | User-Facing Label | Color | Icon | Editor State | Progress |
|------------------------------|----------------|-------------------|-------|------|--------------|----------|
| `draft` | `draft` | **Draft** | Gray | FileEdit | Unlocked | 0% |
| `research` | `research` | **Creating the Foundations** | Blue | Search | Locked | 15% |
| `foundations` | `foundations` | **Creating the Foundations** | Blue | FileText | Locked | 30% |
| `skeleton` | `skeleton` | **Creating the Foundations** | Blue | Layout | Locked | 45% |
| `foundations_approval` | `foundations_approval` | **Foundations Approval** | Amber | CheckCircle | Skeleton Editable | 50% |
| `writing` | `writing` | **Writing Content** | Blue | PenLine | Locked | 70% |
| `creating_visuals` | `creating_visuals` | **Creating Visuals** | Purple | Image | Locked | 90% |
| `ready` | `ready` | **Content Ready** | Green | CheckCircle | Unlocked | 100% |
| `published` | `published` | **Published** | Emerald | Send | Unlocked | 100% |

---

## Key Principles

### 1. Internal = Database
All 9 status values are **identical** in:
- TypeScript types (`backend/src/types/portfolio.ts`)
- Database constraint (`artifacts_status_check`)
- No mapping or transformation needed

### 2. User-Facing Consolidation
Multiple internal statuses display as the same label to simplify UX:
- `research`, `foundations`, `skeleton` → **"Creating the Foundations"**
- `foundations_approval` → **"Foundations Approval"** (user approval gate)
- `writing` → **"Writing Content"**
- `creating_visuals` → **"Creating Visuals"**

### 3. Processing States (4 states)
These statuses lock the main editor while AI is working (polling enabled):
```typescript
const PROCESSING_STATES = ['research', 'foundations', 'writing', 'creating_visuals']
```

**Note:** `skeleton` is NOT a processing state - it transitions quickly to `foundations_approval`.

### 4. Phase 4: Foundations Approval Workflow
The `foundations_approval` status is special:
- Main editor is locked
- Skeleton is EDITABLE in FoundationsSection
- User reviews writing characteristics and skeleton
- User clicks "Foundations Approved" button to continue pipeline

---

## Status Categories

### Editable States (3)
User can edit content:
- `draft` - Initial creation
- `ready` - Content complete, ready to publish
- `published` - Published content (editing → ready)

### Processing States (4)
Editor locked, AI actively working, polling enabled:
- `research` - AI researching from multiple sources (15%)
- `foundations` - AI analyzing writing characteristics (30%)
- `writing` - AI writing full content (70%)
- `creating_visuals` - AI generating cover image (90%)

### Approval States (1) - Phase 4
Pipeline paused, waiting for user action:
- `foundations_approval` - User reviews and approves skeleton + characteristics (50%)

### Transition States (1)
Brief processing, not polling:
- `skeleton` - AI generating structure (45%), transitions quickly to `foundations_approval`

---

## Database Constraint (Phase 4 - 9 statuses)

```sql
ALTER TABLE artifacts DROP CONSTRAINT IF EXISTS artifacts_status_check;

ALTER TABLE artifacts ADD CONSTRAINT artifacts_status_check
  CHECK (status IN (
    'draft',                -- Initial state, editable
    'research',             -- AI researching (user-facing: Creating the Foundations)
    'foundations',          -- AI analyzing characteristics (user-facing: Creating the Foundations) - Phase 4
    'skeleton',             -- AI creating structure (user-facing: Creating the Foundations)
    'foundations_approval', -- User approval gate (user-facing: Foundations Approval) - Phase 4
    'writing',              -- AI writing content (user-facing: Writing Content)
    'creating_visuals',     -- AI generating images (user-facing: Creating Visuals)
    'ready',                -- Content ready (user-facing: Content Ready)
    'published'             -- Published, editable
  ));
```

**Note:** `archived` was removed in Phase 4. The workflow now has 9 active statuses.

---

## Frontend Implementation (Phase 4 - 9 statuses)

### Status Labels
Located in: `frontend/src/features/portfolio/validators/stateMachine.ts`

```typescript
export const STATUS_LABELS: Record<ArtifactStatus, string> = {
  draft: 'Draft',
  research: 'Creating the Foundations',
  foundations: 'Creating the Foundations',
  skeleton: 'Creating the Foundations',
  foundations_approval: 'Foundations Approval',
  writing: 'Writing Content',
  creating_visuals: 'Creating Visuals',
  ready: 'Content Ready',
  published: 'Published',
}
```

### Status Colors
```typescript
export const STATUS_COLORS: Record<ArtifactStatus, string> = {
  draft: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  research: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  foundations: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  skeleton: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  foundations_approval: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  writing: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  creating_visuals: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  ready: 'bg-green-500/10 text-green-400 border-green-500/20',
  published: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
}
```

---

## Backend Implementation (Phase 4 - 9 statuses)

### TypeScript Types
Located in: `backend/src/types/portfolio.ts`

```typescript
// Phase 4: 9-status linear workflow with approval gate
export type ArtifactStatus =
  | 'draft'                 // Initial state, editable
  | 'research'              // AI researching, editor locked
  | 'foundations'           // AI analyzing characteristics, editor locked (Phase 4)
  | 'skeleton'              // AI creating structure, editor locked
  | 'foundations_approval'  // User approval gate, skeleton editable (Phase 4)
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
    toolName: 'analyzeWritingCharacteristics', // Phase 4 NEW
    expectedStatusBefore: 'research',
    expectedStatusAfter: 'foundations',
  },
  {
    toolName: 'generateContentSkeleton',
    expectedStatusBefore: 'foundations',
    expectedStatusAfter: 'skeleton',
    pauseForApproval: true,  // Phase 4: Pipeline pauses here
  },
  // PIPELINE PAUSES at 'foundations_approval' - User must click "Foundations Approved"
  {
    toolName: 'writeFullContent',
    expectedStatusBefore: 'foundations_approval',  // Phase 4: Resumes from approval
    expectedStatusAfter: 'writing',
  },
  {
    toolName: 'identifyImageNeeds',
    expectedStatusBefore: 'writing',
    expectedStatusAfter: 'creating_visuals',
  },
  // Pipeline completes at 'ready'
]
```

---

## Status Transition Flow

### Phase 4 Workflow (with Foundations Approval)
```
draft → research → foundations → skeleton → foundations_approval → [UI BUTTON] → writing → creating_visuals → ready → published
                                                                                                                      ↓
                                                                                                                   ready (on edit)
```

### Valid Transitions

| From | To | Trigger | Auto/Manual |
|------|----|---------| ------------|
| `draft` | `research` | User clicks "Create Content" | Manual |
| `research` | `foundations` | Research completes, characteristics analysis starts | Auto |
| `foundations` | `skeleton` | Characteristics analysis completes | Auto |
| `skeleton` | `foundations_approval` | Skeleton generated, pipeline pauses | Auto |
| `foundations_approval` | `writing` | User clicks "Foundations Approved" button | **Manual (UI)** |
| `writing` | `creating_visuals` | Writing completes | Auto |
| `creating_visuals` | `ready` | Visuals complete | Auto |
| `ready` | `published` | User clicks "Mark as Published" | Manual |
| `published` | `ready` | User edits content | Auto |

### Key Phase 4 Changes
1. **New `foundations` status**: AI analyzes writing characteristics after research
2. **New `foundations_approval` status**: Pipeline PAUSES for user review
3. **Editable skeleton**: User can edit skeleton in FoundationsSection during `foundations_approval`
4. **UI button approval**: User clicks "Foundations Approved" button (not chat-based)

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

### Determine Progress Percentage (Phase 4 - 9 statuses)
```typescript
function getProgressPercentage(status: ArtifactStatus): number {
  const percentages = {
    draft: 0,
    research: 15,
    foundations: 30,
    skeleton: 45,
    foundations_approval: 50,
    writing: 70,
    creating_visuals: 90,
    ready: 100,
    published: 100
  }
  return percentages[status] ?? 0
}
```

---

## Quick Lookup (Phase 4 - 9 statuses)

### "What status should I use when...?"

| Scenario | Status | Label | Progress |
|----------|--------|-------|----------|
| User creates new artifact | `draft` | Draft | 0% |
| AI starts researching | `research` | Creating the Foundations | 15% |
| AI analyzes writing style | `foundations` | Creating the Foundations | 30% |
| AI generates outline | `skeleton` | Creating the Foundations | 45% |
| User reviews and approves | `foundations_approval` | Foundations Approval | 50% |
| AI writes full content | `writing` | Writing Content | 70% |
| AI generates images | `creating_visuals` | Creating Visuals | 90% |
| Content ready for review | `ready` | Content Ready | 100% |
| User publishes content | `published` | Published | 100% |

### "What label displays for...?"

| Status(es) | User-Facing Label |
|-----------|-------------------|
| `draft` | Draft |
| `research`, `foundations`, `skeleton` | Creating the Foundations |
| `foundations_approval` | Foundations Approval |
| `writing` | Writing Content |
| `creating_visuals` | Creating Visuals |
| `ready` | Content Ready |
| `published` | Published |

---

## Migration History

### 2026-01-27: Database Constraint Update
- **Migration:** `update_artifact_status_constraint`
- **Change:** Updated database CHECK constraint to support all 7 statuses
- **Affected Tools:**
  - `conductDeepResearch` - Now uses `research` (was `researching`)
  - `generateContentSkeleton` - Now uses `skeleton` (was `skeleton_ready`)
  - `writeFullContent` - Now uses `writing` (unchanged)

### 2026-01-29: Phase 4 Status Update
- **Migration:** `007_phase4_new_statuses.sql`
- **Change:** Updated database CHECK constraint from 7 to 9 statuses
- **New Statuses:**
  - `foundations` - AI analyzing writing characteristics
  - `foundations_approval` - User approval gate
- **New Tool:**
  - `analyzeWritingCharacteristics` - Analyzes user's writing style
- **Pipeline Change:**
  - Pipeline now pauses at `foundations_approval`
  - User must click "Foundations Approved" button to continue

---

## Related Documentation

- **[7-status-workflow-specification.md](./7-status-workflow-specification.md)** - Complete 9-status workflow specification (v3.0.0)
- **[status-flow-reference.md](./status-flow-reference.md)** - Detailed 9-status reference (v3.0.0)
- **[pipeline-execution-flow.md](../ai-agents-and-prompts/pipeline-execution-flow.md)** - Pipeline execution details (v2.0.0)
- **[artifact-schema-and-workflow.md](../Architecture/database/artifact-schema-and-workflow.md)** - Database schema (v2.0.0)
- **[core-tools-reference.md](../ai-agents-and-prompts/core-tools-reference.md)** - Tool documentation (v2.0.0)

---

**Version History:**
- **2.0.0** (2026-01-29) - **Phase 4 Writing Quality Enhancement**:
  - Updated from 7-status to 9-status workflow
  - Added `foundations` and `foundations_approval` statuses
  - Fixed inconsistencies in processing states, database constraint, frontend/backend implementations
  - Updated progress percentages for new statuses
  - Updated quick lookup tables
- **1.0.0** (2026-01-27) - Initial consolidated status reference
