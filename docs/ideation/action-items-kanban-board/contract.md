# Action Items Kanban Board Contract

**Created**: 2026-03-06
**Confidence Score**: 96/100
**Status**: Draft

## Problem Statement

Advisors and consultants using NextUp currently manage action items within individual customer detail pages, accessible only through a tab in the Customer Detail view. This means there is no centralized, cross-customer view of all pending work. When an advisor has 15+ active customers, each with multiple action items, they must click into each customer individually to see what needs attention.

This lack of a unified task view creates blind spots: overdue items get missed, workload across customers is invisible at a glance, and there's no way to quickly triage and reprioritize work across the entire portfolio. Advisors need a single screen that shows all action items across all customers (and general items not tied to any customer), organized by status, with the ability to quickly move items between statuses via drag-and-drop.

## Goals

1. **Centralized visibility**: Provide a single Kanban board screen showing all action items across all customers, grouped by status columns (todo, in_progress, done, cancelled)
2. **Cross-customer triage**: Enable filtering by customer so advisors can focus on one customer's items or see everything at once
3. **Quick status management**: Allow drag-and-drop between columns to change action item status without opening edit dialogs
4. **General action items**: Support action items not tied to any specific customer (customer_id nullable) for general tasks
5. **Gated rollout**: Feature protected by a rollout flag, initially enabled only for accounts that already have the `customer_management` flag active

## Success Criteria

- [ ] New "Action Items" menu item appears in left sidebar (only when rollout flag is active)
- [ ] Kanban board screen displays 4 columns: Todo, In Progress, Done, Cancelled
- [ ] All action items for the authenticated user are loaded and displayed as cards
- [ ] Each card shows: title (description), due date, customer name (or "General" if no customer)
- [ ] Clicking a card opens the edit dialog (reusing existing ActionItemForm pattern)
- [ ] User can filter the board by customer via a dropdown/selector
- [ ] User can add a new action item from the board (with optional customer selection)
- [ ] Drag-and-drop between columns updates the action item status via API
- [ ] Optimistic UI updates on drag-and-drop (instant column move, revert on error)
- [ ] Board respects RLS policies (user only sees their own items)
- [ ] `customer_id` column in `customer_action_items` is nullable (migration applied)
- [ ] Backend validation ensures AI agents always provide customer_id when creating items
- [ ] Existing Action Items tab in Customer Detail page continues to work unchanged
- [ ] Feature flag `action_items_kanban` is created with `default_state = false`
- [ ] Flag is enabled for all accounts that currently have `customer_management` enabled
- [ ] Route `/action-items` is protected by `FeatureGate`
- [ ] Sidebar nav item is conditionally rendered based on feature flag

## Scope Boundaries

### In Scope

- Kanban board screen with 4 status columns
- New sidebar navigation item (feature-flagged)
- Customer filter dropdown on the board
- Drag-and-drop cards between columns (status update)
- Add new action item from board (with/without customer)
- Edit action item via dialog (click card)
- Database migration: make `customer_id` nullable
- New backend endpoint: GET all action items for user (cross-customer)
- Feature flag creation and rollout to existing customer_management accounts
- Frontend route with FeatureGate protection

### Out of Scope

- Modifying the existing Action Items tab in Customer Detail - it stays as-is
- Recurring action items or due date reminders
- Team assignment or multi-user action items
- Notifications or email alerts for overdue items
- Bulk operations (multi-select, bulk status change)
- Custom columns or user-defined statuses
- Action item priority field or sorting within columns
- Mobile-specific Kanban layout (standard responsive behavior only)

### Future Considerations

- Priority levels and sorting within columns
- Due date reminders and notifications
- Linking action items to agreements/projects
- Bulk operations (multi-select drag, bulk edit)
- Swimlanes by customer within columns
- Calendar view of action items by due date

---

## Feature Rollout

| Property | Value |
|----------|-------|
| Flag Name | `action_items_kanban` |
| Description | Enables the Action Items Kanban Board screen and sidebar navigation |
| Default State | `false` (gradual rollout) |
| Initial Accounts | All accounts currently enabled for `customer_management` |

---

*This contract was generated from brain dump input. Review and approve before proceeding to PRD generation.*
