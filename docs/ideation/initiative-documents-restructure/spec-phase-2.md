# Implementation Spec: Initiative & Documents Restructure - Phase 2

**PRD**: ./prd-phase-2.md
**Estimated Effort**: XL (Extra Large)

## Technical Approach

Phase 2 replaces the two-level drill-down UI (ProjectsTab → ProjectDetail) with a single flat view where all documents are visible, grouped under collapsible initiative sections. This is primarily a frontend refactor with React Query hook renames and a complete UI redesign of the documents tab.

The approach:
1. **Rename all frontend types and hooks** to match the Phase 1 backend rename
2. **Build the new `DocumentsTab` component** as a flat scrollable view with collapsible sections
3. **Build `InitiativeSection` component** — collapsible header + document card list
4. **Redesign document display** from `ArtifactRow` (list item) to `DocumentCard` (minimal card)
5. **Update `DocumentEditor`** (formerly ArtifactEditor) with initiative reassignment dropdown
6. **Rename and update all forms** — `InitiativeForm`, `DocumentForm`

## UX/UI Design Specification

### Design Intent

**Who is this human?** An advisor managing 5-15 active customer initiatives, each with 2-10 documents. They're between client meetings, scanning their workspace to find a specific document or check progress. They need to see everything at a glance without drilling into containers.

**What must they accomplish?** Scan all documents across initiatives, find a specific document, create new documents, reorganize documents between initiatives, manage initiative lifecycle.

**What should this feel like?** A well-organized desk with labeled section dividers — structured but not rigid. The Midnight Architect system's depth-through-surfaces approach applies: initiative sections are subtle surface elevations, not heavy bordered boxes.

### Layout Architecture

