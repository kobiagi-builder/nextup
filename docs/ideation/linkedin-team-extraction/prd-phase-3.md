# PRD: LinkedIn Team Extraction - Phase 3

**Contract**: ./contract.md
**Phase**: 3 of 3
**Focus**: Auto-triggers - extraction on creation, URL update, and scrape refresh

## Phase Overview

Phase 3 completes the feature by automating team extraction across all trigger points. After this phase, team members are automatically extracted whenever a LinkedIn company URL enters the system -- whether through customer creation, URL update, or scrape refresh. Users no longer need to manually click "Sync from LinkedIn" (though they still can).

This comes last because it depends on both the backend pipeline (Phase 1) and the frontend display (Phase 2). Auto-triggers are the automation layer on top of an already-working manual flow.

## User Stories

1. As a consultant, I want team members auto-extracted when I create a customer with a LinkedIn URL so that key stakeholders appear without extra steps
2. As a consultant, I want team members re-extracted when I update a customer's LinkedIn URL so that the team list stays current with the new company
3. As a consultant, I want team members refreshed when company info scraping is triggered so that the team list is always up-to-date

## Functional Requirements

### Auto-Extract on Customer Creation

- **FR-3.1**: In `enrichAndScoreNewCustomer()` (customer.controller.ts), after enrichment and ICP scoring, check if `customer.info.linkedin_company_url` exists. If yes, call `syncTeamFromLinkedIn()` as part of the fire-and-forget pipeline.
- **FR-3.2**: Team extraction failure must not block or fail the overall enrichment pipeline -- catch and log errors, continue.
- **FR-3.3**: Frontend delayed refetch (already exists at 5s) will pick up the new team members without additional changes.

### Auto-Extract on LinkedIn URL Update

- **FR-3.4**: In the `updateCustomer` controller, detect when `info.linkedin_company_url` changes (compare old vs new value). If changed to a new valid URL, trigger team sync in the background (fire-and-forget).
- **FR-3.5**: If LinkedIn URL is removed (set to empty/null), do NOT delete existing team members -- they remain as-is.
- **FR-3.6**: Add 5-second delayed invalidation on `useUpdateCustomer` hook (same pattern as `useCreateCustomer`) to pick up background extraction results.

### Auto-Extract on Company Scrape Refresh

- **FR-3.7**: When company enrichment is triggered via `POST /api/customers/:id/enrich` (or equivalent scrape refresh), include team extraction as part of the enrichment pipeline.
- **FR-3.8**: Team sync during refresh follows the same merge logic: add new `linkedin_scrape` members, soft-delete stale `linkedin_scrape` members, never touch `manual` members.

### Error Handling

- **FR-3.9**: When auto-extraction fails, populate `customer.info.enrichment_errors.linkedin` with the error reason (e.g., "Failed to extract team members from LinkedIn"). This enables the Phase 2 error icon to display.
- **FR-3.10**: When auto-extraction succeeds, clear `customer.info.enrichment_errors.linkedin` if it was previously set.

## Non-Functional Requirements

- **NFR-3.1**: Auto-extraction must not increase customer creation response time -- it runs fire-and-forget after 201 response
- **NFR-3.2**: Total background pipeline (enrichment + ICP + team extraction) should complete within 20 seconds
- **NFR-3.3**: Rate limiting awareness: if multiple rapid URL updates occur, debounce to avoid hammering Tavily/LinkedIn

## Dependencies

### Prerequisites

- Phase 1 complete: `scrapeLinkedInPeople()`, `filterTeamByRoles()`, sync endpoint
- Phase 2 complete: frontend displays `source`/`hidden` correctly, error icons work
- Existing `enrichAndScoreNewCustomer()` pipeline
- Existing `updateCustomer` controller

### Outputs for Next Phase

- N/A (final phase)

## Acceptance Criteria

- [ ] Creating a customer with a LinkedIn URL auto-extracts team members within 15s
- [ ] Updating a customer's LinkedIn URL triggers team re-extraction
- [ ] Removing a LinkedIn URL does NOT delete existing team members
- [ ] Company scrape refresh includes team extraction
- [ ] Auto-extraction failures are logged and populate `enrichment_errors.linkedin`
- [ ] Successful extraction clears previous `enrichment_errors.linkedin`
- [ ] Manual members are never affected by auto-extraction
- [ ] Fire-and-forget pattern: customer creation/update response time is not affected
- [ ] Frontend delayed refetch picks up auto-extracted members
- [ ] Backend builds with zero TypeScript errors

---

*Review this PRD and provide feedback before spec generation.*
