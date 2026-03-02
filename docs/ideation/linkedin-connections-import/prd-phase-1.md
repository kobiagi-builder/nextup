# PRD: LinkedIn Connections Import - Phase 1

**Contract**: ./contract.md
**Phase**: 1 of 2
**Focus**: Database schema, CSV upload, company/team member matching & upsert, edge cases, import results UI

## Phase Overview

Phase 1 establishes the core import pipeline: users upload a LinkedIn-exported CSV and the system creates or updates Customer records and team members automatically. This phase delivers immediate value - users can populate their pipeline in seconds rather than manually entering each contact.

This phase is sequenced first because it lays the database foundation (schema extensions, new fields) that Phase 2's enrichment and ICP scoring depend on. After Phase 1, users have a working import flow with intelligent matching, edge case handling, and clear results feedback.

The feature is gated behind a `linkedin_import` rollout flag for gradual rollout.

## User Stories

1. As an advisor, I want to upload my LinkedIn connections CSV so that my customer pipeline is populated automatically without manual data entry.
2. As a consultant, I want the system to match imported connections to existing customers so that I don't get duplicate company records.
3. As a user, I want team members matched by email (primary) and name (fallback) so that existing contacts are updated rather than duplicated.
4. As a user, I want connections from "stealth" or "confidential" companies grouped under an "Enclosed company" record so that these contacts aren't lost.
5. As a user, I want invalid company entries (personal names, gibberish) automatically skipped so that my customer list stays clean.
6. As a user, I want to see a clear summary of import results (created, updated, skipped, errors) so that I know exactly what happened.
7. As a user, I want team members to have a clickable LinkedIn URL that opens their profile in a new tab so that I can quickly access their LinkedIn.

## Functional Requirements

### CSV Upload & Parsing

- **FR-1.1**: Provide a CSV upload UI accessible from the Customers page (button or menu item). Gated by `linkedin_import` feature flag.
- **FR-1.2**: Accept CSV files with columns: First Name, Last Name, URL, Email Address, Company, Position. Validate column headers on upload.
- **FR-1.3**: Parse CSV on the backend. Handle common encoding issues (UTF-8 BOM, etc.).
- **FR-1.4**: Validate each row: skip rows with empty Company field. Trim whitespace from all fields.
- **FR-1.5**: Show a parsing error if the CSV structure doesn't match expected columns.

### Company Matching & Creation

- **FR-1.6**: For each row, normalize the company name (trim, lowercase) and check against existing Customer records (case-insensitive match on `name`).
- **FR-1.7**: If a matching Customer exists, use it. If not, create a new Customer with `name` from CSV, `status` = 'lead' (default), and empty `info`.
- **FR-1.8**: Detect "enclosed" company patterns using a configurable blocklist: "stealth", "confidential", "building", "coming soon", "stealth mode", "TBD", "undisclosed", and common variations (case-insensitive, partial match).
- **FR-1.9**: Route enclosed-company connections to a per-user Customer record named "Enclosed company". Create this record if it doesn't exist for the user.
- **FR-1.10**: Detect non-company entries using heuristics:
  - Personal names: two-word entries where both words are capitalized and not common company words
  - Known non-company strings: "none", "self-employed", "freelance", "independent", country names, job titles
  - Very short entries: single character, numbers only, fewer than 2 characters
  - Skip these rows and include them in the "skipped" count with reason.

### Team Member Matching & Upsert

- **FR-1.11**: For each connection within a matched/created company, match against existing team members:
  1. **Email match (primary)**: If CSV email matches an existing team member's email, it's a match.
  2. **Name match (fallback)**: If no email match, compare First+Last name (case-insensitive, trimmed) against existing team member names.
- **FR-1.12**: If team member exists (matched): update LinkedIn URL, position/role, and email (if previously empty). Track as "updated" in results.
- **FR-1.13**: If team member doesn't exist: create with name (First + Last), role (Position), email, LinkedIn URL. Track as "created" in results.
- **FR-1.14**: LinkedIn URL field on team members must be stored and displayed as a clickable link that opens in a new tab.

### Database Schema Extensions

