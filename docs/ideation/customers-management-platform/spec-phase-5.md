# Implementation Spec: Customers Management Platform - Phase 5

**PRD**: ./prd-phase-5.md
**UX/UI**: ./ux-ui-spec.md (Sections 8-13)
**Estimated Effort**: L

## Technical Approach

Phase 5 is the integration and polish layer. It connects customer artifacts with the Portfolio module, enriches customer list cards with summary data (via optimized queries), adds search and filtering, refines agent prompts, and ensures consistent UX quality (loading states, error handling, empty states, responsive design, toasts).

This phase touches many files with small-to-medium changes rather than creating large new systems. The approach prioritizes: (1) cross-module linking, (2) list page enhancements, (3) agent prompt refinement, (4) UX polish sweep.

## File Changes

### New Files

| File Path | Purpose |
|-----------|---------|
| `frontend/src/features/customers/components/shared/CustomerSearch.tsx` | Search input with debounce |
| `frontend/src/features/customers/components/shared/CustomerFilters.tsx` | Advanced filter panel |
| `frontend/src/features/customers/components/shared/CustomerCardSkeleton.tsx` | Loading skeleton for cards |
| `frontend/src/features/customers/components/shared/DetailSkeleton.tsx` | Loading skeleton for detail page |

### Modified Files

| File Path | Changes |
|-----------|---------|
| **Cross-Module Integration** | |
| `frontend/src/features/portfolio/components/editor/ArtifactEditor.tsx` | Add "References" section for linking customer artifacts |
| `frontend/src/features/portfolio/types/portfolio.ts` | Add `linkedCustomerArtifacts?: string[]` to artifact metadata |
| `backend/src/types/portfolio.ts` | Mirror frontend type change |
| **Customer List Enhancements** | |
| `frontend/src/features/customers/hooks/useCustomers.ts` | Enhanced query with aggregated summary data |
| `frontend/src/features/customers/components/shared/CustomerCard.tsx` | Full enriched card with all metrics |
| `frontend/src/features/customers/pages/CustomerListPage.tsx` | Add search, sort, advanced filters |
| `frontend/src/features/customers/pages/CustomerListPage.tsx` | URL query params already handle filter persistence from Phase 1 (no store changes needed) |
| **Backend Optimizations** | |
| `backend/src/services/CustomerService.ts` | Add summary aggregation query, search, stats endpoint |
| `backend/src/controllers/customer.controller.ts` | Add search and stats handlers |
| `backend/src/routes/customers.ts` | Add search and stats routes |
| **Agent Refinement** | |
| `backend/src/services/ai/prompts/customerAgentPrompts.ts` | Refined prompt with event context + relationship signals |
| `backend/src/services/ai/prompts/productAgentPrompts.ts` | Refined prompt with artifact summaries + product maturity |
| `backend/src/services/ai/prompts/customerContextBuilder.ts` | Add relationship health signals and artifact summaries |
| **UX Polish** | |
| `frontend/src/features/customers/pages/CustomerListPage.tsx` | Loading skeletons, error state |
| `frontend/src/features/customers/pages/CustomerDetailPage.tsx` | Loading skeleton, error boundary |
| `frontend/src/features/customers/components/overview/OverviewTab.tsx` | Quick stats enhancement, event timeline refinement |
| `frontend/src/features/customers/components/agreements/AgreementsTab.tsx` | Empty state, loading state |
| `frontend/src/features/customers/components/receivables/ReceivablesTab.tsx` | Empty state, loading state |
| `frontend/src/features/customers/components/projects/ProjectsTab.tsx` | Empty state, loading state |

## Implementation Details

### Cross-Module Linking

**Approach**: Add a `linkedCustomerArtifacts` array to portfolio artifact metadata. When editing a portfolio artifact, users can search customer artifacts and add references.

```typescript
// Portfolio artifact metadata extension
interface ArtifactMetadata {
  // ... existing fields
  linkedCustomerArtifacts?: Array<{
    id: string;
    title: string;
    type: string;
    customerName: string;
  }>;
}
```

**References Section in Portfolio Editor**:
```typescript
// Added to ArtifactEditor.tsx as a collapsible section
<Collapsible>
  <CollapsibleTrigger>
    <Link2 /> References ({linkedArtifacts.length})
  </CollapsibleTrigger>
  <CollapsibleContent>
    {/* Search input to find customer artifacts */}
    <Input placeholder="Search customer artifacts..." onChange={handleSearch} />

    {/* Linked artifacts as clickable chips */}
    {linkedArtifacts.map(artifact => (
      <Badge key={artifact.id} variant="outline" className="gap-1">
        <span>{artifact.customerName}: {artifact.title}</span>
        <X className="h-3 w-3 cursor-pointer" onClick={() => removeLink(artifact.id)} />
      </Badge>
    ))}
  </CollapsibleContent>
</Collapsible>
```

