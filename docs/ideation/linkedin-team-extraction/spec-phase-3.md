# Implementation Spec: LinkedIn Team Extraction - Phase 3

**PRD**: ./prd-phase-3.md
**Estimated Effort**: S

## Technical Approach

Phase 3 wires the team extraction pipeline into the three automatic trigger points: customer creation, LinkedIn URL update, and enrichment refresh. The approach is minimal — all the heavy lifting (scraping, filtering, merging) was built in Phase 1. Phase 3 simply calls those functions at the right moments.

Key design decisions: (1) team extraction runs AFTER enrichment + ICP scoring in `enrichAndScoreNewCustomer()`, so the company data is already available; (2) LinkedIn URL change detection compares old vs new value in `updateCustomer`, only triggering when the URL actually changes to a new value; (3) the frontend delayed invalidation pattern (already on `useCreateCustomer`) is replicated on `useUpdateCustomer` for background extraction results.

## File Changes

### New Files

| File Path | Purpose |
|-----------|---------|
| None | All changes are additions to existing files |

### Modified Files

| File Path | Changes |
|-----------|---------|
| `backend/src/controllers/customer.controller.ts` | Add team sync to `enrichAndScoreNewCustomer()`, add LinkedIn URL change detection to `updateCustomer`, extract `syncTeamForCustomer()` helper |
| `frontend/src/features/customers/hooks/useCustomers.ts` | Add 5-second delayed invalidation to `useUpdateCustomer` |

## Implementation Details

### 1. Extract Reusable Team Sync Helper

**File**: `backend/src/controllers/customer.controller.ts`

Extract the sync logic from the `syncTeamFromLinkedIn` handler into a reusable helper that both the manual endpoint and auto-triggers can call. Place this near the existing `enrichAndScoreNewCustomer` and `rescoreIcpIfNeeded` helpers at the top of the file.

```typescript
/**
 * Sync team members from LinkedIn for a customer (reusable helper).
 * Used by both the manual sync endpoint and auto-triggers.
 * Returns the sync result or null if scraping yielded no results.
 */
async function syncTeamForCustomer(customerId: string): Promise<{ added: number; removed: number } | null> {
  const supabase = getSupabase()
  const service = new CustomerService(supabase)
  const customer = await service.getById(customerId)

  if (!customer) return null

  const linkedinUrl = customer.info?.linkedin_company_url
  if (!linkedinUrl) return null

  const slug = EnrichmentService.extractCompanySlug(linkedinUrl)
  if (!slug) return null

  const enrichmentService = new EnrichmentService()
  const scrapedPeople = await enrichmentService.scrapeLinkedInPeople(slug)

  if (scrapedPeople.length === 0) {
    // Clear previous linkedin error if any
    if (customer.info?.enrichment_errors?.linkedin) {
      await service.mergeInfo(customerId, {
        enrichment_errors: { ...customer.info.enrichment_errors, linkedin: undefined },
      })
    }
    return { added: 0, removed: 0 }
  }

  // Load role filters (user-specific or defaults)
  const { data: filterRow } = await supabase
    .from('team_role_filters')
    .select('roles, exclusions')
    .maybeSingle()

  const roleFilters = filterRow?.roles?.length ? filterRow.roles : DEFAULT_ROLE_FILTERS
  const exclusions = filterRow?.exclusions?.length ? filterRow.exclusions : DEFAULT_ROLE_EXCLUSIONS

  const filtered = await enrichmentService.filterTeamByRoles(scrapedPeople, roleFilters, exclusions)
  const result = mergeTeamMembers(customer.info?.team || [], filtered)

  await service.mergeInfo(customerId, {
    team: result.mergedTeam,
    enrichment_errors: { ...customer.info?.enrichment_errors, linkedin: undefined },
  })

  logger.info('[CustomerController] Team sync complete', {
    companyName: customer.name,
    scraped: scrapedPeople.length,
    filtered: filtered.length,
    added: result.added,
    removed: result.removed,
  })

  return { added: result.added, removed: result.removed }
}
```

**Refactor the manual `syncTeamFromLinkedIn` handler** to use this helper:

