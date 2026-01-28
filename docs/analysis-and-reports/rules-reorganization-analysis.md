# Rules Reorganization Analysis

**Created:** 2026-01-27
**Issue:** Global `.claude/rules/` folder contains project-specific rules that should be in the project directory

---

## Current Problem

The global rules folder (`/Users/kobiagi/.claude/rules/`) contains a mix of:
- ✅ Universal patterns that apply to ALL projects
- ❌ Project-specific rules for LaunchLee/Product Consultant Helper
- ❌ Project shortcuts and references to specific classes/services

This creates confusion and pollutes the global namespace with project-specific context.

---

## Proposed Organization

### Global Rules (Stay in `/Users/kobiagi/.claude/rules/`)

**Purpose:** Universal patterns that apply to ANY project, regardless of tech stack specifics

#### Frontend Patterns (Universal)
- ✅ `frontend/patterns/component-standards.md` - React component patterns (BaseTextField, BaseTextArea, portals)
- ✅ `frontend/critical/portaled-components-pattern.md` - Portal click-outside pattern

**Reasoning:** These are React best practices that apply to any React project

#### Security & Logging (Universal)
- ✅ `security/production-logging-security.md` - GDPR/SOC2 logging patterns, PII protection

**Reasoning:** GDPR compliance and secure logging apply to all projects

#### Debugging Patterns (Universal)
- ✅ `debugging/use-debugging-skill.md` - Evidence-based debugging approach
- ✅ `debugging/multi-system-flow-tracing.md` - Multi-system debugging pattern
- ✅ `debugging/auto-peer-review-on-persistent-issues.md` - Peer review pattern

**Reasoning:** Systematic debugging approaches apply universally

#### Workflow Patterns (Universal)
- ✅ `workflows/feature-development-process.md` - Structured feature development
- ✅ `workflows/mandatory-code-review-after-plan.md` - Code review workflow

**Reasoning:** Development workflows apply to any project

#### Code Search & Removal (Universal)
- ✅ `backend/patterns/lsp-first-code-search.md` - LSP before grep pattern
- ✅ `backend/patterns/obsolete-code-removal.md` - Safe code removal workflow

**Reasoning:** These apply to any TypeScript project

#### Testing (Universal)
- ✅ `backend/testing/testing-methodology.md` - Testing pyramid, build-first verification
- ✅ `testing.md` - Testing standards

**Reasoning:** Testing methodologies apply universally

---

### Project-Specific Rules (Move to Project)

**Purpose:** Rules that reference specific classes, services, or project architecture

**Target Location:** `/Users/kobiagi/Desktop/Development/Product_Consultant_Helper/.claude/rules/`

#### Backend Critical (Project-Specific)
- ❌ `backend/critical/logger-service-import.md`
  - **Why move:** References `LoggerService` class specifically
  - **Universal alternative:** Keep logging security pattern globally, move service reference to project

- ❌ `backend/critical/product-ownership-validation.md`
  - **Why move:** References project-specific pattern (products table, user_id validation)
  - **Could generalize:** Make it "resource ownership validation" pattern globally

- ❌ `backend/critical/action-item-shared-types.md`
  - **Why move:** 100% LaunchLee-specific (action items, shared types location)

- ❌ `backend/critical/feature-flag-pattern.md`
  - **Why move:** References `FeatureFlagService` class specifically
  - **Universal alternative:** Could generalize to "feature flags pattern" globally

- ❌ `backend/critical/mcp-first-database.md`
  - **Decision needed:** Could be universal (MCP tools for Supabase), or project-specific
  - **Recommendation:** KEEP GLOBAL (Supabase MCP pattern applies to any Supabase project)

#### Backend Workflows (Project-Specific)
- ❌ `backend/workflows/action-item-execution-flow.md`
  - **Why move:** 100% LaunchLee-specific (action items, n8n workflows, specific flow)

#### Backend Patterns (Project-Specific)
- ❌ `backend/patterns/file-organization.md`
  - **Why move:** References specific project directories (migrations, reports, Scripts)
  - **Universal alternative:** Could generalize to "keep root clean" pattern

