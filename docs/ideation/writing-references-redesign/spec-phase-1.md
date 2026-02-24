# Implementation Spec: Writing References Redesign - Phase 1

**PRD**: ./prd-phase-1.md
**Estimated Effort**: M (Medium)

## Technical Approach

Phase 1 is a vertical slice: DB migration → API updates → pipeline integration → frontend redesign. The migration adds 3 columns to `user_writing_examples`. The API gets a filter parameter. The pipeline tool gets a `.eq()` clause. The frontend is rebuilt from scratch as a tabbed layout.

For the frontend, we replace `WritingStylePage.tsx` entirely. The new component uses shadcn Tabs for the type switcher, React Query with the existing `useWritingExamples` hook (extended to pass `artifact_type`), and a Sheet dialog for the upload form. We follow the existing component patterns in the codebase (shadcn/ui, Tailwind, TypeScript interfaces).

The migration is non-destructive: existing rows keep `artifact_type = NULL` and continue to exist but don't appear in any type tab. No data loss.

## File Changes

### New Files

| File Path | Purpose |
|-----------|---------|
| `supabase/migrations/YYYYMMDD_add_artifact_type_to_writing_examples.sql` | Migration adding `artifact_type`, `extraction_status`, `source_url` columns |
| `frontend/src/features/portfolio/components/writing-references/ReferenceCard.tsx` | Individual reference card component with status, preview, delete |
| `frontend/src/features/portfolio/components/writing-references/ReferenceUploadDialog.tsx` | Upload dialog with method tabs (paste, file) |
| `frontend/src/features/portfolio/components/writing-references/ReferenceDetailSheet.tsx` | Full content view sheet when clicking a reference |
| `frontend/src/features/portfolio/components/writing-references/index.ts` | Barrel exports |

### Modified Files

| File Path | Changes |
|-----------|---------|
| `frontend/src/features/portfolio/pages/WritingStylePage.tsx` | Complete rewrite — tabbed layout with Blog/Social Post/Showcase tabs |
| `frontend/src/features/portfolio/types/portfolio.ts` | Add `artifact_type`, `extraction_status`, `source_url` to `UserWritingExample`. Update `CreateWritingExampleInput`. Add `ExtractionStatus` type. |
| `frontend/src/features/portfolio/hooks/useWritingExamples.ts` | Add `artifact_type` filter parameter to `useWritingExamples()`. Update query keys. |
| `backend/src/types/portfolio.ts` | Add `artifact_type`, `extraction_status`, `source_url` to `UserWritingExample`. Add `ExtractionStatus` type. |
| `backend/src/controllers/writingExamples.controller.ts` | Accept `artifact_type` on create. Add `artifact_type` query filter on list. Remove 500-word minimum. |
| `backend/src/services/ai/tools/writingCharacteristicsTools.ts` | Add `.eq('artifact_type', artifactType)` filter when querying writing examples (line ~422). |

### Deleted Files

| File Path | Reason |
|-----------|--------|
| `frontend/src/features/portfolio/components/forms/StyleExampleForm.tsx` | Legacy form component — replaced by new ReferenceUploadDialog |
| `frontend/src/features/portfolio/hooks/useStyleExamples.ts` | Legacy hook using direct Supabase `style_examples` table — unused |

## Implementation Details

### 1. Database Migration

**Pattern to follow**: Existing migrations in `supabase/migrations/`

**Overview**: Non-destructive schema change adding 3 columns.

```sql
-- Add artifact_type column (nullable - existing rows stay NULL)
ALTER TABLE user_writing_examples
  ADD COLUMN artifact_type text CHECK (artifact_type IN ('blog', 'social_post', 'showcase'));

-- Add extraction_status column with default
ALTER TABLE user_writing_examples
  ADD COLUMN extraction_status text NOT NULL DEFAULT 'success'
  CHECK (extraction_status IN ('pending', 'extracting', 'success', 'failed'));

-- Add source_url column for URL-based references
ALTER TABLE user_writing_examples
  ADD COLUMN source_url text;

-- Index for type-filtered queries
CREATE INDEX idx_writing_examples_artifact_type
  ON user_writing_examples(user_id, artifact_type)
  WHERE artifact_type IS NOT NULL;
```

**Key decisions**:
- `artifact_type` is nullable so existing rows don't break
- `extraction_status` defaults to `'success'` since all existing rows have content
- Index is partial (WHERE NOT NULL) since we only query typed references

