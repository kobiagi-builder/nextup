# PRD: Writing References Redesign - Phase 1

**Contract**: ./contract.md
**Phase**: 1 of 3
**Focus**: Database schema, per-type CRUD API, and tabbed frontend UI

## Phase Overview

Phase 1 establishes the foundation: the database schema change, the per-type API surface, and the redesigned frontend screen with tabbed navigation. After this phase, users can manage writing references organized by artifact type using paste and basic file upload (.md, .txt) — the two methods that already partially work.

This phase is sequenced first because everything else (binary file parsing, URL extraction, scraping) depends on the per-type data model and the new UI shell being in place. It also delivers immediate value: users can finally organize references by type and the content agent can filter by type.

After Phase 1 completes, the feature is usable end-to-end for plain text references, the content agent pipeline uses type-filtered references, and the UI is ready to accept more upload methods in Phase 2.

## User Stories

1. As a consultant, I want to organize my writing references by content type (blog, social post, showcase) so that the AI learns my distinct voice for each format.
2. As a user, I want to see a progress indicator per type so I know how many references I've added for blogs vs. social posts vs. showcases.
3. As a user, I want to upload a reference by pasting text or uploading a .md/.txt file, tagged to a specific artifact type, so that my references are categorized correctly.
4. As a user, I want to view the full content of any uploaded reference so I can verify what the system captured.
5. As a user, I want to delete references I no longer want the AI to use for style matching.
6. As a content creator, I want the AI content agent to use only my blog references when writing a blog (and likewise for other types) so my voice is matched accurately per format.

## Functional Requirements

### Database & Migration

- **FR-1.1**: Add `artifact_type` column (nullable, type: `text`, values: `'blog'`, `'social_post'`, `'showcase'`) to the `user_writing_examples` table via Supabase migration.
- **FR-1.2**: Add `extraction_status` column (type: `text`, values: `'success'`, `'pending'`, `'extracting'`, `'failed'`, default: `'success'`) to `user_writing_examples`.
- **FR-1.3**: Add `source_url` column (nullable, type: `text`) to `user_writing_examples` for storing original URLs.
- **FR-1.4**: Existing rows with NULL `artifact_type` remain valid — they are not used by the type-filtered pipeline but are not deleted.
- **FR-1.5**: Remove the 500-word minimum validation from the backend `createWritingExample` controller.

### API Updates

- **FR-1.6**: `POST /api/user/writing-examples` accepts optional `artifact_type` field. If provided, stores it with the reference.
- **FR-1.7**: `GET /api/user/writing-examples` accepts optional `?artifact_type=blog` query parameter to filter by type. Without the param, returns all.
- **FR-1.8**: Response shape unchanged — `UserWritingExample` objects now include `artifact_type`, `extraction_status`, and `source_url` fields.

### Pipeline Integration

- **FR-1.9**: `analyzeWritingCharacteristics` tool in `writingCharacteristicsTools.ts` filters `user_writing_examples` by `artifact_type` matching the current artifact's type. Query: `.eq('artifact_type', artifactType)` instead of fetching all.
- **FR-1.10**: When zero type-matching references exist, the tool proceeds with default characteristics (existing behavior) — no blocking or error.

### Frontend — Tabbed Layout

- **FR-1.11**: Replace the flat WritingStylePage with a tabbed interface: **Blog** | **Social Post** | **Showcase**.
- **FR-1.12**: Each tab displays its own reference collection, filtered by artifact type.
- **FR-1.13**: Each tab shows a progress indicator (e.g., "3 references" with visual bar). No target number — just a count.
- **FR-1.14**: Tab shows empty state with CTA when no references exist for that type.

### Frontend — Reference Cards

- **FR-1.15**: Each reference displays: name, source type icon (paste/file), word count, content preview (first 200 chars), and delete button.
- **FR-1.16**: Clicking a reference card opens a view showing the full extracted content (read-only).
- **FR-1.17**: Delete button with confirmation removes the reference.
- **FR-1.18**: Extraction status badge shown on each card (success = green check, failed = red with retry, pending/extracting = spinner).

### Frontend — Upload Flow (Phase 1: Paste + .md/.txt)

- **FR-1.19**: "Add Reference" button per tab opens an upload dialog/sheet.
- **FR-1.20**: Upload dialog shows method selection: **Paste Text** | **Upload File** (Phase 1 only — more methods added in Phase 2).
- **FR-1.21**: Paste method: text area + name field. Submit saves with `source_type: 'pasted'` and the current tab's artifact type.
- **FR-1.22**: File method: file picker for `.md`, `.txt`. Reads content via `file.text()`, auto-fills name from filename. Saves with `source_type: 'file_upload'`.
- **FR-1.23**: After submit, reference appears in the list with `extraction_status: 'success'` (plain text extraction is instant).

## Non-Functional Requirements

- **NFR-1.1**: API responses for filtered list under 200ms p95.
- **NFR-1.2**: Tab switching is instant (client-side filter or separate queries with React Query caching).
- **NFR-1.3**: Frontend types updated — `UserWritingExample` includes `artifact_type`, `extraction_status`, `source_url`.
- **NFR-1.4**: RLS policies on `user_writing_examples` continue to enforce user-level access.

## Dependencies

### Prerequisites

- Existing `user_writing_examples` table in Supabase
- Existing CRUD API at `/api/user/writing-examples`
- Existing `analyzeWritingCharacteristics` tool in the content agent pipeline

### Outputs for Next Phase

- Per-type data model (`artifact_type` column) in place
- Extraction status tracking (`extraction_status` column) in place
- Source URL storage (`source_url` column) in place
- Tabbed UI shell ready to accept additional upload methods
- Upload dialog component extensible for new method tabs

## Acceptance Criteria

- [ ] `/settings/style` displays 3 tabs: Blog, Social Post, Showcase
- [ ] Each tab shows only references for that artifact type
- [ ] Users can add a reference via paste or .md/.txt file upload, tagged to the active tab's type
- [ ] Reference cards show name, source type, word count, preview, extraction status, delete
- [ ] Clicking a reference shows full extracted content
- [ ] Deleting a reference removes it from the list
- [ ] `analyzeWritingCharacteristics` filters by artifact type when querying references
- [ ] No minimum word count enforced
- [ ] Existing untyped references are preserved but don't appear in any type tab
- [ ] Backend build compiles with no TypeScript errors
- [ ] Frontend build compiles with no TypeScript errors

---

*Review this PRD and provide feedback before spec generation.*
