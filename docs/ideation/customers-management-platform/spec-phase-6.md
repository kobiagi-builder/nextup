# Implementation Spec: Customers Management Platform - Phase 6

**PRD**: ./prd-phase-6.md
**Estimated Effort**: M (Medium)

## Technical Approach

This phase follows the exact patterns established in Phases 1-5 for the Customers Management Platform. Every layer (database, backend service, controller, routes, frontend hooks, types, and components) mirrors the Agreements implementation since both are flat entity lists under a customer with CRUD operations, type/status badges, and dialog-based forms.

The AI agent integration follows the existing `customerMgmtTools.ts` pattern - factory functions that accept an injected Supabase client. The context builder update is additive: a new section appended to the customer context string.

Key decisions:
- **Table name**: `customer_action_items` (consistent with `customer_agreements`, `customer_receivables`)
- **RLS strategy**: Same `is_customer_owner` helper function used by all customer sub-tables
- **Frontend reads**: Direct Supabase queries (RLS-enforced), consistent with useAgreements
- **Frontend mutations**: Backend API calls, consistent with useAgreements
- **Sort/filter**: Client-side for simplicity (action item counts per customer will be small). Server-side sort param supported in API for agent tool use.

## File Changes

### New Files

| File Path | Purpose |
|-----------|---------|
| `backend/src/db/migrations/013_customer_action_items.sql` | Create table, indexes, RLS policies |
| `backend/src/services/ActionItemService.ts` | Business logic for action item CRUD |
| `backend/src/controllers/action-item.controller.ts` | Express request handlers with Zod validation |
| `backend/src/routes/action-items.ts` | Router nested under `/api/customers/:id/action-items` |
| `backend/src/services/ai/tools/actionItemTools.ts` | Agent tools for action item management |
| `frontend/src/features/customers/hooks/useActionItems.ts` | TanStack Query hooks for CRUD |
| `frontend/src/features/customers/components/action-items/ActionItemsTab.tsx` | Tab content with list, sort, filter |
| `frontend/src/features/customers/components/action-items/ActionItemRow.tsx` | Individual action item display row |
| `frontend/src/features/customers/components/action-items/ActionItemForm.tsx` | Create/edit dialog form |
| `frontend/src/features/customers/components/action-items/index.ts` | Barrel export |

### Modified Files

| File Path | Changes |
|-----------|---------|
| `frontend/src/features/customers/types/customer.ts` | Add ActionItem types, statuses, colors, labels; update CustomerTab and CustomerWithCounts |
| `frontend/src/features/customers/pages/CustomerDetailPage.tsx` | Add "Action Items" tab trigger and content |
| `frontend/src/features/customers/hooks/index.ts` | Re-export useActionItems hooks |
| `frontend/src/features/customers/components/index.ts` | Re-export action-items components |
| `backend/src/routes/customers.ts` | Mount actionItemsRouter under `/:id/action-items` |
| `backend/src/types/customer.ts` | Add ActionItem backend types |
| `backend/src/services/CustomerService.ts` | Add `action_items_count` query to `getById()` Promise.all |
| `backend/src/controllers/customer-ai.controller.ts` | Import `createActionItemTools`, spread into `buildAgentTools()` for `customer_mgmt` agent |
| `backend/src/services/ai/prompts/customerContextBuilder.ts` | Add action items fetch, section in context output, and progressive truncation |

## Implementation Details

### 1. Database Migration

**Pattern to follow**: `backend/src/db/migrations/010_customers_schema.sql`

```sql
CREATE TABLE customer_action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'follow_up',
  description TEXT NOT NULL,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'todo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_customer_action_items_customer_status
  ON customer_action_items(customer_id, status);
CREATE INDEX idx_customer_action_items_customer_due_date
  ON customer_action_items(customer_id, due_date);

-- Updated_at trigger
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON customer_action_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE customer_action_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own customer action items"
  ON customer_action_items
  FOR ALL
  USING (is_customer_owner(customer_id))
  WITH CHECK (is_customer_owner(customer_id));
```

**Implementation steps**:
1. Create migration file `013_customer_action_items.sql`
2. Apply via `mcp__supabase__apply_migration`
3. Verify with `mcp__supabase__list_tables`

