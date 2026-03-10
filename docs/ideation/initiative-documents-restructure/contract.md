# Initiative & Documents Restructure Contract

**Created**: 2026-03-08
**Confidence Score**: 95/100
**Status**: Draft

## Problem Statement

The current customer workspace uses a project-centric hierarchy where users must navigate into a project to see its artifacts. This two-level drill-down (project list → project detail → artifact list) creates friction for advisors who think in terms of documents they're working on, not the containers (projects) those documents live in.

The terminology ("projects" and "artifacts") doesn't align with how advisors describe their work — they work on **initiatives** with customers and produce **documents**. The current UI forces a project-first mental model when advisors want a document-first view with flexible grouping.

Additionally, there's no way to organize documents outside of projects — common cross-cutting categories like Pricing, Status Meetings, and Vision have no natural home.

## Goals

1. **Terminology alignment**: Rename "projects" → "initiatives" and "artifacts" → "documents" across the entire stack — full DB rename (tables, columns, foreign keys, RLS policies, indexes), API routes, frontend types/labels, AI agent prompts
2. **Document-first UI**: Restructure the UI to show all documents grouped by initiative/folder as collapsible sections, eliminating the two-level drill-down
3. **Flexible categorization**: Support both user-created initiatives AND predefined system folders (e.g., Pricing, Vision, General) for organizing documents
4. **Filtering & discovery**: Enable filtering by initiative status, initiative name, and document status to quickly find documents
5. **Initiative CRUD with safe deletion**: Full initiative management where deleting an initiative moves its documents to the "General" folder instead of cascading deletes
6. **AI-powered document assignment**: AI chat infers the relevant initiative from conversation context and auto-assigns created documents (fallback to General folder)

## Success Criteria

- [ ] All UI labels, API endpoints, types, and DB references use "initiative" and "document" terminology
- [ ] The main view shows all documents grouped under collapsible initiative sections and folder sections
- [ ] Collapsed sections show only initiative/folder name and status; expanded sections show document cards (title + status badge + type badge)
- [ ] Predefined folders (starting with "General") are visually distinct from initiative sections (e.g., folder icon, different styling)
- [ ] "General" folder is permanent and undeletable — receives orphaned documents from deleted initiatives
- [ ] System default folders are manageable by admin; per-customer overrides supported
- [ ] Documents can be created manually with initiative or folder assignment
- [ ] Documents can be reassigned to a different initiative or folder
- [ ] Initiatives support full CRUD (create, update name/status/due date, delete)
- [ ] Deleting an initiative moves all its documents to "General" folder
- [ ] Filters work for: initiative status, initiative name (search), document status
- [ ] AI chat infers relevant initiative from conversation context and auto-assigns created documents (General as fallback)
- [ ] Initiatives retain optional agreement linking
- [ ] Documents retain their type system (strategy, research, roadmap, etc.) alongside folder/initiative grouping
- [ ] Existing data auto-migrated: projects → initiatives, artifacts → documents, relationships preserved
- [ ] No feature flag — available to all users immediately

## Scope Boundaries

### In Scope

- Full DB rename: tables (`projects` → `initiatives`, `customer_artifacts` → `customer_documents`), columns, foreign keys, RLS policies, indexes
- Terminology rename across API routes, frontend labels, TypeScript types, AI agent prompts
- UI restructure from project-drill-down to document-first collapsible sections
- Initiative CRUD (create, read, update, delete with safe document reassignment)
- Predefined folder system with global defaults + per-customer overrides
- Document creation with initiative/folder assignment
- Document reassignment between initiatives/folders
- Filtering by initiative status, initiative name, document status
- AI chat auto-assignment of created documents to initiatives
- Data migration (projects → initiatives, artifacts → documents)
- Agreement linking preserved on initiatives
- Document type system preserved alongside grouping

### Out of Scope

- Portfolio module UI changes — portfolio keeps its own UI/UX, but code references to customer artifacts will be updated to use new "documents" naming as part of the full DB rename
- New document types — keep existing type enum unchanged
- Advanced search (full-text content search) — current title search preserved
- Drag-and-drop reordering of documents or sections
- Custom initiative status definitions — keep current project statuses

### Future Considerations

- Admin settings UI for managing global folder defaults
- Drag-and-drop document reassignment between sections
- Document templates per folder/initiative type
- Bulk document operations (move multiple, bulk status change)
- Initiative progress tracking (% documents completed)

---

*This contract was generated from brain dump input. Review and approve before proceeding to PRD generation.*
