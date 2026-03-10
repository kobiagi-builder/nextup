# PRD: Initiative & Documents Restructure - Phase 1

**Contract**: ./contract.md
**Phase**: 1 of 3
**Focus**: Database migration & backend rename (projects → initiatives, artifacts → documents)

## Phase Overview

Phase 1 establishes the foundation by renaming the database schema and backend layer from "projects/artifacts" to "initiatives/documents." This must come first because every subsequent phase (frontend UI, folder system, AI integration) depends on the renamed data model and API contracts.

This phase delivers no visible UI changes but creates the renamed API surface that Phase 2 will consume. It includes a data migration that preserves all existing relationships. After this phase, the backend serves the new terminology while remaining backward-compatible during the transition.

A new `document_folders` table is also introduced in this phase to support the predefined folder system needed in Phase 3. This avoids a second migration later.

## User Stories

1. As an advisor, I want my existing projects and artifacts to be seamlessly migrated to initiatives and documents so that no data is lost during the transition
2. As a developer, I want the API to use consistent "initiative" and "document" terminology so that the frontend can be built against clean contracts
3. As an advisor, I want the "General" folder to exist automatically for each customer so that documents always have a home

## Functional Requirements

### Database Schema Rename

- **FR-1.1**: Rename table `projects` → `initiatives` with all columns preserved
- **FR-1.2**: Rename table `customer_artifacts` → `customer_documents` with all columns preserved
- **FR-1.3**: Rename foreign key column `project_id` → `initiative_id` in `customer_documents` table
- **FR-1.4**: Update all RLS policies to reference new table/column names
- **FR-1.5**: Update all indexes to reference new table/column names
- **FR-1.6**: Add new nullable column `folder_id` to `customer_documents` (for Phase 3 folder assignment)

### New Folder Table

- **FR-1.7**: Create `document_folders` table with columns: `id`, `name`, `slug`, `is_system` (boolean), `is_default` (boolean — marks the catch-all folder), `customer_id` (nullable — NULL = global default, set = per-customer override), `sort_order`, `created_at`, `updated_at`
- **FR-1.8**: Seed global "General" folder with `is_system = true`, `is_default = true`, `customer_id = NULL`
- **FR-1.9**: RLS policy: users can read global folders (customer_id IS NULL) + their own customer folders
- **FR-1.10**: "General" folder (is_default = true) cannot be deleted via API

### Data Migration

- **FR-1.11**: Migrate all existing data preserving IDs, timestamps, and relationships
- **FR-1.12**: All existing documents retain their `initiative_id` (formerly `project_id`) relationship
- **FR-1.13**: Migration must be reversible (down migration available)

### Backend Services Rename

- **FR-1.14**: Rename `ProjectService` → `InitiativeService` with all methods updated
- **FR-1.15**: Rename `CustomerArtifactService` → `CustomerDocumentService` with all methods updated
- **FR-1.16**: Create `DocumentFolderService` with CRUD operations for folders

### Backend Controllers & Routes Rename

- **FR-1.17**: Rename routes from `/api/customers/:id/projects` → `/api/customers/:id/initiatives`
- **FR-1.18**: Rename routes from `/api/customers/:id/projects/:projectId/artifacts` → `/api/customers/:id/initiatives/:initiativeId/documents`
- **FR-1.19**: Rename flat route `/api/customers/:id/artifacts` → `/api/customers/:id/documents`
- **FR-1.20**: Add new routes `/api/document-folders` for folder CRUD (global + per-customer)
- **FR-1.21**: Rename controllers: `project.controller.ts` → `initiative.controller.ts`, `customer-artifact.controller.ts` → `customer-document.controller.ts`

### Backend Types Rename

- **FR-1.22**: Rename all TypeScript types: `Project` → `Initiative`, `CustomerArtifact` → `CustomerDocument`, `ProjectStatus` → `InitiativeStatus`, `ArtifactType` → `DocumentType`, `ArtifactStatus` → `DocumentStatus`
- **FR-1.23**: Add new `DocumentFolder` type
- **FR-1.24**: Update validation constants: `VALID_PROJECT_STATUSES` → `VALID_INITIATIVE_STATUSES`, etc.

### Initiative Delete Behavior Change

- **FR-1.25**: When deleting an initiative, move all its documents to the "General" folder instead of cascading delete
- **FR-1.26**: Update the delete endpoint to perform: SET `initiative_id = NULL`, `folder_id = general_folder_id` on all documents, THEN delete initiative

## Non-Functional Requirements

- **NFR-1.1**: Migration must complete without downtime (use transactional migration)
- **NFR-1.2**: API response times unchanged (under 200ms p95)
- **NFR-1.3**: All RLS policies must be tested — no data leakage between accounts
- **NFR-1.4**: Migration must be idempotent (safe to run multiple times)

## Dependencies

### Prerequisites

- Current `projects` and `customer_artifacts` tables exist and are populated
- Supabase MCP access for migration execution

### Outputs for Next Phase

- Renamed DB schema (initiatives, customer_documents, document_folders)
- Renamed backend API serving `/api/customers/:id/initiatives` and `/api/customers/:id/documents`
- `DocumentFolderService` with CRUD operations
- Updated TypeScript types for frontend consumption
- "General" folder seeded for all existing customers

## Acceptance Criteria

- [ ] `initiatives` table exists with all data from former `projects` table
- [ ] `customer_documents` table exists with all data from former `customer_artifacts` table
- [ ] `document_folders` table exists with "General" seeded as default
- [ ] All RLS policies work correctly on renamed tables
- [ ] `GET /api/customers/:id/initiatives` returns former projects data
- [ ] `GET /api/customers/:id/initiatives/:initiativeId/documents` returns former artifacts data
- [ ] `DELETE /api/customers/:id/initiatives/:initiativeId` moves documents to General folder (not cascade delete)
- [ ] All backend TypeScript compiles without errors
- [ ] All existing relationships preserved (document → initiative, initiative → agreement)
- [ ] Down migration available and tested

### Portfolio Backend References

- **FR-1.27**: Update all backend portfolio code that references `customer_artifacts` to use `customer_documents` (types, queries, service methods) — this must happen in Phase 1 to prevent build breakage after DB rename

## Open Questions

- None — hard-cut on API routes (no deprecated aliases needed, single-user app with no third-party consumers)

---

*Review this PRD and provide feedback before spec generation.*