### 2. Backend Types

**Pattern to follow**: `backend/src/types/customer.ts`

```typescript
// Add to existing backend types file
export interface ActionItem {
  id: string
  customer_id: string
  type: string
  description: string
  due_date: string | null
  status: string
  created_at: string
  updated_at: string
}

export interface CreateActionItemInput {
  type?: string
  description: string
  due_date?: string | null
  status?: string
}

export interface UpdateActionItemInput {
  type?: string
  description?: string
  due_date?: string | null
  status?: string
}
```

### 3. ActionItemService

**Pattern to follow**: `backend/src/services/AgreementService.ts`

```typescript
export class ActionItemService {
  constructor(private supabase: SupabaseClient) {}

  async list(customerId: string, filters?: { status?: string; type?: string; sort?: string }): Promise<ActionItem[]>
  async create(customerId: string, input: CreateActionItemInput): Promise<ActionItem>
  async update(id: string, input: UpdateActionItemInput): Promise<ActionItem>
  async delete(id: string): Promise<void>
}
```

**Key decisions**:
- `list()` supports optional `status`, `type` filter params and `sort` param (default: `due_date` asc, null dates last)
- Mirrors AgreementService constructor pattern (injected Supabase client)
- Logger uses `[ActionItemService]` prefix

**Implementation steps**:
1. Create `ActionItemService.ts` following AgreementService structure
2. Implement list with optional filters and sort
3. Implement create with defaults (type: 'follow_up', status: 'todo')
4. Implement update (partial update pattern)
5. Implement delete (hard delete)

### 4. Action Item Controller

**Pattern to follow**: `backend/src/controllers/agreement.controller.ts`

```typescript
// Zod schemas
const createActionItemSchema = z.object({
  type: z.enum(['follow_up', 'proposal', 'meeting', 'delivery', 'review', 'custom']).optional(),
  description: z.string().min(1, 'Description is required'),
  due_date: z.string().nullable().optional(),
  status: z.enum(['todo', 'in_progress', 'done', 'cancelled']).optional(),
})

const updateActionItemSchema = z.object({
  type: z.enum(['follow_up', 'proposal', 'meeting', 'delivery', 'review', 'custom']).optional(),
  description: z.string().min(1).optional(),
  due_date: z.string().nullable().optional(),
  status: z.enum(['todo', 'in_progress', 'done', 'cancelled']).optional(),
})

// Handlers: listActionItems, createActionItem, updateActionItem, deleteActionItem
```

**Implementation steps**:
1. Create controller with Zod validation schemas
2. Implement 4 handlers matching agreement controller pattern
3. List handler reads query params: `?status=todo&type=follow_up&sort=due_date`

### 5. Action Item Routes

**Pattern to follow**: `backend/src/routes/agreements.ts`

```typescript
import { Router } from 'express'
import * as actionItemController from '../controllers/action-item.controller.js'

export const actionItemsRouter = Router({ mergeParams: true })

actionItemsRouter.get('/', actionItemController.listActionItems)
actionItemsRouter.post('/', actionItemController.createActionItem)
actionItemsRouter.put('/:actionItemId', actionItemController.updateActionItem)
actionItemsRouter.delete('/:actionItemId', actionItemController.deleteActionItem)
```

**Mount in `customers.ts`**:
```typescript
import { actionItemsRouter } from './action-items.js'
// ...
router.use('/:id/action-items', actionItemsRouter)
```

### 6. Frontend Types

**Pattern to follow**: `frontend/src/features/customers/types/customer.ts`

