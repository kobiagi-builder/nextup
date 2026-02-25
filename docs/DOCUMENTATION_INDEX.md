# Documentation Index

**Created:** 2026-01-26
**Last Updated:** 2026-02-25
**Total Documentation Files:** 55+
**Status:** Complete (Phase 7 — Vercel AI SDK v6 Refactor + Auth & Testing Docs)

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

## Layer 2: User Flows (8 files)

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

---

## Layer 3: Screens (8 files)

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

## Layer 5: Features (12 files)

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

---

## Layer 6: Architecture (8 files)

**Location:** `docs/Architecture/`

| File | Description |
|------|-------------|
| [UNIFIED_CONTENT_AGENT_ARCHITECTURE.md](./Architecture/UNIFIED_CONTENT_AGENT_ARCHITECTURE.md) | High-level system architecture overview |
| [backend/content-agent-architecture.md](./Architecture/backend/content-agent-architecture.md) | Backend AI architecture: AIService.ts, Vercel AI SDK v6, tool orchestration (v3.0.0) |
| [backend/security-architecture.md](./Architecture/backend/security-architecture.md) | Multi-layered security (prompt injection, PII, rate limiting) |
| [backend/observability-architecture.md](./Architecture/backend/observability-architecture.md) | Distributed tracing, metrics, circuit breaker |
| [database/database-schema-reference.md](./Architecture/database/database-schema-reference.md) | All 11 tables with columns, types, relationships, RLS |
| [database/artifact-data-relationships.md](./Architecture/database/artifact-data-relationships.md) | Table relationships and data flow diagrams |
| [database/artifact-schema-and-workflow.md](./Architecture/database/artifact-schema-and-workflow.md) | Artifacts table schema with status workflow |
| [frontend/screen-context-integration.md](./Architecture/frontend/screen-context-integration.md) | useScreenContext hook, React Query caching |

---

## Layer 7: API Reference (5 files)

**Location:** `docs/api/`

| File | Description |
|------|-------------|
| [content-agent-endpoints.md](./api/content-agent-endpoints.md) | **18 endpoints** across AI chat (`/api/ai/*`), artifacts, writing examples, logging, auth (v4.0.0) |
| [authentication-and-security.md](./api/authentication-and-security.md) | Bearer token auth, rate limits (10/min, 100/hr, 20 pipelines/day) |
| [error-handling-reference.md](./api/error-handling-reference.md) | 13 error categories with HTTP mappings and retry policies |
| [screen-context-specification.md](./api/screen-context-specification.md) | ScreenContextPayload interface for AI context awareness |
| [MOCK_CONFIGURATION_GUIDE.md](./api/MOCK_CONFIGURATION_GUIDE.md) | Mock toggle configuration for development/testing |

---

## Layer 8: AI Agents & Tools (6 files)

**Location:** `docs/ai-agents-and-prompts/`

| File | Description |
|------|-------------|
| [content-agent-overview.md](./ai-agents-and-prompts/content-agent-overview.md) | AIService orchestrator (Vercel AI SDK v6), PipelineExecutor, token budget (v3.0.0) |
| [core-tools-reference.md](./ai-agents-and-prompts/core-tools-reference.md) | **35+ tools** across 7 categories with full schemas (v4.0.0) |
| [context-tools-reference.md](./ai-agents-and-prompts/context-tools-reference.md) | Context fetcher tools (artifact, research, drafts, topics) |
| [pipeline-execution-flow.md](./ai-agents-and-prompts/pipeline-execution-flow.md) | **3 pipeline paths**: full, interview, social post |
| [intent-detection-guide.md](./ai-agents-and-prompts/intent-detection-guide.md) | **DEPRECATED** — intent detection removed; LLM handles via tool-calling |
| [system-prompt-specification.md](./ai-agents-and-prompts/system-prompt-specification.md) | Complete system prompt with structured response format |

---

## Layer 9: Database Schema

Covered by Layer 6 Architecture files:
- [database-schema-reference.md](./Architecture/database/database-schema-reference.md) — **Primary reference** (11 tables)
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

### Key Counts

| What | Count |
|------|-------|
| Artifact statuses | 11 (+ archived in DB) |
| AI tools | 35+ across 19 tool files |
| Pipeline paths | 3 |
| Artifact types | 3 (blog, showcase, social_post) |
| API endpoints | 18 |
| Database tables | 11 |
| Error categories | 13 |
| Documentation files | 55+ |

### Key Implementation Files

| Component | File |
|-----------|------|
| AI Orchestrator | `backend/src/services/ai/AIService.ts` |
| Pipeline Executor | `backend/src/services/ai/PipelineExecutor.ts` |
| AI Controller | `backend/src/controllers/ai.controller.ts` |
| AI Routes | `backend/src/routes/ai.ts` |
| System Prompts | `backend/src/services/ai/prompts/systemPrompts.ts` |
| Tool Definitions | `backend/src/services/ai/tools/` (19 files) |

---

**Version History:**
- **6.0.0** (2026-02-25) — Added auth docs (auth-flow.md, auth-screens.md), testing infrastructure doc (testing-infrastructure.md), updated index to 55+ files, expanded Layer 10 auth references, expanded Layer 11 testing section
- **5.0.0** (2026-02-25) — Vercel AI SDK v6 audit: updated all references from ContentAgent.ts to AIService.ts, corrected API routes from `/api/content-agent/*` to `/api/ai/*`, updated tool count from 14 to 35+, marked intent-detection-guide as deprecated, fixed writing-style-page route, updated architecture docs
- **4.0.0** (2026-02-24) — Writing References Redesign: per-artifact-type refs, 4 upload methods, publication scraping
- **3.0.0** (2026-02-20) — Full rewrite: 12-layer index, 50+ files, 11 statuses
- **2.0.0** (2026-01-28) — Phase 3 image generation update
- **1.0.0** (2026-01-26) — Initial documentation index (19 files)
