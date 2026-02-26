# Implementation Spec: Customers Management Platform - Phase 1

**PRD**: ./prd-phase-1.md
**UX/UI**: ./ux-ui-spec.md
**Estimated Effort**: XL

## Technical Approach

Phase 1 establishes the full database schema, backend API, and frontend feature module for customer management. The approach follows existing NextUp patterns exactly: Supabase migrations for schema, Express routes with Zod validation for API, React feature module with TanStack Query hooks and Zustand stores for frontend.

All 7 database tables are created upfront (customers, customer_agreements, customer_receivables, customer_projects, customer_artifacts, customer_events, customer_chat_messages) so subsequent phases only add API/UI layers without schema changes. RLS policies enforce per-user data isolation from day one using a `is_customer_owner()` helper function for performant ownership checks.

The frontend follows the Portfolio feature module structure: `features/customers/` with `components/`, `hooks/`, `pages/`, `stores/`, `types/`, `utils/`, and `validators/` subdirectories. Filter/search/sort state uses URL query params (`useSearchParams`) as source of truth for shareability and consistency.

## File Changes

### New Files

| File Path | Purpose |
|-----------|---------|
| **Database** | |
| `backend/src/db/migrations/NNN_customers_schema.sql` | Full schema: all 7 tables, RLS, indexes. **Note**: Check existing migrations in `backend/src/db/migrations/` and use the next sequential number (e.g., if `002_...` exists, use `003_customers_schema.sql`). |
| **Backend** | |
| `backend/src/types/customer.ts` | TypeScript types for all customer entities |
| `backend/src/services/CustomerService.ts` | Customer CRUD business logic |
| `backend/src/controllers/customer.controller.ts` | Express request handlers |
| `backend/src/routes/customers.ts` | Customer API routes |
| **Frontend** | |
| `frontend/src/features/customers/types/customer.ts` | Frontend TypeScript types (mirrors backend) |
| `frontend/src/features/customers/types/index.ts` | Barrel export |
| `frontend/src/features/customers/hooks/useCustomers.ts` | TanStack Query hooks for customer CRUD |
| `frontend/src/features/customers/hooks/index.ts` | Barrel export |
| `frontend/src/features/customers/stores/customerStore.ts` | Zustand store for UI state |
| `frontend/src/features/customers/stores/index.ts` | Barrel export |
| `frontend/src/features/customers/pages/CustomerListPage.tsx` | Customer list page component |
| `frontend/src/features/customers/pages/CustomerDetailPage.tsx` | Customer detail page with tabs |
| `frontend/src/features/customers/pages/index.ts` | Barrel export |
| `frontend/src/features/customers/components/shared/CustomerCard.tsx` | Horizontal customer card |
| `frontend/src/features/customers/components/shared/CustomerStatusBadge.tsx` | Thin wrapper around existing `StatusBadge` with customer-specific status-to-color mapping |
| `frontend/src/features/customers/components/shared/CustomerStatusSelect.tsx` | Status dropdown selector |
| `frontend/src/features/customers/components/shared/EmptyState.tsx` | Customer-specific empty states |
| `frontend/src/features/customers/components/shared/index.ts` | Barrel export |
| `frontend/src/features/customers/components/overview/OverviewTab.tsx` | Overview tab content |
| `frontend/src/features/customers/components/overview/QuickStats.tsx` | Stats row component |
| `frontend/src/features/customers/components/overview/CustomerInfoSection.tsx` | Info display/edit section |
| `frontend/src/features/customers/components/overview/TeamSection.tsx` | Team members section |
| `frontend/src/features/customers/components/overview/EventTimeline.tsx` | Event timeline section |
| `frontend/src/features/customers/components/overview/index.ts` | Barrel export |
| `frontend/src/features/customers/components/forms/NewCustomerDialog.tsx` | Customer creation dialog |
| `frontend/src/features/customers/components/forms/index.ts` | Barrel export |
| `frontend/src/features/customers/components/index.ts` | Barrel export |
| `frontend/src/features/customers/utils/format.ts` | Customer-specific formatters |
| `frontend/src/features/customers/utils/index.ts` | Barrel export |

### Modified Files

| File Path | Changes |
|-----------|---------|
| `backend/src/routes/index.ts` | Add `router.use('/customers', requireAuth, customersRouter)` |
| `frontend/src/components/layout/Sidebar.tsx` | Add "Customers" to `mainNavItems` with Users icon |
| `frontend/src/components/layout/MobileNav.tsx` | Add "Customers" to mobile nav items. **Note**: This file may not exist in the codebase — verify first. If missing, create it as a new file alongside Sidebar.tsx. |
| `frontend/src/App.tsx` (or router config) | Add `/customers` and `/customers/:id` routes |

## Implementation Details

