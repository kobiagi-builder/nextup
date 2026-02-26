# Customer Pages

**Created:** 2026-02-25
**Last Updated:** 2026-02-25
**Version:** 5.0.0
**Status:** Complete

## Overview

Two pages for customer management: a list page (`/customers`) and a detail page (`/customers/:id`). Both render inside the AppShell. Phase 2 activated the Agreements and Receivables tabs. Phase 3 activates the Projects tab with project list/detail views, artifact CRUD, and a side-panel rich text editor. Phase 4 adds a "Chat" button to the detail page header that opens the AppShell split-view chat panel with dual AI agents (Customer Mgmt + Product Mgmt). Phase 5 enriches the list page with summary metrics on cards, full-text search, 6 sort options, structured loading skeletons, AlertDialog confirmations, responsive 2-column grid, event timeline type filter, and cross-module artifact linking.

## Customer List Page

**Route:** `/customers`
**Component:** `frontend/src/features/customers/pages/CustomerListPage.tsx`

### Layout

```
+------------------------------------------------------+
| Header: "Customers"               [+ New Customer]   |
+------------------------------------------------------+
| Status pills: [All] [Lead] [Prospect] ...            |
| [Search...                    ] [Sort: Last Updated v]|
+------------------------------------------------------+
| CustomerCard  |  CustomerCard     (responsive 2-col)  |
| CustomerCard  |  CustomerCard                         |
| ...                                                   |
+------------------------------------------------------+
| AlertDialog (archive confirmation, portal)            |
+------------------------------------------------------+
```

### Component Hierarchy

```
CustomerListPage
  +-- Header (title + New Customer button)
  +-- Filter bar
  |     +-- Status pills (button per status)
  |     +-- Search input (with Search icon) — full-text search via TSVECTOR
  |     +-- Sort select dropdown (6 options: name, status, created, updated, last activity, outstanding balance)
  +-- Content area (scrollable)
  |     +-- CustomerCardSkeleton[] (4 structured skeletons)
  |     +-- EmptyCustomers (no data + CTA)
  |     +-- EmptyCustomerSearch (no matches)
  |     +-- CustomerCard[] (grid grid-cols-1 sm:grid-cols-2 gap-3)
  +-- NewCustomerDialog (portal modal)
  +-- AlertDialog (archive confirmation, data-portal-ignore-click-outside)
```

### CustomerCard

**Component:** `frontend/src/features/customers/components/shared/CustomerCard.tsx`
**Props type:** `CustomerWithSummary`

Landscape card showing:
- **Name** (truncated) + optional vertical badge
- **Status badge** (colored dot + label)
- **Status quick-change** (hover/focus-visible dropdown, `group-hover:opacity-100 group-focus-within:opacity-100`)
- **Actions menu** (hover/focus-visible "..." with View Details, Archive)
- **About preview** (1-line clamp)
- **Metrics row** (always visible, 4 items):
  - Active agreements count (FileText icon, em-dash if 0)
  - Outstanding balance (DollarSign icon, amber if > 0, formatted as currency, em-dash if 0)
  - Active projects count (FolderOpen icon, em-dash if 0)
  - Last activity (Clock icon, relative date via `formatEventDate()`, em-dash if none)
- **Timestamp** (relative "Updated 2h ago")

Click navigates to `/customers/:id`.

### CustomerCardSkeleton

**Component:** `frontend/src/features/customers/components/shared/CustomerCardSkeleton.tsx`

Structured skeleton matching CustomerCard layout: header row (name + status), about line, metrics row (3 items + timestamp).

### State

- Filter state: URL search params (`status`, `q`, `sort`)
- Dialog state: local `useState` for `isNewDialogOpen`
- Archive state: `customerToArchive: string | null` for AlertDialog
- Data: `useCustomers(filters)` TanStack Query hook (calls `get_customer_list_summary` RPC, returns `CustomerWithSummary[]`)

## Customer Detail Page

**Route:** `/customers/:id`
**Component:** `frontend/src/features/customers/pages/CustomerDetailPage.tsx`

