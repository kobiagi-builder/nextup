# Customers Management Platform - UX/UI Specification

**Created**: 2026-02-25
**Design System**: NextUp (shadcn/ui + Tailwind CSS + Plus Jakarta Sans)
**Theme**: Dark-first, consistent with existing NextUp design language

---

## Design Direction

**Tone**: Professional, data-rich, advisor-focused. The Customers module is the operational cockpit - it should feel like a refined command center where every card and tab delivers instant situational awareness.

**Differentiation from Portfolio**: While Portfolio is content-creation-focused (creative, editorial flow), Customers is relationship-and-data-focused (structured information, financial awareness, project tracking). The visual language stays consistent but shifts toward more structured data presentation with metric-forward card designs.

**Key Principle**: Information density without clutter. Every pixel earns its place by showing actionable data.

---

## Customer Status Color System

Extending the existing `{color}-500/10 text-{color}-400 border-{color}-500/20` badge pattern:

| Status | Color | Background | Text | Border |
|--------|-------|-----------|------|--------|
| Lead | Blue | `bg-blue-500/10` | `text-blue-400` | `border-blue-500/20` |
| Prospect | Indigo | `bg-indigo-500/10` | `text-indigo-400` | `border-indigo-500/20` |
| Negotiation | Amber | `bg-amber-500/10` | `text-amber-400` | `border-amber-500/20` |
| Live | Green | `bg-green-500/10` | `text-green-400` | `border-green-500/20` |
| On Hold | Orange | `bg-orange-500/10` | `text-orange-400` | `border-orange-500/20` |
| Archive | Gray | `bg-gray-500/10` | `text-gray-400` | `border-gray-500/20` |

Agreement status colors:
| Status | Color |
|--------|-------|
| Active | Green (`green-500/10`, `green-400`) |
| Upcoming | Blue (`blue-500/10`, `blue-400`) |
| Expired | Gray (`gray-500/10`, `gray-400`) |
| Open-ended | Amber (`amber-500/10`, `amber-400`) |

Artifact type colors:
| Type | Color |
|------|-------|
| Strategy | Purple (`purple-500/10`, `purple-400`) |
| Research | Blue (`blue-500/10`, `blue-400`) |
| Roadmap | Cyan (`cyan-500/10`, `cyan-400`) |
| Competitive Analysis | Red (`red-500/10`, `red-400`) |
| User Research | Indigo (`indigo-500/10`, `indigo-400`) |
| Product Spec | Green (`green-500/10`, `green-400`) |
| Meeting Notes | Gray (`gray-500/10`, `gray-400`) |
| Presentation | Amber (`amber-500/10`, `amber-400`) |
| Ideation | Pink (`pink-500/10`, `pink-400`) |
| Custom | Slate (`slate-500/10`, `slate-400`) |

---

## 1. Sidebar Navigation Update

Add "Customers" to `mainNavItems` between Portfolio and the footer items.

```
┌──────────────────────┐
│  [NU]  NextUp        │  ← Logo area (collapsed: icon only)
├──────────────────────┤
│  📄  Portfolio       │  ← Existing
│  👥  Customers       │  ← NEW (Users icon from Lucide)
├──────────────────────┤
│                      │
│                      │
├──────────────────────┤
│  👤  Profile         │  ← Footer nav
│  ⚙️  Settings        │
│  🌙  Theme toggle    │
│  🚪  Sign out        │
└──────────────────────┘
```

**Icon**: `Users` from Lucide React (two-person icon, distinguishes from single-person Profile)
**Active state**: Same `bg-surface-selected border-l-[3px] border-brand-300` pattern
**Mobile**: Added to MobileNavDrawer. **BottomNav item priority** (max 4 items): Portfolio, Customers, Profile, Settings. Theme toggle and Sign Out remain in drawer only on mobile.

---

## 2. Customer List Page (`/customers`)

### Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  Customers                                          [+ New Customer] │
├─────────────────────────────────────────────────────────────────┤
│  [All] [Lead] [Prospect] [Negotiation] [Live] [On Hold] [Archive]  │
│                                                                      │
│  🔍 Search customers...              Sort: [Last Activity ▾]        │
├─────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Acme Corp                                    [Live ●]        │   │
│  │ SaaS · Enterprise                                            │   │
│  │                                                               │   │
│  │ 📋 2 Agreements    💰 $4,200 outstanding    📂 3 Projects   │   │
│  │ Last activity: 2 days ago                           [⋯]      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ TechStart Inc                                [Negotiation ●] │   │
│  │ FinTech · Startup                                            │   │
│  │                                                               │   │
│  │ 📋 1 Agreement     💰 —                      📂 1 Project   │   │
│  │ Last activity: 5 hours ago                          [⋯]      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ GreenWave Energy                             [Lead ●]        │   │
│  │ CleanTech · Growth                                           │   │
│  │                                                               │   │
│  │ 📋 —                💰 —                      📂 —          │   │
│  │ Last activity: 1 week ago                           [⋯]      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────┘
```

### Component Breakdown

**Page Header**
```
Container: flex items-center justify-between
Title: text-display-md font-semibold text-foreground → "Customers"
Button: <Button className="gap-2"><Plus className="h-4 w-4" /> New Customer</Button>
```

**Status Filter Bar**
```
Container: flex rounded-lg bg-secondary p-1
Each pill: px-4 py-2 rounded-md text-sm font-medium transition-colors
Active pill: bg-background text-foreground shadow-sm
Inactive pill: text-muted-foreground hover:text-foreground
Count badge (optional): ml-1.5 text-xs text-muted-foreground
```

**Search + Sort Row**
```
Container: flex items-center gap-4
Search: <Input placeholder="Search customers..." className="max-w-sm" />
  with Search icon inside (relative positioning)
Sort: <Select> with options: Last Activity, Name, Status, Outstanding Balance, Created Date
```

**Customer Card**
```
Container: group relative rounded-lg border border-border/50 bg-card p-5
           transition-all duration-200 hover:border-primary/30 hover:shadow-md cursor-pointer
           (Click navigates to /customers/:id)