- **FR-1.15**: Extend the `TeamMember` type in `customer.info.team[]` to include `linkedin_url: string` field.
- **FR-1.16**: Add database columns/JSONB fields for future enrichment (Phase 2 readiness):
  - `customer.info.enrichment`: `{ employee_count, about, industry, specialties, updated_at }`
  - `customer.info.icp_score`: `'low' | 'medium' | 'high' | 'very_high' | null`
  - `customer.info.icp_settings` (user-level, not per-customer): stored separately or in user preferences
- **FR-1.17**: Add `icp_score` as a filterable field in the customer list query/RPC.

### Import Results UI

- **FR-1.18**: After import completes, show a results summary dialog/panel with:
  - Total rows processed
  - Companies created (count)
  - Companies matched (existing, count)
  - Team members created (count)
  - Team members updated (count)
  - Rows skipped (count + expandable list with reasons: "non-company", "empty company", etc.)
  - Errors (count + expandable list with row number and error message)
- **FR-1.19**: Show a progress indicator during import (processing X of Y rows).
- **FR-1.20**: Handle partial failures: if some rows fail, continue processing remaining rows and report failures.

### Feature Flag

- **FR-1.21**: Create `linkedin_import` feature flag in `feature_flags` table with `default_state = false`.
- **FR-1.22**: Backend import endpoint checks `is_feature_active(uid, 'linkedin_import')` before processing.
- **FR-1.23**: Frontend conditionally renders the import button/UI based on feature flag status.

## Non-Functional Requirements

- **NFR-1.1**: Import of 500 connections (typical LinkedIn export size) should complete within 30 seconds.
- **NFR-1.2**: CSV parsing must handle files up to 5MB (approximately 5,000 connections).
- **NFR-1.3**: Import must be idempotent - uploading the same CSV twice should only update, not create duplicates.
- **NFR-1.4**: All database operations within a single import should use a transaction or batch approach to prevent partial corruption.
- **NFR-1.5**: No PII (emails, names) logged in production. Use boolean flags (hasEmail, hasMatch) per logging security rules.

## Dependencies

### Prerequisites

- Existing Customer CRUD operations (complete)
- Existing team member management in CustomerInfoSection (complete)
- Feature flag system (`feature_flags` + `customer_features` tables) (complete)
- Multer file upload middleware pattern (complete, from writing-examples)

### Outputs for Next Phase

- Extended TeamMember type with `linkedin_url`
- Enrichment placeholder fields in customer.info
- `icp_score` field on customers with filter support
- Import infrastructure (endpoint, parsing, matching) that Phase 2 hooks enrichment into

## Acceptance Criteria

- [ ] User can upload a CSV from the Customers page (button visible only with feature flag)
- [ ] CSV with valid LinkedIn export columns is parsed correctly
- [ ] Invalid CSV structure shows clear error message
- [ ] Existing companies are matched (case-insensitive name)
- [ ] New companies are created with default "lead" status
- [ ] Team members are matched by email first, then name
- [ ] Existing team members have LinkedIn URL and position updated
- [ ] New team members are created with all available fields
- [ ] "Stealth"/"Confidential" companies route to "Enclosed company" record
- [ ] Personal names and non-company entries are skipped
- [ ] Import results show counts for created, updated, skipped, and errors
- [ ] Skipped rows show reasons
- [ ] LinkedIn URLs on team members are clickable (open new tab)
- [ ] Same CSV imported twice doesn't create duplicates
- [ ] Feature flag `linkedin_import` gates the feature
- [ ] No PII in production logs
- [ ] All unit tests passing
- [ ] Integration tests passing

## Feature Rollout

| Property | Value |
|----------|-------|
| Flag Name | `linkedin_import` |
| Description | Gates access to LinkedIn connections CSV import feature |
| Default State | `false` (gradual rollout) |
| Initial Accounts | User's account UID |

**Rollout Requirements:**
- **RR-1.1**: Create feature flag `linkedin_import` in `feature_flags` table with `default_state = false`
- **RR-1.2**: Enable flag for initial account in `customer_features` table
- **RR-1.3**: Backend must check `is_feature_active(uid, 'linkedin_import')` before serving import endpoint
- **RR-1.4**: Frontend must check feature flag status and conditionally render import UI

## Open Questions

- Exact threshold for "personal name" vs "company name" heuristic - may need tuning after real-world testing
- Whether to show a CSV preview (parsed rows) before confirming import - deferred to UX design review

---

*Review this PRD and provide feedback before spec generation.*