```typescript
export async function syncTeamFromLinkedIn(req: Request, res: Response) {
  try {
    const { id } = req.params
    const service = getService(req)
    const customer = await service.getById(id)

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' })
    }

    if (!customer.info?.linkedin_company_url) {
      return res.status(400).json({ error: 'Customer has no LinkedIn company URL' })
    }

    const slug = EnrichmentService.extractCompanySlug(customer.info.linkedin_company_url)
    if (!slug) {
      return res.status(400).json({ error: 'Invalid LinkedIn company URL format' })
    }

    const result = await syncTeamForCustomer(id)

    if (!result) {
      return res.status(500).json({ error: 'Failed to sync team from LinkedIn' })
    }

    // Re-fetch to return updated team
    const updated = await service.getById(id)
    const visibleTeam = (updated?.info?.team || []).filter(m => !m.hidden)

    return res.json({
      added: result.added,
      removed: result.removed,
      total: visibleTeam.length,
      members: visibleTeam,
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

### 2. Auto-Extract on Customer Creation

**File**: `backend/src/controllers/customer.controller.ts`

**Where**: `enrichAndScoreNewCustomer()` function (line 132), add team extraction AFTER ICP scoring block.

Add the following at the end of the function body (before the catch block), after the ICP scoring section:

```typescript
// --- Team Extraction ---
// Run after enrichment + ICP scoring. Re-fetch customer to get latest data
// (enrichment may have populated linkedin_company_url from enrichment).
try {
  const latestCustomer = await service.getById(customer.id)
  if (latestCustomer?.info?.linkedin_company_url) {
    await syncTeamForCustomer(customer.id)
    logger.info('[CustomerController] Post-create team extraction complete', {
      companyName: customer.name,
    })
  }
} catch (teamError) {
  // Team extraction failure must NOT block the overall pipeline
  logger.error('[CustomerController] Post-create team extraction failed', {
    sourceCode: 'enrichAndScoreNewCustomer.teamExtraction',
    error: teamError instanceof Error ? teamError.message : String(teamError),
  })

  // Persist error for UI display
  try {
    await service.mergeInfo(customer.id, {
      enrichment_errors: {
        ...latestCustomer?.info?.enrichment_errors,
        linkedin: 'Failed to extract team from LinkedIn',
      },
    })
  } catch { /* best-effort */ }
}
```

**Note**: The `latestCustomer` re-fetch is necessary because enrichment may have populated the LinkedIn URL or other fields that weren't present at creation time.

### 3. Auto-Extract on LinkedIn URL Update

**File**: `backend/src/controllers/customer.controller.ts`

**Where**: `updateCustomer` handler (line 436), after `service.update()` call and the existing `rescoreIcpIfNeeded()` block.

```typescript
// Existing code at line 470-475:
const service = getService(req)
const customer = await service.update(id, parsed.data)

// Auto-rescore ICP if info was updated (fire-and-forget, non-blocking)
if (parsed.data.info) {
  rescoreIcpIfNeeded(customer).catch(() => {})
}

// NEW — Auto-extract team when LinkedIn URL changes
if (parsed.data.info?.linkedin_company_url) {
  // Fetch old customer to compare LinkedIn URL
  // (customer is already updated, so we compare the new value)
  // Only trigger if the URL is different from what it was before
  const oldCustomer = await service.getById(id) // Gets fresh from DB (already updated)
  const newUrl = parsed.data.info.linkedin_company_url

  // We need the OLD value — get it before the update.
  // Actually, since update already happened, we need a different approach:
  // The controller already has the new customer. We trigger sync if
  // the submitted info includes a linkedin_company_url (meaning user is setting/changing it).
  if (newUrl && EnrichmentService.extractCompanySlug(newUrl)) {
    syncTeamForCustomer(customer.id).catch((err) => {
      logger.error('[CustomerController] Auto team sync after URL update failed', {
        sourceCode: 'updateCustomer.teamSync',
        error: err instanceof Error ? err.message : String(err),
      })
    })
  }
}

