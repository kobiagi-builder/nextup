# Implementation Spec: LinkedIn Team Extraction - Phase 2

**PRD**: ./prd-phase-2.md
**Estimated Effort**: M

## Technical Approach

Phase 2 adds the frontend UI for the team extraction feature. The approach follows existing patterns: a new React Query mutation hook for the sync endpoint, updated `TeamSection` with sync button + source badges, and error icons in `CustomerInfoSection` for URL validation feedback.

Key design decisions: (1) `TeamSection` receives the full customer object (not just the team array) so it can access `linkedin_company_url` for button enablement and `enrichment_errors` for icon display; (2) source badges are purely display — a `text-xs` "via LinkedIn" label next to linkedin_scrape members; (3) hidden members are filtered at the OverviewTab level before passing to TeamSection.

## File Changes

### New Files

| File Path | Purpose |
|-----------|---------|
| None | All changes are additions to existing files |

### Modified Files

| File Path | Changes |
|-----------|---------|
| `frontend/src/features/customers/types/customer.ts` | Add `source`, `hidden` to `TeamMember`; add `enrichment_errors` to `CustomerInfo`; add `TeamSyncResult` type |
| `frontend/src/features/customers/hooks/useCustomers.ts` | Add `useSyncTeamFromLinkedIn` mutation hook |
| `frontend/src/features/customers/components/overview/TeamSection.tsx` | Add sync button, source badges, accept `customerInfo` prop |
| `frontend/src/features/customers/components/overview/CustomerInfoSection.tsx` | Add AlertCircle error icons next to LinkedIn URL and Website URL |
| `frontend/src/features/customers/components/overview/OverviewTab.tsx` | Filter hidden members before passing to TeamSection, pass customerInfo |

## Implementation Details

### 1. Frontend Type Updates

**File**: `frontend/src/features/customers/types/customer.ts`

```typescript
// Updated TeamMember (lines 104-110)
export interface TeamMember {
  name: string
  role?: string
  email?: string
  notes?: string
  linkedin_url?: string
  source?: 'manual' | 'linkedin_scrape'  // NEW
  hidden?: boolean                         // NEW
}

// Add to CustomerInfo interface (after line 135)
export interface CustomerInfo {
  // ... existing fields ...
  enrichment_errors?: {                   // NEW
    linkedin?: string
    website?: string
  }
}

// NEW — add after CustomerInfo
export interface TeamSyncResult {
  added: number
  removed: number
  total: number
  members: TeamMember[]
}
```

### 2. Sync Mutation Hook

**File**: `frontend/src/features/customers/hooks/useCustomers.ts`

**Pattern to follow**: `useUpdateCustomer` hook (lines 132-146)

```typescript
// Add import for TeamSyncResult
import type {
  // ... existing imports ...
  TeamSyncResult,
} from '../types'

/**
 * Sync team members from LinkedIn People page.
 * Calls POST /api/customers/:id/sync-team-from-linkedin
 */
export function useSyncTeamFromLinkedIn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (customerId: string) => {
      return api.post<TeamSyncResult>(`/api/customers/${customerId}/sync-team-from-linkedin`, {})
    },
    onSuccess: (_data, customerId) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.detail(customerId) })
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() })
    },
  })
}
```

### 3. TeamSection Updates

**File**: `frontend/src/features/customers/components/overview/TeamSection.tsx`

**Changes**:
1. Accept new props: `customerId`, `linkedinCompanyUrl`, `enrichmentErrors`
2. Add "Sync from LinkedIn" button with disabled state + tooltip
3. Show "via LinkedIn" badge on linkedin_scrape members
4. Set `source: 'manual'` on manually-added members

```typescript
// Updated imports
import { useState } from 'react'
import { Plus, Pencil, Trash2, X, Check, ExternalLink, Linkedin, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useToast } from '@/hooks/use-toast'
import { useSyncTeamFromLinkedIn } from '../../hooks/useCustomers'
import type { TeamMember } from '../../types'

// Updated props
interface TeamSectionProps {
  team: TeamMember[]
  onSave: (team: TeamMember[]) => void
  isSaving?: boolean
  customerId?: string                    // NEW — for sync mutation
  linkedinCompanyUrl?: string            // NEW — for button enablement
}
```

**TeamMemberRow update** — add source badge:

