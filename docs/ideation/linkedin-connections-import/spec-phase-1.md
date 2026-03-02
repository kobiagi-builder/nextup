# Implementation Spec: LinkedIn Connections Import - Phase 1

**PRD**: ./prd-phase-1.md
**UX/UI**: ./ux-ui-design.md
**Estimated Effort**: L (Large)

## Technical Approach

Phase 1 builds the core import pipeline: CSV upload, parsing, company matching, team member upsert, edge case handling, and results UI. The architecture follows existing patterns: multer for file upload (like `writingExamplesUpload.controller.ts`), a new `LinkedInImportService` for business logic, and a multi-step dialog on the frontend.

The import runs synchronously on a single POST request. For typical LinkedIn exports (500 rows), this completes within the 30-second target. The backend processes rows sequentially to maintain accurate progress tracking, using the existing `merge_customer_info` RPC for atomic JSONB updates.

Feature gating uses the existing `requireFeature` middleware and `useFeatureFlag` hook, consistent with the customer management rollout pattern.

## File Changes

### New Files

| File Path | Purpose |
|-----------|---------|
| `backend/src/services/LinkedInImportService.ts` | Core import logic: CSV parsing, company matching, team member upsert, edge case detection |
| `backend/src/controllers/linkedinImport.controller.ts` | Upload endpoint with multer, feature flag check, response formatting |
| `backend/src/routes/linkedinImport.ts` | Route definition for `/api/customers/import/linkedin` |
| `frontend/src/features/customers/components/import/LinkedInImportDialog.tsx` | Multi-step dialog: Upload → Progress → Results |
| `frontend/src/features/customers/components/import/CsvUploadStep.tsx` | Step 1: File drop zone for CSV |
| `frontend/src/features/customers/components/import/ImportProgressStep.tsx` | Step 2: Progress bar and live counters |
| `frontend/src/features/customers/components/import/ImportResultsStep.tsx` | Step 3: Results summary with collapsible sections |
| `frontend/src/features/customers/components/import/ImportLinkedInButton.tsx` | Feature-flagged button for Customers page header |
| `frontend/src/features/customers/components/shared/IcpScoreBadge.tsx` | Reusable ICP score pill badge |
| `frontend/src/features/customers/hooks/useLinkedInImport.ts` | Mutation hook for import endpoint |

### Modified Files

| File Path | Changes |
|-----------|---------|
| `frontend/src/features/customers/types/customer.ts` | Add `not_relevant` to CustomerStatus, `linkedin_url` to TeamMember, `IcpScore` type, enrichment types, ICP filter types |
| `frontend/src/features/customers/pages/CustomerListPage.tsx` | Add ImportLinkedInButton, ICP filter pills row, ICP URL param handling |
| `frontend/src/features/customers/components/shared/CustomerCard.tsx` | Add IcpScoreBadge next to vertical badge |
| `frontend/src/features/customers/components/shared/CustomerStatusPill.tsx` | No change needed - reads from CUSTOMER_STATUSES which we extend |
| `frontend/src/features/customers/components/overview/TeamSection.tsx` | Add `linkedin_url` to TeamMemberRow display and TeamMemberForm |
| `frontend/src/features/customers/pages/CustomerDetailPage.tsx` | Add IcpScoreBadge in header area |
| `frontend/src/features/customers/hooks/useCustomers.ts` | Extend CustomerFilters with icp param, update list query |
| `backend/src/types/customer.ts` | Add `not_relevant` to CustomerStatus, extend TeamMember and CustomerInfo types |
| `backend/src/routes/customers.ts` | Mount LinkedIn import sub-route |
| `backend/src/services/CustomerService.ts` | Add `findByName()` method for company matching, extend `listWithSummary` RPC call with ICP filter |

## Implementation Details

### 1. Backend: LinkedInImportService

**Pattern to follow**: `backend/src/services/CustomerService.ts`

