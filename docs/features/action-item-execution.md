# Action Item Execution

**Created:** 2026-03-21
**Last Updated:** 2026-03-21
**Version:** 2.0.0
**Status:** Complete (Phase 1 + Phase 2)

## Overview

One-click AI execution of action items. Clicking the "Execute" button on a to-do action item triggers the Customer Management Agent with full context, which autonomously executes the task using 50+ tools across two agents (Customer Management and Product Management).

## User Perspective

### What It Does

- **Execute Button**: A Zap icon button appears on all to-do action items (both customer detail and kanban board views)
- **Auto-routing**: The AI agent analyzes the action item and routes to the correct agent:
  - Customer-scope tasks (communication, event logging, customer updates) → Customer Management Agent
  - Product-scope tasks (competitive analysis, roadmap, strategy docs) → Product Management Agent
  - Human-only tasks (scheduling meetings, phone calls) → Declined with explanation
- **Chat Execution**: Execution happens through the existing customer chat panel, showing the full conversation
- **Status Tracking**: Status changes from `todo` → `in_progress` immediately, then `done` on completion or reverts to `todo` if declined
- **Result Visibility** (Phase 2): Completed execution items show a clickable document link (if a document was created) and a collapsible execution summary
- **Execution State** (Phase 2): Global one-at-a-time lock prevents concurrent executions; loading animations show during execution setup

### Entry Points

1. **Customer Detail Page > Action Items Tab**: Zap button appears on hover for each to-do item
2. **Action Items Board (Kanban)**: Zap button on to-do cards in the todo column

### Execution Flow

1. User clicks Execute (Zap) button on a to-do action item
2. Status immediately changes to `in_progress`
3. Chat panel opens with a trigger message containing the action item details
4. Agent calls `executeActionItem` tool to fetch full context and build execution brief
5. Agent analyzes the brief and determines the approach
6. Agent executes using available tools or hands off to Product Management Agent
7. Agent calls `updateActionItemStatus` with `done` (success) or `todo` (decline)
8. If status is `done`, agent optionally includes `document_id` and `execution_summary` in the update

### Cross-Page Navigation

When executing from the Kanban board:
1. App navigates to the customer's detail page via React Router with execution state
2. Customer detail page detects the state and opens chat with the trigger message
3. 150ms delay handles the AppShell close-on-navigate race condition

## Technical Perspective

### Backend

**New Tool:** `executeActionItemTool.ts`
- Factory: `createExecuteActionItemTool(supabase, customerId)`
- Input: `{ actionItemId: string (UUID) }`
- Flow: Fetch action item → verify ownership → set in_progress → build customer context → build execution brief → log event → return brief
- Registered in `customer-ai.controller.ts` via `buildAgentTools()`

**Extended Tool (Phase 2):** `updateActionItemStatus` in `actionItemTools.ts`
- New optional params when status is `done`: `document_id` (UUID), `execution_summary` (string)
- Conditional update: only passes `document_id`/`execution_summary` to DB when status === 'done'
- Brief instructions updated to tell agent to include these fields on completion

**Board API (Phase 2):** `ActionItemService.listAll()`
- Joins `customer_documents` via `document:customer_documents(title)` for document title display on board cards
- Maps `document_title: item.document?.title || null` to flat response

**Database (Phase 2):** Migration `add_execution_result_fields`
- `document_id UUID REFERENCES customer_documents(id) ON DELETE SET NULL` — nullable FK
- `execution_summary TEXT` — nullable text
- Partial index: `idx_action_items_document_id ON customer_action_items(document_id) WHERE document_id IS NOT NULL`

**System Prompt Update:** `customerAgentPrompts.ts`
- `executeActionItem` added to Available Tools list
- New "Action Item Execution Protocol" section with routing criteria, handoff rules, and decline criteria

### Frontend

**Hook:** `useExecuteActionItem.ts`
- Returns `{ execute, executingItemId }`
- `execute(item, customerId, customerName, updateStatusFn)` handles the full flow
- Builds trigger message with description, type, due date, and action item ID
- Detects current page to decide between direct chat open vs navigation with state
- Phase 2: Integrated with `ExecutionStore` for global one-at-a-time lock
- Phase 2: Guard `if (executingItemId !== null) return` prevents concurrent executions
- Phase 2: try/catch/finally pattern ensures `endExecution()` always clears state

**New Store (Phase 2):** `executionStore.ts`
- Zustand store (session-only, no persistence) tracking global execution state
- State: `{ executingItemId, executingCustomerId, startExecution(), endExecution() }`
- Used by both `ActionItemRow` and `KanbanCard` for loading animations
- Used by `useExecuteActionItem` for one-at-a-time lock

