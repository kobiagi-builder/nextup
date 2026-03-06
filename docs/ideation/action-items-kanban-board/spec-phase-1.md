# Implementation Spec: Action Items Kanban Board - Phase 1

**PRD**: ./prd-phase-1.md
**Estimated Effort**: L (Large)

## Technical Approach

The Kanban board builds on the existing action items infrastructure with three layers of change:

1. **Database**: Add `user_id` column (with `DEFAULT auth.uid()`) for direct ownership, make `customer_id` nullable, update RLS with compound policy, backfill existing data.
2. **Backend**: New top-level `/api/action-items` REST endpoints (GET, POST, PUT, DELETE) alongside existing customer-scoped routes. New `listAll()` service method. Update AI agent tools.
3. **Frontend**: New `/action-items` route with Kanban board using `@dnd-kit/core` for drag-and-drop. New React Query hooks with `queryClient.setQueryData()` optimistic updates and cross-view cache invalidation. Feature flag gating on route and sidebar nav.

The approach maximizes reuse: same `ActionItemForm` dialog (extended with optional customer selector), same type/status color maps, same card styling patterns. The new code is primarily the Kanban layout, drag-and-drop mechanics, and the cross-customer query layer.

## File Changes

### New Files

| File Path | Purpose |
|-----------|---------|
| `frontend/src/features/action-items/pages/ActionItemsBoardPage.tsx` | Kanban board page component |
| `frontend/src/features/action-items/components/KanbanBoard.tsx` | Board layout with 4 status columns + DndContext |
| `frontend/src/features/action-items/components/KanbanColumn.tsx` | Single column (droppable zone) |
| `frontend/src/features/action-items/components/KanbanCard.tsx` | Draggable action item card |
| `frontend/src/features/action-items/components/BoardToolbar.tsx` | Filter bar + Add Item button |
| `frontend/src/features/action-items/hooks/useActionItemsBoard.ts` | React Query hooks for board data (fetches via backend API) |
| `frontend/src/features/action-items/types.ts` | Board-specific types (re-exports shared types + ActionItemWithCustomer) |
| `backend/src/routes/action-items-board.ts` | Top-level action items routes |
| `backend/src/controllers/action-items-board.controller.ts` | Controller for board endpoints |

### Modified Files

| File Path | Changes |
|-----------|---------|
| `backend/src/services/ActionItemService.ts` | Add `listAll(userId, filters?)`, update `create()` to accept nullable customerId + required userId |
| `backend/src/types/customer.ts` | Update `ActionItem.customer_id` to `string \| null`, add `user_id: string` |
| `backend/src/routes/index.ts` | Mount new `/api/action-items` routes |
| `backend/src/services/ai/agents/customer-mgmt/tools/actionItemTools.ts` | Add `user_id` to insert operations (required after migration) |
| `backend/src/services/ai/agents/shared/customerContextBuilder.ts` | Audit: confirm query handles nullable `customer_id` correctly |
| `frontend/src/features/customers/types/customer.ts` | Update `ActionItem.customer_id` to `string \| null`, add `user_id: string`. Extract `STATUS_DOT_COLORS` to shared constants |
| `frontend/src/features/customers/components/action-items/ActionItemRow.tsx` | Add null check for `customer_id` (defensive) |
| `frontend/src/features/customers/components/action-items/ActionItemForm.tsx` | Make `customerId` prop optional. When undefined, show customer selector dropdown. When provided, lock to that customer (existing behavior) |
| `frontend/src/features/customers/hooks/useActionItems.ts` | No changes needed (customer-scoped hooks stay as-is) |
| `frontend/src/components/layout/Sidebar.tsx` | Add "Action Items" nav item gated by `action_items_kanban` feature flag |
| `frontend/src/App.tsx` | Add `/action-items` route with `FeatureGate` |
| `frontend/package.json` | Add `@dnd-kit/core`, `@dnd-kit/utilities` |
| `frontend/src/types/supabase.ts` | Regenerate after migration (`npx supabase gen types typescript`) |

## Data Model

### Schema Changes

