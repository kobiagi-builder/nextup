# Implementation Spec: Action Item Execution - Phase 2

**PRD**: ./prd-phase-2.md
**Estimated Effort**: M (Medium)

## Technical Approach

Phase 2 adds result visibility and execution state management on top of Phase 1's working execute flow.

**Database**: Two nullable columns (`document_id`, `execution_summary`) are added to `customer_action_items` via a Supabase migration. These are backwards-compatible — existing rows get NULL values.

**Backend**: The `executeActionItem` tool is extended to update the action item with `document_id` and `execution_summary` after successful execution. The existing document creation tools already return `documentId` — the execute tool chains this into an action item update.

**Frontend**: `ActionItemRow` and `KanbanCard` display document links and execution summaries on completed items. A Zustand store slice tracks which action item is currently executing, enabling the "one at a time" lock and loading animations.

## File Changes

### New Files

| File Path | Purpose |
|-----------|---------|
| `frontend/src/stores/executionStore.ts` | Zustand store slice tracking current execution state (executing item ID, customer ID) |

### Modified Files

| File Path | Changes |
|-----------|---------|
| `frontend/src/features/customers/components/action-items/ActionItemRow.tsx` | Add document link, execution summary display, loading animation |
| `frontend/src/features/action-items/components/KanbanCard.tsx` | Add document icon + title on done cards, loading animation |
| `frontend/src/features/customers/hooks/useExecuteActionItem.ts` | Integrate with execution store for lock management |
| `frontend/src/features/customers/types/index.ts` | Extend ActionItem type with `document_id` and `execution_summary` |
| `frontend/src/features/action-items/types/index.ts` | Extend ActionItemWithCustomer type similarly |
| `backend/src/services/ai/agents/customer-mgmt/tools/executeActionItemTool.ts` | Add post-execution update for document_id and execution_summary |
| `backend/src/types/customer.ts` | Add `document_id` and `execution_summary` to ActionItem type |

## UX & UI Design

### Document Link on ActionItemRow (Done Items)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [Enhancement]  Fix competitor pricing table for Q2...      📅 Mar 25  [Done] [⋯] │
│                 Reported by Sarah                                                   │
│                 📄 Competitor Pricing Analysis Q2 2026                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Visual treatment**: A small `FileText` icon + document title link, displayed below the reported-by line. Uses `text-primary hover:underline` styling. Only shown when `document_id` is present.

```tsx
{item.status === 'done' && item.document_id && (
  <button
    onClick={(e) => {
      e.stopPropagation()
      navigate(`/customers/${customerId}/documents/${item.document_id}`)
    }}
    className="flex items-center gap-1.5 text-xs text-primary hover:underline mt-1"
  >
    <FileText className="h-3 w-3" />
    <span className="truncate">{item.document_title || 'View Document'}</span>
  </button>
)}
```

### Document Icon on KanbanCard (Done Column)

```
┌─────────────────────────────┐
│ [Enhancement]      📅 Mar 25 │
│ Fix competitor pricing       │
│ table for Q2 review...       │
│ Reported by Sarah            │
│ 👥 Acme Corp          📄    │
└─────────────────────────────┘
```

**Visual treatment**: Small `FileText` icon in the bottom-right corner, `text-primary` color. Clicking navigates to the document.

### Execution Loading Animation (ActionItemRow)

When an action item is actively executing:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [Enhancement]  Fix competitor pricing table for Q2...      📅 Mar 25       │
│                 Reported by Sarah                           ⚡ Executing... │
│                 ░░░░░░░░░░░░░░ (subtle pulse border)                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Visual treatment**: The card gets a subtle pulsing `border-primary/30` animation. The status area shows a pulsing Zap icon with "Executing..." text replacing the status badge.

```tsx
// Card border animation during execution
className={cn(
  'group rounded-lg border bg-card p-5 transition-colors',
  isExecutingThis && 'border-primary/30 animate-pulse',
  isOverdue && !isExecutingThis ? 'border-destructive/50' : 'border-border/50'
)}

// Status area replacement during execution
{isExecutingThis ? (
  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary animate-pulse">
    <Zap className="h-3 w-3" />
    Executing...
  </span>
) : (
  // existing status badge dropdown
)}
```

### Execution Summary (Collapsible on Done Items)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [Enhancement]  Fix competitor pricing table for Q2...      📅 Mar 25 [Done] [⋯]  │
│                 Reported by Sarah                                                   │
│                 📄 Competitor Pricing Analysis Q2 2026                               │
│                 ▸ Execution summary                                                 │
│  ┌──────────────────────────────────────────────────────────────────────┐           │
│  │ Researched 5 competitors' Q2 pricing. Created analysis document     │           │
│  │ with pricing matrix and 3 recommended adjustments. Updated          │           │
│  │ customer ICP with competitive positioning data.                     │           │
│  └──────────────────────────────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Visual treatment**: A collapsible `▸ Execution summary` / `▾ Execution summary` toggle below the document link. Expanded section shows a `text-xs text-muted-foreground bg-muted/50 rounded p-2` block.

## Implementation Details

### 1. Database Migration

**Overview**: Add two nullable columns to `customer_action_items`.

