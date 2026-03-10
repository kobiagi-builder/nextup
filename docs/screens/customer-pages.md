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
        +-- TabsContent: documents
              +-- DocumentsTab
                    +-- Header (doc count + initiative count + "New Initiative" + "New Document" buttons)
                    +-- DocumentsFilterBar (initiative status Select, name search Input, document status Select, "Clear filters" link)
                    +-- InitiativeSection[] (sorted: active → planning → on_hold → completed → archived; filtered by status + name + doc status)
                    |     +-- Collapsible header (ChevronDown, name, status badge, doc count, 3-dot menu)
                    |     +-- DocumentCard[] (expandable content with grid-rows animation)
                    |     |     +-- Title (truncated) + status badge + type badge
                    |     |     +-- Click to open DocumentEditor
                    |     +-- Empty doc state ("No documents yet")
                    +-- "Folders" separator label + FolderManager (gear icon popover)
                    |     +-- FolderManager popover (list folders, add/rename/delete; system folders protected with lock icon)
                    |     +-- Inline duplicate name validation
                    +-- FolderSection[] (sorted: custom first by sort_order, system last; filtered by name + doc status)
                    |     +-- Collapsible header (div role="button", FolderOpen icon, name, doc count, lock or 3-dot menu)
                    |     +-- DocumentCard[] (same as initiative sections)
                    |     +-- AlertDialog delete confirmation (docs move to General)
                    +-- No-filter-results state (FilterX icon + "Clear filters" link)
                    +-- Empty state ("No documents yet" + "Create First Initiative" CTA)
                    +-- Loading skeleton (3 pulse cards)
                    +-- InitiativeForm (dialog — portal with data-portal-ignore-click-outside)
                    +-- DocumentForm (dialog — portal with data-portal-ignore-click-outside)
                    |     +-- Title, type select, required initiative select, optional folder select
                    +-- DocumentEditor (Sheet — resizable side panel)
                          +-- Resize handle (desktop, left edge drag)
                          +-- Type badge + status Select + initiative reassignment Select + folder reassignment Select
                          +-- 3-dot menu with Delete option (AlertDialog confirm)
                          +-- Editable title (Input, Enter/Escape)
                          +-- "Referenced by" section (read-only Badge chips, via useReferencedByArtifacts)
                          +-- CustomerRichTextEditor (TipTap)
                          +-- Auto-save (1.5s debounce, HTML→Markdown)