### Layout

```
+------------------------------------------------------+
| [<-] Customer Name (editable)    [Chat] [Status dropdown] |
+------------------------------------------------------+
| [Overview] [Agreements (N)] [Receivables (N)] [Projects (N)] |  (overflow-x-auto on mobile)
+------------------------------------------------------+
| Tab content (scrollable)                              |
|                                                       |
| Overview tab:                                         |
|   QuickStats (status, created, updated, events count, |
|               total invoiced + balance if available)  |
|   CustomerInfoSection (about, vertical, persona, etc) |
|   TeamSection (member list with add/edit/delete)      |
|   EventTimeline (chronological event cards)           |
|                                                       |
| Agreements tab:                                       |
|   Header (count badge + Add Agreement button)         |
|   AgreementCard[]                                     |
|   Empty state if no agreements                        |
|                                                       |
| Receivables tab:                                      |
|   FinancialSummary (3-col: invoiced, paid, outstanding)|
|   Transaction list (Record Invoice / Record Payment)  |
|   TransactionRow[]                                    |
+------------------------------------------------------+
```

### Component Hierarchy

```
CustomerDetailPage
  +-- Header
  |     +-- Back button (-> /customers)
  |     +-- Editable name (click to edit, Enter/Escape)
  |     +-- Chat button (Sparkles icon, opens AI chat panel)
  |     +-- CustomerStatusSelect
  +-- Tabs (shadcn Tabs)
        +-- TabsList: Overview | Agreements | Receivables | Projects
        +-- TabsContent: overview
        |     +-- OverviewTab
        |           +-- QuickStats (optional FinancialSummary prop)
        |           +-- CustomerInfoSection (read/edit toggle)
        |           +-- TeamSection (CRUD for team members)
        |           +-- EventTimeline (+ AddEventDialog + event type filter dropdown)
        +-- TabsContent: agreements
        |     +-- AgreementsTab
        |           +-- Header (agreement count + Add Agreement button)
        |           +-- AgreementCard[] (one per agreement)
        |           |     +-- Scope title
        |           |     +-- Computed status badge (color-coded)
        |           |     +-- Type label
        |           |     +-- Date range (formatted)
        |           |     +-- Pricing summary
        |           |     +-- Hover actions: Edit, Terminate, Delete (with confirmation)
        |           +-- Empty state (no agreements yet + Add button)
        |           +-- AgreementForm (dialog — portal with data-portal-ignore-click-outside)
        |                 +-- Scope (textarea)
        |                 +-- Type (select)
        |                 +-- Start date / End date (date inputs)
        |                 +-- Pricing: amount, currency, frequency, notes
        +-- TabsContent: receivables
        |     +-- ReceivablesTab
        |           +-- FinancialSummary (3-column card)
        |           |     +-- Total Invoiced
        |           |     +-- Total Paid (green)
        |           |     +-- Outstanding (amber if positive, green if zero, blue if negative "Credit")
        |           +-- Transaction list header (Record Invoice + Record Payment buttons)
        |           +-- TransactionRow[] (one per receivable)
        |           |     +-- Type icon (blue invoice, green payment)
        |           |     +-- Description + reference
        |           |     +-- Date
        |           |     +-- Amount (+ prefix for payments)
        |           |     +-- Invoice status badge (invoices only)
        |           |     +-- Hover actions: Edit, Mark as Paid (invoices only), Delete
        |           +-- InvoiceForm (dialog — portal with data-portal-ignore-click-outside)
        |           |     +-- Amount, date, description, reference
        |           |     +-- Status select
        |           |     +-- Linked agreement select
        |           +-- PaymentForm (dialog — portal with data-portal-ignore-click-outside)
        |                 +-- Amount, date, description, reference
        |                 +-- Linked invoice select
        +-- TabsContent: projects
              +-- ProjectsTab
                    +-- [List view] (when no project selected)
                    |     +-- Header ("Projects" count + "New Project" button)
                    |     +-- ProjectCard[] (grid gap-3)
                    |     |     +-- Name + status badge
                    |     |     +-- Description (line-clamp-1)
                    |     |     +-- Artifact count + linked agreement label
                    |     |     +-- Last updated (relative)
                    |     |     +-- Actions dropdown (Edit, Delete with confirm)
                    |     +-- Empty state ("No projects yet" + Create CTA)
                    |     +-- Loading skeleton (3 pulse cards)
                    |     +-- ProjectForm (dialog — portal with data-portal-ignore-click-outside)
                    +-- [Detail view] (when project selected via Zustand)
                          +-- ProjectDetail
                                +-- Back button (clears selectedProjectId)
                                +-- Project name + status badge + description
                                +-- Linked agreement label (if any)
                                +-- Edit button (opens ProjectForm)
                                +-- Artifacts header ("Artifacts" count + "New Artifact" button)
                                +-- ArtifactRow[] (list)
                                |     +-- Type badge (colored)
                                |     +-- Title + status badge
                                |     +-- Content preview (~80 chars, stripped)
                                |     +-- Last updated (relative)
                                +-- Empty artifact state
                                +-- ArtifactForm (dialog — portal with data-portal-ignore-click-outside)
                                +-- ArtifactEditor (Sheet — side panel)
                                      +-- Type badge + status Select + save indicator
                                      +-- Delete button (with AlertDialog confirm)
                                      +-- Editable title (Input, Enter/Escape)
                                      +-- "Referenced by" section (read-only Badge chips linking to portfolio artifacts, via useReferencedByArtifacts)
                                      +-- CustomerRichTextEditor (TipTap)
                                      +-- Auto-save (1.5s debounce, HTML→Markdown)
```