Layout: flex flex-col gap-3

Row 1 (header): flex items-center justify-between
  Left: Customer name (font-semibold text-foreground text-base)
  Right: Status badge (StatusBadge component with customer status colors)

Row 2 (tags): flex items-center gap-2
  Vertical tag: inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground
  Stage tag: same pattern, different text

Row 3 (metrics): flex items-center gap-6 text-sm text-muted-foreground
  Each metric: flex items-center gap-1.5
    Icon: h-3.5 w-3.5 text-muted-foreground
    Label + value: text-xs
  Agreements: FileText icon + "2 Agreements"
  Balance: DollarSign icon + "$4,200 outstanding" (text-amber-400 if > 0)
  Projects: FolderOpen icon + "3 Projects"
  Dashes (—) if zero/none

Row 4 (footer): flex items-center justify-between text-xs text-muted-foreground
  Left: "Last activity: 2 days ago"
  Right: More actions button (ghost, icon, opacity-0 group-hover:opacity-100 group-focus-within:opacity-100)
    MoreHorizontal icon → DropdownMenu: Change Status, Open Chat, Archive (with confirmation), Delete (with confirmation)
    NOTE: group-focus-within ensures keyboard accessibility (DX-019)
```

**Empty State** (no customers)
```
Container: flex flex-col items-center justify-center py-12 px-4 text-center
Icon: rounded-full bg-muted p-4 → Users icon h-8 w-8 text-muted-foreground
Title: mt-4 text-lg font-medium text-foreground → "No customers yet"
Description: mt-2 text-sm text-muted-foreground max-w-sm
  → "Start by adding your first customer to track engagements, agreements, and product work."
CTA: mt-6 <Button><Plus /> Add Your First Customer</Button>
```

### Mobile Layout (< 768px)

Cards stack vertically at full width. Filter pills become horizontally scrollable with `overflow-x-auto`. Search and sort stack vertically. Metrics row wraps to 2 columns on narrow screens.

---

## 3. Customer Detail Page (`/customers/:id`)

### Layout Structure (without chat)

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back    │  Acme Corp             [Live ▾]    [💬 Chat] [⋯]  │
├─────────────────────────────────────────────────────────────────┤
│  [Overview]  [Agreements]  [Receivables]  [Projects]            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─── Quick Stats ──────────────────────────────────────────┐   │
│  │  📋 2 Active      💰 $12,000 invoiced   📂 3 Active     │   │
│  │  Agreements       $7,800 paid            Projects        │   │
│  │                   $4,200 balance                         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─── Customer Information ─────────────────────────────────┐   │
│  │                                                           │   │
│  │  About                                                    │   │
│  │  ┌─────────────────────────────────────────────────────┐ │   │
│  │  │ Enterprise SaaS company focused on supply chain...  │ │   │
│  │  └─────────────────────────────────────────────────────┘ │   │
│  │                                                           │   │
│  │  Vertical           Persona          ICP                  │   │
│  │  ┌──────────┐     ┌──────────┐     ┌──────────┐         │   │
│  │  │ SaaS     │     │ CTO      │     │ Mid-mar..│         │   │
│  │  └──────────┘     └──────────┘     └──────────┘         │   │
│  │                                                           │   │
│  │  Product                                                  │   │
│  │  ┌─────────────────────────────────────────────────────┐ │   │
│  │  │ Supply chain optimization platform for...           │ │   │
│  │  └─────────────────────────────────────────────────────┘ │   │
│  │                                                    [Edit] │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─── Team Members ─────────────────────────────────────────┐   │
│  │  ┌──────────────────────────────────────────────────┐    │   │
│  │  │ 👤 Sarah Chen  ·  CTO  ·  sarah@acme.com        │    │   │
│  │  │    Decision maker, technical evaluator           │    │   │
│  │  └──────────────────────────────────────────────────┘    │   │
│  │  ┌──────────────────────────────────────────────────┐    │   │
│  │  │ 👤 Mike Ross   ·  VP Product  ·  mike@acme.com  │    │   │
│  │  │    Champion, day-to-day contact                  │    │   │
│  │  └──────────────────────────────────────────────────┘    │   │
│  │                                          [+ Add Member]  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─── Event Timeline ───────────────────────────────────────┐   │
│  │  ● 2026-02-24  Meeting: Q1 Strategy Review              │   │
│  │  │  Discussed roadmap priorities. Agreed on 3 focus...   │   │
│  │  │                                                        │   │
│  │  ● 2026-02-20  Delivery: Competitive Analysis v2        │   │
│  │  │  Delivered updated competitive analysis with...        │   │
│  │  │                                                        │   │
│  │  ● 2026-02-15  Call: Pricing Discussion                  │   │
│  │  │  Reviewed retainer pricing for Q2 extension...         │   │
│  │                                          [+ Log Event]   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Layout Structure (with chat open - split view)

```
┌──────────────────────────┬──────────────────────────────────────┐
│  ✨ Acme Corp AI         │  ← Back  │  Acme Corp    [Live ▾]   │
│  ─────────────────────── │  ────────────────────────────────────│
│  🤖 Customer Mgmt Agent │  [Overview] [Agreements] [Receiv...] │
│                          │  ────────────────────────────────────│
│  How can I help with     │                                      │
│  Acme Corp today?        │  (Tab content renders here)          │
│                          │                                      │
│  ┌────────────────────┐ │                                      │
│  │ Based on your last  │ │                                      │
│  │ meeting, I'd rec... │ │                                      │
│  │ [Update Status]     │ │                                      │
│  │ [Draft Follow-up]   │ │                                      │
│  └────────────────────┘ │                                      │
│                          │                                      │
│                          │                                      │
│                          │                                      │
│  ┌────────────────────┐ │                                      │
│  │ Type a message...   │ │                                      │
│  └────────────────────┘ │                                      │
└──────────────────────────┴──────────────────────────────────────┘
        Chat Panel (20-50%)          Content Panel (50-80%)