```sql
-- Migration: add_execution_result_fields
ALTER TABLE customer_action_items
  ADD COLUMN document_id UUID REFERENCES customer_documents(id) ON DELETE SET NULL,
  ADD COLUMN execution_summary TEXT;

-- Index for document lookup
CREATE INDEX idx_action_items_document_id ON customer_action_items(document_id) WHERE document_id IS NOT NULL;
```

**Key decisions**:
- `ON DELETE SET NULL` — if a document is deleted, the action item doesn't break
- Partial index on `document_id` — only indexes non-null values, no overhead for items without documents
- No RLS changes needed — existing policies cover new columns (same table)

### 2. Execution Store (Frontend)

**Pattern to follow**: `frontend/src/stores/filterStore.ts`

**Overview**: Zustand store tracking which action item is currently executing.

```typescript
import { create } from 'zustand'

interface ExecutionState {
  executingItemId: string | null
  executingCustomerId: string | null
  startExecution: (itemId: string, customerId: string) => void
  endExecution: () => void
  isExecuting: boolean
}

export const useExecutionStore = create<ExecutionState>((set, get) => ({
  executingItemId: null,
  executingCustomerId: null,
  get isExecuting() { return get().executingItemId !== null },
  startExecution: (itemId, customerId) => set({ executingItemId: itemId, executingCustomerId: customerId }),
  endExecution: () => set({ executingItemId: null, executingCustomerId: null }),
}))
```

**Key decisions**:
- No persistence (no `persist` middleware) — execution state is session-only
- The store is consumed by both ActionItemRow and KanbanCard to determine disabled state
- `endExecution` is called when the action item's status changes away from `in_progress` (detected via React Query cache update)

### 3. executeActionItem Tool Update (Backend)

**Overview**: After the agent completes execution, the tool provides a `completeExecution` function that updates the action item with results.

```typescript
// New helper added to the tool
async function completeExecution(
  actionItemId: string,
  result: { documentId?: string; executionSummary?: string }
) {
  const update: Record<string, unknown> = { status: 'done' }
  if (result.documentId) update.document_id = result.documentId
  if (result.executionSummary) update.execution_summary = result.executionSummary

  await supabase
    .from('customer_action_items')
    .update(update)
    .eq('id', actionItemId)
}
```

**Alternative approach**: Instead of a separate function, update the `updateActionItemStatus` tool to accept optional `document_id` and `execution_summary` parameters when setting status to `done`. This is cleaner since the agent already calls `updateActionItemStatus` at the end of execution.

### 4. ActionItem Type Extensions

```typescript
// Add to ActionItem type
interface ActionItem {
  // ... existing fields
  document_id: string | null
  execution_summary: string | null
}
```

### 5. Query Updates

The existing `useActionItems` query fetches `*` from `customer_action_items`, so the new columns will be included automatically. For the document title, we need a join:

```typescript
// Update the query to join document title
const { data } = await supabase
  .from('customer_action_items')
  .select('*, document:customer_documents(title)')
  .eq('customer_id', customerId)
  .order('due_date', { ascending: true, nullsFirst: false })
```

## Testing Requirements

### Unit Tests

| Test File | Coverage |
|-----------|----------|
| `frontend/src/stores/__tests__/executionStore.test.ts` | Store state management: start, end, concurrent lock |

**Key test cases**:
- `startExecution` sets itemId and customerId
- `endExecution` clears state
- `isExecuting` returns true when executing, false otherwise
- Cannot start a second execution while one is running

### Manual Testing

- [ ] Execute an action item that creates a document — document link appears on the completed card
- [ ] Click the document link — navigates to the document view
- [ ] During execution, the card shows pulsing border and "Executing..." indicator
- [ ] During execution, other todo items' Execute buttons are disabled
- [ ] After execution completes, the loading state clears and other Execute buttons re-enable
- [ ] Execution summary displays as collapsible section on done items
- [ ] Items without execution results (manually completed) show no document link or summary
- [ ] Dark mode and light mode rendering of all new elements

## Error Handling

| Error Scenario | Handling Strategy |
|----------------|-------------------|
| Document referenced by `document_id` was deleted | `ON DELETE SET NULL` handles this at DB level. UI shows no link. |
| Execution store out of sync (item done but store still shows executing) | Listen for React Query cache updates on action item status. Clear store on status change. |
| Migration fails on existing data | Migration only adds nullable columns — no data transformation, no risk |

## Validation Commands

```bash
# Type checking
cd frontend && npx tsc --noEmit
cd backend && npx tsc --noEmit

# Build
npm run build

# Run tests
npm run test

# Apply migration (via MCP)
mcp__supabase__apply_migration({
  project_id: "ohwubfmipnpguunryopl",
  name: "add_execution_result_fields",
  query: "ALTER TABLE customer_action_items ADD COLUMN document_id UUID REFERENCES customer_documents(id) ON DELETE SET NULL, ADD COLUMN execution_summary TEXT; CREATE INDEX idx_action_items_document_id ON customer_action_items(document_id) WHERE document_id IS NOT NULL;"
})
```

## Rollout Considerations

- **Feature flag**: None
- **Migration**: Backwards-compatible (nullable columns only). No data migration needed.
- **Monitoring**: Track document_id population rate on completed action items
- **Rollback plan**: Remove UI elements showing document link and summary. Columns remain in DB (harmless).

---

*This spec is ready for implementation. Follow the patterns and validate at each step.*
