# Documentation Index

**Created:** 2026-01-26
**Last Updated:** 2026-02-26
**Version:** 12.0.0
**Total Documentation Files:** 65+
**Status:** Complete (Customer AI Handoff Architecture)

## Overview

This index catalogs all product documentation for the NextUp platform. Documentation is organized into 12 layers covering product overview, user flows, screens, features, architecture, API, AI tools, database, and testing.

**Current state:**
- **11 artifact statuses**: draft, interviewing, research, foundations, skeleton, foundations_approval, writing, humanity_checking, creating_visuals, ready, published (+ archived in DB)
- **35+ AI tools** across 7 categories (core pipeline, interview, social post, content improvement, content management, image generation, profile/context, research/topics, response)
- **3 pipeline paths**: blog/showcase full pipeline, showcase interview pipeline, social post pipeline
- **3 artifact types**: blog, showcase, social_post
- **AI backend**: Vercel AI SDK v6 with `streamText`/`generateText` (AIService.ts)

---

## Layer 1: Product Overview (1 file)

**Location:** `docs/`

| File | Description |
|------|-------------|
| [PRODUCT_OVERVIEW.md](./PRODUCT_OVERVIEW.md) | Value proposition, feature list, tech stack summary, current state (v2.0.0) |

---

## Layer 2: User Flows (9 files)

**Location:** `docs/flows/`

| File | Description |
|------|-------------|
| [artifact-creation-flow.md](./flows/artifact-creation-flow.md) | End-to-end artifact creation from portfolio page to ready state |
| [auth-flow.md](./flows/auth-flow.md) | Authentication flows: login, signup, OAuth, password reset, sign out |
| [content-improvement-flow.md](./flows/content-improvement-flow.md) | AI text/image improvement via editor selection and chat |
| [image-generation-flow.md](./flows/image-generation-flow.md) | Image placeholder detection, approval, generation, and embedding |
| [portfolio-management-flow.md](./flows/portfolio-management-flow.md) | Portfolio page CRUD, filtering, and artifact card interactions |
| [showcase-interview-flow.md](./flows/showcase-interview-flow.md) | Multi-turn showcase interview with coverage scoring |
| [social-post-creation-flow.md](./flows/social-post-creation-flow.md) | Social post generation from source blog/showcase artifact |
| [writing-style-setup-flow.md](./flows/writing-style-setup-flow.md) | Writing references management: 4 upload methods, per-artifact-type, async extraction |
| [customer-management-flow.md](./flows/customer-management-flow.md) | Customer CRUD, filtering, status changes, archiving; Flows 9-14: Agreements + Receivables; Flows 15-20: Projects + Artifacts; Flows 21-23: Search, Enriched Cards, Cross-Module Linking (Phase 5) |

---

## Layer 3: Screens (9 files)

**Location:** `docs/screens/`

| File | Description |
|------|-------------|
| [app-shell.md](./screens/app-shell.md) | AppShell layout with sidebar, mobile nav, and chat panel |
| [artifact-page.md](./screens/artifact-page.md) | ArtifactPage with editor, foundations section, research area, chat |
| [auth-screens.md](./screens/auth-screens.md) | Auth pages: LoginPage, SignupPage, EmailConfirmation, PasswordReset, AuthCallback |
| [home-page.md](./screens/home-page.md) | Dashboard with greeting, domain cards, recent content |
| [portfolio-page.md](./screens/portfolio-page.md) | Portfolio grid with artifact cards, filters, creation modal |
| [profile-page.md](./screens/profile-page.md) | Profile setup with 4 sections, skills inventory, completion tracking |
| [settings-page.md](./screens/settings-page.md) | Theme switching, AI interaction mode, embedded writing references |
| [writing-style-page.md](./screens/writing-style-page.md) | Writing references (embedded in Settings; `/settings/style` redirects to `/settings`) |
| [customer-pages.md](./screens/customer-pages.md) | CustomerListPage (enriched cards, full-text search, 6 sort options, structured skeletons, AlertDialog, responsive 2-col grid) + CustomerDetailPage (4 tabs, event type filter, cross-module "Referenced by") |

---

## Layer 4: State Machines (5 files)

**Location:** `docs/artifact-statuses/`

