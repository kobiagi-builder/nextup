# Customer Management

**Created:** 2026-02-25
**Last Updated:** 2026-03-01
**Version:** 7.0.0
**Status:** Active (Phase 8 — 4-Layer Company Classification Pipeline)

## Overview

Customer Management allows advisors and consultants to track their client relationships through a CRM-lite interface. Each customer has a lifecycle status, contact info, team members, event timeline, service agreements, financial receivables, projects, and deliverable artifacts. Phase 1 delivered the core CRUD, overview tab, and status workflows. Phase 2 added Agreements and Receivables with full CRUD, computed status logic, and financial summary reporting. Phase 3 activates the Projects tab with full project and artifact CRUD, including a TipTap rich text editor with auto-save for artifact content. Phase 4 added dual AI agents (Customer Mgmt + Product Mgmt) with auto-routing and structured response cards. Phase 5 delivers enriched customer list cards with summary metrics (active agreements, outstanding balance, active projects, last activity), full-text search via PostgreSQL TSVECTOR, dashboard stats RPC, agent prompt refinement with health signals, UX polish (structured skeletons, AlertDialog confirmations, event timeline filter, responsive grid), and cross-module linking between portfolio and customer artifacts. Phase 6 adds LinkedIn Connections CSV Import — upload a LinkedIn-exported CSV to auto-create/match customers and upsert team members with edge case handling, ICP score badges, ICP filter pills, and a "Not Relevant" status. Phase 7 adds post-import intelligence: LLM-powered company enrichment (employee count, industry, specialties, about) and hybrid ICP scoring (quantitative formula + qualitative LLM), with ICP settings configuration in the Settings page and auto-status assignment for low-ICP new customers. Phase 8 replaces the inline deterministic-only company classification with a 4-layer pipeline (deterministic → Tavily LinkedIn lookup → LLM batch → fail-open), deduplicates company names before classification, stores LinkedIn company URLs, and guards low-confidence companies from auto-status upgrades.

## User Perspective

### What It Does

- **Customer List** -- Browse, full-text search, filter by status, filter by ICP score, sort by 6 fields (name, status, created, updated, last activity, outstanding balance)
- **Status Pipeline** -- Move customers through `lead > prospect > negotiation > live > on_hold > archive > not_relevant`
- **LinkedIn Import** -- Upload LinkedIn connections CSV to auto-create/match customers and upsert team members. Feature-flagged (`linkedin_import`). Multi-step dialog: CSV upload → import progress → results summary with counts, skipped rows, and errors
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
| `on_hold` | On Hold | Orange | Paused engagement |
| `archive` | Archive | Slate | Completed or ended |
| `not_relevant` | Not Relevant | Rose | Dismissed, not a fit for ICP |

### ICP Scores

| Score | Label | Color | Description |
|-------|-------|-------|-------------|
| `low` | Low | Rose | Poor fit for ideal customer profile |
| `medium` | Medium | Amber | Partial fit |
| `high` | High | Emerald | Good fit |
| `very_high` | Very High | Blue | Excellent fit |

ICP Score is stored in `customers.info.icp_score` (JSONB). Displayed as badges on customer cards and detail page header. Filterable on the list page (All, Low, Medium, High, Very High, Not Scored).

### LinkedIn Import

**Feature flag:** `linkedin_import` (must be enabled per-account via `customer_features` table)

**CSV Columns:** First Name, Last Name, URL, Email Address, Company, Position

**Three-phase import flow:**

#### Phase 0 — Company Name Classification (4-Layer Pipeline)

Before processing any rows, all unique company names are classified via `CompanyClassificationService.classifyBatch()`. This classify-first approach enables deduplication and batching.