```sql
-- Migration: add_user_id_and_nullable_customer_for_kanban

-- Step 1: Add user_id column with DEFAULT auth.uid() for self-populating inserts
ALTER TABLE customer_action_items
  ADD COLUMN user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id);

-- Step 2: Backfill user_id from customers table
UPDATE customer_action_items ai
SET user_id = c.user_id
FROM customers c
WHERE ai.customer_id = c.id;

-- Step 2b: Safety check — delete orphaned rows (should not exist due to CASCADE, but defensive)
DELETE FROM customer_action_items WHERE user_id IS NULL;

-- Step 3: Make user_id NOT NULL after backfill
ALTER TABLE customer_action_items
  ALTER COLUMN user_id SET NOT NULL;

-- Step 4: Make customer_id nullable
ALTER TABLE customer_action_items
  ALTER COLUMN customer_id DROP NOT NULL;

-- Step 5: Add composite index for cross-customer queries
-- (user_id, status) covers both filtered and unfiltered queries via leftmost prefix
CREATE INDEX idx_customer_action_items_user_status
  ON customer_action_items(user_id, status);

-- Step 6: Update RLS policies — compound check for ownership + customer validation
DROP POLICY IF EXISTS "Users can manage their own action items" ON customer_action_items;

CREATE POLICY "Users can manage their own action items"
  ON customer_action_items
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND (
      customer_id IS NULL
      OR is_customer_owner(customer_id)
    )
  );
```

**Key design decisions:**
- `DEFAULT auth.uid()` on `user_id` eliminates a class of bugs — any authenticated insert auto-populates ownership
- `WITH CHECK` validates that `customer_id` (when provided) belongs to the user, preventing cross-user customer association
- Single composite index `(user_id, status)` covers all query patterns (no separate `user_id` index needed)
- `updated_at` trigger continues to fire on drag-and-drop status changes (expected behavior)

## API Design

### New Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/action-items` | List all action items for authenticated user (with customer_name JOIN) |
| `POST` | `/api/action-items` | Create action item (optional customer_id) |
| `PUT` | `/api/action-items/:id` | Update action item (status, description, type, due_date, customer_id) |
| `DELETE` | `/api/action-items/:id` | Delete action item by ID |

### Request/Response Examples

```typescript
// GET /api/action-items?customer_id=uuid&status=todo,in_progress
// Response
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "customer_id": "uuid" | null,
      "type": "follow_up",
      "description": "Follow up on proposal",
      "due_date": "2026-03-10",
      "status": "todo",
      "created_at": "2026-03-01T00:00:00Z",
      "updated_at": "2026-03-01T00:00:00Z",
      "customer_name": "Acme Corp" | null  // joined from customers table
    }
  ]
}

// POST /api/action-items
{
  "type": "follow_up",
  "description": "Review quarterly report",
  "due_date": "2026-03-15",
  "customer_id": "uuid" | null  // optional
}

// PUT /api/action-items/:id
// Partial update — any combination of fields
{
  "status": "in_progress",         // drag-and-drop
  "customer_id": "uuid" | null,    // reassign customer
  "description": "Updated text",   // edit dialog
  "type": "meeting",               // edit dialog
  "due_date": "2026-03-20"         // edit dialog
}
```

### Update Validation Schema

```typescript
const updateActionItemBoardSchema = z.object({
  status: z.enum(['todo', 'in_progress', 'done', 'cancelled']).optional(),
  type: z.enum(['follow_up', 'proposal', 'meeting', 'delivery', 'review', 'custom']).optional(),
  description: z.string().min(1).optional(),
  due_date: z.string().nullable().optional(),
  customer_id: z.string().uuid().nullable().optional(),
});
```

## Implementation Details

### 1. Backend Service Extension

**Pattern to follow**: `backend/src/services/ActionItemService.ts`