| File | Description |
|------|-------------|
| [STATUS_VALUES_REFERENCE.md](./artifact-statuses/STATUS_VALUES_REFERENCE.md) | **Definitive reference** — 11 statuses with DB values, labels, transitions, UI behavior |
| [7-status-workflow-specification.md](./artifact-statuses/7-status-workflow-specification.md) | Legacy 7-status spec (historical, superseded by STATUS_VALUES_REFERENCE) |
| [status-flow-reference.md](./artifact-statuses/status-flow-reference.md) | Detailed status transition diagrams and guard conditions |
| [migration-guide-old-to-new-statuses.md](./artifact-statuses/migration-guide-old-to-new-statuses.md) | Migration from legacy 9-status to 7-status (historical) |
| [content-creation-flow-fix.md](./artifact-statuses/content-creation-flow-fix.md) | Historical flow fixes |

---

## Layer 5: Features (14 files)

**Location:** `docs/features/`

| File | Description |
|------|-------------|
| [content-creation-agent.md](./features/content-creation-agent.md) | Full pipeline: research, characteristics, skeleton, writing, visuals |
| [content-improvement.md](./features/content-improvement.md) | AI text/image improvement via editor selection |
| [foundations-approval.md](./features/foundations-approval.md) | Human-in-the-loop approval gate between skeleton and writing |
| [humanity-check.md](./features/humanity-check.md) | 24-pattern AI writing detection and removal |
| [image-generation.md](./features/image-generation.md) | DALL-E 3 / Gemini Imagen 4 image generation with approval |
| [research-pipeline.md](./features/research-pipeline.md) | Multi-source research via Tavily (Reddit, LinkedIn, Quora, etc.) |
| [rich-text-editor.md](./features/rich-text-editor.md) | TipTap editor with AlignableImage, text/image AI, crop |
| [showcase-interview.md](./features/showcase-interview.md) | Multi-turn interview with 5 coverage dimensions |
| [social-post-generation.md](./features/social-post-generation.md) | Viral post generation from source artifacts |
| [storytelling-analysis.md](./features/storytelling-analysis.md) | Storytelling framework selection, narrative arc design, emotional journey |
| [topic-creation.md](./features/topic-creation.md) | Topic suggestion flow, entry points, tools, data model, known limitations |
| [writing-style-analysis.md](./features/writing-style-analysis.md) | Writing references system + characteristics extraction (per artifact type) |
| [customer-management.md](./features/customer-management.md) | CRM-lite: customer lifecycle, full-text search, enriched cards, dashboard stats, health signals, cross-module linking (Phase 5) |
| [customer-ai-chat.md](./features/customer-ai-chat.md) | Dual AI agents (Customer Mgmt + Product Mgmt) with LLM-driven tool-based handoff, 9 tools, structured response cards (Phase 4) |

---

## Layer 6: Architecture (8 files)

**Location:** `docs/Architecture/`

| File | Description |
|------|-------------|
| [UNIFIED_CONTENT_AGENT_ARCHITECTURE.md](./Architecture/UNIFIED_CONTENT_AGENT_ARCHITECTURE.md) | High-level system architecture overview |
| [backend/content-agent-architecture.md](./Architecture/backend/content-agent-architecture.md) | Backend AI architecture: AIService.ts, Vercel AI SDK v6, tool orchestration (v3.0.0) |
| [backend/security-architecture.md](./Architecture/backend/security-architecture.md) | Multi-layered security (prompt injection, PII, rate limiting) |
| [backend/observability-architecture.md](./Architecture/backend/observability-architecture.md) | Distributed tracing, metrics, circuit breaker |
| [database/database-schema-reference.md](./Architecture/database/database-schema-reference.md) | All 18 tables with columns, types, relationships, RLS; 5 database functions; TSVECTOR generated column; 2 additional GIN indexes (v4.0.0) |
| [database/artifact-data-relationships.md](./Architecture/database/artifact-data-relationships.md) | Table relationships and data flow diagrams |
| [database/artifact-schema-and-workflow.md](./Architecture/database/artifact-schema-and-workflow.md) | Artifacts table schema with status workflow |
| [frontend/screen-context-integration.md](./Architecture/frontend/screen-context-integration.md) | useScreenContext hook, React Query caching |

---

## Layer 7: API Reference (7 files)

**Location:** `docs/api/`