**Search endpoint**: `GET /api/customers/artifacts/search?q=strategy` - Searches across all customer artifacts for the authenticated user.

**Reverse lookup index** (for "Referenced by" section on customer artifacts):
```sql
-- GIN index for JSONB @> queries on portfolio artifact metadata
CREATE INDEX idx_artifacts_linked_customer_artifacts
  ON artifacts USING GIN ((metadata->'linkedCustomerArtifacts') jsonb_path_ops);

-- Query: find portfolio artifacts that reference a customer artifact
SELECT * FROM artifacts
WHERE metadata->'linkedCustomerArtifacts' @> '[{"id": "customer-artifact-uuid"}]';
```

### Customer List Summary Query

**Optimized single query** to avoid N+1:

```sql
SELECT
  c.*,
  (SELECT COUNT(*) FROM customer_agreements ca
   WHERE ca.customer_id = c.id
   AND (ca.end_date IS NULL OR ca.end_date >= CURRENT_DATE)) as active_agreements_count,
  (SELECT COALESCE(SUM(cr.amount), 0) FROM customer_receivables cr
   WHERE cr.customer_id = c.id AND cr.type = 'invoice' AND cr.status != 'cancelled') as total_invoiced,
  (SELECT COALESCE(SUM(cr.amount), 0) FROM customer_receivables cr
   WHERE cr.customer_id = c.id AND cr.type = 'payment') as total_paid,
  (SELECT COUNT(*) FROM customer_projects cp
   WHERE cp.customer_id = c.id AND cp.status IN ('planning', 'active')) as active_projects_count,
  (SELECT MAX(ce.event_date) FROM customer_events ce
   WHERE ce.customer_id = c.id) as last_activity
FROM customers c
WHERE c.user_id = auth.uid()
ORDER BY c.updated_at DESC;
```

This is implemented as a Supabase RPC function or a backend service method.

### Search Implementation

**IMPORTANT**: Do NOT use string concatenation in `.or()` filters — this is vulnerable to SQL injection. Use PostgreSQL full-text search instead.

**Migration addition** (add to Phase 5 migration):
```sql
-- Add search vector column for full-text search
ALTER TABLE customers ADD COLUMN search_vector TSVECTOR
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(name, '') || ' ' ||
    coalesce(info->>'vertical', '') || ' ' ||
    coalesce(info->>'about', ''))
  ) STORED;

CREATE INDEX idx_customers_search ON customers USING GIN (search_vector);
```

```typescript
// Backend: Parameterized full-text search
async search(query: string) {
  const { data, error } = await this.supabase
    .from('customers')
    .select('*')
    .textSearch('search_vector', query, { type: 'websearch' });
  return data;
}
```

### Agent Prompt Refinement

**Customer Mgmt Agent additions**:
```typescript
// Add to system prompt
## Relationship Health Signals
${getRelationshipHealthSignals(customer, agreements, receivables)}

// Helper function
function getRelationshipHealthSignals(customer, agreements, receivables) {
  const signals = [];

  // Check for expiring agreements
  const expiringAgreements = agreements.filter(a =>
    a.end_date && daysBetween(new Date(), new Date(a.end_date)) < 30
  );
  if (expiringAgreements.length > 0)
    signals.push(`WARNING: ${expiringAgreements.length} agreement(s) expiring within 30 days`);

  // Check for overdue invoices
  const overdueInvoices = receivables.filter(r =>
    r.type === 'invoice' && r.status === 'overdue'
  );
  if (overdueInvoices.length > 0)
    signals.push(`ALERT: ${overdueInvoices.length} overdue invoice(s)`);

  // Check for inactivity
  if (lastActivity && daysBetween(new Date(lastActivity), new Date()) > 14)
    signals.push(`NOTE: No activity in ${daysBetween(new Date(lastActivity), new Date())} days`);

  return signals.join('\n');
}
```

**Product Mgmt Agent additions**:
```typescript
// Add to system prompt
## Existing Deliverables
${artifacts.map(a => `- [${a.type}] ${a.title} (${a.status})`).join('\n')}

## Product Maturity Assessment
Based on ${artifacts.length} artifacts across ${projects.length} projects, the product engagement is at ${maturityLevel} stage.
```

