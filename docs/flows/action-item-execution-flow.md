# Action Item Execution Flow

**Created:** 2026-03-21
**Last Updated:** 2026-03-21
**Version:** 2.0.0
**Status:** Complete (Phase 1 + Phase 2)

## Overview

User flow for executing action items via AI. Covers both the customer detail page and kanban board entry points.

## Flow Diagram

```mermaid
sequenceDiagram
    actor User
    participant UI as ActionItemRow/KanbanCard
    participant Hook as useExecuteActionItem
    participant Chat as CustomerChatPanel
    participant API as POST /api/ai/customer/chat/stream
    participant Agent as Customer Mgmt Agent
    participant Tool as executeActionItem Tool
    participant DB as Supabase

    User->>UI: Click Execute (Zap) button
    UI->>Hook: execute(item, customerId, customerName, updateStatusFn)
    Hook->>DB: updateStatusFn(item.id, 'in_progress')
    Hook->>Chat: openChat with trigger message

    Note over Chat: "Execute action item: [description]<br/>Type: [type] | Due: [date]<br/>Action Item ID: [id]"

    Chat->>API: Send trigger message
    API->>Agent: Process with system prompt + context
    Agent->>Tool: executeActionItem({ actionItemId })
    Tool->>DB: Fetch action item + verify ownership
    Tool->>DB: Update status to in_progress (safety net)
    Tool->>DB: buildCustomerContext()
    Tool-->>Agent: Return execution brief

    alt Customer-scope task
        Agent->>Agent: Execute with CM tools
        Agent->>DB: updateActionItemStatus('done', document_id?, execution_summary?)
    else Product-scope task
        Agent->>Agent: handoff to PM Agent
        Note over Agent: PM Agent executes with<br/>product tools (29 tools)
        Agent->>DB: updateActionItemStatus('done', document_id?, execution_summary?)
    else Human-only task
        Agent->>DB: updateActionItemStatus('todo')
        Agent-->>Chat: Explain why declined
    end

    Agent-->>Chat: Stream execution summary
    Chat-->>User: Display results

    Note over UI: Phase 2: Done items show<br/>document link + execution summary
```

## Entry Points

### From Customer Detail Page (ActionItemsTab)

1. User is on `/customers/:id` with Action Items tab active
2. Hovers over a to-do action item card
3. Zap button appears between due date and status badge
4. Click → status changes, chat opens with trigger message

### From Kanban Board (ActionItemsBoardPage)

1. User is on `/action-items` board view
2. Zap button visible on to-do cards in the todo column
3. Click → status changes, navigates to `/customers/:id` with state
4. CustomerDetailPage detects state, opens chat after 150ms delay
5. Chat sends trigger message

## Cross-Page Navigation Detail

```mermaid
sequenceDiagram
    participant Board as ActionItemsBoardPage
    participant Router as React Router
    participant AppShell as AppShell
    participant Detail as CustomerDetailPage
    participant Chat as CustomerChatPanel

    Board->>Router: navigate('/customers/:id', { state: { executeActionItem } })
    Router->>AppShell: pathname change detected
    AppShell->>AppShell: closeChat() (close-on-navigate effect)
    Router->>Detail: Render CustomerDetailPage
    Detail->>Detail: useEffect detects location.state.executeActionItem
    Detail->>Detail: window.history.replaceState({}) (prevent re-trigger)
    Detail->>Detail: setTimeout(150ms)
    Note over Detail: Wait for AppShell's<br/>closeChat to complete
    Detail->>Chat: openCustomerChatWithMessage(initialMessage)
    Chat->>Chat: useEffect auto-sends initialMessage
```

## Phase 2: Result Visibility Flow

### Document Navigation (from done action items)

```mermaid
sequenceDiagram
    actor User
    participant Card as ActionItemRow / KanbanCard
    participant Router as React Router
    participant Detail as CustomerDetailPage
    participant DocsTab as DocumentsTab
    participant Editor as DocumentEditor

    Note over Card: Done item with document_id shows<br/>FileText icon + document title

    User->>Card: Click document link
    Card->>Router: navigate('/customers/:id', { state: { openDocumentId, switchToTab: 'documents' } })
    Router->>Detail: Render CustomerDetailPage
    Detail->>Detail: useEffect detects location.state.openDocumentId
    Detail->>Detail: setActiveTab('documents')
    Detail->>Detail: setOpenDocumentId(docId)
    Detail->>Detail: window.history.replaceState({}) (prevent re-trigger)
    Detail->>DocsTab: Pass openDocumentId prop
    DocsTab->>DocsTab: useEffect finds document by ID
    DocsTab->>Editor: setEditingDocument(doc)
    Editor-->>User: Document editor sheet opens
```

### Execution Summary Toggle

1. Done items with `execution_summary` show a "Execution summary" toggle button
2. Clicking expands a `bg-muted/50` content block with the summary text
3. Clicking again collapses it (simple `useState(false)` toggle)

### Loading Animation

1. When `useExecuteActionItem.execute()` is called, `ExecutionStore.startExecution(itemId, customerId)` sets global state
2. `ActionItemRow` and `KanbanCard` read `useExecutionStore(s => s.executingItemId)`
3. Matching items show `border-primary/30 animate-pulse` border and "Executing..." badge
4. After setup completes (status update + chat open), `endExecution()` clears the animation

## Error Paths

| Scenario | Handling |
|----------|----------|
| Action item not found | Tool returns `{ success: false }`, agent reports error |
| Action item belongs to different customer | Tool returns `{ success: false }`, ownership check fails |
| Agent execution fails | Agent reverts status to `todo` with explanation |
| Human-only task detected | Agent declines, reverts to `todo`, explains why |
| Network error during chat | Standard chat error handling, status may remain `in_progress` |
| Document navigation with null customer_id | Guard prevents navigation (KanbanCard checks `item.customer_id`) |

## Related Documentation

- [Action Item Execution Feature](../features/action-item-execution.md)
- [Customer AI Agents Reference](../ai-agents-and-prompts/customer-agents-reference.md)
- [Customer Management Flow](./customer-management-flow.md)