| File | Description |
|------|-------------|
| [content-agent-endpoints.md](./api/content-agent-endpoints.md) | **18 endpoints** across AI chat (`/api/ai/*`), artifacts, writing examples, logging, auth (v4.0.0) |
| [authentication-and-security.md](./api/authentication-and-security.md) | Bearer token auth, rate limits (10/min, 100/hr, 20 pipelines/day) |
| [error-handling-reference.md](./api/error-handling-reference.md) | 13 error categories with HTTP mappings and retry policies |
| [screen-context-specification.md](./api/screen-context-specification.md) | ScreenContextPayload interface for AI context awareness |
| [MOCK_CONFIGURATION_GUIDE.md](./api/MOCK_CONFIGURATION_GUIDE.md) | Mock toggle configuration for development/testing |
| [customer-endpoints.md](./api/customer-endpoints.md) | 31 endpoints (8 customer + 3 new search/stats + 4 agreement + 5 receivable + 5 project + 6 artifact): full CRUD + search + dashboard (v4.0.0) |
| [customer-ai-endpoints.md](./api/customer-ai-endpoints.md) | Customer AI chat streaming endpoint (POST /api/ai/customer/chat/stream) with LLM-driven agent handoff (v2.0.0) |

---

## Layer 8: AI Agents & Tools (7 files)

**Location:** `docs/ai-agents-and-prompts/`

| File | Description |
|------|-------------|
| [content-agent-overview.md](./ai-agents-and-prompts/content-agent-overview.md) | AIService orchestrator (Vercel AI SDK v6), PipelineExecutor, token budget (v3.0.0) |
| [core-tools-reference.md](./ai-agents-and-prompts/core-tools-reference.md) | **35+ tools** across 7 categories with full schemas (v4.0.0) |
| [context-tools-reference.md](./ai-agents-and-prompts/context-tools-reference.md) | Context fetcher tools (artifact, research, drafts, topics) |
| [pipeline-execution-flow.md](./ai-agents-and-prompts/pipeline-execution-flow.md) | **3 pipeline paths**: full, interview, social post |
| [intent-detection-guide.md](./ai-agents-and-prompts/intent-detection-guide.md) | **DEPRECATED** — intent detection removed; LLM handles via tool-calling |
| [system-prompt-specification.md](./ai-agents-and-prompts/system-prompt-specification.md) | Complete system prompt with structured response format |
| [customer-agents-reference.md](./ai-agents-and-prompts/customer-agents-reference.md) | Customer AI agents (Customer Mgmt + Product Mgmt): LLM-driven handoff, 9 tools, context builder with health signals and deliverables (v3.0.0) |

---

## Layer 9: Database Schema

Covered by Layer 6 Architecture files:
- [database-schema-reference.md](./Architecture/database/database-schema-reference.md) — **Primary reference** (18 tables, 5 functions)
- [artifact-data-relationships.md](./Architecture/database/artifact-data-relationships.md) — Relationships and data flow
- [artifact-schema-and-workflow.md](./Architecture/database/artifact-schema-and-workflow.md) — Artifacts table detail

---

## Layer 10: Auth & Security

Covered by Layers 2, 3, 6, and 7:
- [auth-flow.md](./flows/auth-flow.md) — Complete auth user flows (login, signup, OAuth, password reset, sign out)
- [auth-screens.md](./screens/auth-screens.md) — Auth page components (LoginPage, SignupPage, EmailConfirmation, PasswordReset, AuthCallback)
- [authentication-and-security.md](./api/authentication-and-security.md) — Backend auth middleware, rate limiting
- [security-architecture.md](./Architecture/backend/security-architecture.md) — Input validation, privacy, prompt injection

---

## Layer 11: Testing (3 files)

**Location:** `docs/testing/`

| File | Description |
|------|-------------|
| [testing-infrastructure.md](./testing/testing-infrastructure.md) | **Complete reference** — Vitest + Playwright configs, test inventory, coverage, commands |
| [sanity-test-analysis-2026-01-26.md](./testing/sanity-test-analysis-2026-01-26.md) | Initial sanity test report (historical, issues since fixed) |
| [playwright/README.md](./testing/playwright/README.md) | Playwright E2E test guide with patterns, test IDs, examples |

---

## Layer 12: Documentation Index

- This file (`docs/DOCUMENTATION_INDEX.md`)

---

## Additional Documentation

### Frontend Reference (3 files)

**Location:** `docs/frontend/`

| File | Description |
|------|-------------|
| [phase-3-image-generation-components.md](./frontend/phase-3-image-generation-components.md) | ImageApprovalPanel, ImageRegenerationModal, useImageGeneration |
| [color-palettes/COLOR_PALETTE_GUIDE.md](./frontend/color-palettes/COLOR_PALETTE_GUIDE.md) | Color palette usage guide |
| [color-palettes/COLOR_PALETTE_REFERENCE.md](./frontend/color-palettes/COLOR_PALETTE_REFERENCE.md) | Complete color token reference |

