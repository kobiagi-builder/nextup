# Action Items Tab - UX/UI Specification (Phase 6 Addendum)

**Parent**: ./ux-ui-spec.md
**Design System**: NextUp (shadcn/ui + Tailwind CSS + Plus Jakarta Sans)
**Theme**: Dark-first, consistent with existing Customer Detail Page tabs

---

## Design Direction

**Tone**: Operational, scannable, action-oriented. The Action Items tab is the "what needs to happen next" view - it should feel like a focused task list that surfaces urgency (overdue items) while staying clean and uncluttered.

**Consistency**: Follows the exact visual language of Agreements, Receivables, and Projects tabs. Header with count + action button, card/row items with badges, dialog-based forms.

---

## Action Item Type Color System

Extending the existing badge pattern (`bg-{color}-500/10 text-{color}-400 border-{color}-500/20`):

| Type | Color | Background | Text | Border |
|------|-------|-----------|------|--------|
| Follow-up | Blue | `bg-blue-500/10` | `text-blue-400` | `border-blue-500/20` |
| Proposal | Purple | `bg-purple-500/10` | `text-purple-400` | `border-purple-500/20` |
| Meeting | Cyan | `bg-cyan-500/10` | `text-cyan-400` | `border-cyan-500/20` |
| Delivery | Green | `bg-green-500/10` | `text-green-400` | `border-green-500/20` |
| Review | Amber | `bg-amber-500/10` | `text-amber-400` | `border-amber-500/20` |
| Custom | Slate | `bg-slate-500/10` | `text-slate-400` | `border-slate-500/20` |

## Action Item Status Color System

| Status | Color | Background | Text | Border |
|--------|-------|-----------|------|--------|
| To Do | Gray | `bg-gray-500/10` | `text-gray-400` | `border-gray-500/20` |
| In Progress | Blue | `bg-blue-500/10` | `text-blue-400` | `border-blue-500/20` |
| Done | Green | `bg-green-500/10` | `text-green-400` | `border-green-500/20` |
| Cancelled | Red | `bg-red-500/10` | `text-red-400` | `border-red-500/20` |

---

## Tab Layout

### Tab Trigger

```
[ Overview ] [ Agreements (3) ] [ Receivables (2) ] [ Projects (1) ] [ Action Items (5) ]
```

- Position: 5th tab, after Projects
- Count: Shows non-cancelled items count
- Styling: Identical to other tab triggers (`data-[state=active]:border-b-2 data-[state=active]:border-primary`)

### Tab Header

```
┌──────────────────────────────────────────────────────────────────┐
│  5 Action Items          [Status ▾] [Type ▾] [Sort ▾]  [+ Add] │
└──────────────────────────────────────────────────────────────────┘
```

- **Left**: Count label (e.g., "5 Action Items") in `text-sm font-medium text-muted-foreground`
- **Right**: Filter dropdowns + sort toggle + Add button
- **Filters**: Small Select components (`h-8`) with "All Statuses" / "All Types" default labels
- **Sort**: Small toggle button showing current sort (Due Date / Created)
- **Add button**: Primary small button with Plus icon (`<Plus className="h-3.5 w-3.5 mr-1.5" />`)

### Action Item Row

Each action item is a card row following the AgreementCard pattern:

```
┌──────────────────────────────────────────────────────────────────┐
│  [Follow-up]  Send Q2 pricing proposal              [To Do] [⋯] │
│               📅 Due: Mar 1, 2026                                │
└──────────────────────────────────────────────────────────────────┘
```

**Structure**:
- **Row 1**: Type badge (left) + Description text + Status badge (right) + Actions menu (three-dot)
- **Row 2**: Due date with calendar icon (muted, smaller text)

**Styling**:
- Container: `rounded-lg border border-border/50 bg-card p-4 space-y-2 hover:border-border transition-colors`
- Type badge: Colored pill using type colors (inline-flex, rounded-full, border, px-2 py-0.5, text-xs font-medium)
- Description: `text-sm font-medium text-foreground line-clamp-1`
- Status badge: Colored pill using status colors, **clickable** (cursor-pointer, hover effect)
- Due date: `text-xs text-muted-foreground` with Calendar icon (`h-3.5 w-3.5`)
- Actions: Three-dot dropdown, `opacity-0 group-hover:opacity-100`

### Overdue Highlight

When `due_date < today` AND status is `todo` or `in_progress`:

```
┌──────────────────────────────────────────────────────────────────┐
│  [Follow-up]  Send Q2 pricing proposal              [To Do] [⋯] │  ← border-destructive/50
│               📅 Overdue: Feb 20, 2026                           │  ← text-destructive
└──────────────────────────────────────────────────────────────────┘
```

