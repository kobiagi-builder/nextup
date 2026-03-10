# PRD: Initiative & Documents Restructure - Phase 2

**Contract**: ./contract.md
**Phase**: 2 of 3
**Focus**: Frontend restructure — document-first UI with collapsible initiative sections

## Phase Overview

Phase 2 delivers the core user-facing change: replacing the project-drill-down UI with a flat, document-first view where all documents are visible grouped under collapsible initiative sections. This is the most impactful phase for user experience.

This phase depends on the renamed API from Phase 1. After completion, advisors will see all their customer documents organized by initiative in a single scrollable view — no more navigating into a project to find documents. Initiative CRUD (create, update, delete) is fully functional with the safe delete behavior (documents move to General).

Document creation now includes initiative assignment, and documents can be reassigned between initiatives. The ArtifactEditor becomes the DocumentEditor with full rename.

## User Stories

1. As an advisor, I want to see all documents for a customer grouped by initiative in a single view so that I don't have to drill into each project separately
2. As an advisor, I want to collapse/expand initiative sections so that I can focus on the initiatives I'm actively working on
3. As an advisor, I want to create a new document and assign it to an initiative so that it's organized from the start
4. As an advisor, I want to move a document from one initiative to another so that I can reorganize as my work evolves
5. As an advisor, I want to create, edit, and delete initiatives so that I can manage my customer engagement structure
6. As an advisor, I want deleted initiative documents to automatically move to General so that no work is lost

## Functional Requirements

### Frontend Types Rename

- **FR-2.1**: Rename all frontend TypeScript types to match backend: `Project` → `Initiative`, `CustomerArtifact` → `CustomerDocument`, etc.
- **FR-2.2**: Update all React Query hooks: `useProjects` → `useInitiatives`, `useCustomerArtifacts` → `useCustomerDocuments`, etc.
- **FR-2.3**: Update Zustand store: `selectedProjectIds` → `selectedInitiativeIds`
- **FR-2.4**: Update all API endpoint URLs to match Phase 1 renamed routes

### Document-First UI Layout

- **FR-2.5**: Replace the two-level view (ProjectsTab → ProjectDetail) with a single flat view showing all initiatives as collapsible sections
- **FR-2.6**: Each initiative section header shows: initiative name, status badge, document count
- **FR-2.7**: Collapsed state: show only the section header (name + status)
- **FR-2.8**: Expanded state: show document cards below the header
- **FR-2.9**: Document cards display: title + status badge + type badge (minimal card)
- **FR-2.10**: Clicking a document card opens the DocumentEditor sheet (formerly ArtifactEditor)
- **FR-2.11**: Default state: all initiative sections expanded on first load
- **FR-2.12**: Collapse/expand state persisted per session (not across sessions)
- **FR-2.12a**: Empty initiatives (0 documents) still display as sections so users can add documents to them

### Initiative CRUD

- **FR-2.13**: "New Initiative" button at the top of the documents view
- **FR-2.14**: Initiative create form: name (required), description (optional), status (dropdown), linked agreement (optional dropdown)
- **FR-2.15**: Initiative edit: accessible via section header action menu (three-dot menu)
- **FR-2.16**: Initiative delete: confirmation dialog warning that documents will move to General folder (NOT cascade delete warning)
- **FR-2.17**: After initiative delete, documents appear in a "General" section immediately

### Document Creation & Assignment

- **FR-2.18**: "New Document" button — globally accessible (not per-initiative)
- **FR-2.19**: Document create form: title (required), type (dropdown), initiative assignment (dropdown — lists all initiatives + "General")
- **FR-2.20**: Default initiative assignment: "General" if no initiative selected

### Document Reassignment

- **FR-2.21**: In DocumentEditor, add an "Initiative" dropdown showing all available initiatives + "General"
- **FR-2.22**: Changing the initiative dropdown value moves the document to the selected initiative
- **FR-2.23**: Moving a document triggers React Query cache invalidation for both source and destination initiative sections

### Component Renames

- **FR-2.24**: `ProjectsTab` → `DocumentsTab`
- **FR-2.25**: `ProjectCard` → removed (replaced by initiative section headers)
- **FR-2.26**: `ProjectDetail` → removed (replaced by flat section layout)
- **FR-2.27**: `ProjectForm` → `InitiativeForm`
- **FR-2.28**: `ArtifactRow` → `DocumentCard` (redesigned as minimal card)
- **FR-2.29**: `ArtifactEditor` → `DocumentEditor`
- **FR-2.30**: `ArtifactForm` → `DocumentForm`
- **FR-2.31**: `CustomerRichTextEditor` → preserved (name still accurate)

### UI Labels & Copy

- **FR-2.32**: All UI text updated: "project" → "initiative", "artifact" → "document"
- **FR-2.33**: Empty states updated: "Create your first initiative", "No documents yet"
- **FR-2.34**: Confirmation dialogs updated with new terminology
- **FR-2.35**: Tab label: "Projects" → "Documents" (since the view is now document-centric)

## Non-Functional Requirements

- **NFR-2.1**: Page load with 50+ documents across 10+ initiatives renders in under 500ms
- **NFR-2.2**: Collapse/expand animations smooth (CSS transitions, no layout thrashing)
- **NFR-2.3**: All portaled components (dialogs, sheets, dropdowns) include `data-portal-ignore-click-outside`
- **NFR-2.4**: Keyboard accessible: sections expandable via Enter/Space, tab navigation between cards

## Dependencies

### Prerequisites

- Phase 1 complete: renamed DB, backend API, and types
- "General" folder seeded in database

### Outputs for Next Phase

- Flat document-first UI with collapsible sections
- Initiative CRUD functional
- Document creation with initiative assignment
- Document reassignment working
- All components renamed and functional

## Acceptance Criteria

- [ ] Single flat view replaces the two-level drill-down — no ProjectDetail page
- [ ] All documents visible grouped under initiative section headers
- [ ] Sections collapse/expand correctly with smooth animation
- [ ] Collapsed shows: initiative name + status badge + document count
- [ ] Expanded shows: document cards with title + status badge + type badge
- [ ] Initiative CRUD works: create, edit (name/status/description/agreement), delete
- [ ] Deleting initiative moves documents to General section (visible immediately)
- [ ] New documents can be created with initiative assignment
- [ ] Documents can be reassigned to different initiatives via DocumentEditor
- [ ] All UI text uses "initiative" and "document" terminology
- [ ] Tab label reads "Documents"
- [ ] DocumentEditor sheet opens and functions correctly (auto-save, resize, status change)
- [ ] All portaled components have `data-portal-ignore-click-outside`
- [ ] No TypeScript errors in frontend build
- [ ] All existing functionality preserved (rich text editing, auto-save, referenced-by)

## Open Questions

- Should "General" appear at the top or bottom of the sections list?
- Should we persist collapse/expand state to localStorage or just session memory?

---

*Review this PRD and provide feedback before spec generation.*