### Analysis & Reports (2 files)

**Location:** `docs/analysis-and-reports/`

| File | Description |
|------|-------------|
| [MOCK_SETUP_COMPLETE.md](./analysis-and-reports/MOCK_SETUP_COMPLETE.md) | Mock system setup completion report |
| [rules-reorganization-analysis.md](./analysis-and-reports/rules-reorganization-analysis.md) | Claude rules reorganization analysis |

### Ideation & PRDs

**Location:** `docs/ideation/`

Contains product requirement documents and specifications for major features:
- `consulting-toolkit/` — Original portfolio MVP PRD and specs
- `content-creation-agent/` — Content agent phases 1-4 PRDs and specs
- `showcase-interview-phase/` — Showcase interview PRD and specs
- `user-auth-data-separation/` — User authentication PRD and specs
- `writing-references-redesign/` — Writing references redesign phases 1-3 (per-type refs, file parsing, publication scraping)
- `customers-management-platform/` — Customer management PRD, spec, and review summary

---

## Quick Reference

### 11-Status Workflow

```
Blog/Showcase:  draft → research → foundations → skeleton → [APPROVAL] → writing → humanity_checking → creating_visuals → ready → published
Interview:      draft → interviewing → research → foundations → skeleton → [APPROVAL] → writing → humanity_checking → creating_visuals → ready
Social Post:    draft → ready
```

### AI Tools Summary (35+ tools)

| Category | Count | Key Tools |
|----------|-------|-----------|
| **Core Pipeline** | 8 | conductDeepResearch, analyzeWritingCharacteristics, analyzeStorytellingStructure, generateContentSkeleton, writeContentSection, writeFullContent, applyHumanityCheck, generateContentVisuals |
| **Interview** | 3 | startShowcaseInterview, saveInterviewAnswer, completeShowcaseInterview |
| **Social Post** | 1 | writeSocialPostContent |
| **Content Improvement** | 2 | improveTextContent, improveImageContent |
| **Content Management** | 5 | createArtifactDraft, updateArtifactContent, getArtifactContent, listRecentArtifacts, suggestArtifactIdeas |
| **Image Generation** | 4 | identifyImageNeeds, updateImageApproval, generateFinalImages, regenerateImage |
| **Profile & Context** | 7 | getUserContext, getUserSkills, suggestProfileUpdates, fetchArtifact, fetchResearch, fetchArtifactTopics, listDraftArtifacts |
| **Research & Topics** | 3 | topicsResearch, researchTrendingTopics, analyzeFollowUpTopics |
| **Response** | 1 | structuredResponse |
| **Customer Mgmt** | 4 | updateCustomerStatus, updateCustomerInfo, createEventLogEntry, getCustomerSummary |
| **Product Mgmt** | 5 | createProject, createArtifact, updateArtifact, listProjects, listArtifacts |

### Key Counts

| What | Count |
|------|-------|
| Artifact statuses | 11 (+ archived in DB) |
| AI tools | 44+ across 21 tool files (35 content + 9 customer) |
| Pipeline paths | 3 |
| Artifact types | 3 (blog, showcase, social_post) |
| API endpoints | 50 (18 AI/content + 31 customer + 1 customer AI) |
| Database tables | 18 (11 content + 7 customer) + 5 functions |
| Error categories | 13 |
| Documentation files | 65+ |

### Key Implementation Files

| Component | File |
|-----------|------|
| AI Orchestrator | `backend/src/services/ai/AIService.ts` |
| Pipeline Executor | `backend/src/services/ai/PipelineExecutor.ts` |
| AI Controller | `backend/src/controllers/ai.controller.ts` |
| AI Routes | `backend/src/routes/ai.ts` |
| System Prompts | `backend/src/services/ai/prompts/systemPrompts.ts` |
| Tool Definitions | `backend/src/services/ai/tools/` (19 files) |
| Customer Service | `backend/src/services/CustomerService.ts` |
| Project Service | `backend/src/services/ProjectService.ts` |
| Artifact Service | `backend/src/services/CustomerArtifactService.ts` |
| Customer Controller | `backend/src/controllers/customer.controller.ts` |
| Customer Routes | `backend/src/routes/customers.ts` |
| Customer AI Controller | `backend/src/controllers/customer-ai.controller.ts` |
| Customer AI Route | `backend/src/routes/customer-ai.ts` |
| Handoff Tools | `backend/src/services/ai/tools/handoffTools.ts` |
| Customer Context Builder | `backend/src/services/ai/prompts/customerContextBuilder.ts` |
| Customer Mgmt Tools | `backend/src/services/ai/tools/customerMgmtTools.ts` |
| Product Mgmt Tools | `backend/src/services/ai/tools/productMgmtTools.ts` |
| CustomerChatPanel | `frontend/src/features/customers/components/chat/CustomerChatPanel.tsx` |

