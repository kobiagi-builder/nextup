# Implementation Spec: Action Item Execution - Phase 1

**PRD**: ./prd-phase-1.md
**Estimated Effort**: L (Large)

## Technical Approach

The implementation follows a three-layer approach: backend tool → frontend trigger → agent prompt update.

**Backend**: A new `executeActionItem` tool is added to the Customer Management Agent's tool set. This tool accepts an action item ID, fetches the full action item record and customer context via existing `buildCustomerContext()`, constructs an execution brief, and returns it to the agent. The agent then uses its existing tools (and can handoff to Product Mgmt Agent) to fulfill the objective. The tool also handles status transitions (in_progress on start, done on success, revert to todo on failure/decline).

**Frontend**: An "Execute" button (Zap icon) is added to `ActionItemRow` and `KanbanCard` components, visible only on todo-status items. Clicking it: (1) updates status to in_progress, (2) navigates to the customer detail page, (3) opens the chat panel, and (4) sends an auto-trigger message with the action item context. The message is visible in the chat as a user message.

**Agent Prompt**: The Customer Agent system prompt is updated with execution handling instructions — how to interpret execute requests, when to handoff to Product Mgmt, and when to decline.

## File Changes

### New Files

| File Path | Purpose |
|-----------|---------|
| `backend/src/services/ai/agents/customer-mgmt/tools/executeActionItemTool.ts` | The `executeActionItem` tool — fetches action item + customer context, constructs execution brief |
| `frontend/src/features/customers/hooks/useExecuteActionItem.ts` | Custom hook encapsulating the execute flow: status update → navigate → send chat message |

### Modified Files

| File Path | Changes |
|-----------|---------|
| `frontend/src/features/customers/components/action-items/ActionItemRow.tsx` | Add Execute button (Zap icon) for todo-status items |
| `frontend/src/features/action-items/components/KanbanCard.tsx` | Add Execute button (Zap icon) for todo-status items |
| `backend/src/services/ai/agents/customer-mgmt/tools/index.ts` | Register `executeActionItem` tool in the customer agent's tool set |
| `backend/src/services/ai/agents/customer-mgmt/prompt/customerAgentPrompts.ts` | Add execution handling instructions to agent system prompt |
| `backend/src/controllers/customer-ai.controller.ts` | Handle execution trigger messages (optional: detect and set metadata) |

## UX & UI Design

### Execute Button — ActionItemRow (List View)

**Placement**: Between the due date picker and the status badge dropdown, in the right-side action area.

**Visual Treatment**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [Enhancement]  Fix competitor pricing table for Q2...      📅 Mar 25  ⚡ [To Do] [⋯] │
│                 Reported by Sarah                                                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                                               ↑
                                                          Execute button
                                                          (Zap icon)
```

**States (ActionItemRow)**:

| State | Visual |
|-------|--------|
| Default | `h-7 w-7` ghost icon button, `text-muted-foreground`, appears on row hover (`opacity-0 group-hover:opacity-100`) |
| Hover | `bg-primary/10 text-primary` — cyan tint background with cyan icon (dark mode), blue tint with blue icon (light mode) |
| Active/pressed | `scale-[0.95]` micro-press feedback |
| Disabled | `opacity-50 cursor-not-allowed` — shown when another item is executing |
| Loading | `animate-pulse text-primary` — pulsing cyan/blue Zap icon, replaces the button while this item executes |

**Implementation**:

```tsx
// Execute button — only visible on todo items
{item.status === 'todo' && (
  <button
    type="button"
    title="Execute with AI"
    onClick={(e) => {
      e.stopPropagation()
      onExecute(item)
    }}
    disabled={isExecuting}
    className={cn(
      'p-1 rounded transition-all',
      'opacity-0 group-hover:opacity-100',
      isExecutingThis
        ? 'opacity-100 animate-pulse text-primary'
        : 'text-muted-foreground hover:bg-primary/10 hover:text-primary hover:opacity-100',
      'active:scale-[0.95]',
      'disabled:opacity-50 disabled:cursor-not-allowed'
    )}
  >
    <Zap className="h-4 w-4" />
  </button>
)}
```

### Execute Button — KanbanCard (Board View)

**Placement**: Bottom row, right side (opposite the customer name), only in the todo column.

**Visual Treatment**:

```
┌─────────────────────────────┐
│ [Enhancement]      📅 Mar 25 │
│ Fix competitor pricing       │
│ table for Q2 review...       │
│ Reported by Sarah            │
│ 👥 Acme Corp            ⚡  │
│                     Execute  │
└─────────────────────────────┘
```

**States (KanbanCard)**: Same as ActionItemRow, but always visible (not hover-gated) since kanban cards are compact and the button serves as a primary action for todo items.

**Implementation**:

```tsx
// Bottom row of KanbanCard — add Execute for todo items
<div className="flex items-center justify-between gap-1.5">
  <div className="flex items-center gap-1.5 min-w-0">
    <Users className="h-3 w-3 text-muted-foreground shrink-0" />
    <span className="text-xs text-muted-foreground truncate">
      {item.customer_name || 'General'}
    </span>
  </div>
  {item.status === 'todo' && (
    <button
      type="button"
      title="Execute with AI"
      onClick={(e) => {
        e.stopPropagation()
        onExecute?.(item)
      }}
      disabled={isExecuting}
      className={cn(
        'p-1 rounded transition-all',
        isExecutingThis
          ? 'animate-pulse text-primary'
          : 'text-muted-foreground hover:bg-primary/10 hover:text-primary',
        'active:scale-[0.95]',
        'disabled:opacity-50 disabled:cursor-not-allowed'
      )}
    >
      <Zap className="h-3.5 w-3.5" />
    </button>
  )}
  {/* existing in_progress quick actions */}
  {item.status === 'in_progress' && onStatusChange && (
    // ... existing Pause/Done buttons
  )}