**Overview**: Core service handling CSV parsing, company matching, team member upsert, and edge case detection.

```typescript
// Key interfaces
interface LinkedInConnection {
  firstName: string
  lastName: string
  url: string          // LinkedIn profile URL
  emailAddress: string
  company: string
  position: string
}

interface ImportResult {
  total: number
  companies: { created: number; matched: number }
  teamMembers: { created: number; updated: number }
  skipped: Array<{ row: number; company: string; reason: string }>
  errors: Array<{ row: number; message: string }>
}

// Non-company detection
const ENCLOSED_PATTERNS = [
  'stealth', 'confidential', 'building', 'coming soon',
  'stealth mode', 'tbd', 'undisclosed', 'pre-launch', 'secret',
]

const NON_COMPANY_PATTERNS = [
  'none', 'self-employed', 'freelance', 'independent', 'retired',
  'student', 'unemployed', 'n/a', '-', '.',
]

// Country names, job titles, numbers-only → skip
function isNonCompany(name: string): boolean
function isEnclosedCompany(name: string): boolean
function isPersonalName(name: string): boolean // Two capitalized words, no company indicators
```

**Key decisions**:
- CSV parsing: Use `csv-parse` (Node.js native-friendly, streaming capable). Install as dependency.
- Company matching: Case-insensitive `ilike` on customer `name` column. Exact match only (no fuzzy for companies).
- Team member matching: Email-first (exact match), name-fallback (case-insensitive First+Last concatenation).
- Personal name detection: Heuristic - two words both starting with uppercase, no common company suffixes (Inc, Corp, Ltd, LLC, Co, Group, Technologies, Solutions, etc.)
- Enclosed company: Find or create per-user customer named "Enclosed company".

**Implementation steps**:
1. Parse CSV buffer using `csv-parse/sync` with column mapping
2. Validate columns exist (First Name, Last Name, URL, Email Address, Company, Position)
3. For each row:
   a. Trim all fields, skip if Company is empty
   b. Check isNonCompany → skip with reason
   c. Check isPersonalName → skip with reason
   d. Check isEnclosedCompany → route to "Enclosed company" container
   e. Find existing customer by name (case-insensitive)
   f. If not found, create customer with status='lead'
   g. Match team member by email first, then name
   h. If matched, update linkedin_url + position/role if changed
   i. If not matched, add new team member to info.team array
   j. Use `merge_customer_info` RPC for atomic team array update
4. Return ImportResult with all counts

### 2. Backend: Controller & Routes

**Pattern to follow**: `backend/src/controllers/writingExamplesUpload.controller.ts`

**Overview**: Multer-based file upload endpoint with feature flag middleware.

```typescript
// Route: POST /api/customers/import/linkedin
// Middleware: requireAuth → requireFeature('linkedin_import') → uploadMiddleware

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const ext = '.' + (file.originalname.split('.').pop()?.toLowerCase() || '')
    if (file.mimetype === 'text/csv' || ext === '.csv') {
      cb(null, true)
    } else {
      cb(new Error('Only CSV files are accepted'))
    }
  },
})

// Controller
export async function importLinkedInConnections(req: Request, res: Response) {
  // 1. Get CSV buffer from multer
  // 2. Create LinkedInImportService with user's Supabase client
  // 3. Call service.import(csvBuffer)
  // 4. Return ImportResult as JSON
}
```

**Route registration** in `backend/src/routes/customers.ts`:
```typescript
import { requireFeature } from '../middleware/requireFeature.js'
import { uploadMiddleware, importLinkedInConnections } from '../controllers/linkedinImport.controller.js'

// Add to existing customers router
router.post('/import/linkedin', requireFeature('linkedin_import'), uploadMiddleware, importLinkedInConnections)
```

### 3. Frontend: Types Extension

**File**: `frontend/src/features/customers/types/customer.ts`

