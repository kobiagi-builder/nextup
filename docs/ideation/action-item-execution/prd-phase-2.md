# PRD: Action Item Execution - Phase 2

**Contract**: ./contract.md
**Phase**: 2 of 2
**Focus**: Result linking, execution state management, and UX polish

## Phase Overview

Phase 2 enhances the execution experience with result visibility and execution state management. After Phase 1 delivers the core execute flow, Phase 2 adds the ability to see execution results directly on action item cards (document links), prevents concurrent executions, and provides visual feedback during execution.

This phase is sequenced second because it improves the experience but doesn't block core functionality. Users can already execute action items after Phase 1 — Phase 2 makes the results more discoverable and the UX more polished.

After Phase 2, completed action items show linked documents, the UI prevents multiple simultaneous executions, and execution states (loading, in-progress, complete) are clearly communicated.

## User Stories

1. As a consultant, I want to see a link to the created document on my completed action item card so that I can quickly access the execution results.
2. As a consultant, I want the Execute button to be disabled while another action item is executing so that I don't accidentally trigger multiple executions.
3. As a consultant, I want visual feedback on the action item card when execution is in progress so that I know which item is being worked on.
4. As a consultant, I want to see an execution summary on the action item after completion so that I know what the agent did without opening the chat.

## Functional Requirements

### Document Link on Action Item Card

- **FR-2.1**: When an action item is executed and produces a document, the action item record stores a reference to the created document (`document_id` field on `customer_action_items` table).
- **FR-2.2**: `ActionItemRow` displays a clickable document link below the description when `document_id` is present. Clicking navigates to the document view.
- **FR-2.3**: `KanbanCard` displays a small document icon with the document title when `document_id` is present on done cards.
- **FR-2.4**: The execute tool updates the action item with the `document_id` after successful document creation.

### Execution State Management

- **FR-2.5**: Track execution state in the frontend (e.g., via Zustand store or React Query mutation state). Only one action item can be executing at a time.
- **FR-2.6**: While an execution is in progress:
  - The executing action item card shows a loading/pulse animation
  - Other to-do action items' Execute buttons are disabled with a tooltip: "Another action item is executing"
  - The executing card shows "Executing..." status indicator
- **FR-2.7**: When execution completes (status changes to `done` or reverts to `todo`), the execution lock is released and other items can be executed.

### Execution Summary

- **FR-2.8**: After successful execution, the action item stores an `execution_summary` field (text) describing what the agent did.
- **FR-2.9**: `ActionItemRow` displays the execution summary as a collapsible section below the description on done items.
- **FR-2.10**: The execute tool updates the action item with the execution summary after completion.

### Database Schema

- **FR-2.11**: Add `document_id` (UUID, nullable, FK to `customer_documents`) to `customer_action_items` table.
- **FR-2.12**: Add `execution_summary` (text, nullable) to `customer_action_items` table.
- **FR-2.13**: Update RLS policies to allow the new columns to be read/written by authenticated users.

## Non-Functional Requirements

- **NFR-2.1**: Document link resolution must not add additional API calls — use existing query data or join in the action items query.
- **NFR-2.2**: Execution state must persist across page navigation within the same session (Zustand store).
- **NFR-2.3**: Loading animations must be smooth (CSS-based, not JS interval).
- **NFR-2.4**: Database migration must be backwards-compatible (nullable columns only).

## Dependencies

### Prerequisites

- Phase 1 complete (execute flow working end-to-end)
- Existing `customer_action_items` table
- Existing `customer_documents` table

### Outputs for Next Phase

- N/A — this is the final phase

## Acceptance Criteria

- [ ] `customer_action_items` table has `document_id` and `execution_summary` columns
- [ ] Executed action items show a clickable document link when a document was created
- [ ] Clicking the document link navigates to the document view
- [ ] Only one action item can be executing at a time (other Execute buttons disabled)
- [ ] Executing action item card shows loading/pulse animation
- [ ] Execution summary is displayed on completed action items
- [ ] Execution state persists across page navigation within the session
- [ ] Database migration is backwards-compatible
- [ ] No TypeScript compilation errors (`npm run build`)

---

*Review this PRD and provide feedback before spec generation.*