```typescript
// Action Item Types
export type ActionItemType = 'follow_up' | 'proposal' | 'meeting' | 'delivery' | 'review' | 'custom'

export const ACTION_ITEM_TYPES: ActionItemType[] = [
  'follow_up', 'proposal', 'meeting', 'delivery', 'review', 'custom',
]

export const ACTION_ITEM_TYPE_LABELS: Record<ActionItemType, string> = {
  follow_up: 'Follow-up',
  proposal: 'Proposal',
  meeting: 'Meeting',
  delivery: 'Delivery',
  review: 'Review',
  custom: 'Custom',
}

export const ACTION_ITEM_TYPE_COLORS: Record<ActionItemType, string> = {
  follow_up: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  proposal: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  meeting: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  delivery: 'bg-green-500/10 text-green-400 border-green-500/20',
  review: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  custom: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
}

// Action Item Status
export type ActionItemStatus = 'todo' | 'in_progress' | 'done' | 'cancelled'

export const ACTION_ITEM_STATUSES: ActionItemStatus[] = [
  'todo', 'in_progress', 'done', 'cancelled',
]

export const ACTION_ITEM_STATUS_LABELS: Record<ActionItemStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
  cancelled: 'Cancelled',
}

export const ACTION_ITEM_STATUS_COLORS: Record<ActionItemStatus, string> = {
  todo: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  in_progress: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  done: 'bg-green-500/10 text-green-400 border-green-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
}

// Entity
export interface ActionItem {
  id: string
  customer_id: string
  type: ActionItemType
  description: string
  due_date: string | null
  status: ActionItemStatus
  created_at: string
  updated_at: string
}

export interface CreateActionItemInput {
  type?: ActionItemType
  description: string
  due_date?: string | null
  status?: ActionItemStatus
}

export interface UpdateActionItemInput {
  type?: ActionItemType
  description?: string
  due_date?: string | null
  status?: ActionItemStatus
}

// Update CustomerTab
export type CustomerTab = 'overview' | 'agreements' | 'receivables' | 'projects' | 'action_items'

// Update CustomerWithCounts
export interface CustomerWithCounts extends Customer {
  agreements_count: number
  receivables_count: number
  projects_count: number
  action_items_count: number
}
```

### 7. useActionItems Hook

**Pattern to follow**: `frontend/src/features/customers/hooks/useAgreements.ts`

```typescript
export const actionItemKeys = {
  all: (customerId: string) => [...customerKeys.detail(customerId), 'actionItems'] as const,
  list: (customerId: string) => [...actionItemKeys.all(customerId), 'list'] as const,
}

export function useActionItems(customerId: string | null) {
  // Supabase direct query with RLS, ordered by due_date asc nulls last
}

export function useCreateActionItem(customerId: string) {
  // POST to /api/customers/:id/action-items, invalidate queries
}

export function useUpdateActionItem(customerId: string) {
  // PUT to /api/customers/:id/action-items/:id, invalidate queries
}

export function useDeleteActionItem(customerId: string) {
  // DELETE /api/customers/:id/action-items/:id, invalidate queries
}
```

### 8. ActionItemsTab Component

**Pattern to follow**: `frontend/src/features/customers/components/agreements/AgreementsTab.tsx`

**Overview**: Tab content showing action items list with header (count + filters + add button), filter controls, sorted list, and empty state.

```typescript
interface ActionItemsTabProps {
  customerId: string
}

export function ActionItemsTab({ customerId }: ActionItemsTabProps) {
  // State: formOpen, editingItem, statusFilter, typeFilter, sortBy
  // Hooks: useActionItems, useDeleteActionItem, useUpdateActionItem
  // Filter/sort: client-side from cached data
  // Render: header with filters + add button, then list or empty state
}
```

**Key decisions**:
- Filters as inline Select dropdowns in the header area (status, type)
- Sort toggle button (due date / created date)
- Client-side filtering for simplicity (action items per customer will be <100)

**Implementation steps**:
1. Create ActionItemsTab with header, filter state, add button
2. Implement client-side filter/sort logic
3. Map filtered items to ActionItemRow components
4. Add empty state and loading skeleton
5. Include ActionItemForm dialog

### 9. ActionItemRow Component

**Pattern to follow**: `frontend/src/features/customers/components/agreements/AgreementCard.tsx`

**Overview**: Displays a single action item as a card/row with type badge, description, due date, status badge, and actions menu.

```typescript
interface ActionItemRowProps {
  item: ActionItem
  onEdit: (item: ActionItem) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: ActionItemStatus) => void
  isDeleting?: boolean
}
```

