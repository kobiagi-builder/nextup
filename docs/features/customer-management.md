# Customer Management

**Created:** 2026-02-25
**Last Updated:** 2026-02-25
**Version:** 4.0.0
**Status:** Active (Phase 5)

## Overview

Customer Management allows advisors and consultants to track their client relationships through a CRM-lite interface. Each customer has a lifecycle status, contact info, team members, event timeline, service agreements, financial receivables, projects, and deliverable artifacts. Phase 1 delivered the core CRUD, overview tab, and status workflows. Phase 2 added Agreements and Receivables with full CRUD, computed status logic, and financial summary reporting. Phase 3 activates the Projects tab with full project and artifact CRUD, including a TipTap rich text editor with auto-save for artifact content. Phase 4 added dual AI agents (Customer Mgmt + Product Mgmt) with auto-routing and structured response cards. Phase 5 delivers enriched customer list cards with summary metrics (active agreements, outstanding balance, active projects, last activity), full-text search via PostgreSQL TSVECTOR, dashboard stats RPC, agent prompt refinement with health signals, UX polish (structured skeletons, AlertDialog confirmations, event timeline filter, responsive grid), and cross-module linking between portfolio and customer artifacts.

## User Perspective

### What It Does

- **Customer List** -- Browse, full-text search, filter by status, sort by 6 fields (name, status, created, updated, last activity, outstanding balance)
- **Status Pipeline** -- Move customers through `lead > prospect > negotiation > live > on_hold > archive`
- **Customer Detail** -- View and edit name, status, info fields, team members, and event timeline
- **Enriched Cards** -- List cards show active agreements count, outstanding balance, active projects count, and last activity date
- **Dashboard Stats** -- Total customers, active customers, total outstanding, expiring agreements (within 30 days)
- **Quick Actions** -- Inline status change from list cards, archive with AlertDialog confirmation (replaces window.confirm)
- **Cross-Module Linking** -- Portfolio artifacts can reference customer artifacts; customer artifacts show "Referenced by" badges linking back to portfolio artifacts
- **Agreements** -- Create, edit, terminate, and delete service agreements with scope, type, pricing, and date tracking. Status is computed from dates (active, upcoming, expired, open-ended) with manual override (terminated, suspended)
- **Receivables** -- Record invoices and payments, track financial summary (total invoiced, total paid, outstanding balance). Mark invoices as paid, link payments to invoices, link invoices to agreements
- **Projects** -- Create and manage projects with name, description, status, and optional linked agreement. Navigate into a project to see its artifacts
- **Artifacts** -- Create deliverable documents (strategy, research, roadmap, product spec, etc.) within projects. Edit artifact content in a side-panel TipTap rich text editor with auto-save (1.5s debounce). Content stored as Markdown, edited as HTML

### Entry Points

| Entry | Route | How |
|-------|-------|-----|
| Sidebar "Customers" | `/customers` | Click nav item |
| Mobile bottom nav | `/customers` | Tap "Customers" |
| Customer card click | `/customers/:id` | Click any card in list |

### Customer Statuses

| Status | Label | Color | Description |
|--------|-------|-------|-------------|
| `lead` | Lead | Blue | Initial contact, not yet qualified |
| `prospect` | Prospect | Purple | Qualified, in discussion |
| `negotiation` | Negotiation | Yellow | Active negotiation on terms |
| `live` | Live | Green | Active engagement |
| `on_hold` | On Hold | Gray | Paused engagement |
| `archive` | Archive | Red | Completed or ended |

### Agreement Types

| Type | Label | Description |
|------|-------|-------------|
| `retainer` | Retainer | Recurring monthly or periodic engagement |
| `project_based` | Project-Based | Fixed scope with defined deliverables |
| `hourly` | Hourly | Billed by hours worked |
| `fixed_price` | Fixed Price | One-time fixed fee |
| `equity` | Equity | Compensation via equity stake |
| `hybrid` | Hybrid | Mix of retainer and project components |
| `custom` | Custom | Non-standard arrangement |

