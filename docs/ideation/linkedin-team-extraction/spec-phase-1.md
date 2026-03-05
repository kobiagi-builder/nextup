# Implementation Spec: LinkedIn Team Extraction - Phase 1

**PRD**: ./prd-phase-1.md
**Estimated Effort**: L

## Technical Approach

Phase 1 builds the backend foundation: updated data model, the LinkedIn People page scraping service, AI role filtering, and a new sync API endpoint. The approach extends the existing `EnrichmentService` with two new methods (`scrapeLinkedInPeople` and `filterTeamByRoles`), creates a `team_role_filters` Supabase table for per-account role configuration, and adds a new controller endpoint for manual team sync.

The scraping strategy uses Tavily search (same as existing enrichment) to extract people data from the LinkedIn `/people/` page. The AI filtering uses a single Claude Haiku 4.5 request for the entire list of scraped people — not per-person — to minimize cost and latency.

Key design decisions: (1) `source` and `hidden` fields are added to the `TeamMember` interface, not to a separate table, keeping team data in the JSONB structure; (2) backward compatibility is handled at read time (missing `source` defaults to `manual`, missing `hidden` defaults to `false`); (3) the merge logic explicitly protects manual members from any sync operation.

## File Changes

### New Files

| File Path | Purpose |
|-----------|---------|
| None | All changes are additions to existing files |

### Modified Files

| File Path | Changes |
|-----------|---------|
| `backend/src/types/customer.ts` | Add `source` and `hidden` to `TeamMember` interface, add `enrichment_errors` to `CustomerInfo`, add `TeamRoleFilter` and `TeamSyncResult` types |
| `frontend/src/features/customers/types/customer.ts` | Mirror backend `TeamMember` changes: `source`, `hidden`, `enrichment_errors` |
| `backend/src/services/EnrichmentService.ts` | Add `scrapeLinkedInPeople()` and `filterTeamByRoles()` methods, add `extractCompanySlug()` helper |
| `backend/src/controllers/customer.controller.ts` | Add `syncTeamFromLinkedIn` handler, add `mergeTeamMembers()` helper |
| `backend/src/routes/customers.ts` | Add `POST /:id/sync-team-from-linkedin` route |

## Implementation Details

### 1. Data Model Updates

**Pattern to follow**: Existing `TeamMember` interface in `backend/src/types/customer.ts:55-61`

**Backend types** (`backend/src/types/customer.ts`):

```typescript
// Updated TeamMember
export interface TeamMember {
  name: string
  role?: string
  email?: string
  notes?: string
  linkedin_url?: string
  source?: 'manual' | 'linkedin_scrape'  // NEW — defaults to 'manual' at read time
  hidden?: boolean                         // NEW — soft-delete flag, defaults to false
}

// NEW — add to CustomerInfo
export interface CustomerInfo {
  // ... existing fields ...
  enrichment_errors?: {
    linkedin?: string
    website?: string
  }
}

// NEW — role filter configuration
export interface TeamRoleFilter {
  category: string
  patterns: string[]
}

// NEW — sync response
export interface TeamSyncResult {
  added: number
  removed: number
  total: number
  members: TeamMember[]
}
```

**Frontend types** (`frontend/src/features/customers/types/customer.ts`):
Mirror the same `source`, `hidden`, and `enrichment_errors` additions.

**Key decisions**:
- `source` is optional to maintain backward compatibility. Existing members without it are treated as `'manual'` in code.
- `hidden` is a boolean flag, not a timestamp, because we don't need to track when members were hidden.
- `enrichment_errors` is on `CustomerInfo` (JSONB) rather than a separate table — keeps it simple and avoids a migration for a metadata field.

### 2. Database: `team_role_filters` Table

**Migration** via Supabase MCP:

```sql
CREATE TABLE team_role_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  roles JSONB NOT NULL DEFAULT '[]'::jsonb,
  exclusions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- RLS
ALTER TABLE team_role_filters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own role filters"
  ON team_role_filters
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index
CREATE INDEX idx_team_role_filters_user_id ON team_role_filters(user_id);
```

