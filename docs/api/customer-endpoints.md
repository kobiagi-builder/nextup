# Customer API Endpoints

**Created:** 2026-02-25
**Last Updated:** 2026-03-08
**Version:** 8.0.0
**Status:** Complete (Phase 10 — Initiative & Document Restructure)

## Overview

RESTful CRUD API for customer management. All endpoints require Bearer token authentication via the `requireAuth` middleware.

**Base path:** `/api/customers`
**Controllers:** `customer.controller.ts`, `linkedinImport.controller.ts`, `icpSettings.controller.ts`, `agreement.controller.ts`, `receivable.controller.ts`, `initiative.controller.ts`, `customer-document.controller.ts`
**Services:** `CustomerService.ts`, `LinkedInImportService.ts`, `EnrichmentService.ts`, `IcpScoringService.ts`, `IcpSettingsService.ts`, `AgreementService.ts`, `ReceivableService.ts`, `InitiativeService.ts`, `CustomerDocumentService.ts`, `DocumentFolderService.ts`
**Routes:** `customers.ts`, `icp-settings.ts`, `agreements.ts`, `receivables.ts`, `initiatives.ts`, `customer-documents.ts`, `document-folders.ts`

Agreement and receivable sub-routes are mounted with `mergeParams: true`, giving handlers access to the parent `:id` (customer ID) parameter.

---

## Customer Endpoints

### GET /api/customers

List all customers for the authenticated user. When `summary=true`, uses `get_customer_list_summary` RPC for enriched data with full-text search.

**Query Parameters:**

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `status` | CustomerStatus | No | all | Filter by status |
| `search` | string | No | - | Full-text search (name, vertical, about, persona via TSVECTOR) |
| `sort` | string | No | `updated_at` | Sort field: `name`, `status`, `created_at`, `updated_at`, `last_activity`, `outstanding_balance` |
| `icp` | string | No | - | Filter by ICP score: `low`, `medium`, `high`, `very_high`, `not_scored` (requires `summary=true`) |
| `summary` | boolean | No | false | When true, returns enriched `CustomerWithSummary` data |

**Response 200:**
```json
{
  "customers": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "name": "Acme Corp",
      "status": "live",
      "info": { "about": "...", "vertical": "SaaS" },
      "created_at": "2026-02-25T10:00:00Z",
      "updated_at": "2026-02-25T12:00:00Z",
      "deleted_at": null
    }
  ],
  "count": 1
}
```

**Errors:** 400 (invalid status), 401 (unauthorized), 500 (server error)

---

### POST /api/customers/import/linkedin

Upload a LinkedIn connections CSV to auto-create/match customers and upsert team members.

**Feature flag required:** `linkedin_import` (checked via `requireFeature` middleware)

**Request:**
- Content-Type: `multipart/form-data`
- Body field: `file` (CSV file, max 5MB)

**Expected CSV columns:** First Name, Last Name, URL, Email Address, Company, Position

**Response 200:**
```json
{
  "total": 150,
  "companies": { "created": 12, "matched": 45 },
  "teamMembers": { "created": 57, "updated": 8 },
  "skipped": [
    { "row": 5, "company": "Israel", "reason": "Non-company name detected" },
    { "row": 12, "company": "Stealth", "reason": "Enclosed company - grouped under 'Enclosed company'" }
  ],
  "errors": [],
  "enrichment": { "enriched": 10, "skippedFresh": 2, "failed": 0 },
  "icpScores": { "low": 3, "medium": 4, "high": 2, "very_high": 1, "not_scored": 2 }
}
```

**Edge case handling:**
- Empty company → skipped
- Non-company names (freelance, self-employed, country, number) → skipped
- Personal names (two capitalized words without company suffixes) → skipped
- Enclosed companies (stealth, confidential, etc.) → grouped under "Enclosed company"

**Errors:** 400 (no file, invalid CSV format, missing columns), 401 (unauthorized), 403 (feature disabled), 500 (server error)

---

### GET /api/customers/:id

Get a single customer with tab counts.

**Response 200:**
```json
{
  "id": "uuid",
  "name": "Acme Corp",
  "status": "live",
  "info": { "..." : "..." },
  "agreements_count": 2,
  "receivables_count": 5,
  "initiatives_count": 1,
  "created_at": "...",
  "updated_at": "..."
}
```