```typescript
function TeamMemberRow({
  member,
  onEdit,
  onDelete,
}: {
  member: TeamMember
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-muted/50 group">
      <div className="min-w-0 shrink-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium text-foreground">{member.name}</p>
          {member.linkedin_url && (
            <a
              href={member.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[#0A66C2] hover:text-[#004182] transition-colors"
              title="View LinkedIn profile"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {/* Source badge for LinkedIn-scraped members */}
          {member.source === 'linkedin_scrape' && (
            <span className="inline-flex items-center gap-0.5 text-xs text-[#0A66C2]/60">
              <Linkedin className="h-2.5 w-2.5" />
              via LinkedIn
            </span>
          )}
        </div>
        {member.role && <p className="text-xs text-muted-foreground">{member.role}</p>}
        {member.email && <p className="text-xs text-muted-foreground">{member.email}</p>}
      </div>
      {member.notes && (
        <p className="text-xs text-muted-foreground italic truncate max-w-[250px]">{member.notes}</p>
      )}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0">
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onEdit}>
          <Pencil className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={onDelete}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}
```

**TeamSection body** — add sync button:

```typescript
export function TeamSection({ team, onSave, isSaving, customerId, linkedinCompanyUrl }: TeamSectionProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const { toast } = useToast()
  const syncMutation = useSyncTeamFromLinkedIn()

  // Determine if sync button should be enabled
  const hasValidLinkedInUrl = !!linkedinCompanyUrl && linkedinCompanyUrl.includes('linkedin.com/company/')
  const canSync = !!customerId && hasValidLinkedInUrl && !syncMutation.isPending

  const handleSync = async () => {
    if (!customerId) return
    try {
      const result = await syncMutation.mutateAsync(customerId)
      toast({
        title: 'Team synced',
        description: `${result.added} added, ${result.removed} removed`,
      })
    } catch {
      toast({
        title: 'Sync failed',
        description: 'Could not sync team from LinkedIn. Try again later.',
        variant: 'destructive',
      })
    }
  }

  // Set source: 'manual' on manually-added members
  const handleAddMember = (member: TeamMemberFormState) => {
    const newTeam = [...team, {
      name: member.name.trim(),
      role: member.role.trim() || undefined,
      email: member.email.trim() || undefined,
      notes: member.notes.trim() || undefined,
      linkedin_url: member.linkedin_url.trim() || undefined,
      source: 'manual' as const,
    }]
    onSave(newTeam)
    setIsAdding(false)
  }

  // ... handleEditMember, handleDeleteMember unchanged ...

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Team Members</h3>
        <div className="flex items-center gap-1">
          {/* Sync from LinkedIn button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSync}
                    disabled={!canSync}
                    className="gap-1"
                  >
                    {syncMutation.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Linkedin className="h-3 w-3" />
                    )}
                    Sync
                  </Button>
                </span>
              </TooltipTrigger>
              {!hasValidLinkedInUrl && (
                <TooltipContent data-portal-ignore-click-outside>
                  Add a LinkedIn company URL to sync team members
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>

          {/* Existing Add button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAdding(true)}
            disabled={isAdding || isSaving}
            className="gap-1"
          >
            <Plus className="h-3 w-3" />
            Add
          </Button>
        </div>
      </div>

      {/* ... rest of team list rendering unchanged ... */}
    </div>
  )
}
```

### 4. URL Error Icons in CustomerInfoSection

**File**: `frontend/src/features/customers/components/overview/CustomerInfoSection.tsx`

**Changes**: Add `AlertCircle` icon next to LinkedIn URL and Website URL when there's a validation error or enrichment failure.

```typescript
// Add imports
import { Pencil, Check, Plus, X, Linkedin, Globe, ExternalLink, AlertCircle } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
```

**URL validation helper** (add above the component):

```typescript
function isValidLinkedInCompanyUrl(url: string): boolean {
  return /^https?:\/\/(www\.)?linkedin\.com\/company\/[^\/\?#]+/.test(url)
}

function isValidWebsiteUrl(url: string): boolean {
  try { new URL(url); return true } catch { return false }
}
```

**Updated URL links section** in the read-only view (replacing lines 123-150):

