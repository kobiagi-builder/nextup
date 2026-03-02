# LinkedIn Connections Import - Contract

**Created**: 2026-02-28
**Confidence Score**: 95/100
**Status**: Draft

## Problem Statement

Advisors, consultants, and fractional service providers build their client pipeline primarily through LinkedIn networking. Today, when they export their LinkedIn connections, there is no way to automatically feed those contacts into their customer management system. Each company and team member must be created manually - a tedious process that discourages users from maintaining an up-to-date pipeline.

Beyond data entry, there's no automated way to evaluate whether a connection's company fits the user's Ideal Customer Profile (ICP). The current ICP field is free text with no scoring mechanism, meaning users must manually assess each potential customer's fit - a process that doesn't scale.

Without solving this, users either maintain disconnected spreadsheets alongside NextUp, or simply don't track their network systematically - resulting in missed opportunities and an incomplete customer pipeline.

## Goals

1. **Automated pipeline building** - Users can upload a LinkedIn connections CSV and have customers and team members created/updated automatically, reducing manual data entry from minutes-per-record to a single upload action.
2. **Intelligent matching** - The system correctly matches existing companies and team members using email-first + name-fallback fuzzy logic, avoiding both duplicates and missed matches.
3. **Company enrichment** - Customer records are automatically enriched with LinkedIn company data (employee count, about, industry, specialties) when the data is stale (>30 days) or the customer is new.
4. **ICP scoring** - Each enriched customer receives a structured ICP correlation score (Low/Medium/High/Very High) using a hybrid approach: formula-based scoring for quantitative fields + LLM scoring for qualitative comparison.
5. **Pipeline automation** - New customers are automatically assigned a status based on ICP score: "Not relevant" for Low, "Lead" for Medium+.

## Success Criteria

- [ ] User can upload a LinkedIn-exported CSV and see a summary of results (created, updated, skipped, errors)
- [ ] Existing companies are matched by name; existing team members matched by email first, then name
- [ ] Upsert behavior: existing records are updated (LinkedIn URL, position, email), new records are created
- [ ] Companies matching "enclosed" patterns (Stealth, Confidential, etc.) are grouped under "Enclosed company"
- [ ] Non-company entries (personal names, country names, gibberish) are skipped with clear indication
- [ ] Customer records are enriched with LinkedIn company data (employee count, about, industry, specialties)
- [ ] Enrichment respects freshness: only runs for new customers or those not updated in 30+ days
- [ ] ICP settings support hybrid mode: structured fields (employee range, industries) + free text description
- [ ] ICP scoring produces Low/Medium/High/Very High correlation for each enriched customer
- [ ] New customers with Low ICP are auto-set to "Not relevant" status; others to "Lead"
- [ ] Customers page has an ICP score filter
- [ ] Feature is gated behind a rollout flag (`linkedin_import`)
- [ ] Import handles partial failures gracefully (some records succeed even if others fail)

## Scope Boundaries

### In Scope

- CSV upload UI (drag-and-drop or file picker)
- CSV parsing and validation (expected columns: First Name, Last Name, URL, Email Address, Company, Position)
- Company matching (case-insensitive name comparison)
- Team member matching (email-first, normalized name fallback)
- Team member LinkedIn URL field (clickable, opens new tab)
- Customer and team member creation/update (upsert)
- Enclosed company detection and container grouping
- Non-company name detection and skip logic
- LinkedIn company page data scraping (low-budget approach: scraper or LLM with web access)
- Customer enrichment fields: employee_count, about, industry, specialties, enrichment_updated_at
- ICP settings: structured fields (target employee range, target industries, target specialties) + existing free text
- ICP scoring engine: formula for quantitative fields, LLM (haiku/gpt-4o-mini) for qualitative comparison
- ICP correlation level stored on customer: Low, Medium, High, Very High
- Auto-status assignment for new customers based on ICP score
- ICP score filter on Customers list page
- Import results summary UI (counts, skipped rows, errors)
- Feature flag: `linkedin_import` with gradual rollout

### Out of Scope

- LinkedIn OAuth integration - not using LinkedIn API, working with exported CSV
- Real-time LinkedIn sync or webhook - this is a manual import action
- Enrichment for existing customers not in the CSV - only processes CSV records
- Automatic re-enrichment scheduler (cron) - only enriches during import
- Team member deduplication across companies - each team member belongs to one company context
- Import history/audit log - deferred to future enhancement
- Bulk delete of imported records - deferred

### Future Considerations

- Scheduled re-enrichment of customer data (weekly/monthly cron job)
- Import history page showing past imports with undo capability
- Support for other CSV formats (HubSpot, Salesforce exports)
- LinkedIn OAuth for direct connection pull without CSV export
- Automatic ICP re-scoring when ICP settings change
- Enrichment from additional sources (Crunchbase, company website)

## Feature Rollout

| Property | Value |
|----------|-------|
| Flag Name | `linkedin_import` |
| Description | Gates access to LinkedIn connections CSV import feature |
| Default State | `false` (gradual rollout) |
| Initial Accounts | User's account UID |

## Technical Constraints

- **Enrichment approach**: Prefer LinkedIn company page scraping (cheapest). If unreliable, fall back to LLM with web access (e.g., Haiku/GPT-4o-mini with browsing). Need tech spike during implementation.
- **ICP scoring LLM**: Use lowest-cost model available (claude-haiku or gpt-4o-mini) for qualitative comparison.
- **Team member storage**: Currently stored as JSONB array in `customer.info.team[]`. LinkedIn URL and enrichment fields extend this structure.
- **Enclosed company**: Per-user record (RLS enforces user_id scoping) named "Enclosed company".
- **Non-company detection**: Heuristic-based (name patterns, known non-company strings, character analysis).

---

*This contract was generated from brain dump input. Review and approve before proceeding to PRD generation.*
