---
name: product-documentation
description: Obsessively maintain complete, deep product documentation across all layers. Automatically called at the end of every development cycle to update docs for new features, modified features, architecture changes, API changes, state machine changes, and database schema changes. Use after any feature implementation, bug fix that changes behavior, or refactoring that alters architecture.
---

# Product Documentation Skill

You are now in **Product Documentation Mode**. Your job is to ensure the documentation at `docs/` is a complete, accurate, deep representation of the product in its current state.

## Core Principle

**Documentation is never "good enough". It is either accurate and complete, or it is wrong.**

Every feature, every flow, every screen, every API endpoint, every state transition, every AI tool, every database table must be documented. When code changes, docs change. No exceptions.

## When This Skill Runs

This skill is invoked automatically at the end of every development cycle:
- After feature implementation (new or updated)
- After bug fixes that change behavior or flows
- After refactoring that alters architecture
- After database migrations
- After API endpoint changes
- After AI agent/tool changes

## Documentation Layers

The product must be documented across ALL of these layers. Each layer has a dedicated location under `docs/`.

### Layer 1: Product Overview
**Location:** `docs/PRODUCT_OVERVIEW.md`
**What it covers:**
- Product name, purpose, target user
- Value proposition (what problem it solves, for whom)
- High-level feature list with one-line descriptions
- Tech stack summary (link to CLAUDE.md for details)
- Current state (what's shipped, what's in progress)

### Layer 2: User Flows & Journeys
**Location:** `docs/flows/`
**What it covers:**
- Every user-facing flow documented as a step-by-step journey
- Entry points (how does the user get here?)
- Decision points (where does the user choose?)
- Happy path + error paths
- Mermaid sequence diagrams for complex flows
- Screen references (which component renders each step)

**Files to maintain:**
- `artifact-creation-flow.md` - Topic selection through published content
- `content-improvement-flow.md` - Text/image selection, AI feedback, application
- `showcase-interview-flow.md` - Interview-based content creation
- `writing-style-setup-flow.md` - Writing examples, characteristics analysis
- `portfolio-management-flow.md` - CRUD, filtering, status management
- `image-generation-flow.md` - Image needs, generation, approval, regeneration
- Add new files for every new user-facing flow

### Layer 3: Screens & Components
**Location:** `docs/screens/`
**What it covers:**
- Every page/screen in the application
- Component hierarchy (what renders what)
- Props and state dependencies
- Conditional rendering rules (when does X show?)
- Mobile vs desktop behavior differences
- Key interactions (click, hover, drag, keyboard)

**Files to maintain:**
- `portfolio-page.md` - Artifact grid, cards, filters, CRUD
- `artifact-page.md` - Editor, chat panel, foundations, image approval
- `writing-style-page.md` - Writing examples, characteristics display
- `app-shell.md` - Layout, sidebar, navigation, route structure
- Add new files for every new page

### Layer 4: State Machines & Status Workflows
**Location:** `docs/artifact-statuses/` (existing)
**What it covers:**
- Every state machine in the system
- Valid transitions (from → to)
- Guards/conditions on transitions
- Side effects triggered by transitions
- Frontend UI behavior per state (locked/unlocked, progress %, indicators)
- Mermaid state diagrams

**Existing files to keep updated:**
- `7-status-workflow-specification.md`
- `status-flow-reference.md`
- `STATUS_VALUES_REFERENCE.md`

### Layer 5: Features & Capabilities
**Location:** `docs/features/`
**What it covers:**
- Deep documentation of every product feature
- What it does (user perspective)
- How it works (technical perspective)
- Configuration options
- Known limitations
- Dependencies on other features

**Files to maintain:**
- `content-creation-agent.md` - AI-powered content pipeline
- `showcase-interview.md` - Interview-based content creation
- `content-improvement.md` - Text/image selection + AI feedback
- `image-generation.md` - DALL-E 3 / Gemini Imagen integration
- `writing-style-analysis.md` - Writing characteristics extraction
- `rich-text-editor.md` - Tiptap editor capabilities
- `research-pipeline.md` - Tavily-powered research
- Add new files for every new feature

