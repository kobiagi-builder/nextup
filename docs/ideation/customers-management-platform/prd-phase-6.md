# PRD: Customers Management Platform - Phase 6

**Contract**: ./contract-phase-6-action-items.md
**Phase**: 6 of 6
**Focus**: Per-customer action items with AI agent integration

## Phase Overview

Phase 6 adds a lightweight task management layer to each customer. Action items track what needs to happen next - follow-ups, proposals, meetings, deliverables, reviews - directly within the customer detail page. This complements the existing data layers (info, agreements, receivables, projects) by adding an operational "to-do" dimension that advisors currently track externally.

This phase is sequenced after the AI agents (Phase 4-5) because the action items feature integrates bidirectionally with both agents: the Customer Management Agent can create and manage action items, and action items appear in the agent's context. The feature is self-contained - it adds a new tab, database table, API routes, and agent tools without modifying existing phase outputs.

After Phase 6, advisors have a complete operational cockpit per customer: who they are (Overview), what's agreed (Agreements), what's owed (Receivables), what's being built (Projects), and what needs to happen next (Action Items) - all AI-augmented.

## User Stories

1. As an advisor, I want to create action items for a customer with a type, description, due date, and status so that I can track what needs to happen next.
2. As an advisor, I want to see all action items in a dedicated tab with sorting and filtering so that I can quickly find overdue or pending tasks.
3. As an advisor, I want to edit action items inline (change status, update due date) so that I can update progress without opening a form.
4. As an advisor, I want to delete action items I no longer need so that my list stays clean.
5. As an advisor, I want the AI agent to create action items based on our conversation (e.g., "follow up next week") so that tasks are captured automatically.
6. As an advisor, I want the AI agent to see my existing action items so that it can provide context-aware suggestions and reminders.

## Functional Requirements

### Action Items Tab

- **FR-6.1**: New "Action Items" tab in CustomerDetailPage with count badge showing total non-cancelled items (e.g., "Action Items (5)").
- **FR-6.2**: Tab displays action items as rows/cards, each showing: type badge, description, due date, status badge, and actions menu.
- **FR-6.3**: Default sort by due date ascending (soonest first). Secondary sort option: created date.
- **FR-6.4**: Filter by status (To Do, In Progress, Done, Cancelled) and by type (Follow-up, Proposal, Meeting, Delivery, Review, Custom).
- **FR-6.5**: Overdue items (due date in the past, status not Done/Cancelled) visually highlighted with red/destructive styling.
- **FR-6.6**: Empty state with icon, message, and "Add First Action Item" CTA.
- **FR-6.7**: Loading skeleton state consistent with other tabs.

### Action Item CRUD

- **FR-6.8**: "Add Action Item" button opens a dialog form with: type (dropdown, default: "Follow-up"), description (text input, required), due date (date picker, optional), status (dropdown, default: "To Do").
- **FR-6.9**: Action items editable via dialog (same form as create, pre-populated).
- **FR-6.10**: Quick status toggle: clicking the status badge opens a dropdown to change status inline without opening the edit dialog.
- **FR-6.11**: Delete action item with confirmation dialog (AlertDialog pattern matching AgreementCard).
- **FR-6.12**: Actions menu (three-dot dropdown) with: Edit, Delete options.

### Action Item Types and Statuses

- **FR-6.13**: Predefined types: `follow_up`, `proposal`, `meeting`, `delivery`, `review`, `custom`. Each with label, color badge.
- **FR-6.14**: Statuses: `todo`, `in_progress`, `done`, `cancelled`. Each with label, color badge.
- **FR-6.15**: Type and status color system follows existing badge pattern (`bg-{color}-500/10 text-{color}-400 border-{color}-500/20`).

### Backend API

- **FR-6.16**: `GET /api/customers/:customerId/action-items` - List all action items for a customer. Supports query params: `sort` (due_date|created_at), `status`, `type`.
- **FR-6.17**: `POST /api/customers/:customerId/action-items` - Create action item.
- **FR-6.18**: `PUT /api/customers/:customerId/action-items/:id` - Update action item.
- **FR-6.19**: `DELETE /api/customers/:customerId/action-items/:id` - Delete action item.

### Database

- **FR-6.20**: New `customer_action_items` table with columns: id (UUID PK), customer_id (FK), type (text), description (text), due_date (date, nullable), status (text, default 'todo'), created_at, updated_at.
- **FR-6.21**: RLS policy: users can only access action items for their own customers (join through customers table).
- **FR-6.22**: Index on (customer_id, status) for filtered queries.
- **FR-6.23**: Index on (customer_id, due_date) for sorted queries.

### AI Agent Integration

- **FR-6.24**: New agent tool `createActionItem` - creates an action item for the current customer with type, description, due date, and status.
- **FR-6.25**: New agent tool `updateActionItemStatus` - updates the status of an existing action item (e.g., mark as done).
- **FR-6.26**: New agent tool `listActionItems` - retrieves action items for the current customer, optionally filtered by status.
- **FR-6.27**: `customerContextBuilder.ts` updated to include action items section showing count and list of pending/in-progress items with due dates.

### State Management

- **FR-6.28**: `CustomerTab` type updated to include `'action_items'`.
- **FR-6.29**: `CustomerWithCounts` extended with `action_items_count`.
- **FR-6.30**: TanStack Query hooks: `useActionItems(customerId, filters?)`, `useCreateActionItem(customerId)`, `useUpdateActionItem(customerId)`, `useDeleteActionItem(customerId)`.

## Non-Functional Requirements

- **NFR-6.1**: Action items list loads under 200ms p95 for customers with up to 100 action items.
- **NFR-6.2**: RLS enforces ownership through customer_id join to customers.user_id.
- **NFR-6.3**: All UI components use existing shadcn/ui primitives (no new UI library dependencies).
- **NFR-6.4**: Keyboard accessible: Tab through items, Enter to open edit, Escape to close dialogs.

## Dependencies

### Prerequisites

- Phase 1-5 complete (customer detail page, tabs, agent infrastructure, context builder)
- `customers` table with RLS policies exists
- Customer Management Agent tools infrastructure exists (customerMgmtTools.ts)
- customerContextBuilder.ts exists and is functional

### Outputs for Next Phase

- Action items data model available for future enhancements (recurring items, notifications, linking)
- Agent tools pattern extensible for additional action item operations
- Filter/sort infrastructure reusable for other tabs

## Acceptance Criteria

- [ ] "Action Items" tab appears as 5th tab in customer detail page
- [ ] Tab shows count of non-cancelled action items
- [ ] Create action item dialog works with all fields (type, description, due date, status)
- [ ] Edit action item dialog pre-populates existing values
- [ ] Quick status change via badge dropdown works
- [ ] Delete with confirmation dialog works
- [ ] Items sorted by due date by default
- [ ] Filter by status works
- [ ] Filter by type works
- [ ] Overdue items highlighted visually
- [ ] Empty state displays correctly
- [ ] Loading skeleton displays correctly
- [ ] Agent can create action items via tool
- [ ] Agent can update action item status via tool
- [ ] Agent can list action items via tool
- [ ] Action items appear in customer context for agent conversations
- [ ] `customer_action_items` table exists with correct schema
- [ ] RLS policies enforce per-user access
- [ ] All API endpoints return correct responses
- [ ] TypeScript compiles without errors
- [ ] UI matches existing tab patterns (Agreements, Receivables, Projects)

---

*Review this PRD and provide feedback before spec generation.*