- ❌ `backend/patterns/ai-prompt-testing.md`
  - **Why move:** Assumes n8n workflows, test-ai-prompt skill
  - **Universal alternative:** Could generalize to "test AI prompts" pattern

#### n8n (Project-Specific)
- ❌ `n8n/fetch-from-cloud.md`
  - **Why move:** Assumes n8n usage, references specific workflows
  - **Universal alternative:** Could keep if made generic "fetch workflows from cloud"

#### Shortcut Files (Project-Specific)
- ❌ `backend.md`
  - **Why move:** Project-specific shortcuts (LoggerService, action item types)

- ❌ `frontend.md`
  - **Why move:** Project-specific shortcuts (@shared alias, action item types)

---

## Decisions Needed

### 1. Rules That Could Be Generalized

Some project-specific rules contain universal patterns buried inside:

| Current Rule | Could Extract Universal Pattern | Keep Specific Implementation |
|--------------|----------------------------------|------------------------------|
| `logger-service-import.md` | "Use structured logging service" | LoggerService references → project |
| `feature-flag-pattern.md` | "Use feature flags for rollouts" | FeatureFlagService → project |
| `file-organization.md` | "Keep project root clean" | Specific directories → project |
| `product-ownership-validation.md` | "Validate resource ownership" | Products/users specifics → project |
| `ai-prompt-testing.md` | "Test AI prompts with live APIs" | n8n specifics → project |

**Your decision:**
- [ ] Extract universal patterns to global, keep specifics in project
- [ ] Move entire rules to project (simpler, less abstraction)

### 2. MCP-First Database Rule

`backend/critical/mcp-first-database.md` references Supabase MCP tools.

**Options:**
- [ ] Keep GLOBAL - Pattern applies to any Supabase project
- [ ] Move to project - Assumes specific MCP server setup

### 3. README Files

**Global README** (`/Users/kobiagi/.claude/rules/README.md`):
- Currently lists 20 rules (mix of global + project-specific)
- Should list only universal rules after reorganization

**Project README** (new file to create):
- Should list project-specific rules
- Reference global rules as "also applies"

---

## Migration Strategy

### Option A: Move Entire Rules (Simpler)

1. Create `/Users/kobiagi/Desktop/Development/Product_Consultant_Helper/.claude/rules/`
2. Move all project-specific rules as-is
3. Update both READMEs
4. Keep global rules minimal and truly universal

**Pros:** Simple, clean separation
**Cons:** Some universal patterns remain buried in project rules

### Option B: Extract Universal Patterns (More Work)

1. Extract universal patterns from project-specific rules
2. Create generalized global versions
3. Keep specific implementations in project
4. More work but creates reusable patterns

**Pros:** Maximizes reusability
**Cons:** More complex, requires careful abstraction

---

## Your Instructions

Please review and provide instructions for:

1. **Which option:** Move entire rules (A) or extract patterns (B)?

2. **MCP-First Database:** Keep global or move to project?

3. **Which rules to move:** Confirm the list above or modify

4. **Generalization:** Which rules (if any) should be generalized for global use?

5. **README strategy:** How detailed should project README be?

Once you provide instructions, I'll:
- Create project `.claude/rules/` structure
- Move/reorganize files
- Update both README files
- Ensure proper cross-referencing

---

## Additional Considerations

### LaunchLee vs Product Consultant Helper

Some rules reference "LaunchLee" but this project is "Product Consultant Helper". This suggests:
- Rules may have been copied from another project
- Need to verify which rules actually apply to THIS project
- May need to adapt LaunchLee-specific rules for this project's architecture

### CLAUDE.md References

The global rules README references `/Users/kobiagi/Documents/LaunchLee_App/CLAUDE.md` which is a different project.

**Should update to:** Reference this project's CLAUDE.md at `/Users/kobiagi/Desktop/Development/Product_Consultant_Helper/CLAUDE.md`