### Agreement Statuses

Agreement status is **computed** from `start_date` / `end_date` at display time. The `override_status` field takes precedence over computed status when set.

| Status | Label | Color | Condition |
|--------|-------|-------|-----------|
| `active` | Active | Green | Today is between start and end dates |
| `upcoming` | Upcoming | Blue | start_date is in the future |
| `expired` | Expired | Gray | end_date is in the past |
| `open_ended` | Open-Ended | Purple | No end_date, start_date is past or null |
| `terminated` | Terminated | Red | override_status = `terminated` |
| `suspended` | Suspended | Yellow | override_status = `suspended` |

The `getAgreementStatus(agreement)` utility in `frontend/src/features/customers/utils/agreementUtils.ts` implements this logic.

### Invoice Statuses

| Status | Label | Color | Description |
|--------|-------|-------|-------------|
| `draft` | Draft | Gray | Not yet sent to customer |
| `sent` | Sent | Blue | Delivered to customer, awaiting payment |
| `overdue` | Overdue | Red | Payment not received by due date |
| `paid` | Paid | Green | Payment received in full |
| `cancelled` | Cancelled | Gray | Invoice voided |

### Project Statuses

| Status | Label | Color | Description |
|--------|-------|-------|-------------|
| `planning` | Planning | Blue | Project in planning phase |
| `active` | Active | Green | Work actively in progress |
| `on_hold` | On Hold | Orange | Paused temporarily |
| `completed` | Completed | Purple | All deliverables done |
| `archived` | Archived | Gray | No longer active |

### Artifact Types

| Type | Label | Color | Description |
|------|-------|-------|-------------|
| `strategy` | Strategy | Purple | Strategic plans and recommendations |
| `research` | Research | Blue | Research findings and analysis |
| `roadmap` | Roadmap | Cyan | Product or project roadmaps |
| `competitive_analysis` | Competitive | Red | Competitive landscape analysis |
| `user_research` | User Research | Indigo | User interviews, personas, insights |
| `product_spec` | Product Spec | Green | Product requirements and specifications |
| `meeting_notes` | Notes | Gray | Meeting notes and minutes |
| `presentation` | Presentation | Amber | Slide decks and presentations |
| `ideation` | Ideation | Pink | Brainstorming and ideation sessions |
| `custom` | Custom | Slate | Custom document type |

### Artifact Statuses

| Status | Label | Color | Description |
|--------|-------|-------|-------------|
| `draft` | Draft | Gray | Initial creation |
| `in_progress` | In Progress | Blue | Actively being written |
| `review` | Review | Amber | Under review |
| `final` | Final | Green | Approved and finalized |
| `archived` | Archived | Gray | No longer active |

## Technical Perspective

### Architecture

```
Frontend (Supabase direct reads + RPC) ──► Supabase (RLS / SECURITY DEFINER)
Frontend (mutations) ──► Backend API ──► CustomerService / AgreementService / ReceivableService / ProjectService / CustomerArtifactService ──► Supabase (service role)
```

- **Reads**: Customer list uses `get_customer_list_summary` RPC (full-text search via TSVECTOR, enriched with summary metrics). Detail page uses direct Supabase queries. RLS enforces `user_id = auth.uid()` isolation.
- **Writes**: Backend API with Zod validation, routed through the appropriate service.
- **Financial summary**: Computed server-side via `get_receivables_summary` and `get_customer_list_summary` PostgreSQL functions.
- **Full-text search**: `search_vector` TSVECTOR generated column on `customers` indexed with GIN. Searched via `websearch_to_tsquery('english', query)`.
- **Dashboard stats**: `get_customer_dashboard_stats` RPC returns aggregate counters.
- **Cross-module linking**: Portfolio `artifacts.metadata->'linkedCustomerArtifacts'` JSONB array with GIN index. Reverse lookup via `@>` containment operator.

### Key Files

