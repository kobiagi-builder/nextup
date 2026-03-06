# Action Items Kanban Board

**Created:** 2026-03-06
**Last Updated:** 2026-03-06
**Version:** 1.0.0
**Status:** Complete

## Overview

Cross-customer Kanban board for managing action items. Provides a bird's-eye view of all tasks across customers with drag-and-drop status changes, customer filtering, and inline create/edit.

## User Perspective

### What It Does

- **Board View**: 4-column Kanban layout (To Do, In Progress, Done, Cancelled) showing all action items
- **Drag-and-Drop**: Move cards between columns to change status with optimistic UI updates
- **Customer Filter**: Filter board by customer via dropdown (requires `customer_management` flag)
- **Create/Edit**: Create new action items from toolbar; click any card to edit
- **General Items**: Action items can exist without a customer ("General" items)

### Entry Points

- Sidebar navigation: "Action Items" link (icon-only when collapsed, full label on hover)
- Direct URL: `/action-items`

### Feature Flag

Gated behind `action_items_kanban` feature flag. When disabled:
- Sidebar link hidden
- Route redirects to `/portfolio` via `FeatureGate`
- Enabled for all accounts that have `customer_management` enabled

## Technical Perspective

### Database Changes

**Migration:** `015_kanban_board_user_id`

- `customer_action_items.user_id` — `UUID NOT NULL DEFAULT auth.uid()` with FK to `auth.users(id)`
- `customer_action_items.customer_id` — Changed from `NOT NULL` to nullable
- Composite index: `idx_customer_action_items_user_status(user_id, status)`
- Symmetric compound RLS policy (USING = WITH CHECK): `user_id = auth.uid() AND (customer_id IS NULL OR is_customer_owner(customer_id))`

### Backend

**Service Methods** (`ActionItemService.ts`):
- `listAll(userId, filters?)` — Cross-customer query with `customers(name)` JOIN, ordered by due_date ASC (nulls last), created_at DESC
- `createForBoard(userId, input)` — Creates with optional `customer_id`, `user_id` from auth
- `updateForBoard(id, input)` — Supports status change and customer reassignment

**API Endpoints** (`/api/action-items`):
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/action-items` | List all items (optional `?customer_id=uuid&status=todo,in_progress`) |
| POST | `/api/action-items` | Create item (optional `customer_id`) |
| PUT | `/api/action-items/:id` | Update item (status, description, customer_id, etc.) |
| DELETE | `/api/action-items/:id` | Delete item |

All endpoints require auth + `action_items_kanban` feature flag.

**Validation** (Zod):
- Create: `description` required (min 1 char), `type`/`status`/`due_date`/`customer_id` optional
- Update: At least one field required, all fields optional

### Frontend

**Components** (`frontend/src/features/action-items/`):
- `ActionItemsBoardPage` — Page component with filter state, form state, loading/empty states
- `KanbanBoard` — DndContext wrapper with PointerSensor (distance: 5) + KeyboardSensor, closestCenter collision, DragOverlay
- `KanbanColumn` — Droppable column with status dot, title, count badge, drop zone highlight
- `KanbanCard` — Draggable card with type badge, due date urgency, description (2-line clamp), customer name
- `BoardToolbar` — Sticky toolbar with title, customer filter Select, Add Item button

**Hooks** (`useActionItemsBoard.ts`):
- `useActionItemsBoard(filters?)` — Query with `boardActionItemKeys.all = ['action-items', 'board']`
- `useCreateBoardActionItem()` — POST mutation with cache invalidation
- `useUpdateBoardActionItem()` — PUT with optimistic updates via `queryClient.setQueryData()` + cross-cache invalidation
- `useDeleteBoardActionItem()` — DELETE with cache invalidation

**ActionItemForm Dual Mode**:
- `customerId` prop undefined → Board mode (shows customer selector, uses board mutations)
- `customerId` prop string → Customer-scoped mode (existing behavior)

### Visual Design

- **Card**: Type badge (colored), due date with urgency, description (2-line clamp), customer name or "General"
- **Overdue**: `border-destructive/50` on card, red due date text
- **Drag Overlay**: `shadow-lg rotate-[2deg] scale-[1.02] ring-2 ring-primary/20`
- **Drop Zone Active**: `ring-2 ring-primary/30 bg-primary/5`
- **Column Status Dots**: gray (todo), blue (in_progress), green (done), orange (cancelled)
- **Empty Board**: ListChecks icon + "No action items yet" + Create CTA
- **Loading**: 4-column skeleton with varying card counts

## Dependencies

- `@dnd-kit/core` (v6.3.1) — drag-and-drop
- `customer_management` feature flag — for customer filter dropdown
- `action_items_kanban` feature flag — for feature gating

## Known Limitations

- No drag-and-drop on mobile (PointerSensor only)
- No card reordering within columns
- No bulk operations
- No keyboard-only drag (KeyboardSensor registered but @dnd-kit keyboard drag requires sortable)

## Related Documentation

- [Customer Management](./customer-management.md) — Customer-scoped action items tab
- [Database Schema Reference](../Architecture/database/database-schema-reference.md) — `customer_action_items` table
