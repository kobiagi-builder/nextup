# LinkedIn Connections Import - UX/UI Design

**Design System**: Existing NextUp aesthetic - dark theme, shadcn/ui, Tailwind
**Color Language**: Status pills use `bg-{color}-500/10 text-{color}-400` pattern
**Component Library**: shadcn/ui Dialog, DropdownMenu, Button, Input, Label

---

## 1. Import Trigger (Customers Page Header)

Add "Import LinkedIn" button alongside existing "New Customer" button.
Uses Upload icon + LinkedIn-blue accent to distinguish from standard actions.

```
+----------------------------------------------------------------------+
| Customers                                    [Import LinkedIn] [+ New Customer] |
+----------------------------------------------------------------------+
| [All] [Lead] [Prospect] [Negotiation] [Live] [On Hold] [Archive]    |
|                                                                      |
| [ICP: All] [Low] [Medium] [High] [Very High] [Not Scored]          |
|                                                                      |
| [🔍 Search customers...]                          [Sort: Last Updated ▾] |
+----------------------------------------------------------------------+
```

**Component**: `ImportLinkedInButton`
- Position: Header right, before "New Customer" button
- Style: `variant="outline"` with Upload icon
- Visibility: Only when `linkedin_import` feature flag is active
- Classes: `gap-2 border-[#0A66C2]/30 text-[#0A66C2] hover:bg-[#0A66C2]/10`
  (LinkedIn brand blue accent, subtle)

**ICP Filter Row**: New filter row below status pills
- Same pill style as status filters
- Separate row to avoid crowding
- Color-coded pills matching ICP score colors

```tsx
// Import button
<Button variant="outline" onClick={openImportDialog} className="gap-2 border-[#0A66C2]/30 text-[#0A66C2] hover:bg-[#0A66C2]/10">
  <Upload className="h-4 w-4" />
  Import LinkedIn
</Button>

// ICP filter pills (new row below status pills)
<div className="flex items-center gap-2 flex-wrap">
  <span className="text-xs text-muted-foreground mr-1">ICP:</span>
  {ICP_FILTER_OPTIONS.map(opt => (
    <button className={cn('px-3 py-1 rounded-full text-xs font-medium', ...)}>
      {opt.label}
    </button>
  ))}
</div>
```

---

## 2. CSV Upload Dialog

Multi-step dialog: Upload → Processing → Results.
Uses existing Dialog pattern with `data-portal-ignore-click-outside`.

### Step 1: File Upload

```
+--------------------------------------------------+
|  Import LinkedIn Connections                   X  |
|--------------------------------------------------|
|                                                   |
|  Upload your LinkedIn connections export (CSV).   |
|                                                   |
|  +--------------------------------------------+  |
|  |                                            |  |
|  |          ↑ (Upload icon)                   |  |
|  |                                            |  |
|  |    Drag & drop your CSV here               |  |
|  |    or click to browse                      |  |
|  |                                            |  |
|  |    .csv · max 5MB                          |  |
|  +--------------------------------------------+  |
|                                                   |
|  Expected columns:                                |
|  First Name, Last Name, URL, Email Address,       |
|  Company, Position                                |
|                                                   |
|  💡 Export from LinkedIn: My Network >            |
|     Connections > Export contacts                  |
|                                                   |
|                       [Cancel]  [Import] (disabled)|
+--------------------------------------------------+
```

### Step 1b: File Selected

```
+--------------------------------------------------+
|  Import LinkedIn Connections                   X  |
|--------------------------------------------------|
|                                                   |
|  Upload your LinkedIn connections export (CSV).   |
|                                                   |
|  +--------------------------------------------+  |
|  |                                            |  |
|  |          📄 (FileText icon, emerald)       |  |
|  |                                            |  |
|  |    Connections.csv                          |  |
|  |    245 KB · ~500 connections               |  |
|  |                                            |  |
|  |    Choose different file                   |  |
|  +--------------------------------------------+  |
|                                                   |
|                       [Cancel]  [Import ➜]        |
+--------------------------------------------------+
```

