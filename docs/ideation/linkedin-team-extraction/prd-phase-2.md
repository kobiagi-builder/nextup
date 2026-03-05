# PRD: LinkedIn Team Extraction - Phase 2

**Contract**: ./contract.md
**Phase**: 2 of 3
**Focus**: Frontend UI - Sync button, URL validation, source tracking

## Phase Overview

Phase 2 adds the user-facing UI for the team extraction feature. After this phase, users can manually trigger a LinkedIn team sync from the customer detail page, see which members came from LinkedIn vs manual entry, and get visual feedback when URLs are invalid or scraping failed.

This phase comes after Phase 1 because it depends on the backend sync endpoint and the updated TeamMember data model. After Phase 2, users have full manual control over team sync -- Phase 3 then automates it.

## User Stories

1. As a consultant, I want a "Sync from LinkedIn" button in the team tab so that I can pull in key stakeholders from the company's LinkedIn page with one click
2. As a consultant, I want to see an error icon next to the LinkedIn URL when it's invalid or scraping failed so that I know something needs attention
3. As a consultant, I want to see an error icon next to the Website URL when it's invalid or scraping failed so that I have clear feedback
4. As a consultant, I want the sync button disabled with a tooltip when there's no valid LinkedIn URL so that I understand why I can't sync

## Functional Requirements

### TeamMember Type Updates (Frontend)

- **FR-2.1**: Update frontend `TeamMember` interface to include `source?: 'manual' | 'linkedin_scrape'` and `hidden?: boolean`.
- **FR-2.2**: Filter out `hidden: true` members from the team list display in `TeamSection.tsx`. They remain in the data but are invisible to users.
- **FR-2.3**: When a user manually adds a team member, set `source: 'manual'` automatically.

### Sync from LinkedIn Button

- **FR-2.4**: Add a "Sync from LinkedIn" button in `TeamSection.tsx` header row, next to the existing "+ Add" button. Use LinkedIn icon from Lucide.
- **FR-2.5**: Button is **enabled** when `customer.info.linkedin_company_url` exists and is a valid LinkedIn company URL format.
- **FR-2.6**: Button is **disabled** with a tooltip: "Add a LinkedIn company URL to sync team members" when no valid URL exists.
- **FR-2.7**: On click, call `POST /api/customers/:id/sync-team-from-linkedin`. Show loading spinner on button during request.
- **FR-2.8**: On success, show toast: "Team synced: {added} added, {removed} removed". Invalidate customer detail query to refresh team list.
- **FR-2.9**: On failure, show toast with error message. No retry -- user can click again.

### React Query Hook

- **FR-2.10**: New hook `useSyncTeamFromLinkedIn()` in customer hooks. Mutation that calls the sync endpoint and invalidates customer detail + list queries on success.

### URL Validation Error Icons

- **FR-2.11**: In the customer detail page header (or info section where LinkedIn URL is displayed), show a red `AlertCircle` (Lucide) icon next to the LinkedIn URL when: (a) URL format is invalid (doesn't match `linkedin.com/company/` pattern), or (b) last scraping attempt failed (tracked via `customer.info.enrichment_errors?.linkedin`).
- **FR-2.12**: Same pattern for Website URL: show red `AlertCircle` icon when: (a) URL format is invalid, or (b) last scraping attempt failed (tracked via `customer.info.enrichment_errors?.website`).
- **FR-2.13**: Error icon should have a tooltip explaining the issue: "Invalid LinkedIn URL format" or "LinkedIn scraping failed - click to retry" (or similar).

### Enrichment Error Tracking

- **FR-2.14**: Add `enrichment_errors` field to `CustomerInfo` type: `{ linkedin?: string; website?: string }`. Backend populates this when scraping fails with a human-readable error message. Cleared on successful scrape.

## Non-Functional Requirements

- **NFR-2.1**: Sync button click-to-completion must feel responsive -- show loading state within 100ms, complete within 15s
- **NFR-2.2**: All new portaled components (tooltips) must include `data-portal-ignore-click-outside` attribute
- **NFR-2.3**: Error icons must be accessible -- include `aria-label` for screen readers

## Dependencies

### Prerequisites

- Phase 1 complete: backend sync endpoint, TeamMember `source`/`hidden` fields, `team_role_filters` table
- Existing `TeamSection.tsx` component
- Existing customer detail page with info display

### Outputs for Next Phase

- Frontend fully renders `source` and `hidden` fields
- `useSyncTeamFromLinkedIn` hook available for reuse
- `enrichment_errors` field in CustomerInfo for error display

## Acceptance Criteria

- [ ] "Sync from LinkedIn" button visible in team section header
- [ ] Button disabled with tooltip when no LinkedIn URL exists
- [ ] Button enabled and functional when valid LinkedIn URL exists
- [ ] Clicking sync shows loading state, then success/error toast
- [ ] Team list only shows members where `hidden !== true`
- [ ] New manually-added members get `source: 'manual'`
- [ ] Red error icon appears next to invalid LinkedIn URL
- [ ] Red error icon appears next to invalid Website URL
- [ ] Error icon shows tooltip with explanation
- [ ] Frontend builds with zero TypeScript errors

---

*Review this PRD and provide feedback before spec generation.*
