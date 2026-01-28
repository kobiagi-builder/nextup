# Migration Guide: Old to New Artifact Statuses

**Version:** 1.0.0
**Last Updated:** 2026-01-26
**Status:** Complete

## Overview

This guide documents the migration from the legacy multi-branching status workflow to the new 7-status linear workflow. The migration simplifies the content creation flow by eliminating approval gates and branching paths.

**Migration Summary:**
- **Old Workflow**: 9 statuses with approval gates and branching
- **New Workflow**: 7 statuses, linear progression, no approval gates
- **Removed Statuses**: skeleton_ready, skeleton_approved, review_ready, content_approved, archived
- **Added Statuses**: research, skeleton, writing, creating_visuals
- **Consolidated**: in_progress → Multiple processing states

---

## Status Mapping

### Complete Mapping Table

| Old Status | New Status | Mapping Rule | Notes |
|-----------|-----------|--------------|-------|
| `draft` | `draft` | 1:1 Direct mapping | Same semantics |
| `in_progress` | `research`, `skeleton`, `writing`, `creating_visuals` | Split by phase | One old status → 4 new statuses |
| `skeleton_ready` | `skeleton` | Consolidated | Approval gate removed |
| `skeleton_approved` | ❌ Removed | — | Approval gate eliminated |
| `review_ready` | `ready` | Renamed | Approval gate removed |
| `content_approved` | ❌ Removed | — | Approval gate eliminated |
| `ready` | `ready` | 1:1 Direct mapping | Same semantics |
| `published` | `published` | 1:1 Direct mapping | Same semantics |
| `archived` | ❌ Removed | Soft delete | Use `deleted_at` field instead |

---

## Removed Statuses

### skeleton_ready → skeleton

**Old Behavior:**
```typescript
// Legacy: Skeleton generated, awaiting user approval
await updateArtifact({ id, status: 'skeleton_ready' })

// User clicks "Approve Skeleton" button
await updateArtifact({ id, status: 'skeleton_approved' })
```

**New Behavior:**
```typescript
// New: Skeleton generated, auto-advances to writing
await updateArtifact({ id, status: 'skeleton' })

// No user approval needed, auto-transitions
await updateArtifact({ id, status: 'writing' })
```

**Migration:**
- Map `skeleton_ready` → `skeleton`
- Remove "Approve Skeleton" button from UI
- Auto-transition logic replaces manual approval

---

### skeleton_approved → Removed

**Old Behavior:**
```typescript
// Legacy: User approved skeleton, ready to write
await updateArtifact({ id, status: 'skeleton_approved' })

// Triggers content writing
await writeFullContent({ artifactId: id })
```

**New Behavior:**
```typescript
// New: Skeleton auto-advances to writing (no approval step)
await updateArtifact({ id, status: 'skeleton' })

// Auto-transition to writing
await updateArtifact({ id, status: 'writing' })
await writeFullContent({ artifactId: id })
```

**Migration:**
- Delete all `skeleton_approved` references
- Consolidate into `skeleton` → `writing` auto-transition

---

### review_ready → ready

**Old Behavior:**
```typescript
// Legacy: Content written, awaiting review
await updateArtifact({ id, status: 'review_ready' })

// User reviews and approves
await updateArtifact({ id, status: 'content_approved' })

// Then marks as ready
await updateArtifact({ id, status: 'ready' })
```

**New Behavior:**
```typescript
// New: Content complete, auto-transitions to ready
await updateArtifact({ id, status: 'creating_visuals' })

// Auto-transition when visuals complete
await updateArtifact({ id, status: 'ready' })
```

**Migration:**
- Rename `review_ready` → `ready`
- Remove "Approve Content" button from UI
- Consolidate review + approval into single `ready` state

---

### content_approved → Removed

**Old Behavior:**
```typescript
// Legacy: User approved content after review
await updateArtifact({ id, status: 'content_approved' })
```

**New Behavior:**
```typescript
// New: Content approved implicitly when ready
// No separate approval state needed
await updateArtifact({ id, status: 'ready' })
```

**Migration:**
- Delete all `content_approved` references
- Treat `ready` as the final editable state

---

### archived → Soft Delete

**Old Behavior:**
```typescript
// Legacy: Archive artifact (kept in database with status = 'archived')
await updateArtifact({ id, status: 'archived' })

// Query excludes archived
const artifacts = await supabase
  .from('artifacts')
  .select('*')
  .neq('status', 'archived')
```