**Component**: `LinkedInImportDialog`
- Dialog: `sm:max-w-lg` (slightly wider than NewCustomerDialog)
- Drop zone: Reuse `FileDropZone` pattern with CSV-specific accept
- Row count preview: Parse CSV client-side for preview count
- "Expected columns" hint: `text-xs text-muted-foreground`
- LinkedIn export tip: Subtle info block with `bg-muted/30 rounded-lg p-3`
- Import button: Primary, enabled only when file is selected

```tsx
<Dialog>
  <DialogContent data-portal-ignore-click-outside className="sm:max-w-lg">
    <DialogHeader>
      <DialogTitle>Import LinkedIn Connections</DialogTitle>
    </DialogHeader>
    {/* Step content based on state */}
  </DialogContent>
</Dialog>
```

---

## 3. Import Progress (Step 2 - same dialog)

Replaces upload content with progress indicator.
Dialog is not closable during processing.

```
+--------------------------------------------------+
|  Importing Connections...                         |
|--------------------------------------------------|
|                                                   |
|  ████████████░░░░░░░░░░░░░░░░░░  156 / 487       |
|                                                   |
|  Processing: Acme Corporation                     |
|  ✓ Created customer · ✓ Added team member         |
|                                                   |
|  +--------------------------------------------+  |
|  | Created    ███████  23                      |  |
|  | Updated    █████    18                      |  |
|  | Skipped    ██        5                      |  |
|  | Errors     ░         0                      |  |
|  +--------------------------------------------+  |
|                                                   |
+--------------------------------------------------+
```

**Design Details**:
- Progress bar: `bg-primary` fill on `bg-muted` track, rounded
- Current item: Shows company name being processed (truncated)
- Live counters: Update in real-time as each row processes
- Mini bar chart: Horizontal bars with proportional widths
- Colors: Created = emerald, Updated = sky, Skipped = amber, Errors = red
- No close/cancel during processing (X button hidden or disabled)

```tsx
// Progress bar
<div className="w-full bg-muted rounded-full h-2">
  <div className="bg-primary h-2 rounded-full transition-all duration-300"
       style={{ width: `${(processed / total) * 100}%` }} />
</div>
<p className="text-sm text-muted-foreground text-center mt-1">
  {processed} / {total}
</p>

// Current item
<p className="text-xs text-muted-foreground truncate">
  Processing: <span className="text-foreground">{currentCompany}</span>
</p>
```

---

## 4. Import Results Summary (Step 3 - same dialog)

Final step after processing completes. Shows comprehensive results.

```
+--------------------------------------------------+
|  Import Complete                               X  |
|--------------------------------------------------|
|                                                   |
|  ✓ 487 connections processed                      |
|                                                   |
|  +-- Companies -----------------------------------+
|  |  🏢  42 created                                |
|  |  🔗  38 matched existing                       |
|  +------------------------------------------------+
|                                                   |
|  +-- Team Members --------------------------------+
|  |  👤  156 created                               |
|  |  ↻   82 updated                               |
|  +------------------------------------------------+
|                                                   |
|  +-- Skipped (12) ------  [Expand ▾] ------------+
|  |  Row 23: "Stealth" → Enclosed company          |
|  |  Row 45: "Israel" → Non-company name           |
|  |  Row 67: "Gilad Somjen" → Personal name        |
|  |  ... 9 more                                    |
|  +------------------------------------------------+
|                                                   |
|  +-- Errors (2) --------  [Expand ▾] ------------+
|  |  Row 112: Missing company field                |
|  |  Row 334: Invalid CSV format                   |
|  +------------------------------------------------+
|                                                   |
|                                          [Done ✓] |
+--------------------------------------------------+
```

**Design Details**:
- Success header: Checkmark icon in emerald circle + total count
- Section cards: `bg-muted/30 rounded-lg p-3` with icon + count
- Companies section: Building icon (Building2 from Lucide)
- Team Members section: Users icon
- Skipped: Collapsible section, amber accent, shows row + reason
- Errors: Collapsible section, red accent, shows row + error
- Each skipped/error row: `text-xs`, row number in `text-muted-foreground`
- "Done" button: Primary, closes dialog