```typescript
// New method for cross-customer listing
async listAll(userId: string, filters?: {
  customer_id?: string;
  status?: string[];
}): Promise<ActionItemWithCustomer[]> {
  let query = this.supabase
    .from('customer_action_items')
    .select('*, customers(name)')
    .eq('user_id', userId)
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (filters?.customer_id) {
    query = query.eq('customer_id', filters.customer_id);
  }
  if (filters?.status?.length) {
    query = query.in('status', filters.status);
  }

  const { data, error } = await query;
  if (error) throw error;

  return data.map(item => ({
    ...item,
    customer_name: item.customers?.name || null,
  }));
}

// Updated create — userId derived from auth context, customerId optional
async createForBoard(
  userId: string,
  input: CreateActionItemInput & { customer_id?: string | null }
): Promise<ActionItem> {
  const { data, error } = await this.supabase
    .from('customer_action_items')
    .insert({
      user_id: userId,
      customer_id: input.customer_id || null,
      type: input.type,
      description: input.description,
      due_date: input.due_date || null,
      status: input.status || 'todo',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

### 2. AI Agent Tools Update

**File**: `backend/src/services/ai/agents/customer-mgmt/tools/actionItemTools.ts`

The `createActionItemTools` function inserts directly into `customer_action_items`. After migration, `user_id` is required (though `DEFAULT auth.uid()` handles it when using an authenticated Supabase client). For safety, explicitly include `user_id` in the insert:

```typescript
// In the insert operation, add user_id from the auth context
// The Supabase client is already user-scoped, so auth.uid() will be set
// But explicit is better than implicit for agent tools
const { data, error } = await supabase
  .from('customer_action_items')
  .insert({
    customer_id: customerId,  // Always provided by agent (enforced in agent logic)
    // user_id is set by DEFAULT auth.uid() — no code change needed if using authenticated client
    // But if using service role client, must explicitly set user_id
    ...actionItemData,
  });
```

### 3. Frontend Query Architecture

**File**: `frontend/src/features/action-items/hooks/useActionItemsBoard.ts`

The board fetches via the **backend API** (not direct Supabase) because it needs the customer_name JOIN that the backend endpoint provides. This is a deliberate divergence from the customer-scoped hooks which use direct Supabase.

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { customerKeys } from '@/features/customers/hooks';

// Query keys — separate namespace from customer-scoped keys
export const boardActionItemKeys = {
  all: ['action-items', 'board'] as const,
  list: (filters?: BoardFilters) =>
    [...boardActionItemKeys.all, 'list', filters] as const,
};

// Fetch all items
export function useActionItemsBoard(filters?: BoardFilters) {
  const { session } = useAuth();
  return useQuery({
    queryKey: boardActionItemKeys.list(filters),
    queryFn: () => api.get('/api/action-items', {
      token: session?.access_token,
      params: filters,
    }),
    enabled: !!session,
  });
}

// Update mutation with React Query optimistic update (not useState)
export function useUpdateBoardActionItem() {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<ActionItem>) =>
      api.put(`/api/action-items/${id}`, { token: session?.access_token, body: data }),

    // Optimistic update via queryClient.setQueryData
    onMutate: async ({ id, ...data }) => {
      await queryClient.cancelQueries({ queryKey: boardActionItemKeys.all });
      const previousData = queryClient.getQueryData(boardActionItemKeys.list());

      queryClient.setQueryData(boardActionItemKeys.list(), (old: any) => ({
        ...old,
        data: old.data.map((item: any) =>
          item.id === id ? { ...item, ...data } : item
        ),
      }));

      return { previousData };
    },

    onError: (_err, _vars, context) => {
      // Revert on error
      if (context?.previousData) {
        queryClient.setQueryData(boardActionItemKeys.list(), context.previousData);
      }
      toast({ title: 'Failed to update action item', variant: 'destructive' });
    },

    onSettled: (_data, _err, variables) => {
      // Invalidate both board and customer-scoped caches
      queryClient.invalidateQueries({ queryKey: boardActionItemKeys.all });
      if (variables.customer_id) {
        queryClient.invalidateQueries({
          queryKey: [...customerKeys.detail(variables.customer_id), 'action_items'],
        });
      }
    },
  });
}
```

### 4. Drag-and-Drop Architecture

**Library**: `@dnd-kit/core` only (no `@dnd-kit/sortable` — not needed for column-to-column moves)