</div>
```

### Auto-Trigger Message (Chat)

When the user clicks Execute, a visible user message appears in the chat:

```
┌──────────────────────────────────────────────────┐
│                                          You     │
│  Execute action item: "Fix competitor pricing    │
│  table for Q2 review"                            │
│  Type: Enhancement | Due: Mar 25, 2026           │
│  Please execute this action item for customer    │
│  Acme Corp.                                      │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│  Customer Agent                                  │
│  I'll execute this action item. Let me start by  │
│  gathering the relevant context...               │
│                                                  │
│  [Agent streams execution progress]              │
└──────────────────────────────────────────────────┘
```

## Implementation Details

### 1. executeActionItem Tool (Backend)

**Pattern to follow**: `backend/src/services/ai/agents/customer-mgmt/tools/actionItemTools.ts`

**Overview**: A new Zod-validated tool that fetches the action item record and full customer context, then returns an execution brief for the agent to act on.

```typescript
// Tool schema
const executeActionItemSchema = z.object({
  actionItemId: z.string().uuid().describe('The ID of the action item to execute'),
})

// Tool implementation
async function executeActionItem({ actionItemId }: { actionItemId: string }) {
  // 1. Fetch the action item
  const { data: actionItem } = await supabase
    .from('customer_action_items')
    .select('*')
    .eq('id', actionItemId)
    .single()

  if (!actionItem) {
    return { success: false, error: 'Action item not found' }
  }

  // 2. Update status to in_progress
  await supabase
    .from('customer_action_items')
    .update({ status: 'in_progress' })
    .eq('id', actionItemId)

  // 3. Build customer context (reuse existing builder)
  const customerContext = await buildCustomerContext(actionItem.customer_id)

  // 4. Construct execution brief
  const brief = buildExecutionBrief(actionItem, customerContext)

  return {
    success: true,
    brief,
    actionItemId,
    customerId: actionItem.customer_id,
  }
}
```

**Execution Brief Structure**:

```typescript
function buildExecutionBrief(actionItem: ActionItem, customerContext: string): string {
  return `
## Execution Brief

### Objective
Execute the following action item for this customer:
- **Description**: ${actionItem.description}
- **Type**: ${actionItem.type}
- **Due Date**: ${actionItem.due_date || 'No due date'}
- **Reported By**: ${actionItem.reported_by || 'Unknown'}

### Instructions
1. Analyze the action item objective in the context of this customer
2. Determine the best approach using your available tools
3. Execute the task — create documents, conduct research, update customer info, or create follow-up items as needed
4. When complete, update the action item status to "done" using updateActionItemStatus
5. If you cannot execute this task (requires human action like scheduling a call), explain why and revert the status to "todo"

### Customer Context
${customerContext}
`
}
```

**Key decisions**:
- The tool returns the brief as a string, not structured data — this gives the agent maximum flexibility to interpret and act
- Status is updated to `in_progress` inside the tool, not by the frontend, to ensure atomicity
- The tool reuses `buildCustomerContext()` for consistency with existing context injection

**Implementation steps**:
1. Create `executeActionItemTool.ts` with Zod schema and handler
2. Import and register in the customer agent's tool set
3. Add the `buildExecutionBrief` helper function

### 2. useExecuteActionItem Hook (Frontend)

**Pattern to follow**: `frontend/src/features/customers/hooks/useActionItems.ts`

**Overview**: Custom hook that encapsulates the full execute flow — status update, navigation, and chat message injection.

```typescript
import { useNavigate } from 'react-router-dom'
import { useChatStore } from '@/stores/chatStore'
import { useUpdateActionItem } from './useActionItems'
import type { ActionItem } from '../types'

