---
name: execute-spec
description: Execute a specification file end-to-end — from planning through implementation, code review, documentation, and testing. Use this skill whenever the user provides a spec, PRD, feature specification, or implementation document and wants it built. Also trigger when the user says "execute this spec", "implement this spec", "build from spec", "follow this spec", or references a specification file they want turned into working code with tests.
---

# Execute Spec

Turn a specification document into production-ready code with tests, review, and documentation — systematically.

This skill orchestrates a full development cycle: you read the spec, plan the work, implement it, get it reviewed, process feedback, update docs, and run tests. Every execution includes both code development and automation testing — no exceptions.

## The Sequence

```
1. PLAN    → Enter plan mode, read spec, design implementation plan
2. BUILD   → Execute the approved plan
3. REVIEW  → Request code review (requesting-code-review skill)
4. PROCESS → Evaluate and act on review feedback (receiving-code-review skill)
5. DOCUMENT → Update product documentation (product-documentation skill)
6. TEST    → Run automation tests (unit + integration)
```

Each step feeds into the next. Don't skip steps. Don't reorder them.

## Step 1: Plan

### Enter Plan Mode

Use the `EnterPlanMode` tool to switch into planning mode. This signals to the user that you're designing the approach before writing code.

### Read the Spec

The user will provide a spec file path or paste spec content. Read it completely before doing anything else.

```
Read the spec file → understand every requirement → note ambiguities
```

If the spec path isn't obvious, ask:
```
"Which spec file should I execute? Provide the path or paste the content."
```

### Analyze and Explore

Before writing the plan, understand the codebase context:

- Use Glob/Grep to find related existing code
- Identify files that will need changes
- Check for existing patterns you should follow
- Note dependencies and potential conflicts

### Write the Plan

The plan must always contain these two sections — they are non-negotiable:

1. **Code Development** — what to build, which files to create/modify, architecture decisions
2. **Automation Testing** — unit tests and integration tests for the new code

Structure the plan as phases with clear deliverables:

```markdown
## Phase 1: [Backend/Service/Core Logic]
- [ ] Task 1: description
- [ ] Task 2: description
- [ ] Unit tests for Phase 1

## Phase 2: [Frontend/API/Integration Layer]
- [ ] Task 3: description
- [ ] Task 4: description
- [ ] Unit tests for Phase 2

## Phase 3: Integration Testing
- [ ] Integration test: [scenario 1]
- [ ] Integration test: [scenario 2]
```

Every phase that produces code must have corresponding tests in the plan. If a phase has no tests listed, add them before presenting the plan.

### Get Approval

Use `ExitPlanMode` to present the plan for user approval. Do not proceed until the user approves.

If the user requests changes to the plan, revise and re-present. The plan is a contract — once approved, follow it.

## Step 2: Build

Execute the approved plan phase by phase.

- Track progress using TodoWrite — mark each task as you complete it
- Follow existing codebase patterns and conventions
- Write the tests alongside the code (not after)
- If you discover something the plan didn't account for, note it and continue — don't stop to re-plan unless it's a blocker

### Build Verification

After completing all implementation:

```bash
npm run build
```

A clean build is required before proceeding to review. Fix any TypeScript or compilation errors first.

## Step 3: Code Review

Use the Skill tool to invoke `requesting-code-review`:

```
Skill({ skill: "requesting-code-review" })
```

Before invoking, prepare the review context:

```bash
BASE_SHA=$(git rev-parse HEAD~<number-of-commits>)  # or the commit before you started
HEAD_SHA=$(git rev-parse HEAD)
```

The requesting-code-review skill will dispatch a code-reviewer subagent. Provide it with:
- **WHAT_WAS_IMPLEMENTED**: Summary of what you built
- **PLAN_OR_REQUIREMENTS**: Reference to the spec and approved plan
- **BASE_SHA / HEAD_SHA**: The commit range
- **DESCRIPTION**: Brief description of the changes

## Step 4: Process Review Feedback

Use the Skill tool to invoke `receiving-code-review`:

```
Skill({ skill: "receiving-code-review" })
```

Follow the receiving-code-review pattern:
1. Read complete feedback without reacting
2. Restate each item in your own words
3. Verify against the codebase — is the feedback technically correct?
4. Evaluate — does it serve this project?
5. Respond with technical acknowledgment or reasoned pushback
6. Implement fixes one at a time, test each

**Priority order:**
- Critical issues → fix immediately
- Important issues → fix before proceeding
- Minor issues → note, fix if quick, otherwise document for later

After all fixes, run `npm run build` again to confirm nothing broke.

## Step 5: Update Documentation

Use the Skill tool to invoke `product-documentation`:

```
Skill({ skill: "product-documentation" })
```

This skill will:
1. Identify what changed from the git diff and conversation context
2. Map changes to affected documentation layers (flows, features, API, architecture, etc.)
3. Create or update docs under `docs/`
4. Update `docs/DOCUMENTATION_INDEX.md`

Don't skip this step even if the changes seem small. Documentation drift is how projects decay.

## Step 6: Run Automation Tests

Run the full test suite to confirm everything works:

```bash
# Unit tests
npm run test

# If integration tests exist
npm run test:integration

# If the project has specific test commands, use those
```

Report results clearly:
- How many tests ran
- How many passed/failed
- If any failures, what broke and why

If tests fail:
1. Diagnose the failure (is it your code or a pre-existing issue?)
2. Fix failures caused by your changes
3. Re-run tests until green
4. If a failure is pre-existing and unrelated, note it clearly for the user

## Handling Ambiguity in the Spec

Specs are rarely perfect. When you hit ambiguity:

- **Minor ambiguity** (naming, exact UI placement): Make a reasonable choice, note it in the plan, keep moving
- **Major ambiguity** (contradictory requirements, missing critical details): Stop and ask the user before planning. Use the AskUserQuestion tool.
- **Scope ambiguity** (spec implies more than seems intended): Call it out. "The spec mentions X — should I include that in this execution or defer it?"

## When Things Go Wrong

**Build fails after implementation:**
Fix compilation errors. This is part of Step 2, not a separate step.

**Code review finds critical issues:**
Fix them in Step 4. Don't rationalize skipping critical fixes.

**Tests fail after review fixes:**
The fix introduced a regression. Debug it, fix it, re-run. Don't proceed with failing tests.

**Spec is too large for one session:**
Propose splitting into phases. Execute the first phase fully (through tests), then pause for user direction on the next phase.

## Example

```
User: "Execute this spec: docs/specs/user-notifications.md"

You:
1. [EnterPlanMode]
2. [Read docs/specs/user-notifications.md]
3. [Explore codebase for notification patterns, existing services]
4. [Write plan with phases: backend service, API routes, frontend components, tests]
5. [ExitPlanMode — present plan]

User: "Approved"

6. [Build phase by phase, tracking with TodoWrite]
7. [npm run build — verify clean]
8. [Invoke requesting-code-review skill]
9. [Receive feedback, invoke receiving-code-review skill]
10. [Fix critical/important issues, rebuild]
11. [Invoke product-documentation skill]
12. [Run tests — npm run test]
13. "Implementation complete. All tests passing. Here's a summary: ..."
```
