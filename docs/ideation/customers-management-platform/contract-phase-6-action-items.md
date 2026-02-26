# Customer Action Items - Contract (Phase 6)

**Created**: 2026-02-26
**Confidence Score**: 96/100
**Status**: Draft
**Parent Project**: Customers Management Platform (Phases 1-5)

## Problem Statement

Advisors using the NextUp Customers Management Platform can manage customer information, agreements, receivables, and product projects - but have no way to track actionable tasks per customer. Follow-ups, proposal deadlines, meeting prep, deliverables, and review items are tracked externally (sticky notes, separate task apps, memory) creating gaps in customer engagement.

Without integrated action items, advisors lose track of what needs to happen next for each customer. The AI agents (Customer Management and Product Management) also cannot proactively suggest, create, or track tasks - limiting their utility as operational assistants.

By adding Action Items as a first-class entity within each customer's detail page, advisors gain a lightweight task management layer that lives alongside all other customer data and is fully accessible to AI agents.

## Goals

1. **Per-customer task tracking**: Advisors can create, view, edit, and delete typed action items with due dates and statuses directly within the customer detail page, without leaving the platform.

2. **AI agent task management**: Both Customer Management and Product Management agents can create, update, and complete action items via tools, and reference existing action items in their context to provide proactive guidance.

3. **Actionable visibility**: Action items are sortable by due date and filterable by status and type, giving advisors instant awareness of what's due and what's overdue per customer.

4. **Consistent UX**: The Action Items tab follows the identical patterns established by Agreements, Receivables, and Projects tabs - maintaining UI consistency and reducing learning curve.

## Success Criteria

- [ ] New "Action Items" tab appears in customer detail page alongside existing 4 tabs
- [ ] Tab shows count badge matching existing tab count pattern (e.g., "Action Items (3)")
- [ ] Users can create action items with: type (predefined dropdown), description, due date, status
- [ ] Users can edit action items inline or via dialog
- [ ] Users can delete action items with confirmation dialog
- [ ] Action item types are predefined: Follow-up, Proposal, Meeting, Delivery, Review, Custom
- [ ] Action item statuses: To Do, In Progress, Done, Cancelled
- [ ] Type displayed as colored pill/badge matching existing badge patterns
- [ ] Status displayed as colored pill/badge
- [ ] Items sortable by due date (default) and created date
- [ ] Items filterable by status and type
- [ ] Customer Management Agent can create action items via tool
- [ ] Customer Management Agent can update action item status via tool
- [ ] Customer Management Agent can list/read action items via tool
- [ ] Action items included in customerContextBuilder output
- [ ] Action items count included in CustomerWithCounts type
- [ ] Database table `customer_action_items` with RLS per user
- [ ] All CRUD operations go through backend API (controller + route + service pattern)
- [ ] Frontend hook `useActionItems` follows useAgreements/useReceivables pattern
- [ ] UI follows existing NextUp design system (shadcn/ui, Tailwind, dark-first)

## Scope Boundaries

### In Scope

- `customer_action_items` database table with migration and RLS policies
- Backend: ActionItemService, action-items controller, action-items routes
- Frontend: ActionItemsTab, ActionItemRow, ActionItemForm components
- Frontend: useActionItems hook (CRUD operations via TanStack Query)
- Frontend: Action item type/status type definitions, labels, and colors
- CustomerTab type updated to include 'action_items'
- CustomerDetailPage updated with new tab
- CustomerWithCounts updated with action_items_count
- Agent tools: createActionItem, updateActionItem, listActionItems
- customerContextBuilder updated to include action items section
- Sort by due date (default) and created date
- Filter by status and type
- Empty state for no action items
- Loading skeleton state

### Out of Scope

- Recurring/repeating action items - future enhancement
- Action item assignment to team members - no multi-user support yet
- Notifications/reminders for due dates - no notification system exists
- Drag-and-drop reordering - standard sort/filter is sufficient
- Kanban board view - list/card view only for consistency
- Action items on the customer list page - tab-only for now
- Linking action items to specific agreements or projects - future enhancement
- Bulk operations (bulk delete, bulk status change) - CRUD per item

### Future Considerations

- Recurring action items (weekly follow-ups, monthly reviews)
- Due date notifications and reminders
- Action item templates per customer status
- Linking action items to agreements, projects, or events
- Bulk operations for power users
- Dashboard widget showing overdue items across all customers
- Action item assignment when multi-user/team support is added
- Kanban view option

---

*This contract extends the Customers Management Platform as Phase 6. Review and approve before proceeding to PRD generation.*