**Key decisions**:
- Status badge is clickable (opens inline dropdown for quick status change)
- Overdue items: if `due_date < today` and status is `todo` or `in_progress`, apply `border-destructive/50` highlight
- Actions menu: Edit, Delete (with confirmation dialog)
- Due date formatted as relative ("Tomorrow", "2 days ago", "Mar 15") using existing date utils or simple formatting

### 10. ActionItemForm Component

**Pattern to follow**: `frontend/src/features/customers/components/agreements/AgreementForm.tsx`

**Overview**: Dialog form for creating/editing action items.

Fields:
- **Type**: Select dropdown (default: follow_up)
- **Description**: Text input (required)
- **Due Date**: Date picker (optional)
- **Status**: Select dropdown (default: todo, shown only in edit mode)

**Key decisions**:
- Uses shadcn Dialog, Select, Input, and date picker components
- Pre-populates when editing (item prop passed)
- `data-portal-ignore-click-outside` on Dialog content

### 11. Agent Tools

**Pattern to follow**: `backend/src/services/ai/tools/customerMgmtTools.ts`

**IMPORTANT**: The factory function accepts `customerId` as a parameter and binds it into closures. The LLM never supplies `customerId` — it is already known from the request context. This matches the `createCustomerMgmtTools(supabase, customerId)` pattern exactly.

```typescript
export function createActionItemTools(supabase: SupabaseClient, customerId: string) {
  return {
    createActionItem: tool({
      description: 'Create a new action item for the current customer',
      inputSchema: z.object({
        type: z.enum(['follow_up', 'proposal', 'meeting', 'delivery', 'review', 'custom']),
        description: z.string(),
        dueDate: z.string().optional().describe('ISO date string (YYYY-MM-DD)'),
      }),
      execute: async ({ type, description, dueDate }) => {
        // customerId is closure-bound, not from inputSchema
        // Insert into customer_action_items, log event, return result
      },
    }),

    updateActionItemStatus: tool({
      description: 'Update the status of an action item (todo, in_progress, done, cancelled)',
      inputSchema: z.object({
        actionItemId: z.string().uuid(),
        newStatus: z.enum(['todo', 'in_progress', 'done', 'cancelled']),
      }),
      execute: async ({ actionItemId, newStatus }) => {
        // Update status, log status change event
      },
    }),

    listActionItems: tool({
      description: 'List action items for the current customer, optionally filtered by status',
      inputSchema: z.object({
        status: z.enum(['todo', 'in_progress', 'done', 'cancelled']).optional(),
      }),
      execute: async ({ status }) => {
        // customerId is closure-bound, not from inputSchema
        // Query customer_action_items with optional status filter
      },
    }),
  }
}
```

**Implementation steps**:
1. Create `actionItemTools.ts` with factory function `createActionItemTools(supabase, customerId)`
2. Implement createActionItem tool (insert + event log) — customerId from closure
3. Implement updateActionItemStatus tool (update + event log)
4. Implement listActionItems tool (select with optional filter) — customerId from closure
5. Register in `customer-ai.controller.ts` `buildAgentTools()` (see Section 11b below)

### 11b. Tool Registration in customer-ai.controller.ts

**File**: `backend/src/controllers/customer-ai.controller.ts`

The `buildAgentTools()` function assembles domain tools per agent type. Action item tools must be spread into the `customer_mgmt` agent's tool set:

```typescript
import { createActionItemTools } from '../services/ai/tools/actionItemTools.js'

function buildAgentTools(agentType, supabase, customerId, includeHandoff, previousAgent) {
  const domainTools = agentType === 'product_mgmt'
    ? createProductMgmtTools(supabase, customerId)
    : { ...createCustomerMgmtTools(supabase, customerId), ...createActionItemTools(supabase, customerId) }

  if (!includeHandoff) return domainTools
  return { ...domainTools, ...createHandoffTool(agentType, previousAgent) }
}
```

### 12. Context Builder Update

**File**: `backend/src/services/ai/prompts/customerContextBuilder.ts`

#### 12a. Add action items to the `Promise.all` fetch

Add a 7th element to the existing `Promise.all`:

