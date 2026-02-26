# PRD: Customers Management Platform - Phase 5

**Contract**: ./contract.md
**Phase**: 5 of 5
**Focus**: Cross-module integration, customer card enhancements, polish, and agent refinement

## Phase Overview

Phase 5 ties everything together. It implements cross-module linking between customer artifacts and portfolio content, enhances the customer list cards with richer data summaries, refines agent prompts based on usage patterns, and polishes the overall UX with loading states, error handling, and responsive design improvements.

This phase is sequenced last because it's the integration and polish layer - it can only be done once all individual pieces (customer data, agreements, receivables, projects, and agents) are functional. It ensures the Customers module feels like a native part of NextUp rather than a bolted-on feature.

After Phase 5, the Customers Management Platform is complete at basic depth across all domains, with AI agents fully integrated, cross-module references working, and a polished user experience.

## User Stories

1. As an advisor, I want to reference a customer artifact (strategy doc, research) when creating portfolio content so that my customer work informs my content creation.
2. As an advisor, I want customer list cards to show a rich summary (status, active agreements, outstanding balance, active projects, last activity) so that I get a complete picture at a glance.
3. As an advisor, I want the agents to improve over time based on my customer data patterns so that recommendations become more relevant.
4. As an advisor, I want consistent loading states, error handling, and empty states across all customer tabs so that the experience is smooth.
5. As an advisor, I want the customer module to work well on mobile devices so that I can check customer info on the go.
6. As an advisor, I want to search and filter across all my customers, agreements, and projects so that I can quickly find what I need.

## Functional Requirements

### Cross-Module Integration

- **FR-5.1**: Portfolio artifact creation/editing includes a "References" or "Linked Resources" section where users can search and link customer artifacts by title or type.
- **FR-5.2**: Linked customer artifacts show as clickable chips/tags in the portfolio artifact editor, linking back to the customer artifact page.
- **FR-5.3**: Customer artifacts show a "Referenced by" section listing any portfolio artifacts that link to them.
- **FR-5.4**: Content Agent gains awareness of customer artifacts: when creating content, it can reference linked customer strategies/research in its system prompt context.

### Customer Card Enhancements

- **FR-5.5**: Customer list cards display enriched data: customer name, status badge, vertical/industry tag, active agreements count, outstanding balance (if > 0), active projects count, last activity timestamp.
- **FR-5.6**: Cards support a compact/expanded view toggle for the list page.
- **FR-5.7**: Quick actions on cards: change status (dropdown), open chat, create project, archive.
- **FR-5.8**: Card sorting options: by name, status, last activity, outstanding balance, creation date.

### Search and Filtering

- **FR-5.9**: Global search within the Customers module: search by customer name, vertical, or tag across all customers.
- **FR-5.10**: Advanced filters: filter by status, has active agreements (yes/no), has outstanding balance (yes/no), has active projects (yes/no), created date range.
- **FR-5.11**: Filter state persists in URL query params for shareable filtered views.

### Agent Refinement

- **FR-5.12**: Customer Mgmt Agent system prompt refined with: recent event log entries (last 5-10), relationship health signals derived from receivables status and agreement renewals, stakeholder context.
- **FR-5.13**: Product Mgmt Agent system prompt refined with: existing artifact summaries (types and titles across projects), product maturity assessment from project history, prioritization context from past artifacts.
- **FR-5.14**: Agent prompt templates are stored in dedicated files (following existing `systemPrompts.ts` pattern) for easy iteration and testing.
- **FR-5.15**: Agent responses include contextual action suggestions: after discussing strategy, suggest "Want me to create a strategy artifact?" or after discussing a late payment, suggest "Want me to draft a follow-up email?".

### UX Polish

- **FR-5.16**: Consistent loading skeletons for all customer pages and tabs (following existing skeleton patterns).
- **FR-5.17**: Error boundaries with meaningful error messages for failed data fetches.
- **FR-5.18**: Empty states for each tab with helpful CTAs: "No agreements yet - Add your first agreement", "No projects yet - Start a product workflow".
- **FR-5.19**: Confirmation dialogs for all destructive actions (delete customer, delete agreement, delete project, delete artifact).
- **FR-5.20**: Toast notifications for successful operations (customer created, status changed, artifact generated, etc.).
- **FR-5.21**: Responsive design: customer list uses stacked cards on mobile, tabs become scrollable on narrow viewports, chat panel uses full-screen overlay on mobile.

### Overview Tab Enhancement

- **FR-5.22**: Overview tab includes a "Quick Stats" section at the top: total agreements (active/total), financial summary (invoiced/paid/balance), active projects count, last agent interaction.
- **FR-5.23**: Event log timeline in Overview tab with chronological display of events, filterable by event type.
- **FR-5.24**: Team members section with structured display: name, role, email, notes, with add/edit/remove functionality.

### Backend Enhancements

- **FR-5.25**: `GET /api/customers` enhanced with: include summary stats (agreements count, balance, projects count) in list response to avoid N+1 queries.
- **FR-5.26**: `GET /api/customers/search` - Full-text search across customer names, verticals, and info fields.
- **FR-5.27**: Customer dashboard stats endpoint: `GET /api/customers/stats` - Aggregate stats across all customers (total customers by status, total outstanding, total active projects).

## Non-Functional Requirements

- **NFR-5.1**: Customer list with summary stats loads under 500ms p95 for up to 100 customers (single query with aggregates).
- **NFR-5.2**: Full-text search returns results under 300ms p95.
- **NFR-5.3**: Cross-module references resolve under 200ms.
- **NFR-5.4**: Mobile-responsive at all breakpoints (320px, 375px, 768px, 1024px, 1280px+).
- **NFR-5.5**: All interactive elements have appropriate loading, disabled, and error states.
- **NFR-5.6**: Accessibility: all form inputs have labels, focus management on modals/dialogs, keyboard navigation for card list.

## Dependencies

### Prerequisites

- Phases 1-4 complete (all customer data domains + agents)
- Portfolio module accessible for cross-module integration
- Existing toast/notification infrastructure

### Outputs for Next Phase

- N/A (final phase)
- All documentation updated via product-documentation skill
- Complete, polished Customers Management Platform

## Acceptance Criteria

- [ ] Customer artifacts can be linked from portfolio artifact editor
- [ ] Linked artifacts show as clickable references in both directions
- [ ] Customer list cards show enriched data (agreements, balance, projects, activity)
- [ ] Card sorting works for all sort options
- [ ] Search finds customers by name, vertical
- [ ] Advanced filters work for status, agreements, balance, projects
- [ ] Agent prompts include recent event context and relationship signals
- [ ] Agent responses include contextual action suggestions
- [ ] Loading skeletons appear for all async content
- [ ] Error states display meaningful messages
- [ ] Empty states show helpful CTAs
- [ ] All destructive actions show confirmation dialogs
- [ ] Toast notifications for CRUD operations
- [ ] Responsive design works on mobile viewports
- [ ] Overview tab shows quick stats and event timeline
- [ ] Customer list API returns summary stats in single query
- [ ] Full-text search works
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] E2E tests for critical paths (create customer, manage agreement, create project, chat with agent)

---

*Review this PRD and provide feedback before spec generation.*
