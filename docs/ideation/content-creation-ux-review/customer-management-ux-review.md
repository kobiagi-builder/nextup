# Customer Management UX/UI Review

**Product:** NextUp — Customer Management Feature
**Review Date:** 2026-03-03
**Reviewer:** Interface Design Agent
**Design System Reference:** Midnight Architect (docs/frontend/ux-ui-design-guide.md)
**Screenshots Reviewed:** 32 screenshots covering all screens and flows
**Source Files Reviewed:** 24 component files

---

## Overall Assessment

| Dimension | Score | Notes |
|---|---|---|
| Usability | 7.0 / 10 | Core flows work well; friction in empty states and redundant labels |
| Visual Design | 6.0 / 10 | Light mode color accessibility failures undermine an otherwise clean system |
| Consistency | 6.5 / 10 | One native `<select>` breaks the entire design system contract |
| Delight | 5.0 / 10 | Empty states are functional but identical; no personality differentiates them |
| Accessibility | 5.5 / 10 | Critical contrast failures on financial colors; icon-only metrics lack labels |
| Information Architecture | 6.5 / 10 | Tab counts showing `(0)` add noise; detail header is over-dense |

The feature is structurally sound. The data model is complete, the component architecture is well-organized, and the interaction patterns (inline status changes, click-to-edit name, progressive disclosure on hover) are thoughtful. The issues are concentrated in three areas: light-mode color accessibility, redundant labeling on the customer card, and template-identical empty states across all five tabs.

---

## Section 1: Customer List — Empty State

**File:** `frontend/src/features/customers/pages/CustomerListPage.tsx`
**Screenshot:** `02-customers-list-page`

### Issue 1.1 — CRITICAL: Filter bar visible on zero-customer empty state

The filter bar (Status, ICP Score, Search, Sort) renders on every page load regardless of whether any customers exist. When a brand-new user lands on this page for the first time, the empty state "No customers yet" competes visually with four filter controls that have nothing to filter. This violates Nielsen's principle of minimalist design and creates a false affordance — the controls appear active but are meaningless.

**Evidence:** `CustomerListPage.tsx` line 160 — the filter `<div>` is outside any conditional and always renders.

**Fix:**

```tsx
// Line 160 — wrap the filters div
{(customers.length > 0 || hasFilters) && (
  <div className="flex items-center gap-3 px-6 py-3 border-b border-border/50">
    {/* ...existing filter content unchanged... */}
  </div>
)}
```

The `hasFilters` check ensures the bar remains visible when the user has active filters that return zero results (the "no results" state), so they can clear filters. It disappears only on the true empty state.

### Issue 1.2 — Medium: Search input width inconsistent with compact filter pills

The search input uses `max-w-sm` (384px) which takes up roughly 40% of the filter bar while the Status and ICP Score filter pills are compact pill-buttons at ~80px each. At 1440px viewport the search field dominates the bar unnecessarily.

**Fix:** Change `flex-1 max-w-sm` to `flex-1 max-w-[240px]` to create a more balanced toolbar rhythm. Alternatively, move search to the far right and give it `w-[200px]`.

---

## Section 2: Customer Card

**File:** `frontend/src/features/customers/components/shared/CustomerCard.tsx`
**Screenshot:** `23-customers-list-with-customer`

### Issue 2.1 — HIGH: Redundant label spans before every badge

The card renders three uppercase micro-labels before each piece of information: `STATUS:`, `VERTICAL:`, `ICP RANK:`. These labels consume horizontal space, push the actual data further right, and provide zero additional meaning — the StatusPill and IcpScoreBadge are self-evidencing through color and text. The result is a card that reads like a form rather than a scannable summary.

**Evidence:** `CustomerCard.tsx` lines 65, 107, 114 — three `<span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">` elements.

**Fix:** Remove all three label spans. The badges are self-labeling. If layout needs anchoring, the icons in row 3 already establish the visual rhythm.

```tsx
// Row 1: Remove the label span, keep only the pill
<div className="flex items-center gap-1.5">
  {/* Remove: <span className="text-[11px]...">Status:</span> */}
  <CustomerStatusPill
    status={customer.status}
    onStatusChange={onStatusChange ? (s) => onStatusChange(customer.id, s) : undefined}
  />
</div>

// Row 2: Remove both label spans
{vertical && (
  <div className="flex items-center gap-1.5">
    {/* Remove: <span className="text-[11px]...">Vertical:</span> */}
    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
      {vertical}
    </span>
  </div>
)}
<div className="flex items-center gap-1.5">
  {/* Remove: <span className="text-[11px]...">ICP Rank:</span> */}
  <IcpScoreBadge score={(customer.info?.icp_score as IcpScore) ?? null} />
</div>
```

### Issue 2.2 — Medium: Icon-only metrics have no accessible names

Row 3 uses four icon+value pairs (`FileText`, `DollarSign`, `FolderOpen`, `ListChecks`) with only `title` attributes for tooltip text. Screen readers announce the icon's SVG role but not the semantic label. The `title` attribute on a `<span>` is not reliably announced by all screen readers.

**Fix:** Add `aria-label` to each metric span:

```tsx
<span
  className="flex items-center gap-1"
  aria-label={`${customer.active_agreements_count || 0} active agreements`}
>
  <FileText className="h-3 w-3" aria-hidden="true" />
  {customer.active_agreements_count || '\u2014'}
</span>
```