### State

- Route param: `id` from `useParams`
- Data: `useCustomer(id)` returns `CustomerWithCounts`
- Data: `useAgreements(id)` returns agreements list (Agreements tab + ProjectForm linked agreement select)
- Data: `useReceivables(id)` returns receivables list (Receivables tab)
- Data: `useReceivableSummary(id)` returns `FinancialSummary` (Receivables tab + OverviewTab)
- Data: `useProjects(id)` returns `ProjectWithCounts[]` (Projects tab list view)
- Data: `useProject(id, projectId)` returns single project (Projects tab detail view)
- Data: `useProjectArtifacts(id, projectId)` returns `CustomerArtifact[]` (Projects tab detail view)
- Store: `useCustomerStore` for `activeCustomer`, `activeTab`, and `selectedProjectIds`
- Local: `isEditingName`, `editedName` for inline name edit

### Key Interactions

| Action | Trigger | Result |
|--------|---------|--------|
| Edit name | Click name text | Input appears, Enter saves, Escape cancels |
| Change status | Select from dropdown | PATCH API, header updates |
| Edit info | Click "Edit" on info section | Form appears, Save/Cancel |
| Add team member | Click "Add Member" | Inline form row |
| Add event | Click "Add Event" in timeline | Dialog with title, description, date, type |
| Navigate back | Click back arrow | Navigates to `/customers` |
| Create agreement | Click "Add Agreement" in Agreements tab | AgreementForm dialog opens |
| Edit agreement | Hover card, click Edit | AgreementForm pre-populated, PUT on save |
| Terminate agreement | Hover card, click Terminate | Sets override_status to "terminated" via PUT |
| Delete agreement | Hover card, click Delete | Confirm dialog, DELETE on confirm |
| Record invoice | Click "Record Invoice" in Receivables tab | InvoiceForm dialog opens |
| Record payment | Click "Record Payment" in Receivables tab | PaymentForm dialog opens |
| Edit transaction | Hover row, click Edit | Appropriate form pre-populated, PUT on save |
| Mark as paid | Hover invoice row, click "Mark as Paid" | Sets status to "paid" via PUT |
| Delete transaction | Hover row, click Delete | Confirm dialog, DELETE on confirm |
| Create project | Click "New Project" in Projects tab | ProjectForm dialog opens |
| Edit project | Click Edit in project card actions | ProjectForm pre-populated, PUT on save |
| Delete project | Click Delete in project card actions | Confirm dialog, DELETE on confirm (cascades artifacts) |
| Select project | Click project card | Zustand `selectedProjectIds` updated, detail view renders |
| Back to project list | Click back arrow in ProjectDetail | Clears `selectedProjectId`, list view renders |
| Create artifact | Click "New Artifact" in ProjectDetail | ArtifactForm dialog opens |
| Open artifact editor | Click ArtifactRow | ArtifactEditor Sheet slides in from right |
| Edit artifact title | Type in title Input in ArtifactEditor | Auto-saves after 1.5s debounce |
| Edit artifact content | Type in TipTap editor | Auto-saves after 1.5s debounce (HTML→Markdown) |
| Change artifact status | Select from dropdown in ArtifactEditor header | Immediate PUT save |
| Delete artifact | Click trash icon in ArtifactEditor header | Confirm dialog, DELETE on confirm |
| Close artifact editor | Click overlay or X | Flushes pending save, then closes |

