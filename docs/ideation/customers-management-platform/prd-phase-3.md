# PRD: Customers Management Platform - Phase 3

**Contract**: ./contract.md
**Phase**: 3 of 5
**Focus**: Product workflow projects and customer artifacts

## Phase Overview

Phase 3 implements the product engagement dimension. Each customer can have multiple "projects" - these are not generic project management boards, but structured product management workflows. Each project represents a product engagement (e.g., "Strategy Development", "Q1 Roadmap", "User Research Sprint") and generates artifacts (strategy documents, research reports, roadmaps, competitive analyses, etc.).

This phase is sequenced third because it builds on the customer data model (Phase 1) and benefits from the agreement context (Phase 2) - projects are often linked to service agreements. It must be complete before Phase 4 (AI Agents) so the agents have projects and artifacts to work with.

After Phase 3, advisors can create product workflow projects per customer, manually create and manage artifacts within those projects, and organize their product management deliverables. The AI-powered artifact generation comes in Phase 4.

## User Stories

1. As an advisor, I want to create product workflow projects for a customer so that I can organize my product management engagements.
2. As an advisor, I want to see all projects for a customer in the Projects tab so that I can quickly access any engagement.
3. As an advisor, I want each project to have a name, description, status, and collection of artifacts so that my work is structured.
4. As an advisor, I want to create artifacts within a project (strategies, research docs, roadmaps, etc.) so that I can build deliverables for my customer.
5. As an advisor, I want to view and edit artifact content in a rich text editor so that I can refine deliverables.
6. As an advisor, I want to link a project to a service agreement so that I can track which projects relate to which agreements.
7. As an advisor, I want project artifacts to be cross-referenceable from the Portfolio module so that I can link customer work to my content creation.

## Functional Requirements

### Projects Tab

- **FR-3.1**: Projects tab displays all projects for the customer as cards, showing: project name, status badge, artifact count, last updated, and optional linked agreement reference.
- **FR-3.2**: Project statuses: Active, Planning, On Hold, Completed, Archived. Free transitions.
- **FR-3.3**: "New Project" button opens creation form: name (required), description (optional), status (default: 'planning'), linked agreement (optional select from customer's agreements).
- **FR-3.4**: Project cards are clickable - expand to show project detail view (inline or sub-page within the tab).
- **FR-3.5**: Projects can be edited (name, description, status, linked agreement) and deleted with confirmation.

### Project Detail View

- **FR-3.6**: Project detail view shows project header (name, status, description, linked agreement) and a list of artifacts below.
- **FR-3.7**: Artifacts displayed as a list with: title, type badge, status, last updated, and preview snippet.
- **FR-3.8**: "New Artifact" button opens creation form: title (required), type (select from artifact types), initial content (rich text editor).
- **FR-3.9**: Artifact types: strategy, research, roadmap, competitive_analysis, user_research, product_spec, meeting_notes, presentation, ideation, custom.
- **FR-3.10**: Clicking an artifact opens it in a content viewer/editor panel.

### Artifact Editor

- **FR-3.11**: Artifact content uses a rich text editor consistent with the existing artifact editor in the Portfolio module (TipTap-based).
- **FR-3.12**: Artifacts have a status lifecycle: draft, in_progress, review, final, archived.
- **FR-3.13**: Artifact metadata shown in a header: title, type, status, created date, last updated.
- **FR-3.14**: Auto-save on content changes (debounced, similar to portfolio artifact editor behavior).

### Cross-Module Linking

- **FR-3.15**: Customer artifacts have a unique ID that can be referenced from Portfolio artifacts via a "linked resources" or "references" field.
- **FR-3.16**: The cross-reference is a lightweight link (just an ID reference), not deep integration. Users can copy/reference customer artifacts when creating content.

### Backend API - Projects

- **FR-3.17**: `GET /api/customers/:customerId/projects` - List all projects for a customer.
- **FR-3.18**: `POST /api/customers/:customerId/projects` - Create project.
- **FR-3.19**: `PUT /api/customers/:customerId/projects/:id` - Update project.
- **FR-3.20**: `DELETE /api/customers/:customerId/projects/:id` - Delete project and cascade to artifacts.
- **FR-3.21**: `GET /api/customers/:customerId/projects/:id` - Get project with its artifacts.

### Backend API - Artifacts

- **FR-3.22**: `GET /api/customers/:customerId/projects/:projectId/artifacts` - List artifacts in a project.
- **FR-3.23**: `POST /api/customers/:customerId/projects/:projectId/artifacts` - Create artifact.
- **FR-3.24**: `PUT /api/customers/:customerId/projects/:projectId/artifacts/:id` - Update artifact (title, content, status, type).
- **FR-3.25**: `DELETE /api/customers/:customerId/projects/:projectId/artifacts/:id` - Delete artifact.
- **FR-3.26**: `GET /api/customers/:customerId/artifacts` - List ALL artifacts across all projects for a customer (flat view for agent access).

### Database Enhancements

- **FR-3.27**: Add `agreement_id` (optional FK) to `customer_projects` table for linking projects to agreements.
- **FR-3.28**: Add appropriate indexes for project-artifact queries.

### State Management

- **FR-3.29**: TanStack Query hooks: `useProjects(customerId)`, `useProject(customerId, projectId)`, `useCreateProject()`, `useUpdateProject()`, `useDeleteProject()`.
- **FR-3.30**: TanStack Query hooks: `useProjectArtifacts(customerId, projectId)`, `useCreateArtifact()`, `useUpdateArtifact()`, `useDeleteArtifact()`, `useCustomerArtifacts(customerId)`.
- **FR-3.31**: Editor state for artifact editing (selection tracking, auto-save status) in a Zustand store or integrated with existing editor patterns.

## Non-Functional Requirements

- **NFR-3.1**: Artifact content supports rich text (headings, lists, bold, italic, links, images, tables) via TipTap editor.
- **NFR-3.2**: Auto-save debounced to 1-2 seconds after last keystroke.
- **NFR-3.3**: Artifact list loads under 200ms p95 for projects with up to 50 artifacts.
- **NFR-3.4**: RLS ensures artifacts inherit customer ownership through project->customer chain.
- **NFR-3.5**: Artifact content stored as text (HTML/markdown) with no size limit at this stage.

## Dependencies

### Prerequisites

- Phase 1 complete (customer detail page with tabs, customer API)
- Phase 2 complete (agreements data available for project linking)
- `customer_projects` and `customer_artifacts` tables exist (schema from Phase 1)

### Outputs for Next Phase

- Project and artifact CRUD fully functional
- Artifact data structure ready for AI agent generation (Phase 4)
- Project context available for Product Mgmt Agent to reference
- Artifact editor ready for AI-generated content injection

## Acceptance Criteria

- [ ] Projects tab shows list of projects for a customer
- [ ] Create/edit/delete project works end-to-end
- [ ] Project detail view shows project info and artifact list
- [ ] Create/edit/delete artifact works end-to-end
- [ ] Artifact types include all 10 defined types
- [ ] Rich text editor works for artifact content (consistent with Portfolio editor)
- [ ] Auto-save works on artifact content changes
- [ ] Projects can optionally link to a service agreement
- [ ] Customer artifacts use UUID primary keys (cross-module reference infrastructure deferred to Phase 5)
- [ ] `GET /api/customers/:id/artifacts` returns all artifacts across projects
- [ ] Artifact status lifecycle (draft -> in_progress -> review -> final -> archived) works
- [ ] RLS enforces customer ownership through project chain
- [ ] Unit tests for project and artifact service layer
- [ ] Integration tests for all API endpoints

---

*Review this PRD and provide feedback before spec generation.*
