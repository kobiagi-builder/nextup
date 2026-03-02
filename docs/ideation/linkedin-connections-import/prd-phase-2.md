# PRD: LinkedIn Connections Import - Phase 2

**Contract**: ./contract.md
**Phase**: 2 of 2
**Focus**: LinkedIn company enrichment, ICP settings, ICP scoring engine, auto-status assignment, ICP filter

## Phase Overview

Phase 2 adds intelligence to the import pipeline. After Phase 1 creates/updates customer records, Phase 2 enriches them with LinkedIn company data and evaluates ICP fit. This transforms the import from a data entry tool into a pipeline qualification tool.

This phase is sequenced second because it builds on Phase 1's customer records and schema. The enrichment step fetches company details from LinkedIn (employee count, about, industry, specialties). The ICP scoring engine then compares these details against the user's ICP criteria using a hybrid approach: formula-based scoring for quantitative fields (employee count range) and low-cost LLM evaluation for qualitative comparison (industry fit, company description alignment).

After Phase 2, imported connections are not just contacts - they're qualified leads with ICP correlation scores and automatic status assignment.

## User Stories

1. As an advisor, I want imported customers automatically enriched with LinkedIn company data so that I have a complete picture without manual research.
2. As a consultant, I want to define my ICP with structured criteria (employee range, industries) and free text so that scoring is both precise and flexible.
3. As a user, I want each customer scored against my ICP (Low/Medium/High/Very High) so that I can prioritize my outreach.
4. As a user, I want new customers with Low ICP automatically set to "Not relevant" so that my pipeline stays focused.
5. As a user, I want to filter my Customers list by ICP score so that I can quickly find high-fit prospects.
6. As a user, I want enrichment to skip recently-updated customers (< 30 days) so that API/scraping costs stay low.

## Functional Requirements

### LinkedIn Company Enrichment

- **FR-2.1**: For each new or stale (>30 days since last enrichment) customer processed during import, attempt to fetch LinkedIn company data.
- **FR-2.2**: Enrichment data to extract:
  - `employee_count`: Number or range (e.g., "51-200") from Company size field
  - `about`: Company description/summary
  - `industry`: Primary industry
  - `specialties`: List of specialties/focus areas
- **FR-2.3**: Enrichment approach (ordered by preference):
  1. **LinkedIn company page scraping**: Construct company URL from name, scrape public page. Use existing `publicationScraper.ts` patterns with cheerio/turndown.
  2. **LLM with web access fallback**: If scraping fails or is unreliable, use a low-cost LLM (claude-haiku or gpt-4o-mini) with web browsing capability to extract structured data from the company's LinkedIn page.
- **FR-2.4**: Store enrichment data in `customer.info.enrichment` JSONB:
  ```json
  {
    "employee_count": "51-200",
    "about": "Company description...",
    "industry": "Software Development",
    "specialties": ["SaaS", "AI", "Enterprise"],
    "source": "linkedin_scrape" | "llm_enrichment",
    "updated_at": "2026-02-28T..."
  }
  ```
- **FR-2.5**: Enrichment freshness check: skip if `enrichment.updated_at` is within 30 days. Only enrich new customers or those with stale/missing enrichment.
- **FR-2.6**: Enrichment failures should not block the import. Log the failure, mark enrichment as failed, continue with next record.
- **FR-2.7**: Rate limit enrichment requests (max 2 per second) to avoid LinkedIn blocks.

### ICP Settings (User-Level)

- **FR-2.8**: Create an ICP Settings section accessible from user settings or a dedicated area. Stores user's ideal customer criteria.
- **FR-2.9**: Structured ICP fields:
  - `target_employee_range`: Min and max employee count (e.g., 50-500)
  - `target_industries`: Multi-select list of industries (predefined list with custom add)
  - `target_specialties`: Multi-select list of specialties/keywords
- **FR-2.10**: Keep existing free-text ICP description field (in `customer.info.icp`). This is used for qualitative LLM comparison.
- **FR-2.11**: Store ICP settings in a user-level location (e.g., `user_preferences` table or a dedicated `icp_settings` table). Not per-customer.
- **FR-2.12**: ICP settings should have a "last updated" timestamp. Changes to settings should trigger a prompt to re-score existing customers (optional, not automatic).

### ICP Scoring Engine

- **FR-2.13**: ICP scoring runs after enrichment for each enriched customer. Produces a composite score mapped to: Low, Medium, High, Very High.
- **FR-2.14**: Quantitative scoring (formula-based, no LLM cost):
  - **Employee count match**: Compare `enrichment.employee_count` range against `icp_settings.target_employee_range`. Exact overlap = full points, partial overlap = partial, no overlap = zero.
  - **Industry match**: Check if `enrichment.industry` matches any `icp_settings.target_industries`. Direct match = full points, related industry = partial (if detectable), no match = zero.
  - **Specialties match**: Count overlap between `enrichment.specialties` and `icp_settings.target_specialties`. Calculate overlap percentage.