```typescript
// Extend CustomerStatus
export type CustomerStatus = 'lead' | 'prospect' | 'negotiation' | 'live' | 'on_hold' | 'archive' | 'not_relevant'

// Add to CUSTOMER_STATUSES array
export const CUSTOMER_STATUSES: CustomerStatus[] = [
  'lead', 'prospect', 'negotiation', 'live', 'on_hold', 'archive', 'not_relevant',
]

// Add labels, colors, dot colors
not_relevant: 'Not Relevant'
not_relevant: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
not_relevant: 'bg-rose-400'

// Extend TeamMember
export interface TeamMember {
  name: string
  role?: string
  email?: string
  notes?: string
  linkedin_url?: string  // NEW
}

// ICP Score type
export type IcpScore = 'low' | 'medium' | 'high' | 'very_high'

export const ICP_SCORES: IcpScore[] = ['low', 'medium', 'high', 'very_high']

export const ICP_SCORE_LABELS: Record<IcpScore, string> = {
  low: 'Low', medium: 'Medium', high: 'High', very_high: 'Very High',
}

export const ICP_SCORE_COLORS: Record<IcpScore, string> = {
  low: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  high: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  very_high: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
}

// Enrichment type (Phase 2 readiness)
export interface CustomerEnrichment {
  employee_count?: string
  about?: string
  industry?: string
  specialties?: string[]
  source?: 'linkedin_scrape' | 'llm_enrichment'
  updated_at?: string
}

// Extend CustomerInfo
export interface CustomerInfo {
  // ... existing fields ...
  enrichment?: CustomerEnrichment  // NEW
  icp_score?: IcpScore | null      // NEW
}

// Import result types
export interface ImportResult {
  total: number
  companies: { created: number; matched: number }
  teamMembers: { created: number; updated: number }
  skipped: Array<{ row: number; company: string; reason: string }>
  errors: Array<{ row: number; message: string }>
}

// Extend CustomerFilters
export interface CustomerFilters {
  status?: CustomerStatus | null
  search?: string
  sort?: string
  icp?: IcpScore | 'not_scored' | null  // NEW
}
```

### 4. Frontend: LinkedInImportDialog

**Pattern to follow**: `frontend/src/features/customers/components/forms/NewCustomerDialog.tsx`

**Overview**: Multi-step dialog managing upload → progress → results flow.

```typescript
type ImportStep = 'upload' | 'progress' | 'results'

interface LinkedInImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// State machine:
// upload → (file selected, click Import) → progress → (complete) → results → (click Done) → close
```

**Key decisions**:
- Dialog uses `sm:max-w-lg` for slightly more room than NewCustomerDialog
- During 'progress' step, dialog is not closable (onOpenChange ignored)
- CSV row count preview parsed client-side with PapaParse (lightweight, already handles edge cases)
- Import mutation uses `useLinkedInImport` hook
- On "Done", invalidate `['customers']` query key to refresh list

**Implementation steps**:
1. Create dialog wrapper with step state management
2. CsvUploadStep: FileDropZone variant accepting .csv, shows parsed row count
3. ImportProgressStep: Calls mutation, displays progress (based on response)
4. ImportResultsStep: Renders ImportResult with collapsible sections
5. "Done" button invalidates customer queries and closes dialog

### 5. Frontend: Import Button & ICP Filter

**ImportLinkedInButton**: Simple wrapper checking feature flag

```tsx
export function ImportLinkedInButton({ onClick }: { onClick: () => void }) {
  const { isEnabled, isLoading } = useFeatureFlag('linkedin_import')
  if (!isEnabled || isLoading) return null
  return (
    <Button variant="outline" onClick={onClick}
      className="gap-2 border-[#0A66C2]/30 text-[#0A66C2] hover:bg-[#0A66C2]/10">
      <Upload className="h-4 w-4" />
      Import LinkedIn
    </Button>
  )
}
```

**ICP Filter Row** in CustomerListPage: New filter row below status pills

