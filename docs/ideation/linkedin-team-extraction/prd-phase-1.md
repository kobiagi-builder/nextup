# PRD: LinkedIn Team Extraction - Phase 1

**Contract**: ./contract.md
**Phase**: 1 of 3
**Focus**: Data model + backend extraction pipeline

## Phase Overview

Phase 1 establishes the foundation: data model changes, the LinkedIn People page scraping service, AI role filtering, and the backend API endpoint. After this phase, the backend can extract, filter, and store team members from any LinkedIn company URL -- but it's only callable via API (no frontend UI yet).

This must come first because Phase 2 (frontend) and Phase 3 (auto-triggers) both depend on this backend infrastructure. The data model changes (`source` field, `team_role_filters` table, soft-delete `hidden` flag) underpin all subsequent work.

## User Stories

1. As an API consumer, I want to call `POST /api/customers/:id/sync-team-from-linkedin` so that relevant team members are extracted from the LinkedIn People page and saved to the customer record
2. As a system administrator, I want a `team_role_filters` table with default role categories so that the AI only includes relevant roles (Founder, C-level, VP, PM, Design) and excludes HR
3. As a developer, I want each team member to have a `source` field (`manual` | `linkedin_scrape`) so that sync operations can distinguish user-created from auto-extracted members

## Functional Requirements

### Data Model

- **FR-1.1**: Add `source` field to `TeamMember` interface: `'manual' | 'linkedin_scrape'`. Default to `'manual'` for backward compatibility with existing team members that lack this field.
- **FR-1.2**: Add `hidden` boolean field to `TeamMember` for soft-deletion. When `true`, the member is preserved in JSONB but excluded from display. Default `false`.
- **FR-1.3**: Create `team_role_filters` table: `id` (uuid PK), `user_id` (uuid FK to auth.users, unique), `roles` (JSONB array of role category objects), `created_at`, `updated_at`. Apply RLS: users can only read/write their own row.
- **FR-1.4**: Seed default role categories in code (not DB seed): `[{ category: "founder", patterns: ["founder", "co-founder"] }, { category: "c_level", patterns: ["chief", "ceo", "cto", "cmo", "coo", "cro", "ciso", "cfo"] }, { category: "vp", patterns: ["vp", "vice president"] }, { category: "product_management", patterns: ["product manager", "director of product", "head of product", "product lead"] }, { category: "product_design", patterns: ["product designer", "ux", "ui", "experience designer", "design lead", "head of design"] }]`. Exclusions: `["hr", "human resources", "people operations", "talent", "recruiting", "recruiter"]`.

### LinkedIn People Page Scraping

- **FR-1.5**: New method `EnrichmentService.scrapeLinkedInPeople(companySlug: string)` that constructs URL `https://www.linkedin.com/company/{slug}/people/` and uses Tavily search to extract a list of people with their names and role titles.
- **FR-1.6**: Extract company slug from various LinkedIn URL formats: `linkedin.com/company/acme`, `linkedin.com/company/acme/`, `linkedin.com/company/acme/people/`, `linkedin.com/company/acme/about/`.
- **FR-1.7**: Return type: `Array<{ name: string; role: string; linkedin_url?: string }>`. Handle cases where Tavily returns incomplete data gracefully (skip entries missing name or role).

### AI Role Filtering

- **FR-1.8**: New method `EnrichmentService.filterTeamByRoles(people: Array<{name, role}>, roleFilters: RoleFilter[])` that sends a single Claude Haiku 4.5 request with the full list of scraped people and role filter configuration.
- **FR-1.9**: The AI prompt instructs Haiku to return a JSON array of indices (or names) that match the allowed categories, explicitly excluding HR roles. Prompt must include both inclusion patterns and exclusion patterns.
- **FR-1.10**: Parse Haiku response, handle markdown-fenced JSON (strip ` ```json ` wrappers), validate output, return filtered list.

### API Endpoint

- **FR-1.11**: New route `POST /api/customers/:id/sync-team-from-linkedin` (authenticated). Validates LinkedIn URL exists in `customer.info.linkedin_company_url`. Returns 400 if missing/invalid.
- **FR-1.12**: Endpoint logic: (1) extract slug, (2) scrape People page, (3) load role filters for user (or defaults), (4) AI-filter by roles, (5) merge results into existing team: add new members with `source: 'linkedin_scrape'`, soft-delete (`hidden: true`) existing `linkedin_scrape` members not found in latest scrape, never touch `manual` members.
- **FR-1.13**: Return response: `{ added: number, removed: number, total: number, members: TeamMember[] }`.

### Backward Compatibility

- **FR-1.14**: All existing team members without a `source` field are treated as `manual` in code. No data migration needed -- handle at read time.
- **FR-1.15**: All existing team members without a `hidden` field are treated as `hidden: false`.

## Non-Functional Requirements

- **NFR-1.1**: LinkedIn People page scraping + AI filtering must complete within 15 seconds per company
- **NFR-1.2**: AI role filtering must use Claude Haiku 4.5 (`claude-haiku-4-5-20251001`) to minimize cost (~$0.001 per company sync)
- **NFR-1.3**: No PII logged -- use boolean flags per production logging security rules
- **NFR-1.4**: Zod validation on all API inputs and AI response parsing

## Dependencies

### Prerequisites

- Existing `EnrichmentService` with Tavily integration
- Existing `CustomerService` with `merge_customer_info()` RPC
- Existing `TeamMember` type in both frontend and backend
- Anthropic SDK configured in backend

### Outputs for Next Phase

- `TeamMember` type with `source` and `hidden` fields
- `team_role_filters` table with RLS
- Working `POST /api/customers/:id/sync-team-from-linkedin` endpoint
- `EnrichmentService.scrapeLinkedInPeople()` and `filterTeamByRoles()` methods

## Acceptance Criteria

- [ ] `TeamMember` interface includes `source?: 'manual' | 'linkedin_scrape'` and `hidden?: boolean`
- [ ] `team_role_filters` table exists with RLS policies
- [ ] `POST /api/customers/:id/sync-team-from-linkedin` returns 200 with team data for valid customer with LinkedIn URL
- [ ] Endpoint returns 400 when customer has no LinkedIn URL
- [ ] AI filtering uses single Haiku request, not per-person
- [ ] HR roles are excluded from results
- [ ] Existing team members without `source` default to `manual`
- [ ] Soft-deleted members have `hidden: true` but remain in JSONB
- [ ] Manual members are never modified by sync
- [ ] Backend builds with zero TypeScript errors

---

*Review this PRD and provide feedback before spec generation.*