### Database Schema

**Pattern to follow**: `backend/src/db/migrations/001_portfolio_schema.sql`

```sql
-- Customers table (soft delete via deleted_at)
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'lead'
    CHECK (status IN ('lead', 'prospect', 'negotiation', 'live', 'on_hold', 'archive')),
  info JSONB DEFAULT '{}'::jsonb,
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer agreements (override_status for terminated/suspended)
CREATE TABLE customer_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  scope TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'retainer',
  start_date DATE,
  end_date DATE,
  pricing JSONB DEFAULT '{}'::jsonb,
  override_status TEXT DEFAULT NULL CHECK (override_status IN ('terminated', 'suspended')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer receivables
CREATE TABLE customer_receivables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('invoice', 'payment')),
  amount NUMERIC(12,2) NOT NULL,
  date DATE NOT NULL,
  status TEXT DEFAULT 'sent',
  description TEXT,
  reference TEXT,
  linked_invoice_id UUID REFERENCES customer_receivables(id) ON DELETE SET NULL,
  linked_agreement_id UUID REFERENCES customer_agreements(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer projects (product workflows)
CREATE TABLE customer_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'planning'
    CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'archived')),
  agreement_id UUID REFERENCES customer_agreements(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer artifacts (project deliverables)
CREATE TABLE customer_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES customer_projects(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'custom',
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'in_progress', 'review', 'final', 'archived')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer events (interaction log)
CREATE TABLE customer_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL DEFAULT 'update',
  title TEXT NOT NULL,
  description TEXT,
  participants TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,
  event_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer chat messages (schema-only in Phase 1, activated in Phase 4)
CREATE TABLE customer_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  agent_type TEXT CHECK (agent_type IN ('customer_mgmt', 'product_mgmt')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_customers_user_id ON customers(user_id);
CREATE INDEX idx_customers_user_id_id ON customers(user_id, id);  -- Composite for RLS helper
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_deleted_at ON customers(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_customer_agreements_customer_id ON customer_agreements(customer_id);
CREATE INDEX idx_customer_receivables_customer_id ON customer_receivables(customer_id);
CREATE INDEX idx_customer_receivables_type ON customer_receivables(type);
CREATE INDEX idx_customer_projects_customer_id ON customer_projects(customer_id);
CREATE INDEX idx_customer_artifacts_project_id ON customer_artifacts(project_id);
CREATE INDEX idx_customer_artifacts_customer_id ON customer_artifacts(customer_id);
CREATE INDEX idx_customer_events_customer_id ON customer_events(customer_id);
CREATE INDEX idx_customer_events_event_date ON customer_events(event_date DESC);
CREATE INDEX idx_customer_chat_messages_customer_id ON customer_chat_messages(customer_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER customer_agreements_updated_at BEFORE UPDATE ON customer_agreements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER customer_receivables_updated_at BEFORE UPDATE ON customer_receivables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER customer_projects_updated_at BEFORE UPDATE ON customer_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER customer_artifacts_updated_at BEFORE UPDATE ON customer_artifacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS Policies
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_receivables ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_chat_messages ENABLE ROW LEVEL SECURITY;

-- Helper function for performant child-table ownership checks
-- Uses the composite index (user_id, id) for O(1) lookup
CREATE OR REPLACE FUNCTION is_customer_owner(cid UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM customers
    WHERE id = cid AND user_id = auth.uid() AND deleted_at IS NULL
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Customers: direct user_id check + soft delete filter
CREATE POLICY customers_select ON customers FOR SELECT
  USING (user_id = auth.uid() AND deleted_at IS NULL);
CREATE POLICY customers_insert ON customers FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY customers_update ON customers FOR UPDATE
  USING (user_id = auth.uid() AND deleted_at IS NULL);
CREATE POLICY customers_delete ON customers FOR DELETE
  USING (user_id = auth.uid());

-- Child tables: use helper function for performant ownership check
-- Agreements
CREATE POLICY agreements_select ON customer_agreements FOR SELECT
  USING (is_customer_owner(customer_id));
CREATE POLICY agreements_insert ON customer_agreements FOR INSERT
  WITH CHECK (is_customer_owner(customer_id));
CREATE POLICY agreements_update ON customer_agreements FOR UPDATE
  USING (is_customer_owner(customer_id));
CREATE POLICY agreements_delete ON customer_agreements FOR DELETE
  USING (is_customer_owner(customer_id));

-- Repeat same pattern for receivables, projects, artifacts, events, chat_messages
-- All use: USING (is_customer_owner(customer_id))
```