## OverviewTab — QuickStats Enhancement

**Component:** `frontend/src/features/customers/components/tabs/OverviewTab.tsx`

`OverviewTab` fetches `useReceivableSummary(customerId)` and passes the result as an optional `financialSummary` prop to `QuickStats`. When summary data is available, the Financials card in QuickStats displays:
- Total Invoiced amount
- Outstanding balance

When no receivables exist, the Financials card shows a neutral placeholder.

**Component:** `frontend/src/features/customers/components/overview/QuickStats.tsx`

Props:
```typescript
interface QuickStatsProps {
  customer: CustomerWithCounts
  financialSummary?: FinancialSummary  // optional — passed from OverviewTab
}
```

## NewCustomerDialog

**Component:** `frontend/src/features/customers/components/forms/NewCustomerDialog.tsx`

Portal modal (`createPortal` to `document.body`) with `data-portal-ignore-click-outside`.

Fields:
- Name (required, text input)
- Status (optional, select, defaults to "lead")
- About (optional, textarea)
- Vertical (optional, text input)

## AgreementForm

**Component:** `frontend/src/features/customers/components/forms/AgreementForm.tsx`

Portal dialog (`createPortal` to `document.body`) with `data-portal-ignore-click-outside`. Uses React Hook Form + Zod validation. Supports both create and edit modes (pre-populates fields when editing).

Fields:
- Scope (textarea, required)
- Type (select: 7 agreement types)
- Start date (date input)
- End date (date input)
- Amount (number input)
- Currency (text input)
- Frequency (text input: monthly, annually, one-time, etc.)
- Notes (textarea, optional)

## InvoiceForm

**Component:** `frontend/src/features/customers/components/forms/InvoiceForm.tsx`

Portal dialog with `data-portal-ignore-click-outside`. Uses React Hook Form + Zod validation.