```

### Component Breakdown

**Page Header**
```
Container: flex items-center gap-4 border-b border-border px-4 py-3
Back button: <Button variant="ghost" size="icon"><ArrowLeft /></Button>
Divider: h-6 w-px bg-border
Customer name: truncate text-lg font-semibold text-foreground (editable on click)
Status dropdown: <Select> with colored status options
  Trigger shows StatusBadge with current status
  Options show status name + colored dot
Right side: flex items-center gap-2
  Chat button: <Button variant="outline" size="sm" className="gap-2"><MessageSquare h-4 w-4 /> Chat</Button>
  More actions: <Button variant="ghost" size="icon"><MoreHorizontal /></Button>
    Dropdown: Edit Name, Archive, Delete (destructive)
```

**Tab Navigation**
```
Uses shadcn <Tabs> with <TabsList> at the top:
Container: border-b border-border
TabsList: inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground
TabsTrigger: data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow

Tabs: Overview | Agreements | Receivables | Projects
Each tab shows count badge: Agreements (2) | Receivables (5) | Projects (3)
Badge: ml-1.5 text-xs text-muted-foreground
```

**Quick Stats Row** (top of Overview tab)
```
Container: grid grid-cols-1 sm:grid-cols-3 gap-4
Each stat card: rounded-xl bg-card border border-border p-4
  Icon + label row: flex items-center gap-2 text-sm text-muted-foreground
    Icon: h-4 w-4
    Label: "Agreements" / "Financials" / "Projects"
  Value: text-heading-md font-semibold text-foreground → "2 Active"
  Sub-value (optional): text-xs text-muted-foreground → "$4,200 balance"
```

**Customer Information Section**
```
Container: rounded-xl bg-card border border-border p-6 space-y-6
Section header: flex items-center justify-between
  Title: text-heading-sm font-semibold text-foreground → "Customer Information"
  Edit button: <Button variant="ghost" size="sm">Edit</Button>

Display mode:
  About: full-width, text-sm text-foreground, max 4 lines with "Show more"
  Field grid: grid grid-cols-1 sm:grid-cols-3 gap-4
    Each field:
      Label: text-xs font-medium text-muted-foreground uppercase tracking-wide
      Value: text-sm text-foreground mt-1
      Fields: Vertical, Persona, ICP, Product

Edit mode (toggled by Edit button):
  Uses existing Input/Textarea components
  About → <Textarea rows={4} />
  Vertical, Persona, ICP → <Input />
  Product → <Textarea rows={3} />
  Footer: flex justify-end gap-2 → Cancel (outline) + Save (primary)
```

**Team Members Section**
```
Container: rounded-xl bg-card border border-border p-6 space-y-4
Header: flex items-center justify-between
  Title: text-heading-sm font-semibold text-foreground → "Team"
  Add: <Button variant="ghost" size="sm"><Plus h-4 w-4 /> Add Member</Button>

Each member row: flex items-center gap-3 py-3 border-b border-border/50 last:border-0
  Avatar: rounded-full bg-muted h-8 w-8 flex items-center justify-center
    Initials: text-xs font-medium text-muted-foreground
  Info: flex-1
    Row 1: flex items-center gap-2
      Name: text-sm font-medium text-foreground
      Dot separator: text-muted-foreground ·
      Role: text-sm text-muted-foreground
      Email: text-sm text-muted-foreground
    Row 2: text-xs text-muted-foreground mt-0.5 → Notes
  Actions: opacity-0 group-hover:opacity-100
    Edit + Delete icon buttons
```

**Event Timeline Section**
```
Container: rounded-xl bg-card border border-border p-6 space-y-4
Header: flex items-center justify-between
  Title: text-heading-sm font-semibold text-foreground → "Activity Timeline"
  Add: <Button variant="ghost" size="sm"><Plus h-4 w-4 /> Log Event</Button>

Timeline: relative, with left border line

Each event:
  Container: relative pl-6
  Dot: absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background
    Color by event type:
      Meeting: bg-blue-400
      Call: bg-green-400
      Delivery: bg-purple-400
      Decision: bg-amber-400
      Feedback: bg-cyan-400
      Default: bg-muted-foreground
  Connecting line: absolute left-[4px] top-4 bottom-0 w-px bg-border
  Content:
    Header row: flex items-center gap-2
      Date: text-xs text-muted-foreground
      Event type badge: StatusBadge-style, small
      Title: text-sm font-medium text-foreground
    Body: text-xs text-muted-foreground mt-1 line-clamp-2
```

---

## 4. Agreements Tab

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  [Overview]  [Agreements (2)]  [Receivables]  [Projects]        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Agreements                                  [+ Add Agreement]   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Fractional CPO Advisory                   [Active ●]    │   │
│  │  Retainer                                                 │   │
│  │                                                           │   │
│  │  📅 Jan 2026 → Jun 2026     💰 $5,000/month             │   │
│  │  Scope: Strategic product leadership, roadmap dev,        │   │
│  │  stakeholder alignment, team mentoring                    │   │
│  │                                                    [⋯]   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  GTM Strategy Project                      [Expired ●]   │   │
│  │  Project-based                                            │   │
│  │                                                           │   │
│  │  📅 Sep 2025 → Dec 2025     💰 $15,000 fixed            │   │
│  │  Scope: Go-to-market strategy development for            │   │
│  │  enterprise market entry                                  │   │
│  │                                                    [⋯]   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Agreement Card
```
Container: rounded-lg border border-border/50 bg-card p-5 space-y-3
  hover:border-primary/30 hover:shadow-md transition-all

Row 1 (header): flex items-center justify-between
  Left: text-base font-semibold text-foreground → Scope title (first line or summary)
  Right: Agreement status badge (Active/Upcoming/Expired/Open-ended with colors defined above)

Row 2 (type): text-sm text-muted-foreground → Agreement type

Row 3 (details): flex items-center gap-6 text-sm text-muted-foreground
  Date range: Calendar icon + "Jan 2026 → Jun 2026" (or "Jan 2026 → Ongoing" for open-ended)
  Pricing: DollarSign icon + "$5,000/month" or "$15,000 fixed"

