# Implementation Spec: Initiative & Documents Restructure - Phase 3

**PRD**: ./prd-phase-3.md
**Estimated Effort**: L (Large)

## Technical Approach

Phase 3 adds three feature layers on top of the Phase 2 flat view:

1. **Predefined folder system** — Folder sections appear below initiative sections with visual distinction. Global defaults managed via DB, per-customer overrides supported.
2. **Filtering** — Client-side filter bar with three controls: initiative status, name search, document status. No API calls — filters operate on already-loaded data.
3. **AI chat integration** — Update AI agent prompts to use new terminology and add initiative inference logic that analyzes conversation context to auto-assign documents.

## UX/UI Design Specification

### Folder Sections — Visual Distinction

Folder sections look similar to initiative sections but with deliberate visual differences:

```
┌─ Initiative sections (top) ──────────────────────────────┐
│  ▼  Q1 Product Strategy    ● Active    3 docs          ⋯│
│     [document cards...]                                   │
├──────────────────────────────────────────────────────────┤
│  ▼  Website Redesign       ● On Hold   5 docs          ⋯│
│     [document cards...]                                   │
└──────────────────────────────────────────────────────────┘

┌─ Folder sections (bottom) ───────────────────────────────┐
│  📁 Pricing                               2 docs        ⋯│
│     [document cards...]                                   │
├──────────────────────────────────────────────────────────┤
│  📁 Status Meetings                       4 docs         │
│     [document cards...]                                   │
├──────────────────────────────────────────────────────────┤
│  📁 General                               1 doc          │
│     [document cards...]                                   │
└──────────────────────────────────────────────────────────┘
```