| Layer | File | Purpose |
|-------|------|---------|
| Migration | `backend/src/db/migrations/010_customers_schema.sql` | 7 tables + RLS + indexes |
| Migration | `backend/src/db/migrations/012_customer_search_and_summary.sql` | TSVECTOR, summary/stats RPCs, GIN indexes |
| Types (BE) | `backend/src/types/customer.ts` | Shared types + status constants + agreement/receivable types |
| Service | `backend/src/services/CustomerService.ts` | Customer CRUD + events + counts |
| Service | `backend/src/services/AgreementService.ts` | Agreement CRUD: list, create, update, delete |
| Service | `backend/src/services/ReceivableService.ts` | Receivable CRUD + getSummary via RPC |
| Controller | `backend/src/controllers/customer.controller.ts` | Customer Zod validation + handlers |
| Controller | `backend/src/controllers/agreement.controller.ts` | Agreement Zod validation + handlers (list, create, update, delete) |
| Controller | `backend/src/controllers/receivable.controller.ts` | Receivable Zod validation + handlers (list, getSummary, create, update, delete) |
| Routes | `backend/src/routes/customers.ts` | Express router with `requireAuth`, mounts agreement/receivable sub-routes |
| Routes | `backend/src/routes/agreements.ts` | `Router({ mergeParams: true })`: GET /, POST /, PUT /:agreementId, DELETE /:agreementId |
| Routes | `backend/src/routes/receivables.ts` | `Router({ mergeParams: true })`: GET /, GET /summary, POST /, PUT /:receivableId, DELETE /:receivableId |
| Service | `backend/src/services/ProjectService.ts` | Project CRUD: list (with artifact counts), getById, create, update, delete |
| Service | `backend/src/services/CustomerArtifactService.ts` | Artifact CRUD: listByProject, listByCustomer, create, update, delete |
| Controller | `backend/src/controllers/project.controller.ts` | Project Zod validation + handlers |
| Controller | `backend/src/controllers/customer-artifact.controller.ts` | Artifact Zod validation + handlers |
| Routes | `backend/src/routes/projects.ts` | `Router({ mergeParams: true })`: GET /, GET /:projectId, POST /, PUT /:projectId, DELETE /:projectId, USE /:projectId/artifacts |
| Routes | `backend/src/routes/customer-artifacts.ts` | `Router({ mergeParams: true })`: GET /, POST /, PUT /:artifactId, DELETE /:artifactId |
| Types (FE) | `frontend/src/features/customers/types/customer.ts` | Frontend types + status labels + agreement/receivable/project/artifact types and label/color constants |
| Store | `frontend/src/features/customers/stores/customerStore.ts` | Active customer + tab state + selectedProjectIds |
| Hooks | `frontend/src/features/customers/hooks/useCustomers.ts` | TanStack Query customer CRUD hooks + useDashboardStats |
| Hooks | `frontend/src/features/customers/hooks/useCustomerArtifactSearch.ts` | Cross-module artifact search for portfolio linking |
| Hooks | `frontend/src/features/customers/hooks/useReferencedByArtifacts.ts` | Reverse lookup: portfolio artifacts referencing a customer artifact |
| Hooks | `frontend/src/features/customers/hooks/useAgreements.ts` | TanStack Query agreement hooks + agreementKeys factory |
| Hooks | `frontend/src/features/customers/hooks/useReceivables.ts` | TanStack Query receivable hooks + receivableKeys factory + useReceivableSummary |
| Hooks | `frontend/src/features/customers/hooks/useProjects.ts` | TanStack Query project hooks + projectKeys factory |
| Hooks | `frontend/src/features/customers/hooks/useCustomerArtifacts.ts` | TanStack Query artifact hooks + customerArtifactKeys factory |
| Skeleton | `frontend/src/features/customers/components/shared/CustomerCardSkeleton.tsx` | Structured loading skeleton matching card layout |
| References | `frontend/src/features/portfolio/components/editor/ArtifactReferences.tsx` | Collapsible cross-module references section in portfolio editor |
| List Page | `frontend/src/features/customers/pages/CustomerListPage.tsx` | List with filters, enriched cards, AlertDialog, responsive grid |
| Detail Page | `frontend/src/features/customers/pages/CustomerDetailPage.tsx` | Tabs: Overview, Agreements, Receivables, Projects |
| Projects Tab | `frontend/src/features/customers/components/projects/ProjectsTab.tsx` | Tab orchestrator: list/detail view via Zustand selection |
| Project Card | `frontend/src/features/customers/components/projects/ProjectCard.tsx` | Card with name, status, artifact count, actions |
| Project Detail | `frontend/src/features/customers/components/projects/ProjectDetail.tsx` | Project header + artifact list |
| Project Form | `frontend/src/features/customers/components/projects/ProjectForm.tsx` | Create/edit project dialog |
| Artifact Row | `frontend/src/features/customers/components/projects/ArtifactRow.tsx` | List item with type badge, preview |
| Artifact Form | `frontend/src/features/customers/components/projects/ArtifactForm.tsx` | Create artifact dialog |
| Artifact Editor | `frontend/src/features/customers/components/projects/ArtifactEditor.tsx` | Sheet editor with auto-save |
| Rich Text Editor | `frontend/src/features/customers/components/projects/CustomerRichTextEditor.tsx` | Simplified TipTap (no portfolio dependencies) |
| Markdown Utils | `frontend/src/lib/markdown.ts` | markdownToHTML (marked), htmlToMarkdown (turndown), isMarkdown |