Row 4 (scope): text-sm text-muted-foreground line-clamp-2
  "Scope: [full scope text]"

Actions: absolute top-4 right-4, opacity-0 group-hover:opacity-100
  MoreHorizontal → Dropdown: Edit, Delete
```

### Agreement Form (Dialog)
```
Dialog: max-w-lg
Title: "New Agreement" / "Edit Agreement"

Fields (space-y-4):
  Scope: <Textarea label="Scope" placeholder="Describe the service scope..." rows={3} />
  Type: <Select label="Type">
    Options: Retainer, Project-based, Hourly, Fixed-price, Equity, Hybrid, Custom
  </Select>

  Date row: grid grid-cols-2 gap-4
    Start Date: <Input type="date" label="Start Date" />
    End Date: <Input type="date" label="End Date (optional)" />

  Pricing section: space-y-3
    Amount: <Input type="number" label="Amount" placeholder="0.00" />
    Currency: <Select label="Currency" defaultValue="USD">
      Options: USD, EUR, GBP, ILS, etc.
    </Select>
    Frequency: <Select label="Billing Frequency">
      Options: Monthly, Quarterly, Annually, One-time, Per milestone
    </Select>
    Notes: <Input label="Pricing Notes (optional)" placeholder="e.g., Net 30 terms" />

Footer: flex justify-end gap-2
  Cancel: <Button variant="outline">Cancel</Button>
  Save: <Button>Save Agreement</Button>
```

### Empty State (no agreements)
```
Container: flex flex-col items-center justify-center py-12
Icon: FileText in rounded-full bg-muted p-4
Title: "No agreements yet"
Description: "Add your first service agreement to track scope, pricing, and timelines."
CTA: <Button><Plus /> Add Agreement</Button>
```

---

## 5. Receivables Tab

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  [Overview]  [Agreements]  [Receivables (5)]  [Projects]        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─── Financial Summary ────────────────────────────────────┐   │
│  │                                                           │   │
│  │   Total Invoiced        Total Paid       Outstanding      │   │
│  │   $27,000               $22,800          $4,200           │   │
│  │   ████████████████      █████████████    ████             │   │
│  │                                          ▲ amber if > 0   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Transactions                 [Record Invoice] [Record Payment]  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  📄  Invoice #INV-2026-003                     $5,000    │   │
│  │      Q1 Advisory - February                    [Sent]    │   │
│  │      2026-02-01                                          │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │  💳  Payment received                         +$5,000    │   │
│  │      Wire transfer - INV-2026-002                        │   │
│  │      2026-01-28                                          │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │  📄  Invoice #INV-2026-002                     $5,000    │   │
│  │      Q1 Advisory - January                     [Paid]    │   │
│  │      2026-01-01                                          │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │  💳  Payment received                        +$12,800    │   │
│  │      Bank transfer - GTM project final                   │   │
│  │      2025-12-20                                          │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │  📄  Invoice #INV-2025-005                    $12,000    │   │
│  │      GTM Strategy - Final milestone            [Paid]    │   │
│  │      2025-12-15                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Financial Summary Card
```
Container: rounded-xl bg-card border border-border p-6
Layout: grid grid-cols-3 gap-6 text-center (sm:text-left, stacked on mobile)

Each metric:
  Label: text-xs font-medium text-muted-foreground uppercase tracking-wide
  Value: text-heading-lg font-semibold text-foreground mt-1
    Outstanding balance: text-amber-400 if > 0, text-green-400 if 0
  Progress bar (optional): h-1.5 rounded-full bg-muted mt-2
    Fill: bg-brand-300 for invoiced, bg-green-400 for paid, bg-amber-400 for outstanding
```

### Transaction List
```
Header row: flex items-center justify-between mb-4
  Title: text-heading-sm font-semibold text-foreground → "Transactions"
  Buttons: flex gap-2
    <Button variant="outline" size="sm"><FileText h-4 w-4 /> Record Invoice</Button>
    <Button variant="outline" size="sm"><CreditCard h-4 w-4 /> Record Payment</Button>

List container: rounded-lg border border-border/50 overflow-hidden divide-y divide-border/50

Each transaction row: group flex items-center gap-4 px-5 py-4 hover:bg-surface-hover transition-colors
  Type icon:
    Invoice: FileText icon in rounded bg-blue-500/10 p-2, text-blue-400
    Payment: CreditCard icon in rounded bg-green-500/10 p-2, text-green-400

  Content: flex-1
    Row 1: flex items-center gap-2
      Title: text-sm font-medium text-foreground
        Invoice: "Invoice #INV-2026-003"
        Payment: "Payment received"
    Row 2: text-xs text-muted-foreground mt-0.5
      Description text
    Row 3: text-xs text-muted-foreground mt-0.5
      Date

  Right side: flex flex-col items-end
    Amount: text-sm font-semibold
      Invoice: text-foreground → "$5,000"
      Payment: text-green-400 → "+$5,000"
    Status badge (invoices only):
      Draft: gray
      Sent: blue
      Overdue: red (bg-red-500/10 text-red-400 border-red-500/20)
      Paid: green
      Cancelled: gray with line-through

  Actions: opacity-0 group-hover:opacity-100
    MoreHorizontal → Edit, Mark as Paid (invoices), Delete
```

### Invoice Form (Dialog)
```
Dialog: max-w-md
Title: "Record Invoice"