**Implementation steps**:
1. Apply migration via `mcp__supabase__apply_migration`
2. Verify columns exist via `mcp__supabase__list_tables`
3. Run `mcp__supabase__get_advisors` for security/performance check

### 2. Backend Type Updates

**Pattern to follow**: `backend/src/types/portfolio.ts`

```typescript
// Add to existing types
export type ExtractionStatus = 'pending' | 'extracting' | 'success' | 'failed';

// Update UserWritingExample interface
export interface UserWritingExample {
  id: string;
  user_id: string;
  name: string;
  source_type: WritingExampleSourceType;
  content: string;
  word_count: number;
  source_reference?: string;
  analyzed_characteristics: WritingCharacteristics;
  is_active: boolean;
  artifact_type?: ArtifactType | null;      // NEW
  extraction_status: ExtractionStatus;       // NEW
  source_url?: string | null;               // NEW
  created_at: string;
  updated_at: string;
}
```

**Implementation steps**:
1. Add `ExtractionStatus` type
2. Add 3 new fields to `UserWritingExample` in both `backend/src/types/portfolio.ts` and `frontend/src/features/portfolio/types/portfolio.ts`
3. Update `CreateWritingExampleInput` to include optional `artifact_type`

### 3. Backend Controller Updates

**Pattern to follow**: `backend/src/controllers/writingExamples.controller.ts`

**Overview**: Modify `listWritingExamples` to accept `artifact_type` filter. Modify `createWritingExample` to accept `artifact_type` and remove word count minimum.

```typescript
// listWritingExamples - add artifact_type filter
export const listWritingExamples = async (req: Request, res: Response) => {
  const activeOnly = req.query.active_only === 'true';
  const artifactType = req.query.artifact_type as string | undefined;

  let query = getSupabase()
    .from('user_writing_examples')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (activeOnly) query = query.eq('is_active', true);
  if (artifactType) query = query.eq('artifact_type', artifactType);

  // ... rest unchanged
};

// createWritingExample - accept artifact_type, remove word count validation
export const createWritingExample = async (req: Request, res: Response) => {
  const { name, content, source_type = 'pasted', source_reference, artifact_type } = req.body;

  // Remove: word count minimum validation (was MIN_WORD_COUNT = 500)

  const wordCount = countWords(content);

  const { data, error } = await getSupabase()
    .from('user_writing_examples')
    .insert({
      user_id: userId,
      name: name.trim(),
      content,
      word_count: wordCount,
      source_type,
      source_reference,
      artifact_type: artifact_type || null,  // NEW
      extraction_status: 'success',           // NEW - paste/txt is instant
      analyzed_characteristics: {},
      is_active: true,
    })
    .select()
    .single();
  // ...
};
```

**Implementation steps**:
1. Add `artifact_type` query param handling to `listWritingExamples`
2. Add `artifact_type` to create payload in `createWritingExample`
3. Remove the `MIN_WORD_COUNT` validation block
4. Validate `artifact_type` is one of `['blog', 'social_post', 'showcase']` if provided

### 4. Pipeline Integration

**Pattern to follow**: `backend/src/services/ai/tools/writingCharacteristicsTools.ts` line ~422

**Overview**: Single line change — add `.eq('artifact_type', artifactType)` to the writing examples query.

```typescript
// BEFORE (line ~422)
const { data: writingExamples } = await getSupabase()
  .from('user_writing_examples')
  .select('name, content, analyzed_characteristics')
  .eq('user_id', artifact.user_id)
  .eq('is_active', true)
  .limit(5);

// AFTER
const { data: writingExamples } = await getSupabase()
  .from('user_writing_examples')
  .select('name, content, analyzed_characteristics')
  .eq('user_id', artifact.user_id)
  .eq('is_active', true)
  .eq('artifact_type', artifactType)  // Filter by type
  .limit(5);
```

**Key decisions**:
- When zero results, proceed with defaults (existing behavior on line ~630)
- No fallback to untyped references — clean separation per contract

**Implementation steps**:
1. Add `.eq('artifact_type', artifactType)` to the query
2. Log the filter for observability
3. Verify default characteristics path still works when zero results

### 5. Frontend Hook Updates

**Pattern to follow**: `frontend/src/features/portfolio/hooks/useWritingExamples.ts`