Fields:
- Amount (number, required)
- Date (date, required)
- Description (text)
- Reference number (text)
- Status (select: draft, sent, overdue, paid, cancelled)
- Linked agreement (select from customer's agreements)

## PaymentForm

**Component:** `frontend/src/features/customers/components/forms/PaymentForm.tsx`

Portal dialog with `data-portal-ignore-click-outside`. Uses React Hook Form + Zod validation.

Fields:
- Amount (number, required)
- Date (date, required)
- Description (text)
- Reference number (text)
- Linked invoice (select from customer's invoices)

## ProjectsTab

**Component:** `frontend/src/features/customers/components/projects/ProjectsTab.tsx`

Tab orchestrator that switches between list and detail views based on Zustand `selectedProjectIds[customerId]`.

- **List view** (no project selected): Header with project count and "New Project" button, `ProjectCard` grid, empty state, loading skeleton
- **Detail view** (project selected): Renders `<ProjectDetail>` with back navigation

Props:
```typescript
interface ProjectsTabProps {
  customerId: string
}
```

## ProjectCard

**Component:** `frontend/src/features/customers/components/projects/ProjectCard.tsx`

Landscape card for a single project.

- **Name** + **status badge** (colored per `PROJECT_STATUS_COLORS`)
- **Description** (1-line clamp)
- **Artifact count** (FileText icon + "N artifacts")
- **Linked agreement** label (if `agreement_id` is set, resolved from agreements list)
- **Last updated** (relative via `date-fns`)
- **Actions dropdown** (hover-visible: Edit, Delete with confirmation)
- Click calls `onSelect` (sets Zustand `selectedProjectId`)

## ProjectDetail

**Component:** `frontend/src/features/customers/components/projects/ProjectDetail.tsx`

Detail view showing project header + artifact list.

- **Back button** — clears `selectedProjectId` via Zustand
- **Project name**, status badge, description, linked agreement label
- **Edit button** — opens `ProjectForm` in edit mode
- **Artifacts section** — header with count + "New Artifact" button
- **ArtifactRow list** — clicking a row opens `ArtifactEditor` Sheet
- **Delete artifact** — via `useDeleteArtifact` mutation

## ProjectForm

**Component:** `frontend/src/features/customers/components/projects/ProjectForm.tsx`

Portal dialog (`createPortal` to `document.body`) with `data-portal-ignore-click-outside`. Uses React Hook Form + Zod validation. Supports create and edit modes.

Fields:
- Name (required, text input)
- Description (optional, textarea)
- Status (select: 5 project statuses)
- Linked agreement (optional, select from `useAgreements(customerId)`)

## ArtifactRow

**Component:** `frontend/src/features/customers/components/projects/ArtifactRow.tsx`

Clickable list row for a single artifact.

- **Type badge** (colored per `ARTIFACT_TYPE_CONFIG`)
- **Title** (truncated)
- **Status badge** (colored per `ARTIFACT_STATUS_COLORS`)
- **Content preview** (~80 chars, HTML/markdown stripped)
- **Last updated** (relative)

## ArtifactForm

**Component:** `frontend/src/features/customers/components/projects/ArtifactForm.tsx`

Portal dialog with `data-portal-ignore-click-outside`. Simple form for creating artifacts.

Fields:
- Title (required, text input)
- Type (select: 10 artifact types, defaults to "custom")

## ArtifactEditor

**Component:** `frontend/src/features/customers/components/projects/ArtifactEditor.tsx`

Side-panel Sheet (`side="right"`, `sm:max-w-3xl`) with `data-portal-ignore-click-outside`. Edits artifact content with auto-save.

**Header:**
- Type badge (read-only)
- Status Select (immediate save on change)
- Save indicator ("Saving..." / "Saved" / "Unsaved changes")
- Delete button (opens AlertDialog confirmation)
- Editable title (Input, Enter to blur, auto-save on change)

**Body:**
- `CustomerRichTextEditor` (TipTap-based)

**Content format:**
- **On open:** `isMarkdown(content)` → `markdownToHTML(content)` → pass as HTML to TipTap
- **During edit:** TipTap fires `onChange(html)` → debounce 1.5s → `htmlToMarkdown(html)` → `PUT` save
- **On close:** Flushes pending save and waits for completion before closing

## CustomerRichTextEditor

**Component:** `frontend/src/features/customers/components/projects/CustomerRichTextEditor.tsx`

Simplified TipTap rich text editor with no portfolio-specific dependencies.

**Extensions:** StarterKit (headings 1-3, bold, italic, lists, blockquote, code, history), Placeholder, Link

**Toolbar:** Undo/Redo | H1/H2 | Bold/Italic/Code | BulletList/OrderedList | Blockquote/Link

Props:
```typescript
interface CustomerRichTextEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
  editable?: boolean
}
```

## Related Documentation

- [Customer Management Feature](../features/customer-management.md)
- [Customer Management Flow](../flows/customer-management-flow.md)
- [Customer API Endpoints](../api/customer-endpoints.md)
- [App Shell](./app-shell.md)
