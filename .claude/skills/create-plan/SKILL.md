---
name: create-plan
description: Generate a structured markdown implementation plan from the current conversation. Produces clear, minimal steps with status tracking emojis and progress percentage. Use after exploring and clarifying a feature to create an actionable task document.
---

# Plan Creation Stage

Based on our full exchange, produce a markdown plan document.

## Requirements for the Plan

- Include clear, minimal, concise steps.
- Track the status of each step using these emojis:
  - 🟩 Done
  - 🟨 In Progress
  - 🟥 To Do
- Include dynamic tracking of overall progress percentage (at top).
- Do NOT add extra scope or unnecessary complexity beyond explicitly clarified details.
- Steps should be modular, elegant, minimal, and integrate seamlessly within the existing codebase.

## Markdown Template

Use this exact structure for the plan:

```markdown
# Feature Implementation Plan

**Overall Progress:** `0%`

## TLDR
Short summary of what we're building and why.

## Critical Decisions
Key architectural/implementation choices made during exploration:
- Decision 1: [choice] - [brief rationale]
- Decision 2: [choice] - [brief rationale]

## Tasks:

- [ ] 🟥 **Step 1: [Name]**
  - [ ] 🟥 Subtask 1
  - [ ] 🟥 Subtask 2

- [ ] 🟥 **Step 2: [Name]**
  - [ ] 🟥 Subtask 1
  - [ ] 🟥 Subtask 2

...
```

## Important Notes

- This is a planning stage, NOT implementation.
- Just write the clear plan document.
- No extra complexity or extra scope beyond what was discussed.
- Ensure steps map directly to the decisions and requirements established in the conversation.