```tsx
// URL param handling
const icpFilter = searchParams.get('icp') as IcpScore | 'not_scored' | null

// New filter row
<div className="flex items-center gap-2 flex-wrap">
  <span className="text-xs text-muted-foreground font-medium">ICP:</span>
  {/* All, Low, Medium, High, Very High, Not Scored pills */}
</div>
```

### 6. Frontend: TeamSection LinkedIn URL

**Modified**: `TeamMemberRow` and `TeamMemberForm`

```tsx
// TeamMemberRow - add LinkedIn link below email
{member.linkedin_url && (
  <a href={member.linkedin_url} target="_blank" rel="noopener noreferrer"
     className="inline-flex items-center gap-1 text-xs text-[#0A66C2] hover:underline mt-0.5"
     onClick={(e) => e.stopPropagation()}>
    <ExternalLink className="h-3 w-3" />
    LinkedIn
  </a>
)}

// TeamMemberForm - add linkedin_url field
// New field in the grid: LinkedIn URL input
<div>
  <Label htmlFor="tm-linkedin" className="text-xs">LinkedIn URL</Label>
  <Input id="tm-linkedin" value={form.linkedin_url}
    onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })}
    className="mt-0.5 h-8 text-sm" placeholder="https://linkedin.com/in/..." />
</div>
```

### 7. Frontend: IcpScoreBadge

**New component**: Simple pill badge for ICP score display

```tsx
export function IcpScoreBadge({ score, className }: { score: IcpScore | null; className?: string }) {
  if (!score) return null
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
      ICP_SCORE_COLORS[score], className
    )}>
      {ICP_SCORE_LABELS[score]}
    </span>
  )
}
```

Usage in CustomerCard (after vertical badge) and CustomerDetailPage (after status pill).

## Data Model

### Schema Changes

```sql
-- Migration: add_not_relevant_status
-- Update the check constraint on customers.status to include 'not_relevant'
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_status_check;
ALTER TABLE customers ADD CONSTRAINT customers_status_check
  CHECK (status IN ('lead', 'prospect', 'negotiation', 'live', 'on_hold', 'archive', 'not_relevant'));

-- Feature flag for linkedin_import
INSERT INTO feature_flags (name, description, default_state)
VALUES ('linkedin_import', 'LinkedIn connections CSV import feature', false)
ON CONFLICT (name) DO NOTHING;
```

No new tables needed. All data stored in existing `customers.info` JSONB:
- `info.team[].linkedin_url` - LinkedIn URL per team member
- `info.enrichment` - Enrichment data (Phase 2 populated)
- `info.icp_score` - ICP score level (Phase 2 populated)

### RPC Update for ICP Filtering

```sql
-- Update get_customer_list_summary to accept ICP filter
-- Add parameter: p_icp TEXT DEFAULT NULL
-- Add WHERE clause: AND (p_icp IS NULL OR (info->>'icp_score') = p_icp OR (p_icp = 'not_scored' AND info->>'icp_score' IS NULL))
```

## API Design

### New Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/customers/import/linkedin` | Upload CSV and import connections |

### Request/Response

```typescript
// POST /api/customers/import/linkedin
// Content-Type: multipart/form-data
// Body: file (CSV)
// Headers: Authorization: Bearer <token>

// Response 200
{
  "total": 487,
  "companies": { "created": 42, "matched": 38 },
  "teamMembers": { "created": 156, "updated": 82 },
  "skipped": [
    { "row": 23, "company": "Stealth", "reason": "Enclosed company - grouped under 'Enclosed company'" },
    { "row": 45, "company": "Israel", "reason": "Non-company name detected" }
  ],
  "errors": [
    { "row": 112, "message": "Missing company field" }
  ]
}

// Response 400
{ "error": "Invalid CSV format. Expected columns: First Name, Last Name, URL, Email Address, Company, Position" }

// Response 403
{ "error": "Feature not available for your account" }
```