```typescript
// KanbanBoard.tsx
import {
  DndContext,
  DragOverlay,
  closestCenter,  // better for column targets than closestCorners
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';

const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: { distance: 5 },
  }),
  useSensor(KeyboardSensor)
);

const [activeItem, setActiveItem] = useState<ActionItemWithCustomer | null>(null);

function handleDragStart(event: DragStartEvent) {
  const item = items.find(i => i.id === event.active.id);
  setActiveItem(item || null);
}

function handleDragEnd(event: DragEndEvent) {
  setActiveItem(null);
  const { active, over } = event;
  if (!over) return;

  const itemId = active.id as string;
  const newStatus = over.id as ActionItemStatus;
  const item = items.find(i => i.id === itemId);

  if (item && item.status !== newStatus) {
    updateMutation.mutate({ id: itemId, status: newStatus });
    // Optimistic update handled by onMutate in the hook
  }
}

return (
  <DndContext
    sensors={sensors}
    collisionDetection={closestCenter}
    onDragStart={handleDragStart}
    onDragEnd={handleDragEnd}
  >
    <div className="flex gap-4 h-full">
      {STATUS_COLUMNS.map(status => (
        <KanbanColumn key={status} status={status} items={columnItems[status]} />
      ))}
    </div>
    <DragOverlay>
      {activeItem && <KanbanCard item={activeItem} isDragOverlay />}
    </DragOverlay>
  </DndContext>
);
```

### 5. ActionItemForm Extension

**File**: `frontend/src/features/customers/components/action-items/ActionItemForm.tsx`

No separate `BoardActionItemForm.tsx` — extend the existing form:

```typescript
interface ActionItemFormProps {
  customerId?: string | null  // undefined/null = show customer selector, string = locked
  actionItem?: ActionItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void  // callback for board to invalidate its queries
}

// Inside the form, conditionally render customer selector:
{customerId === undefined && (
  <div>
    <Label>Customer</Label>
    <Select
      value={form.watch('customer_id') || '__none__'}
      onValueChange={(val) => form.setValue('customer_id', val === '__none__' ? null : val)}
    >
      <SelectTrigger className="mt-1">
        <SelectValue placeholder="Select customer (optional)" />
      </SelectTrigger>
      <SelectContent data-portal-ignore-click-outside>
        <SelectItem value="__none__">General (no customer)</SelectItem>
        {customers.map(c => (
          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
)}
```

The customer list is fetched via the existing `useCustomers()` hook. When `action_items_kanban` is active without `customer_management`, the filter dropdown is hidden (no customers to show).

### 6. Board Container Height

The board needs a defined height for column scrolling to work:

```tsx
// ActionItemsBoardPage.tsx
<div className="flex flex-col h-[calc(100vh-var(--header-height,0px))]">
  <BoardToolbar ... />  {/* auto height */}
  <div className="flex-1 overflow-hidden px-6 pb-6">
    <KanbanBoard items={items} />  {/* fills remaining space */}
  </div>
</div>

// KanbanColumn.tsx — column body scrolls within the flex container
<div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
  {items.map(item => <KanbanCard key={item.id} item={item} />)}
</div>
```

---

## UX/UI Design Specification

### Design Intent

**Who is this human?** A 40-something fractional consultant at 8am, coffee in hand, opening NextUp to plan their day. They have 12 active customers, each with action items scattered across different stages. They need to see everything at once, triage quickly, and move items forward.

**What must they accomplish?** Scan all pending work across customers, identify what's overdue, reprioritize by dragging items between statuses, and add new tasks that come up during morning planning.

**What should it feel like?** A well-organized command center. Dense enough to show real information, calm enough to not overwhelm. Deep surfaces (`bg-background`, `bg-card`), quiet borders (`border-border/30`), cyan accents only on the active drag target and primary actions.

### Page Layout

```
+-----+------------------------------------------------------------+
|     |  Action Items              [All Customers v]  [+ Add Item] |
| N   |------------------------------------------------------------+
| U   |                                                            |
|     | +-- Todo (5) ---+ +- In Progress -+ +--- Done (8) --+ +-- |
| Port| |               | |     (3)       | |               | | Ca |
| Cust| | +----------+  | | +----------+  | | +----------+  | | +- |
| Act.| | | Card     |  | | | Card     |  | | | Card     |  | | |  |
| Itm | | +----------+  | | +----------+  | | +----------+  | | +- |
|     | |               | |               | |               | |    |
| --- | | +----------+  | | +----------+  | | +----------+  | |    |
| Prof| | | Card     |  | | | Card     |  | | | Card     |  | |    |
| Sett| | +----------+  | | +----------+  | | +----------+  | |    |
|     | +---------------+ +---------------+ +---------------+ +----+
+-----+------------------------------------------------------------+
```

