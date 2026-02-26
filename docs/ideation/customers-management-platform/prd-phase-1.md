# PRD: Customers Management Platform - Phase 1

**Contract**: ./contract.md
**Phase**: 1 of 5
**Focus**: Database foundation, customer CRUD, list page, detail page shell, sidebar navigation

## Phase Overview

Phase 1 establishes the entire foundation for the Customers module. It delivers the database schema for all customer-related tables, the backend API for customer CRUD operations, the frontend customer list page with cards, and the tabbed customer detail page shell with the Overview/Info tab fully functional.

This phase is sequenced first because every subsequent phase depends on the customer data model, API layer, and page structure. Without the database tables, routes, and page layout, nothing else can be built.

After Phase 1 completes, users can create customers, fill in their information (company details, team, product, vertical, persona, ICP), manage customer statuses across the 6-state lifecycle, view their customer list as cards, and navigate to individual customer detail pages. The Agreements, Receivables, and Projects tabs will be visible but show empty-state placeholders.

## User Stories

1. As an advisor, I want to create a new customer record so that I can start tracking a potential or active client.
2. As an advisor, I want to see all my customers as cards on a list page so that I can quickly scan my customer base and their statuses.
3. As an advisor, I want to click on a customer card to open their detail page so that I can manage their information in depth.
4. As an advisor, I want to change a customer's status (Lead, Prospect, Negotiation, Live, On Hold, Archive) so that I can track where each customer is in the engagement lifecycle.
5. As an advisor, I want to edit customer information (company details, team, product, vertical, persona, ICP) so that I keep my customer profiles up to date.
6. As an advisor, I want to delete a customer I no longer need so that my customer list stays clean.
7. As an advisor, I want a "Customers" item in the sidebar navigation so that I can access the module from anywhere in the app.
8. As an advisor, I want my customer data to be private to me so that other users cannot see my clients.

## Functional Requirements

### Database Schema

- **FR-1.1**: Create `customers` table with: id (UUID, PK), user_id (UUID, FK to auth.users), name (text, required), status (text, default 'lead'), created_at, updated_at. Status values: 'lead', 'prospect', 'negotiation', 'live', 'on_hold', 'archive'.
- **FR-1.2**: Create `customer_info` JSONB column on `customers` table (or separate table) storing: about, team (array of team members), product (object), vertical, persona, icp, and extensible additional fields.
- **FR-1.3**: Create `customer_agreements` table with: id (UUID, PK), customer_id (UUID, FK), scope (text), type (text), start_date (date), end_date (date), pricing (JSONB), created_at, updated_at. (Table created now, populated in Phase 2.)
- **FR-1.4**: Create `customer_receivables` table with: id (UUID, PK), customer_id (UUID, FK), type (text: 'invoice' | 'payment'), amount (numeric), date (date), status (text), description (text), metadata (JSONB), created_at, updated_at. (Table created now, populated in Phase 2.)
- **FR-1.5**: Create `customer_projects` table with: id (UUID, PK), customer_id (UUID, FK), name (text), description (text), status (text), metadata (JSONB), created_at, updated_at. (Table created now, populated in Phase 3.)
- **FR-1.6**: Create `customer_artifacts` table with: id (UUID, PK), project_id (UUID, FK to customer_projects), customer_id (UUID, FK), type (text), title (text), content (text), metadata (JSONB), created_at, updated_at. (Table created now, populated in Phase 3.)
- **FR-1.7**: Apply Row Level Security (RLS) on all customer tables: users can only read/write their own data (WHERE user_id = auth.uid()).
- **FR-1.8**: Create indexes on: customers(user_id), customers(status), customer_agreements(customer_id), customer_receivables(customer_id), customer_projects(customer_id), customer_artifacts(project_id), customer_artifacts(customer_id).

### Backend API

- **FR-1.9**: `GET /api/customers` - List all customers for authenticated user. Support query params: status filter, search (by name), sort (by name, status, created_at).
- **FR-1.10**: `GET /api/customers/:id` - Get single customer with full info. Verify ownership.
- **FR-1.11**: `POST /api/customers` - Create new customer. Required: name. Optional: status, info fields. Default status: 'lead'.
- **FR-1.12**: `PUT /api/customers/:id` - Update customer. Support partial updates for name, status, and info fields. Verify ownership.
- **FR-1.13**: `DELETE /api/customers/:id` - Soft delete or hard delete customer. Verify ownership. Cascade to related records.
- **FR-1.14**: `PATCH /api/customers/:id/status` - Quick status update endpoint. Accepts new status value. Verify ownership.

### Frontend - Customer List Page

