# Documentation Index

**Created:** 2026-01-26
**Last Updated:** 2026-02-24
**Total Documentation Files:** 50+
**Status:** Complete (Phase 6 — Writing References Redesign)

## Overview

This index catalogs all product documentation for the NextUp platform. Documentation is organized into 12 layers covering product overview, user flows, screens, features, architecture, API, AI tools, database, and testing.

**Current state:**
- **11 artifact statuses**: draft, interviewing, research, foundations, skeleton, foundations_approval, writing, humanity_checking, creating_visuals, ready, published
- **14 AI tools** across 4 categories (core pipeline, interview, social post, content improvement)
- **3 pipeline paths**: blog/showcase full pipeline, showcase interview pipeline, social post pipeline
- **3 artifact types**: blog, showcase, social_post

---

## Layer 1: Product Overview (1 file)

**Location:** `docs/`

| File | Description |
|------|-------------|
| [PRODUCT_OVERVIEW.md](./PRODUCT_OVERVIEW.md) | Value proposition, feature list, tech stack summary, current state |

---

## Layer 2: User Flows (7 files)

**Location:** `docs/flows/`

| File | Description |
|------|-------------|
| [artifact-creation-flow.md](./flows/artifact-creation-flow.md) | End-to-end artifact creation from portfolio page to ready state |
| [content-improvement-flow.md](./flows/content-improvement-flow.md) | AI text/image improvement via editor selection and chat |
| [image-generation-flow.md](./flows/image-generation-flow.md) | Image placeholder detection, approval, generation, and embedding |
| [portfolio-management-flow.md](./flows/portfolio-management-flow.md) | Portfolio page CRUD, filtering, and artifact card interactions |
| [showcase-interview-flow.md](./flows/showcase-interview-flow.md) | Multi-turn showcase interview with coverage scoring |
| [social-post-creation-flow.md](./flows/social-post-creation-flow.md) | Social post generation from source blog/showcase artifact |
| [writing-style-setup-flow.md](./flows/writing-style-setup-flow.md) | Writing references management: 4 upload methods, per-artifact-type, async extraction |

---

## Layer 3: Screens (7 files)

**Location:** `docs/screens/`

| File | Description |
|------|-------------|
| [app-shell.md](./screens/app-shell.md) | AppShell layout with sidebar, mobile nav, and chat panel |
| [artifact-page.md](./screens/artifact-page.md) | ArtifactPage with editor, foundations section, research area, chat |
| [home-page.md](./screens/home-page.md) | Dashboard with greeting, domain cards, recent content |
| [portfolio-page.md](./screens/portfolio-page.md) | Portfolio grid with artifact cards, filters, creation modal |
| [profile-page.md](./screens/profile-page.md) | Profile setup with 4 sections, skills inventory, completion tracking |
| [settings-page.md](./screens/settings-page.md) | Theme switching, AI interaction mode, writing style link |
| [writing-style-page.md](./screens/writing-style-page.md) | Writing references: tabbed UI (Blog/Social/Showcase), 4 upload methods, extraction status |

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

## Layer 6: Architecture (7 files)

**Location:** `docs/Architecture/`

| File | Description |
|------|-------------|
| [UNIFIED_CONTENT_AGENT_ARCHITECTURE.md](./Architecture/UNIFIED_CONTENT_AGENT_ARCHITECTURE.md) | High-level system architecture overview |
| [backend/content-agent-architecture.md](./Architecture/backend/content-agent-architecture.md) | Backend system architecture with tool orchestration |
| [backend/security-architecture.md](./Architecture/backend/security-architecture.md) | Multi-layered security (prompt injection, PII, rate limiting) |
| [backend/observability-architecture.md](./Architecture/backend/observability-architecture.md) | Distributed tracing, metrics, circuit breaker |
| [database/database-schema-reference.md](./Architecture/database/database-schema-reference.md) | All 10 tables with columns, types, relationships, RLS |
| [database/artifact-data-relationships.md](./Architecture/database/artifact-data-relationships.md) | Table relationships and data flow diagrams |
| [database/artifact-schema-and-workflow.md](./Architecture/database/artifact-schema-and-workflow.md) | Artifacts table schema with status workflow |
| [frontend/screen-context-integration.md](./Architecture/frontend/screen-context-integration.md) | useScreenContext hook, React Query caching |

---

## Layer 7: API Reference (5 files)

