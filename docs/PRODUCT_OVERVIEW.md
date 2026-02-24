# Product Consultant Helper

**Created:** 2026-01-15
**Last Updated:** 2026-02-19
**Version:** 1.0.0
**Status:** Active

## Overview

Product Consultant Helper is a SaaS application that helps product consultants create high-quality, authentic content. It combines AI-powered content creation with the user's unique writing style and professional expertise to produce blog posts, case studies, and social media content that reads naturally and reflects the consultant's voice.

## Target User

**Product consultants** who need to regularly publish thought leadership content (LinkedIn posts, blog articles, case studies) but struggle with the time and effort required to create content that sounds authentic and reflects their expertise.

## Value Proposition

- **AI-powered content creation** that matches your writing style, not generic AI output
- **Interview-based case study creation** for showcases that capture real project details
- **Writing style analysis** that learns from your existing writing samples
- **Humanity check** that removes 24+ AI writing patterns to ensure content reads naturally
- **Image generation** with DALL-E 3 / Gemini Imagen 4 integration
- **End-to-end pipeline** from research through polished, publish-ready content

## Feature List

| Feature | Description | Status |
|---------|-------------|--------|
| Artifact Management | Create, edit, delete blog posts, case studies, and social posts | Shipped |
| AI Content Pipeline | Automated research -> foundations -> skeleton -> writing -> visuals pipeline | Shipped |
| Showcase Interview | AI-guided interview (6 Q&A) to capture case study details | Shipped |
| Writing Style Analysis | Analyze writing examples to extract 20+ characteristics | Shipped |
| Foundations Approval | User approval gate before content writing begins | Shipped |
| Humanity Check | Remove AI writing patterns, match user's writing style | Shipped |
| Image Generation | AI-generated images with DALL-E 3 / Gemini Imagen 4 | Shipped |
| Content Improvement | In-editor text and image improvement via AI | Shipped |
| Social Post Generation | Generate social posts from existing blog/showcase articles | Shipped |
| Rich Text Editor | TipTap-based editor with formatting, images, markdown | Shipped |
| Research Pipeline | Multi-source research via Tavily API | Shipped |
| User Profile & Skills | Professional context for AI personalization | Shipped |
| Writing Examples | Upload writing samples for style matching (min 150 words) | Shipped |
| Dark/Light Theme | System-aware theme with manual override | Shipped |

## Tech Stack

| Layer | Technology | Details |
|-------|-----------|---------|
| Frontend | React 19, TypeScript, Vite 7 | SPA with React Router 7 |
| UI | Tailwind CSS 3, shadcn/ui (Radix) | 20+ UI components |
| State | Zustand (client), TanStack Query (server) | 4 stores, cache management |
| Backend | Node.js, Express 4, TypeScript | REST API on port 3001 |
| Database | Supabase (PostgreSQL) | 10 tables, RLS enabled |
| AI | Anthropic Claude, Google Gemini, DALL-E 3 | Multi-provider pipeline |
| Research | Tavily API | Multi-source web research |
| Auth | Supabase Auth | JWT tokens, session management |

For full tech stack details, see [CLAUDE.md](../CLAUDE.md).

## Application Structure

### Routes

| Path | Page | Description |
|------|------|-------------|
| `/` | Redirect | Redirects to `/portfolio` |
| `/portfolio` | PortfolioPage | Artifact grid with filters, create dialog, AI chat |
| `/portfolio/artifacts/:id` | ArtifactPage | Full editor with chat panel, foundations, image approval |
| `/profile` | ProfilePage | User context, skills management |
| `/settings` | SettingsPage | Theme, interaction mode preferences |
| `/settings/style` | WritingStylePage | Writing examples upload and analysis |

### Content Types

| Type | Label | Description |
|------|-------|-------------|
| `blog` | Blog Post | Long-form articles for Medium, Substack, or personal blog |
| `showcase` | Case Study | Project showcases with interview-based creation |
| `social_post` | Social Post | LinkedIn/Twitter posts generated from existing content |

### AI Pipeline (11-Status Workflow)

```
draft -> [interviewing] -> research -> foundations -> skeleton
  -> foundations_approval -> writing -> humanity_checking
  -> creating_visuals -> ready -> published
```

- **Processing states** (editor locked): interviewing, research, foundations, skeleton, writing, humanity_checking, creating_visuals
- **Editable states**: draft, foundations_approval, ready, published
- **User approval gate**: foundations_approval (user must approve before writing begins)

## Current State

- **Phases 1-4:** Complete (Foundation, Research, Image Generation, Writing Quality)
- **Phase 5:** Complete (Security, Observability, Error Handling)
- **Phase 6:** Complete (Frontend Integration, Status Workflow)
- **Active development:** Showcase interview flow, content improvement, social post generation

## Related Documentation

- [Documentation Index](./DOCUMENTATION_INDEX.md) - Master index of all docs
- [Content Agent Architecture](./Architecture/backend/content-agent-architecture.md)
- [Pipeline Execution Flow](./ai-agents-and-prompts/pipeline-execution-flow.md)
- [Status Workflow](./artifact-statuses/STATUS_VALUES_REFERENCE.md)
- [API Endpoints](./api/content-agent-endpoints.md)
