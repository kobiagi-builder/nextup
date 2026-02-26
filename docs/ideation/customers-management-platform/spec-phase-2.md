# Implementation Spec: Customers Management Platform - Phase 2

**PRD**: ./prd-phase-2.md
**UX/UI**: ./ux-ui-spec.md (Sections 4, 5)
**Estimated Effort**: L

## Technical Approach

Phase 2 activates the Agreements and Receivables tabs that were created as shell placeholders in Phase 1. The database tables already exist from Phase 1's migration. This phase adds backend API endpoints for agreements and receivables CRUD, frontend components for both tabs, and enhances customer cards with financial summary data.

The approach follows the same patterns established in Phase 1: Express controllers with Zod validation, TanStack Query hooks for data fetching, and shadcn/ui components for the UI. Financial summary calculations (balance = invoiced - paid) are computed on the backend using PostgreSQL NUMERIC arithmetic to avoid JavaScript floating-point precision issues, then returned via a dedicated summary endpoint.

## File Changes

### New Files

| File Path | Purpose |
|-----------|---------|
| **Backend** | |
| `backend/src/services/AgreementService.ts` | Agreement CRUD business logic |
| `backend/src/controllers/agreement.controller.ts` | Agreement request handlers |
| `backend/src/routes/agreements.ts` | Agreement API routes (nested under customers) |
| `backend/src/services/ReceivableService.ts` | Receivable CRUD + summary logic |
| `backend/src/controllers/receivable.controller.ts` | Receivable request handlers |
| `backend/src/routes/receivables.ts` | Receivable API routes (nested under customers) |
| **Frontend** | |
| `frontend/src/features/customers/hooks/useAgreements.ts` | TanStack Query hooks for agreements |
| `frontend/src/features/customers/hooks/useReceivables.ts` | TanStack Query hooks for receivables |
| `frontend/src/features/customers/components/agreements/AgreementsTab.tsx` | Agreements tab content |
| `frontend/src/features/customers/components/agreements/AgreementCard.tsx` | Single agreement card |
| `frontend/src/features/customers/components/agreements/AgreementForm.tsx` | Create/edit agreement dialog |
| `frontend/src/features/customers/components/agreements/index.ts` | Barrel export |
| `frontend/src/features/customers/components/receivables/ReceivablesTab.tsx` | Receivables tab content |
| `frontend/src/features/customers/components/receivables/FinancialSummary.tsx` | Summary header card |
| `frontend/src/features/customers/components/receivables/TransactionRow.tsx` | Invoice/payment row |
| `frontend/src/features/customers/components/receivables/InvoiceForm.tsx` | Record invoice dialog |
| `frontend/src/features/customers/components/receivables/PaymentForm.tsx` | Record payment dialog |
| `frontend/src/features/customers/components/receivables/index.ts` | Barrel export |

### Modified Files

| File Path | Changes |
|-----------|---------|
| `backend/src/routes/index.ts` | Mount agreements and receivables sub-routes |
| `frontend/src/features/customers/hooks/index.ts` | Export new hooks |
| `frontend/src/features/customers/components/index.ts` | Export new components |
| `frontend/src/features/customers/pages/CustomerDetailPage.tsx` | Replace Agreements/Receivables tab placeholders with real components |
| `frontend/src/features/customers/components/shared/CustomerCard.tsx` | Add agreements count + balance to card metrics |
| `frontend/src/features/customers/hooks/useCustomers.ts` | Add summary data fetching (agreements count, balance) |
| `frontend/src/features/customers/types/customer.ts` | Add Agreement, Receivable, FinancialSummary types |

## Implementation Details

### Agreement Types

```typescript
export interface Agreement {
  id: string;
  customer_id: string;
  scope: string;
  type: AgreementType;
  start_date: string | null;
  end_date: string | null;
  pricing: AgreementPricing;
  created_at: string;
  updated_at: string;
}

export type AgreementType = 'retainer' | 'project_based' | 'hourly' | 'fixed_price' | 'equity' | 'hybrid' | 'custom';

export interface AgreementPricing {
  amount: number;
  currency: string;       // 'USD', 'EUR', etc.
  frequency: string;      // 'monthly', 'quarterly', 'annually', 'one_time', 'per_milestone'
  unit?: 'per_hour' | 'per_month' | 'per_quarter' | 'per_year' | 'per_milestone' | 'total';
  notes?: string;
}

export type AgreementStatus = 'active' | 'upcoming' | 'expired' | 'open_ended' | 'terminated' | 'suspended';
```

