# Implementation Spec: Initiative & Documents Restructure - Phase 1

**PRD**: ./prd-phase-1.md
**Estimated Effort**: L (Large)

## Technical Approach

Phase 1 is a pure backend + database phase. The approach is:

1. **Single transactional migration** that renames tables, columns, foreign keys, indexes, and RLS policies. This is executed via `mcp__supabase__apply_migration` as one atomic operation.
2. **Backend rename** of all TypeScript types, services, controllers, and routes — a systematic find-and-replace guided by the dependency graph.
3. **New `document_folders` table** with seed data for the "General" folder.
4. **Safe delete behavior** change: initiative deletion moves documents to General instead of cascading.

The migration is the highest-risk operation. It must be tested in a branch first if possible. The backend rename is lower risk — it's a refactor with no behavioral change except the delete behavior.

## File Changes

### New Files

| File Path | Purpose |
|-----------|---------|
| `backend/src/services/DocumentFolderService.ts` | CRUD operations for document folders (global defaults + per-customer) |
| `backend/src/controllers/document-folder.controller.ts` | Request handlers for folder endpoints |
| `backend/src/routes/document-folders.ts` | Route definitions for `/api/document-folders` |
| `backend/src/types/document-folder.ts` | TypeScript types for DocumentFolder |

### Modified Files

| File Path | Changes |
|-----------|---------|
| `backend/src/types/customer.ts` | Rename all types: Project→Initiative, CustomerArtifact→CustomerDocument, all status/type enums |
| `backend/src/services/ProjectService.ts` | Rename to `InitiativeService.ts` — update class name, table references, method names |
| `backend/src/services/CustomerArtifactService.ts` | Rename to `CustomerDocumentService.ts` — update class name, table references |
| `backend/src/controllers/project.controller.ts` | Rename to `initiative.controller.ts` — update function names, service references |
| `backend/src/controllers/customer-artifact.controller.ts` | Rename to `customer-document.controller.ts` — update function names |
| `backend/src/routes/projects.ts` | Rename to `initiatives.ts` — update route paths from `/projects` to `/initiatives` |
| `backend/src/routes/customer-artifacts.ts` | Rename to `customer-documents.ts` — update route paths |
| `backend/src/routes/index.ts` | Update route imports and mount points |
| `backend/src/controllers/customer-ai.controller.ts` | Update references to artifacts → documents |
| `backend/src/services/ai/agents/customer-mgmt/prompt/customerAgentPrompts.ts` | Update terminology in AI prompts |
| `backend/src/services/ai/agents/product-mgmt/prompt/productAgentPrompts.ts` | Update any cross-references to customer artifacts |

### Deleted Files

| File Path | Reason |
|-----------|--------|
| `backend/src/services/ProjectService.ts` | Renamed to InitiativeService.ts |
| `backend/src/services/CustomerArtifactService.ts` | Renamed to CustomerDocumentService.ts |
| `backend/src/controllers/project.controller.ts` | Renamed to initiative.controller.ts |
| `backend/src/controllers/customer-artifact.controller.ts` | Renamed to customer-document.controller.ts |
| `backend/src/routes/projects.ts` | Renamed to initiatives.ts |
| `backend/src/routes/customer-artifacts.ts` | Renamed to customer-documents.ts |

## Implementation Details

### 1. Database Migration

**Overview**: Single migration that renames tables, columns, FKs, indexes, RLS in one transaction.