### Component Hierarchy

```
ActionItemsBoardPage
+-- BoardToolbar
|   +-- Page title: "Action Items"
|   +-- CustomerFilterSelect (shadcn Select, uses useCustomers())
|   +-- AddItemButton (Button + onClick -> ActionItemForm)
+-- KanbanBoard (DndContext wrapper)
|   +-- KanbanColumn (status="todo")
|   |   +-- ColumnHeader (title + count badge)
|   |   +-- KanbanCard[] (draggable, useDroppable on column)
|   +-- KanbanColumn (status="in_progress")
|   +-- KanbanColumn (status="done")
|   +-- KanbanColumn (status="cancelled")
+-- DragOverlay -> KanbanCard (ghost preview)
+-- ActionItemForm (extended Dialog - create/edit with optional customer)
+-- EmptyBoardState (when no items exist)
```

### Toolbar Design

```
+------------------------------------------------------------+
|  Action Items              [All Customers v]  [+ Add Item] |
+------------------------------------------------------------+
```

- **Title**: "Action Items" -- `text-xl font-semibold text-foreground`
- **Customer filter**: shadcn `Select`, `w-48`. Options: "All Customers" + alphabetical list. Hidden when `customer_management` flag is disabled.
- **Add Item**: `Button` with `Plus` icon, primary variant
- **Layout**: `flex items-center justify-between` with `py-4 px-6`
- **Sticky**: `sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border/50`

### Column Design

**Column container**:
- `flex-1 min-w-[260px] max-w-[340px]`
- `bg-muted/30 rounded-xl border border-border/30`
- `flex flex-col` -- fills available height from parent
- Columns share horizontal space equally via `flex-1`

**Column header**:
- `px-3 py-2.5 flex items-center justify-between`
- Status dot: `w-2 h-2 rounded-full` (gray/blue/green/red per status)
- Title: `text-sm font-medium text-foreground` with `gap-2` from dot
- Count: `text-xs text-muted-foreground bg-muted rounded-full px-1.5 py-0.5 min-w-[20px] text-center`

**Column body** (scrollable):
- `flex-1 overflow-y-auto px-2 pb-2 space-y-2`

**Drop zone indicator** (when dragging over):
- `ring-2 ring-primary/30 bg-primary/5` -- subtle cyan glow
- Transition: `transition-all duration-150`

**Column status colors**:

| Status | Dot Color | Header subtle bg |
|--------|-----------|------------------|
| Todo | `bg-gray-500` | none (default) |
| In Progress | `bg-blue-500` | `bg-blue-500/5` |
| Done | `bg-green-500` | `bg-green-500/5` |
| Cancelled | `bg-orange-500` | `bg-orange-500/5` |

Note: Cancelled uses orange (not red) to differentiate from overdue items which use `destructive` (red).

### Card Design (KanbanCard)

```
+----------------------------+
| Follow Up    (cal) Mar 10  |  <- Type badge + due date
|                            |
| Review proposal terms      |  <- Description (2 lines max)
| and send feedback...       |
|                            |
| (users) Acme Corp         |  <- Customer name
+----------------------------+
```

**Card anatomy**:

```tsx
<div className={cn(
  'rounded-lg border bg-card p-3 cursor-grab active:cursor-grabbing',
  'hover:border-border transition-colors',
  isOverdue ? 'border-destructive/50' : 'border-border/50'
)}>
  {/* Row 1: Type badge + Due date */}
  <div className="flex items-center justify-between gap-2 mb-2">
    <span className={cn('text-[11px] font-medium rounded-full border px-1.5 py-0.5', typeColor)}>
      {typeLabel}
    </span>
    {due_date && (
      <span className={cn('text-[11px] flex items-center gap-1', urgencyClass)}>
        <Calendar className="h-3 w-3" />
        {isOverdue ? 'Overdue: ' : ''}{formatDueDate(due_date)}
      </span>
    )}
  </div>

  {/* Row 2: Description */}
  <p className="text-sm text-foreground line-clamp-2 mb-2">{description}</p>

  {/* Row 3: Customer */}
  <div className="flex items-center gap-1.5">
    <Users className="h-3 w-3 text-muted-foreground" />
    <span className="text-xs text-muted-foreground truncate">
      {customer_name || 'General'}
    </span>
  </div>
</div>
```