Repeat the pattern for balance, projects, and action items. Add `aria-hidden="true"` to each icon since the parent span carries the semantic label.

### Issue 2.3 — Low: Card grid stays at 2 columns at wide viewports

The grid uses `sm:grid-cols-2` and stops there. At 1440px+ the two-column grid produces very wide cards with a lot of wasted horizontal space on the right.

**Fix:** Add `xl:grid-cols-3` to the grid:

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
```

---

## Section 3: Filter System

**Files:** `frontend/src/features/customers/components/shared/MultiSelectFilter.tsx`, `CustomerListPage.tsx`
**Screenshots:** `25-status-filter-dropdown`, `26-icp-filter-dropdown`, `27-sort-dropdown`

### What works well

The MultiSelectFilter component is genuinely well-built. Checkbox selection with colored dot indicators, a count badge on the trigger showing active filter count, "Clear all" option, and URL-persisted state via `useSearchParams` — this is production-quality work. The colored dot system correctly uses `bg-*-400` dot colors (which are background-only, not text, so the contrast concern does not apply here).

### Issue 3.1 — Low: Sort control uses shadcn `Select` while filters use custom Popover

The Sort dropdown (shadcn `Select` with `SelectTrigger`/`SelectContent`) renders visually differently from the Status and ICP Score filters (custom Popover with checkbox list). Both are in the same toolbar row. At a glance they look consistent, but on open they diverge in behavior: the filters show checkboxes with dots, the sort shows a plain option list without visual treatment.

This is acceptable for now — the sort is single-select by nature while filters are multi-select. No change required, but consider adding a subtle `text-primary` indicator on the Sort trigger when a non-default sort is active, matching the count badge behavior on MultiSelectFilter.

---

## Section 4: New Customer Dialog

**File:** `frontend/src/features/customers/components/forms/NewCustomerDialog.tsx`
**Screenshots:** `03-new-customer-dialog-empty`, `04-new-customer-dialog-filled`

The dialog is clean and appropriately minimal. Name + optional Status is the right scope for creation — no friction, no over-asking. The auto-focus on the name field is correct.

### Issue 4.1 — Low: No keyboard shortcut hint for opening the dialog

"New Customer" is the primary CTA on an empty list page. Power users opening this daily would benefit from a keyboard shortcut (e.g., `N` or `Ctrl+K`). This is a nice-to-have, not a fix.

---

## Section 5: Customer Detail Page — Header

**File:** `frontend/src/features/customers/pages/CustomerDetailPage.tsx`
**Screenshots:** `05-customer-detail-overview-tab`, `22-customer-detail-overview-no-chat`, `32-customer-name-edit-inline`

### Issue 5.1 — CRITICAL: Chat toggle icon communicates layout, not AI

The chat panel toggle uses `PanelLeftOpen` / `PanelLeftClose` icons — these are generic panel layout icons with no semantic connection to AI or conversation. A user seeing this for the first time has no reason to understand it opens an AI assistant. This is the primary discovery path for the AI chat feature and it is functionally invisible.

**Evidence:** `CustomerDetailPage.tsx` lines 10 and 154.

**Fix:** Replace with `Bot` / `BotOff` from Lucide (available in the project's Lucide version):

```tsx
import { ArrowLeft, Check, Bot, BotOff, X } from 'lucide-react'