**New Behavior:**
```typescript
// New: Soft delete using deleted_at field
await updateArtifact({ id, deleted_at: new Date() })

// Query excludes soft-deleted
const artifacts = await supabase
  .from('artifacts')
  .select('*')
  .is('deleted_at', null)
```

**Migration:**
- Add `deleted_at TIMESTAMPTZ` column to artifacts table
- Map `status = 'archived'` → `deleted_at = NOW()`
- Update all queries to filter `WHERE deleted_at IS NULL`

---

## Added Statuses

### research (New)

**Purpose:**
- Dedicated status for AI research phase
- Previously hidden within `in_progress`

**Behavior:**
```typescript
// User clicks "Create Content"
await updateArtifact({ id, status: 'research' })
await conductDeepResearch({ artifactId: id })

// Auto-transition to skeleton
await updateArtifact({ id, status: 'skeleton' })
```

**UI Impact:**
- WritingProgress shows 25% complete
- Research sources displayed in ResearchArea
- Editor locked during research

---

### skeleton (New)

**Purpose:**
- Dedicated status for skeleton generation
- Replaces `skeleton_ready` (removed approval gate)

**Behavior:**
```typescript
// Auto-transition from research
await updateArtifact({ id, status: 'skeleton' })
await generateContentSkeleton({ artifactId: id })

// Auto-transition to writing
await updateArtifact({ id, status: 'writing' })
```

**UI Impact:**
- WritingProgress shows 50% complete
- Skeleton sections displayed with word counts
- Editor locked during skeleton generation

---

### writing (New)

**Purpose:**
- Dedicated status for full content writing
- Previously hidden within `in_progress`

**Behavior:**
```typescript
// Auto-transition from skeleton
await updateArtifact({ id, status: 'writing' })
await writeFullContent({ artifactId: id })

// Auto-transition to creating_visuals
await updateArtifact({ id, status: 'creating_visuals' })
```

**UI Impact:**
- WritingProgress shows 75% complete
- Current section highlighted
- Editor locked, content streams in

---

### creating_visuals (New)

**Purpose:**
- Dedicated status for image generation
- Previously hidden within `in_progress`

**Behavior:**
```typescript
// Auto-transition from writing
await updateArtifact({ id, status: 'creating_visuals' })
await generateContentVisuals({ artifactId: id })

// Auto-transition to ready
await updateArtifact({ id, status: 'ready' })
```

**UI Impact:**
- WritingProgress shows 90% complete
- Image placeholder visible
- Optional "Humanize" button

---

## in_progress Split

### Old Behavior (Single Status)

```typescript
// Legacy: Single in_progress status for entire AI workflow
await updateArtifact({ id, status: 'in_progress' })

// Execute all phases sequentially (no status updates)
await conductDeepResearch({ artifactId: id })
await generateContentSkeleton({ artifactId: id })
await writeFullContent({ artifactId: id })
await generateContentVisuals({ artifactId: id })

// Final status update
await updateArtifact({ id, status: 'ready' })
```

**Problems:**
- No visibility into current phase
- Cannot resume from checkpoint
- Single progress bar (no phase breakdown)
- No phase-specific UI feedback

---

### New Behavior (4 Statuses)

```typescript
// New: Granular status updates per phase
await updateArtifact({ id, status: 'research' })
await conductDeepResearch({ artifactId: id })

await updateArtifact({ id, status: 'skeleton' })
await generateContentSkeleton({ artifactId: id })

await updateArtifact({ id, status: 'writing' })
await writeFullContent({ artifactId: id })

await updateArtifact({ id, status: 'creating_visuals' })
await generateContentVisuals({ artifactId: id })

await updateArtifact({ id, status: 'ready' })
```

**Benefits:**
- ✅ Clear visibility into current phase
- ✅ Resume from checkpoint on error
- ✅ Phase-specific progress (25%, 50%, 75%, 90%)
- ✅ Phase-specific UI feedback

---

## Migration Steps

### 1. Database Schema Update