**Default role configuration** (hardcoded in backend, used when no DB row exists):

```typescript
export const DEFAULT_ROLE_FILTERS: TeamRoleFilter[] = [
  { category: 'founder', patterns: ['founder', 'co-founder', 'cofounder'] },
  { category: 'c_level', patterns: ['chief', 'ceo', 'cto', 'cmo', 'coo', 'cro', 'ciso', 'cfo', 'cpo', 'cdo'] },
  { category: 'vp', patterns: ['vp', 'vice president', 'svp', 'evp'] },
  { category: 'product_management', patterns: ['product manager', 'director of product', 'head of product', 'product lead', 'group product manager', 'senior product manager', 'principal product manager'] },
  { category: 'product_design', patterns: ['product designer', 'ux designer', 'ui designer', 'ux/ui', 'experience designer', 'design lead', 'head of design', 'design director', 'senior designer'] },
]

export const DEFAULT_ROLE_EXCLUSIONS: string[] = [
  'hr', 'human resources', 'people operations', 'talent', 'recruiting', 'recruiter',
  'talent acquisition', 'people partner', 'hr business partner',
]
```

### 3. LinkedIn People Page Scraping

**Pattern to follow**: `EnrichmentService.enrichFromLinkedInUrl()` (lines 255-344) — same Tavily + LLM pattern

**New method** on `EnrichmentService`:

```typescript
/**
 * Extract company slug from various LinkedIn URL formats.
 */
static extractCompanySlug(url: string): string | null {
  const match = url.match(/linkedin\.com\/company\/([^\/\?#]+)/)
  return match ? match[1] : null
}

/**
 * Scrape LinkedIn People page via Tavily search.
 * Returns list of people with name + role title.
 */
async scrapeLinkedInPeople(companySlug: string): Promise<Array<{ name: string; role: string; linkedin_url?: string }>> {
  if (!tavilyClient.isConfigured()) return []

  const peopleUrl = `https://www.linkedin.com/company/${companySlug}/people/`

  const [linkedinResults, webResults] = await Promise.all([
    tavilyClient.search(`${peopleUrl} employees team`, {
      includeDomains: ['linkedin.com'],
      maxResults: 5,
      includeRawContent: false,
    }),
    tavilyClient.search(`"${companySlug}" linkedin team members leadership`, {
      maxResults: 3,
      includeRawContent: false,
    }),
  ])

  const allResults = [...linkedinResults, ...webResults]
    .filter(r => r.score >= 0.3)  // Lower threshold for people data

  if (allResults.length === 0) return []

  let context = ''
  for (const r of allResults) {
    const entry = `${r.title}\n${r.content}\n\n`
    if (context.length + entry.length > 3000) break  // Larger context for people lists
    context += entry
  }

  if (context.length < 30) return []

  // Use LLM to extract structured people list from search context
  const { text } = await generateText({
    model: anthropic(ENRICHMENT_MODEL),
    system: LINKEDIN_PEOPLE_SYSTEM_PROMPT,
    prompt: `Company LinkedIn slug: ${companySlug}\nPeople page URL: ${peopleUrl}\n\nSearch Results:\n${context}`,
    maxOutputTokens: 1500,
  })

  const parsed = stripFencesAndParse(text)
  if (!parsed || !Array.isArray(parsed.people)) return []

  return parsed.people
    .filter((p: any) => typeof p.name === 'string' && p.name && typeof p.role === 'string' && p.role)
    .map((p: any) => ({
      name: String(p.name).slice(0, 200),
      role: String(p.role).slice(0, 200),
      linkedin_url: typeof p.linkedin_url === 'string' ? p.linkedin_url.slice(0, 500) : undefined,
    }))
}
```

**New system prompt** (add to constants):

```typescript
const LINKEDIN_PEOPLE_SYSTEM_PROMPT = `You are a business data assistant. Extract a list of people and their job titles from LinkedIn company search results.

Return ONLY a JSON object with a "people" array. Each person should have:
- "name": string — full name
- "role": string — job title / position
- "linkedin_url": string or null — LinkedIn profile URL if found

Extract ALL people mentioned in the search results with their titles.
Return ONLY valid JSON, no markdown fences, no explanation.

Example:
{"people": [{"name": "Jane Smith", "role": "CEO", "linkedin_url": "https://linkedin.com/in/janesmith"}, {"name": "John Doe", "role": "VP Engineering", "linkedin_url": null}]}`
```

### 4. AI Role Filtering

**New method** on `EnrichmentService`:

```typescript
/**
 * Filter a list of scraped people by role relevance using a SINGLE Haiku request.
 * Returns only people whose roles match the allowed categories.
 */