### Agreement Status Derivation (computed, with override support)

```typescript
// frontend/src/features/customers/utils/format.ts
export function getAgreementStatus(agreement: Agreement): AgreementStatus {
  // Manual override takes precedence (terminated, suspended)
  if (agreement.override_status) return agreement.override_status as AgreementStatus;

  const now = new Date();
  const start = agreement.start_date ? new Date(agreement.start_date) : null;
  const end = agreement.end_date ? new Date(agreement.end_date) : null;

  if (!end) return 'open_ended';
  if (end < now) return 'expired';
  if (start && start > now) return 'upcoming';
  return 'active';
}
```

### Receivable Types

```typescript
export interface Receivable {
  id: string;
  customer_id: string;
  type: 'invoice' | 'payment';
  amount: number;         // Always positive
  date: string;
  status: string;         // Invoice: 'draft' | 'sent' | 'overdue' | 'paid' | 'cancelled'
                          // Payment: 'completed'
  description: string | null;
  reference: string | null;
  linked_invoice_id: string | null;
  linked_agreement_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface FinancialSummary {
  totalInvoiced: string;   // String to preserve NUMERIC precision from backend
  totalPaid: string;       // String to preserve NUMERIC precision from backend
  balance: string;         // totalInvoiced - totalPaid (can be negative = credit)
  balanceDirection: 'positive' | 'negative' | 'zero';
}
```

### Financial Summary Calculation (Backend)

**IMPORTANT**: Financial calculations MUST be done on the backend using PostgreSQL NUMERIC arithmetic to avoid JavaScript floating-point precision issues.

```sql
-- Backend endpoint: GET /api/customers/:customerId/receivables/summary
SELECT
  COALESCE(SUM(CASE WHEN type = 'invoice' AND status != 'cancelled' THEN amount ELSE 0 END), 0)::TEXT as total_invoiced,
  COALESCE(SUM(CASE WHEN type = 'payment' THEN amount ELSE 0 END), 0)::TEXT as total_paid,
  (COALESCE(SUM(CASE WHEN type = 'invoice' AND status != 'cancelled' THEN amount ELSE 0 END), 0)
   - COALESCE(SUM(CASE WHEN type = 'payment' THEN amount ELSE 0 END), 0))::TEXT as balance
FROM customer_receivables
WHERE customer_id = $1;
```

The frontend receives amounts as strings and uses them for display only (formatted via `Intl.NumberFormat`). No arithmetic is performed client-side.

```typescript
// Frontend display helper
export function formatCurrency(amount: string): string {
  const num = parseFloat(amount);
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
}

export function getBalanceDirection(balance: string): 'positive' | 'negative' | 'zero' {
  const num = parseFloat(balance);
  if (num > 0) return 'positive';
  if (num < 0) return 'negative';
  return 'zero';
}
```
```

### Backend API Endpoints

**Agreements routes** (mounted at `/api/customers/:customerId/agreements`):

| Method | Path | Handler |
|--------|------|---------|
| `GET` | `/` | List agreements for customer |
| `POST` | `/` | Create agreement |
| `PUT` | `/:id` | Update agreement |
| `DELETE` | `/:id` | Delete agreement |

**Receivables routes** (mounted at `/api/customers/:customerId/receivables`):

| Method | Path | Handler |
|--------|------|---------|
| `GET` | `/` | List receivables for customer |
| `GET` | `/summary` | Get financial summary (computed via PostgreSQL NUMERIC) |
| `POST` | `/` | Create invoice or payment |
| `PUT` | `/:id` | Update receivable |
| `DELETE` | `/:id` | Delete receivable |

**Express sub-router mounting** (IMPORTANT: use `mergeParams: true`):
```typescript
// backend/src/routes/customers.ts
import { agreementsRouter } from './agreements';
import { receivablesRouter } from './receivables';

const customersRouter = Router();
customersRouter.use('/:customerId/agreements', agreementsRouter);
customersRouter.use('/:customerId/receivables', receivablesRouter);