export function useExecuteActionItem(customerId: string) {
  const navigate = useNavigate()
  const updateActionItem = useUpdateActionItem(customerId)
  const sendMessage = useChatStore((s) => s.sendMessage)
  const openChat = useChatStore((s) => s.openChat)

  const execute = async (item: ActionItem) => {
    // 1. Update status to in_progress
    await updateActionItem.mutateAsync({ id: item.id, status: 'in_progress' })

    // 2. Navigate to customer detail page
    navigate(`/customers/${customerId}`)

    // 3. Open chat panel
    openChat(customerId)

    // 4. Send trigger message
    const message = buildTriggerMessage(item)
    sendMessage(customerId, message)
  }

  return { execute, isExecuting: updateActionItem.isPending }
}

function buildTriggerMessage(item: ActionItem): string {
  const parts = [
    `Execute action item: "${item.description}"`,
    `Type: ${item.type}${item.due_date ? ` | Due: ${item.due_date}` : ''}`,
    `Please execute this action item.`,
  ]
  return parts.join('\n')
}
```

**Key decisions**:
- The hook handles navigation internally — the component just calls `execute(item)`
- The trigger message is a visible user message (per user preference) — not a hidden system message
- Status update happens first, so if navigation fails the item is already marked in_progress

**Implementation steps**:
1. Create the hook with status update, navigation, chat open, and message send
2. Verify `chatStore` has `openChat` and `sendMessage` methods (may need to add `openChat`)
3. Wire up in both `ActionItemRow` and `KanbanCard`

### 3. ActionItemRow Modifications (Frontend)

**Pattern to follow**: Existing button patterns in `ActionItemRow.tsx` (due date picker, status badge)

**Overview**: Add Zap icon button between due date and status badge, visible only for todo items.

**Implementation steps**:
1. Import `Zap` from `lucide-react`
2. Add `onExecute` callback to `ActionItemRowProps`
3. Add `isExecuting` prop (boolean — another item is currently executing)
4. Render Zap button conditionally when `item.status === 'todo'`
5. Button appears on hover (`opacity-0 group-hover:opacity-100`)
6. Click calls `onExecute(item)` with `e.stopPropagation()`

### 4. KanbanCard Modifications (Frontend)

**Pattern to follow**: Existing quick action buttons in `KanbanCard.tsx` (Pause/Done for in_progress)

**Overview**: Add Zap icon button to bottom row for todo-status cards.

**Implementation steps**:
1. Import `Zap` from `lucide-react`
2. Add `onExecute` callback to `KanbanCardProps`
3. Add `isExecuting` prop
4. Render Zap button in bottom row for `item.status === 'todo'`
5. Button is always visible (not hover-gated) since kanban cards are compact

### 5. Agent Prompt Update (Backend)

**Pattern to follow**: Existing tool instructions in `customerAgentPrompts.ts`

**Overview**: Add execution handling section to the Customer Agent system prompt.

```typescript
// Addition to system prompt
const executionInstructions = `
## Action Item Execution

When you receive a message asking to "Execute action item", follow this protocol:

1. **Call executeActionItem** with the action item ID extracted from the message context
2. **Read the execution brief** returned by the tool
3. **Determine approach**:
   - If the task is customer-relationship focused (follow-up email, meeting prep, customer outreach, status update, event logging), handle it directly with your tools
   - If the task is product-focused (competitive analysis, roadmap planning, strategy, market research, product spec, feature design), handoff to the Product Management Agent
   - If the task requires human action (schedule a meeting, make a phone call, sign a contract), decline execution
4. **Execute using your tools** — create documents, conduct research, update customer info, create follow-up action items
5. **Mark complete** — call updateActionItemStatus with status "done" when finished
6. **If declining** — call updateActionItemStatus with status "todo" and explain why in your response

### Decline Criteria
Decline execution (revert to todo) when:
- Task requires physical human action (scheduling, calling, meeting in person)
- Task requires access to external systems you cannot reach
- Task is too vague to produce meaningful output (explain what's needed)

### Handoff Criteria
Handoff to Product Management Agent when the action item involves:
- Competitive analysis or market research
- Product roadmap or strategy creation
- Product specifications or feature design
- User research or persona development
- Launch planning or growth strategy
`
```

**Key decisions**:
- The prompt explicitly defines routing criteria (customer vs product vs decline)
- Handoff uses the existing handoff mechanism — no new infrastructure
- The agent must always end with a status update (done or revert to todo)

### 6. KanbanBoard + ActionItemsBoardPage Wiring

**Overview**: Pass the `onExecute` callback and `isExecuting` state through the component tree.

**Implementation steps**:
1. In `ActionItemsBoardPage`, create the execute handler using `useExecuteActionItem`
2. Pass `onExecute` and `isExecuting` down through `KanbanBoard` → `KanbanCard`
3. For the board page, the customerId comes from `item.customer_id` (each kanban card has its own customer)
4. The navigate/chat-open logic in the hook handles cross-customer execution

### 7. ActionItemsTab Wiring

**Overview**: Wire the execute flow in the customer detail page's action items tab.

**Implementation steps**:
1. In `ActionItemsTab`, create the execute handler using `useExecuteActionItem(customerId)`
2. Pass `onExecute` and `isExecuting` to each `ActionItemRow`
3. Since we're already on the customer page, navigation is simpler — just open the chat panel

## Data Model

No schema changes in Phase 1. The existing `customer_action_items` table and status enum are sufficient.

The execute tool reads from:
- `customer_action_items` — action item record
- `customers` — customer context (via `buildCustomerContext`)
- `customer_events` — recent events (via context builder)
- `customer_documents` — recent documents (via context builder)
- `customer_initiatives` — active initiatives (via context builder)
- `customer_agreements` — agreements (via context builder)

## API Design

No new REST endpoints. The execute flow uses:
- Existing action item update mutation (status change to in_progress)
- Existing chat stream endpoint (`POST /api/customer-ai/stream`) with the trigger message
- The `executeActionItem` tool is called by the agent during stream processing

## Testing Requirements

### Unit Tests

| Test File | Coverage |
|-----------|----------|
| `backend/src/services/ai/agents/customer-mgmt/tools/__tests__/executeActionItemTool.test.ts` | Tool logic: context building, brief generation, error handling |

**Key test cases**:
- Tool returns execution brief with correct action item data
- Tool returns error for non-existent action item ID
- Tool updates status to in_progress on successful fetch
- Execution brief includes full customer context
- Brief format includes all required sections (objective, instructions, context)

### Integration Tests

| Test File | Coverage |
|-----------|----------|
| `backend/src/services/ai/agents/customer-mgmt/__tests__/executeFlow.integration.test.ts` | End-to-end: trigger message → tool call → agent execution |

**Key scenarios**:
- Agent calls executeActionItem tool when receiving trigger message
- Agent hands off to Product Mgmt Agent for product-related action items
- Agent declines human-only tasks and reverts status
- Agent marks item done after successful execution

### Manual Testing

- [ ] Click Execute on a todo action item in ActionItemRow — status changes, navigates to chat, trigger message appears
- [ ] Click Execute on a todo KanbanCard — same flow works from board view
- [ ] Execute button does NOT appear on in_progress, done, cancelled, on_hold items
- [ ] Agent executes a customer-focused action item (e.g., "Draft follow-up email to CEO")
- [ ] Agent hands off a product-focused action item (e.g., "Research competitor pricing")
- [ ] Agent declines a human-only action item (e.g., "Schedule lunch with VP of Engineering")
- [ ] Verify dark mode and light mode rendering of Execute button
- [ ] Verify Execute button hover state shows cyan/blue tint

## Error Handling

| Error Scenario | Handling Strategy |
|----------------|-------------------|
| Action item not found (deleted between click and execution) | Tool returns error, agent communicates in chat, no status change |
| Status update fails (network error) | Toast error "Failed to start execution", no navigation |
| Chat message send fails | Toast error, status reverts to todo |
| Agent execution errors mid-stream | Agent explains in chat, status stays in_progress (user can manually revert) |
| Customer context fetch fails | Tool returns partial brief with available data, agent proceeds with limited context |

## Validation Commands

```bash
# Type checking
cd frontend && npx tsc --noEmit
cd backend && npx tsc --noEmit

# Build
npm run build

# Unit tests
npm run test

# Manual verification
npm run dev  # Start both frontend and backend
```

## Rollout Considerations

- **Feature flag**: None — available to all users immediately (per contract)
- **Monitoring**: Watch agent interaction logs for execute tool calls, success/failure rates
- **Rollback plan**: Remove Execute button from frontend (single commit revert). Tool remains registered but unused.

---

*This spec is ready for implementation. Follow the patterns and validate at each step.*
