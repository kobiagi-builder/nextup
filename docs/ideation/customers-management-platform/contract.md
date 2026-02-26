# Customers Management Platform Contract

**Created**: 2026-02-25
**Confidence Score**: 95/100
**Status**: Draft

## Problem Statement

Advisors, consultants, and fractional service providers using NextUp currently have no integrated way to manage their customer relationships, agreements, financials, or product engagements within the platform. They rely on external tools (spreadsheets, CRMs, separate project management apps) to track customer lifecycle, service agreements, invoicing, and product workflow deliverables.

This fragmentation means advisors lack a single source of truth for each customer. Context-switching between tools wastes time and creates information gaps. The existing fractional PM agent (standalone tool) proves that AI-assisted customer and product management is highly valuable, but it operates outside NextUp and stores data in markdown files rather than a structured database.

By bringing customer management into NextUp with purpose-built AI agents, advisors gain an integrated operating system where customer data, engagement history, financial tracking, and product deliverables live alongside their content portfolio - all AI-augmented.

## Goals

1. **Unified customer lifecycle management**: Advisors can create, manage, and track customers through all lifecycle stages (Lead, Prospect, Negotiation, Live, On Hold, Archive) within NextUp, with full CRUD operations and status tracking.

2. **AI-powered customer engagement**: A Customer Management Agent assists with engagement strategy, negotiation guidance, pricing recommendations, and status management - drawing from the customer's full data context.

3. **AI-powered product management**: A Product Management Agent assists with strategy creation, roadmap development, research, success measurement, and other product workflow deliverables for each customer engagement.

4. **Financial visibility**: Advisors can track service agreements (scope, type, dates, pricing) and receivables (invoices, payments, balances) per customer, providing clear financial awareness without needing external accounting tools.

5. **Structured product workflow management**: Each customer can have multiple product engagement projects, where the Product Mgmt Agent generates artifacts (strategies, research, roadmaps) within a structured workflow context.

## Success Criteria

- [ ] Users can create, edit, and delete customers with complete information profiles
- [ ] Customer list page displays cards with status, key details, and quick actions
- [ ] Customer detail page uses tab-based layout (Overview | Agreements | Receivables | Projects)
- [ ] All 6 customer statuses (Lead, Prospect, Negotiation, Live, On Hold, Archive) work with free transitions
- [ ] Service agreements (0-N per customer) can be created, edited, and deleted with scope, type, dates, pricing
- [ ] Receivables tab tracks invoices, payments, and outstanding balances per customer
- [ ] Product workflow projects can be created per customer with AI-generated artifacts
- [ ] Single chat panel per customer with auto-routing between Customer Mgmt and Product Mgmt agents
- [ ] Chat conversation history persists per customer across sessions
- [ ] Both agents can access and reference all customer data (info, agreements, receivables, projects) in conversations
- [ ] Customer artifacts (strategies, roadmaps, research) can be cross-referenced from the Portfolio module
- [ ] Sidebar navigation includes a new "Customers" menu item
- [ ] All data is private per user (RLS-enforced)
- [ ] UI follows existing NextUp patterns (shadcn/ui, Tailwind, responsive design)

## Scope Boundaries

### In Scope

- Customer CRUD (create, read, update, delete)
- Customer information management (company details, team, product, vertical, persona, ICP, and extensible fields)
- Customer status lifecycle with 6 statuses and free transitions
- Service agreements management (scope, type, start/end dates, pricing)
- Receivables tracking (invoices, payments, balance) - data entry and tracking only
- Product workflow projects per customer with AI-generated artifacts
- Customer Management Agent (engagement, negotiation, pricing, status guidance)
- Product Management Agent (strategy, roadmap, research, success measurement, ideation)
- Agent capabilities modeled after the fractional PM agent's 27 capabilities across 9 operational modes
- Single chat panel per customer with auto-routing between agents
- Persistent chat history per customer
- Customer list page with cards and quick actions
- Customer detail page with tab-based layout
- Sidebar navigation entry
- Cross-referencing between customer artifacts and portfolio content
- Per-user data isolation via Supabase RLS
- Database schema (Supabase PostgreSQL with migrations)
- Backend API routes following Express patterns
- Frontend feature module following existing portfolio pattern
- Zustand stores for customer state management
- TanStack Query hooks for server state

### Out of Scope

- Payment gateway integration (Stripe, PayPal, etc.) - receivables is tracking only
- PDF invoice generation - future enhancement
- Automated email/notification sending to customers - no external communication
- Calendar/scheduling integration - no calendar features
- Multi-user/team access to shared customers - each user's data is private
- Strict status state machine enforcement - transitions are free
- Import/export from external CRM tools - no migration tooling
- Mobile-native app - responsive web only
- Real-time collaboration - single-user context
- Customer-facing portal - advisor-only interface

### Future Considerations

- PDF invoice generation and export
- Payment gateway integration for receivables
- Shared customer access with team roles (owner, editor, viewer)
- Email integration for customer communication logging
- Calendar integration for meeting scheduling
- CRM import tool (CSV, HubSpot, Salesforce)
- Customer health scoring algorithm
- Automated follow-up reminders
- Additional customer statuses as workflow evolves
- Dashboard analytics (revenue pipeline, customer distribution, engagement metrics)
- Template library for common agreement types
- Customer-facing read-only portal

---

*This contract was generated from brain dump input through structured ideation. Review and approve before proceeding to PRD generation.*