---

**Version History:**
- **12.0.0** (2026-02-26) — Customer AI Handoff Architecture: replaced keyword-based routing with LLM-driven tool-based agent handoff. Updated customer-ai-endpoints.md (v2.0.0, handoff flow, composed streaming, validation schemas), customer-ai-chat.md (v2.0.0, handoff architecture), customer-agents-reference.md (v3.0.0, handoff mechanism, loop prevention). Removed deleted CustomerAgentRouter.ts from key files, added handoffTools.ts. 0 new files, 4 updated.
- **11.0.0** (2026-02-26) — Customer Phase 5 (Search, Dashboard, Cross-Linking): updated customer-management.md (v4.0.0, full-text search, enriched cards, dashboard stats, cross-module linking, health signals), customer-pages.md (v5.0.0, CustomerCardSkeleton, AlertDialog, responsive grid, event type filter, "Referenced by"), customer-endpoints.md (v4.0.0, +3 endpoints: search, stats, artifact search), customer-agents-reference.md (v2.0.0, health signals, deliverables, action suggestions), database-schema-reference.md (v4.0.0, 2 new functions + TSVECTOR + 2 GIN indexes), PRODUCT_OVERVIEW (Phase 5 status, 50 endpoints, 5 functions). 0 new files, 7 updated.
- **10.0.0** (2026-02-25) — Customer AI Chat Phase 4: added customer-ai-chat.md (feature), customer-ai-endpoints.md (API), customer-agents-reference.md (agents/tools), updated database-schema-reference.md (v3.2.0, merge_customer_info function), updated customer-pages.md (v4.0.0, Chat button), updated PRODUCT_OVERVIEW.md (Phase 4 status, 47 endpoints, 3 functions). 3 new files, 4 updated.
- **9.0.0** (2026-02-25) — Customer Management Platform Phase 3: updated customer-endpoints.md (v3.0.0, +11 endpoints: 5 project + 6 artifact), customer-management.md (v3.0.0, projects/artifacts feature docs, type/status tables, data models, query keys), customer-pages.md (v3.0.0, ProjectsTab/ProjectDetail/ArtifactEditor component trees, 8 new component sections), customer-management-flow.md (v3.0.0, Flows 15-20: project/artifact CRUD), PRODUCT_OVERVIEW (Phase 3 status, 46 endpoints)
- **8.0.0** (2026-02-25) — Customer Management Platform Phase 2: updated customer-endpoints.md (v2.0.0, +9 endpoints: 4 agreement + 5 receivable), customer-management.md (v2.0.0, agreements/receivables feature docs, type/status tables, new key files, updated limitations), customer-pages.md (v2.0.0, AgreementsTab/ReceivablesTab component trees, QuickStats enhancement, form dialogs), customer-management-flow.md (v2.0.0, Flows 9–14), database-schema-reference.md (v3.1.0, Database Functions section), PRODUCT_OVERVIEW (Phase 2 status, 18+1 tables, 35 endpoints)
- **7.0.0** (2026-02-25) — Customer Management Platform Phase 1: added customer-management.md (feature), customer-management-flow.md (flow), customer-pages.md (screens), customer-endpoints.md (API), updated database-schema-reference to 18 tables, updated PRODUCT_OVERVIEW
- **6.0.0** (2026-02-25) — Added auth docs (auth-flow.md, auth-screens.md), testing infrastructure doc (testing-infrastructure.md), updated index to 55+ files, expanded Layer 10 auth references, expanded Layer 11 testing section
- **5.0.0** (2026-02-25) — Vercel AI SDK v6 audit: updated all references from ContentAgent.ts to AIService.ts, corrected API routes from `/api/content-agent/*` to `/api/ai/*`, updated tool count from 14 to 35+, marked intent-detection-guide as deprecated, fixed writing-style-page route, updated architecture docs
- **4.0.0** (2026-02-24) — Writing References Redesign: per-artifact-type refs, 4 upload methods, publication scraping
- **3.0.0** (2026-02-20) — Full rewrite: 12-layer index, 50+ files, 11 statuses
- **2.0.0** (2026-01-28) — Phase 3 image generation update
- **1.0.0** (2026-01-26) — Initial documentation index (19 files)