**Location:** `docs/api/`

| File | Description |
|------|-------------|
| [content-agent-endpoints.md](./api/content-agent-endpoints.md) | 13+ endpoints: execute, clear-session, history, foundations, writing, examples (8 endpoints), log, auth, delete |
| [authentication-and-security.md](./api/authentication-and-security.md) | Bearer token auth, rate limits (10/min, 100/hr, 20 pipelines/day) |
| [error-handling-reference.md](./api/error-handling-reference.md) | 13 error categories with HTTP mappings and retry policies |
| [screen-context-specification.md](./api/screen-context-specification.md) | ScreenContextPayload interface for intent detection |
| [MOCK_CONFIGURATION_GUIDE.md](./api/MOCK_CONFIGURATION_GUIDE.md) | Mock toggle configuration for development/testing |

---

## Layer 8: AI Agents & Tools (6 files)

**Location:** `docs/ai-agents-and-prompts/`

| File | Description |
|------|-------------|
| [content-agent-overview.md](./ai-agents-and-prompts/content-agent-overview.md) | ContentAgent orchestrator, session management, token budget |
| [core-tools-reference.md](./ai-agents-and-prompts/core-tools-reference.md) | **14 tools** across 4 categories with full schemas (v4.0.0) |
| [context-tools-reference.md](./ai-agents-and-prompts/context-tools-reference.md) | 4 context fetcher tools (artifact, research, drafts, topics) |
| [pipeline-execution-flow.md](./ai-agents-and-prompts/pipeline-execution-flow.md) | **3 pipeline paths**: full, interview, social post (v4.0.0) |
| [intent-detection-guide.md](./ai-agents-and-prompts/intent-detection-guide.md) | Hybrid intent detection (regex + Haiku), confidence thresholds |
| [system-prompt-specification.md](./ai-agents-and-prompts/system-prompt-specification.md) | Complete system prompt with structured response format |

---

## Layer 9: Database Schema

Covered by Layer 6 Architecture files:
- [database-schema-reference.md](./Architecture/database/database-schema-reference.md) — **Primary reference** (10 tables)
- [artifact-data-relationships.md](./Architecture/database/artifact-data-relationships.md) — Relationships and data flow
- [artifact-schema-and-workflow.md](./Architecture/database/artifact-schema-and-workflow.md) — Artifacts table detail

---

## Layer 10: Auth & Security

Covered by Layers 6 and 7:
- [authentication-and-security.md](./api/authentication-and-security.md) — Auth flow, middleware, rate limiting
- [security-architecture.md](./Architecture/backend/security-architecture.md) — Input validation, privacy, prompt injection

---

## Layer 11: Testing (2 files)

**Location:** `docs/testing/`

| File | Description |
|------|-------------|
| [sanity-test-analysis-2026-01-26.md](./testing/sanity-test-analysis-2026-01-26.md) | Initial test analysis report |
| [playwright/README.md](./testing/playwright/README.md) | Playwright E2E test setup notes |

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

### 13 AI Tools

| Category | Tools |
|----------|-------|
| **Core Pipeline** (8) | conductDeepResearch, analyzeWritingCharacteristics, analyzeStorytellingStructure, generateContentSkeleton, writeContentSection, writeFullContent, applyHumanityCheck, generateContentVisuals |
| **Interview** (3) | startShowcaseInterview, saveInterviewAnswer, completeShowcaseInterview |
| **Social Post** (1) | writeSocialPostContent |
| **Content Improvement** (2) | improveTextContent, improveImageContent |

### Key Counts

| What | Count |
|------|-------|
| Artifact statuses | 11 |
| AI tools | 14 (+ 4 context tools) |
| Pipeline paths | 3 |
| Artifact types | 3 (blog, showcase, social_post) |
| API endpoints | 9+ |
| Database tables | 11 |
| Error categories | 13 |
| Documentation files | 50+ |

---

**Version History:**
- **4.0.0** (2026-02-24) — Writing References Redesign: per-artifact-type refs, 4 upload methods, publication scraping, updated API/schema/flow/screen/feature docs
- **3.0.0** (2026-02-20) — Full rewrite: 12-layer index, 50+ files, 11 statuses, 13 tools, 3 pipeline paths
- **2.0.0** (2026-01-28) — Phase 3 image generation update
- **1.0.0** (2026-01-26) — Initial documentation index (19 files)