**Contextual action suggestions** (added to both agents):
```typescript
// Add to system prompt
## Interaction Guidelines
After providing advice or analysis, suggest ONE relevant follow-up action the user might want to take.
Examples:
- After discussing strategy: "Would you like me to create a strategy artifact for this?"
- After discussing pricing: "Want me to draft a proposal with these pricing terms?"
- After discussing late payment: "Should I draft a follow-up email about the outstanding invoice?"
- After creating an artifact: "Would you like me to refine this further or move on to the next deliverable?"
```

### UX Polish Checklist

**Loading skeletons** (using existing `<Skeleton>` component):
- Customer list: 3 skeleton cards with shimmer
- Customer detail: header skeleton + tab skeleton + content skeleton
- Each tab: appropriate skeleton for that content type

**Error boundaries**:
- Customer list: "Failed to load customers" with retry button
- Customer detail: "Customer not found" for 404, "Failed to load" for errors

**Empty states** (using EmptyState component pattern):
- Agreements tab: FileText icon + "No agreements yet" + Add Agreement CTA
- Receivables tab: CreditCard icon + "No transactions yet" + Record Invoice CTA
- Projects tab: FolderOpen icon + "No projects yet" + New Project CTA
- Event timeline: Calendar icon + "No events logged" + Log Event CTA

**Toast notifications**: All CRUD operations show success/error toasts (see UX spec Section 11).

**List virtualization** (performance optimization):
- When customer count exceeds 50, use `@tanstack/virtual` for windowed rendering
- Prevents mounting 100+ DOM-heavy cards simultaneously
- Alternative: implement pagination (20 per page) for simpler approach

**Responsive design verification**:
- Customer cards: single column on mobile (<640px), 2 cols on tablet (640-1024px), 2-3 on desktop (1024px+)
- Detail page tabs: scrollable on narrow viewports (wrap `TabsList` in `overflow-x-auto scrollbar-none`)
- Chat: full-screen Sheet on mobile
- Forms: single-column on mobile

**Implementation steps**:
1. Add cross-module artifact linking (portfolio editor + search endpoint)
2. Create optimized summary query for customer list
3. Add search and advanced filters to list page
4. Enhance customer cards with full summary data
5. Refine agent system prompts with health signals and action suggestions
6. Add loading skeletons to all pages/tabs
7. Add error boundaries and error states
8. Add empty states to all tabs
9. Verify all toast notifications
10. Test responsive design at all breakpoints
11. Test end-to-end flows

## Testing Requirements

### Unit Tests

| Test File | Coverage |
|-----------|----------|
| `frontend/src/features/customers/utils/__tests__/format.test.ts` | Relationship health signal calculations |
| `backend/src/services/__tests__/CustomerService.test.ts` | Summary query, search |

### Manual Testing

- [ ] Cross-module: link customer artifact from portfolio editor
- [ ] Cross-module: linked artifacts show as clickable chips
- [ ] Customer cards show all summary metrics
- [ ] Search finds customers by name
- [ ] Search finds customers by vertical
- [ ] Sort options all work correctly
- [ ] Loading skeletons appear on initial load
- [ ] Error states display when API fails
- [ ] Empty states show correct messages and CTAs
- [ ] Toast notifications for all CRUD operations
- [ ] Agent mentions expiring agreements proactively
- [ ] Agent suggests follow-up actions after responses
- [ ] Responsive: mobile layout works for list and detail
- [ ] Responsive: chat opens as Sheet on mobile

## Error Handling

| Error Scenario | Handling Strategy |
|----------------|-------------------|
| Summary query slow | Show skeleton, then data when ready. Consider caching. |
| Search returns no results | Show "No customers match your search" filtered-empty state |
| Cross-module link broken (artifact deleted) | Show broken link indicator, allow unlinking |
| Agent prompt exceeds token limit | Truncate oldest events, summarize agreements |

## Validation Commands

```bash
cd frontend && npx tsc --noEmit
cd backend && npx tsc --noEmit
npm run build
cd backend && npm run test
cd frontend && npm run test
```

## Rollout Considerations

- **Monitoring**: Watch query performance for summary aggregation (may need database function for large datasets)
- **Agent prompts**: Monitor token usage in customer context builder (log context size)
- **Cross-module links**: Backward compatible (no existing portfolio artifacts affected)

---

*This spec is ready for implementation. Follow the patterns and validate at each step.*
