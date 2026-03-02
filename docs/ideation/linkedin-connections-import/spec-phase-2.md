# Implementation Spec: LinkedIn Connections Import - Phase 2

**PRD**: ./prd-phase-2.md
**UX/UI**: ./ux-ui-design.md
**Estimated Effort**: XL (Extra Large)

## Technical Approach

Phase 2 adds intelligence to the import pipeline: LinkedIn company enrichment, ICP settings, ICP scoring, auto-status assignment, and ICP filtering. This builds on Phase 1's import infrastructure and extends it with data enrichment and scoring.

The enrichment pipeline runs as a post-import step. After Phase 1's import creates/updates customers, Phase 2 iterates over each affected customer, checks enrichment freshness (30-day threshold), and if stale/missing, fetches company data from LinkedIn. The approach is ordered by preference: (1) LinkedIn company page scraping using existing patterns from `publicationScraper.ts`, (2) LLM with web access fallback using the cheapest model (claude-haiku or gpt-4o-mini).

ICP scoring uses a hybrid engine: formula-based quantitative scoring (employee count, industry, specialties) combined with LLM-based qualitative scoring (company description vs. user's ICP description). The composite score maps to Low/Medium/High/Very High levels.

ICP settings are stored in a new `icp_settings` table (user-level, not per-customer) with structured fields alongside the existing free-text ICP description.

## File Changes

### New Files

| File Path | Purpose |
|-----------|---------|
| `backend/src/services/EnrichmentService.ts` | LinkedIn company data fetching (scraping + LLM fallback) |
| `backend/src/services/IcpScoringService.ts` | ICP scoring engine: quantitative formula + qualitative LLM |
| `backend/src/controllers/icpSettings.controller.ts` | CRUD for user-level ICP settings |
| `backend/src/routes/icpSettings.ts` | Routes for `/api/settings/icp` |
| `frontend/src/features/customers/components/import/EnrichmentResultsSection.tsx` | Enrichment + ICP stats in import results dialog |
| `frontend/src/features/settings/pages/IcpSettingsPage.tsx` | ICP settings form: employee range, industries, specialties, description |
| `frontend/src/features/settings/components/IndustryTagSelect.tsx` | Multi-select tag input for industries |
| `frontend/src/features/settings/components/SpecialtyTagInput.tsx` | Multi-select tag input for specialties |
| `frontend/src/features/settings/hooks/useIcpSettings.ts` | Query + mutation hooks for ICP settings |

### Modified Files

| File Path | Changes |
|-----------|---------|
| `backend/src/services/LinkedInImportService.ts` | Call EnrichmentService and IcpScoringService after import, extend ImportResult |
| `backend/src/services/CustomerService.ts` | Add `updateEnrichment()` and `updateIcpScore()` methods |
| `backend/src/routes/customers.ts` | Mount ICP settings routes |
| `frontend/src/features/customers/components/import/ImportResultsStep.tsx` | Add enrichment and ICP score sections |
| `frontend/src/features/customers/components/import/LinkedInImportDialog.tsx` | Handle enrichment progress in step 2 |
| `frontend/src/features/customers/types/customer.ts` | Add IcpSettings type, extend ImportResult with enrichment stats |
| `frontend/src/App.tsx` or router config | Add route for ICP settings page |

## Implementation Details

### 1. Backend: EnrichmentService

**Pattern to follow**: `backend/src/services/publicationScraper.ts`

**Overview**: Fetches LinkedIn company data using scraping (primary) or LLM (fallback). Rate-limited to 2 req/sec.

```typescript
interface CompanyEnrichment {
  employee_count: string | null  // "51-200", "1001-5000", etc.
  about: string | null            // Company description
  industry: string | null         // Primary industry
  specialties: string[] | null    // List of specialties
  source: 'linkedin_scrape' | 'llm_enrichment'
}

class EnrichmentService {
  // Rate limiter: max 2 requests per second
  private rateLimiter: RateLimiter

  /**
   * Attempt to enrich a company from its LinkedIn company page.
   * Strategy 1: Scrape LinkedIn company page
   * Strategy 2: LLM with web access (fallback)
   */
  async enrichCompany(companyName: string): Promise<CompanyEnrichment | null>

  /**
   * Build LinkedIn company URL from company name.
   * LinkedIn company URLs: linkedin.com/company/{slug}
   * Slug: lowercase, hyphens for spaces, remove special chars
   */
  private buildCompanyUrl(companyName: string): string

  /**
   * Scrape LinkedIn company page for structured data.
   * Uses existing patterns: cheerio for HTML parsing, JSON-LD extraction.
   */
  private async scrapeCompanyPage(url: string): Promise<CompanyEnrichment | null>

  /**
   * Fallback: Use LLM with web access to extract company data.
   * Uses claude-haiku or gpt-4o-mini for cost efficiency.
   */
  private async llmEnrichment(companyName: string, linkedinUrl: string): Promise<CompanyEnrichment | null>
}
```

**Key decisions**:
- Company URL construction: `linkedin.com/company/` + slugified company name. This is a best-effort heuristic - not all companies have predictable URLs.
- Scraping approach: Reuse fetch patterns from `publicationScraper.ts` (custom User-Agent, timeouts, SSRF prevention). Extract from JSON-LD or meta tags.
- LLM fallback: Use `AIService.generateResponse()` with a structured extraction prompt. Model: `claude-haiku` (cheapest). Ask for JSON output with employee_count, about, industry, specialties.
- Rate limiting: Simple token bucket (2 req/sec) using setTimeout delays between requests.
- Failure handling: Return null on failure, don't block import. Log failure with company name hash (no PII).

**Implementation steps**:
1. Create rate limiter utility (simple delay-based, not a library)
2. Implement `buildCompanyUrl()` with slugification
3. Implement `scrapeCompanyPage()` using cheerio:
   - Fetch page with custom headers
   - Extract JSON-LD data first (richest)
   - Fall back to meta tag extraction (og:description, etc.)
   - Parse employee count from "Company size" section
   - Parse industry, specialties from page content
4. Implement `llmEnrichment()` using AIService:
   - Prompt: "Extract structured company data from LinkedIn for {company}. Return JSON with: employee_count, about, industry, specialties."
   - Parse LLM response as JSON
5. Implement `enrichCompany()` orchestrator:
   - Try scraping first
   - If scraping fails/returns null, try LLM
   - If both fail, return null

### 2. Backend: IcpScoringService

**Overview**: Hybrid scoring engine combining formula-based quantitative scoring with LLM-based qualitative scoring.

```typescript
interface IcpSettings {
  id: string
  user_id: string
  target_employee_min: number | null
  target_employee_max: number | null
  target_industries: string[]
  target_specialties: string[]
  description: string | null       // Free-text ICP description
  quantitative_weight: number      // Default: 60
  qualitative_weight: number       // Default: 40
  updated_at: string
}

type IcpLevel = 'low' | 'medium' | 'high' | 'very_high'

class IcpScoringService {
  /**
   * Score a customer against user's ICP settings.
   * Returns composite score 0-100 and mapped level.
   */
  async scoreCustomer(
    enrichment: CompanyEnrichment,
    customerInfo: CustomerInfo,
    icpSettings: IcpSettings
  ): Promise<{ score: number; level: IcpLevel }>

  /**
   * Quantitative scoring (no LLM cost):
   * - Employee count: 0-100 based on range overlap
   * - Industry match: 0 or 100 (binary)
   * - Specialties overlap: 0-100 based on percentage
   * Averaged equally across available dimensions.
   */
  private scoreQuantitative(enrichment: CompanyEnrichment, settings: IcpSettings): number

  /**
   * Qualitative scoring (LLM-based):
   * Compare enrichment.about + customer info against ICP description.
   * Uses cheapest model (claude-haiku or gpt-4o-mini).
   * Returns 0-100 alignment score.
   */
  private async scoreQualitative(
    enrichment: CompanyEnrichment,
    customerInfo: CustomerInfo,
    icpDescription: string
  ): Promise<number>

  /**
   * Map numeric score to level.
   * 0-30 = Low, 31-55 = Medium, 56-80 = High, 81-100 = Very High
   */
  private mapScoreToLevel(score: number): IcpLevel
}
```

**Key decisions**:
- Employee count parsing: LinkedIn uses ranges like "51-200", "1001-5000". Parse midpoint and compare against target range. Full overlap = 100, partial = proportional, no overlap = 0.
- Industry matching: Binary (match or not). If enrichment.industry matches any target_industry (case-insensitive), score = 100, else 0. Future: semantic matching.
- Specialties: Count overlapping keywords between enrichment.specialties and target_specialties. score = (overlap / max(target.length, enrichment.length)) * 100.
- Qualitative prompt: "On a scale of 0-100, how well does this company match the ideal customer profile? Company: {about}. ICP: {description}. Return only a number."
- Weight application: `composite = (quantitative * qWeight + qualitative * qualWeight) / 100`. If qualitative unavailable (no description or no about), use 100% quantitative.

**Implementation steps**:
1. Implement employee count range parser (handle LinkedIn formats: "51-200", "1,001-5,000", "10,000+")
2. Implement `scoreQuantitative()` with three sub-scores averaged
3. Implement `scoreQualitative()` using AIService with structured prompt
4. Implement `scoreCustomer()` combining both with weights
5. Implement `mapScoreToLevel()` with configurable thresholds

### 3. Backend: ICP Settings Controller & Routes

**Pattern to follow**: `backend/src/controllers/customer.controller.ts`

```typescript
// Routes: /api/settings/icp
// GET  /api/settings/icp     - Get user's ICP settings
// PUT  /api/settings/icp     - Create or update ICP settings

// Controller
export async function getIcpSettings(req: Request, res: Response) {
  // Query icp_settings table for user_id
  // Return settings or defaults if not set
}

export async function updateIcpSettings(req: Request, res: Response) {
  // Validate with Zod
  // Upsert into icp_settings table
  // Return updated settings
}
```

### 4. Backend: Import Service Extension

Extend `LinkedInImportService` to call enrichment and scoring after core import:

```typescript
// After Phase 1 import logic completes:

// 1. Get user's ICP settings
const icpSettings = await getIcpSettings(userId)

// 2. For each affected customer (created or matched):
for (const customer of affectedCustomers) {
  // Check enrichment freshness
  const enrichment = customer.info?.enrichment
  const isStale = !enrichment?.updated_at ||
    daysSince(enrichment.updated_at) > 30

  if (isStale) {
    // Enrich (rate-limited)
    const enrichmentData = await enrichmentService.enrichCompany(customer.name)
    if (enrichmentData) {
      await customerService.updateEnrichment(customer.id, enrichmentData)
      result.enrichment.enriched++

      // Score ICP if settings exist
      if (icpSettings) {
        const { level } = await icpScoringService.scoreCustomer(
          enrichmentData, customer.info, icpSettings
        )
        await customerService.updateIcpScore(customer.id, level)
        result.icpScores[level]++

        // Auto-status for NEW customers only
        if (customer._isNew) {
          if (level === 'low') {
            await customerService.updateStatus(customer.id, 'not_relevant')
          }
          // Medium+ already defaults to 'lead' from Phase 1
        }
      }
    } else {
      result.enrichment.failed++
    }
  } else {
    result.enrichment.skippedFresh++
  }
}
```

**Extended ImportResult**:
```typescript
interface ImportResult {
  // Phase 1 fields...
  enrichment: {
    enriched: number
    skippedFresh: number
    failed: number
  }
  icpScores: {
    low: number
    medium: number
    high: number
    very_high: number
  }
  autoStatus: {
    notRelevant: number // New customers set to not_relevant
  }
}
```

### 5. Frontend: ICP Settings Page

**Overview**: Form for defining ICP criteria. Accessible from settings area.

```typescript
// IcpSettingsPage
function IcpSettingsPage() {
  const { data: settings, isLoading } = useIcpSettings()
  const updateSettings = useUpdateIcpSettings()

  // Form state for: employee range, industries, specialties, description, weights
  // On submit: PUT /api/settings/icp
}
```

**Key components**:
- `EmployeeRangeInput`: Two number inputs with "to" separator
- `IndustryTagSelect`: Combobox-style input with removable tags. Predefined list of common industries with option to add custom.
- `SpecialtyTagInput`: Free-form tag input (type + Enter to add)
- `IcpDescriptionTextarea`: Existing textarea pattern
- `ScoreWeightsDisplay`: Read-only display of 60/40 split (or adjustable sliders)

**Industry predefined list**:
```typescript
const COMMON_INDUSTRIES = [
  'Software Development', 'SaaS', 'FinTech', 'Healthcare',
  'E-commerce', 'AI/ML', 'Cybersecurity', 'EdTech',
  'MarTech', 'DevOps', 'Cloud Computing', 'Data Analytics',
  'Blockchain', 'IoT', 'Gaming', 'Media', 'Consulting',
  'Manufacturing', 'Real Estate', 'Legal Tech',
]
```

### 6. Frontend: Import Results Extension

Extend ImportResultsStep to show Phase 2 data:

```
+-- Enrichment ---------------------------------+
|  🔍  34 companies enriched                    |
|  ⏭   8 skipped (data fresh < 30 days)        |
|  ⚠   3 enrichment failed                     |
+-----------------------------------------------+

+-- ICP Scores ---------------------------------+
|  🔴  12 Low                                   |
|  🟡  15 Medium                                |
|  🟢  8 High                                   |
|  🔵  7 Very High                              |
|                                                |
|  ↪  12 set to "Not Relevant" (new + Low ICP) |
+-----------------------------------------------+
```

## Data Model

### Schema Changes

```sql
-- Migration: create_icp_settings_table
CREATE TABLE icp_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_employee_min INT,
  target_employee_max INT,
  target_industries TEXT[] DEFAULT '{}',
  target_specialties TEXT[] DEFAULT '{}',
  description TEXT,                    -- Free-text ICP description
  quantitative_weight INT DEFAULT 60,  -- 0-100
  qualitative_weight INT DEFAULT 40,   -- 0-100, must sum to 100 with quantitative
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- RLS
ALTER TABLE icp_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own ICP settings"
  ON icp_settings
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Index
CREATE INDEX idx_icp_settings_user_id ON icp_settings(user_id);

-- Update trigger for updated_at
CREATE TRIGGER set_icp_settings_updated_at
  BEFORE UPDATE ON icp_settings
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);
```

### CustomerInfo JSONB Extensions (Phase 2 populated)

```typescript
// info.enrichment (set by EnrichmentService)
{
  "enrichment": {
    "employee_count": "51-200",
    "about": "Acme Corp is a leading...",
    "industry": "Software Development",
    "specialties": ["SaaS", "AI", "Enterprise"],
    "source": "linkedin_scrape",
    "updated_at": "2026-02-28T12:00:00Z"
  }
}

// info.icp_score (set by IcpScoringService)
{
  "icp_score": "high"
}
```

### RPC Update

```sql
-- Update get_customer_list_summary to support ICP filtering
-- Modify existing function to add p_icp parameter
CREATE OR REPLACE FUNCTION get_customer_list_summary(
  p_status TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_sort TEXT DEFAULT 'updated_at',
  p_icp TEXT DEFAULT NULL  -- NEW: 'low', 'medium', 'high', 'very_high', 'not_scored'
)
RETURNS TABLE (/* existing columns */)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT /* existing select */
  FROM public.customers c
  WHERE c.user_id = auth.uid()
    AND c.deleted_at IS NULL
    AND (p_status IS NULL OR c.status = p_status)
    AND (p_search IS NULL OR c.search_vector @@ plainto_tsquery('english', p_search))
    AND (p_icp IS NULL
         OR (p_icp = 'not_scored' AND (c.info->>'icp_score') IS NULL)
         OR (c.info->>'icp_score') = p_icp)
  /* existing order by */;
END;
$$;
```

## API Design

### New Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/settings/icp` | Get user's ICP settings |
| `PUT` | `/api/settings/icp` | Create or update ICP settings |

### Request/Response

```typescript
// GET /api/settings/icp
// Response 200
{
  "id": "uuid",
  "target_employee_min": 50,
  "target_employee_max": 500,
  "target_industries": ["SaaS", "FinTech"],
  "target_specialties": ["AI", "DevOps"],
  "description": "Series A-C B2B SaaS companies...",
  "quantitative_weight": 60,
  "qualitative_weight": 40,
  "updated_at": "2026-02-28T..."
}

// PUT /api/settings/icp
// Request
{
  "target_employee_min": 50,
  "target_employee_max": 500,
  "target_industries": ["SaaS", "FinTech"],
  "target_specialties": ["AI", "DevOps"],
  "description": "Series A-C B2B SaaS companies...",
  "quantitative_weight": 60,
  "qualitative_weight": 40
}

// Response 200 (same as GET)
```

### Extended Import Response (Phase 2)

```typescript
// POST /api/customers/import/linkedin
// Response 200 (extended from Phase 1)
{
  "total": 487,
  "companies": { "created": 42, "matched": 38 },
  "teamMembers": { "created": 156, "updated": 82 },
  "skipped": [...],
  "errors": [...],
  "enrichment": {
    "enriched": 34,
    "skippedFresh": 8,
    "failed": 3
  },
  "icpScores": {
    "low": 12,
    "medium": 15,
    "high": 8,
    "very_high": 7
  },
  "autoStatus": {
    "notRelevant": 12
  }
}
```

## Testing Requirements

### Unit Tests

| Test File | Coverage |
|-----------|----------|
| `backend/src/services/__tests__/EnrichmentService.test.ts` | URL construction, scraping, LLM fallback, rate limiting |
| `backend/src/services/__tests__/IcpScoringService.test.ts` | Quantitative scoring, qualitative scoring, composite calculation, level mapping |

**Key test cases (EnrichmentService)**:
- Build correct LinkedIn company URL from various company names
- Handle company names with special characters (& , . /)
- Return null when scraping fails
- Fall back to LLM when scraping returns null
- Respect rate limiting (mock timer verification)
- Handle network timeout gracefully

**Key test cases (IcpScoringService)**:
- Employee count parsing: "51-200" → midpoint 125
- Employee count parsing: "10,000+" → treat as 10000
- Full range overlap: target 50-500, actual 51-200 → high score
- No range overlap: target 50-500, actual 10000+ → zero score
- Industry exact match → 100
- Industry no match → 0
- Specialties partial overlap → proportional score
- Composite with 60/40 weights
- Score-to-level mapping: 25 → Low, 45 → Medium, 70 → High, 90 → Very High
- Qualitative scoring skipped when no ICP description

### Integration Tests

| Test File | Coverage |
|-----------|----------|
| `backend/src/controllers/__tests__/icpSettings.integration.test.ts` | CRUD for ICP settings, validation, auth |

**Key scenarios**:
- Create ICP settings for new user
- Update existing settings
- Get settings returns defaults when none set
- Validation: weights must sum to 100
- Validation: employee_min < employee_max

### Manual Testing

- [ ] Configure ICP settings with employee range, industries, specialties
- [ ] Import CSV with enrichment - verify company data fetched
- [ ] Check enrichment skips for customers updated < 30 days ago
- [ ] Verify ICP scores appear on customer cards and detail pages
- [ ] Verify Low ICP + new customer → "Not Relevant" status
- [ ] Verify existing customers retain their status after import
- [ ] Filter customers by ICP score - verify correct results
- [ ] "Not Scored" filter shows customers without ICP score

## Error Handling

| Error Scenario | Handling Strategy |
|----------------|-------------------|
| LinkedIn page scraping blocked/403 | Return null, fall back to LLM enrichment |
| LLM enrichment timeout | Return null, mark as enrichment failed, continue |
| LLM returns invalid JSON | Parse error caught, return null, continue |
| Rate limit exceeded (shouldn't happen with internal limiter) | Delay and retry once |
| ICP settings not configured | Skip ICP scoring entirely, enrichment still runs |
| Employee count unparseable format | Score that dimension as 0, still score other dimensions |
| Database error saving enrichment | Log error, continue to next customer |

## Validation Commands

```bash
# Type checking
cd backend && npx tsc --noEmit
cd frontend && npx tsc --noEmit

# Unit tests
cd backend && npm run test -- --run src/services/__tests__/EnrichmentService.test.ts
cd backend && npm run test -- --run src/services/__tests__/IcpScoringService.test.ts

# Integration tests
cd backend && npm run test -- --run src/controllers/__tests__/icpSettings.integration.test.ts

# Build
npm run build
```

## Rollout Considerations

- **Feature flag**: Same `linkedin_import` flag from Phase 1
- **Monitoring**: Watch enrichment success rate, LLM costs per import, scraping failure rates
- **Alerting**: Alert if enrichment failure rate > 50% (scraping may be blocked)
- **Rollback plan**: If enrichment causes issues, disable by adding an `ENABLE_ENRICHMENT=false` env var check. Import still works (Phase 1 functionality unaffected).
- **Cost tracking**: Log LLM token usage per import (count only, no content) to monitor spending

## Tech Spike: LinkedIn Scraping

Before implementing `scrapeCompanyPage()`, conduct a brief tech spike:

1. Test scraping 5-10 LinkedIn company pages manually with fetch + cheerio
2. Check if JSON-LD data is available on public company pages
3. Test with different User-Agent strings
4. Document success rate and data quality
5. If <50% success rate, default to LLM enrichment as primary approach

**Decision point**: If scraping is unreliable, switch LLM to primary and remove scraping code. This keeps the architecture simpler.

## Open Items

- [ ] Tech spike results for LinkedIn company page scraping
- [ ] Exact LLM prompt for qualitative ICP scoring (needs testing for consistency)
- [ ] Whether to add "Re-score all customers" button to ICP settings page
- [ ] ICP settings page routing (under /settings/icp or inline in customers page)

---

*This spec is ready for implementation. Follow the patterns and validate at each step.*