```tsx
{/* URL links */}
{(info.linkedin_company_url || info.website_url) && (
  <div className="flex flex-wrap items-center gap-3">
    {info.linkedin_company_url && (
      <div className="inline-flex items-center gap-1">
        <a
          href={info.linkedin_company_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Linkedin className="h-3.5 w-3.5" />
          <span className="underline underline-offset-2">LinkedIn</span>
          <ExternalLink className="h-3 w-3" />
        </a>
        {/* Error icon: invalid format or enrichment failure */}
        {(!isValidLinkedInCompanyUrl(info.linkedin_company_url) || info.enrichment_errors?.linkedin) && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertCircle className="h-3.5 w-3.5 text-destructive cursor-help" aria-label="LinkedIn URL issue" />
              </TooltipTrigger>
              <TooltipContent data-portal-ignore-click-outside>
                {!isValidLinkedInCompanyUrl(info.linkedin_company_url)
                  ? 'Invalid LinkedIn company URL format'
                  : info.enrichment_errors?.linkedin}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    )}
    {info.website_url && (
      <div className="inline-flex items-center gap-1">
        <a
          href={info.website_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Globe className="h-3.5 w-3.5" />
          <span className="underline underline-offset-2">{new URL(info.website_url).hostname.replace('www.', '')}</span>
          <ExternalLink className="h-3 w-3" />
        </a>
        {/* Error icon: invalid format or enrichment failure */}
        {(!isValidWebsiteUrl(info.website_url) || info.enrichment_errors?.website) && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertCircle className="h-3.5 w-3.5 text-destructive cursor-help" aria-label="Website URL issue" />
              </TooltipTrigger>
              <TooltipContent data-portal-ignore-click-outside>
                {!isValidWebsiteUrl(info.website_url)
                  ? 'Invalid website URL format'
                  : info.enrichment_errors?.website}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    )}
  </div>
)}
```

### 5. OverviewTab Updates

**File**: `frontend/src/features/customers/components/overview/OverviewTab.tsx`

**Changes**: Filter hidden members before passing to TeamSection, pass `customerId` and `linkedinCompanyUrl`.

```typescript
export function OverviewTab({ customer, onUpdateInfo, isUpdating }: OverviewTabProps) {
  const { data: events = [], isLoading: eventsLoading } = useCustomerEvents(customer.id)
  const { data: financialSummary } = useReceivableSummary(customer.id)

  // Filter out hidden members before display
  const visibleTeam = (customer.info?.team || []).filter(m => !m.hidden)

  const handleTeamSave = (team: TeamMember[]) => {
    // Preserve hidden members in the save payload
    const hiddenMembers = (customer.info?.team || []).filter(m => m.hidden)
    onUpdateInfo({ ...customer.info, team: [...team, ...hiddenMembers] })
  }

  return (
    <div className="space-y-8">
      {/* ... QuickStats ... */}

      {/* ... CustomerInfoSection ... */}

      <div className="rounded-lg border border-border/50 bg-card p-5">
        <TeamSection
          team={visibleTeam}
          onSave={handleTeamSave}
          isSaving={isUpdating}
          customerId={customer.id}
          linkedinCompanyUrl={customer.info?.linkedin_company_url}
        />
      </div>

      {/* ... EventTimeline ... */}
    </div>
  )
}
```

**Key detail**: `handleTeamSave` re-appends hidden members so they are preserved in the JSONB when the user manually edits the team list.

## Testing Requirements

### Manual Testing

- [ ] Sync button visible in team section header next to "+ Add" button
- [ ] Sync button shows LinkedIn icon and "Sync" label
- [ ] With valid LinkedIn URL: button is enabled, clickable
- [ ] Without LinkedIn URL: button is disabled, tooltip appears on hover
- [ ] During sync: button shows spinner, is disabled
- [ ] After sync success: toast shows "X added, Y removed", team list refreshes
- [ ] After sync failure: toast shows error message
- [ ] "via LinkedIn" badge appears on linkedin_scrape members
- [ ] Hidden members are NOT visible in the team list
- [ ] Manually added members get `source: 'manual'`
- [ ] Red AlertCircle appears next to invalid LinkedIn URL (e.g., `linkedin.com/in/person`)
- [ ] Red AlertCircle appears when `enrichment_errors.linkedin` is set
- [ ] Same pattern for website URL
- [ ] Error icon tooltips show correct message
- [ ] Tooltip includes `data-portal-ignore-click-outside`
- [ ] Frontend builds with zero TypeScript errors: `cd frontend && npx tsc --noEmit`

### Unit Tests

| Test Area | What to Test |
|-----------|-------------|
| `isValidLinkedInCompanyUrl` | Valid company URLs, person URLs (invalid), malformed URLs |
| `isValidWebsiteUrl` | Valid URLs, empty strings, malformed |
| Hidden member filtering | `[{hidden: true}, {hidden: false}, {}]` → only 2 visible |

## Error Handling

| Error Scenario | Handling Strategy |
|----------------|-------------------|
| Sync API returns 400 (no URL) | Toast: "Could not sync — no LinkedIn URL found" |
| Sync API returns 500 | Toast: "Sync failed. Try again later." (generic) |
| Network error during sync | Toast: "Sync failed. Try again later." |
| Invalid URL format in display | AlertCircle icon with tooltip explaining format issue |
| `enrichment_errors.linkedin` set | AlertCircle icon with error message from backend |

## Validation Commands

```bash
# Frontend type check
cd frontend && npx tsc --noEmit

# Build
npm run build
```

---

*This spec is ready for implementation. Follow the patterns and validate at each step.*
