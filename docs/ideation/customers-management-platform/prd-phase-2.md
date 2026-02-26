# PRD: Customers Management Platform - Phase 2

**Contract**: ./contract.md
**Phase**: 2 of 5
**Focus**: Agreements management and Receivables tracking

## Phase Overview

Phase 2 brings the financial dimension to life. It implements full CRUD for service agreements (scope, type, dates, pricing) and receivables tracking (invoices, payments, balance calculations). Both the Agreements and Receivables tabs in the customer detail page become fully functional.

This phase is sequenced second because it builds on the customer data model and detail page shell from Phase 1, and it's independent of the product workflows (Phase 3) and AI agents (Phase 4). Financial tracking is core to the advisor's workflow - knowing what's been agreed, invoiced, paid, and outstanding is essential to customer management.

After Phase 2, advisors can manage the complete financial picture for each customer: create service agreements with scope and pricing, track invoices and payments, and see outstanding balances - all within the customer detail page.

## User Stories

1. As an advisor, I want to create service agreements for a customer so that I can document what services I'm providing, the scope, timeline, and pricing.
2. As an advisor, I want to edit and delete agreements so that I can keep my service records accurate as engagements evolve.
3. As an advisor, I want to see all agreements for a customer in a list so that I can quickly review our service arrangements.
4. As an advisor, I want to record invoices I've sent to a customer so that I can track what's been billed.
5. As an advisor, I want to record payments received from a customer so that I can track what's been paid.
6. As an advisor, I want to see the outstanding balance for a customer so that I know what's owed at a glance.
7. As an advisor, I want to see a receivables summary (total invoiced, total paid, balance) on the customer card so that I get a quick financial overview from the list page.

## Functional Requirements

### Agreements Tab

- **FR-2.1**: Agreements tab displays a list of all service agreements for the customer, sorted by start date (most recent first).
- **FR-2.2**: Each agreement card/row shows: scope summary, type, start date, end date, pricing summary, and status indicators (active/expired/upcoming based on dates).
- **FR-2.3**: "Add Agreement" button opens a creation form with fields: scope (text/textarea), type (select: retainer, project-based, hourly, fixed-price, equity, hybrid), start date (date picker), end date (date picker, optional), pricing (structured: amount, currency, frequency/billing cycle, notes).
- **FR-2.4**: Each agreement can be edited inline or via edit modal. All fields are editable.
- **FR-2.5**: Agreements can be deleted with confirmation dialog.
- **FR-2.6**: Agreement type options are extensible (stored as text, UI provides select with common types + custom option).
- **FR-2.7**: Pricing field supports structured data: base amount, currency (USD default), billing frequency (monthly, quarterly, annually, one-time, per-milestone), and optional notes.
- **FR-2.8**: Visual indicator for agreement status: Active (green - current date is between start and end), Upcoming (blue - start date is in future), Expired (gray - end date has passed), Open-ended (amber - no end date set).

### Receivables Tab

- **FR-2.9**: Receivables tab shows a summary header: Total Invoiced, Total Paid, Outstanding Balance (calculated).
- **FR-2.10**: Below summary, a chronological list of all receivable entries (invoices and payments) with: type icon, description, amount, date, status.
- **FR-2.11**: "Record Invoice" button opens a form: amount (number), date (date picker), description (text), status (select: draft, sent, overdue, paid, cancelled), reference/invoice number (optional text), linked agreement (optional select from customer's agreements).
- **FR-2.12**: "Record Payment" button opens a form: amount (number), date (date picker), description (text), payment method (optional: bank transfer, check, credit card, other), linked invoice (optional select from customer's invoices).
- **FR-2.13**: Invoice status can be updated (e.g., from 'sent' to 'paid' when payment is recorded).
- **FR-2.14**: Outstanding balance = sum of all invoice amounts (non-cancelled) - sum of all payment amounts.
- **FR-2.15**: Receivable entries can be edited and deleted with confirmation.
- **FR-2.16**: Entries are color-coded by type: invoices in one color scheme, payments in another.

### Backend API - Agreements

- **FR-2.17**: `GET /api/customers/:customerId/agreements` - List all agreements for a customer.
- **FR-2.18**: `POST /api/customers/:customerId/agreements` - Create new agreement.
- **FR-2.19**: `PUT /api/customers/:customerId/agreements/:id` - Update agreement.
- **FR-2.20**: `DELETE /api/customers/:customerId/agreements/:id` - Delete agreement.

### Backend API - Receivables

- **FR-2.21**: `GET /api/customers/:customerId/receivables` - List all receivables with summary calculations.
- **FR-2.22**: `POST /api/customers/:customerId/receivables` - Create invoice or payment entry.
- **FR-2.23**: `PUT /api/customers/:customerId/receivables/:id` - Update receivable entry.
- **FR-2.24**: `DELETE /api/customers/:customerId/receivables/:id` - Delete receivable entry.
- **FR-2.25**: `GET /api/customers/:customerId/receivables/summary` - Get financial summary (total invoiced, total paid, balance).

### Customer Card Enhancement

- **FR-2.26**: Customer list cards now show a small financial summary: number of active agreements and outstanding balance (if any).

### State Management

- **FR-2.27**: TanStack Query hooks: `useAgreements(customerId)`, `useCreateAgreement()`, `useUpdateAgreement()`, `useDeleteAgreement()`.
- **FR-2.28**: TanStack Query hooks: `useReceivables(customerId)`, `useReceivablesSummary(customerId)`, `useCreateReceivable()`, `useUpdateReceivable()`, `useDeleteReceivable()`.

## Non-Functional Requirements

- **NFR-2.1**: Balance calculations are accurate to 2 decimal places with proper currency handling.
- **NFR-2.2**: Agreement and receivable lists load under 200ms p95 for customers with up to 50 agreements and 200 receivable entries.
- **NFR-2.3**: RLS ensures receivables and agreements inherit customer ownership checks.
- **NFR-2.4**: Currency amounts stored as numeric(12,2) to prevent floating-point precision issues.
- **NFR-2.5**: Date handling uses proper timezone-aware timestamps where needed.

## Dependencies

### Prerequisites

- Phase 1 complete (customers table, detail page with tab shell, API layer)
- `customer_agreements` and `customer_receivables` tables exist (schema from Phase 1)

### Outputs for Next Phase

- Fully functional Agreements and Receivables tabs
- Financial data accessible for AI agents (Phase 4) to reference in conversations
- Agreement data structure available for linking to projects (Phase 3)

## Acceptance Criteria

- [ ] Agreements tab shows list of agreements for a customer
- [ ] Create/edit/delete agreement works end-to-end
- [ ] Agreement types include: retainer, project-based, hourly, fixed-price, equity, hybrid
- [ ] Agreement status indicators show correctly (active/upcoming/expired/open-ended)
- [ ] Pricing field captures amount, currency, frequency, and notes
- [ ] Receivables tab shows summary header (invoiced, paid, balance)
- [ ] Invoice creation/editing works with all fields
- [ ] Payment recording works with optional invoice linking
- [ ] Outstanding balance calculates correctly
- [ ] Invoice status can be updated to 'paid'
- [ ] Customer list cards show active agreements count and balance
- [ ] All API endpoints validate ownership through RLS
- [ ] Currency amounts have 2 decimal precision
- [ ] Unit tests for balance calculations
- [ ] Integration tests for agreements and receivables API endpoints

---

*Review this PRD and provide feedback before spec generation.*