```typescript
const [customerResult, agreementsResult, receivablesResult, projectsResult, eventsResult, artifactsResult, actionItemsResult] = await Promise.all([
  // ... existing 6 queries ...
  supabase
    .from('customer_action_items')
    .select('type, description, due_date, status')
    .eq('customer_id', customerId)
    .in('status', ['todo', 'in_progress'])
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(10),
])

const actionItems = actionItemsResult.data || []
```

#### 12b. Add `actionItemSlice` parameter to `buildContext()` inner function

The inner `buildContext()` function takes slices for progressive truncation. Add action items:

```typescript
function buildContext(
  eventSlice: typeof events,
  projectSlice: typeof projects,
  agreementSlice: typeof agreements,
  artifactSlice: typeof artifacts,
  actionItemSlice: typeof actionItems,  // NEW
): string {
  // ... existing blocks ...

  const actionItemsBlock = actionItemSlice.length > 0
    ? actionItemSlice.map(a => `- [${a.type}] ${a.description}${a.due_date ? ` (due: ${a.due_date})` : ''} [${a.status}]`).join('\n')
    : '- No pending action items'

  // Add to template string between Health Signals and Active Projects:
  return `...
**Health Signals**:
${healthBlock}

**Action Items** (${actionItems.length} pending):
${actionItemsBlock}

**Active Projects** (${projects.length}):
...`
}
```

#### 12c. Update progressive truncation calls

All `buildContext()` calls must pass action items with shrinking slices:

```typescript
// Full context
let context = buildContext(events, projects, agreements, artifacts, actionItems)

// Round 1: Truncate events to 3, action items to 5
if (estimateTokens(context) > tokenBudget) {
  context = buildContext(events.slice(0, 3), projects, agreements, artifacts, actionItems.slice(0, 5))
}
// Round 2: Truncate projects to 5, artifacts to 5, action items to 3
if (estimateTokens(context) > tokenBudget) {
  context = buildContext(events.slice(0, 3), projects.slice(0, 5), agreements, artifacts.slice(0, 5), actionItems.slice(0, 3))
}
// Round 3: Truncate agreements to 3
if (estimateTokens(context) > tokenBudget) {
  context = buildContext(events.slice(0, 3), projects.slice(0, 5), agreements.slice(0, 3), artifacts.slice(0, 5), actionItems.slice(0, 3))
}
```

**Key decisions**:
- Only include `todo` and `in_progress` items (not done/cancelled) to save token budget
- Limit to 10 items initially, truncate to 5 then 3 under budget pressure
- Position after Health Signals so overdue action items are near the health warnings

### 13. CustomerDetailPage Update

Add 5th tab:

```tsx
<TabsTrigger value="action_items" ...>
  Action Items ({customer.action_items_count})
</TabsTrigger>

<TabsContent value="action_items" className="px-6 py-4 mt-0">
  <ActionItemsTab customerId={customer.id} />
</TabsContent>
```

### 14. CustomerService.getById() Update

**File**: `backend/src/services/CustomerService.ts`

The `getById()` method uses parallel Supabase JS count queries in a `Promise.all`. Add a 5th element for action items count:

```typescript
const [customerResult, agreementsCount, receivablesCount, projectsCount, actionItemsCount] = await Promise.all([
  this.supabase.from('customers').select('*').eq('id', id).is('deleted_at', null).single(),
  this.supabase.from('customer_agreements').select('id', { count: 'exact', head: true }).eq('customer_id', id),
  this.supabase.from('customer_receivables').select('id', { count: 'exact', head: true }).eq('customer_id', id),
  this.supabase.from('customer_projects').select('id', { count: 'exact', head: true }).eq('customer_id', id),
  this.supabase.from('customer_action_items').select('id', { count: 'exact', head: true }).eq('customer_id', id).neq('status', 'cancelled'),
])

// Add to return object:
return {
  ...customerResult.data,
  agreements_count: agreementsCount.count ?? 0,
  receivables_count: receivablesCount.count ?? 0,
  projects_count: projectsCount.count ?? 0,
  action_items_count: actionItemsCount.count ?? 0,
} as CustomerWithCounts
```

