# LinkedIn Team Members Extraction Contract

**Created**: 2026-03-04
**Confidence Score**: 96/100
**Status**: Draft

## Problem Statement

When a user adds a customer with a LinkedIn company URL, the system enriches company data (name, vertical, about) but does NOT extract team members from the company's People page. Team members are only extracted when a **person** LinkedIn URL (`/in/`) is provided, not from company pages (`/company/`).

This means users must manually add each team member one-by-one, despite LinkedIn having a full list of company employees at `linkedin.com/company/[slug]/people/`. This is tedious for consultants who need to quickly map out key stakeholders at a new client company.

Additionally, there is no visual feedback when a LinkedIn URL or Website URL is invalid or when scraping fails -- the user has no way to know something went wrong unless they notice missing data.

## Goals

1. **Auto-extract relevant team members** from LinkedIn company `/people/` page, filtered by role relevance using AI (single batch request per company, not per-person)
2. **Track team member origin** (`manual` vs `linkedin_scrape`) so the system can sync LinkedIn-sourced members without affecting manually-added ones
3. **Provide 4 trigger points** for team extraction: new customer creation, LinkedIn URL update, company scrape refresh, and manual "Sync from LinkedIn" button
4. **Show URL validation errors** inline next to LinkedIn URL and Website URL fields when format is invalid or scraping failed
5. **Store allowed roles per account** in a database table with sensible defaults (Founder, C-level, VP, PM, Design -- excluding HR), no UI for now

## Success Criteria

- [ ] Creating a customer with a LinkedIn company URL auto-extracts filtered team members within 10s
- [ ] Updating a customer's LinkedIn URL triggers team re-extraction
- [ ] "Sync from LinkedIn" button in team tab adds missing members and soft-deletes stale LinkedIn-sourced members (hidden from UI, preserved in data)
- [ ] Manually-added team members are never modified or removed by sync operations
- [ ] Each team member has a `source` field: `manual` | `linkedin_scrape`
- [ ] AI role filtering uses a single Haiku request for all scraped people (not per-person)
- [ ] Only members matching allowed role categories pass the filter (Founder, C-level, VP, PM, Design)
- [ ] HR roles are explicitly excluded
- [ ] `team_role_filters` database table stores per-account role config with defaults
- [ ] Error info icon appears next to LinkedIn URL when URL is invalid or scraping failed
- [ ] Error info icon appears next to Website URL when URL is invalid or scraping failed
- [ ] "Sync from LinkedIn" button is disabled with tooltip when no valid LinkedIn URL exists
- [ ] Frontend and backend build with zero TypeScript errors

## Scope Boundaries

### In Scope

- Backend service: scrape LinkedIn `/people/` page via Tavily, extract names + roles
- Backend service: AI role-matching using Claude Haiku 4.5 (single batch call)
- Backend: `team_role_filters` table with user_id, roles JSONB, defaults
- Backend: new API endpoint `POST /api/customers/:id/sync-team-from-linkedin`
- Backend: integrate team extraction into existing `enrichAndScoreNewCustomer()` pipeline
- Backend: trigger team extraction on LinkedIn URL update in `updateCustomer`
- Frontend: "Sync from LinkedIn" button in TeamSection with disabled state + tooltip
- Frontend: error info icons next to LinkedIn URL and Website URL fields
- Frontend: `source` field on TeamMember type (`manual` | `linkedin_scrape`)
- Frontend: soft-deleted members hidden from team list display
- Backward compatibility: existing team members without `source` default to `manual`

### Out of Scope

- UI for managing role filters -- configured via database only for now
- Scraping individual person LinkedIn profiles for detailed info (just names + roles from company page)
- Email/phone extraction from LinkedIn (not available on company People page)
- Pagination of LinkedIn People page (handle first page only; most relevant roles are listed first)
- Real-time WebSocket updates during extraction -- use polling/delayed refetch like existing ICP scoring

### Future Considerations

- Admin UI for role filter configuration
- LinkedIn People page pagination for large companies (500+ employees)
- Automatic periodic re-sync of team members (scheduled job)
- Integration with LinkedIn API (official) instead of web scraping
- Team member deduplication across multiple sources (CSV import + LinkedIn scrape)

---

*This contract was generated from brain dump input. Review and approve before proceeding to PRD generation.*