```

### State

- Route param: `id` from `useParams`
- Data: `useCustomer(id)` returns `CustomerWithCounts`
- Data: `useAgreements(id)` returns agreements list (Agreements tab + ProjectForm linked agreement select)
- Data: `useReceivables(id)` returns receivables list (Receivables tab)
- Data: `useReceivableSummary(id)` returns `FinancialSummary` (Receivables tab + OverviewTab)
- Data: `useInitiatives(id)` returns `InitiativeWithCounts[]` (Documents tab)
- Data: `useCustomerDocuments(id)` returns `CustomerDocument[]` (Documents tab — flat list grouped client-side by initiative_id or folder_id)
- Data: `useDocumentFolders(id)` returns `DocumentFolder[]` (Documents tab — folder sections + FolderManager)
- Filter state: `initiativeStatusFilter`, `nameSearch`, `documentStatusFilter` (all client-side, AND logic)
- Store: `useCustomerStore` for `activeCustomer` and `activeTab`
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
| Create initiative | Click "New Initiative" in Documents tab | InitiativeForm dialog opens |
| Edit initiative | Click Edit in initiative section 3-dot menu | InitiativeForm pre-populated, PUT on save |
| Delete initiative | Click Delete in initiative section 3-dot menu | Confirm dialog, DELETE on confirm |
| Collapse/expand initiative | Click initiative section header | Toggle via grid-rows CSS animation |
| Create document | Click "New Document" in Documents tab | DocumentForm dialog opens (initiative required) |
| Open document editor | Click DocumentCard | DocumentEditor Sheet slides in from right (resizable) |
| Edit document title | Type in title Input in DocumentEditor | Auto-saves after 1.5s debounce |
| Edit document content | Type in TipTap editor | Auto-saves after 1.5s debounce (HTML→Markdown) |
| Change document status | Select from dropdown in DocumentEditor header | Immediate PUT save |
| Reassign document | Select different initiative in DocumentEditor header | Immediate PUT via useReassignDocument |
| Delete document | Click Delete in DocumentEditor 3-dot menu | Confirm dialog, DELETE on confirm |
| Close document editor | Click overlay or X | Flushes pending save, then closes |

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

## DocumentsTab

**Component:** `frontend/src/features/customers/components/projects/DocumentsTab.tsx`

Flat view of all documents grouped under collapsible initiative sections. No drill-down navigation.

- **Header:** Total document count, total initiative count, "New Initiative" + "New Document" buttons
- **Initiative sections:** `InitiativeSection[]` sorted by status (active → planning → on_hold → completed → archived)
- **Grouping:** Client-side `Record<string, CustomerDocument[]>` by `initiative_id`
- **Empty state:** "No documents yet" + "Create First Initiative" CTA
- **Loading skeleton:** 3 pulse cards

Props:
```typescript
interface DocumentsTabProps {
  customerId: string
}
```

## InitiativeSection

**Component:** `frontend/src/features/customers/components/projects/InitiativeSection.tsx`

Collapsible section displaying an initiative header and its document cards. Uses CSS `grid-template-rows: 0fr/1fr` for smooth expand/collapse animation.

- **ChevronDown** rotates -90deg when collapsed
- **Initiative name** + **status badge** (colored per `INITIATIVE_STATUS_COLORS`)
- **Document count** ("N docs")
- **3-dot menu** (hover-visible: Edit, Delete with AlertDialog confirmation)
- **Delete confirmation** warns that initiative and its documents will be permanently deleted

## DocumentCard

**Component:** `frontend/src/features/customers/components/projects/DocumentCard.tsx`

Minimal clickable row for a single document within an initiative section.

- **Title** (truncated, flex-1)
- **Status badge** (colored per `DOCUMENT_STATUS_COLORS`)
- **Type badge** (colored per `DOCUMENT_TYPE_CONFIG`)
- **Border-bottom** on all cards except the last one
- **Hover:** `hover:bg-muted/30`

## InitiativeForm

**Component:** `frontend/src/features/customers/components/projects/InitiativeForm.tsx`

Portal dialog with `data-portal-ignore-click-outside`. Uses React Hook Form + Zod validation. Supports create and edit modes.

Fields:
- Name (required, text input)
- Description (optional, textarea)
- Status (select: 5 initiative statuses)
- Linked agreement (optional, select from `useAgreements(customerId)`)

## DocumentForm

**Component:** `frontend/src/features/customers/components/projects/DocumentForm.tsx`

Portal dialog with `data-portal-ignore-click-outside`. Creates a new document within a selected initiative.

Fields:
- Title (required, text input)
- Type (select: 10 document types, defaults to "strategy")
- Initiative (required select — every document must belong to an initiative)

## DocumentEditor

**Component:** `frontend/src/features/customers/components/projects/DocumentEditor.tsx`

Resizable side-panel Sheet (`side="right"`, default 768px, min 400px, max 85%) with `data-portal-ignore-click-outside`. Edits document content with auto-save.

**Header:**
- Type badge (read-only)
- Status Select (immediate save on change)
- Initiative reassignment Select (immediate save via `useReassignDocument`)
- 3-dot menu with Delete option (AlertDialog confirmation)
- Editable title (Input, Enter to blur, auto-save on change)
- Resize handle on left edge (desktop only, drag to resize)

**Body:**
- `CustomerRichTextEditor` (TipTap-based)

**"Referenced by" section:**
- Read-only Badge chips linking to portfolio artifacts (via `useReferencedByArtifacts`)
- Shown only when references exist

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