**Collapsible sections**: Use shadcn Collapsible or simple useState toggle
```tsx
// Result section
<div className="rounded-lg bg-muted/30 p-3 space-y-1.5">
  <div className="flex items-center gap-2">
    <Building2 className="h-4 w-4 text-muted-foreground" />
    <span className="text-sm font-medium">Companies</span>
  </div>
  <div className="pl-6 space-y-1 text-sm">
    <div className="flex items-center gap-2">
      <span className="text-emerald-400">42 created</span>
    </div>
    <div className="flex items-center gap-2">
      <span className="text-sky-400">38 matched existing</span>
    </div>
  </div>
</div>

// Collapsible skipped section
<Collapsible>
  <CollapsibleTrigger className="flex items-center gap-2 text-sm">
    <AlertTriangle className="h-4 w-4 text-amber-400" />
    <span>Skipped ({count})</span>
    <ChevronDown className="h-3 w-3" />
  </CollapsibleTrigger>
  <CollapsibleContent>
    {skippedRows.map(row => (
      <div className="text-xs text-muted-foreground pl-6 py-0.5">
        <span className="text-muted-foreground/60">Row {row.number}:</span> {row.reason}
      </div>
    ))}
  </CollapsibleContent>
</Collapsible>
```

---

## 5. ICP Score Badge (Customer Card + Detail Page)

### On Customer Card (List Page)

Small pill badge next to the vertical badge. Only shows if ICP score exists.

```
+--------------------------------------------------+
| Acme Corp          [Very High] [Lead ▾]  [⋮]    |
| SaaS                                              |
| Enterprise software for DevOps teams...           |
| 📄 2  💲 $4,500  📁 1         🕐 2d ago          |
+--------------------------------------------------+
```

**ICP Badge Colors** (matching existing pill pattern):
```typescript
export const ICP_SCORE_COLORS: Record<IcpScore, string> = {
  low:       'bg-rose-500/10 text-rose-400 border-rose-500/20',
  medium:    'bg-amber-500/10 text-amber-400 border-amber-500/20',
  high:      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  very_high: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
}

export const ICP_SCORE_LABELS: Record<IcpScore, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  very_high: 'Very High',
}
```

**Component**: `IcpScoreBadge`
```tsx
function IcpScoreBadge({ score }: { score: IcpScore | null }) {
  if (!score) return null
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
      ICP_SCORE_COLORS[score]
    )}>
      {ICP_SCORE_LABELS[score]}
    </span>
  )
}
```

### On Customer Detail Page (Header Area)

Displayed next to status in the header row.

```
+----------------------------------------------------------------------+
| ← Customers                                                          |
|                                                                      |
| Acme Corporation ✎                                                   |
| [Lead ▾]  [ICP: Very High]                                          |
|                                                                      |
| [Overview] [Agreements] [Receivables] [Projects] [Action Items]     |
+----------------------------------------------------------------------+
```

---

## 6. ICP Filter (Customers Page - New Row)

Separate filter row below status pills. Labeled "ICP:" for clarity.

```
+----------------------------------------------------------------------+
| [All] [Lead] [Prospect] [Negotiation] [Live] [On Hold] [Archive]    |
| [Not Relevant]                                                        |
|                                                                      |
| ICP: [All] [Low] [Medium] [High] [Very High] [Not Scored]           |
|                                                                      |
| [🔍 Search customers...]                          [Sort: Last Updated ▾] |
+----------------------------------------------------------------------+
```

**Design Details**:
- "ICP:" label: `text-xs text-muted-foreground font-medium mr-1`
- Filter pills: Same style as status pills (`rounded-full text-xs`)
- Active state: `bg-primary text-primary-foreground`
- Inactive state: `bg-muted text-muted-foreground hover:bg-muted/80`
- Color hint on pills (optional): Tiny dot matching ICP color
- URL param: `?icp=high` (consistent with `?status=lead`)