Fields (space-y-4):
  Amount: <Input type="number" label="Amount" placeholder="0.00" required />
  Date: <Input type="date" label="Invoice Date" required />
  Description: <Input label="Description" placeholder="e.g., Q1 Advisory - February" />
  Reference: <Input label="Invoice Number (optional)" placeholder="INV-2026-003" />
  Status: <Select label="Status" defaultValue="sent">
    Options: Draft, Sent, Overdue, Paid, Cancelled
  </Select>
  Linked Agreement: <Select label="Linked Agreement (optional)">
    Options: [list of customer's agreements by scope name]
  </Select>

Footer: Cancel + Save
```

### Payment Form (Dialog)
```
Dialog: max-w-md
Title: "Record Payment"

Fields (space-y-4):
  Amount: <Input type="number" label="Amount" placeholder="0.00" required />
  Date: <Input type="date" label="Payment Date" required />
  Description: <Input label="Description" placeholder="e.g., Wire transfer" />
  Method: <Select label="Payment Method (optional)">
    Options: Bank Transfer, Check, Credit Card, PayPal, Other
  </Select>
  Linked Invoice: <Select label="Linked Invoice (optional)">
    Options: [list of customer's unpaid invoices]
  </Select>

Footer: Cancel + Save
```

---

## 6. Projects Tab

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  [Overview]  [Agreements]  [Receivables]  [Projects (3)]        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Projects                                     [+ New Project]    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Q1 Product Strategy 2026                  [Active ●]    │   │
│  │  Strategic product direction for enterprise expansion     │   │
│  │                                                           │   │
│  │  📄 4 Artifacts     🔗 Fractional CPO Advisory           │   │
│  │  Last updated: 1 day ago                                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  User Research Sprint                      [Completed ●] │   │
│  │  Enterprise buyer persona development                     │   │
│  │                                                           │   │
│  │  📄 6 Artifacts     🔗 GTM Strategy Project              │   │
│  │  Last updated: 3 weeks ago                                │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Competitive Landscape                     [Planning ●]  │   │
│  │  Quarterly competitive analysis update                    │   │
│  │                                                           │   │
│  │  📄 1 Artifact      🔗 —                                 │   │
│  │  Last updated: 5 days ago                                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Project Card
```
Container: rounded-lg border border-border/50 bg-card p-5 space-y-3
  cursor-pointer hover:border-primary/30 hover:shadow-md transition-all
  (Click expands to show project detail inline, or navigates to sub-view)

Row 1: flex items-center justify-between
  Name: text-base font-semibold text-foreground
  Status badge: project status colors
    Active: green
    Planning: blue
    On Hold: orange
    Completed: emerald
    Archived: gray

Row 2: text-sm text-muted-foreground line-clamp-1
  Description

Row 3: flex items-center gap-6 text-xs text-muted-foreground
  Artifacts: FileText icon + "4 Artifacts"
  Agreement: Link icon + agreement scope name (or "—" if none)

Row 4: text-xs text-muted-foreground
  "Last updated: 1 day ago"
```

### Project Detail View (expanded inline)

When a project card is clicked, it expands to show the full project with its artifacts:

```
┌──────────────────────────────────────────────────────────────┐
│  ← Back to Projects                                          │
│                                                               │
│  Q1 Product Strategy 2026                     [Active ▾]     │
│  Strategic product direction for enterprise expansion         │
│  🔗 Linked: Fractional CPO Advisory                          │
│                                                               │
│  ──────────────────────────────────────────────────────────── │
│                                                               │
│  Artifacts                                  [+ New Artifact]  │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  🟣 Strategy    Product Strategy 2026      [Final]   │    │
│  │  Comprehensive product strategy covering market...    │    │
│  │  Updated: 1 day ago                                   │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  🔵 Research    Enterprise Market Analysis  [Final]   │    │
│  │  Deep dive into enterprise SaaS market dynamics...    │    │
│  │  Updated: 1 week ago                                  │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  🔵 Roadmap     Q1-Q2 Feature Roadmap      [Draft]   │    │
│  │  Prioritized feature roadmap based on strategy...     │    │
│  │  Updated: 1 day ago                                   │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  🔴 Competitive  Competitor Feature Matrix  [Review]  │    │
│  │  Feature-by-feature comparison with top 5...          │    │
│  │  Updated: 3 days ago                                  │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### Artifact Row
```
Container: flex items-center gap-4 px-4 py-3 rounded-lg
  hover:bg-surface-hover transition-colors cursor-pointer
  (Click opens artifact editor)

Type indicator: w-2 h-2 rounded-full (color from artifact type color map)
  Or: small type badge using artifact type colors

Content: flex-1
  Row 1: flex items-center gap-2
    Type badge: rounded-md px-1.5 py-0.5 text-xs (artifact type color)
    Title: text-sm font-medium text-foreground
    Status badge: small, artifact status color
  Row 2: text-xs text-muted-foreground mt-0.5 line-clamp-1
    Content preview snippet
  Row 3: text-xs text-muted-foreground mt-0.5
    "Updated: 1 day ago"
```

### Artifact Editor (opens as overlay or side panel)
```
Full-height panel or dialog (max-w-3xl):

Header: flex items-center justify-between px-6 py-4 border-b
  Left: flex items-center gap-3
    Type badge (artifact type color)
    Title (editable text-lg font-semibold)
  Right: flex items-center gap-2
    Status dropdown
    Auto-save indicator: "Saved" / "Saving..." (text-xs text-muted-foreground)
    Close button

Body: flex-1 overflow-auto px-6 py-4
  TipTap rich text editor (same as Portfolio ArtifactEditor)
  Supports: headings, bold, italic, links, lists, images, tables, code blocks
```

### Project Form (Dialog)
```
Dialog: max-w-md
Title: "New Project"

Fields:
  Name: <Input label="Project Name" placeholder="e.g., Q1 Product Strategy" required />
  Description: <Textarea label="Description (optional)" placeholder="Brief description..." rows={2} />
  Status: <Select label="Status" defaultValue="planning">
    Options: Planning, Active, On Hold, Completed, Archived
  </Select>
  Agreement: <Select label="Linked Agreement (optional)">
    Options: [customer's agreements]
  </Select>

Footer: Cancel + Create Project
```

---

## 7. Chat Panel Integration

### Chat Panel for Customers

Reuses the existing `ChatPanel` component with customer-specific configuration:

```
Chat header: flex items-center border-b px-4 py-3
  Sparkles icon: h-4 w-4 text-primary
  Title: text-sm font-semibold → "{Customer Name} AI"
  Agent indicator: ml-auto, small badge
    Customer Mgmt: bg-blue-500/10 text-blue-400 text-xs px-2 py-0.5 rounded-full
      "Customer Mgmt"
    Product Mgmt: bg-purple-500/10 text-purple-400 text-xs px-2 py-0.5 rounded-full
      "Product Mgmt"
```

### Structured Response Cards

**Status Change Card** (Customer Mgmt Agent action):
```
┌────────────────────────────────────────┐
│  ✅ Status Updated                      │
│                                         │
│  Acme Corp: Negotiation → Live          │
│                                         │
│  The status has been updated based on   │
│  our discussion about the signed MSA.   │
│                                         │
│  [View Customer]                        │
└────────────────────────────────────────┘

Container: rounded-lg border border-green-500/20 bg-green-500/5 p-4
Title: text-sm font-semibold text-green-400
Body: text-sm text-muted-foreground
Link: text-sm text-brand-300 hover:text-brand-200
```

**Artifact Created Card** (Product Mgmt Agent action):
```
┌────────────────────────────────────────┐
│  📄 Artifact Created                    │
│                                         │
│  🟣 Strategy                            │
│  "Q1 Product Strategy 2026"            │
│                                         │
│  Created in project: Q1 Product         │
│  Strategy 2026                          │
│                                         │
│  [Open Artifact]  [Edit]                │
└────────────────────────────────────────┘

Container: rounded-lg border border-purple-500/20 bg-purple-500/5 p-4
Title: text-sm font-semibold text-purple-400
Type badge: artifact type color
Artifact name: text-sm font-medium text-foreground
Project ref: text-xs text-muted-foreground
Actions: flex gap-2 mt-3 → small outline buttons
```

**Recommendation Card** (either agent):
```
┌────────────────────────────────────────┐
│  💡 Recommendation                      │
│                                         │
│  Based on Acme's agreement expiring in  │
│  30 days, I'd recommend:               │
│                                         │
│  1. Schedule renewal discussion          │
│  2. Prepare updated pricing proposal     │
│  3. Review deliverables completed        │
│                                         │
│  [Draft Renewal Email] [Update Status]   │
└────────────────────────────────────────┘

Container: rounded-lg border border-amber-500/20 bg-amber-500/5 p-4
Title: text-sm font-semibold text-amber-400
Body: text-sm text-muted-foreground
Actions: flex flex-wrap gap-2 mt-3 → small outline buttons
```

### Mobile Chat
On mobile (< 768px), the chat opens as a full-screen `<Sheet>` overlay (same as Content Agent mobile pattern):
```
<Sheet side="right" className="w-full p-0">
  <ChatPanel ... />
</Sheet>
```

---

## 8. New Customer Creation Flow

### Option A: Dialog (Recommended for quick creation)

```
Dialog: max-w-lg
Title: "New Customer"

Fields (space-y-4):
  Name: <Input label="Customer Name" placeholder="e.g., Acme Corp" required autoFocus />

  Status: <Select label="Initial Status" defaultValue="lead">
    Options: Lead (blue dot), Prospect (indigo dot), Negotiation (amber dot), Live (green dot)
  </Select>

  --- Optional Details (collapsible section) ---

  Vertical: <Input label="Vertical / Industry" placeholder="e.g., SaaS, FinTech, Healthcare" />
  About: <Textarea label="About" placeholder="Brief description of the customer..." rows={3} />
  Persona: <Input label="Primary Persona" placeholder="e.g., CTO, VP Product" />
  ICP: <Input label="ICP Notes" placeholder="e.g., Mid-market B2B, 50-200 employees" />

Footer:
  <Button variant="outline">Cancel</Button>
  <Button>Create Customer</Button>
```

After creation: navigate to `/customers/:newId` (customer detail page).

---

## 9. Confirmation Dialogs

### Delete Customer
```
AlertDialog:
  Title: "Delete Customer"
  Description: "Are you sure you want to delete {Customer Name}? This will also delete all
    agreements, receivables, projects, and artifacts. This action cannot be undone."
  Cancel: <Button variant="outline">Cancel</Button>
  Confirm: <Button variant="destructive">Delete Customer</Button>
```

### Delete Agreement / Receivable / Project / Artifact
```
AlertDialog:
  Title: "Delete {Item Type}"
  Description: Context-specific warning
  Cancel + Confirm (destructive)
```

---

## 10. Loading States

### Customer List Loading
```
Grid of 3 skeleton cards:
  Each: rounded-lg border border-border/50 bg-card p-5 space-y-3 animate-pulse
    Row 1: flex justify-between
      <Skeleton className="h-5 w-32" />   ← name
      <Skeleton className="h-5 w-16" />   ← status badge
    Row 2: <Skeleton className="h-4 w-24" /> ← vertical tag
    Row 3: flex gap-6
      <Skeleton className="h-4 w-28" /> × 3  ← metrics
    Row 4: <Skeleton className="h-3 w-36" /> ← last activity
```

### Customer Detail Loading
```
Header skeleton + tabs skeleton + content area skeleton
```

### Tab Content Loading
```
Each tab shows appropriate skeleton:
  Overview: stat cards skeleton + info section skeleton + timeline skeleton
  Agreements: 2 agreement card skeletons
  Receivables: summary card skeleton + 3 transaction row skeletons
  Projects: 2 project card skeletons
```

---

## 11. Toast Notifications

Using existing sonner toast patterns:

| Action | Toast |
|--------|-------|
| Customer created | `toast.success("Customer Created", { description: "Acme Corp has been added" })` |
| Customer deleted | `toast.success("Customer Deleted", { description: "Acme Corp has been removed" })` |
| Status changed | `toast.success("Status Updated", { description: "Acme Corp is now Live" })` |
| Agreement saved | `toast.success("Agreement Saved")` |
| Invoice recorded | `toast.success("Invoice Recorded", { description: "$5,000 - Q1 Advisory" })` |
| Payment recorded | `toast.success("Payment Recorded", { description: "+$5,000" })` |
| Artifact created | `toast.success("Artifact Created", { description: "Strategy doc added to Q1 Project" })` |
| Error | `toast.error("Failed to Save", { description: error.message })` |

---

## 12. Responsive Breakpoints Summary

| Viewport | Customer List | Customer Detail | Chat |
|----------|--------------|----------------|------|
| < 640px | Single column cards, stacked metrics, scroll filters | Single column everything, scroll tabs | Full-screen Sheet |
| 640-768px | Single column cards | Tabs visible, 2-col stat grid | Full-screen Sheet |
| 768-1024px | 2-column card grid | Full tab layout, 3-col stats | Split view (20-50%) |
| 1024px+ | 3-column card grid | Full layout with max-w-7xl | Split view (20-50%) |

---

## 13. Interaction Patterns

### Card Click Behavior
- Customer card → Navigate to `/customers/:id`
- Project card → Expand inline to show project detail
- Artifact row → Open artifact editor (overlay/panel)
- Agreement card → Edit mode or detail view

### Status Change
- Customer status: Click status badge → dropdown appears → select new status → immediate update + toast
- Project status: Same dropdown pattern
- Invoice status: Same pattern or context menu

### Form Submission
- All forms use React Hook Form + Zod validation
- Inline error messages below fields (`text-sm text-destructive`)
- Submit button shows loading spinner when submitting
- Success → close dialog + invalidate query + toast
- Error → toast.error + keep dialog open

### Chat Opening
- Click "Chat" button → `openChat({ title, endpoint, contextKey, screenContext })` via `useChatLayoutStore`
- AppShell switches to ResizablePanelGroup split view
- Chat panel mounts with `"customer:{customerId}"` context key

---

---

## 14. Design Review Amendments

The following amendments incorporate accepted findings from the design review (DX-001 through DX-041). These override or supplement the original sections above.

### 14.1 Status Badge Accessibility (DX-006)

Blue (Lead) and Indigo (Prospect) are too similar at small badge sizes, especially for color-vision-deficient users. **Add icon prefixes** to all customer status badges for non-color discrimination:

| Status | Icon | Color |
|--------|------|-------|
| Lead | `Circle` (small filled dot) | Blue |
| Prospect | `Triangle` (small outline) | Indigo |
| Negotiation | `Diamond` (small outline) | Amber |
| Live | `CheckCircle` (filled) | Green |
| On Hold | `PauseCircle` (outline) | Orange |
| Archive | `Archive` (outline) | Gray |

Usage: `<StatusBadge><Icon className="h-3 w-3 mr-1" />{status}</StatusBadge>`

### 14.2 Customer Name Inline Edit (DX-011)

The customer name in the page header is editable. **Remove "Edit Name" from the More dropdown** — inline click is the single trigger.

**States**:
- **Display**: Name shown as `text-display-md font-semibold`. Pencil icon appears on hover (`opacity-0 group-hover:opacity-100`).
- **Edit**: Click transforms to `<Input>` with same font size. Border appears. Save on Enter or blur, cancel on Escape.
- **Saving**: Input disabled, subtle spinner.
- **Error**: Red border + inline error text below.

### 14.3 Agent Override UI (DX-012)

Add visible agent toggle pills above the chat input for discoverability:

```
┌──────────────────────────────────────────┐
│  [Customer Mgmt]  [Product Mgmt]         │  ← Toggle pills (one active/highlighted)
├──────────────────────────────────────────┤
│  Type your message...              [Send] │
└──────────────────────────────────────────┘
```

- Active pill: `bg-blue-500/20 text-blue-400` (Customer) or `bg-purple-500/20 text-purple-400` (Product)
- Inactive pill: `text-muted-foreground`
- Clicking a pill forces that agent for the next message, then returns to auto-routing
- @mention syntax kept as power-user secondary mechanism

### 14.4 Status Dropdown - Detail Page (DX-013)

Use `<DropdownMenu>` (not `<Select>`) for status changes:
- Each option shows colored dot + status label
- Current status shown at top as disabled/highlighted
- **Confirmation required for Archive**: "Archive {name}? This will move them out of your active customer list."
- Non-destructive transitions (Lead→Prospect→Negotiation→Live) are immediate

### 14.5 Agreement Card Click Behavior (DX-014)

Make the entire agreement card clickable (opens edit form/dialog). Remove "Edit" from MoreHorizontal dropdown — keep only "Delete" in dropdown.

### 14.6 Log Event Dialog (DX-015)

**Fields**:
- Event Type: `<Select>` — Meeting, Call, Workshop, Decision, Delivery, Feedback
- Title: `<BaseTextField>` (required)
- Date: shadcn `<Popover>` + `<Calendar>` (defaults to today, allows past dates)
- Notes: `<BaseTextArea>` (optional)
- Participants: Tag input (optional)

Agent-created events show a small sparkle icon + "via AI" tag in the event header.

### 14.7 New Customer Dialog - Optional Fields (DX-016)

Use `<Collapsible>` (shadcn) for optional fields section:
- Toggle text: "Add details (vertical, about, persona)" with chevron
- **Do not clear** entered values when collapsed — fields persist in form state
- If user has entered any optional field, do not allow collapse without confirmation

### 14.8 Form Components (DX-020)

All form dialogs MUST use `BaseTextField` and `BaseTextArea` per project component standards. Do NOT use raw `<Input>` without labels. Each field renders as:
```
<div>
  <Label htmlFor="fieldId">Field Name</Label>
  <BaseTextField id="fieldId" ... />
</div>
```

### 14.9 Date Pickers (DX-039)

Replace all `<Input type="date">` with shadcn `<Popover>` + `<Calendar>`:
- Button trigger shows formatted date or "Select date" placeholder
- Calendar component inside Popover
- Consistent visual styling across browsers

### 14.10 Dialog Focus Management (DX-022)

| Dialog | autoFocus Field |
|--------|----------------|
| New Customer | Customer Name input |
| New Agreement | Scope textarea |
| Record Invoice | Amount input |
| Record Payment | Amount input |
| New Project | Name input |
| New Artifact | Title input |
| Log Event | Title input |
| Delete confirmations | **Cancel button** (not Confirm — prevents accidental delete via Enter) |

### 14.11 Timeline Event Icons (DX-021)

Add icons to timeline dots for non-color event type discrimination:
| Event Type | Icon |
|-----------|------|
| Meeting | `Calendar` |
| Call | `Phone` |
| Workshop | `Users` |
| Decision | `CheckSquare` |
| Delivery | `Package` |
| Feedback | `MessageSquare` |
| Escalation | `AlertTriangle` |

### 14.12 Overview Tab Section Ordering (DX-009)

Reorder from original: Customer Information first (always present), Team Members second, Quick Stats third (becomes meaningful with data), Event Timeline last.

### 14.13 Financial Summary (DX-007, DX-033, DX-026)

- Outstanding balance is visually dominant: `text-heading-lg` vs `text-heading-md` for others
- Always amber when outstanding > 0
- Progress bar (invoiced-to-paid ratio) is **required**, not optional
- **Negative balance (credit)**: Display in blue with "Credit: $X" label. Tooltip: "Credit balance from overpayment."
- Mobile: `grid-cols-1 sm:grid-cols-3`. At single column, each metric is a horizontal row (label left, value right).

### 14.14 Currency Input Validation (DX-035)

All currency amount inputs enforce:
- Positive number > 0
- Maximum 2 decimal places
- Maximum value: 999,999,999.99
- Currency symbol prefix shown in input
- Zod: `z.number().positive().multipleOf(0.01).max(999999999.99)`

### 14.15 Tab Overflow on Mobile (DX-025)

Wrap `<TabsList>` in `div` with `overflow-x-auto scrollbar-none scroll-snap-type-x-mandatory`. On screens < 480px, consider a compact `<Select>` dropdown to replace the tab bar.

### 14.16 Mobile Touch Targets (DX-023)

On mobile (< 768px), always display MoreHorizontal action buttons at full opacity. Do not use `opacity-0 group-hover:opacity-100` on touch devices. Use `useIsMobile()` hook for conditional styling.

### 14.17 Tab State During Mobile Chat (DX-028)

Use URL query params (`/customers/:id?tab=agreements`) to preserve tab state when mobile chat Sheet opens/closes.

### 14.18 Responsive Breakpoints (DX-027)

Clarified customer list card grid:
- < 640px: 1 column
- 640-1024px: 2 columns (`sm:grid-cols-2`)
- 1024px+: 2 columns (data-dense cards need width for metrics)

### 14.19 Phase 1 Placeholder States (DX-029)

**Do NOT use "Coming soon"**. Use EmptyState component with contextual messaging:

| Tab | Icon | Title | Description | CTA |
|-----|------|-------|-------------|-----|
| Agreements | `FileText` | Track Your Agreements | Service agreements, scope, and pricing details will appear here. | [Add Agreement] (disabled) |
| Receivables | `CreditCard` | Manage Your Receivables | Invoice and payment tracking will appear here. | [Record Invoice] (disabled) |
| Projects | `FolderOpen` | Product Workflow Projects | Research, strategy, and other product deliverables will appear here. | [New Project] (disabled) |

Disabled buttons have tooltip: "Available in the next update."

### 14.20 Chat Panel Customization (DX-030)

`ChatPanel` accepts customizable suggestions via `suggestions` prop. Customer context shows:
- "What's the status of this customer?"
- "Help me draft a follow-up email"
- "Create a product strategy artifact"
- "What agreements are expiring soon?"

### 14.21 Projects Empty State (DX-031)

Two CTAs:
- Primary: "New Project" (manual creation)
- Secondary: "Ask AI to create a project" (opens chat with pre-filled message)

### 14.22 Filter-Active Empty State (DX-032)

When filters return no results: "No [Status] customers / Try a different status filter or search a different name." Include "Clear filters" link.

### 14.23 Auto-Save Indicator (DX-036)

States for artifact editor auto-save:
- **Unsaved changes**: Visible when `hasUnsavedChanges = true`
- **Saving...**: Visible during mutation (spinner icon)
- **Saved**: Visible for 2 seconds after save completes, then fades out
- Style: `text-xs text-muted-foreground`

### 14.24 Agent Routing Indicator (DX-037)

Between message send and first token received, show agent indicator as `bg-muted animate-pulse` with "..." text. Update to correct agent once first token arrives.

### 14.25 Per-Message Agent Attribution (DX-041)

When both agents have spoken in the same conversation, show a small label above each assistant message:
- Customer Mgmt: `text-blue-400 text-xs` → "Customer Mgmt"
- Product Mgmt: `text-purple-400 text-xs` → "Product Mgmt"
- Label only appears in mixed-agent conversations (single-agent conversations show header indicator only)

### 14.26 Chat Panel Landmark Role (DX-024)

Add `role="complementary"` and `aria-label="AI Assistant"` to `ChatPanelWrapper` div in `AppShell.tsx`.

### 14.27 New Customer Post-Creation (DX-040)

When a customer has no data (new record), show a "Getting Started" panel at the top of the Overview tab:
- Three suggested action cards: "Add customer details", "Add a service agreement", "Start a conversation"
- Dismiss once any action is completed
- Replaces empty Quick Stats for brand-new records

### 14.28 Project Detail Navigation (DX-002)

Commit to "detail view within tab" pattern (not inline expansion, not sub-route). Breadcrumb at top: "Projects / Acme Strategy Project". Back navigation returns to project list within the tab. Selected project ID stored in Zustand store to survive tab switches.

### 14.29 Artifact Editor Navigation (DX-003)

Opens as a **Sheet** (side panel from right, `max-w-3xl`). Not a Dialog overlay and not a full-page route. Sheet avoids TipTap-in-Dialog focus/scroll conflicts while staying within the tab context.

---

*This UX/UI specification defines the complete visual and interaction design for the Customers Management Platform. All designs follow existing NextUp patterns (shadcn/ui, Tailwind CSS, Plus Jakarta Sans) and extend the design system with customer-specific status colors and component patterns. Section 14 contains amendments from the design review.*