**Errors:** 400 (missing ID), 401, 404 (not found / not owner), 500

---

### POST /api/customers

Create a new customer.

**Body (Zod validated):**
```json
{
  "name": "Acme Corp",
  "status": "lead",
  "info": {
    "about": "Enterprise SaaS company",
    "vertical": "SaaS"
  }
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | string | Yes | 1-200 chars |
| `status` | CustomerStatus | No | Enum validated, defaults to `lead` |
| `info` | CustomerInfo | No | Object with `.passthrough()` |

**Response 201:** Created customer object

---

### PUT /api/customers/:id

Update customer (partial update).

**Body (Zod validated):**
```json
{
  "name": "New Name",
  "info": { "about": "Updated description" }
}
```

All fields optional. At least one field required.

**Response 200:** Updated customer object

---

### PATCH /api/customers/:id/status

Quick status update.

**Body:**
```json
{
  "status": "live"
}
```

**Response 200:** Updated customer object

---

### DELETE /api/customers/:id

Soft delete (sets `deleted_at` timestamp).

**Response 200:**
```json
{
  "message": "Customer archived successfully"
}
```

---

### GET /api/customers/:id/events

List events for a customer, ordered by `event_date DESC`.

**Response 200:**
```json
{
  "events": [
    {
      "id": "uuid",
      "customer_id": "uuid",
      "event_type": "meeting",
      "title": "Kickoff Call",
      "description": "Initial project kickoff",
      "event_date": "2026-02-25T14:00:00Z",
      "participants": ["Alice", "Bob"],
      "metadata": null,
      "created_at": "..."
    }
  ],
  "count": 1
}
```

---

### POST /api/customers/:id/events

Create a new event for a customer.

**Body (Zod validated):**
```json
{
  "title": "Follow-up Call",
  "event_type": "meeting",
  "description": "Discuss proposal feedback",
  "event_date": "2026-02-26T10:00:00Z",
  "participants": ["Alice"]
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `title` | string | Yes | Min 1 char |
| `event_type` | string | No | Defaults to `note` |
| `description` | string | No | - |
| `event_date` | string | No | ISO 8601 datetime |
| `participants` | string[] | No | Array of names |

**Response 201:** Created event object

---

### GET /api/customers/search

Search customers by name with full-text search. Uses TSVECTOR `search_vector` column.

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `q` | string | Yes | Search query (min 2 chars) |

**Response 200:**
```json
{
  "customers": [ { "id": "uuid", "name": "Acme Corp", "status": "live", ... } ],
  "count": 1
}
```

**Errors:** 400 (query too short), 401, 500

---

### GET /api/customers/stats

Dashboard stats for the authenticated user. Calls `get_customer_dashboard_stats` RPC.

**Response 200:**
```json
{
  "total_customers": 12,
  "active_customers": 8,
  "total_outstanding": "15000.00",
  "expiring_agreements": 2
}
```

**Errors:** 401, 500

---

### GET /api/customers/documents/search

Search customer documents by title for cross-module linking (portfolio -> customer documents). Query capped at 200 characters.

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `q` | string | Yes | Search query (min 2 chars, max 200 chars) |

**Response 200:**
```json
{
  "documents": [
    {
      "id": "uuid",
      "title": "Product Strategy 2026",
      "type": "strategy",
      "status": "draft",
      "customer_id": "uuid",
      "customer_name": "Acme Corp"
    }
  ],
  "count": 1
}
```

**Errors:** 400 (query too short), 401, 500

---

### POST /api/customers/:id/sync-team-from-linkedin

Scrape team members from a customer's LinkedIn company page, filter by role using AI, and merge into the customer's team array. Requires the customer to have a valid LinkedIn company URL stored in `info`.

**Pipeline:** Extract company slug → Tavily scrape People page → AI role filter (Claude Haiku, single batch) → Merge with existing team (add new, soft-delete stale, preserve manual)

**Response 200:**
```json
{
  "added": 5,
  "removed": 2,
  "total": 12,
  "members": [
    {
      "name": "Jane Smith",
      "role": "CEO",
      "source": "linkedin_scrape",
      "linkedin_url": "https://linkedin.com/in/janesmith"
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `added` | number | New team members added from scrape |
| `removed` | number | Stale `linkedin_scrape` members soft-deleted (`hidden: true`) |
| `total` | number | Total team members after merge |
| `members` | TeamMember[] | Full merged team array |

**Merge behavior:**
- Members with `source: 'manual'` or no source are never modified or removed
- New scraped members are added with `source: 'linkedin_scrape'`
- Stale `linkedin_scrape` members (not in new scrape) get `hidden: true`
- Returning members (previously hidden) get `hidden: false` and updated role
- Name matching is case-insensitive

**Role filtering defaults:** Founder, C-Level, VP, Director, Head of, Product Management, Product Design. Excludes HR, Recruiting, Talent Acquisition, People Ops, Office Manager, Administrative. Per-user overrides stored in `team_role_filters` table.

**On error:** Persists error to `customer.info.enrichment_errors.linkedin` for UI display.

**Errors:** 400 (customer has no LinkedIn URL), 401 (unauthorized), 404 (customer not found), 500 (scraping/AI failure)

---

### POST /api/customers/enrich-from-linkedin

Enrich a new customer record from a LinkedIn company URL before creation. Uses Tavily + Claude Haiku to extract company data.

**Body:**
```json
{
  "linkedinUrl": "https://linkedin.com/company/acme-corp"
}
```

**Response 200:** Extracted company info (name, about, industry, specialties, employee count)

---

### POST /api/customers/enrich-from-website

Enrich a new customer record from a company website URL before creation. Uses Tavily + Claude Haiku to extract company data.

**Body:**
```json
{
  "websiteUrl": "https://acme.com"
}
```

**Response 200:** Extracted company info

---

## Agreement Endpoints

All agreement endpoints are nested under `/api/customers/:id/agreements`. The `:id` parameter is the customer ID.

**Controller:** `backend/src/controllers/agreement.controller.ts`
**Service:** `backend/src/services/AgreementService.ts`
**Router:** `backend/src/routes/agreements.ts` (mounted with `mergeParams: true`)

---

### GET /api/customers/:id/agreements

List all agreements for a customer.

**Response 200:**
```json
{
  "agreements": [
    {
      "id": "uuid",
      "customer_id": "uuid",
      "scope": "Ongoing product strategy retainer",
      "type": "retainer",
      "start_date": "2026-01-01",
      "end_date": "2026-06-30",
      "override_status": null,
      "pricing": {
        "amount": 5000,
        "currency": "USD",
        "frequency": "monthly",
        "notes": "Invoiced first of month"
      },
      "created_at": "2026-01-01T09:00:00Z",
      "updated_at": "2026-01-01T09:00:00Z"
    }
  ],
  "count": 1
}
```

**Errors:** 400 (missing customer ID), 401, 500

---

### POST /api/customers/:id/agreements

Create a new agreement for a customer.

**Body (Zod validated):**
```json
{
  "scope": "Product strategy advisory",
  "type": "retainer",
  "start_date": "2026-03-01",
  "end_date": "2026-08-31",
  "pricing": {
    "amount": 5000,
    "currency": "USD",
    "frequency": "monthly",
    "notes": "Net 30 payment terms"
  },
  "override_status": null
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `scope` | string | Yes | Min 1 char |
| `type` | AgreementType | No | Enum: `retainer`, `project_based`, `hourly`, `fixed_price`, `equity`, `hybrid`, `custom` |
| `start_date` | string or null | No | ISO 8601 date |
| `end_date` | string or null | No | ISO 8601 date |
| `pricing` | object or null | No | `{ amount: number, currency: string, frequency: string, notes?: string }` |
| `override_status` | string or null | No | `terminated` or `suspended` or null |

**Response 201:** Created agreement object

**Errors:** 400 (validation error), 401, 500

---

### PUT /api/customers/:id/agreements/:agreementId

Update an existing agreement (partial update).

**Body (Zod validated):**

Same fields as create, all optional. At least one field required.

```json
{
  "end_date": "2026-12-31",
  "pricing": {
    "amount": 6000,
    "currency": "USD",
    "frequency": "monthly"
  }
}
```

**Response 200:** Updated agreement object

**Errors:** 400 (validation / missing IDs), 401, 500

---

### DELETE /api/customers/:id/agreements/:agreementId

Hard delete an agreement.

**Response 200:**
```json
{
  "message": "Agreement deleted successfully"
}
```

**Errors:** 400 (missing IDs), 401, 500

---

## Receivable Endpoints

All receivable endpoints are nested under `/api/customers/:id/receivables`. The `:id` parameter is the customer ID.

**Controller:** `backend/src/controllers/receivable.controller.ts`
**Service:** `backend/src/services/ReceivableService.ts`
**Router:** `backend/src/routes/receivables.ts` (mounted with `mergeParams: true`)

---

### GET /api/customers/:id/receivables

List all receivables (invoices and payments) for a customer.

**Response 200:**
```json
{
  "receivables": [
    {
      "id": "uuid",
      "customer_id": "uuid",
      "type": "invoice",
      "amount": "5000.00",
      "date": "2026-03-01",
      "status": "sent",
      "description": "March retainer",
      "reference": "INV-2026-001",
      "linked_invoice_id": null,
      "linked_agreement_id": "uuid",
      "created_at": "2026-03-01T09:00:00Z",
      "updated_at": "2026-03-01T09:00:00Z"
    }
  ],
  "count": 1
}
```

**Errors:** 400 (missing customer ID), 401, 500

---

### GET /api/customers/:id/receivables/summary

Get the financial summary for a customer: total invoiced, total paid, and outstanding balance. Computed server-side using a PostgreSQL function to avoid floating-point issues.

**Response 200:**
```json
{
  "total_invoiced": "15000.00",
  "total_paid": "10000.00",
  "balance": "5000.00"
}
```

All monetary values are returned as strings to preserve NUMERIC precision across the API boundary.

A positive balance means the customer owes money. A negative balance means a credit is held. Zero means fully paid.

**Implementation:** `ReceivableService.getSummary()` calls `supabase.rpc('get_receivables_summary', { cid })` — see [Database Functions](../Architecture/database/database-schema-reference.md#database-functions).

**Errors:** 400 (missing customer ID), 401, 500

---

### POST /api/customers/:id/receivables

Create a new receivable (invoice or payment) for a customer.

**Body (Zod validated):**
```json
{
  "type": "invoice",
  "amount": 5000,
  "date": "2026-03-01",
  "status": "sent",
  "description": "March retainer invoice",
  "reference": "INV-2026-001",
  "linked_agreement_id": "uuid"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `type` | string | Yes | `invoice` or `payment` |
| `amount` | number | Yes | Positive number |
| `date` | string | Yes | ISO 8601 date |
| `status` | string | No | Invoice: `draft`, `sent`, `overdue`, `paid`, `cancelled`. Payment: no status |
| `description` | string | No | Free text |
| `reference` | string | No | Invoice/payment reference number |
| `linked_invoice_id` | string or null | No | UUID of related invoice (for payments) |
| `linked_agreement_id` | string or null | No | UUID of related agreement (for invoices) |

**Response 201:** Created receivable object

**Errors:** 400 (validation error), 401, 500

---

### PUT /api/customers/:id/receivables/:receivableId

Update an existing receivable (partial update). Type cannot be changed after creation.

**Body (Zod validated):**

All fields optional except `type` (excluded). At least one field required.

```json
{
  "status": "paid",
  "description": "Updated description"
}
```

**Response 200:** Updated receivable object

**Errors:** 400 (validation / missing IDs), 401, 500

---

### DELETE /api/customers/:id/receivables/:receivableId

Hard delete a receivable.

**Response 200:**
```json
{
  "message": "Receivable deleted successfully"
}
```

**Errors:** 400 (missing IDs), 401, 500

---

## Initiative Endpoints

All initiative endpoints are nested under `/api/customers/:id/initiatives`. The `:id` parameter is the customer ID.

**Controller:** `backend/src/controllers/initiative.controller.ts`
**Service:** `backend/src/services/InitiativeService.ts`
**Router:** `backend/src/routes/initiatives.ts` (mounted with `mergeParams: true`)

---

### GET /api/customers/:id/initiatives

List all initiatives for a customer with document counts.

**Response 200:**
```json
{
  "initiatives": [
    {
      "id": "uuid",
      "customer_id": "uuid",
      "name": "Q1 Product Strategy",
      "description": "Strategic planning for Q1 2026",
      "status": "active",
      "agreement_id": "uuid or null",
      "metadata": {},
      "documents_count": 3,
      "created_at": "2026-02-25T10:00:00Z",
      "updated_at": "2026-02-25T12:00:00Z"
    }
  ],
  "count": 1
}
```

**Errors:** 400 (missing customer ID), 401, 500

---

### GET /api/customers/:id/initiatives/:initiativeId

Get a single initiative with document count.

**Response 200:** Single `InitiativeWithCounts` object (same shape as list item).

**Errors:** 400, 401, 404, 500

---

### POST /api/customers/:id/initiatives

Create a new initiative for a customer.

**Body (Zod validated):**
```json
{
  "name": "Q1 Product Strategy",
  "description": "Strategic planning for Q1",
  "status": "planning",
  "agreement_id": "uuid"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | string | Yes | Min 1 char |
| `description` | string | No | Free text |
| `status` | InitiativeStatus | No | Enum: `planning`, `active`, `on_hold`, `completed`, `archived`. Defaults to `planning` |
| `agreement_id` | string or null | No | UUID of linked agreement |

**Response 201:** Created initiative object

**Errors:** 400, 401, 500

---

### PUT /api/customers/:id/initiatives/:initiativeId

Update an initiative (partial update). All fields optional, at least one required.

**Response 200:** Updated initiative object

---

### DELETE /api/customers/:id/initiatives/:initiativeId

Safe delete — moves child documents to the 'General' folder (ON DELETE RESTRICT prevents cascade). Returns count of moved documents.

**Response 200:**
```json
{
  "message": "Initiative deleted successfully",
  "moved_documents": 4
}
```

---

## Document Endpoints

Document endpoints are nested under `/api/customers/:id/initiatives/:initiativeId/documents`. A flat list of all documents across all initiatives is also available at `/api/customers/:id/documents`.

**Controller:** `backend/src/controllers/customer-document.controller.ts`
**Service:** `backend/src/services/CustomerDocumentService.ts`
**Router:** `backend/src/routes/customer-documents.ts` (mounted with `mergeParams: true`)

---

### GET /api/customers/:id/initiatives/:initiativeId/documents

List documents for an initiative, ordered by `updated_at DESC`.

**Response 200:**
```json
{
  "documents": [
    {
      "id": "uuid",
      "initiative_id": "uuid",
      "customer_id": "uuid",
      "folder_id": "uuid or null",
      "type": "strategy",
      "title": "Product Strategy 2026",
      "content": "# Strategy\n\n- Focus on...",
      "status": "draft",
      "metadata": {},
      "created_at": "2026-02-25T10:00:00Z",
      "updated_at": "2026-02-25T12:00:00Z"
    }
  ],
  "count": 1
}
```

---

### GET /api/customers/:id/documents

List ALL documents across all initiatives for a customer (flat view).

**Response 200:** Same shape as above.

---

### POST /api/customers/:id/initiatives/:initiativeId/documents

Create a new document in an initiative.

**Body (Zod validated):**
```json
{
  "title": "Product Strategy 2026",
  "type": "strategy"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `title` | string | Yes | Min 1 char |
| `type` | DocumentType | No | Enum (10 values). Defaults to `custom` |
| `content` | string | No | Defaults to empty string |
| `status` | DocumentStatus | No | Enum: `draft`, `in_progress`, `review`, `final`, `archived`. Defaults to `draft` |
| `folder_id` | string or null | No | UUID of the folder to place the document in |

**Response 201:** Created document object

---

### PUT /api/customers/:id/initiatives/:initiativeId/documents/:documentId

Update a document (partial update). Used by the auto-save feature for content updates. Supports reassignment via `initiative_id` and `folder_id`.

**Body (Zod validated):**
```json
{
  "title": "Updated Title",
  "status": "in_progress",
  "initiative_id": "uuid",
  "folder_id": "uuid or null"
}
```

**Response 200:** Updated document object

---

### DELETE /api/customers/:id/initiatives/:initiativeId/documents/:documentId

Hard delete a document.

**Response 200:**
```json
{
  "message": "Document deleted successfully"
}
```

---

## Document Folder Endpoints

Document folder endpoints are mounted at `/api/document-folders`. Requires `customer_management` feature flag.

**Controller:** `backend/src/controllers/document-folder.controller.ts`
**Service:** `backend/src/services/DocumentFolderService.ts`
**Router:** `backend/src/routes/document-folders.ts`

---

### GET /api/document-folders

List folders available to the authenticated user. Returns global system folders (e.g., 'General') and customer-specific folders. Filter by customer using the `customerId` query parameter.

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `customerId` | string | No | UUID — filter to folders for a specific customer (includes global folders) |

**Response 200:**
```json
{
  "folders": [
    {
      "id": "uuid",
      "name": "General",
      "customer_id": null,
      "sort_order": 0,
      "is_system": true,
      "created_at": "2026-02-25T10:00:00Z",
      "updated_at": "2026-02-25T10:00:00Z"
    },
    {
      "id": "uuid",
      "name": "Templates",
      "customer_id": "uuid",
      "sort_order": 1,
      "is_system": false,
      "created_at": "2026-03-01T10:00:00Z",
      "updated_at": "2026-03-01T10:00:00Z"
    }
  ],
  "count": 2
}
```

**Errors:** 401, 403 (feature disabled), 500

---

### POST /api/document-folders

Create a new document folder for a customer.

**Body (Zod validated):**
```json
{
  "name": "Templates",
  "customer_id": "uuid"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | string | Yes | Min 1 char |
| `customer_id` | string | Yes | UUID of the owning customer |

**Response 201:** Created folder object

**Errors:** 400 (validation error), 401, 403 (feature disabled), 500

---

### PUT /api/document-folders/:id

Update a folder name or sort order. System folders cannot be renamed.

**Body (Zod validated):**
```json
{
  "name": "Renamed Folder",
  "sort_order": 2
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | string | No | Min 1 char |
| `sort_order` | number | No | Integer |

**Response 200:** Updated folder object

**Errors:** 400 (validation / missing ID), 401, 403 (feature disabled or system folder), 500

---

### DELETE /api/document-folders/:id

Delete a folder. All documents inside are moved to the 'General' folder before deletion. Returns 403 for system folders.

**Response 200:**
```json
{
  "message": "Folder deleted successfully",
  "moved_documents": 3
}
```

**Errors:** 400 (missing ID), 401, 403 (feature disabled or system folder), 500

---

## ICP Settings Endpoints

ICP settings endpoints are mounted at `/api/icp-settings`. Requires `customer_management` feature flag.

**Controller:** `backend/src/controllers/icpSettings.controller.ts`
**Service:** `backend/src/services/IcpSettingsService.ts`
**Router:** `backend/src/routes/icp-settings.ts`

---

### GET /api/icp-settings

Get the authenticated user's ICP settings.

**Response 200:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "target_employee_min": 50,
  "target_employee_max": 500,
  "target_industries": ["SaaS", "Fintech"],
  "target_specialties": ["AI", "B2B", "Enterprise"],
  "description": "Mid-size B2B SaaS companies in the AI space...",
  "weight_quantitative": 60,
  "created_at": "2026-02-28T10:00:00Z",
  "updated_at": "2026-02-28T12:00:00Z"
}
```

Returns `null` (200) if no settings configured yet.

**Errors:** 401 (unauthorized), 403 (feature disabled), 500 (server error)

---

### PUT /api/icp-settings

Create or update ICP settings (upsert via `ON CONFLICT user_id`).

**Body (Zod validated):**
```json
{
  "target_employee_min": 50,
  "target_employee_max": 500,
  "target_industries": ["SaaS", "Fintech"],
  "target_specialties": ["AI", "B2B", "Enterprise"],
  "description": "Mid-size B2B SaaS companies in the AI space...",
  "weight_quantitative": 60
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `target_employee_min` | number or null | No | Integer, min 0 |
| `target_employee_max` | number or null | No | Integer, min 0 |
| `target_industries` | string[] | No | Max 20 items, each max 100 chars |
| `target_specialties` | string[] | No | Max 50 items, each max 100 chars |
| `description` | string | No | Max 2000 chars |
| `weight_quantitative` | number | No | Integer 0-100 (default 60). Qualitative weight = 100 - this value |

**Response 200:** Updated ICP settings object

**Errors:** 400 (validation error), 401 (unauthorized), 403 (feature disabled), 500 (server error)

---

## Authentication

All endpoints require `Authorization: Bearer <supabase_access_token>` header. The `requireAuth` middleware validates the token and attaches `req.user`.

## RLS

Backend uses the authenticated user's Supabase client (from AsyncLocalStorage). RLS policies on all customer tables enforce `user_id = auth.uid()` for SELECT/INSERT/UPDATE/DELETE.

## Related Documentation

- [Customer Management Feature](../features/customer-management.md)
- [Authentication & Security](./authentication-and-security.md)
- [Database Schema Reference](../Architecture/database/database-schema-reference.md)