```sql
-- Step 1: Add new status values to enum
ALTER TYPE artifact_status ADD VALUE IF NOT EXISTS 'research';
ALTER TYPE artifact_status ADD VALUE IF NOT EXISTS 'skeleton';
ALTER TYPE artifact_status ADD VALUE IF NOT EXISTS 'writing';
ALTER TYPE artifact_status ADD VALUE IF NOT EXISTS 'creating_visuals';

-- Step 2: Add deleted_at column for soft deletes
ALTER TABLE artifacts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Step 3: Migrate archived → soft delete
UPDATE artifacts
SET deleted_at = updated_at
WHERE status = 'archived';

-- Step 4: Migrate skeleton_ready → skeleton
UPDATE artifacts
SET status = 'skeleton'
WHERE status = 'skeleton_ready';

-- Step 5: Migrate review_ready → ready
UPDATE artifacts
SET status = 'ready'
WHERE status = 'review_ready';

-- Step 6: Migrate skeleton_approved → skeleton (or writing if processing)
UPDATE artifacts
SET status = CASE
  WHEN updated_at < NOW() - INTERVAL '5 minutes' THEN 'skeleton'
  ELSE 'writing'
END
WHERE status = 'skeleton_approved';

-- Step 7: Migrate content_approved → ready
UPDATE artifacts
SET status = 'ready'
WHERE status = 'content_approved';

-- Step 8: Migrate in_progress → best guess based on timestamp
UPDATE artifacts
SET status = CASE
  WHEN updated_at < NOW() - INTERVAL '2 minutes' THEN 'research'
  WHEN updated_at < NOW() - INTERVAL '5 minutes' THEN 'skeleton'
  WHEN updated_at < NOW() - INTERVAL '10 minutes' THEN 'writing'
  ELSE 'creating_visuals'
END
WHERE status = 'in_progress';

-- Step 9: Update status constraint (remove old statuses)
ALTER TABLE artifacts DROP CONSTRAINT IF EXISTS artifacts_status_check;
ALTER TABLE artifacts ADD CONSTRAINT artifacts_status_check
  CHECK (status IN (
    'draft',
    'research',
    'skeleton',
    'writing',
    'creating_visuals',
    'ready',
    'published'
  ));
```

---

### 2. Backend Code Updates

**Before (Legacy):**
```typescript
// Old status checks
if (artifact.status === 'skeleton_ready') {
  // Show "Approve Skeleton" button
}

if (artifact.status === 'content_approved') {
  // Allow publishing
}

// Old query (exclude archived)
const artifacts = await supabase
  .from('artifacts')
  .select('*')
  .neq('status', 'archived')
```

**After (New):**
```typescript
// New status checks
if (artifact.status === 'skeleton') {
  // Auto-transition to writing (no approval needed)
  await updateArtifact({ id, status: 'writing' })
}

if (artifact.status === 'ready') {
  // Allow publishing (no approval needed)
}

// New query (exclude soft-deleted)
const artifacts = await supabase
  .from('artifacts')
  .select('*')
  .is('deleted_at', null)
```

---

### 3. Frontend Component Updates

**Before (Legacy):**
```tsx
// Old: Approval buttons
{artifact.status === 'skeleton_ready' && (
  <Button onClick={handleApproveSkeleton}>
    Approve Skeleton
  </Button>
)}

{artifact.status === 'content_approved' && (
  <Button onClick={handleMarkAsReady}>
    Mark as Ready
  </Button>
)}

// Old: Single in_progress state
{artifact.status === 'in_progress' && (
  <WritingProgress progress={50} />
)}
```

**After (New):**
```tsx
// New: No approval buttons (auto-transitions)
// Removed: handleApproveSkeleton, handleMarkAsReady

// New: Phase-specific progress
{isProcessingState(artifact.status) && (
  <WritingProgress
    status={artifact.status}
    progress={getProgressPercentage(artifact.status)}
  />
)}

function getProgressPercentage(status: ArtifactStatus): number {
  const percentages = {
    research: 25,
    skeleton: 50,
    writing: 75,
    creating_visuals: 90
  }
  return percentages[status] ?? 0
}
```

---

### 4. API Endpoint Updates

**Before (Legacy):**
```typescript
// POST /api/artifacts/:id/approve-skeleton
app.post('/api/artifacts/:id/approve-skeleton', async (req, res) => {
  await updateArtifact({ id: req.params.id, status: 'skeleton_approved' })
  res.json({ success: true })
})

// POST /api/artifacts/:id/approve-content
app.post('/api/artifacts/:id/approve-content', async (req, res) => {
  await updateArtifact({ id: req.params.id, status: 'content_approved' })
  res.json({ success: true })
})
```

