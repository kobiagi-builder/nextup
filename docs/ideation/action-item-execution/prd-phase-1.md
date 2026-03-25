# PRD: Action Item Execution - Phase 1

**Contract**: ./contract.md
**Phase**: 1 of 2
**Focus**: Execute tool, Execute button, and chat-based execution flow

## Phase Overview

Phase 1 delivers the core execution capability: a new `executeActionItem` tool for the Customer Management Agent, an "Execute" button on action item cards (to-do status only), and the navigation + auto-trigger flow into the customer chat.

This phase is sequenced first because it delivers the primary value proposition — one-click action item execution. Without the backend tool and the frontend trigger, no other features (result linking, state management) are meaningful.

After Phase 1, users can click Execute on any to-do action item. The system will change status to in_progress, navigate to the customer chat, inject an execution trigger message, and the Customer Agent will autonomously execute the task — producing documents, action items, customer updates, or summaries using all existing tools.

## User Stories

1. As a consultant, I want to click "Execute" on a to-do action item so that the AI agent autonomously handles the task without me having to manually provide context.
2. As a consultant, I want to see the agent's execution progress in real-time in the customer chat so that I understand what the agent is doing and can intervene if needed.
3. As a consultant, I want the agent to intelligently route between Customer Management and Product Management capabilities so that the right tools are used for the task.
4. As a consultant, I want the agent to decline tasks it cannot handle (e.g., "Call the CEO") and explain why, so that I know which items require manual action.

## Functional Requirements

### Execute Button (Frontend)

- **FR-1.1**: Display an "Execute" button on action item cards with status `todo` only. The button should not appear for `in_progress`, `on_hold`, `done`, or `cancelled` items.
- **FR-1.2**: The Execute button appears in two locations:
  - `ActionItemRow` component (customer > action items tab)
  - `KanbanCard` component (portfolio-level action items board — todo column only)
- **FR-1.3**: Clicking Execute performs three actions in sequence:
  1. Updates the action item status to `in_progress` via existing `useUpdateActionItem` / `useUpdateBoardActionItem` mutation
  2. Navigates to the customer detail page with the chat panel open
  3. Sends an auto-trigger message to the customer chat with the action item context
- **FR-1.4**: The Execute button uses a distinctive visual treatment (e.g., Play icon or Zap icon) to differentiate it from other action buttons. Design via /interface-design skill.

### Execute Tool (Backend)

- **FR-1.5**: Create a new `executeActionItem` tool registered on the Customer Management Agent. The tool accepts an `actionItemId` parameter.
- **FR-1.6**: The execute tool performs the following context gathering:
  1. Fetches the full action item record (description, type, due_date, reported_by)
  2. Fetches full customer context via existing `buildCustomerContext()` (customer info, agreements, events, action items, documents, initiatives)
  3. Constructs an execution brief that explains the objective to the agent
- **FR-1.7**: After context gathering, the tool returns the execution brief to the agent, which then uses its existing tools (document creation, research, analysis, action item creation, customer info updates, etc.) to fulfill the objective.
- **FR-1.8**: The Customer Agent prompt is updated to include instructions for handling execute requests — including when to handoff to the Product Management Agent.

### Auto-Trigger Message

- **FR-1.9**: The frontend sends a specially formatted message to the chat when Execute is clicked. The message includes:
  - Action item ID
  - Action item description
  - Action item type
  - A clear instruction to execute the action item
- **FR-1.10**: The message format should trigger the Customer Agent to call the `executeActionItem` tool as its first action.

### Agent Routing

- **FR-1.11**: The Customer Agent receives the execution request first. Based on the action item's nature (type, description), it either:
  - Handles directly using its own tools (customer outreach, event logging, status updates, meeting analysis)
  - Hands off to the Product Management Agent via existing handoff mechanism for product-related tasks (competitive analysis, roadmap, strategy, research)
- **FR-1.12**: The agent can decline execution if the task requires human action. When declining:
  - The action item status reverts to `todo`
  - A clear explanation is provided in the chat
  - An event log entry is created noting the declined execution attempt

### Status Management

- **FR-1.13**: On execution start: status changes from `todo` to `in_progress`
- **FR-1.14**: On successful execution: status changes to `done` (agent calls `updateActionItemStatus`)
- **FR-1.15**: On failed/declined execution: status reverts to `todo` with explanation in chat

## Non-Functional Requirements

- **NFR-1.1**: Execute button click-to-chat-visible must complete within 500ms (navigation + chat panel open)
- **NFR-1.2**: The execute tool context gathering must complete within 2 seconds
- **NFR-1.3**: No PII logged during execution — use boolean flags per production logging security rules
- **NFR-1.4**: Execute flow must work on both light and dark mode themes

## Dependencies

### Prerequisites

- Existing Customer Management Agent with tool registration system
- Existing handoff mechanism between agents
- Existing `buildCustomerContext()` utility
- Existing chat streaming infrastructure (`POST /api/customer-ai/stream`)
- Existing action item CRUD hooks and mutations

### Outputs for Next Phase

- Working execute flow (button → status change → navigate → chat trigger → agent execution)
- Execute tool registered and functional
- Agent prompt updated with execution handling instructions

## Acceptance Criteria

- [ ] Execute button visible on `ActionItemRow` cards with status `todo` only
- [ ] Execute button visible on `KanbanCard` cards in the todo column only
- [ ] Clicking Execute changes action item status to `in_progress`
- [ ] Clicking Execute navigates to the customer detail page with chat panel open
- [ ] An auto-trigger message is sent to the chat with action item context
- [ ] Customer Agent calls `executeActionItem` tool and receives execution brief
- [ ] Agent produces at least one output (document, action item, customer update, or summary)
- [ ] Agent can handoff to Product Management Agent for product-related action items
- [ ] Agent can decline execution for human-only tasks, reverting status to `todo`
- [ ] Failed execution reverts status to `todo` with explanation in chat
- [ ] Execute button does not appear on non-todo action items
- [ ] No TypeScript compilation errors (`npm run build`)

## Open Questions

- Should the auto-trigger message be visible to the user in the chat, or should it be a hidden system message?
- Should the execute tool fetch additional context beyond what `buildCustomerContext()` provides (e.g., related documents' full content)?
- How should the agent determine "done" — should it call `updateActionItemStatus(done)` explicitly, or should the controller detect completion?

---

*Review this PRD and provide feedback before spec generation.*