- Border: `border-destructive/50` instead of `border-border/50`
- Due date text: `text-destructive` instead of `text-muted-foreground`
- Due date label: "Overdue: {date}" instead of "Due: {date}"

### Quick Status Change

Clicking the status badge opens an inline dropdown (using shadcn DropdownMenu):

```
           ┌─────────────┐
[To Do] →  │ ○ To Do     │
           │ ○ In Progress│
           │ ○ Done       │
           │ ○ Cancelled  │
           └─────────────┘
```

- Each option shows colored dot + label
- Selection immediately updates (optimistic update via mutation)
- `data-portal-ignore-click-outside` on dropdown content

### Empty State

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│                    ┌──────────┐                                   │
│                    │  📋 icon │                                   │
│                    └──────────┘                                   │
│                  No action items yet                             │
│         Track follow-ups, proposals, meetings, and               │
│         deliverables for this customer.                          │
│                                                                  │
│                  [ Add First Action Item ]                        │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

- Icon: `ClipboardList` from lucide-react in muted circle
- Title: `text-lg font-semibold text-foreground`
- Description: `text-sm text-muted-foreground max-w-sm`
- Button: Primary, centered

### Loading Skeleton

Follows existing tab skeleton pattern:
```
┌──────────────────────────────────────────────────────────────────┐
│  ███████████████          ██████  ██████  ██████  ████████       │
├──────────────────────────────────────────────────────────────────┤
│  ██████  ██████████████████████████████████  ██████████  ███     │
│          ████████████████                                        │
├──────────────────────────────────────────────────────────────────┤
│  ██████  ██████████████████████████████████  ██████████  ███     │
│          ████████████████                                        │
└──────────────────────────────────────────────────────────────────┘
```

### Action Item Form (Dialog)

```
┌─────────────────────────────────────────────┐
│  Create Action Item                    [✕]  │
├─────────────────────────────────────────────┤
│                                             │
│  Type                                       │
│  [ Follow-up              ▾ ]               │
│                                             │
│  Description *                              │
│  [ Send Q2 pricing proposal            ]    │
│                                             │
│  Due Date                                   │
│  [ 📅 March 1, 2026                   ]    │
│                                             │
│  Status         (edit mode only)            │
│  [ To Do                   ▾ ]              │
│                                             │
│              [ Cancel ] [ Save ]            │
└─────────────────────────────────────────────┘
```

- Dialog title: "Create Action Item" or "Edit Action Item"
- Type: shadcn Select with all 6 types
- Description: shadcn Input (required, min 1 char)
- Due Date: shadcn date picker (optional)
- Status: shadcn Select (only shown when editing, hidden on create - defaults to "To Do")
- Footer: Cancel (ghost) + Save (primary)
- `data-portal-ignore-click-outside` on DialogContent

### Actions Menu (Three-dot Dropdown)

```
  [⋯] →  ┌─────────────┐
          │ ✏️ Edit      │
          │ 🗑️ Delete    │  ← text-destructive
          └─────────────┘
```

- Edit: Opens ActionItemForm dialog in edit mode
- Delete: Opens AlertDialog confirmation

### Delete Confirmation

```
┌─────────────────────────────────────────────┐
│  Delete Action Item                         │
├─────────────────────────────────────────────┤
│  This will permanently delete this action   │
│  item. This action cannot be undone.        │
│                                             │
│              [ Cancel ] [ Delete ]           │
└─────────────────────────────────────────────┘
```

- Standard AlertDialog pattern matching AgreementCard delete confirmation
- Delete button: `bg-destructive text-destructive-foreground`

---

## Responsive Behavior

- **Desktop (>1024px)**: Full row layout with all elements visible
- **Tablet (768-1024px)**: Same layout, filters may wrap to second line
- **Mobile (<768px)**: Filters stack vertically, action item rows stack description and badges

---

## Interaction Summary

| Action | Trigger | Result |
|--------|---------|--------|
| Add action item | Click "+ Add" button | Open create dialog |
| Edit action item | Click Edit in dropdown menu | Open edit dialog |
| Quick status change | Click status badge | Open inline status dropdown |
| Delete action item | Click Delete in dropdown menu | Show confirmation dialog |
| Filter by status | Select from status dropdown | Filter list client-side |
| Filter by type | Select from type dropdown | Filter list client-side |
| Sort items | Click sort toggle | Toggle between due_date and created_at |

---

*This UX/UI spec is an addendum to the main ux-ui-spec.md for the Phase 6 Action Items feature.*
