# PRD: Action Items Kanban Board - Phase 1

**Contract**: ./contract.md
**Phase**: 1 of 1
**Focus**: Full Kanban board implementation with drag-and-drop, filtering, and feature-flagged rollout

## Phase Overview

This phase delivers the complete Action Items Kanban Board feature as a new screen in NextUp. The board provides a centralized, cross-customer view of all action items organized by status columns (Todo, In Progress, Done, Cancelled). Users can drag-and-drop cards between columns to change status, filter by customer, and create new action items directly from the board.

The implementation requires a database migration (adding `user_id` column, making `customer_id` nullable, updating RLS), new backend endpoints for cross-customer CRUD, a new frontend page with Kanban layout and drag-and-drop via `@dnd-kit/core`, and feature flag gating. The existing Action Items tab in Customer Detail remains unchanged.

This is a single-phase delivery because the scope is well-bounded: the data model already exists, the backend CRUD operations are in place, and the primary new work is the data model extension, cross-customer endpoints, the Kanban UI, and the drag-and-drop interaction.

## User Stories

1. As an advisor, I want to see all my action items across all customers on a single Kanban board so that I can triage my workload without clicking into each customer individually
2. As an advisor, I want to drag action item cards between status columns so that I can quickly update item status without opening edit forms
3. As an advisor, I want to filter the Kanban board by customer so that I can focus on one customer's items when needed
4. As an advisor, I want to add new action items from the Kanban board (with or without a customer) so that I can capture general tasks that aren't tied to a specific customer
5. As an advisor, I want to click on a card to edit its details so that I can update description, due date, type, or customer assignment
6. As an advisor, I want to see each card's title, due date, and customer name at a glance so that I can quickly identify what needs attention

## Functional Requirements

### Database & Data Model

- **FR-1.1**: Add `user_id UUID NOT NULL REFERENCES auth.users(id)` column to `customer_action_items`, backfilled from `customers.user_id` via join
- **FR-1.2**: Make `customer_action_items.customer_id` nullable (`ALTER COLUMN customer_id DROP NOT NULL`)
- **FR-1.3**: Update RLS policies: `USING (user_id = auth.uid())` — ownership is now direct via `user_id`, not derived through customer join
- **FR-1.4**: Add index `idx_customer_action_items_user_status` on `(user_id, status)` for efficient cross-customer queries
- **FR-1.5**: Add index `idx_customer_action_items_user_id` on `(user_id)` for the all-items query
- **FR-1.6**: Update `ActionItem` TypeScript type: `customer_id: string | null` (both frontend and backend). Audit and fix all consumers that assume non-null `customer_id`

### Backend API

- **FR-1.7**: New endpoint `GET /api/action-items` — returns all action items for the authenticated user across all customers (and customerless items), with optional query params `?customer_id=uuid` and `?status=todo,in_progress`
- **FR-1.8**: New endpoint `POST /api/action-items` — creates action items with optional `customer_id`, always sets `user_id` from auth context
- **FR-1.9**: New endpoint `PUT /api/action-items/:id` — updates any action item owned by user (used by Kanban for status changes and for customerless item edits)
- **FR-1.10**: New endpoint `DELETE /api/action-items/:id` — deletes any action item owned by user
- **FR-1.11**: Existing customer-scoped endpoints (`/api/customers/:id/action-items/*`) continue to work unchanged
- **FR-1.12**: Backend `ActionItemService`: add `listAll(userId, filters?)` method and update `create()` to accept nullable `customerId`, always requiring `userId`
- **FR-1.13**: Backend validation: when AI agents create action items (via agent service), `customer_id` must not be null — enforced in agent service layer, not in the database

### Frontend - Kanban Board Screen

- **FR-1.14**: New route `/action-items` protected by `FeatureGate feature="action_items_kanban"`
- **FR-1.15**: Kanban board displays 4 columns: Todo, In Progress, Done, Cancelled
- **FR-1.16**: Each column shows a count badge with the number of items
- **FR-1.17**: Cards display: action item description (title), due date (if set), type badge, customer name (or "General" if no customer)
- **FR-1.18**: Cards with overdue dates show visual urgency indicator (red border/text, consistent with existing ActionItemRow pattern)
- **FR-1.19**: Clicking a card opens the ActionItemForm dialog in edit mode (form updated to support optional customer selector)
- **FR-1.20**: "Add Item" button opens ActionItemForm dialog in create mode with customer selector (optional customer)
- **FR-1.21**: Cards within each column sorted by: due_date ascending (nulls last), then created_at descending
- **FR-1.22**: Empty board state: illustration + "No action items yet" message + CTA button to create first item
- **FR-1.23**: Empty column state: subtle placeholder text (e.g., "No items")
- **FR-1.24**: Empty filter results: "No action items for [Customer Name]" with option to clear filter
- **FR-1.25**: Loading state: skeleton columns with placeholder cards (consistent with existing app patterns)

### Frontend - Drag & Drop

- **FR-1.26**: Use `@dnd-kit/core` library for drag-and-drop (actively maintained, accessible, keyboard support built-in)
- **FR-1.27**: Cards can be dragged between columns to change status
- **FR-1.28**: Optimistic UI update: card moves to target column immediately on drop
- **FR-1.29**: On drop, call `PUT /api/action-items/:id` with `{ status: newStatus }`
- **FR-1.30**: On API error, revert card to original column and show error toast
- **FR-1.31**: Visual drag indicator (card lifts with shadow, drop zone highlights)
- **FR-1.32**: Keyboard accessible: Tab to focus cards, Space/Enter to pick up, arrow keys to move between columns, Space/Enter to drop