- **FR-1.15**: New route `/customers` renders the CustomerListPage component.
- **FR-1.16**: Page displays customer cards in a vertical scrollable list (each card landscape-oriented, similar to portfolio artifacts but customer-focused).
- **FR-1.17**: Each card shows: customer name, status badge (color-coded), key info snippet (vertical/industry), last updated date, and quick-action buttons (change status, open detail).
- **FR-1.18**: Status filter bar at the top allows filtering by status (All, Lead, Prospect, Negotiation, Live, On Hold, Archive).
- **FR-1.19**: "New Customer" button opens a creation form/modal.
- **FR-1.20**: After successful customer creation, navigate to `/customers/:newId` detail page so the user can immediately fill in information.
- **FR-1.21**: Empty state shown when no customers exist, with CTA to create first customer.
- **FR-1.22**: Cards are clickable - navigate to `/customers/:id` detail page.

### Frontend - Customer Detail Page

- **FR-1.23**: New route `/customers/:id` renders the CustomerDetailPage component.
- **FR-1.24**: Page header shows customer name, status badge with dropdown to change status, and back-to-list navigation.
- **FR-1.25**: Tab-based layout with 4 tabs: Overview, Agreements, Receivables, Projects. Each tab label includes a count badge (e.g., "Agreements (3)", "Projects (2)") populated from the customer detail API response.
- **FR-1.26**: Overview tab is fully functional: displays and allows editing of all customer info fields (about, team, product, vertical, persona, ICP).
- **FR-1.27**: Agreements, Receivables, and Projects tabs show phase-specific placeholder states (e.g., "Agreements will be available after Phase 2" or an empty-state illustration with brief explanation), not generic "Coming soon" text.
- **FR-1.28**: Customer info editing uses inline editing or a form panel pattern consistent with existing NextUp UX.

### Frontend - Navigation

- **FR-1.29**: Add "Customers" nav item to sidebar's mainNavItems array with Users (or Building2) Lucide icon, linking to `/customers`.
- **FR-1.30**: Add corresponding mobile navigation entry.

### Frontend - State Management

- **FR-1.31**: Create `customerStore.ts` Zustand store for UI state (selected customer, active tab, view preferences). Filter state managed via URL query params (`useSearchParams`), not Zustand.
- **FR-1.32**: Create TanStack Query hooks: `useCustomers()` (list), `useCustomer(id)` (detail with tab counts), `useCreateCustomer()`, `useUpdateCustomer()`, `useDeleteCustomer()`.

## Non-Functional Requirements

- **NFR-1.1**: All API responses under 200ms p95 for customer CRUD operations.
- **NFR-1.2**: RLS policies enforce strict per-user data isolation - no user can access another's customers.
- **NFR-1.3**: Customer list page renders within 500ms with up to 100 customers.
- **NFR-1.4**: Responsive design - list page and detail page work on mobile viewports.
- **NFR-1.5**: Follows existing NextUp code patterns (shadcn/ui components, Tailwind styling, TypeScript strict mode).

## Dependencies

### Prerequisites

- Existing Supabase project with auth configured
- Existing Express backend with auth middleware
- Existing React frontend with routing, shadcn/ui, Zustand, TanStack Query
- All of these are already in place in the current NextUp codebase

### Outputs for Next Phase

- `customers` table with full schema + RLS
- `customer_agreements`, `customer_receivables`, `customer_projects`, `customer_artifacts` tables (empty, schema ready)
- Backend CRUD API for customers
- Frontend customer list page and detail page with tab shell
- Customer Zustand store and TanStack Query hooks
- TypeScript types for all customer entities

## Acceptance Criteria

- [ ] `customers` table exists with all columns, RLS policies, and indexes
- [ ] All 6 related tables created with proper foreign keys and RLS
- [ ] `GET /api/customers` returns only authenticated user's customers
- [ ] `POST /api/customers` creates a customer with default 'lead' status
- [ ] `PUT /api/customers/:id` updates customer info fields
- [ ] `DELETE /api/customers/:id` removes customer and cascades
- [ ] `PATCH /api/customers/:id/status` changes status to any valid value
- [ ] Sidebar shows "Customers" nav item that navigates to `/customers`
- [ ] Customer list page shows cards with name, status badge, and key details
- [ ] Status filter bar filters customer cards by status
- [ ] Clicking a card navigates to `/customers/:id`
- [ ] Customer detail page shows tab layout with Overview tab functional
- [ ] Overview tab allows editing all customer info fields
- [ ] Agreements/Receivables/Projects tabs show empty-state placeholders
- [ ] New Customer creation flow works end-to-end and navigates to detail page
- [ ] Customer detail API returns tab count data (agreements, receivables, projects)
- [ ] Customer deletion works with confirmation dialog
- [ ] All TypeScript compiles without errors
- [ ] Unit tests for backend service layer
- [ ] Integration tests for API endpoints

---

*Review this PRD and provide feedback before spec generation.*
