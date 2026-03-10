# PRD: Initiative & Documents Restructure - Phase 3

**Contract**: ./contract.md
**Phase**: 3 of 3
**Focus**: Predefined folder system, filtering & search, AI chat integration

## Phase Overview

Phase 3 adds the remaining features that complete the restructure: predefined folders with visual distinction, filtering/search capabilities, and AI chat integration for auto-assigning documents to initiatives.

This phase builds on the flat document-first UI from Phase 2 by adding non-initiative folder sections (Pricing, Status Meetings, Vision, etc.) alongside initiative sections. It also adds the filtering bar that enables advisors to quickly find documents across all initiatives and folders. Finally, it updates the AI chat agent to infer the relevant initiative and auto-assign documents it creates.

After this phase, the full contract is delivered.

## User Stories

1. As an advisor, I want predefined folders (Pricing, Vision, General, etc.) to organize documents that don't belong to a specific initiative so that cross-cutting work has a natural home
2. As an advisor, I want folders to look visually different from initiatives so that I can quickly distinguish between the two
3. As an advisor, I want to filter documents by initiative status, initiative name, and document status so that I can find what I need quickly
4. As an advisor, I want the AI chat to automatically place created documents into the right initiative so that I don't have to manually organize AI-generated content
5. As an admin, I want to manage default folder definitions so that all customers get a consistent starting set
6. As an advisor, I want to customize folders for specific customers so that each customer workspace matches its needs

## Functional Requirements

### Predefined Folder System

- **FR-3.1**: Display predefined folders as collapsible sections alongside initiative sections
- **FR-3.2**: Folders are visually distinct from initiatives: folder icon (not initiative icon), muted/neutral color scheme vs initiative's status-colored badges
- **FR-3.3**: Folder sections show: folder icon + folder name + document count
- **FR-3.4**: "General" folder always appears (cannot be hidden or deleted)
- **FR-3.5**: Section ordering: initiatives first (sorted by status: active → on hold → completed), then folders (sorted by `sort_order`)
- **FR-3.6**: Documents can be assigned to a folder instead of an initiative via DocumentForm and DocumentEditor

### Folder Management

- **FR-3.7**: Global default folders managed via `document_folders` table where `customer_id IS NULL`
- **FR-3.8**: Per-customer folder overrides: when a customer has custom folders, those REPLACE global defaults entirely (except "General" which is always present regardless)
- **FR-3.9**: API endpoint to list folders for a customer: returns customer-specific folders if any exist, otherwise global defaults
- **FR-3.10**: API endpoint to create/update/delete customer-specific folders
- **FR-3.11**: Deleting a folder moves its documents to "General" (same pattern as initiative delete)
- **FR-3.12**: UI for managing folders within customer context: add/remove/rename folders via a settings popover or inline actions

### Filtering & Search

- **FR-3.13**: Filter bar at the top of the documents view with three filter controls
- **FR-3.14**: Filter by initiative status: dropdown with all initiative statuses (e.g., active, on hold, completed) — filters initiative sections
- **FR-3.15**: Filter by initiative/folder name: text search input — filters sections by name match
- **FR-3.16**: Filter by document status: dropdown with all document statuses (draft, in progress, review, final, archived) — filters document cards within all sections
- **FR-3.17**: Filters are combinable (AND logic): e.g., initiative status = "active" AND document status = "draft"
- **FR-3.18**: Empty state when filters return no results: "No documents match your filters" with clear filters button
- **FR-3.19**: Filter state lives in component state (not URL params) — resets on navigation away
- **FR-3.20**: When a section has no matching documents after filtering, hide the section entirely

### AI Chat Integration

- **FR-3.21**: Update AI agent prompts to use "initiative" and "document" terminology
- **FR-3.22**: When AI chat creates a document, it must determine the target initiative from conversation context
- **FR-3.23**: AI initiative inference logic: analyze the conversation topic, customer's existing initiatives, and document type to select the most relevant initiative
- **FR-3.24**: If no initiative can be confidently inferred, assign to "General" folder
- **FR-3.25**: AI-created documents should include the initiative/folder assignment in the creation API call
- **FR-3.26**: Update the `screenContext` passed to AI chat to include available initiatives list for the current customer

### Portfolio Module Frontend Updates

- **FR-3.27**: Update portfolio frontend components referencing customer artifacts to use new "documents" terminology and types (backend references already updated in Phase 1)
- **FR-3.28**: "Referenced by" feature in DocumentEditor continues to work with renamed types
- **FR-3.29**: Cross-module document search updated to use new API endpoints and types

## Non-Functional Requirements

- **NFR-3.1**: Filtering is instant (client-side filter on already-loaded data, no API calls)
- **NFR-3.2**: AI initiative inference adds no more than 500ms to document creation latency
- **NFR-3.3**: Folder management operations complete in under 200ms
- **NFR-3.4**: No PII logged in AI inference logic (use boolean flags per logging security rules)

## Dependencies

### Prerequisites

- Phase 2 complete: flat document-first UI with initiative sections
- `document_folders` table created in Phase 1
- AI chat agent infrastructure accessible for prompt updates

### Outputs for Next Phase

- N/A — this is the final phase

## Acceptance Criteria

- [ ] Predefined folders appear as collapsible sections below initiatives
- [ ] Folders are visually distinct from initiatives (folder icon, different styling)
- [ ] "General" folder is always present and undeletable
- [ ] Documents can be assigned to folders via DocumentForm and DocumentEditor
- [ ] Global default folders configurable via DB
- [ ] Per-customer folder overrides work correctly
- [ ] Folder delete moves documents to General
- [ ] Filter bar shows three filter controls: initiative status, name search, document status
- [ ] Filters work correctly with AND logic
- [ ] Sections with no matching documents are hidden when filtered
- [ ] Clear filters button resets all filters
- [ ] AI chat creates documents with auto-inferred initiative assignment
- [ ] AI falls back to General when initiative can't be determined
- [ ] AI agent prompts use "initiative" and "document" terminology
- [ ] Portfolio module references updated to new types/endpoints
- [ ] "Referenced by" works correctly in DocumentEditor
- [ ] No TypeScript errors in frontend or backend builds
- [ ] All portaled components have `data-portal-ignore-click-outside`

## Open Questions

- What are the initial default folder names? (User deferred to implementation time)
- Should folder management be a dedicated settings panel or inline section actions?
- Should AI confidence threshold for initiative assignment be configurable?

---

*Review this PRD and provide feedback before spec generation.*