async filterTeamByRoles(
  people: Array<{ name: string; role: string; linkedin_url?: string }>,
  roleFilters: TeamRoleFilter[],
  exclusions: string[],
): Promise<Array<{ name: string; role: string; linkedin_url?: string }>> {
  if (people.length === 0) return []

  const allowedCategories = roleFilters.map(f => `${f.category}: ${f.patterns.join(', ')}`).join('\n')
  const excludePatterns = exclusions.join(', ')

  const { text } = await generateText({
    model: anthropic(ENRICHMENT_MODEL),  // claude-haiku-4-5-20251001
    system: ROLE_FILTER_SYSTEM_PROMPT,
    prompt: `ALLOWED ROLE CATEGORIES:\n${allowedCategories}\n\nEXCLUDED ROLES:\n${excludePatterns}\n\nPEOPLE TO FILTER:\n${JSON.stringify(people.map((p, i) => ({ index: i, name: p.name, role: p.role })))}`,
    maxOutputTokens: 500,
  })

  const parsed = stripFencesAndParse(text)
  if (!parsed || !Array.isArray(parsed.matches)) return []

  // Return people at the matched indices
  return parsed.matches
    .filter((idx: unknown) => typeof idx === 'number' && idx >= 0 && idx < people.length)
    .map((idx: number) => people[idx])
}
```

**New system prompt**:

```typescript
const ROLE_FILTER_SYSTEM_PROMPT = `You are a role-matching assistant. Given a list of people with their job titles, determine which ones match the ALLOWED role categories and do NOT match the EXCLUDED roles.

A role MATCHES if the person's title is semantically equivalent to any pattern in the allowed categories. For example:
- "Chief Executive Officer" matches "ceo"
- "VP of Product Management" matches "vp"
- "Senior Product Designer" matches "product designer"
- "Director, User Experience" matches "ux designer"

A role is EXCLUDED if it matches any excluded pattern, even if it also matches an allowed category.

Return ONLY a JSON object with a "matches" array containing the INDEX numbers of people who match.
Example: {"matches": [0, 2, 5]}

Return ONLY valid JSON, no markdown fences.`
```

### 5. Sync Controller Endpoint

**Pattern to follow**: Existing `enrichFromLinkedIn` handler (customer.controller.ts lines 344-381)

```typescript
/**
 * Sync team members from LinkedIn People page.
 * POST /api/customers/:id/sync-team-from-linkedin
 */