```tsx
<div className="flex items-center gap-2 flex-wrap">
  <span className="text-xs text-muted-foreground font-medium">ICP:</span>
  {ICP_FILTER_OPTIONS.map(opt => (
    <button
      key={opt.value}
      onClick={() => setIcpFilter(icpFilter === opt.value ? null : opt.value)}
      className={cn(
        'px-3 py-1 rounded-full text-xs font-medium transition-colors',
        icpFilter === opt.value
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground hover:bg-muted/80'
      )}
    >
      {opt.label}
    </button>
  ))}
</div>
```

---

## 7. "Not Relevant" Status

New status value added to the existing set.
Color: Muted rose/red to convey "dismissed/not a fit" without being alarming.

```typescript
// Addition to CUSTOMER_STATUSES
export type CustomerStatus = 'lead' | 'prospect' | 'negotiation' | 'live' | 'on_hold' | 'archive' | 'not_relevant'

// New entries
not_relevant: 'Not Relevant'                                          // label
not_relevant: 'bg-rose-500/10 text-rose-400 border-rose-500/20'     // color
not_relevant: 'bg-rose-400'                                           // dot color
```

**Positioning in filter pills**: After "Archive" (last before it, or grouped separately)
```
[All] [Lead] [Prospect] [Negotiation] [Live] [On Hold] [Archive] [Not Relevant]
```

---

## 8. Team Member LinkedIn URL

In TeamSection, add a LinkedIn icon link next to member info.
Uses ExternalLink icon since Lucide lacks a LinkedIn icon.

### Team Member Row with LinkedIn

```
+----------------------------------------------------------------------+
| Team Members                                        [+ Add]          |
|----------------------------------------------------------------------|
| Jane Smith                                    [✎] [🗑]              |
| VP Engineering · jane@acme.com                                       |
| 🔗 LinkedIn                                                         |
|----------------------------------------------------------------------|
| Bob Jones                                     [✎] [🗑]              |
| CTO · bob@acme.com                                                   |
| 🔗 LinkedIn                                                         |
+----------------------------------------------------------------------+
```

**Design Details**:
- LinkedIn link: Below email, `text-xs text-[#0A66C2] hover:underline`
- Icon: ExternalLink (h-3 w-3) or custom LinkedIn SVG icon
- Opens in new tab: `target="_blank" rel="noopener noreferrer"`
- Only shown if `linkedin_url` is present

```tsx
// In TeamMemberRow
{member.linkedin_url && (
  <a
    href={member.linkedin_url}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-1 text-xs text-[#0A66C2] hover:underline mt-0.5"
    onClick={(e) => e.stopPropagation()}
  >
    <ExternalLink className="h-3 w-3" />
    LinkedIn
  </a>
)}
```

### Team Member Form with LinkedIn URL

Add LinkedIn URL field to the edit/add form:

```
+----------------------------------------------------------------------+
| [Name *]              [Role]                  [Email]                |
| [LinkedIn URL]                                                       |
| [Notes]                                                              |
|                                              [✗ Cancel] [✓ Save]    |
+----------------------------------------------------------------------+
```

---

## 9. ICP Settings (Phase 2 - Settings Area)

Accessible from user settings or a dedicated section. Clean form layout.

```
+----------------------------------------------------------------------+
| ICP Settings                                                          |
|                                                                      |
| Define your Ideal Customer Profile to automatically score imported    |
| connections.                                                          |
|----------------------------------------------------------------------|
|                                                                      |
| Target Company Size                                                   |
| [Min employees: 50]  to  [Max employees: 500]                       |
|                                                                      |
| Target Industries                                                     |
| [SaaS ✕] [FinTech ✕] [Healthcare ✕] [+ Add]                        |
|                                                                      |
| Target Specialties                                                    |
| [AI ✕] [DevOps ✕] [Enterprise ✕] [+ Add]                           |
|                                                                      |
| ICP Description                                                       |
| +------------------------------------------------------------------+ |
| | Series A-C B2B SaaS companies in the US and Europe with          | |
| | 50-500 employees. Focus on developer tools, DevOps, and AI/ML.  | |
| | Decision makers are VP Eng, CTO, or Head of Product.            | |
| +------------------------------------------------------------------+ |
| This description is used for AI-powered qualitative scoring.         |
|                                                                      |
| Score Weights                                                         |
| Quantitative (company size, industry, specialties): [60%]            |
| Qualitative (AI comparison with description):       [40%]            |
|                                                                      |
|                                                       [Save Settings]|
+----------------------------------------------------------------------+
```