```
┌─────────────────────────────────────────────────────┐
│  Documents Tab                                       │
│                                                      │
│  ┌─ Header ────────────────────────────────────────┐ │
│  │  12 Documents across 3 initiatives               │ │
│  │                          [+ New Initiative]  [+ New Document] │
│  └──────────────────────────────────────────────────┘ │
│                                                      │
│  ┌─ Initiative Section (expanded) ──────────────────┐ │
│  │ ▼  Q1 Product Strategy    ● Active    3 docs     │ │
│  │    ┌─────────────────────────────────────────┐   │ │
│  │    │ Product Roadmap 2026   ◉ Final  📋 Roadmap │ │
│  │    ├─────────────────────────────────────────┤   │ │
│  │    │ Competitive Analysis   ◉ Draft  🔍 Research│ │
│  │    ├─────────────────────────────────────────┤   │ │
│  │    │ User Research Findings ◉ Review 👤 Research│ │
│  │    └─────────────────────────────────────────┘   │ │
│  └──────────────────────────────────────────────────┘ │
│                                                      │
│  ┌─ Initiative Section (collapsed) ─────────────────┐ │
│  │ ▶  Website Redesign       ● On Hold   5 docs    │ │
│  └──────────────────────────────────────────────────┘ │
│                                                      │
│  ┌─ General Section ────────────────────────────────┐ │
│  │ ▼  📁 General                          2 docs    │ │
│  │    ┌─────────────────────────────────────────┐   │ │
│  │    │ Meeting Notes Dec      ◉ Draft  📝 Notes  │ │
│  │    ├─────────────────────────────────────────┤   │ │
│  │    │ Quick Strategy Draft   ◉ Draft  📋 Custom │ │
│  │    └─────────────────────────────────────────┘   │ │
│  └──────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Initiative Section Header

The section header is the primary navigation element. It replaces ProjectCard as the initiative-level display.

```
┌──────────────────────────────────────────────────────────┐
│  ▼  Initiative Name                  ● Status   3 docs  ⋯│
└──────────────────────────────────────────────────────────┘
```

**Specifications:**
- **Background**: `bg-card` with `border border-border/30 rounded-lg`
- **Padding**: `px-4 py-3`
- **Chevron**: `ChevronDown` icon, rotates -90deg when collapsed. `text-muted-foreground`, `h-4 w-4`
- **Initiative name**: `text-sm font-semibold text-foreground`
- **Status badge**: Existing `PROJECT_STATUS_COLORS` (renamed to `INITIATIVE_STATUS_COLORS`), `text-xs`
- **Document count**: `text-xs text-muted-foreground`, right-aligned
- **Action menu**: Three-dot menu on hover, `opacity-0 group-hover:opacity-100` — contains Edit, Delete
- **Hover**: `hover:border-primary/20`
- **Click on header (not menu)**: Toggles collapse/expand
- **Transition**: `transition-all duration-200` on chevron rotation and content expand/collapse

### Document Card (Minimal)

Each document displays as a compact row within an expanded section. Not a full bordered card — a list item with subtle hover.

```
┌──────────────────────────────────────────────────────────┐
│  Product Roadmap 2026            ◉ Final    📋 Roadmap   │
└──────────────────────────────────────────────────────────┘
```

**Specifications:**
- **Background**: Transparent (inherits section background), `hover:bg-surface-hover rounded-md`
- **Padding**: `px-3 py-2.5`
- **Title**: `text-sm text-foreground truncate` — takes available space
- **Status badge**: Same status colors as current artifact status badges, `text-xs`
- **Type badge**: Muted style `bg-muted/50 text-muted-foreground text-xs rounded px-1.5 py-0.5`
- **Layout**: `flex items-center gap-3` — title (flex-1), status badge, type badge
- **Click**: Opens DocumentEditor sheet
- **Cursor**: `cursor-pointer`
- **Divider**: `border-b border-border/20` between cards (last child: no border)

### Document Cards Container (within expanded section)

- **Padding**: `px-2 pb-2 pt-1` (inside the section, below header)
- **Animation**: `overflow-hidden` with height animation on collapse/expand using CSS `grid-template-rows: 0fr → 1fr` pattern for smooth animation (no layout thrashing)

### Empty Initiative Section

When an initiative has 0 documents:

```
┌──────────────────────────────────────────────────────────┐
│  ▼  New Initiative               ● Active    0 docs    ⋯│
│     No documents yet. Create one to get started.         │
└──────────────────────────────────────────────────────────┘
```

- Text: `text-xs text-muted-foreground italic px-3 py-4`

### General Section (Phase 2 preview)

In Phase 2, "General" appears as a special section at the bottom for documents without an initiative (initiative_id = NULL). It uses the same section pattern but with slight visual distinction for Phase 3 to build on:

- **Icon**: `FolderOpen` icon instead of chevron prefix area
- **Name**: "General" in `text-muted-foreground` (slightly muted vs initiative names)
- **No status badge** (folders don't have statuses)
- **Background**: Same as initiative sections in Phase 2

### Global Empty State

When no initiatives and no documents exist:

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│              [icon: FileText in muted circle]            │
│                                                          │
│              No documents yet                            │
│    Organize your work into initiatives with strategy     │
│    docs, research, roadmaps, and more.                   │
│                                                          │
│              [Create First Initiative]                    │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Document Creation Flow

The `DocumentForm` dialog includes initiative assignment:

```
┌─ Create Document ────────────────────────────┐
│                                              │
│  Title *                                     │
│  ┌──────────────────────────────────────┐   │
│  │ Enter document title                  │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  Type                                        │
│  ┌──────────────────────────────────────┐   │
│  │ Strategy                          ▼   │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  Initiative                                  │
│  ┌──────────────────────────────────────┐   │
│  │ General                           ▼   │   │
│  └──────────────────────────────────────┘   │
│                                              │
│                    [Cancel]  [Create]         │
└──────────────────────────────────────────────┘
```

- Initiative dropdown lists all initiatives + "General"
- Default: "General"
- Grouped in dropdown: initiatives first (by status), then "General" at bottom

### DocumentEditor Initiative Reassignment

In the DocumentEditor sheet header area, add an "Initiative" dropdown:

```
┌─ DocumentEditor Sheet ───────────────────────────────────┐
│  Type: Strategy ▼    Status: Draft ▼    Initiative: Q1... ▼  │
│  ─────────────────────────────────────────────────────── │
│  Title: [Product Roadmap 2026                          ] │
│  ─────────────────────────────────────────────────────── │
│  [Rich Text Editor content area]                         │
└──────────────────────────────────────────────────────────┘
```

- Same Select component pattern as status dropdown
- Changing value triggers mutation to update document's `initiative_id`
- Invalidates React Query cache for both source and destination sections

## File Changes

### New Files

| File Path | Purpose |
|-----------|---------|
| `frontend/src/features/customers/components/projects/DocumentsTab.tsx` | New flat view replacing ProjectsTab |
| `frontend/src/features/customers/components/projects/InitiativeSection.tsx` | Collapsible initiative section with document list |
| `frontend/src/features/customers/components/projects/DocumentCard.tsx` | Minimal document card (replaces ArtifactRow) |

### Modified Files

| File Path | Changes |
|-----------|---------|
| `frontend/src/features/customers/types/customer.ts` | Rename all types: Project→Initiative, CustomerArtifact→CustomerDocument, status/type enums |
| `frontend/src/features/customers/hooks/useProjects.ts` | Rename to `useInitiatives.ts` — update hook names, API URLs, query keys |
| `frontend/src/features/customers/hooks/useCustomerArtifacts.ts` | Rename to `useCustomerDocuments.ts` — update hook names, API URLs, query keys |
| `frontend/src/features/customers/hooks/useCustomerArtifactSearch.ts` | Rename to `useCustomerDocumentSearch.ts` |
| `frontend/src/features/customers/stores/customerStore.ts` | Rename `selectedProjectIds` → `selectedInitiativeIds` (or remove if no longer needed) |
| `frontend/src/features/customers/components/projects/ProjectForm.tsx` | Rename to `InitiativeForm.tsx` — update labels, types |
| `frontend/src/features/customers/components/projects/ArtifactForm.tsx` | Rename to `DocumentForm.tsx` — add initiative assignment dropdown |
| `frontend/src/features/customers/components/projects/ArtifactEditor.tsx` | Rename to `DocumentEditor.tsx` — add initiative reassignment dropdown |
| `frontend/src/features/customers/components/projects/index.ts` | Update all exports |
| Any parent component importing ProjectsTab | Update to import DocumentsTab |

### Deleted Files

| File Path | Reason |
|-----------|--------|
| `frontend/src/features/customers/components/projects/ProjectsTab.tsx` | Replaced by DocumentsTab |
| `frontend/src/features/customers/components/projects/ProjectCard.tsx` | Replaced by InitiativeSection header |
| `frontend/src/features/customers/components/projects/ProjectDetail.tsx` | Removed — flat view replaces drill-down |
| `frontend/src/features/customers/components/projects/ArtifactRow.tsx` | Replaced by DocumentCard |

## Implementation Details

### 1. Frontend Types Rename

**Pattern to follow**: `frontend/src/features/customers/types/customer.ts`

```typescript
// Renamed types
export interface Initiative {
  id: string
  customer_id: string
  name: string
  description: string | null
  status: InitiativeStatus
  agreement_id: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface InitiativeWithCounts extends Initiative {
  documents_count: number
}

export type InitiativeStatus = 'active' | 'on_hold' | 'completed'

export interface CustomerDocument {
  id: string
  initiative_id: string | null  // nullable — can be in folder only
  customer_id: string
  folder_id: string | null      // added for Phase 3
  type: DocumentType
  title: string
  content: string
  status: DocumentStatus
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type DocumentType = 'strategy' | 'research' | 'roadmap' | 'competitive_analysis'
  | 'user_research' | 'product_spec' | 'meeting_notes' | 'presentation' | 'ideation' | 'custom'

export type DocumentStatus = 'draft' | 'in_progress' | 'review' | 'final' | 'archived'

// Status display constants (renamed)
export const INITIATIVE_STATUS_LABELS: Record<InitiativeStatus, string> = {
  active: 'Active',
  on_hold: 'On Hold',
  completed: 'Completed',
}

export const INITIATIVE_STATUS_COLORS: Record<InitiativeStatus, string> = {
  // Same values as current PROJECT_STATUS_COLORS
}

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = { ... }
export const DOCUMENT_STATUS_COLORS: Record<DocumentStatus, string> = { ... }
export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = { ... }
export const DOCUMENT_TYPE_COLORS: Record<DocumentType, string> = { ... }
```

### 2. React Query Hooks Rename

**Pattern to follow**: `frontend/src/features/customers/hooks/useProjects.ts`

```typescript
// useInitiatives.ts
export const initiativeKeys = {
  all: (customerId: string) => [...customerKeys.detail(customerId), 'initiatives'] as const,
  list: (customerId: string) => [...initiativeKeys.all(customerId), 'list'] as const,
  detail: (customerId: string, initiativeId: string) =>
    [...initiativeKeys.all(customerId), 'detail', initiativeId] as const,
}

export function useInitiatives(customerId: string) {
  // Same logic, updated API URL: /api/customers/${customerId}/initiatives
}

export function useCreateInitiative(customerId: string) { ... }
export function useUpdateInitiative(customerId: string) { ... }
export function useDeleteInitiative(customerId: string) { ... }
```

```typescript
// useCustomerDocuments.ts
export const customerDocumentKeys = {
  all: (customerId: string) => [...customerKeys.detail(customerId), 'documents'] as const,
  list: (customerId: string) => [...customerDocumentKeys.all(customerId), 'list'] as const,
  byInitiative: (customerId: string, initiativeId: string) =>
    [...initiativeKeys.detail(customerId, initiativeId), 'documents', 'list'] as const,
}

// New hook: fetch ALL documents for a customer (flat list for grouping in UI)
export function useCustomerDocuments(customerId: string) {
  // GET /api/customers/${customerId}/documents
  // Returns all documents across all initiatives + unassigned
}

// Update document's initiative assignment
export function useReassignDocument(customerId: string) {
  return useMutation({
    mutationFn: async ({ documentId, initiativeId, folderId }: ReassignInput) => {
      // PUT /api/customers/${customerId}/documents/${documentId}
      // body: { initiative_id: initiativeId, folder_id: folderId }
    },
    onSuccess: () => {
      // Invalidate all document lists to refresh grouping
      queryClient.invalidateQueries({ queryKey: customerDocumentKeys.all(customerId) })
      queryClient.invalidateQueries({ queryKey: initiativeKeys.list(customerId) })
    },
  })
}
```

### 3. DocumentsTab Component

**Overview**: The main tab component that replaces ProjectsTab. Fetches all initiatives and all documents, groups documents by initiative, and renders collapsible sections.

```typescript
// DocumentsTab.tsx
interface DocumentsTabProps {
  customerId: string
}

export function DocumentsTab({ customerId }: DocumentsTabProps) {
  const { data: initiatives = [], isLoading: initiativesLoading } = useInitiatives(customerId)
  const { data: documents = [], isLoading: documentsLoading } = useCustomerDocuments(customerId)
  const { data: agreements = [] } = useAgreements(customerId)

  // Group documents by initiative_id
  const documentsByInitiative = useMemo(() => {
    const grouped: Record<string, CustomerDocument[]> = {}
    const unassigned: CustomerDocument[] = []

    documents.forEach(doc => {
      if (doc.initiative_id) {
        if (!grouped[doc.initiative_id]) grouped[doc.initiative_id] = []
        grouped[doc.initiative_id].push(doc)
      } else {
        unassigned.push(doc)
      }
    })

    return { grouped, unassigned }
  }, [documents])

  // Sort initiatives: active first, then on_hold, then completed
  const sortedInitiatives = useMemo(() => {
    const statusOrder: Record<InitiativeStatus, number> = { active: 0, on_hold: 1, completed: 2 }
    return [...initiatives].sort((a, b) => statusOrder[a.status] - statusOrder[b.status])
  }, [initiatives])

  // Collapse state (session only)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  const toggleSection = (id: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ... render header, initiative sections, general section
}
```

**Key decisions**:
- All data fetched at tab level (initiatives + all documents) — grouped client-side for instant UI
- Collapse state is session-only (useState, not persisted)
- Documents sorted by `updated_at DESC` within each section

### 4. InitiativeSection Component

**Overview**: Collapsible section displaying an initiative header and its document cards.

```typescript
interface InitiativeSectionProps {
  initiative: InitiativeWithCounts
  documents: CustomerDocument[]
  isCollapsed: boolean
  onToggle: () => void
  onEdit: (initiative: InitiativeWithCounts) => void
  onDelete: (id: string) => void
  onDocumentClick: (document: CustomerDocument) => void
  agreementLabel?: string | null
}

export function InitiativeSection({ ... }: InitiativeSectionProps) {
  return (
    <div className="rounded-lg border border-border/30 bg-card">
      {/* Header — clickable to toggle */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left group
                   hover:border-primary/20 transition-colors"
      >
        <ChevronDown className={cn(
          "h-4 w-4 text-muted-foreground transition-transform duration-200",
          isCollapsed && "-rotate-90"
        )} />
        <span className="text-sm font-semibold text-foreground flex-1 truncate">
          {initiative.name}
        </span>
        <StatusBadge status={initiative.status} />
        <span className="text-xs text-muted-foreground">
          {documents.length} {documents.length === 1 ? 'doc' : 'docs'}
        </span>
        {/* Action menu - appears on hover */}
        <ActionMenu onEdit onDelete />
      </button>

      {/* Expandable content */}
      <div className={cn(
        "grid transition-all duration-200",
        isCollapsed ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
      )}>
        <div className="overflow-hidden">
          <div className="px-2 pb-2 pt-1">
            {documents.length === 0 ? (
              <p className="text-xs text-muted-foreground italic px-3 py-4">
                No documents yet. Create one to get started.
              </p>
            ) : (
              documents.map((doc, i) => (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  isLast={i === documents.length - 1}
                  onClick={() => onDocumentClick(doc)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```

### 5. DocumentCard Component

**Overview**: Minimal card displaying title, status, and type.

```typescript
interface DocumentCardProps {
  document: CustomerDocument
  isLast: boolean
  onClick: () => void
}

export function DocumentCard({ document, isLast, onClick }: DocumentCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-md",
        "hover:bg-surface-hover cursor-pointer transition-colors",
        !isLast && "border-b border-border/20"
      )}
    >
      <span className="text-sm text-foreground truncate flex-1">
        {document.title}
      </span>
      <span className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        DOCUMENT_STATUS_COLORS[document.status]
      )}>
        {DOCUMENT_STATUS_LABELS[document.status]}
      </span>
      <span className="bg-muted/50 text-muted-foreground text-xs rounded px-1.5 py-0.5 whitespace-nowrap">
        {DOCUMENT_TYPE_LABELS[document.type]}
      </span>
    </button>
  )
}
```

### 6. DocumentForm (with Initiative Assignment)

**Pattern to follow**: `frontend/src/features/customers/components/projects/ArtifactForm.tsx`

Add initiative dropdown to the existing form:

```typescript
// New field in DocumentForm
<FormField
  control={form.control}
  name="initiative_id"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Initiative</FormLabel>
      <Select onValueChange={field.onChange} defaultValue={field.value || 'general'}>
        <SelectTrigger>
          <SelectValue placeholder="Select initiative" />
        </SelectTrigger>
        <SelectContent data-portal-ignore-click-outside>
          {/* Initiatives grouped by status */}
          {initiatives.map(init => (
            <SelectItem key={init.id} value={init.id}>
              {init.name}
            </SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value="general">General</SelectItem>
        </SelectContent>
      </Select>
    </FormItem>
  )}
/>
```

### 7. DocumentEditor Initiative Reassignment

**Pattern to follow**: Existing status dropdown in `ArtifactEditor.tsx`

Add alongside the existing status dropdown in the header:

```typescript
// In DocumentEditor header area, after status dropdown
<Select
  value={document.initiative_id || 'general'}
  onValueChange={(value) => {
    reassignDocument.mutate({
      documentId: document.id,
      initiativeId: value === 'general' ? null : value,
      folderId: value === 'general' ? generalFolderId : null,
    })
  }}
>
  <SelectTrigger className="w-[180px] h-8 text-xs">
    <SelectValue />
  </SelectTrigger>
  <SelectContent data-portal-ignore-click-outside>
    {initiatives.map(init => (
      <SelectItem key={init.id} value={init.id}>{init.name}</SelectItem>
    ))}
    <SelectSeparator />
    <SelectItem value="general">General</SelectItem>
  </SelectContent>
</Select>
```

### 8. Zustand Store Updates

```typescript
// customerStore.ts - simplified
interface CustomerStore {
  activeCustomerId: string | null
  activeTab: CustomerTab | null
  // Remove selectedProjectIds — no longer needed (no drill-down)
  setActiveCustomer: (id: string | null) => void
  setActiveTab: (tab: CustomerTab | null) => void
}
```

**Key decision**: `selectedProjectIds` is removed because the flat view doesn't have a "selected project" concept. The DocumentEditor sheet handles individual document editing.

## Testing Requirements

### Unit Tests

| Test File | Coverage |
|-----------|----------|
| `frontend/src/features/customers/components/projects/__tests__/DocumentsTab.test.tsx` | Tab rendering, grouping, collapse/expand |
| `frontend/src/features/customers/components/projects/__tests__/InitiativeSection.test.tsx` | Section header, collapse animation, action menu |
| `frontend/src/features/customers/components/projects/__tests__/DocumentCard.test.tsx` | Card display, click handler |

**Key test cases**:
- Documents are correctly grouped by initiative_id
- Unassigned documents appear in General section
- Empty initiatives show empty state text
- Collapse/expand toggles correctly
- Initiative delete shows correct warning (move to General, not cascade)
- Document creation includes initiative assignment

### Manual Testing

- [ ] All documents visible in flat view grouped by initiative
- [ ] Sections collapse/expand with smooth animation
- [ ] Clicking document card opens DocumentEditor
- [ ] Creating a document with initiative assignment works
- [ ] Reassigning a document via DocumentEditor dropdown moves it between sections
- [ ] Deleting initiative shows "documents will move to General" warning
- [ ] After initiative delete, documents appear in General section
- [ ] Empty state shows when no initiatives or documents exist
- [ ] Tab label reads "Documents"
- [ ] All portaled components have `data-portal-ignore-click-outside`
- [ ] Auto-save still works in DocumentEditor
- [ ] Referenced-by feature still works in DocumentEditor
- [ ] Sheet resize still works in DocumentEditor

## Error Handling

| Error Scenario | Handling Strategy |
|----------------|-------------------|
| Failed to fetch initiatives or documents | Show error toast, display stale data if available |
| Document reassignment fails | Show error toast, revert optimistic update |
| Initiative delete fails | Show error toast, keep initiative in list |
| Document creation fails | Show error toast, keep form open with data |

## Validation Commands

```bash
# Type checking
cd frontend && npx tsc --noEmit

# Run tests
cd frontend && npm run test

# Build
cd frontend && npm run build

# Visual verification
npm run dev:frontend  # Open browser, navigate to customer → Documents tab
```

## Rollout Considerations

- **No feature flag**: Ships to all users
- **Rollback plan**: Revert frontend changes — backend API is backward-compatible in naming only
- **Monitoring**: Watch for console errors related to React Query cache keys

## Open Items

- [ ] Decide if General section appears at top or bottom (recommendation: bottom)
- [ ] Verify all parent components importing ProjectsTab are updated

---

*This spec is ready for implementation. Follow the patterns and validate at each step.*