**Folder section header differences from initiative sections:**
- **Icon**: `FolderOpen` icon (`h-4 w-4 text-muted-foreground`) instead of no icon
- **Name**: `text-sm font-medium text-muted-foreground` (medium weight, muted — vs semibold foreground for initiatives)
- **No status badge**: Folders don't have statuses
- **Border**: `border-border/20` (lighter than initiative's `border-border/30`)
- **Background**: `bg-muted/5` (extremely subtle muted tint vs initiative's `bg-card`)
- **Document count**: Same style as initiatives
- **Action menu**: Only on non-system folders (no actions on General)

**Section separator:**
- A subtle label between initiatives and folders: "Folders" in `text-xs text-muted-foreground uppercase tracking-wider` with `my-4`

### Filter Bar

Positioned below the header, above sections:

```
┌─ Header ────────────────────────────────────────────────┐
│  12 Documents across 3 initiatives                       │
│                          [+ New Initiative] [+ New Doc]  │
└──────────────────────────────────────────────────────────┘

┌─ Filter Bar ────────────────────────────────────────────┐
│  [Status: All ▼]  [🔍 Search initiatives...]  [Docs: All ▼] │
└──────────────────────────────────────────────────────────┘

[sections below...]
```

**Specifications:**
- **Container**: `flex items-center gap-2 mb-4`
- **Initiative status dropdown**: `Select` component, `w-[140px] h-8 text-xs`. Options: All, Active, On Hold, Completed
- **Name search**: `Input` component, `w-[200px] h-8 text-xs placeholder:text-muted-foreground`, search icon left, clear button when has value
- **Document status dropdown**: `Select` component, `w-[140px] h-8 text-xs`. Options: All, Draft, In Progress, Review, Final, Archived
- **Active filter indicator**: When any filter is active, show a small "Clear filters" link after the controls: `text-xs text-primary cursor-pointer hover:underline`

**Filter behavior:**
- Filters are AND logic (all must match)
- Initiative status filter: shows/hides initiative sections by status. Folder sections always visible.
- Name search: filters initiative sections AND folder sections by name (case-insensitive contains)
- Document status filter: within visible sections, shows/hides individual document cards by status
- If a section has no matching documents after doc status filter, hide the entire section
- Empty initiatives (0 docs) are hidden when doc status filter is active (they can't match)
- Empty state when all sections filtered out: "No documents match your filters" + "Clear filters" button
- Filter state in `useState` — resets on navigation

### Folder Management UI

Folder management via a popover accessible from a gear icon next to "Folders" section label:

```
     Folders ⚙
              ┌───────────────────────────┐
              │ Manage Folders            │
              │ ─────────────────────────│
              │ ✏️ Pricing          [🗑]  │
              │ ✏️ Status Meetings  [🗑]  │
              │ ✏️ Vision           [🗑]  │
              │    General         (🔒)  │
              │ ─────────────────────────│
              │ [+ Add folder]            │
              └───────────────────────────┘
```

**Specifications:**
- Popover trigger: `Settings` icon (`h-3.5 w-3.5 text-muted-foreground`) next to "Folders" label
- Popover content: `data-portal-ignore-click-outside`, `w-[260px]`
- Each folder row: folder name (inline editable on click), delete button (trash icon)
- General folder: name shown but grayed out, lock icon instead of delete (undeletable)
- Add folder: text input appears inline, Enter to save, Escape to cancel
- Delete confirmation: inline "Move docs to General?" with confirm/cancel

## File Changes

### New Files

| File Path | Purpose |
|-----------|---------|
| `frontend/src/features/customers/components/projects/FolderSection.tsx` | Collapsible folder section (visual variant of InitiativeSection) |
| `frontend/src/features/customers/components/projects/DocumentsFilterBar.tsx` | Filter bar with 3 controls |
| `frontend/src/features/customers/components/projects/FolderManager.tsx` | Popover for managing folders |
| `frontend/src/features/customers/hooks/useDocumentFolders.ts` | React Query hooks for folder CRUD |

### Modified Files

| File Path | Changes |
|-----------|---------|
| `frontend/src/features/customers/components/projects/DocumentsTab.tsx` | Add folder sections below initiatives, integrate filter bar, fetch folders |
| `frontend/src/features/customers/components/projects/DocumentForm.tsx` | Update initiative dropdown to include folders as separate group |
| `frontend/src/features/customers/components/projects/DocumentEditor.tsx` | Update reassignment dropdown to include folders |
| `frontend/src/features/customers/types/customer.ts` | Add DocumentFolder type |
| `backend/src/controllers/customer-ai.controller.ts` | Pass initiatives list in screenContext |
| `backend/src/services/ai/agents/customer-mgmt/prompt/customerAgentPrompts.ts` | Update terminology, add initiative inference instructions |
| `frontend/src/features/portfolio/` (multiple files) | Update references from customerArtifact → customerDocument types |

## Implementation Details

### 1. FolderSection Component

**Pattern to follow**: `InitiativeSection.tsx` from Phase 2

```typescript
interface FolderSectionProps {
  folder: DocumentFolder
  documents: CustomerDocument[]
  isCollapsed: boolean
  onToggle: () => void
  onDocumentClick: (document: CustomerDocument) => void
  onRename?: (folderId: string, newName: string) => void
  onDelete?: (folderId: string) => void
}

export function FolderSection({ folder, documents, ... }: FolderSectionProps) {
  return (
    <div className="rounded-lg border border-border/20 bg-muted/5">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left group transition-colors"
      >
        <FolderOpen className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground flex-1 truncate">
          {folder.name}
        </span>
        <span className="text-xs text-muted-foreground">
          {documents.length} {documents.length === 1 ? 'doc' : 'docs'}
        </span>
        {/* Action menu only for non-system folders */}
        {!folder.is_system && <ActionMenu onRename onDelete />}
      </button>
      {/* Same expandable content pattern as InitiativeSection */}
    </div>
  )
}
```

### 2. DocumentsFilterBar Component

```typescript
interface DocumentsFilterBarProps {
  initiativeStatusFilter: InitiativeStatus | null
  onInitiativeStatusChange: (status: InitiativeStatus | null) => void
  nameSearch: string
  onNameSearchChange: (value: string) => void
  documentStatusFilter: DocumentStatus | null
  onDocumentStatusChange: (status: DocumentStatus | null) => void
  hasActiveFilters: boolean
  onClearFilters: () => void
}

export function DocumentsFilterBar({ ... }: DocumentsFilterBarProps) {
  return (
    <div className="flex items-center gap-2 mb-4">
      {/* Initiative Status */}
      <Select value={initiativeStatusFilter || 'all'} onValueChange={...}>
        <SelectTrigger className="w-[140px] h-8 text-xs">
          <SelectValue placeholder="Status: All" />
        </SelectTrigger>
        <SelectContent data-portal-ignore-click-outside>
          <SelectItem value="all">All Statuses</SelectItem>
          {Object.entries(INITIATIVE_STATUS_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Name Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={nameSearch}
          onChange={(e) => onNameSearchChange(e.target.value)}
          placeholder="Search initiatives..."
          className="w-[200px] h-8 text-xs pl-8"
        />
        {nameSearch && (
          <button onClick={() => onNameSearchChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2">
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Document Status */}
      <Select value={documentStatusFilter || 'all'} onValueChange={...}>
        <SelectTrigger className="w-[140px] h-8 text-xs">
          <SelectValue placeholder="Docs: All" />
        </SelectTrigger>
        <SelectContent data-portal-ignore-click-outside>
          <SelectItem value="all">All Doc Status</SelectItem>
          {Object.entries(DOCUMENT_STATUS_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear filters */}
      {hasActiveFilters && (
        <button onClick={onClearFilters}
          className="text-xs text-primary hover:underline ml-1">
          Clear filters
        </button>
      )}
    </div>
  )
}
```

### 3. Filter Logic in DocumentsTab

```typescript
// In DocumentsTab — filter logic
const filteredInitiatives = useMemo(() => {
  let filtered = sortedInitiatives

  // Filter by initiative status
  if (initiativeStatusFilter) {
    filtered = filtered.filter(i => i.status === initiativeStatusFilter)
  }

  // Filter by name search
  if (nameSearch) {
    const search = nameSearch.toLowerCase()
    filtered = filtered.filter(i => i.name.toLowerCase().includes(search))
  }

  return filtered
}, [sortedInitiatives, initiativeStatusFilter, nameSearch])

const filteredFolders = useMemo(() => {
  if (!nameSearch) return folders
  const search = nameSearch.toLowerCase()
  return folders.filter(f => f.name.toLowerCase().includes(search))
}, [folders, nameSearch])

// Filter documents within each section by document status
const filterDocuments = useCallback((docs: CustomerDocument[]) => {
  if (!documentStatusFilter) return docs
  return docs.filter(d => d.status === documentStatusFilter)
}, [documentStatusFilter])

// Hide sections with 0 filtered documents (when doc filter active)
const visibleInitiatives = filteredInitiatives.filter(i => {
  if (!documentStatusFilter) return true // show empty initiatives when no doc filter
  const docs = filterDocuments(documentsByInitiative.grouped[i.id] || [])
  return docs.length > 0
})
```

### 4. useDocumentFolders Hook

```typescript
// useDocumentFolders.ts
export const folderKeys = {
  all: (customerId: string) => ['document-folders', customerId] as const,
  list: (customerId: string) => [...folderKeys.all(customerId), 'list'] as const,
}

export function useDocumentFolders(customerId: string) {
  return useQuery({
    queryKey: folderKeys.list(customerId),
    queryFn: async () => {
      const { data } = await api.get(`/api/document-folders?customerId=${customerId}`, { token })
      return data as DocumentFolder[]
    },
  })
}

export function useCreateFolder(customerId: string) { ... }
export function useUpdateFolder(customerId: string) { ... }
export function useDeleteFolder(customerId: string) { ... }
```

### 5. AI Chat Initiative Inference

**Updated AI agent prompt** (in `customerAgentPrompts.ts`):

```typescript
// Add to the system prompt for customer AI chat
const initiativeInferenceInstruction = `
When creating a document for this customer, you must determine which initiative
it belongs to. Analyze the conversation context and the customer's existing initiatives
to select the most relevant one.

Available initiatives for this customer:
{{initiatives_list}}

Rules:
1. If the conversation clearly relates to an existing initiative (by topic, goals, or name), assign the document to that initiative.
2. If the user explicitly mentions an initiative name, use that one.
3. If you cannot confidently determine the initiative, assign the document to the "General" folder (set initiative_id to null, folder_id to the General folder ID).
4. Never create a new initiative — only assign to existing ones or General.

Include your initiative assignment in the document creation tool call:
- initiative_id: The ID of the matching initiative, or null for General
- folder_id: null if assigning to an initiative, or the General folder ID if no initiative matches
`
```

**Backend changes** (in `customer-ai.controller.ts`):

```typescript
// When preparing screenContext for AI chat, include initiatives
const initiatives = await initiativeService.listInitiatives(customerId)
const generalFolder = await documentFolderService.getDefaultFolder(customerId)

screenContext.availableInitiatives = initiatives.map(i => ({
  id: i.id,
  name: i.name,
  status: i.status,
  description: i.description,
}))
screenContext.generalFolderId = generalFolder.id
```

### 6. Portfolio Frontend Updates

Update all portfolio frontend references to customer artifacts:

```typescript
// In portfolio components that reference customer artifacts:
// - Update type imports: CustomerArtifact → CustomerDocument
// - Update hook imports: useCustomerArtifactSearch → useCustomerDocumentSearch
// - Update display labels: "artifact" → "document"
// - Update variable names throughout
```

## Testing Requirements

### Unit Tests

| Test File | Coverage |
|-----------|----------|
| `frontend/src/features/customers/components/projects/__tests__/FolderSection.test.tsx` | Folder section rendering, visual distinction |
| `frontend/src/features/customers/components/projects/__tests__/DocumentsFilterBar.test.tsx` | Filter controls, clear filters |
| `frontend/src/features/customers/components/projects/__tests__/FolderManager.test.tsx` | Add/rename/delete folders, General protection |

**Key test cases**:
- Folder sections render below initiative sections
- Folder sections have folder icon, no status badge
- General folder cannot be deleted (no delete action in UI)
- Filters are AND logic — combining status + name + doc status
- Sections with 0 matching docs are hidden when filter active
- Clear filters resets all three controls
- AI chat creates documents with initiative assignment
- Portfolio components use updated document types

### Manual Testing

- [ ] Folder sections appear below initiatives with visual distinction
- [ ] General folder always present, cannot be deleted
- [ ] Can add custom folders via folder manager popover
- [ ] Can rename non-system folders inline
- [ ] Can delete non-system folders — documents move to General
- [ ] Filter by initiative status works (hides/shows initiative sections)
- [ ] Filter by name search works (filters both initiatives and folders)
- [ ] Filter by document status works (filters cards within sections)
- [ ] Combined filters work (AND logic)
- [ ] "No documents match your filters" empty state shows correctly
- [ ] Clear filters resets everything
- [ ] AI chat creates documents in the correct initiative
- [ ] AI chat falls back to General when initiative unclear
- [ ] Portfolio "Referenced by" still works with renamed types
- [ ] All portaled components have `data-portal-ignore-click-outside`

## Error Handling

| Error Scenario | Handling Strategy |
|----------------|-------------------|
| Folder CRUD fails | Show error toast, revert optimistic update |
| AI initiative inference fails | Fall back to General folder silently |
| Folder manager: duplicate name | Show inline error "A folder with this name already exists" |
| Portfolio reference link broken | Graceful fallback — show document title without link |

## Validation Commands

```bash
# Type checking (both frontend and backend)
cd frontend && npx tsc --noEmit
cd backend && npx tsc --noEmit

# Run tests
cd frontend && npm run test
cd backend && npm run test

# Build both
npm run build

# Visual verification
npm run dev  # Full stack, test filtering, folder management, AI chat
```

## Rollout Considerations

- **No feature flag**: Ships to all users
- **Rollback plan**: Revert frontend changes — folder data in DB is harmless if UI reverts
- **Monitoring**: Watch AI document creation logs for initiative assignment accuracy
- **Post-launch**: Define initial default folder names based on user feedback

## Open Items

- [ ] Define initial default folder names (user deferred — start with just General)
- [ ] Decide if AI confidence threshold should be configurable
- [ ] Consider adding a "Recently created" or "Unsorted" smart filter in future

---

*This spec is ready for implementation. Follow the patterns and validate at each step.*