- **FR-2.15**: Qualitative scoring (LLM-based, low-cost model):
  - Compare `enrichment.about` + overall customer info against user's free-text ICP description.
  - Use claude-haiku or gpt-4o-mini for the comparison.
  - Prompt returns a 0-100 qualitative alignment score.
  - Run only if free-text ICP description exists and enrichment.about is available.
- **FR-2.16**: Composite score calculation:
  - Weighted average: Quantitative (60%) + Qualitative (40%). If qualitative is unavailable, use 100% quantitative.
  - Mapping: 0-30 = Low, 31-55 = Medium, 56-80 = High, 81-100 = Very High.
  - Store as `customer.info.icp_score`: `'low' | 'medium' | 'high' | 'very_high'`
- **FR-2.17**: ICP score stored on the customer record, visible in Customer detail and list views.

### Auto-Status Assignment

- **FR-2.18**: After ICP scoring, if the customer was **newly created** during this import:
  - ICP = Low → set status to "Not relevant" (new status value, mapped to 'archive' or new enum)
  - ICP = Medium, High, or Very High → set status to "Lead"
- **FR-2.19**: Existing customers (matched, not created) retain their current status regardless of ICP score.
- **FR-2.20**: The "Not relevant" status question: either add as a new status value or map to existing "archive" with a reason tag. Design decision needed.

### ICP Score Filter (Customers Page)

- **FR-2.21**: Add an ICP score filter to the Customers list page alongside existing status and search filters.
- **FR-2.22**: Filter options: All, Low, Medium, High, Very High, Not Scored.
- **FR-2.23**: Filter uses URL params (e.g., `?icp=high`) consistent with existing filter pattern.
- **FR-2.24**: Update the `get_customer_list_summary` RPC to support ICP score filtering.

### Import Results Enhancement

- **FR-2.25**: Extend Phase 1 import results to include enrichment stats:
  - Customers enriched (count)
  - Enrichment skipped - fresh data (count)
  - Enrichment failed (count + reasons)
  - ICP scores assigned: breakdown by level (X Low, Y Medium, Z High, W Very High)
  - Auto-status changes applied (count)

## Non-Functional Requirements

- **NFR-2.1**: Enrichment for 100 companies should complete within 5 minutes (rate limited at 2/sec = ~50 seconds for scraping + processing time).
- **NFR-2.2**: LLM ICP scoring for 100 customers should cost less than $0.50 total (using haiku/gpt-4o-mini).
- **NFR-2.3**: Enrichment failures must not corrupt or block the import flow.
- **NFR-2.4**: ICP score filter on Customers page must not degrade list load time (indexed query).
- **NFR-2.5**: No company descriptions, about text, or enrichment data logged in production (business-sensitive data).

## Dependencies

### Prerequisites

- Phase 1 complete (import pipeline, schema extensions, feature flag)
- `customer.info.enrichment` JSONB structure available
- `customer.info.icp_score` field available and filterable
- AI Service infrastructure (AIService.ts with model access)
- LinkedIn scraping patterns (publicationScraper.ts)

### Outputs for Next Phase

- Complete LinkedIn import pipeline with enrichment and scoring
- ICP settings infrastructure (reusable for manual re-scoring)
- Enrichment service (reusable for scheduled enrichment in future)

## Acceptance Criteria

- [ ] New/stale customers are enriched with LinkedIn company data during import
- [ ] Enrichment extracts employee count, about, industry, specialties
- [ ] Fresh customers (< 30 days) skip enrichment
- [ ] Enrichment failures don't block the import
- [ ] Rate limiting prevents LinkedIn blocks (max 2 req/sec)
- [ ] ICP settings page allows structured criteria (employee range, industries, specialties)
- [ ] Free-text ICP description is preserved alongside structured fields
- [ ] ICP scoring produces Low/Medium/High/Very High for enriched customers
- [ ] Quantitative scoring uses formula (no LLM cost)
- [ ] Qualitative scoring uses low-cost LLM (haiku/gpt-4o-mini)
- [ ] New customers with Low ICP are auto-set to "Not relevant"
- [ ] New customers with Medium+ ICP are auto-set to "Lead"
- [ ] Existing customers retain their current status
- [ ] Customers page has ICP score filter (All, Low, Medium, High, Very High, Not Scored)
- [ ] Import results include enrichment and ICP scoring stats
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] No sensitive data in production logs

## Feature Rollout

Same flag as Phase 1: `linkedin_import`. No additional flag needed - enrichment and ICP scoring are integral parts of the import feature.

## Open Questions

- **Enrichment reliability**: LinkedIn company page scraping needs a tech spike to validate. Fallback to LLM with web access may be the practical default.
- **"Not relevant" status**: Should this be a new status value or map to existing "archive"? Needs UX decision.
- **ICP score weights**: The 60/40 quantitative/qualitative split is a starting point. May need tuning based on user feedback.
- **Re-scoring trigger**: When ICP settings change, should existing customers be re-scored automatically or on-demand?

---

*Review this PRD and provide feedback before spec generation.*