**After (New):**
```typescript
// REMOVED: No approval endpoints needed
// Auto-transitions handle all phase progressions

// Existing update endpoint handles status changes
// PATCH /api/artifacts/:id
app.patch('/api/artifacts/:id', async (req, res) => {
  const { status } = req.body
  await updateArtifact({ id: req.params.id, status })
  res.json({ success: true })
})
```

---

### 5. Test Suite Updates

**Update Test Cases:**
```typescript
// Before (Legacy)
describe('Artifact Status Flow', () => {
  it('should transition draft → in_progress → skeleton_ready', async () => {
    await updateStatus(id, 'in_progress')
    await updateStatus(id, 'skeleton_ready')
  })

  it('should require approval to advance from skeleton_ready', async () => {
    await updateStatus(id, 'skeleton_ready')
    expect(await getStatus(id)).toBe('skeleton_ready')
  })
})

// After (New)
describe('Artifact Status Flow', () => {
  it('should transition draft → research → skeleton → writing', async () => {
    await updateStatus(id, 'research')
    await updateStatus(id, 'skeleton')
    await updateStatus(id, 'writing')
  })

  it('should auto-transition skeleton → writing (no approval)', async () => {
    await updateStatus(id, 'skeleton')
    await autoTransition(id)
    expect(await getStatus(id)).toBe('writing')
  })
})
```

---

## Rollback Plan

If migration fails, rollback procedure:

```sql
-- 1. Restore old status values
UPDATE artifacts
SET status = 'skeleton_ready'
WHERE status = 'skeleton';

UPDATE artifacts
SET status = 'review_ready'
WHERE status = 'ready' AND created_at > '2026-01-25';

-- 2. Restore archived artifacts
UPDATE artifacts
SET status = 'archived', deleted_at = NULL
WHERE deleted_at IS NOT NULL;

-- 3. Drop new status values (requires no artifacts using them)
-- ALTER TYPE artifact_status DROP VALUE 'research';
-- (PostgreSQL doesn't support DROP VALUE, must recreate enum)

-- 4. Restore old constraint
ALTER TABLE artifacts DROP CONSTRAINT artifacts_status_check;
ALTER TABLE artifacts ADD CONSTRAINT artifacts_status_check
  CHECK (status IN (
    'draft',
    'in_progress',
    'skeleton_ready',
    'skeleton_approved',
    'review_ready',
    'content_approved',
    'ready',
    'published',
    'archived'
  ));
```

---

## Testing Checklist

### Backend Tests

- [ ] All old status references removed from codebase
- [ ] Soft delete queries filter `deleted_at IS NULL`
- [ ] Auto-transition logic works for skeleton → writing
- [ ] Auto-transition logic works for creating_visuals → ready
- [ ] Published → ready auto-revert works on edit
- [ ] Database constraint allows only 7 new statuses

### Frontend Tests

- [ ] Approval buttons removed from UI
- [ ] WritingProgress shows correct percentage per status
- [ ] Editor locked during processing states (4 states)
- [ ] Editor unlocked during editable states (3 states)
- [ ] Polling active during processing states
- [ ] Polling stops at ready/published
- [ ] Status badges show correct labels

### Integration Tests

- [ ] Full pipeline executes: draft → research → skeleton → writing → creating_visuals → ready
- [ ] User can edit draft artifacts
- [ ] User can edit ready artifacts
- [ ] User can edit published artifacts (auto-reverts to ready)
- [ ] Soft-deleted artifacts excluded from queries
- [ ] No artifacts remain with old statuses

---

## Timeline

### Phase 1: Preparation (Week 1)

- [ ] Audit codebase for old status references
- [ ] Update backend services
- [ ] Update frontend components
- [ ] Write migration SQL scripts
- [ ] Update test suites

### Phase 2: Migration (Week 2)

- [ ] Run migration SQL on staging database
- [ ] Test full workflow on staging
- [ ] Fix any issues discovered
- [ ] Run migration SQL on production database
- [ ] Monitor error logs

### Phase 3: Cleanup (Week 3)

- [ ] Remove old approval endpoint routes
- [ ] Remove old status enum values (if possible)
- [ ] Update documentation
- [ ] Archive old code in git history

---

## Related Documentation

- [7-status-workflow-specification.md](./7-status-workflow-specification.md) - Complete new workflow specification
- [status-flow-reference.md](./status-flow-reference.md) - Detailed status reference
- [artifact-schema-and-workflow.md](../Architecture/database/artifact-schema-and-workflow.md) - Database schema

---

**Version History:**
- **1.0.0** (2026-01-26) - Initial migration guide