**Card states**:

| State | Visual |
|-------|--------|
| Default | `bg-card border-border/50` |
| Hover | `border-border` (slightly more visible) |
| Overdue | `border-destructive/50` + due date text in `text-destructive` |
| Dragging (source) | `opacity-40` (ghost in original position) |
| Drag overlay | `shadow-lg rotate-[2deg] scale-[1.02] ring-2 ring-primary/20` (lifted) |
| Focused (keyboard) | `ring-2 ring-ring` (standard focus ring) |

**Card sizing**:
- `min-h-[88px]` for visual rhythm
- Padding: `p-3` (12px)
- Gap between rows: `mb-2`

### Drag-and-Drop Visual Feedback

**During drag**:
1. Source card: `opacity-40` (faded in place)
2. Drag overlay: Card with `shadow-lg rotate-[2deg] scale-[1.02]` (slight tilt + lift)
3. Target column: `ring-2 ring-primary/30 bg-primary/5` (cyan highlight)
4. Non-target columns: unchanged

**On drop**:
1. Card appears in new column instantly (optimistic)
2. Column counts update immediately
3. Source ghost disappears

**Keyboard flow**:
1. `Tab` to focus card
2. `Space`/`Enter` to pick up
3. `Arrow Left/Right` to move between columns
4. `Space`/`Enter` to drop
5. `Escape` to cancel

### Empty States

**Empty board** (no items):
- Centered vertically and horizontally in board area
- `ListChecks` icon, `h-12 w-12 text-muted-foreground/50`
- "No action items yet" -- `text-lg font-medium`
- "Create your first action item to start tracking your work" -- `text-sm text-muted-foreground`
- `[+ Create Action Item]` button, primary variant

**Empty column**:
- `"No items"` -- `text-xs text-muted-foreground/60 text-center py-8`

**Empty filter results**:
- `"No action items for [Customer Name]"` centered
- `[Clear Filter]` ghost button below

### Loading Skeleton

- 4 skeleton columns with `animate-pulse`
- Column headers: skeleton bar for title + count badge
- Cards: 3 skeleton blocks (type+date row, description, customer row)
- Vary card count per column (3, 2, 2, 1) for natural feel

### Responsive Behavior

- **Desktop (1024px+)**: 4 columns side by side, equal `flex-1`
- **Tablet (768-1023px)**: Horizontal scroll, each column `min-w-[260px]`
- **Mobile (<768px)**: Horizontal scroll with snap points, not primary target

---

## Feature Flag Setup

### Migration SQL

```sql
-- Create feature flag
INSERT INTO feature_flags (name, description, default_state)
VALUES (
  'action_items_kanban',
  'Enables the Action Items Kanban Board screen and sidebar navigation',
  false
);

-- Enable for all accounts that have customer_management enabled
INSERT INTO customer_features (uid, feature_id, flag_state)
SELECT
  cf.uid,
  ff_new.id,
  true
FROM customer_features cf
JOIN feature_flags ff_existing ON cf.feature_id = ff_existing.id
JOIN feature_flags ff_new ON ff_new.name = 'action_items_kanban'
WHERE ff_existing.name = 'customer_management'
  AND cf.flag_state = true
ON CONFLICT (uid, feature_id) DO NOTHING;
```

### Sidebar Integration

```typescript
// In Sidebar.tsx
import { ListChecks } from 'lucide-react';

const actionItemsNavItem: NavItem = {
  icon: ListChecks,
  label: 'Action Items',
  href: '/action-items',
};

// In component body:
const { isEnabled: hasActionItemsKanban } = useFeatureFlag('action_items_kanban');

const mainNavItems = [
  ...baseNavItems,
  ...(hasCustomers ? [customerNavItem] : []),
  ...(hasActionItemsKanban ? [actionItemsNavItem] : []),
];
```

### Route Integration