**Design Details**:
- Location: Accessible from user settings or as a section in a settings page
- Employee range: Two number inputs side by side with "to" separator
- Industries: Tag-style multi-select with removable chips and "+ Add" to type custom
- Specialties: Same tag-style as industries
- ICP Description: Textarea (existing field, preserved from `customer.info.icp`)
- Score weights: Two readonly or adjustable percentage inputs (sum to 100)
- Helper text: `text-xs text-muted-foreground` below each section

```tsx
// Industry tags
<div className="flex flex-wrap gap-1.5">
  {industries.map(ind => (
    <span key={ind} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs">
      {ind}
      <button onClick={() => removeIndustry(ind)} className="text-muted-foreground hover:text-foreground">
        <X className="h-3 w-3" />
      </button>
    </span>
  ))}
  <button onClick={openAddIndustry} className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground">
    <Plus className="h-3 w-3" />
    Add
  </button>
</div>
```

---

## Color Reference Summary

| Element | Color Pattern |
|---------|--------------|
| ICP Low | `bg-rose-500/10 text-rose-400` |
| ICP Medium | `bg-amber-500/10 text-amber-400` |
| ICP High | `bg-emerald-500/10 text-emerald-400` |
| ICP Very High | `bg-blue-500/10 text-blue-400` |
| Not Relevant status | `bg-rose-500/10 text-rose-400` |
| LinkedIn accent | `text-[#0A66C2]` / `border-[#0A66C2]/30` |
| Import button | `border-[#0A66C2]/30 text-[#0A66C2] hover:bg-[#0A66C2]/10` |
| Created count | `text-emerald-400` |
| Updated count | `text-sky-400` |
| Skipped count | `text-amber-400` |
| Error count | `text-rose-400` |

---

## Component Hierarchy

```
CustomerListPage
├── Header
│   ├── Title
│   ├── ImportLinkedInButton (feature-flagged)
│   └── NewCustomerButton
├── Filters
│   ├── StatusFilterPills (existing + "Not Relevant")
│   ├── IcpFilterPills (new row)
│   └── SearchAndSort (existing)
├── CustomerCard (modified)
│   ├── Header: name + IcpScoreBadge + StatusPill + menu
│   ├── About preview
│   └── Metrics row
└── LinkedInImportDialog
    ├── Step 1: CsvUploadStep (FileDropZone variant)
    ├── Step 2: ImportProgressStep
    └── Step 3: ImportResultsStep

CustomerDetailPage (modified)
├── Header: name + StatusPill + IcpScoreBadge
└── OverviewTab
    └── TeamSection (modified)
        └── TeamMemberRow (modified: + LinkedIn link)

IcpSettingsPage (Phase 2)
├── EmployeeRangeInput
├── IndustryTagSelect
├── SpecialtyTagSelect
├── IcpDescriptionTextarea
└── ScoreWeightsDisplay
```

---

## Interaction Flow

```
1. User clicks "Import LinkedIn" button
   └─> LinkedInImportDialog opens (Step 1: Upload)

2. User drags or browses CSV file
   └─> File validated client-side (format, size)
   └─> Row count preview shown
   └─> "Import" button becomes enabled

3. User clicks "Import"
   └─> Step 2: Progress view
   └─> POST /api/customers/import (multipart form)
   └─> SSE or polling for progress updates
   └─> Live counters update

4. Processing completes
   └─> Step 3: Results summary
   └─> Collapsible sections for skipped/errors
   └─> User reviews results

5. User clicks "Done"
   └─> Dialog closes
   └─> Customer list auto-refreshes (query invalidation)
   └─> New/updated customers visible in grid
```