```sql
-- Migration: rename_projects_to_initiatives
BEGIN;

-- 1. Rename tables
ALTER TABLE projects RENAME TO initiatives;
ALTER TABLE customer_artifacts RENAME TO customer_documents;

-- 2. Rename columns
ALTER TABLE customer_documents RENAME COLUMN project_id TO initiative_id;

-- 3. Add folder_id column (nullable, for Phase 3)
-- NOTE: document_folders table must be created first (see Migration 2 below)
-- In practice, run the document_folders migration BEFORE this one,
-- or include the CREATE TABLE document_folders in this transaction above this line
ALTER TABLE customer_documents ADD COLUMN folder_id UUID REFERENCES document_folders(id) ON DELETE SET NULL;

-- 4. Rename indexes
ALTER INDEX IF EXISTS idx_projects_customer_id RENAME TO idx_initiatives_customer_id;
ALTER INDEX IF EXISTS idx_customer_artifacts_project_id RENAME TO idx_customer_documents_initiative_id;
-- (identify all existing indexes and rename)

-- 5. Rename foreign key constraints
ALTER TABLE customer_documents RENAME CONSTRAINT customer_artifacts_project_id_fkey TO customer_documents_initiative_id_fkey;

-- 6. Drop and recreate RLS policies with new names
-- (Drop existing policies on old table names, create new ones on renamed tables)
-- Example pattern:
DROP POLICY IF EXISTS "Users can view own projects" ON initiatives;
CREATE POLICY "Users can view own initiatives" ON initiatives
  FOR SELECT USING (
    customer_id IN (
      SELECT id FROM customers WHERE user_id = auth.uid()
    )
  );
-- Repeat for all CRUD policies on both tables

-- 7. Remove CASCADE on initiative delete (change to RESTRICT or NO ACTION)
ALTER TABLE customer_documents DROP CONSTRAINT customer_documents_initiative_id_fkey;
ALTER TABLE customer_documents ADD CONSTRAINT customer_documents_initiative_id_fkey
  FOREIGN KEY (initiative_id) REFERENCES initiatives(id) ON DELETE RESTRICT;

COMMIT;
```

**Key decisions**:
- Single transaction ensures atomicity — if any step fails, nothing changes
- `document_folders` table must be created BEFORE adding `folder_id` FK to `customer_documents` — use two migrations or ensure correct ordering within transaction
- `folder_id` added now but nullable — Phase 3 populates it
- CASCADE removed and replaced with RESTRICT — application handles the "move to General" logic
- All index and constraint names updated to match new table names

**Implementation steps**:
1. Audit existing indexes, constraints, and RLS policies on `projects` and `customer_artifacts`
2. Write the complete migration SQL
3. Test on a Supabase branch if available
4. Apply via `mcp__supabase__apply_migration`
5. Verify with `mcp__supabase__list_tables` and test queries

### 2. Document Folders Table

**Overview**: New table for predefined and custom folders.

```sql
-- Migration: create_document_folders
CREATE TABLE document_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_default BOOLEAN NOT NULL DEFAULT false,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_document_folders_customer_id ON document_folders(customer_id);
CREATE INDEX idx_document_folders_user_id ON document_folders(user_id);
CREATE UNIQUE INDEX idx_document_folders_slug_scope ON document_folders(slug, COALESCE(customer_id, '00000000-0000-0000-0000-000000000000'));

-- RLS
ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;

-- Global folders (customer_id IS NULL) readable by all authenticated users
-- Note: Global seed has user_id = NULL, so we match on customer_id IS NULL only
CREATE POLICY "Users can view global folders" ON document_folders
  FOR SELECT USING (customer_id IS NULL);

-- Customer-specific folders readable by owner
CREATE POLICY "Users can view customer folders" ON document_folders
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

-- Users can manage their own customer folders
CREATE POLICY "Users can manage customer folders" ON document_folders
  FOR ALL USING (user_id = auth.uid());

-- Seed General folder
INSERT INTO document_folders (name, slug, is_system, is_default, customer_id, user_id, sort_order)
VALUES ('General', 'general', true, true, NULL, NULL, 999);
```

**Key decisions**:
- `customer_id = NULL` means global default folder
- `is_default = true` marks the catch-all folder (General)
- `is_system = true` means it cannot be deleted via API
- `user_id` tracks who created the folder (for RLS)
- `slug` enables stable references (not display name dependent)
- Unique index on `(slug, customer_id)` prevents duplicate folder names per scope

### 3. Backend Types Rename

**Pattern to follow**: `backend/src/types/customer.ts`

