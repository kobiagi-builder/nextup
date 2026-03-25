# Action Item Execution Contract

**Created**: 2026-03-21
**Confidence Score**: 92/100
**Status**: Draft

## Problem Statement

NextUp users accumulate action items (follow-ups, research tasks, proposals, deliveries, reviews) in their customer management workflow. These action items sit in "to-do" status, requiring the user to manually open a chat, provide context, and instruct the AI agent to do the work — even though the system already has all the context needed (customer info, action item description, event history, documents, initiatives).

This creates friction: the user is the bottleneck between a clearly defined task and the AI agents that can execute it. Every action item requires the user to context-switch, formulate a prompt, and babysit the agent — defeating the purpose of having an AI-powered operating system.

The users most affected are advisors and consultants managing multiple customers, where dozens of action items accumulate across their portfolio. Without one-click execution, the backlog grows and value delivery slows.

## Goals

1. **One-click execution**: User clicks "Execute" on any to-do action item and the system autonomously gathers context, routes to the right agent, and executes the task — no manual prompting required.
2. **Intelligent agent routing**: The Customer Management Agent receives the execution request first and either handles it directly or delegates to the Product Management Agent based on the action item's nature.
3. **Rich execution output**: Execution can produce any combination of: new documents/artifacts, new follow-up action items, customer info updates, and execution summaries — leveraging all 50+ existing tools across both agents.
4. **Transparent execution log**: The user sees the agent's work streamed in real-time via the existing customer chat thread, providing full visibility into what the agent did, what it found, and what it produced.
5. **Graceful failure handling**: If the agent determines it cannot execute the action item (requires human action, insufficient context), it reverts the status to to-do and explains why.

## Success Criteria

- [ ] "Execute" button appears on action item cards with status "to-do" in both the action items screen and customer > action items tab
- [ ] Clicking Execute changes action item status to "in_progress" and navigates to the customer chat
- [ ] The customer chat receives an auto-injected message with the action item context, triggering the Customer Agent
- [ ] Customer Agent either handles the task directly or hands off to Product Management Agent via existing handoff mechanism
- [ ] A new `executeActionItem` tool is available that pulls full customer context (customer info, action items, events, documents, initiatives) and understands the action item objective
- [ ] Execution can produce: documents/artifacts, new action items, customer info updates, event log entries
- [ ] On successful execution, action item status updates to "done" and the card shows a link to any created document
- [ ] On failed/declined execution, action item status reverts to "to-do" with an explanation note added to the action item or chat
- [ ] Agent can decline execution for tasks requiring human action (e.g., "Schedule a call with CEO") with a clear explanation
- [ ] The execute flow reuses the existing chat thread — no new conversation created
- [ ] One execution at a time — Execute button disabled/hidden while another execution is in progress

## Scope Boundaries

### In Scope

- New "Execute" button on action item cards (to-do status only) in:
  - Portfolio-level action items screen
  - Customer > Action Items tab
- New `executeActionItem` tool for the Customer Management Agent
- Auto-injection of action item context into customer chat as a trigger message
- Agent routing: Customer Agent first-pass, handoff to Product Mgmt Agent if needed
- Status management: to-do → in-progress → done (success) or to-do (failure)
- Document link on action item card after successful execution
- Leveraging ALL existing tools across both agents (document creation, research, analysis, strategy, meeting analysis, etc.)
- UI design for Execute button and execution states via /interface-design skill

### Out of Scope

- Batch execution of multiple action items — single execution only for v1
- Parallel execution — one at a time
- New action item statuses (no "review" or "blocked" status) — use existing status enum
- Execution history/audit log beyond what the chat thread captures
- Custom execution parameters or user configuration before execution
- Offline or scheduled execution — immediate only
- New agent types — uses existing Customer Mgmt and Product Mgmt agents

### Future Considerations

- Batch/bulk execution of selected action items
- Parallel execution with a dashboard showing all running executions
- Execution templates or pre-configured execution strategies per action item type
- Scheduled execution (execute at a specific time)
- Execution approval workflow (agent proposes plan, user approves before execution)
- Execution analytics (success rate, average duration, most common outputs)

---

*This contract was generated from brain dump input. Review and approve before proceeding to PRD generation.*
