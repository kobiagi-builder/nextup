# Customer API Endpoints

**Created:** 2026-02-25
**Last Updated:** 2026-02-25
**Version:** 4.0.0
**Status:** Complete (Phase 5)

## Overview

RESTful CRUD API for customer management. All endpoints require Bearer token authentication via the `requireAuth` middleware.

**Base path:** `/api/customers`
**Controllers:** `customer.controller.ts`, `agreement.controller.ts`, `receivable.controller.ts`, `project.controller.ts`, `customer-artifact.controller.ts`
**Services:** `CustomerService.ts`, `AgreementService.ts`, `ReceivableService.ts`, `ProjectService.ts`, `CustomerArtifactService.ts`
**Routes:** `customers.ts`, `agreements.ts`, `receivables.ts`, `projects.ts`, `customer-artifacts.ts`

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
  "projects_count": 1,
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

### GET /api/customers/artifacts/search

Search customer artifacts by title for cross-module linking (portfolio -> customer artifacts). Query capped at 200 characters.

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `q` | string | Yes | Search query (min 2 chars, max 200 chars) |

**Response 200:**
```json
{
  "artifacts": [
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

## Project Endpoints

All project endpoints are nested under `/api/customers/:id/projects`. The `:id` parameter is the customer ID.

**Controller:** `backend/src/controllers/project.controller.ts`
**Service:** `backend/src/services/ProjectService.ts`
**Router:** `backend/src/routes/projects.ts` (mounted with `mergeParams: true`)

---

### GET /api/customers/:id/projects

List all projects for a customer with artifact counts.

**Response 200:**
```json
{
  "projects": [
    {
      "id": "uuid",
      "customer_id": "uuid",
      "name": "Q1 Product Strategy",
      "description": "Strategic planning for Q1 2026",
      "status": "active",
      "agreement_id": "uuid or null",
      "metadata": {},
      "artifacts_count": 3,
      "created_at": "2026-02-25T10:00:00Z",
      "updated_at": "2026-02-25T12:00:00Z"
    }
  ],
  "count": 1
}
```

**Errors:** 400 (missing customer ID), 401, 500

---

### GET /api/customers/:id/projects/:projectId

Get a single project with artifact count.

**Response 200:** Single `ProjectWithCounts` object (same shape as list item).

**Errors:** 400, 401, 404, 500

---

### POST /api/customers/:id/projects

Create a new project for a customer.

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
| `status` | ProjectStatus | No | Enum: `planning`, `active`, `on_hold`, `completed`, `archived`. Defaults to `planning` |
| `agreement_id` | string or null | No | UUID of linked agreement |

**Response 201:** Created project object

**Errors:** 400, 401, 500

---

### PUT /api/customers/:id/projects/:projectId

Update a project (partial update). All fields optional, at least one required.

**Response 200:** Updated project object

---

### DELETE /api/customers/:id/projects/:projectId

Hard delete a project. Database CASCADE deletes child artifacts.

**Response 200:**
```json
{
  "message": "Project deleted successfully"
}
```

---

## Artifact Endpoints

Artifact endpoints are nested under `/api/customers/:id/projects/:projectId/artifacts`. Additionally, a flat list of all artifacts across projects is available at `/api/customers/:id/artifacts`.

**Controller:** `backend/src/controllers/customer-artifact.controller.ts`
**Service:** `backend/src/services/CustomerArtifactService.ts`
**Router:** `backend/src/routes/customer-artifacts.ts` (mounted with `mergeParams: true`)

---

### GET /api/customers/:id/projects/:projectId/artifacts

List artifacts for a project, ordered by `updated_at DESC`.

**Response 200:**
```json
{
  "artifacts": [
    {
      "id": "uuid",
      "project_id": "uuid",
      "customer_id": "uuid",
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

### GET /api/customers/:id/artifacts

List ALL artifacts across all projects for a customer (flat view).

**Response 200:** Same shape as above.

---

### POST /api/customers/:id/projects/:projectId/artifacts

Create a new artifact in a project.

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
| `type` | ArtifactType | No | Enum (10 values). Defaults to `custom` |
| `content` | string | No | Defaults to empty string |
| `status` | ArtifactStatus | No | Enum: `draft`, `in_progress`, `review`, `final`, `archived`. Defaults to `draft` |

**Response 201:** Created artifact object

---

### PUT /api/customers/:id/projects/:projectId/artifacts/:artifactId

Update an artifact (partial update). Used by the auto-save feature for content updates.

**Response 200:** Updated artifact object

---

### DELETE /api/customers/:id/projects/:projectId/artifacts/:artifactId

Hard delete an artifact.

**Response 200:**
```json
{
  "message": "Artifact deleted successfully"
}
```

---

## Authentication

All endpoints require `Authorization: Bearer <supabase_access_token>` header. The `requireAuth` middleware validates the token and attaches `req.user`.

## RLS

Backend uses the authenticated user's Supabase client (from AsyncLocalStorage). RLS policies on all customer tables enforce `user_id = auth.uid()` for SELECT/INSERT/UPDATE/DELETE.

## Related Documentation

- [Customer Management Feature](../features/customer-management.md)
- [Authentication & Security](./authentication-and-security.md)
- [Database Schema Reference](../Architecture/database/database-schema-reference.md)