**Layer 0 — Deterministic (free, <1ms per name):**
Check order (first match wins):
1. Empty / single character / numbers-only → SKIP
2. `NON_COMPANY_PATTERNS` exact match (none, freelance, self-employed, retired, student, etc.) → SKIP
3. `COUNTRY_NAMES` exact match (israel, united states, etc.) → SKIP
4. Self-name match (company field === connection's own first+last name) → SKIP
5. `ENCLOSED_PATTERNS` **exact match** (stealth, confidential, building, etc.) → ENCLOSED
6. Has company suffix as last word (inc, ltd, llc, etc.) → COMPANY (fast-track, skip layers 1-2)
7. None → pass to Layer 1

**Layer 1 — Tavily LinkedIn Lookup (~$0.60/1000, 200-500ms per name):**
Search `"<companyName>" company` on `linkedin.com` via existing `tavilyClient` singleton.
- `/company/` URL found with title similarity ≥ 0.6 → COMPANY (stores `linkedinCompanyUrl`)
- Only `/in/` URLs found → SKIP (personal name)
- No results or low similarity → pass to Layer 2
- On Tavily error → gracefully fall through to Layer 2

Title similarity: Jaccard word overlap after stripping "| LinkedIn" suffix.

**Layer 2 — LLM Batch Classification (~$0.15/1000, 1-3s per batch):**
Batches of 15 names sent to `claude-haiku-4-5-20251001` via `generateText`. Returns JSON array `[{ index, type, confidence }]`. Types: company, personal_name, enclosed, non_company. Confidence ≥ 0.7 → use classification. Below threshold → pass to Layer 3.

**Layer 3 — Fail Open:**
Any remaining unclassified name defaults to `{ type: 'company', lowConfidence: true }`. Low-confidence companies are tracked separately and excluded from auto-status upgrades.

#### Phase 1 — Process Rows (using cached classifications)

For each CSV row, look up the pre-computed classification:
1. `skip` → add to skipped list with reason
2. `enclosed` → route to "Enclosed company" container customer
3. `company` → match/create customer + upsert team member
4. If classification has `linkedinCompanyUrl` → store in `customer.info` via `merge_customer_info` RPC
5. If classification has `lowConfidence` → track in `lowConfidenceCustomerIds` set

Customer matching: case-insensitive `ILIKE` on name. New customers created with `status: 'not_relevant'`.
Team member matching: by email (exact) then by name (case-insensitive). Update LinkedIn URL and role if changed, or create new member.

#### Phase 2 — Enrichment + ICP Scoring

Runs automatically after Phase 1. For each unique company:
- **Enrichment**: If no data or >30 days stale, call `EnrichmentService.enrichCompany(name)` (claude-haiku). Extracts `{ employee_count, about, industry, specialties }`. Rate-limited ~2 req/sec.
- **ICP Scoring**: If ICP settings exist AND enrichment has industry data, call `IcpScoringService.scoreCustomer()`. Hybrid: quantitative formula + qualitative LLM. Maps to Low/Medium/High/Very High.
- **Auto-status upgrade**: New customers with medium+ ICP score are upgraded to `lead` status — **except** low-confidence customers (Layer 3) which stay `not_relevant`.

**Results returned:** total rows, classification stats (layer0/layer1/layer2/layer3/total), companies created/matched, team members created/updated, skipped rows with reasons, errors, enrichment stats (enriched/skippedFresh/failed), ICP score distribution (low/medium/high/very_high/not_scored)

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
| Service | `backend/src/services/CompanyClassificationService.ts` | 4-layer company name classification pipeline (deterministic → Tavily → LLM → fail-open) |
| Service | `backend/src/services/LinkedInImportService.ts` | CSV parsing, classify-first flow, company matching, team upsert, post-import enrichment + ICP scoring |
| Service | `backend/src/services/EnrichmentService.ts` | LLM-powered company enrichment (claude-haiku): employee count, about, industry, specialties |
| Service | `backend/src/services/IcpScoringService.ts` | Hybrid ICP scoring: quantitative formula + qualitative LLM |
| Service | `backend/src/services/IcpSettingsService.ts` | ICP settings CRUD (upsert with `ON CONFLICT user_id`) |
| Controller | `backend/src/controllers/linkedinImport.controller.ts` | Multer CSV upload + import handler |
| Controller | `backend/src/controllers/icpSettings.controller.ts` | ICP settings GET/PUT with Zod validation |
| Routes | `backend/src/routes/icp-settings.ts` | GET / PUT for ICP settings (requires `customer_management` feature flag) |
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
| ICP Settings UI | `frontend/src/features/customers/components/settings/IcpSettingsSection.tsx` | ICP settings form (employee range, industries, specialties, description, weights) |
| ICP Hooks | `frontend/src/features/customers/hooks/useIcpSettings.ts` | TanStack Query GET/PUT for ICP settings |
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
  icp_score?: IcpScore | null  // 'low' | 'medium' | 'high' | 'very_high'
  enrichment?: {
    employee_count?: string
    about?: string
    industry?: string
    specialties?: string[]
    source?: 'linkedin_scrape' | 'llm_enrichment'
    updated_at?: string
  }
}
```

**`TeamMember`** (inside `info.team` array):
```typescript
interface TeamMember {
  name: string
  role?: string
  email?: string
  notes?: string
  linkedin_url?: string
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
| `icp` | `IcpScore \| 'not_scored'` | none (all) | Filter by ICP score level |

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

icpSettingsKeys = {
  all: ['icp-settings'],
  mine: () => ['icp-settings', 'mine'],
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
- **Enrichment** uses LLM (claude-haiku) for company data — accuracy depends on public knowledge of the company. Unknown/small companies may return empty results
- **ICP Scoring** qualitative component only runs if both ICP description and company about text exist; otherwise 100% quantitative
- **Rate limiting** between enrichment calls is 500ms delay — large imports (~200+ companies) may take several minutes
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