```typescript
// Update the hook to accept artifact_type filter
interface UseWritingExamplesOptions {
  activeOnly?: boolean;
  artifactType?: ArtifactType;  // NEW
}

export function useWritingExamples(options: UseWritingExamplesOptions = {}) {
  return useQuery<UserWritingExample[]>({
    queryKey: [...writingExamplesKeys.list(), options],
    queryFn: async () => {
      const token = await getAccessToken();
      const params = new URLSearchParams();
      if (options.activeOnly) params.set('active_only', 'true');
      if (options.artifactType) params.set('artifact_type', options.artifactType);
      const queryStr = params.toString();

      const response = await api.get<ListWritingExamplesResponse>(
        `/api/user/writing-examples${queryStr ? `?${queryStr}` : ''}`,
        token ? { token } : undefined,
      );
      return response.examples;
    },
  });
}
```

**Implementation steps**:
1. Add `artifactType` to options interface
2. Build query string from options
3. Update query keys to include artifact type for proper caching
4. Update `useCreateWritingExample` to accept `artifact_type` in input

### 6. Frontend — Tabbed WritingStylePage

**Pattern to follow**: Existing shadcn Tabs pattern in codebase

**Overview**: Complete rewrite of WritingStylePage with 3 artifact type tabs.

```typescript
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const ARTIFACT_TYPES = [
  { value: 'blog', label: 'Blog', icon: FileText },
  { value: 'social_post', label: 'Social Post', icon: MessageSquare },
  { value: 'showcase', label: 'Showcase', icon: Presentation },
] as const;

export function WritingStylePage() {
  const [activeType, setActiveType] = useState<ArtifactType>('blog');
  const [showUpload, setShowUpload] = useState(false);

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header with back button */}
      {/* ... */}

      <Tabs value={activeType} onValueChange={(v) => setActiveType(v as ArtifactType)}>
        <TabsList className="w-full">
          {ARTIFACT_TYPES.map(({ value, label, icon: Icon }) => (
            <TabsTrigger key={value} value={value} className="flex-1 gap-2">
              <Icon className="h-4 w-4" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {ARTIFACT_TYPES.map(({ value }) => (
          <TabsContent key={value} value={value}>
            <ReferencesList artifactType={value} onAdd={() => setShowUpload(true)} />
          </TabsContent>
        ))}
      </Tabs>

      {/* Upload dialog */}
      <ReferenceUploadDialog
        open={showUpload}
        onClose={() => setShowUpload(false)}
        artifactType={activeType}
      />
    </div>
  );
}
```

**Implementation steps**:
1. Rewrite WritingStylePage with Tabs layout
2. Create ReferenceCard component (name, icon, word count, preview, status, delete)
3. Create ReferenceUploadDialog (Sheet with paste/file methods)
4. Create ReferenceDetailSheet (full content view on card click)
5. Wire up useWritingExamples with artifact_type filter per tab

### 7. Frontend — ReferenceCard Component

**Overview**: Card displaying a single reference with status, preview, and actions.

```typescript
interface ReferenceCardProps {
  reference: UserWritingExample;
  onDelete: (id: string) => void;
  onClick: (reference: UserWritingExample) => void;
  isDeleting: boolean;
}

function ReferenceCard({ reference, onDelete, onClick, isDeleting }: ReferenceCardProps) {
  // Source type icon mapping
  const sourceIcons: Record<WritingExampleSourceType, LucideIcon> = {
    pasted: Type,
    file_upload: FileText,
    artifact: FileText,
    url: Link,
  };

  // Extraction status badge
  const statusBadge = {
    success: { icon: CheckCircle, color: 'text-green-600', label: 'Extracted' },
    failed: { icon: AlertCircle, color: 'text-destructive', label: 'Failed' },
    extracting: { icon: Loader2, color: 'text-blue-500', label: 'Extracting...' },
    pending: { icon: Clock, color: 'text-muted-foreground', label: 'Pending' },
  };

  return (
    <div
      className="rounded-xl bg-card border border-border p-4 space-y-3 cursor-pointer hover:border-brand-300/50 transition-colors"
      onClick={() => onClick(reference)}
    >
      {/* Header: icon + name + word count + delete */}
      {/* Content preview: first 200 chars */}
      {/* Status badge */}
    </div>
  );
}
```

### 8. Frontend — ReferenceUploadDialog

**Overview**: Sheet dialog with method tabs for adding references.