**Key decisions**:
- `info` is JSONB on the `customers` table rather than a separate table. This simplifies queries and allows flexible schema evolution for customer information fields.
- All child tables use `customer_id` FK to `customers` for RLS chain. RLS uses `is_customer_owner()` helper function with composite index for performance.
- `updated_at` trigger ensures automatic timestamp updates.
- Receivables uses `NUMERIC(12,2)` for currency precision.
- Soft delete via `deleted_at` column prevents accidental loss of financial history.
- `override_status` on agreements allows manual termination/suspension beyond computed date-based status.
- `customer_chat_messages` table created in Phase 1 (schema-only) for Phase 4 activation — prevents sessionStorage-only chat losing customer conversation history.

### Backend Service

**Pattern to follow**: Existing service patterns in `backend/src/services/`

```typescript
// backend/src/types/customer.ts
export type CustomerStatus = 'lead' | 'prospect' | 'negotiation' | 'live' | 'on_hold' | 'archive';

export interface Customer {
  id: string;
  user_id: string;
  name: string;
  status: CustomerStatus;
  info: CustomerInfo;
  created_at: string;
  updated_at: string;
}

export interface CustomerInfo {
  about?: string;
  vertical?: string;
  persona?: string;
  icp?: string;
  product?: {
    name?: string;
    stage?: string;
    category?: string;
    description?: string;
    url?: string;
  };
  team?: TeamMember[];
  [key: string]: unknown; // Extensible
}

export interface TeamMember {
  name: string;
  role?: string;
  email?: string;
  notes?: string;
}
```

```typescript
// backend/src/services/CustomerService.ts
export class CustomerService {
  constructor(private supabase: SupabaseClient) {}

  async list(params: { status?: string; search?: string; sort?: string }) { ... }
  async getById(id: string) { ... }
  async create(data: CreateCustomerInput) { ... }
  async update(id: string, data: UpdateCustomerInput) { ... }
  async updateStatus(id: string, status: CustomerStatus) { ... }
  async delete(id: string) { ... }
}
```

**Implementation steps**:
1. Create types file with all customer-related interfaces
2. Create CustomerService with Supabase client injection (from requestContext)
3. Create controller with Zod validation schemas for each endpoint
4. Create routes file mounting all endpoints under `/api/customers`
5. Register routes in main routes/index.ts

### Frontend Feature Module

**Pattern to follow**: `frontend/src/features/portfolio/`

```typescript
// frontend/src/features/customers/types/customer.ts
// Mirror backend types for frontend use

// frontend/src/features/customers/hooks/useCustomers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

const customerKeys = {
  all: ['customers'] as const,
  lists: () => [...customerKeys.all, 'list'] as const,
  list: (filters: CustomerFilters) => [...customerKeys.lists(), filters] as const,
  details: () => [...customerKeys.all, 'detail'] as const,
  detail: (id: string) => [...customerKeys.details(), id] as const,
};

export function useCustomers(filters: CustomerFilters) {
  return useQuery({
    queryKey: customerKeys.list(filters),
    queryFn: async () => {
      let query = supabase.from('customers').select('*');
      if (filters.status) query = query.eq('status', filters.status);
      if (filters.search) query = query.ilike('name', `%${filters.search}%`);
      // sort handling
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: customerKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateCustomerInput) => {
      const { data, error } = await supabase
        .from('customers')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
  });
}
// Similar for useUpdateCustomer, useDeleteCustomer
```

```typescript
// frontend/src/features/customers/stores/customerStore.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// NOTE: Filter/search/sort state uses URL query params (useSearchParams) as source of truth.
// This store holds only transient UI state that doesn't need URL persistence.

interface CustomerStore {
  // Active customer context (for chat integration)
  activeCustomerId: string | null;
  activeTab: 'overview' | 'agreements' | 'receivables' | 'projects' | null;
  setActiveCustomer: (id: string | null) => void;
  setActiveTab: (tab: 'overview' | 'agreements' | 'receivables' | 'projects' | null) => void;

  // Selected project within Projects tab (persists across tab switches)
  selectedProjectIds: Record<string, string | null>;  // keyed by customerId
  setSelectedProjectId: (customerId: string, projectId: string | null) => void;
}

export const useCustomerStore = create<CustomerStore>()(
  devtools(
    (set) => ({
      activeCustomerId: null,
      activeTab: null,
      setActiveCustomer: (id) => set({ activeCustomerId: id }, false, 'setActiveCustomer'),
      setActiveTab: (tab) => set({ activeTab: tab }, false, 'setActiveTab'),
      selectedProjectIds: {},
      setSelectedProjectId: (customerId, projectId) =>
        set(
          (state) => ({
            selectedProjectIds: { ...state.selectedProjectIds, [customerId]: projectId },
          }),
          false,
          'setSelectedProjectId'
        ),
    }),
    { name: 'CustomerStore' }
  )
);
```