**Note**: Action items count excludes cancelled items (`.neq('status', 'cancelled')`). Other tab counts include all items — this is an intentional design choice since cancelled action items are noise.

## Data Model

### Schema Changes

```sql
CREATE TABLE customer_action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'follow_up',
  description TEXT NOT NULL,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'todo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customer_action_items_customer_status
  ON customer_action_items(customer_id, status);
CREATE INDEX idx_customer_action_items_customer_due_date
  ON customer_action_items(customer_id, due_date);
```

### Valid Values

- **type**: `follow_up`, `proposal`, `meeting`, `delivery`, `review`, `custom`
- **status**: `todo`, `in_progress`, `done`, `cancelled`

## API Design

### New Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/customers/:id/action-items` | List action items (supports `?status=&type=&sort=`) |
| `POST` | `/api/customers/:id/action-items` | Create action item |
| `PUT` | `/api/customers/:id/action-items/:actionItemId` | Update action item |
| `DELETE` | `/api/customers/:id/action-items/:actionItemId` | Delete action item |

### Request/Response Examples

```typescript
// POST /api/customers/:id/action-items
// Request
{
  "type": "follow_up",
  "description": "Send Q2 pricing proposal",
  "due_date": "2026-03-01",
  "status": "todo"
}

// Response (201)
{
  "id": "uuid",
  "customer_id": "uuid",
  "type": "follow_up",
  "description": "Send Q2 pricing proposal",
  "due_date": "2026-03-01",
  "status": "todo",
  "created_at": "2026-02-26T...",
  "updated_at": "2026-02-26T..."
}

// GET /api/customers/:id/action-items?status=todo&sort=due_date
// Response (matches agreements pattern: { key: [...], count: N })
{
  "action_items": [...],
  "count": 5
}
```

## Testing Requirements

### Unit Tests

| Test File | Coverage |
|-----------|----------|
| `backend/src/services/__tests__/ActionItemService.test.ts` | Service CRUD methods |

**Key test cases**:
- Create action item with all fields
- Create with defaults (type=follow_up, status=todo)
- Update partial fields
- Delete existing item
- List with status filter
- List with type filter
- List sorted by due_date (nulls last)

### Integration Tests

| Test File | Coverage |
|-----------|----------|
| `backend/src/routes/__tests__/action-items.integration.test.ts` | API endpoint responses |

**Key scenarios**:
- CRUD happy path (create, list, update, delete)
- Validation errors (missing description, invalid type/status)
- Unauthorized access (RLS enforcement)

### Manual Testing

- [ ] Create action item via dialog - verify appears in list
- [ ] Edit action item - verify changes persist
- [ ] Quick status change via badge dropdown
- [ ] Delete with confirmation - verify removed
- [ ] Sort by due date vs created date
- [ ] Filter by status (show only "To Do")
- [ ] Filter by type (show only "Follow-up")
- [ ] Overdue highlighting (create item with past due date)
- [ ] Empty state shows correctly for new customer
- [ ] Agent creates action item via chat - verify appears in tab
- [ ] Agent marks action item as done via chat
- [ ] Action items appear in agent context during conversation

## Error Handling

| Error Scenario | Handling Strategy |
|----------------|-------------------|
| Missing description on create | Return 400 with Zod validation error |
| Invalid type/status enum | Return 400 with Zod validation error |
| Action item not found on update/delete | Return 404 (Supabase returns empty) |
| Unauthorized (RLS violation) | Return 403/empty result from Supabase |
| Server error | Return 500, log with `[ActionItemController]` prefix |

## Validation Commands

```bash
# Type checking
cd backend && npx tsc --noEmit
cd frontend && npx tsc --noEmit

# Build
npm run build

# Frontend tests
cd frontend && npm run test

# Backend build
cd backend && npm run build
```

## Rollout Considerations

- **Feature flag**: Not needed - additive feature with no impact on existing functionality
- **Migration**: Run `013_customer_action_items.sql` migration before deploying code
- **Monitoring**: Check Supabase logs for RLS policy errors after deployment
- **Rollback plan**: Drop `customer_action_items` table, revert code changes

---

*This spec is ready for implementation. Follow the patterns and validate at each step.*