**Modified Components (Phase 1):**
- `CustomerChatPanel` — Added `initialMessage` prop with auto-send on mount
- `useCustomerChat` — Added `openCustomerChatWithMessage(message)` function
- `AppShell` — Passes `initialMessage` to `CustomerChatPanel`

**Modified Components (Phase 1 + Phase 2):**
- `ActionItemRow` — Zap execute button (hover-visible, todo-only); Phase 2: loading animation (`animate-pulse` border), document link (FileText icon + title), collapsible execution summary, "Executing..." indicator replaces status badge
- `ActionItemsTab` — Wires execute handler, `customerName` prop, and `customerId` to rows
- `KanbanCard` — Zap execute button for todo items; Phase 2: loading animation, document icon on done cards with linked document, executing indicator
- `KanbanColumn` / `KanbanBoard` — Thread `onExecute` and `isExecuting` props
- `ActionItemsBoardPage` — Wires execute handler using `useExecuteActionItem`
- `CustomerDetailPage` — Handles `location.state.executeActionItem` for cross-page navigation; Phase 2: handles `location.state.openDocumentId` + `switchToTab` for document navigation
- `DocumentsTab` — Phase 2: accepts `openDocumentId` prop, auto-opens DocumentEditor via useEffect

**Document Navigation (Phase 2):**
No URL route exists for individual documents — they use modal-based `DocumentEditor` in `DocumentsTab`. Solution: navigate via React Router state `{ openDocumentId, switchToTab: 'documents' }`. `CustomerDetailPage` switches to Documents tab, passes the ID to `DocumentsTab`, which finds the document and auto-opens the editor modal.

### Button Design

- **Icon**: Zap from lucide-react
- **Visibility**: Appears on hover (`opacity-0 group-hover:opacity-100`) in ActionItemRow; always visible on KanbanCard
- **States**: Default (muted foreground), Hover (primary color with bg tint), Disabled (50% opacity)
- **Condition**: Only rendered when `item.status === 'todo'`

### Execution Brief Structure

```markdown
## Execution Brief

### Objective
- Description, Type, Due Date, Reported By, Action Item ID

### Instructions
1. Analyze objective in customer context
2. Determine best approach
3. Route product tasks to PM Agent
4. Decline human-only tasks
5. Execute using available tools
6. Call updateActionItemStatus when complete

### Customer Context
[Full customer context from buildCustomerContext()]
```

## Testing

### Unit Tests (69 total)
- **Backend** (`executeActionItemTool.test.ts`): 24 tests — factory shape, success path, customer ownership, status update, context building, event logging, error handling, optional fields
- **Backend** (`actionItemTools.test.ts`): 29 tests — Phase 2: updateActionItemStatus with document_id, execution_summary, conditional update logic for done vs non-done statuses
- **Frontend** (`useExecuteActionItem.test.ts`): 13 tests — trigger message building, status updates, same-page chat opening, cross-page navigation, executingItemId lifecycle
- **Frontend** (`executionStore.test.ts`): 14 tests — Phase 2: default state, startExecution, endExecution, overwrite behavior, state isolation

### Integration Tests (14 total)
- `executeActionItem.integration.test.ts`: 8 original (full tool flow) + 6 Phase 2 (document_id/execution_summary conditional pass-through, status-gated filtering, done-only fields)

### E2E Tests (Playwright)
- `action-item-execution.spec.js`:
  - Phase 1 (Tests 1-6): Execute button visibility, status changes, chat panel opening, kanban board interaction
  - Phase 2 (Tests 7-12): Document link on done items, collapsible execution summary, no-result done items, document navigation from kanban, document navigation from list, one-at-a-time lock

## Known Limitations

- **Execution lock duration**: The one-at-a-time lock covers the setup phase (status update + chat open), not the full AI execution duration. After the chat opens, the lock releases. The action item status badge ("In Progress") is the persistent visual indicator during AI execution.
- **No real-time execution progress**: Users see the AI execution progress through the chat panel conversation, not through the action item card itself.

## Related Documentation

- [Action Items Kanban](./action-items-kanban.md) — Board view where execution can be triggered
- [Customer AI Chat](./customer-ai-chat.md) — Chat panel used for execution
- [Customer AI Agents Reference](../ai-agents-and-prompts/customer-agents-reference.md) — Agent tools and routing
- [Action Item Execution Flow](../flows/action-item-execution-flow.md) — Step-by-step user flow
- [Spec Phase 1](../ideation/action-item-execution/spec-phase-1.md) — Implementation specification
- [Spec Phase 2](../ideation/action-item-execution/spec-phase-2.md) — Phase 2 specification