### Data Model

**`CustomerInfo`** (JSONB on `customers.info`):
```typescript
interface CustomerInfo {
  about?: string
  vertical?: string
  persona?: string
  icp?: string
  product?: {
    name?: string
    stage?: string
    category?: string
    description?: string
    url?: string
  }
  team?: TeamMember[]
}
```

**`TeamMember`** (inside `info.team` array):
```typescript
interface TeamMember {
  name: string
  role?: string
  email?: string
  notes?: string
}
```

**`Agreement`**:
```typescript
interface Agreement {
  id: string
  customer_id: string
  scope: string
  type?: AgreementType
  start_date?: string | null
  end_date?: string | null
  override_status?: 'terminated' | 'suspended' | null
  pricing?: AgreementPricing | null
  created_at: string
  updated_at: string
}

interface AgreementPricing {
  amount: number
  currency: string
  frequency: string
  notes?: string
}
```

**`Receivable`**:
```typescript
interface Receivable {
  id: string
  customer_id: string
  type: 'invoice' | 'payment'
  amount: string           // NUMERIC returned as string
  date: string
  status?: string | null   // Invoice status only
  description?: string | null
  reference?: string | null
  linked_invoice_id?: string | null
  linked_agreement_id?: string | null
  created_at: string
  updated_at: string
}
```

**`FinancialSummary`**:
```typescript
interface FinancialSummary {
  total_invoiced: string   // NUMERIC as string
  total_paid: string
  balance: string          // positive = owed, negative = credit
}
```

**`Project`**:
```typescript
interface Project {
  id: string
  customer_id: string
  name: string
  description: string | null
  status: ProjectStatus
  agreement_id: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

interface ProjectWithCounts extends Project {
  artifacts_count: number
}
```

**`CustomerArtifact`**:
```typescript
interface CustomerArtifact {
  id: string
  project_id: string
  customer_id: string
  type: ArtifactType  // 10 values
  title: string
  content: string     // Stored as Markdown
  status: ArtifactStatus
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}
```

### Filter State

Filter state lives in URL search params (not Zustand):

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `status` | `CustomerStatus` | none (all) | Filter by status |
| `q` | string | empty | Full-text search via TSVECTOR (name, vertical, about, persona) |
| `sort` | string | `updated_at` | Sort field: `name`, `status`, `created_at`, `updated_at`, `last_activity`, `outstanding_balance` |