### Frontend - Filtering

- **FR-1.33**: Customer filter dropdown at top of board (All Customers + list of user's customers)
- **FR-1.34**: Filtering is client-side: all items loaded upfront, filtered via `useMemo`. Server-side filtering deferred to future if needed
- **FR-1.35**: Filter state persists during the session (reset on page reload)

### Frontend - Query Architecture

- **FR-1.36**: New query key namespace: `['action-items', 'board']` for the Kanban data
- **FR-1.37**: New hooks: `useActionItemsBoard()` for fetching all items, `useCreateBoardActionItem()`, `useUpdateBoardActionItem()`, `useDeleteBoardActionItem()`
- **FR-1.38**: Kanban mutations must invalidate both `['action-items', 'board']` AND the affected customer's action items query (`customerKeys.detail(customerId) -> 'action_items'`) for cache coherence between Kanban and Customer Detail views

### Navigation & Feature Flag

- **FR-1.39**: New sidebar nav item "Action Items" with `ListChecks` icon, positioned after "Customers"
- **FR-1.40**: Nav item only visible when `action_items_kanban` feature flag is active
- **FR-1.41**: Create feature flag `action_items_kanban` with `default_state = false`
- **FR-1.42**: Enable flag for all accounts currently enabled for `customer_management`
- **FR-1.43**: `action_items_kanban` does NOT require `customer_management` — the board can show general-only items if customers feature is disabled (edge case, but valid)

## Non-Functional Requirements

- **NFR-1.1**: Kanban board initial load under 500ms for up to 200 action items
- **NFR-1.2**: Drag-and-drop interaction must feel instant (optimistic update, no visible latency)
- **NFR-1.3**: Board must work on desktop viewports (1024px+); graceful degradation on smaller screens (stacked columns)
- **NFR-1.4**: All data access enforced via Supabase RLS using `user_id = auth.uid()` (no data leakage between users)
- **NFR-1.5**: Accessible: keyboard navigation for column/card focus, ARIA labels for drag-and-drop (provided by @dnd-kit)

## Dependencies

### Prerequisites

- Existing `customer_action_items` table and CRUD operations
- Existing `feature_flags` and `customer_features` tables
- Existing sidebar navigation pattern with feature flag gating
- Existing ActionItemForm dialog component

### Outputs for Next Phase

- N/A (single phase)

## Acceptance Criteria

- [ ] Migration applied: `user_id` column added and backfilled, `customer_id` is nullable, RLS updated
- [ ] `GET /api/action-items` returns all user's action items (cross-customer + customerless)
- [ ] `POST /api/action-items` creates items with optional customer_id
- [ ] `PUT /api/action-items/:id` updates items (status change from drag-and-drop)
- [ ] `DELETE /api/action-items/:id` deletes items
- [ ] Kanban board renders 4 columns with correct items in each, sorted by due_date then created_at
- [ ] Cards show description, due date, type badge, customer name (or "General")
- [ ] Overdue items show visual urgency indicator
- [ ] Drag-and-drop between columns updates status optimistically
- [ ] API error on status update reverts card position and shows error toast
- [ ] Keyboard drag-and-drop works (Tab, Space, arrow keys)
- [ ] Customer filter dropdown filters cards client-side
- [ ] Add Item button opens create dialog with optional customer selector
- [ ] Click card opens edit dialog
- [ ] Empty states display correctly (empty board, empty column, empty filter results)
- [ ] Loading skeleton renders during data fetch
- [ ] Sidebar shows "Action Items" nav when feature flag is active
- [ ] Route `/action-items` is gated by `FeatureGate`
- [ ] Feature flag `action_items_kanban` created with `default_state = false`
- [ ] Flag enabled for all `customer_management` accounts
- [ ] Kanban mutations invalidate both board and per-customer query caches
- [ ] Existing Action Items tab in Customer Detail works unchanged
- [ ] `ActionItem` TypeScript type updated to `customer_id: string | null`, all consumers fixed
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] No critical bugs open

## Feature Rollout

| Property | Value |
|----------|-------|
| Flag Name | `action_items_kanban` |
| Description | Enables the Action Items Kanban Board screen and sidebar navigation |
| Default State | `false` (gradual rollout) |
| Initial Accounts | All accounts currently enabled for `customer_management` |

**Rollout Requirements:**
- **RR-1.1**: Create feature flag `action_items_kanban` in `feature_flags` table with `default_state = false`
- **RR-1.2**: Enable flag for all accounts that have `customer_management` enabled in `customer_features` table
- **RR-1.3**: Frontend must check `useFeatureFlag('action_items_kanban')` for sidebar nav visibility
- **RR-1.4**: Frontend route must be wrapped with `<FeatureGate feature="action_items_kanban">`

**Activation logic**: Feature is active for an account if `default_state = true` OR (`default_state = false` AND `flag_state = true` in `customer_features`).

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Add `user_id` column to table | Required for RLS on customerless items and efficient cross-customer queries. Not optional. |
| Keep table name `customer_action_items` | Renaming adds migration risk. Defer to future cleanup phase. |
| Use `@dnd-kit/core` for drag-and-drop | Actively maintained, accessible by default, keyboard support, good React integration. |
| Client-side filtering | Dataset bounded per user (<200 items typical). Server-side deferred to future if needed. |
| `action_items_kanban` independent of `customer_management` | Board can show general-only items. Edge case but valid state. |
| All 4 columns visible by default | User decision. Future consideration: collapsible Done/Cancelled columns. |

---

*Review this PRD and provide feedback before spec generation.*