```typescript
// BEFORE
export interface Project { ... }
export interface ProjectWithCounts extends Project { artifacts_count: number }
export type ProjectStatus = 'active' | 'on_hold' | 'completed'
export interface CustomerArtifact { ... }
export type ArtifactType = 'strategy' | 'research' | ...
export type ArtifactStatus = 'draft' | 'in_progress' | ...

// AFTER
export interface Initiative { ... }
export interface InitiativeWithCounts extends Initiative { documents_count: number }
export type InitiativeStatus = 'active' | 'on_hold' | 'completed'
export interface CustomerDocument { ... }
export type DocumentType = 'strategy' | 'research' | ...
export type DocumentStatus = 'draft' | 'in_progress' | ...

// Validation constants
export const VALID_INITIATIVE_STATUSES: InitiativeStatus[] = [...]
export const VALID_DOCUMENT_TYPES: DocumentType[] = [...]
export const VALID_DOCUMENT_STATUSES: DocumentStatus[] = [...]
```

### 4. InitiativeService (Safe Delete)

**Pattern to follow**: `backend/src/services/ProjectService.ts`

```typescript
// Key change: delete method
async deleteInitiative(initiativeId: string, customerId: string): Promise<void> {
  // 1. Find the General folder for this customer (or global default)
  const generalFolder = await this.documentFolderService.getDefaultFolder(customerId);

  // 2. Move all documents to General folder
  await supabase
    .from('customer_documents')
    .update({ initiative_id: null, folder_id: generalFolder.id })
    .eq('initiative_id', initiativeId);

  // 3. Delete the initiative (now safe — no documents reference it)
  await supabase
    .from('initiatives')
    .delete()
    .eq('id', initiativeId)
    .eq('customer_id', customerId);
}
```

### 5. DocumentFolderService

```typescript
// New service
export class DocumentFolderService {
  // Get folders for a customer (customer-specific if any, otherwise global defaults)
  async getFolders(customerId: string, userId: string): Promise<DocumentFolder[]> { ... }

  // Get the default (General) folder
  async getDefaultFolder(customerId: string): Promise<DocumentFolder> { ... }

  // Create a customer-specific folder
  async createFolder(data: CreateFolderInput): Promise<DocumentFolder> { ... }

  // Update a folder (only non-system folders)
  async updateFolder(folderId: string, data: UpdateFolderInput): Promise<DocumentFolder> { ... }

  // Delete a folder (moves documents to General, prevents deleting system folders)
  async deleteFolder(folderId: string, customerId: string): Promise<void> { ... }
}
```

### 6. Route Renames

```typescript
// backend/src/routes/index.ts
// BEFORE
import projectRoutes from './projects'
import customerArtifactRoutes from './customer-artifacts'

router.use('/customers/:id/projects', projectRoutes)
router.use('/customers/:id/projects/:projectId/artifacts', customerArtifactRoutes)

// AFTER
import initiativeRoutes from './initiatives'
import customerDocumentRoutes from './customer-documents'
import documentFolderRoutes from './document-folders'

router.use('/customers/:id/initiatives', initiativeRoutes)
router.use('/customers/:id/initiatives/:initiativeId/documents', customerDocumentRoutes)
router.use('/document-folders', documentFolderRoutes)
```

## Data Model

### Schema Changes

See SQL in Implementation Details sections 1 and 2 above.

### Key Relationships After Migration

```
Customer (1) → (N) Initiative (formerly Project)
Initiative (1) → (N) CustomerDocument (formerly CustomerArtifact)
DocumentFolder (1) → (N) CustomerDocument (via folder_id)
Agreement → Initiative (optional, one per initiative)
CustomerDocument ← (N) Portfolio Artifact (reference links, unchanged)
```

## API Design

### Renamed Endpoints