### Query Key Factory

```typescript
customerKeys = {
  all: ['customers'],
  lists: () => ['customers', 'list'],
  list: (filters) => ['customers', 'list', filters],
  details: () => ['customers', 'detail'],
  detail: (id) => ['customers', 'detail', id],
  stats: () => ['customers', 'stats'],
}

agreementKeys = {
  all: ['agreements'],
  lists: () => ['agreements', 'list'],
  list: (customerId) => ['agreements', 'list', customerId],
}

receivableKeys = {
  all: ['receivables'],
  lists: () => ['receivables', 'list'],
  list: (customerId) => ['receivables', 'list', customerId],
  summary: (customerId) => ['receivables', 'summary', customerId],
}

projectKeys = {
  all: (customerId) => [...customerKeys.detail(customerId), 'projects'],
  list: (customerId) => [...projectKeys.all(customerId), 'list'],
  detail: (customerId, projectId) => [...projectKeys.all(customerId), 'detail', projectId],
}

customerArtifactKeys = {
  allByProject: (customerId, projectId) => [...projectKeys.detail(customerId, projectId), 'artifacts'],
  listByProject: (customerId, projectId) => [...customerArtifactKeys.allByProject(customerId, projectId), 'list'],
  allByCustomer: (customerId) => [...customerKeys.detail(customerId), 'artifacts'],
  listByCustomer: (customerId) => [...customerArtifactKeys.allByCustomer(customerId), 'list'],
}
```

### Frontend Utilities

| Utility | Signature | Description |
|---------|-----------|-------------|
| `getAgreementStatus` | `(agreement: Agreement) => AgreementStatus` | Computes status from dates; override_status takes precedence |
| `formatPricing` | `(pricing: AgreementPricing) => string` | Returns "$5,000/month", "$15,000 fixed", "$X/year" |
| `formatDateRange` | `(start, end) => string` | Returns "Jan 2026 → Jun 2026" or "Ongoing" |
| `getBalanceDirection` | `(balance: string) => 'positive' \| 'negative' \| 'zero'` | Determines balance direction for color coding |

### Label and Color Constants

```typescript
AGREEMENT_TYPE_LABELS: Record<AgreementType, string>
AGREEMENT_STATUS_LABELS: Record<AgreementStatus, string>
AGREEMENT_STATUS_COLORS: Record<AgreementStatus, string>  // Tailwind class strings
INVOICE_STATUS_LABELS: Record<InvoiceStatus, string>
INVOICE_STATUS_COLORS: Record<InvoiceStatus, string>
PAYMENT_METHOD_LABELS: Record<string, string>
```

## Known Limitations

- **No bulk actions** (multi-select, bulk status change)
- **No CSV import/export**
- **Auto-save** uses 1.5s debounce; very fast close may trigger a delayed save
- **Cross-module linking** requires portfolio editor to pass link/unlink handlers (parent must provide mutation)

## Dependencies

- Supabase Auth (user isolation via RLS)
- Backend `requireAuth` middleware
- `is_customer_owner()` PostgreSQL function (SECURITY DEFINER)
- `get_receivables_summary()` PostgreSQL function (SECURITY DEFINER) — see [Database Schema Reference](../Architecture/database/database-schema-reference.md#database-functions)
- `get_customer_list_summary()` PostgreSQL function (SECURITY DEFINER) — enriched customer list with summary metrics
- `get_customer_dashboard_stats()` PostgreSQL function (SECURITY DEFINER) — aggregate dashboard counters
- GIN index on `customers.search_vector` for full-text search
- GIN index on `artifacts.metadata->'linkedCustomerArtifacts'` for cross-module reverse lookup

## Related Documentation

- [Customer Management Flow](../flows/customer-management-flow.md)
- [Customer Pages](../screens/customer-pages.md)
- [Customer API Endpoints](../api/customer-endpoints.md)
- [Database Schema Reference](../Architecture/database/database-schema-reference.md)