### Layer 6: Architecture
**Location:** `docs/Architecture/` (existing)
**What it covers:**
- System architecture diagrams (component, deployment, data flow)
- Backend architecture (services, middleware, routing)
- Frontend architecture (component tree, state management, data fetching)
- Database architecture (schema, relationships, indexes, RLS)
- AI architecture (agents, tools, pipelines, prompts)
- Security architecture (auth, validation, rate limiting)
- Observability architecture (tracing, metrics, logging)

**Existing files to keep updated:**
- `backend/content-agent-architecture.md`
- `backend/security-architecture.md`
- `backend/observability-architecture.md`
- `frontend/screen-context-integration.md`
- `database/artifact-schema-and-workflow.md`
- `UNIFIED_CONTENT_AGENT_ARCHITECTURE.md`

### Layer 7: API Reference
**Location:** `docs/api/` (existing)
**What it covers:**
- Every API endpoint (method, path, description)
- Request schemas (headers, body, query params)
- Response schemas (success + error)
- Authentication requirements
- Rate limits
- Example requests/responses (curl + TypeScript)

**Existing files to keep updated:**
- `content-agent-endpoints.md`
- `authentication-and-security.md`
- `error-handling-reference.md`
- `screen-context-specification.md`
- Add new files for every new API domain

### Layer 8: AI Agents & Tools
**Location:** `docs/ai-agents-and-prompts/` (existing)
**What it covers:**
- Every AI agent (purpose, capabilities, configuration)
- Every tool (name, parameters, return type, side effects)
- System prompts (full text with annotation)
- Pipeline execution flow (step-by-step with checkpoints)
- Intent detection logic
- Mock configuration (for testing without real AI calls)

**Existing files to keep updated:**
- `content-agent-overview.md`
- `core-tools-reference.md`
- `context-tools-reference.md`
- `pipeline-execution-flow.md`
- `system-prompt-specification.md`
- `intent-detection-guide.md`