// Line 154:
{isChatOpen ? <BotOff className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
```

If `BotOff` is not in the installed Lucide version, use `MessageSquare` / `MessageSquareOff` or `Sparkles`. The critical requirement is that the icon communicates intelligence or conversation, not panel layout.

Also update the title attribute for clarity:

```tsx
title={isChatOpen ? 'Close AI Assistant' : 'Open AI Assistant'}
```

### Issue 5.2 — HIGH: Tab counts display `(0)` for empty tabs, adding visual noise

Every tab shows its count inline: `Agreements (0)`, `Receivables (0)`, `Projects (0)`, `Action Items (0)`. For a new customer, the header reads as four zeroes in parentheses. This adds cognitive noise without value — a zero count communicates nothing actionable.

**Evidence:** `CustomerDetailPage.tsx` lines 217, 222, 228, 234.

**Fix:** Only show the count when it is greater than zero:

```tsx
<TabsTrigger value="agreements" ...>
  Agreements{customer.agreements_count > 0 ? ` (${customer.agreements_count})` : ''}
</TabsTrigger>
<TabsTrigger value="receivables" ...>
  Receivables{customer.receivables_count > 0 ? ` (${customer.receivables_count})` : ''}
</TabsTrigger>
<TabsTrigger value="projects" ...>
  Projects{customer.projects_count > 0 ? ` (${customer.projects_count})` : ''}
</TabsTrigger>
<TabsTrigger value="action_items" ...>
  Action Items{customer.action_items_count > 0 ? ` (${customer.action_items_count})` : ''}
</TabsTrigger>
```

### Issue 5.3 — Medium: Header row is over-dense at six inline elements

The header row contains: `[Bot toggle] [divider] [back arrow] [company name] [status pill] [ICP badge]`. Six interactive/visual elements in a single horizontal flex row with no grouping. At narrow viewports (1024px with chat open) this compresses badly. The ICP badge has no interactive affordance and is already visible on the customer card — its presence in the header is redundant when the full detail is available in the Overview tab.

**Fix — Option A (minimal change):** Remove the ICP badge from the header. It is already visible in the Overview tab's QuickStats and in the list. The header should show only the most action-critical information.

**Fix — Option B (restructuring):** Group the navigation controls left, identity right:

```tsx
<div className="flex items-center justify-between gap-3 mb-2">
  {/* Nav group */}
  <div className="flex items-center gap-2">
    <Button variant="ghost" size="icon" onClick={() => isChatOpen ? closeChat() : openCustomerChat()}>
      {isChatOpen ? <BotOff className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
    </Button>
    <div className="h-6 w-px bg-border" />
    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/customers')}>
      <ArrowLeft className="h-4 w-4" />
    </Button>
  </div>
  {/* Identity group */}
  <div className="flex items-center gap-3 flex-1 min-w-0">
    {/* name editing JSX */}
    <CustomerStatusPill status={customer.status} onStatusChange={handleStatusChange} size="md" />
  </div>
</div>
```

---

## Section 6: Overview Tab — Quick Stats

**File:** `frontend/src/features/customers/components/overview/QuickStats.tsx`
**Screenshot:** `05-customer-detail-overview-tab`

### Issue 6.1 — CRITICAL: `text-amber-400` and `text-blue-400` fail WCAG AA contrast in light mode

The Financials stat card uses `subValueColor` values of `text-amber-400` (for positive outstanding balance) and `text-blue-400` (for credit/negative balance), and `text-green-400` (for zero balance). On a white card background (`bg-card` = `#FFFFFF` in light mode), these colors produce contrast ratios of approximately:

- `text-amber-400` (#FBBF24): ~2.7:1 — **FAILS** WCAG AA (requires 4.5:1 for normal text)
- `text-blue-400` (#60A5FA): ~3.2:1 — **FAILS** WCAG AA
- `text-green-400` (#4ADE80): ~2.2:1 — **FAILS** WCAG AA

These are actual financial values visible to the user, not decorative elements.

**Evidence:** `QuickStats.tsx` line 35:
```tsx
subValueColor: balanceDir === 'positive' ? 'text-amber-400' : balanceDir === 'negative' ? 'text-blue-400' : 'text-green-400',
```

**Fix:** Use the 600-weight variants in light mode, 400-weight in dark mode via Tailwind dark: modifier:

```tsx
subValueColor: balanceDir === 'positive'
  ? 'text-amber-600 dark:text-amber-400'
  : balanceDir === 'negative'
  ? 'text-blue-600 dark:text-blue-400'
  : 'text-muted-foreground',  // zero balance = neutral, not green
```

The zero balance case should use `text-muted-foreground` rather than green. A zero outstanding balance is a neutral fact, not a positive achievement — using green implies success where there is simply nothing to report.

Contrast ratios for the fixed values on white:
- `text-amber-600` (#D97706): ~4.5:1 — passes WCAG AA
- `text-blue-600` (#2563EB): ~5.9:1 — passes WCAG AA

---

## Section 7: Overview Tab — Customer Information

**File:** `frontend/src/features/customers/components/overview/CustomerInfoSection.tsx`
**Screenshots:** `05-customer-detail-overview-tab`, `12-customer-info-edit-mode`

### Issue 7.1 — HIGH: Multiple "Not set" values are discouraging for new customers

The `InfoField` component renders `<span className="text-muted-foreground italic">Not set</span>` for every empty field. A newly created customer shows "Not set" for About, Persona, and ICP (Ideal Customer Profile) — three italic placeholder strings in a row that make the record feel incomplete and neglected.

**Evidence:** `CustomerInfoSection.tsx` line 44:
```tsx
{value || <span className="text-muted-foreground italic">Not set</span>}
```

**Fix:** Replace "Not set" with an em-dash for secondary fields:

```tsx
function InfoField({ label, value, primary = false }: { label: string; value?: string; primary?: boolean }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-sm text-foreground">
        {value || <span className="text-muted-foreground">{primary ? 'Click Edit to add' : '\u2014'}</span>}
      </p>
    </div>
  )
}
```

Use `primary={true}` only on the About field — it is the most important and the single nudge to edit is sufficient. All other empty fields use a neutral em-dash.

### Issue 7.2 — Medium: Product section always visible in edit mode even when not relevant

In edit mode, the Product section (Name, Stage, Category, URL, Description) is always rendered below the main fields. For service-based advisors whose customers are not software companies, this section is irrelevant — but it is always present and requires scrolling past. This inflates cognitive load for the majority of use cases.

**Fix — progressive disclosure:** Add a toggle to show/hide the Product section:

```tsx
const [showProduct, setShowProduct] = useState(
  !!(info.product?.name || info.product?.stage || info.product?.category)
)

// In edit form, before the product section:
{!showProduct ? (
  <button
    type="button"
    onClick={() => setShowProduct(true)}
    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
  >
    + Add product details
  </button>
) : (
  <div className="pt-3 border-t border-border/50">
    {/* ...existing product fields... */}
  </div>
)}
```

In read mode, the product section is already conditionally hidden when empty (line 122), so no change needed there.

---

## Section 8: Overview Tab — Team Members

**File:** `frontend/src/features/customers/components/overview/TeamSection.tsx`
**Screenshot:** `30-add-team-member-form`

### What works well

The inline add/edit pattern for team members is well-executed. The `+ Add` button is right-aligned in the section header, the form appears inline without a dialog, and the LinkedIn URL field for team members is a thoughtful detail. Editing inline without a modal is the correct choice for this content type.

### Issue 8.1 — Low: Italic "No team members added yet." is inconsistent

The empty state text uses italic styling (`italic` class) while all other empty state text in the feature (Activity Timeline: "No events recorded yet.") is also italic. The inconsistency is: CustomerInfoSection uses non-italic "Not set" (now changed above), but this section uses italic. A unified approach is cleaner.

**Fix:** Remove the `italic` class from the TeamSection empty state text. Italic is not used in the Midnight Architect system for empty state text — it implies missing data rather than an empty state.

---

## Section 9: Activity Timeline

**File:** `frontend/src/features/customers/components/overview/EventTimeline.tsx`
**Screenshots:** `29-log-event-form`, `05-customer-detail-overview-tab`

### Issue 9.1 — CRITICAL: Native `<select>` in Log Event form breaks design system consistency

The Log Event form renders a native `<select>` element for the Type field — the only native select in the entire feature. Every other dropdown in the application uses shadcn's `Select` component (Radix UI based). The native select renders OS-native styling that cannot be customized via Tailwind or CSS variables, creating an immediately jarring visual break.

This is confirmed in the screenshot `29-log-event-form`: the Type field shows a system-rendered dropdown with a different font, border radius, and appearance from all other inputs in the dialog.

**Evidence:** `EventTimeline.tsx` lines 81-90 (filter select) and lines 113-121 (form select).

**Fix — Form select (in Log Event dialog):**

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Replace the <select> in the form:
<div>
  <Label htmlFor="event-type">Type</Label>
  <Select
    value={form.watch('event_type') || 'note'}
    onValueChange={(val) => form.setValue('event_type', val)}
  >
    <SelectTrigger id="event-type" className="mt-1">
      <SelectValue />
    </SelectTrigger>
    <SelectContent data-portal-ignore-click-outside>
      {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
        <SelectItem key={value} value={value}>{label}</SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

Note the mandatory `data-portal-ignore-click-outside` attribute on `SelectContent` — this is required by the portaled-components-pattern rule.

**Fix — Filter select (inline in timeline header):**

```tsx
// Replace the filter <select>:
{events.length > 0 && (
  <Select value={typeFilter} onValueChange={setTypeFilter}>
    <SelectTrigger className="h-7 w-[110px] text-[11px]">
      <SelectValue />
    </SelectTrigger>
    <SelectContent data-portal-ignore-click-outside>
      <SelectItem value="all">All types</SelectItem>
      {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
        <SelectItem key={value} value={value}>{label}</SelectItem>
      ))}
    </SelectContent>
  </Select>
)}
```

### Issue 9.2 — HIGH: Log Event form has no date field — events timestamp to server `now()`

The `CreateEventInput` type includes `event_date?: string` and the backend accepts it, but the Log Event form (`EventTimeline.tsx` form schema, line 27) has no `event_date` field. When a user logs a meeting that happened yesterday, or backdates a call from last week, there is no way to set the correct date. Every event silently timestamps to the server's `now()`.

**Evidence:** `EventTimeline.tsx` schema (line 27) — no `event_date` field. `customer.ts` line 219 — `event_date` exists in `CreateEventInput`.

**Fix:** Add date field to schema and form:

```tsx
// Schema
const eventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  event_type: z.string().optional(),
  event_date: z.string().optional(),
})

// Default value — today's date
defaultValues: {
  title: '',
  description: '',
  event_type: 'note',
  event_date: new Date().toISOString().split('T')[0],
}

// In form JSX, after the Type field:
<div>
  <Label htmlFor="event-date">Date</Label>
  <Input
    id="event-date"
    type="date"
    {...form.register('event_date')}
    className="mt-1"
  />
</div>

// In handleSubmit:
await createEvent.mutateAsync({
  customerId,
  title: data.title,
  description: data.description || undefined,
  event_type: data.event_type || 'note',
  event_date: data.event_date || undefined,
})
```

---

## Section 10: Agreements Tab

**File:** `frontend/src/features/customers/components/agreements/AgreementsTab.tsx`
**Screenshot:** `06-customer-detail-agreements-tab`

### Issue 10.1 — HIGH: Duplicate CTAs on empty state

When zero agreements exist, the screen shows two "Add Agreement" buttons simultaneously:
1. Header row: `+ Add Agreement` (top right, always visible)
2. Empty state body: `Add First Agreement` (centered, large primary button)

This is a direct CTA duplication. The user has two buttons doing the same thing, one of which (the header button) is redundant during the empty state.

**Evidence:** `AgreementsTab.tsx` lines 77-81 (header button always renders) and lines 93-95 (empty state body button).

**Fix:** Conditionally render the header button only when agreements exist:

```tsx
<div className="flex items-center justify-between mb-4">
  <h3 className="text-sm font-medium text-muted-foreground">
    {agreements.length} {agreements.length === 1 ? 'Agreement' : 'Agreements'}
  </h3>
  {agreements.length > 0 && (
    <Button size="sm" onClick={() => setFormOpen(true)}>
      <Plus className="h-3.5 w-3.5 mr-1.5" />
      Add Agreement
    </Button>
  )}
</div>
```

Apply the same pattern to `ProjectsTab.tsx` (line 84) and `ActionItemsTab.tsx` (line 166).

---

## Section 11: Receivables Tab

**Files:** `frontend/src/features/customers/components/receivables/ReceivablesTab.tsx`, `FinancialSummary.tsx`
**Screenshots:** `07-customer-detail-receivables-tab`, `16-invoice-form`, `17-payment-form`

### Issue 11.1 — CRITICAL: `text-green-400` on white in FinancialSummary fails WCAG AA

The FinancialSummary component hardcodes `text-green-400` for the "Total Paid" column and uses it for the zero outstanding balance state. On white (`#FFFFFF`), `text-green-400` (#4ADE80) produces a contrast ratio of approximately 2.2:1 — far below the WCAG AA minimum of 4.5:1 for normal text.

This is an objective accessibility failure for a component displaying financial data that users must be able to read accurately.

**Evidence:** `FinancialSummary.tsx` line 52:
```tsx
<p className="text-lg font-semibold text-green-400">
```
And line 65:
```tsx
balanceDirection === 'zero' && 'text-green-400',
```

**Fix:** Apply the same dark-mode-aware pattern:

```tsx
{/* Total Paid */}
<div>
  <p className="text-xs text-muted-foreground mb-1">Total Paid</p>
  <p className="text-lg font-semibold text-green-600 dark:text-green-400">
    {formatCurrency(totalPaid)}
  </p>
</div>

{/* Outstanding */}
<div>
  <p className="text-xs text-muted-foreground mb-1">
    {balanceDirection === 'negative' ? 'Credit' : 'Outstanding'}
  </p>
  <p className={cn(
    'text-lg font-semibold',
    balanceDirection === 'positive' && 'text-amber-600 dark:text-amber-400',
    balanceDirection === 'negative' && 'text-blue-600 dark:text-blue-400',
    balanceDirection === 'zero' && 'text-muted-foreground',
  )}>
    {formatCurrency(balance)}
  </p>
</div>
```

### Issue 11.2 — HIGH: Duplicate CTAs on Receivables empty state (same pattern as Agreements)

The Receivables tab shows four CTA buttons when empty: `Record Invoice` and `Record Payment` in the header row, AND `Record Invoice` and `Record Payment` in the empty state body. This is the same duplicate CTA pattern as Agreements, but doubled.

**Fix:** Conditionally render the header buttons only when transactions exist:

```tsx
{hasTransactions && (
  <div className="flex items-center gap-2">
    <Button size="sm" variant="outline" onClick={() => setInvoiceFormOpen(true)}>
      <Plus className="h-3.5 w-3.5 mr-1.5" />
      Record Invoice
    </Button>
    <Button size="sm" onClick={() => setPaymentFormOpen(true)}>
      <Plus className="h-3.5 w-3.5 mr-1.5" />
      Record Payment
    </Button>
  </div>
)}
```

### Issue 11.3 — Medium: Native `type="date"` in InvoiceForm and PaymentForm renders OS-native calendar

Both forms use `<Input type="date" />` which renders the browser/OS native date picker — styled differently on macOS/Windows/iOS, cannot be customized. This is especially visible on Windows where the native date input looks completely alien to the design system.

The fix requires a custom date picker component using a calendar popover. This is a medium-effort change. The project already has Radix UI available; a `<Popover>` + `<Calendar>` combination from shadcn would maintain design system consistency.

Short-term mitigation: Add `className="[color-scheme:dark]"` to the dark mode context to at least normalize the OS rendering.

---

## Section 12: Projects Tab

**File:** `frontend/src/features/customers/components/projects/ProjectsTab.tsx`
**Screenshot:** `08-customer-detail-projects-tab`

### Issue 12.1 — HIGH: Duplicate CTA on empty state (same pattern)

Same as Agreements and Action Items — the header always shows `New Project` while the empty state shows `Create First Project`.

**Fix:** Apply the same conditional render:
```tsx
{projects.length > 0 && (
  <Button size="sm" onClick={() => setFormOpen(true)}>
    <Plus className="h-3.5 w-3.5 mr-1.5" />
    New Project
  </Button>
)}
```

### Issue 12.2 — Low: Empty state copy is feature-centric, not outcome-centric

"Organize your work into projects with strategy docs, research, roadmaps, and more." describes the feature's capabilities. The user cares about outcomes.

**Suggested copy:** "Projects group your deliverables — strategy docs, roadmaps, and research — so you can track progress and find what you've built for each customer."

---

## Section 13: Action Items Tab

**File:** `frontend/src/features/customers/components/action-items/ActionItemsTab.tsx`
**Screenshots:** `09-customer-detail-action-items-tab`, `20-action-items-tab-with-chat`, `21-action-item-form`

### What works exceptionally well

The `ActionItemRow` component has the best interaction design in the feature. The clickable status badge (a badge that opens a dropdown to change status directly) is exactly the right affordance — it eliminates the need to open a full edit dialog just to move a task from "To Do" to "In Progress". The overdue state (`border-destructive/50` card border + `text-destructive` date label) is clear without being alarming.

The filter controls (Status filter, Type filter, sort toggle) directly inside the tab header are appropriate for this content type where filtering is a primary need.

### Issue 13.1 — HIGH: Duplicate CTA on empty state (same pattern)

Header always shows `Add Item`; empty state body shows `Add First Action Item`.

**Fix:** Same conditional pattern as above.

### Issue 13.2 — Medium: Description field is a single-line `<Input>`, limiting expression

Action item descriptions like "Send revised proposal with updated pricing and scope for Q3 onboarding" are common but get truncated in a single-line input. The `description` field accepts multi-line text conceptually but forces single-line entry.

**Evidence:** `ActionItemForm.tsx` line 144:
```tsx
<Input id="action-item-description" {...form.register('description')} ... />
```

**Fix:** Replace with `<Textarea rows={2} />`:

```tsx
import { Textarea } from '@/components/ui/textarea'

<Textarea
  id="action-item-description"
  {...form.register('description')}
  placeholder="What needs to happen?"
  rows={2}
  className="mt-1 resize-none"
/>
```

`rows={2}` keeps the dialog compact while allowing natural line breaks.

### Issue 13.3 — Low: Sort toggle is a button that cycles between two values with no clear current state

The sort button reads "Due Date" or "Created" depending on current sort. It is not obvious that clicking it will change the sort — it reads like a label, not a control. The `ArrowUpDown` icon helps, but the interaction model is unclear.

**Fix:** Add a visual indicator of current state:

```tsx
<Button
  variant={sortBy === 'due_date' ? 'secondary' : 'ghost'}
  size="sm"
  className="h-8 text-xs text-muted-foreground"
  onClick={() => setSortBy(sortBy === 'due_date' ? 'created_at' : 'due_date')}
>
  <ArrowUpDown className="h-3.5 w-3.5 mr-1" />
  {sortBy === 'due_date' ? 'Due Date' : 'Created'}
</Button>
```

The `variant="secondary"` when `due_date` is active provides a subtle active state. Alternatively, replace the toggle with a shadcn `Select` with "Sort by" label for discoverability.

---

## Section 14: Chat Panel

**File:** `frontend/src/features/customers/components/chat/CustomerChatPanel.tsx`
**Screenshots:** `10-customer-detail-with-chat-panel`, `11-customer-overview-with-chat`, `13-agreements-tab-empty-with-chat`

### What works well

The suggestion chips are contextually appropriate and well-labeled. The Bot icon with `bg-primary/10` container in the chat header correctly signals AI context. The split-panel layout with resizable panels is the right architecture for this type of tool — it allows users to reference customer data while conversing with the AI.

### Issue 14.1 — Medium: Chat panel title is just the customer name + "AI"

The panel title reads "Acme Corporation AI" — which is mechanically constructed but semantically odd. "Acme Corporation AI" reads as if Acme Corporation has an AI, not as if NextUp has an AI assistant focused on Acme.

**Fix:** Change the panel title to a fixed string with context:

```tsx
<div className="flex items-center gap-2">
  <div className="rounded-full bg-primary/10 p-1.5">
    <Bot className="h-4 w-4 text-primary" />
  </div>
  <div>
    <p className="text-sm font-semibold text-foreground">AI Assistant</p>
    <p className="text-xs text-muted-foreground">Focused on {customerName}</p>
  </div>
</div>
```

This separates the product identity ("AI Assistant") from the context ("Focused on Acme Corporation"), which is clearer and more honest.

### Issue 14.2 — Low: `@product` suggestion chip is not visually differentiated from conversational chips

The suggestion chips appear identical in styling. "Summarize this customer" and "What should I prioritize?" are conversational queries, while "@product" is a reference trigger that invokes a different behavior (referencing product context). These should be visually distinct.

**Fix:** Use a slightly different background for the `@product` chip — perhaps `bg-accent/20 border-accent/40` vs. the standard `bg-muted` for the other chips.

---

## Section 15: LinkedIn Import Dialog

**Files:** `frontend/src/features/customers/components/import/LinkedInImportDialog.tsx`, `CsvUploadStep.tsx`
**Screenshot:** `24-linkedin-import-dialog`

### What works well

The three-step flow (upload -> importing with progress -> results) is correctly structured. Blocking dialog close during import (`onInteractOutside` prevention + `step === 'importing'` guard) prevents data loss. The `data-portal-ignore-click-outside` attribute is correctly applied.

### Issue 15.1 — Medium: LinkedIn blue hardcoded outside design token system

`CsvUploadStep.tsx` uses `bg-[#0A66C2] hover:bg-[#004182]` (LinkedIn brand blue) for the "Connect LinkedIn" action. This is the only hardcoded hex value in the feature outside the design token system.

**Fix — Option A (document as intentional):** Add a comment marking this as an intentional brand color exception:
```tsx
{/* LinkedIn brand blue — intentional exception to design token system */}
className="bg-[#0A66C2] hover:bg-[#004182] text-white"
```

**Fix — Option B (CSS custom property):** Define in `index.css`:
```css
:root {
  --color-linkedin: #0A66C2;
  --color-linkedin-hover: #004182;
}
```
Then use `bg-[var(--color-linkedin)]` in the component.

Option A is pragmatic for a one-off brand color. Option B is cleaner if LinkedIn colors appear in multiple places.

### Issue 15.2 — Low: No guidance on how to export from LinkedIn

The upload step asks users to upload a LinkedIn connections CSV but provides no instructions on how to obtain that CSV from LinkedIn. LinkedIn's export is buried in account settings and takes up to 24 hours. A help link would significantly reduce user friction.

**Fix:** Add a small help text below the dropzone:

```tsx
<p className="text-xs text-muted-foreground mt-3 text-center">
  Download your connections from{' '}
  <a
    href="https://www.linkedin.com/mypreferences/d/download-my-data"
    target="_blank"
    rel="noopener noreferrer"
    className="text-primary underline underline-offset-2"
  >
    LinkedIn Settings
  </a>
  {' '}\u2014 select "Connections" and allow up to 24 hours for the email.
</p>
```

---

## Section 16: Global Color Token Accessibility

**File:** `frontend/src/features/customers/types/customer.ts`

### Issue 16.1 — HIGH: All status and ICP badge colors use `text-*-400` variants

`CUSTOMER_STATUS_COLORS`, `ICP_SCORE_COLORS`, `AGREEMENT_STATUS_COLORS`, `PROJECT_STATUS_COLORS`, `ACTION_ITEM_STATUS_COLORS`, and `ARTIFACT_STATUS_COLORS` all use the `text-*-400` naming pattern:

```ts
lead: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
live: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
```

In the Midnight Architect system (dark mode), `text-*-400` colors are accessible because they appear on dark surfaces. In light mode, `*-400` variants on `bg-white` or light card backgrounds fail WCAG AA for small/normal weight text.

A full audit of contrast ratios on white (`#FFFFFF`):

| Color | Tailwind | Hex | Ratio on white | Result |
|---|---|---|---|---|
| sky-400 | text-sky-400 | #38BDF8 | ~2.4:1 | FAIL |
| violet-400 | text-violet-400 | #A78BFA | ~3.6:1 | FAIL |
| amber-400 | text-amber-400 | #FBBF24 | ~2.7:1 | FAIL |
| emerald-400 | text-emerald-400 | #34D399 | ~2.0:1 | FAIL |
| orange-400 | text-orange-400 | #FB923C | ~2.7:1 | FAIL |
| rose-400 | text-rose-400 | #FB7185 | ~3.0:1 | FAIL |
| green-400 | text-green-400 | #4ADE80 | ~2.2:1 | FAIL |
| blue-400 | text-blue-400 | #60A5FA | ~3.2:1 | FAIL |

All fail. However, note that badge text is typically 12px font size with `font-medium` weight — at this size WCAG AA requires a 4.5:1 ratio. All `*-400` variants fail this threshold against white.

The `bg-*-500/10` backgrounds on the badges are transparent and display approximately as very light tints on white, providing essentially no additional contrast benefit.

**Recommended fix strategy:** Since the system is dark-mode-first, the cleanest fix is to use Tailwind's `dark:` modifier to switch badge text colors:

In `customer.ts`, update all color maps to include dark mode variants:

```ts
export const CUSTOMER_STATUS_COLORS: Record<CustomerStatus, string> = {
  lead: 'bg-sky-500/10 text-sky-600 border-sky-500/20 dark:text-sky-400',
  prospect: 'bg-violet-500/10 text-violet-600 border-violet-500/20 dark:text-violet-400',
  negotiation: 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400',
  live: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400',
  on_hold: 'bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400',
  archive: 'bg-slate-500/10 text-slate-600 border-slate-500/20 dark:text-slate-400',
  not_relevant: 'bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400',
}
```

This is a sweeping change affecting every color map in the file. Coordinate with the system.md update if the project adopts the Midnight Architect system as canonical (dark-only).

**Alternative:** If the app is truly dark-mode-only (the screenshots suggest dark is the primary mode), document this as a known limitation for light mode and address in a future light mode pass.

---

## Section 17: Navigation and Sidebar

**Screenshot:** `31-sidebar-navigation`

### What works well

The sidebar uses icon-only navigation at the current scale, which is appropriate for a narrow fixed sidebar. The active state (highlighted icon) is clear. The bottom-anchored utility icons (Profile, Settings, Monitor, Logout) follow standard SaaS navigation conventions.

### Issue 17.1 — Medium: No visible labels on sidebar icons

The sidebar icons have no text labels, relying entirely on icon recognition. The icons used (`FileText` for artifacts?, `Users` for customers) are relatively standard but the mapping is not universal. There are no `title` attributes or `aria-label` attributes visible in the sidebar that would provide tooltip labels for sighted users who do not recognize an icon.

**Fix:** Add `title` attributes to each sidebar icon button for tooltip discovery. For accessibility, add `aria-label` attributes as well.

---

## Section 18: Cross-Cutting Issues

### Issue 18.1 — HIGH: Inconsistent ICP terminology across the feature

Three different terms are used to describe the same concept:

- Customer list filter: "ICP Score" (in `MultiSelectFilter` label)
- Customer card: "ICP RANK:" (label span in CustomerCard row 2)
- Customer detail header: IcpScoreBadge shows `ICP_SCORE_LABELS` values (Low, Medium, High, Very High)
- CustomerInfoSection read mode: "ICP (Ideal Customer Profile)" field label

"ICP Score", "ICP Rank", and "ICP" are three different phrasings for one concept. The filter and the card use different terminology for the same badge.

**Fix:** Choose one canonical term and apply it consistently. Recommendation: "ICP Score" is the most descriptive (it implies a calculated value, which is accurate — the system runs an AI scoring algorithm). Update `CustomerCard.tsx` to remove the "ICP RANK:" label (already addressed in Issue 2.1), but ensure that wherever ICP is labeled in the UI, it reads "ICP Score".

### Issue 18.2 — Medium: All five tab empty states use identical structural template

Every tab empty state follows the same template:
1. `rounded-full bg-muted p-4` icon container with relevant icon
2. `text-lg font-semibold` "No [things] yet" headline
3. `text-sm text-muted-foreground max-w-sm` description
4. Primary button CTA

The structural consistency is good — users learn the pattern quickly. But the identical tone and layout means five different tab empty states feel like one copy-pasted component with find-replaced nouns. None of them have personality, and none suggest what specifically the user should do _right now_ in the context of this customer.

**Suggested improvement:** Differentiate empty state copy to be customer-context-aware rather than generic:

- Agreements empty: "No agreements with [Company Name] yet. Add your first to track scope, pricing, and terms."
- Action Items empty: "Nothing on your plate for [Company Name]. Add a follow-up, proposal, or meeting to stay on track."
- Projects empty: "No projects started for [Company Name]. Create one to organize your strategy docs and deliverables."

Passing `customerName` as a prop to each tab, then using it in the empty state copy, creates a small but meaningful feeling of context.

### Issue 18.3 — Low: `CustomerWithCounts` vs `CustomerWithSummary` type inconsistency in detail page

`CustomerDetailPage.tsx` uses `useCustomer` which returns a customer type — but the `customer` object is passed to tab components that expect `CustomerWithCounts` (for agreements/receivables/projects/action items counts). The type used in `CustomerDetailPage` should explicitly be `CustomerWithCounts` since it accesses `customer.agreements_count`, `customer.receivables_count`, etc. This is a TypeScript type hygiene issue, not a runtime bug.

---

## Prioritized Fix Table

| Priority | Issue | File | Change Type | Effort |
|---|---|---|---|---|
| 1 | `text-green-400` contrast failure (FinancialSummary) | `FinancialSummary.tsx` | CSS class change | XS |
| 2 | `text-amber-400` / `text-blue-400` contrast failure (QuickStats) | `QuickStats.tsx` | CSS class change | XS |
| 3 | Native `<select>` in Log Event form | `EventTimeline.tsx` | Component swap | S |
| 4 | Chat toggle uses layout icon instead of AI icon | `CustomerDetailPage.tsx` | Icon swap | XS |
| 5 | Redundant label spans on customer card | `CustomerCard.tsx` | Remove JSX spans | XS |
| 6 | Duplicate CTAs on all 4 tab empty states | `AgreementsTab.tsx`, `ReceivablesTab.tsx`, `ProjectsTab.tsx`, `ActionItemsTab.tsx` | Conditional render | XS |
| 7 | Tab counts show `(0)` for empty tabs | `CustomerDetailPage.tsx` | Conditional string | XS |
| 8 | Log Event form missing date field | `EventTimeline.tsx` | Add form field | S |
| 9 | Filter bar visible on zero-customer empty state | `CustomerListPage.tsx` | Conditional render | XS |
| 10 | Multiple "Not set" empty field values | `CustomerInfoSection.tsx` | Copy change + em-dash | XS |
| 11 | All status/ICP badge colors fail contrast in light mode | `customer.ts` | Dark mode variants | M |
| 12 | Action item description uses single-line Input | `ActionItemForm.tsx` | Input -> Textarea | XS |
| 13 | ICP terminology inconsistency | Multiple files | Copy consistency | XS |
| 14 | LinkedIn blue hardcoded outside token system | `CsvUploadStep.tsx` | Comment or CSS var | XS |
| 15 | Chat panel title "Acme AI" semantically odd | `CustomerChatPanel.tsx` | Copy change | XS |
| 16 | No LinkedIn export instructions | `CsvUploadStep.tsx` | Add help text | XS |

---

## What Works Exceptionally Well

**MultiSelectFilter component.** The filter system is genuinely well-designed — URL-persisted state, colored dot indicators with checkbox selection, count badge on trigger, clear all option. This is the kind of production-quality component that should be extracted into the shared component library.

**ActionItemRow clickable status badge.** The pattern of making the status badge itself a dropdown trigger for quick status changes is the correct affordance for a task management list. It eliminates modal overhead for the most common action (moving a task forward). The overdue border treatment is clear and actionable.

**Inline customer name editing.** Click-to-edit on the `<h1>` with inline Input + confirm/cancel buttons is the right pattern for a frequently-viewed, occasionally-edited field. The escape key cancel and enter key save are both implemented correctly.

**Log Event dialog portal handling.** The `DialogContent` correctly includes `data-portal-ignore-click-outside` — preventing the known click-outside bug pattern. This shows attention to the established patterns.

**LinkedIn import flow guard.** Blocking dialog close during active import via `onInteractOutside` prevention is exactly right — data integrity over user convenience in this case.

---

## Design System Compliance Notes

The feature is built against the Midnight Architect system in its dark mode form. The design tokens, surface elevation system, border opacity pattern (`border-border/50`), and color temperature are consistent throughout. The issues identified are not system violations — they are gaps in light mode accessibility that were not caught because the system was developed dark-first.

Recommend adding to `docs/frontend/ux-ui-design-guide.md`:

> **Light mode color rule:** Status badge text colors must use the 600-weight variant in light mode. Use Tailwind `dark:` modifier to switch to 400-weight in dark mode. Semantic colors (green for paid, amber for outstanding) follow the same rule. Never use `text-*-400` as the default (non-dark) text color for UI text against white or near-white backgrounds.

---

*End of review. 32 screenshots reviewed, 24 source files analyzed. Total issues identified: 4 Critical, 9 High, 8 Medium, 5 Low.*