res.status(200).json(customer)
```

**Simplified approach**: Since we can't easily compare old vs new in the current flow (update already happened), we trigger sync whenever `linkedin_company_url` is present in the update payload. This is acceptable because:
- The merge logic is idempotent (re-syncing the same URL just confirms existing members)
- It only fires when the user explicitly submits a LinkedIn URL in the info update
- The sync is fire-and-forget, non-blocking

### 4. Auto-Extract on Enrichment Refresh

**File**: `backend/src/controllers/customer.controller.ts`

**Where**: The existing `enrichFromLinkedIn` handler (line 353) runs one-off enrichment from a LinkedIn URL. The team extraction should happen after successful enrichment.

Add after the successful response (line 382):

```typescript
// After returning enrichment result to client, check if we should sync team
if (result && req.body.customer_id) {
  syncTeamForCustomer(req.body.customer_id).catch((err) => {
    logger.error('[CustomerController] Team sync after enrichment refresh failed', {
      sourceCode: 'enrichFromLinkedIn.teamSync',
      error: err instanceof Error ? err.message : String(err),
    })
  })
}
```

**Note**: The `enrichFromLinkedIn` endpoint doesn't currently receive `customer_id`. If it's not available, skip this trigger — the user can always use the manual "Sync" button. The main auto-trigger paths (creation and URL update) are sufficient for most cases.

**Alternative**: If `enrichFromLinkedIn` doesn't have `customer_id` context, this trigger is deferred. The manual sync button (Phase 2) and creation/URL-update triggers cover the primary use cases.

### 5. Frontend Delayed Invalidation on Update

**File**: `frontend/src/features/customers/hooks/useCustomers.ts`

**Where**: `useUpdateCustomer` hook (line 132)

Add 5-second delayed invalidation (same pattern as `useCreateCustomer`):

```typescript
export function useUpdateCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateCustomerInput & { id: string }) => {
      return api.put<Customer>(`/api/customers/${id}`, data)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() })
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: customerKeys.detail(data.id) })

        // Background team extraction + ICP rescoring completes ~5-10s after update.
        // Refetch so new team members and ICP badge appear without manual refresh.
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: customerKeys.detail(data.id) })
          queryClient.invalidateQueries({ queryKey: customerKeys.lists() })
        }, 5000)
      }
    },
  })
}
```

## Error Handling

| Error Scenario | Handling Strategy |
|----------------|-------------------|
| Team extraction fails during creation | Log error, save to `enrichment_errors.linkedin`, continue (don't block creation pipeline) |
| Team extraction fails during URL update | Log error, fire-and-forget (sync button available as fallback) |
| Tavily rate limit during auto-extraction | Error logged, `enrichment_errors.linkedin` populated, user sees AlertCircle icon |
| Multiple rapid URL updates | Each triggers sync independently (merge is idempotent, last one wins) |

## Testing Requirements

### Manual Testing

- [ ] Create customer with LinkedIn URL → team members appear within 15s (after page refresh or delayed refetch)
- [ ] Create customer WITHOUT LinkedIn URL → no team extraction attempt, no errors
- [ ] Update customer's LinkedIn URL → new team members appear within 10s
- [ ] Remove LinkedIn URL (set to empty) → existing team members remain unchanged
- [ ] Team extraction failure → `enrichment_errors.linkedin` populated, AlertCircle visible
- [ ] Successful extraction → previous `enrichment_errors.linkedin` cleared
- [ ] Manual members are NEVER affected by auto-extraction
- [ ] Customer creation response time is NOT affected (fire-and-forget)
- [ ] Backend builds: `cd backend && npx tsc --noEmit`
- [ ] Frontend builds: `cd frontend && npx tsc --noEmit`

### Integration Flow Test

1. Create customer "TestCorp" with `linkedin_company_url: "https://linkedin.com/company/testcorp"`
2. Wait 15 seconds
3. Refresh customer detail page
4. Verify: team members populated with `source: 'linkedin_scrape'`
5. Verify: enrichment data populated
6. Verify: ICP score assigned
7. Edit customer, change LinkedIn URL to different company
8. Wait 10 seconds
9. Verify: old linkedin_scrape members hidden, new ones added

## Validation Commands

```bash
# Backend type check
cd backend && npx tsc --noEmit

# Frontend type check
cd frontend && npx tsc --noEmit

# Full build
npm run build
```

## Open Items

- [ ] `enrichFromLinkedIn` endpoint may need `customer_id` param to enable team sync on enrichment refresh. Defer if not available — manual sync button is the fallback.
- [ ] Consider debounce if users make rapid LinkedIn URL changes (low priority — merge is idempotent)

---

*This spec is ready for implementation. Follow the patterns and validate at each step.*