### Layer 9: Database Schema
**Location:** `docs/Architecture/database/`
**What it covers:**
- Every table (columns, types, constraints, defaults)
- Relationships (foreign keys, join patterns)
- Indexes (what's indexed, why)
- RLS policies (who can access what)
- JSONB metadata structures (documented field by field)
- Migration history (what changed when)

**Existing files to keep updated:**
- `artifact-schema-and-workflow.md`
- `artifact-data-relationships.md`

### Layer 10: Authentication & Authorization
**Location:** `docs/api/authentication-and-security.md` + `docs/Architecture/backend/security-architecture.md`
**What it covers:**
- Auth flow (Supabase Auth, JWT tokens)
- Session management
- Protected routes and middleware
- Ownership validation (artifact ownership checks)
- Rate limiting rules
- Input validation (prompt injection, PII detection)

### Layer 11: Testing
**Location:** `docs/testing/`
**What it covers:**
- Test strategy (unit, integration, E2E)
- Test infrastructure (Vitest config, Playwright setup)
- Mock configuration guide
- Test coverage status
- Critical test scenarios

### Layer 12: Documentation Index
**Location:** `docs/DOCUMENTATION_INDEX.md` (existing)
**What it covers:**
- Master index of ALL documentation files
- Organized by layer/category
- File counts, last updated dates
- Quick reference tables
- Cross-reference links

---

## Execution Workflow

When invoked, follow these steps:

### Step 1: Identify What Changed

Read the git diff or the conversation context to determine exactly what was implemented/changed:

```bash
# If post-commit, check recent changes
git diff HEAD~1 --name-only
git log -1 --format='%s'

# If mid-conversation, review the TodoWrite task list and completed work
```

Categorize changes into:
- **New feature** → Create new doc files + update index
- **Feature update** → Update existing doc files + update index
- **Bug fix with behavior change** → Update affected flow/feature docs
- **Architecture change** → Update architecture docs
- **Database migration** → Update schema docs
- **API change** → Update API docs
- **AI tool/prompt change** → Update AI agent docs

### Step 2: Determine Affected Layers

Map each change to the documentation layers it affects. A single feature typically touches 4-8 layers.

Example — "Added showcase interview feature":
- Layer 2: New flow (`showcase-interview-flow.md`)
- Layer 3: Updated screens (`artifact-page.md` — new interview UI)
- Layer 4: Updated state machine (new `interviewing` status)
- Layer 5: New feature doc (`showcase-interview.md`)
- Layer 6: Updated architecture (new tools in pipeline)
- Layer 7: API changes (if any new endpoints)
- Layer 8: New AI tools (`startShowcaseInterview`, `saveInterviewAnswer`, `completeShowcaseInterview`)
- Layer 9: New table (`artifact_interviews`)
- Layer 12: Updated index

### Step 3: Update Documentation

For each affected layer:

1. **Read the existing doc** (if it exists)
2. **Read the actual code** that changed (always verify against implementation, never guess)
3. **Update or create the doc** with accurate, deep content
4. **Include code examples** from the actual codebase (TypeScript interfaces, SQL schemas)
5. **Include diagrams** (Mermaid) for flows, state machines, architecture
6. **Add cross-references** to related docs
7. **Update version number** and "Last Updated" date

### Step 4: Update the Index

After all layer docs are updated:

1. Read `docs/DOCUMENTATION_INDEX.md`
2. Add/update entries for every new or modified file
3. Update file counts
4. Update "Last Updated" date
5. Verify all internal links work

### Step 5: Verify Completeness

Run a self-check:
- [ ] Every new file/function mentioned in the git diff has corresponding documentation
- [ ] Every new database table/column is documented in the schema docs
- [ ] Every new API endpoint is documented in the API reference
- [ ] Every new AI tool is documented in the tools reference
- [ ] Every new user flow is documented in flows/
- [ ] Every state machine change is reflected in status docs
- [ ] The index is up to date
- [ ] All Mermaid diagrams render correctly
- [ ] All cross-reference links are valid

---

## Documentation Standards

### File Format
```markdown
# [Title]

**Created:** YYYY-MM-DD
**Last Updated:** YYYY-MM-DD
**Version:** X.Y.Z
**Status:** Complete | Active | Draft

## Overview
[2-3 sentence summary]

## [Sections...]

## Related Documentation
- [Link to related doc 1](./path.md)
- [Link to related doc 2](./path.md)
```

### Version Numbers
- `1.0.0` — Initial creation
- `X.Y.0` — Major update (new sections, restructured)
- `X.Y.Z` — Minor update (corrections, additions to existing sections)

### Diagrams
- Use Mermaid for all diagrams (state machines, sequence diagrams, flowcharts)
- Every state machine MUST have a Mermaid diagram
- Every multi-step flow MUST have a sequence diagram

### Code Examples
- Always from actual codebase (not made up)
- Include file path and line numbers
- Use TypeScript syntax highlighting
- Show both interfaces and usage examples

### Depth Requirements
- **Shallow = wrong**: "This endpoint creates an artifact" is not documentation
- **Deep = right**: "POST /api/artifacts — Creates a new artifact. Requires Bearer token. Body: { title: string (required, 1-200 chars), type: ArtifactType (blog|social_post|showcase), ... }. Returns 201 with { id, status: 'draft', created_at }. Errors: 401 (unauthorized), 400 (validation), 409 (duplicate title)."

---

## Output

After completing documentation updates, report:

```markdown
## Documentation Update Report

**Trigger:** [What was implemented/changed]
**Layers Updated:** [List of affected layers]

### Files Created
- `docs/path/new-file.md` — [Description]

### Files Updated
- `docs/path/existing-file.md` — [What changed]

### Index Status
- Total docs: [N] files
- Last updated: [Date]
```