export async function syncTeamFromLinkedIn(req: Request, res: Response) {
  try {
    const { id } = req.params
    const service = getService(req)
    const customer = await service.getById(id)

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' })
    }

    const linkedinUrl = customer.info?.linkedin_company_url
    if (!linkedinUrl) {
      return res.status(400).json({ error: 'Customer has no LinkedIn company URL' })
    }

    const slug = EnrichmentService.extractCompanySlug(linkedinUrl)
    if (!slug) {
      return res.status(400).json({ error: 'Invalid LinkedIn company URL format' })
    }

    // Scrape people
    const enrichmentService = new EnrichmentService()
    const scrapedPeople = await enrichmentService.scrapeLinkedInPeople(slug)

    if (scrapedPeople.length === 0) {
      // Clear any previous errors, report empty result
      if (customer.info?.enrichment_errors?.linkedin) {
        await service.mergeInfo(id, { enrichment_errors: { ...customer.info.enrichment_errors, linkedin: undefined } })
      }
      return res.json({ added: 0, removed: 0, total: (customer.info?.team || []).filter(m => !m.hidden).length, members: [] })
    }

    // Load role filters (user-specific or defaults)
    const supabase = getSupabase()
    const { data: filterRow } = await supabase
      .from('team_role_filters')
      .select('roles, exclusions')
      .maybeSingle()

    const roleFilters: TeamRoleFilter[] = filterRow?.roles?.length
      ? filterRow.roles
      : DEFAULT_ROLE_FILTERS
    const exclusions: string[] = filterRow?.exclusions?.length
      ? filterRow.exclusions
      : DEFAULT_ROLE_EXCLUSIONS

    // AI filter
    const filtered = await enrichmentService.filterTeamByRoles(scrapedPeople, roleFilters, exclusions)

    // Merge with existing team
    const result = mergeTeamMembers(customer.info?.team || [], filtered)

    // Save
    await service.mergeInfo(id, {
      team: result.mergedTeam,
      enrichment_errors: { ...customer.info?.enrichment_errors, linkedin: undefined },
    })

    logger.info('[CustomerController] Team sync from LinkedIn complete', {
      companyName: customer.name,
      scraped: scrapedPeople.length,
      filtered: filtered.length,
      added: result.added,
      removed: result.removed,
    })

    return res.json({
      added: result.added,
      removed: result.removed,
      total: result.mergedTeam.filter(m => !m.hidden).length,
      members: result.mergedTeam.filter(m => !m.hidden),
    })
  } catch (error) {
    logger.error('[CustomerController] Team sync failed', {
      hasError: true,
      sourceCode: 'syncTeamFromLinkedIn',
    })

    // Save error to enrichment_errors for UI display
    try {
      const { id } = req.params
      const service = getService(req)
      const customer = await service.getById(id)
      if (customer) {
        await service.mergeInfo(id, {
          enrichment_errors: {
            ...customer.info?.enrichment_errors,
            linkedin: 'Failed to sync team from LinkedIn',
          },
        })
      }
    } catch { /* best-effort error persistence */ }

    return res.status(500).json({ error: 'Failed to sync team from LinkedIn' })
  }
}
```

### 6. Team Merge Logic

**Helper function** in `customer.controller.ts`:

```typescript
/**
 * Merge scraped LinkedIn team members with existing team.
 * Rules:
 * - Never modify or remove members with source='manual' (or no source)
 * - Add new linkedin_scrape members not already present (match by name, case-insensitive)
 * - Soft-delete (hidden=true) existing linkedin_scrape members not in latest scrape
 */