```typescript
interface ReferenceUploadDialogProps {
  open: boolean;
  onClose: () => void;
  artifactType: ArtifactType;
}

function ReferenceUploadDialog({ open, onClose, artifactType }: ReferenceUploadDialogProps) {
  const [method, setMethod] = useState<'paste' | 'file'>('paste');
  const createExample = useCreateWritingExample();

  const handleSubmit = async (data: { name: string; content: string; sourceType: WritingExampleSourceType }) => {
    await createExample.mutateAsync({
      name: data.name,
      content: data.content,
      source_type: data.sourceType,
      artifact_type: artifactType,
    });
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg">
        {/* Method tabs: Paste Text | Upload File */}
        {/* Form based on selected method */}
        {/* Submit button */}
      </SheetContent>
    </Sheet>
  );
}
```

## Data Model

### Schema Changes

```sql
ALTER TABLE user_writing_examples
  ADD COLUMN artifact_type text CHECK (artifact_type IN ('blog', 'social_post', 'showcase'));

ALTER TABLE user_writing_examples
  ADD COLUMN extraction_status text NOT NULL DEFAULT 'success'
  CHECK (extraction_status IN ('pending', 'extracting', 'success', 'failed'));

ALTER TABLE user_writing_examples
  ADD COLUMN source_url text;

CREATE INDEX idx_writing_examples_artifact_type
  ON user_writing_examples(user_id, artifact_type)
  WHERE artifact_type IS NOT NULL;
```

## API Design

### Modified Endpoints

| Method | Path | Changes |
|--------|------|---------|
| `GET` | `/api/user/writing-examples` | Add `?artifact_type=blog` filter param |
| `POST` | `/api/user/writing-examples` | Accept `artifact_type` in body, remove word count minimum |

### Request/Response Examples

```typescript
// POST /api/user/writing-examples
// Request
{
  "name": "My LinkedIn article about AI strategy",
  "content": "Full text content here...",
  "source_type": "pasted",
  "artifact_type": "blog"
}

// Response (201)
{
  "id": "uuid",
  "name": "My LinkedIn article about AI strategy",
  "content": "Full text content here...",
  "source_type": "pasted",
  "artifact_type": "blog",
  "extraction_status": "success",
  "source_url": null,
  "word_count": 1250,
  "is_active": true,
  "analyzed_characteristics": {},
  "created_at": "2026-02-24T...",
  "updated_at": "2026-02-24T..."
}

// GET /api/user/writing-examples?artifact_type=blog
// Response
{
  "examples": [/* UserWritingExample[] filtered by blog */],
  "count": 3
}
```

## Testing Requirements

### Unit Tests

| Test File | Coverage |
|-----------|----------|
| `testing/unit/backend/writingExamplesController.test.ts` | CRUD with artifact_type filter, no word count min |

**Key test cases**:
- Create with `artifact_type: 'blog'` stores correctly
- Create without `artifact_type` stores as NULL
- List with `artifact_type=blog` returns only blog refs
- List without filter returns all
- Invalid `artifact_type` value returns 400
- No word count minimum enforced (1 word content accepted)

### Manual Testing

- [ ] Navigate to `/settings/style`, see 3 tabs
- [ ] Add a paste reference to Blog tab — appears in Blog tab only
- [ ] Add a file reference to Showcase tab — appears in Showcase tab only
- [ ] Click a reference card — full content sheet opens
- [ ] Delete a reference — removed from list
- [ ] Switch tabs — each shows its own references
- [ ] Run content agent on a blog artifact — verify it queries blog-type references only (check logs)

## Error Handling

| Error Scenario | Handling Strategy |
|----------------|-------------------|
| Invalid artifact_type value | Return 400 with `"artifact_type must be one of: blog, social_post, showcase"` |
| Empty name | Return 400 with `"Name is required"` |
| Empty content on paste | Return 400 with `"Content is required"` |
| File read failure (.md/.txt) | Show toast error "Failed to read file. Please try again." |
| Migration failure | Rollback — columns not added. Retry migration. |

## Validation Commands

```bash
# Backend type checking + build
cd backend && npx tsc --noEmit && npm run build

# Frontend type checking + build
cd frontend && npx tsc --noEmit && npm run build

# Run tests
npm run test

# Full build (both)
npm run build
```

## Rollout Considerations

- **Feature flag**: None needed — this replaces the existing broken screen
- **Migration**: Run via MCP before deploying code changes
- **Monitoring**: Check logs for `[AnalyzeWritingCharacteristics]` to verify type filtering works
- **Rollback plan**: Migration is additive (new columns) — safe to rollback code without dropping columns

---

*This spec is ready for implementation. Follow the patterns and validate at each step.*