**Filter state via URL params** (used in CustomerListPage):
```typescript
// frontend/src/features/customers/pages/CustomerListPage.tsx
import { useSearchParams } from 'react-router-dom';

const [searchParams, setSearchParams] = useSearchParams();
const statusFilter = searchParams.get('status') || null;
const searchQuery = searchParams.get('q') || '';
const sortBy = searchParams.get('sort') || 'updated_at';

// Update filters
const setStatusFilter = (status: string | null) => {
  setSearchParams(prev => {
    if (status) prev.set('status', status);
    else prev.delete('status');
    return prev;
  });
};
```

**Implementation steps**:
1. Create types (mirror backend types)
2. Create Zustand store for transient UI state (active customer, active tab, selected project)
3. Create TanStack Query hooks (CRUD + data access split: direct Supabase for reads, backend API for deletes)
4. Create shared components (CustomerCard, CustomerStatusBadge as wrapper around existing StatusBadge, etc.)
5. Create Overview tab components (QuickStats, CustomerInfoSection, TeamSection, EventTimeline)
6. Create NewCustomerDialog — after successful creation, navigate to `/customers/:newId`
7. Create CustomerListPage with URL-param-based filters (`useSearchParams`)
8. Create CustomerDetailPage with tab shell — update `activeCustomerId`/`activeTab` in store on mount/tab change
9. Add routes and sidebar nav
10. Create Phase 1 placeholder states for Agreements/Receivables/Projects tabs (use EmptyState component, NOT "Coming soon")

### Sidebar Navigation Update

**Pattern to follow**: Existing `mainNavItems` in `Sidebar.tsx`

```typescript
// Add to mainNavItems array
const mainNavItems: NavItem[] = [
  { icon: FileText, label: 'Portfolio', href: '/portfolio' },
  { icon: Users, label: 'Customers', href: '/customers' },  // NEW
]
```

**Key decisions**:
- `Users` icon from Lucide (two-person silhouette, distinct from `User` for Profile)
- Positioned after Portfolio in the main nav section

## Testing Requirements

### Unit Tests

| Test File | Coverage |
|-----------|----------|
| `backend/src/services/__tests__/CustomerService.test.ts` | CustomerService CRUD methods |
| `frontend/src/features/customers/hooks/__tests__/useCustomers.test.ts` | Query hook behavior |

**Key test cases**:
- Create customer with minimal fields (name only)
- Create customer with full info
- List customers with status filter
- List customers with search
- Update customer info (partial update)
- Update customer status
- Delete customer cascades to child records
- RLS prevents accessing other users' customers

### Integration Tests

| Test File | Coverage |
|-----------|----------|
| `backend/src/routes/__tests__/customers.integration.test.ts` | All API endpoints |

**Key scenarios**:
- POST /api/customers → 201 with created customer
- GET /api/customers → 200 with user's customers only
- GET /api/customers/:id → 200 for own, 404 for others
- PUT /api/customers/:id → 200 with updated data
- PATCH /api/customers/:id/status → 200 with new status
- DELETE /api/customers/:id → 200, verify cascade

### Manual Testing

- [ ] Sidebar shows "Customers" nav item, navigates to /customers
- [ ] Customer list page shows cards with correct data
- [ ] Status filter bar filters cards correctly
- [ ] New Customer dialog creates customer and navigates to detail
- [ ] Customer detail page shows tabs, Overview tab is functional
- [ ] Status dropdown changes status with toast notification
- [ ] Customer info editing saves changes
- [ ] Delete customer shows confirmation and removes from list

## Error Handling

| Error Scenario | Handling Strategy |
|----------------|-------------------|
| Customer not found | Return 404, show "Customer not found" page |
| Validation failure | Return 400 with Zod error details, show inline field errors |
| RLS violation | Return empty result (Supabase returns no rows), handle gracefully |
| Network error | toast.error with retry suggestion |
| Duplicate name | Allow (names don't need to be unique) |
| Delete customer | Soft delete (`deleted_at = NOW()`). Show confirmation dialog: "Archive Acme Corp? This will hide all their agreements, invoices, and projects. You can restore within 30 days." |

## Validation Commands

```bash
# Type checking
cd frontend && npx tsc --noEmit
cd backend && npx tsc --noEmit

# Unit tests
cd backend && npm run test
cd frontend && npm run test

# Build
npm run build

# Apply migration
# Use mcp__supabase__apply_migration tool
```

## Rollout Considerations

- **Feature flag**: Not needed for Phase 1 (additive feature, no existing functionality affected)
- **Migration**: Apply via Supabase MCP tool before deploying code
- **Monitoring**: Watch for RLS policy errors in Supabase logs
- **Rollback plan**: Drop tables if needed (no existing data affected)

---

*This spec is ready for implementation. Follow the patterns and validate at each step.*