| Method | Old Path | New Path |
|--------|----------|----------|
| `GET` | `/api/customers/:id/projects` | `/api/customers/:id/initiatives` |
| `GET` | `/api/customers/:id/projects/:projectId` | `/api/customers/:id/initiatives/:initiativeId` |
| `POST` | `/api/customers/:id/projects` | `/api/customers/:id/initiatives` |
| `PUT` | `/api/customers/:id/projects/:projectId` | `/api/customers/:id/initiatives/:initiativeId` |
| `DELETE` | `/api/customers/:id/projects/:projectId` | `/api/customers/:id/initiatives/:initiativeId` |
| `GET` | `/api/customers/:id/projects/:projectId/artifacts` | `/api/customers/:id/initiatives/:initiativeId/documents` |
| `POST` | `/api/customers/:id/projects/:projectId/artifacts` | `/api/customers/:id/initiatives/:initiativeId/documents` |
| `PUT` | `/api/customers/:id/.../artifacts/:artifactId` | `/api/customers/:id/.../documents/:documentId` |
| `DELETE` | `/api/customers/:id/.../artifacts/:artifactId` | `/api/customers/:id/.../documents/:documentId` |
| `GET` | `/api/customers/:id/artifacts` | `/api/customers/:id/documents` |

### New Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/document-folders?customerId=:id` | List folders (customer-specific or global defaults) |
| `POST` | `/api/document-folders` | Create customer-specific folder |
| `PUT` | `/api/document-folders/:folderId` | Update folder name/sort_order |
| `DELETE` | `/api/document-folders/:folderId` | Delete folder (moves docs to General) |

### Request/Response Examples

```typescript
// DELETE /api/customers/:id/initiatives/:initiativeId
// Response: 200
{
  "message": "Initiative deleted. 5 documents moved to General folder."
}

// GET /api/document-folders?customerId=abc123
// Response: 200
[
  { "id": "...", "name": "General", "slug": "general", "is_system": true, "is_default": true, "sort_order": 999 },
  { "id": "...", "name": "Pricing", "slug": "pricing", "is_system": false, "is_default": false, "sort_order": 0 }
]
```

## Testing Requirements

### Unit Tests

| Test File | Coverage |
|-----------|----------|
| `backend/src/services/__tests__/InitiativeService.test.ts` | Initiative CRUD, safe delete behavior |
| `backend/src/services/__tests__/CustomerDocumentService.test.ts` | Document CRUD with initiative/folder assignment |
| `backend/src/services/__tests__/DocumentFolderService.test.ts` | Folder CRUD, default folder protection |

**Key test cases**:
- Deleting an initiative moves all its documents to General folder
- Cannot delete the General folder (is_system + is_default)
- Creating a document with initiative_id sets the relationship
- Folder CRUD respects customer ownership
- Global folders are readable by all authenticated users

### Integration Tests

| Test File | Coverage |
|-----------|----------|
| `backend/src/routes/__tests__/initiatives.integration.test.ts` | Full API endpoint testing |

**Key scenarios**:
- `DELETE /initiatives/:id` returns 200 and documents are moved (not deleted)
- `GET /initiatives` returns data matching old `GET /projects` response shape
- RLS prevents cross-account access on renamed tables

### Manual Testing

- [ ] Verify all data present after migration (compare row counts)
- [ ] Test initiative CRUD via API client
- [ ] Test document CRUD via API client
- [ ] Delete an initiative and verify documents appear under General
- [ ] Attempt to delete General folder — should fail with 400

## Error Handling

| Error Scenario | Handling Strategy |
|----------------|-------------------|
| Migration fails mid-transaction | Automatic rollback (transactional) |
| Delete General folder attempted | Return 400: "Cannot delete the default system folder" |
| Delete initiative with documents | Move docs to General, then delete initiative |
| Create folder with duplicate slug | Return 409: "A folder with this name already exists" |
| Access folder for wrong customer | RLS blocks — returns empty result |

## Validation Commands

```bash
# Type checking
cd backend && npx tsc --noEmit

# Run unit tests
cd backend && npm run test

# Build
cd backend && npm run build

# Verify migration
# Use mcp__supabase__execute_sql to query new table names
```

## Rollout Considerations

- **No feature flag**: Ships to all users
- **Migration**: Run during low-traffic period (single transactional migration)
- **Rollback plan**: Down migration script reverses all renames
- **Monitoring**: Check Supabase logs after migration for any query errors referencing old table names

## Open Items

- [ ] Audit all existing indexes and constraints before writing migration SQL
- [ ] Verify portfolio backend references are updated (FR-1.27)
- [ ] Test down migration

---

*This spec is ready for implementation. Follow the patterns and validate at each step.*