// backend/src/routes/agreements.ts
export const agreementsRouter = Router({ mergeParams: true });
// req.params.customerId is now accessible

// backend/src/routes/receivables.ts
export const receivablesRouter = Router({ mergeParams: true });
```

Note: Frontend reads agreements and receivables directly from Supabase (RLS-protected) for individual pages. The customer card list uses the backend summary endpoint for aggregated metrics to avoid fetching all child records client-side.

### Customer Card Enhancement

Add to the metrics row in CustomerCard:

```typescript
// Fetch summary data with the customer list
// Option A: Use Supabase count queries
const { data: customers } = await supabase
  .from('customers')
  .select(`
    *,
    agreements:customer_agreements(count),
    receivables:customer_receivables(amount, type, status)
  `)
  .eq('user_id', userId);

// Display in card
<div className="flex items-center gap-1.5">
  <FileText className="h-3.5 w-3.5" />
  <span>{activeAgreementsCount} Agreements</span>
</div>
<div className={cn("flex items-center gap-1.5", balance > 0 && "text-amber-400")}>
  <DollarSign className="h-3.5 w-3.5" />
  <span>{balance > 0 ? `$${balance.toLocaleString()} outstanding` : '—'}</span>
</div>
```

**Implementation steps**:
1. Add Agreement and Receivable types to types file
2. Create AgreementService and ReceivableService
3. Create controllers with Zod validation
4. Create routes and mount in main router
5. Create TanStack Query hooks (useAgreements, useReceivables)
6. Build AgreementsTab with AgreementCard and AgreementForm
7. Build ReceivablesTab with FinancialSummary, TransactionRow, InvoiceForm, PaymentForm
8. Replace tab placeholders in CustomerDetailPage
9. Enhance CustomerCard with financial summary
10. Update useCustomers hook to include summary data

## Testing Requirements

### Unit Tests

| Test File | Coverage |
|-----------|----------|
| `backend/src/services/__tests__/AgreementService.test.ts` | Agreement CRUD |
| `backend/src/services/__tests__/ReceivableService.test.ts` | Receivable CRUD + summary |
| `frontend/src/features/customers/utils/__tests__/format.test.ts` | Agreement status derivation, financial calculations |

**Key test cases**:
- Agreement status: active when between dates, expired when past end, upcoming when before start, open_ended when no end
- Financial summary: correct totals with mixed invoices and payments
- Financial summary: cancelled invoices excluded
- Financial summary: balance = 0 when fully paid
- Currency precision: amounts maintain 2 decimal places

### Integration Tests

| Test File | Coverage |
|-----------|----------|
| `backend/src/routes/__tests__/agreements.integration.test.ts` | Agreements API |
| `backend/src/routes/__tests__/receivables.integration.test.ts` | Receivables API |

### Manual Testing

- [ ] Agreements tab shows list of agreements
- [ ] Add agreement with all fields populated
- [ ] Agreement status indicators display correctly (active/expired/upcoming/open-ended)
- [ ] Edit agreement updates correctly
- [ ] Delete agreement with confirmation
- [ ] Receivables summary shows correct totals
- [ ] Record invoice creates entry in list
- [ ] Record payment creates entry with green styling
- [ ] Outstanding balance updates in real-time after recording payment
- [ ] Customer cards show agreements count and balance

## Error Handling

| Error Scenario | Handling Strategy |
|----------------|-------------------|
| Invalid amount (negative) | Zod validation rejects, inline error |
| Invalid date range (end before start) | Frontend validation warning |
| Delete agreement linked to receivables | Allow (FK is SET NULL) |
| Currency mismatch | Not enforced (advisory notes field for mixed currencies) |
| Payment linked to invoice | When payment amount >= invoice amount, auto-update invoice status to 'paid'. For partial payments, keep invoice at current status and show "Partially paid" indicator. |
| Negative balance (overpayment) | Display as "Credit: $X" in blue, not as negative outstanding. Add tooltip: "Credit balance from overpayment." |

## Validation Commands

```bash
cd frontend && npx tsc --noEmit
cd backend && npx tsc --noEmit
cd backend && npm run test
cd frontend && npm run test
npm run build
```

---

*This spec is ready for implementation. Follow the patterns and validate at each step.*
