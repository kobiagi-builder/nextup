# Consulting Toolkit Contract

**Created**: 2026-01-22
**Updated**: 2026-01-22
**Confidence Score**: 92/100
**Status**: Draft

## Problem Statement

A senior product manager and product executive is transitioning to a career as an independent product consultant. This transition presents multiple interconnected challenges across the entire consulting lifecycle:

**The Credibility Gap**: Without a documented portfolio of past work, it's difficult to demonstrate expertise to potential clients. Years of impactful product work exist only as memories and scattered documents, not as compelling case studies and thought leadership content that wins business.

**The Business Operations Gap**: Consultants need to manage prospects, clients, pricing, proposals, and projects - but there's no unified system designed for the solo consultant's workflow. Generic CRMs are overkill; spreadsheets are chaos.

**The Knowledge Gap**: The consultant's own expertise, preferences, client history, and context live in their head. There's no system to capture this knowledge and make it accessible to AI assistants or future team members.

**The Content Creation Burden**: Thought leadership requires regular output (LinkedIn posts, blog articles, case studies), but writing is slow. Hours spent crafting content means hours not spent on billable work.

## Vision: Domain-Based Assistant System

The Consulting Toolkit is envisioned as a domain-based personal assistant system:

```
┌─────────────────────────────────────────────────────────────────┐
│                    SHARED USER KNOWLEDGE                         │
│  (Experience, preferences, clients, goals, context)              │
│  [MVP: Manual entry | Future: RAG + structured data]             │
└─────────────────────────────────────────────────────────────────┘
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│   ADVISOR     │   │     CRM       │   │  PORTFOLIO    │
│   Domain      │   │    Domain     │   │    Domain     │
│   (Future)    │   │   (Future)    │   │    (MVP)      │
├───────────────┤   ├───────────────┤   ├───────────────┤
│ • Chat Q&A    │   │ • Leads       │   │ • Artifacts   │
│ • Knowledge   │   │ • Pricing     │   │ • Topics      │
│   management  │   │ • Proposals   │   │ • AI Content  │
│ • Goal        │   │ • Projects    │   │ • Skills      │
│   tracking    │   │ • Billing     │   │ • Style       │
└───────────────┘   └───────────────┘   └───────────────┘
```

All domains share access to user knowledge and can leverage AI capabilities for their specific functions.

## Goals

1. **Create a unified consulting assistant** that supports the full consulting lifecycle - from building credibility (Portfolio) to managing clients (CRM) to providing intelligent guidance (Advisor).

2. **Start with Portfolio domain** to establish credibility through content creation - social posts, blogs, and showcases with AI-assisted creation.

3. **Enable AI-assisted workflows** through capabilities like topic research, narrative generation, and style-matched content creation - implemented as conversational, collaborative experiences.

4. **Capture user knowledge progressively** - starting with manual context entry in MVP, evolving to structured data and RAG-based retrieval in future phases.

5. **Build extensible architecture** that allows adding new domains (CRM, Advisor) and capabilities without rebuilding the foundation.

## Success Criteria

### MVP (Portfolio Domain)
- [ ] Can manually enter and manage user context (about me, profession, customers, goals)
- [ ] Can create and manage Social Post artifacts with LinkedIn-focused structure
- [ ] Can create and manage Blog artifacts with narrative and audience fields
- [ ] Can create and manage Showcase artifacts with full case study structure
- [ ] Can manage a Topic backlog (add, edit, delete, execute into artifacts)
- [ ] AI can research and suggest content topics
- [ ] AI can generate narratives from topics
- [ ] AI can create content mimicking user's writing style (from 4-5 examples)
- [ ] User can interact with AI conversationally during content creation
- [ ] Skills matrix tracks competencies and industries
- [ ] All data persists in Supabase
- [ ] Light/dark mode theme support

### Future Phases
- [ ] Import profile data from LinkedIn using PDF file upload
- [ ] CRM domain manages leads, pricing, proposals, projects
- [ ] Advisor domain provides Q&A and proactive insights
- [ ] User knowledge system with RAG + structured data
- [ ] Multi-user support with authentication

**Architecture Note**: MVP data model shall include user_id fields and account structure to support future multi-tenancy without schema migration.

## Scope Boundaries

### In Scope - MVP (Portfolio Domain)

**User Context (Manual Entry)**
- About me: bio, background, unique value proposition
- Profession: expertise areas, industries, methodologies
- Customers: target audience, ideal client profile
- Goals: content goals, business goals, priorities

**Artifact Management**
- Social Posts: platform, narrative, target audience, hashtags, status, published link
- Blogs: title, narrative, target audience, platform (Medium/Substack), link, status
- Showcases: company, role, timeframe, problem, approach, results, metrics, learnings
- Content display (text, images) with platform embedding where supported

**AI Capabilities (Conversational)**
- Topic research and suggestion
- Narrative generation from topics
- Content creation with style mimicking
- Collaborative interaction (chat-based, not just "generate" buttons)

**Supporting Features**
- Skills and expertise matrix
- Topic backlog management
- Writing style examples storage (4-5 examples)
- Light/dark mode theme
- Supabase storage
- Data model prepared for future multi-tenancy (user_id, account_id fields)

**Platform Focus**
- LinkedIn for social posts (structure supports future platforms)
- Medium OR Substack for blogs (research needed to choose)

### In Scope - Future Phases

**CRM Domain**
- Lead/prospect management and pipeline
- Pricing calculator and rate research
- Proposal generation
- Project tracking
- Communication support
- Specialized agents (design sprints, ideation, etc.)

**Advisor Domain**
- Conversational Q&A with full context access
- Proactive insights and recommendations
- Goal tracking and progress
- Knowledge management interface

**User Knowledge System**
- Structured data storage (profile, history, preferences)
- RAG-based retrieval for unstructured knowledge
- Automatic knowledge capture from interactions
- Cross-domain knowledge sharing

### Out of Scope

- **Multi-user/Authentication** - Single user for now
- **Direct API Publishing** - MVP is create + export/copy; direct publish later
- **Mobile optimization** - Desktop-first
- **Accounting/Invoicing** - Use external tools

## Technical Approach

**Architecture Principles**
- Domain-based separation with shared data layer
- AI capabilities abstracted from specific agent implementation
- Multi-LLM support with easy model switching
- Extensible for future domains

**MVP Tech Stack**
- React 19 + TypeScript + Vite + Tailwind + shadcn/ui
- Express backend + Supabase (existing codebase)
- LLM abstraction layer (GPT-4, Claude, future models)

---

*This contract defines the full vision with MVP focused on Portfolio domain. Review and approve before proceeding to PRD generation.*