## Testing Requirements

### Unit Tests

| Test File | Coverage |
|-----------|----------|
| `backend/src/services/__tests__/LinkedInImportService.test.ts` | CSV parsing, company matching, team member upsert, edge cases |

**Key test cases**:
- Parse valid LinkedIn CSV with all columns
- Handle CSV with missing optional columns (email empty)
- Detect enclosed companies: "Stealth", "Confidential", "Coming Soon", case variations
- Detect non-company names: "none", "self-employed", country names, numbers
- Detect personal names: "John Smith", "Jane Doe" (two capitalized words)
- Match existing company by name (case-insensitive)
- Match team member by email (exact)
- Match team member by name when email missing
- Create new customer with default 'lead' status
- Update existing team member's linkedin_url and role
- Don't duplicate team members on re-import
- Handle empty CSV (header only)
- Handle CSV with BOM characters
- Return correct counts in ImportResult

### Integration Tests

| Test File | Coverage |
|-----------|----------|
| `backend/src/controllers/__tests__/linkedinImport.integration.test.ts` | Endpoint auth, feature flag, upload, response format |

**Key scenarios**:
- Authenticated upload with valid CSV returns ImportResult
- Unauthenticated request returns 401
- Feature flag disabled returns 403
- Invalid file type returns 400
- Large file (>5MB) returns 400
- Malformed CSV returns descriptive error

### Manual Testing

- [ ] Upload LinkedIn export CSV from real LinkedIn account
- [ ] Verify companies created/matched in database
- [ ] Verify team members with LinkedIn URLs in customer detail
- [ ] Re-upload same CSV - verify no duplicates, only updates
- [ ] Check "Enclosed company" record created for stealth companies
- [ ] Check non-company entries are skipped
- [ ] Verify ICP filter pills render (empty results until Phase 2 scoring)
- [ ] Verify "Not Relevant" status appears in status pills and dropdown

## Error Handling

| Error Scenario | Handling Strategy |
|----------------|-------------------|
| Invalid CSV structure (wrong columns) | Return 400 with descriptive message listing expected columns |
| CSV parsing error (encoding, format) | Return 400 with "Unable to parse CSV" + specific parse error |
| File too large (>5MB) | Multer rejects with 400 before processing |
| Non-CSV file uploaded | Multer fileFilter rejects with 400 |
| Individual row processing failure | Log error, add to errors array, continue processing next row |
| Database error during customer create | Add row to errors, continue. Log with structured logger (no PII). |
| Feature flag not active | requireFeature middleware returns 403 |
| Auth missing | requireAuth middleware returns 401 |

## Validation Commands

```bash
# Type checking
cd backend && npx tsc --noEmit
cd frontend && npx tsc --noEmit

# Unit tests
cd backend && npm run test -- --run src/services/__tests__/LinkedInImportService.test.ts

# Integration tests
cd backend && npm run test -- --run src/controllers/__tests__/linkedinImport.integration.test.ts

# Build
npm run build
```

## Rollout Considerations

- **Feature flag**: `linkedin_import` (default: false)
- **Monitoring**: Watch for import endpoint response times >30s, error rates
- **Alerting**: Log import errors with structured metadata (row count, error count - no PII)
- **Rollback plan**: Disable feature flag in `feature_flags` table. UI button disappears immediately (5-min cache). Imported data remains.

## Dependencies to Install

```bash
cd backend && npm install csv-parse
```

Frontend CSV preview (optional): Use PapaParse for client-side row counting
```bash
cd frontend && npm install papaparse @types/papaparse
```

## Open Items

- [ ] Tune personal name detection heuristic after testing with real LinkedIn exports
- [ ] Decide if CSV preview (parsed rows before import) is worth the extra UI complexity
- [ ] Consider SSE for real-time progress updates vs. simple synchronous response

---

*This spec is ready for implementation. Follow the patterns and validate at each step.*