```tsx
// In App.tsx
<Route
  path="/action-items"
  element={
    <FeatureGate feature="action_items_kanban">
      <ActionItemsBoardPage />
    </FeatureGate>
  }
/>
```

## Testing Requirements

### Unit Tests

| Test File | Coverage |
|-----------|----------|
| `frontend/src/features/action-items/__tests__/KanbanBoard.test.tsx` | Board rendering, column grouping, card distribution by status |
| `frontend/src/features/action-items/__tests__/KanbanCard.test.tsx` | Card display, overdue styling, null customer_id -> "General", click handler |
| `frontend/src/features/action-items/__tests__/BoardToolbar.test.tsx` | Filter selection, add button click |
| `backend/src/__tests__/services/ActionItemService.listAll.test.ts` | Cross-customer query, filters, null customer_id items |

**Key test cases**:
- Cards grouped correctly into status columns
- Overdue items show destructive styling
- Items with null customer_id show "General"
- Filter by customer shows only matching items
- Empty board state renders when no items
- Empty column renders "No items" placeholder
- Column sort: due_date asc (nulls last), then created_at desc

### Integration Tests

| Test File | Coverage |
|-----------|----------|
| `backend/src/__tests__/routes/action-items-board.test.ts` | CRUD endpoints, auth, RLS enforcement |

**Key scenarios**:
- GET returns items across multiple customers + customerless items
- POST creates item with null customer_id, user_id set automatically
- POST with customer_id belonging to another user is rejected by RLS
- PUT updates status (simulates drag-and-drop)
- PUT updates customer_id (reassignment)
- DELETE removes item
- Unauthenticated requests return 401
- User A cannot see/modify User B's items (RLS)

### Manual Testing

- [ ] Navigate to /action-items -- board loads with all items in correct columns
- [ ] Drag card from Todo to In Progress -- status updates, card moves instantly
- [ ] Disconnect network, drag card -- reverts with error toast
- [ ] Filter by customer -- only that customer's items shown
- [ ] Clear filter -- all items return
- [ ] Add item without customer -- appears in Todo as "General"
- [ ] Add item with customer -- appears with customer name
- [ ] Click card -- edit dialog opens with current values
- [ ] Change customer in edit dialog -- card updates with new customer name
- [ ] Overdue item -- red border and "Overdue:" prefix visible
- [ ] Keyboard: Tab to card, Space to pick up, Arrow to move, Space to drop
- [ ] Disable feature flag -- sidebar item and route disappear
- [ ] Customer Detail action items tab still works independently
- [ ] AI agent creates action item -- appears on board with customer name

## Error Handling

| Error Scenario | Handling Strategy |
|----------------|-------------------|
| Board data fetch fails | Error toast + retry button in empty state area |
| Drag-and-drop status update fails | Revert via `onError` in React Query mutation + destructive toast |
| Create item fails | Toast "Failed to create action item" + keep dialog open |
| Update item fails (edit dialog) | Toast "Failed to update" + keep dialog open |
| Delete item fails | Toast "Failed to delete action item" |
| Feature flag check fails | Default to hidden (fail closed) |
| Customer list fetch fails | Filter dropdown shows only "All Customers" |

## Validation Commands

```bash
# Type checking
cd frontend && npx tsc --noEmit

# Build
cd frontend && npm run build
cd backend && npm run build

# Unit tests
cd frontend && npm run test

# Integration tests
cd backend && npm run test

# Full build (both)
npm run build

# Regenerate Supabase types after migration
npx supabase gen types typescript --project-id ohwubfmipnpguunryopl > frontend/src/types/supabase.ts
```

## Rollout Considerations

- **Feature flag**: `action_items_kanban` with `default_state = false`
- **Monitoring**: Watch for errors in action-items-board controller logs
- **Rollback plan**: Disable flag (`UPDATE feature_flags SET default_state = false WHERE name = 'action_items_kanban'`). Sidebar item and route disappear immediately. No data loss.
- **Data safety**: `customer_id` nullable + `user_id` column are backward-compatible. Existing items retain all data. Customer-scoped endpoints and AI agent tools continue to function.

---

*This spec is ready for implementation. Follow the patterns and validate at each step.*