function mergeTeamMembers(
  existingTeam: TeamMember[],
  scrapedMembers: Array<{ name: string; role: string; linkedin_url?: string }>,
): { mergedTeam: TeamMember[]; added: number; removed: number } {
  const result = [...existingTeam]
  let added = 0
  let removed = 0

  // Build set of scraped names for lookup (lowercase)
  const scrapedNameSet = new Set(scrapedMembers.map(m => m.name.toLowerCase()))

  // Soft-delete stale linkedin_scrape members
  for (const member of result) {
    if (member.source === 'linkedin_scrape' && !member.hidden) {
      if (!scrapedNameSet.has(member.name.toLowerCase())) {
        member.hidden = true
        removed++
      }
    }
  }

  // Un-hide previously hidden linkedin_scrape members that are back in the scrape
  for (const member of result) {
    if (member.source === 'linkedin_scrape' && member.hidden) {
      if (scrapedNameSet.has(member.name.toLowerCase())) {
        member.hidden = false
        // Update role if changed
        const scraped = scrapedMembers.find(s => s.name.toLowerCase() === member.name.toLowerCase())
        if (scraped) {
          member.role = scraped.role
          if (scraped.linkedin_url) member.linkedin_url = scraped.linkedin_url
        }
      }
    }
  }

  // Add new members not already in team
  const existingNameSet = new Set(result.map(m => m.name.toLowerCase()))
  for (const scraped of scrapedMembers) {
    if (!existingNameSet.has(scraped.name.toLowerCase())) {
      result.push({
        name: scraped.name,
        role: scraped.role,
        linkedin_url: scraped.linkedin_url,
        source: 'linkedin_scrape',
      })
      added++
    }
  }

  return { mergedTeam: result, added, removed }
}
```

### 7. Route Registration

**Add to** `backend/src/routes/customers.ts`:

```typescript
// Team sync (must come BEFORE /:id to avoid route collision)
router.post('/:id/sync-team-from-linkedin', customerController.syncTeamFromLinkedIn)
```

Place it after the existing `/:id` routes (it won't collide since it has a suffix).

## Data Model

### Schema Changes

```sql
CREATE TABLE team_role_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  roles JSONB NOT NULL DEFAULT '[]'::jsonb,
  exclusions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE team_role_filters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own role filters"
  ON team_role_filters FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_team_role_filters_user_id ON team_role_filters(user_id);
```

## API Design

### New Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/customers/:id/sync-team-from-linkedin` | Sync team members from LinkedIn People page |

### Request/Response Examples

```typescript
// POST /api/customers/:id/sync-team-from-linkedin
// Request: (no body — reads LinkedIn URL from customer record)

// Response 200:
{
  "added": 3,
  "removed": 1,
  "total": 5,
  "members": [
    { "name": "Jane Smith", "role": "CEO", "linkedin_url": "https://linkedin.com/in/jane", "source": "linkedin_scrape" },
    { "name": "John Doe", "role": "Advisor", "email": "john@acme.com", "source": "manual" }
  ]
}

// Response 400:
{ "error": "Customer has no LinkedIn company URL" }

// Response 404:
{ "error": "Customer not found" }
```

## Testing Requirements

### Unit Tests

| Test File | Coverage |
|-----------|----------|
| `backend/src/__tests__/unit/services/EnrichmentService.test.ts` | `extractCompanySlug`, `filterTeamByRoles` |
| `backend/src/__tests__/unit/controllers/customer.controller.test.ts` | `mergeTeamMembers` logic |

**Key test cases**:
- `extractCompanySlug` handles: full URL, trailing slash, with /people/, with /about/, invalid URL
- `mergeTeamMembers`: adds new members, soft-deletes stale, preserves manual, un-hides returned members
- `filterTeamByRoles`: filters by role patterns, excludes HR, handles empty input
- Default role filters load when no DB row exists

### Manual Testing

- [ ] Call sync endpoint for customer with LinkedIn URL — verify team members added
- [ ] Call sync endpoint for customer without LinkedIn URL — verify 400 error
- [ ] Verify manual members are never affected by sync
- [ ] Verify role filtering excludes HR roles

## Error Handling

| Error Scenario | Handling Strategy |
|----------------|-------------------|
| No LinkedIn URL on customer | Return 400 with clear message |
| Invalid LinkedIn URL format | Return 400 with clear message |
| Tavily search fails | Log error, save to `enrichment_errors.linkedin`, return 500 |
| AI filtering returns no matches | Return success with added: 0 (no members pass filter) |
| AI response unparseable | Log warning, return empty filtered list |

## Validation Commands

```bash
# Backend type check
cd backend && npx tsc --noEmit

# Frontend type check
cd frontend && npx tsc --noEmit

# Build
npm run build
```

## Open Items

- [ ] Confirm Tavily returns useful data for LinkedIn `/people/` pages (may need to test with real URLs)
- [ ] Monitor Haiku token usage for role filtering — expect ~200-500 tokens per call

---

*This spec is ready for implementation. Follow the patterns and validate at each step.*
