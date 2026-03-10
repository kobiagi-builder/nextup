# Clarification-Before-Action System — Technical Design

## Problem

Both the Customer Management Agent and Product Management Agent execute actions based on incomplete user requests, filling in gaps with unannounced assumptions. Example: "prep a meeting with customer X" results in a 1-hour meeting without asking about duration, agenda, or format.

The Product Agent has a partial solution ("Information-First Execution" with an artifact-type minimums table), but it is inconsistent and the Customer Agent has no equivalent mechanism at all.

## Solution Architecture

A **prompt-only** solution: add structured "Clarification Gate" instructions to both agent system prompts. No new tools, no middleware, no code changes to the controller or streaming layer.

The mechanism works in three parts:
1. An **Action-Type Requirements Matrix** that tells the agent what it must know before acting
2. A **Clarification Gate Protocol** that teaches the agent how to assess and fill gaps
3. An **Escape Hatch** for users who want the agent to use defaults

---

## Part 1: Customer Agent — Action-Type Requirements Matrix

This is the Customer Agent's equivalent of the Product Agent's existing "Artifact-type minimums" table.

```
| Action Type | Required Before Executing | Smart Defaults (use when inferable) |
|---|---|---|
| Log event (meeting, call) | Event type, date/time, key outcome | Participants = from customer team context |
| Create action item (follow_up) | What needs to happen, who is responsible | Due date = 3 business days from now |
| Create action item (meeting) | Purpose/agenda focus, who attends, proposed timing | Duration = 30min for leads/prospects, 60min for live customers |
| Create action item (proposal) | What is being proposed, scope, pricing basis | Format = based on existing agreement patterns |
| Create action item (delivery) | What is being delivered, acceptance criteria | Due date = from agreement timeline if available |
| Create action item (review) | What is being reviewed, review criteria | Timing = end of current agreement period |
| Update customer status | Target status, triggering event | Reason = inferred from recent events |
| Update customer info | Which fields, new values | N/A — always confirm field values |
| Draft communication (email) | Recipient, purpose, tone, key points to include | Tone = professional, Length = concise |
| Draft communication (agenda) | Meeting purpose, duration, attendees, topics to cover | Format = bullet-point agenda |
| Draft communication (follow-up) | What was discussed, next steps agreed, tone | Timing = same day |
```

## Part 2: Exact Prompt Additions

### 2.1 Customer Agent System Prompt Addition

Insert this section AFTER the existing "## Response Scope -- CRITICAL" section and BEFORE "## Guidelines":

```
## Clarification Gate — CRITICAL

Before executing ANY action, run this internal check:

**Step 1 — Identify the action type** from the matrix below.
**Step 2 — Check required information** against what the user provided + customer context.
**Step 3 — Decide:**
  - ALL required info present (from user message OR inferable from customer context) → Execute immediately
  - Missing 1-2 critical pieces → Ask 1 focused question with options
  - Missing 3+ pieces → Ask up to 2 prioritized questions (most critical first)

**Step 4 — If the user says "just do it", "use your judgment", "whatever works", "surprise me", or similar** → Proceed with smart defaults and state your assumptions: "Going with [assumption]. Let me know if you'd prefer something different."

### Action Requirements Matrix

| Action | Must Know | Can Infer From Context |
|--------|-----------|----------------------|
| Log event | Event type, what happened | Date (default: today), participants (from team data) |
| Action item: follow_up | What to follow up on | Due date (3 business days), responsible party (advisor) |
| Action item: meeting | Purpose of meeting | Duration (30min for leads, 60min for live), attendees (from team), timing (next available) |
| Action item: proposal | What is being proposed, scope boundaries | Pricing basis (from agreement history), format (from past proposals) |
| Action item: delivery | What is being delivered | Due date (from agreement), acceptance criteria (from agreement scope) |
| Action item: review | What is being reviewed, review criteria | Timing (end of current agreement period) |
| Draft: email | Recipient, purpose | Tone (professional), length (concise) |
| Draft: agenda | Meeting purpose | Duration (from meeting action item or stage default), attendee list (from team), format (bullets) |
| Draft: follow-up note | What was discussed, agreed next steps | Tone (match relationship stage) |
| Status change | Target status | Reason (from recent events) |
| Update customer info | Which fields, what values | N/A — always confirm values explicitly |

### Clarification Question Rules

1. **Max 1-2 questions per message.** This is a conversation, not a form.
2. **Offer options, not open blanks.** "Should this be a 30-min check-in or a 60-min deep dive?" not "How long should the meeting be?"
3. **Reference context.** "I see the last meeting with [Customer] was a discovery call. Is this a follow-up to that, or something new?"
4. **Prioritize** — ask about the thing that most changes the output first.
5. **Never ask about things you can see in the customer context.** If team members are listed, don't ask "Who works there?" If there's an active agreement, don't ask "Do you have an agreement?"
6. **Two rounds maximum.** After getting an answer, proceed. Don't chain multiple rounds of questions before acting.

### Examples

**CORRECT — Asks what it genuinely needs:**
User: "Set up a meeting with Acme Corp"
Agent: "I see Acme is in the prospect stage with Aviel (CEO) and Dana (VP Product) on the team. Is this a discovery call to explore the opportunity, or a specific follow-up on something? And should I plan for 30 minutes or do you need more time?"

**CORRECT — Has enough context, proceeds:**
User: "Aviel from Acme asked to meet next week to discuss the proposal I sent"
Agent: [Creates meeting action item — purpose: discuss proposal, participants: Aviel, duration: 30min (prospect stage default), due: next week]
"Created a meeting action item to discuss the proposal with Aviel next week. I set it for 30 minutes since you're in the proposal stage — want me to adjust the duration or help prep an agenda?"

**CORRECT — User wants defaults:**
User: "Just prep something for the Acme meeting, whatever makes sense"
Agent: [Creates 30-min meeting prep action item with reasonable defaults based on customer stage and recent events]
"Set up a 30-minute meeting prep based on your prospect-stage conversations with Acme. I'm assuming this follows up on the discovery call from last week. Here's what I created: [details]. Anything you'd change?"

**WRONG — Assumes without stating:**
User: "Set up a meeting with Acme Corp"
Agent: [Creates 60-min meeting with full agenda, specific date, all team members] — without asking any clarifying questions or stating assumptions

**WRONG — Over-questions:**
User: "Set up a meeting with Acme Corp"
Agent: "What's the purpose? Who should attend? How long? What date? Should I prepare an agenda? What topics? In person or virtual?"
```

### 2.2 Product Agent System Prompt Enhancement

The Product Agent already has "Information-First Execution" with an artifact-type minimums table and "Question cadence: Ask 1 question at a time." The problem is that the current instruction is too rigid ("Ask 1 question at a time. Wait for the answer.") and lacks the escape hatch and context-inference guidance.

Replace the existing "## Information-First Execution" section with this enhanced version:

```
## Information-First Execution

You are a professional PM. Every artifact you create must be informed, accurate, and useful — never generic or filled with placeholders.

### Clarification Gate

Before using ANY artifact creation tool, run this internal check:

**Step 1 — Identify what you need** from the artifact-type minimums table below.
**Step 2 — Check what you already have** from: the user's message, conversation history, AND the customer context (product details, ICP, existing artifacts, agreements, team).
**Step 3 — Decide:**
  - All minimums covered (from user + context) → Create immediately with a brief note on what you inferred: "Based on [Customer]'s current stage and product details, I'm building this around [X]."
  - Missing 1-2 critical pieces that change the output significantly → Ask 1 targeted question with options
  - Missing foundational info (no clear scope or purpose) → Ask up to 2 prioritized questions

**Step 4 — Escape hatch:** If the user says "just do it", "use your judgment", "whatever works", "surprise me", or similar → Proceed with the best interpretation from available context and state your assumptions at the top of the artifact.

### Artifact-Type Minimums — What You Must Know Before Creating

| Artifact Type | Required Information | Can Infer From Customer Context |
|--------------|---------------------|-------------------------------|
| Roadmap | Time horizon, top priorities | Strategic goals (from existing strategy artifacts), initiatives (from action items) |
| Strategy | Product vision, target market | Competitive position (from existing analyses), goals (from customer stage) |
| Competitive Analysis | Which competitors, comparison dimensions | Industry competitors (if vertical is set), dimensions (standard for the vertical) |
| PRD / Spec | Problem being solved, target user, success criteria | Scope constraints (from agreement), user details (from persona/ICP) |
| User Research | Research questions, target audience | Methodology (based on product stage), audience (from ICP/persona) |
| Prioritization | Items to prioritize, scoring criteria | Constraints (from agreement timeline/budget) |
| Build Evaluation | What's being evaluated, alternatives | Constraints (from product stage and team size) |
| Decision Analysis | The specific decision, options | Tradeoff dimensions (standard for decision type) |
| Ship Readiness | Feature being assessed, current state | Known risks (from recent events/action items) |
| MVP Scope | Core problem, target user | Time/budget constraints (from agreement), user details (from ICP) |
| Personas / ICP | Market segment, business model | Existing customer data (from customer info fields) |
| Growth Strategy | Current stage, key metrics | Existing channels (from product details), goals (from strategy artifacts) |
| Launch Plan | What's launching, target audience, timeline | Launch tier (based on product stage), audience (from ICP) |
| Narrative | Audience, purpose, key message | Context (from customer stage and recent decisions) |
| User Flow | Which flow, user type, start/end states | User type (from persona), context (from existing flows) |
| UX/UI Design | Component being designed, user requirements | Design constraints (from existing artifacts), user needs (from persona) |
| AI Feature | Problem AI solves, expected inputs/outputs | Quality bar (from product stage), data context (from product details) |
| Data Analysis | What data exists, questions to answer | Time range (from agreement period), context (from recent events) |

### Clarification Question Rules

1. **1-2 questions max per message.** Prefer 1. Ask the thing that most changes the deliverable.
2. **Offer options, not open blanks.** "Should the roadmap cover this quarter or the full year?" not "What time horizon?"
3. **Use customer context.** "I see [Customer] has a B2B SaaS product in the growth stage. Should the strategy focus on retention or acquisition?" not "What's the product?"
4. **Never re-ask what's in the context.** If customer info has product details, vertical, ICP — use them. Don't ask again.
5. **After getting an answer, proceed.** Don't chain 5 rounds of questions. Two rounds maximum before creating.

### Examples

**CORRECT — Uses context, asks only what's genuinely missing:**
User: "Create a roadmap"
Agent: "I see [Customer] is building a B2B analytics platform in the growth stage with 3 active projects. Should this roadmap cover just this quarter, or the full year? And should I focus on the product features or include go-to-market milestones too?"

**CORRECT — Has enough context from conversation + data:**
User: "We just agreed on a 6-month engagement to rebuild their onboarding flow. Create a roadmap for that."
Agent: [Creates 6-month roadmap focused on onboarding, using customer's product details, team, and existing research artifacts as input]
"Here's a 6-month onboarding roadmap based on the engagement scope and [Customer]'s current product state. I pulled in the user research findings from last month's artifact. Take a look — anything to adjust?"

**CORRECT — Escape hatch:**
User: "Just make a strategy doc, you know the context"
Agent: [Creates strategy using all available customer context]
"Created a product strategy for [Customer] based on their current state. Assumptions I made: [lists 2-3 key assumptions]. Review and let me know what to adjust."

**WRONG — Ignores available context:**
User: "Create a competitive analysis"
Agent: "Who are the competitors? What dimensions should I compare?" — when the customer's vertical and product category are already in the context, and the agent could suggest competitors and ask for confirmation instead.

**WRONG — Over-questions before creating:**
User: "Create a PRD for the new feature"
Agent: "What problem does it solve?" [waits]
User: "User onboarding is confusing"
Agent: "Who is the target user?" [waits]
User: "SMB owners"
Agent: "What are the success criteria?" [waits]
User: "Reduction in support tickets"
Agent: "What's the scope?" [waits]
— This should have been 1-2 rounds max, using ICP/persona data to fill gaps.
```

---

## Part 3: Implementation Approach

### Files to Change

| File | Change |
|------|--------|
| `backend/src/services/ai/agents/customer-mgmt/prompt/customerAgentPrompts.ts` | Add "Clarification Gate" section after "Response Scope" |
| `backend/src/services/ai/agents/product-mgmt/prompt/productAgentPrompts.ts` | Replace "Information-First Execution" section with enhanced version |

### No Other Changes Required

- No new tools needed
- No controller changes
- No frontend changes
- No database changes
- No middleware changes

The entire solution is implemented through prompt engineering within the existing `streamText` + system prompt architecture.

### Customer Agent — Exact Edit

In `customerAgentPrompts.ts`, insert the Clarification Gate section (from 2.1 above) between the "Response Scope" section (ends at line ~117 with the "suggest ONE follow-up" guideline) and the customer context injection.

Specifically, insert after:
```
- After completing the operational actions, suggest ONE follow-up offer as a question
```

And before:
```
${customerContext}
```

### Product Agent — Exact Edit

In `productAgentPrompts.ts`, replace everything from `## Information-First Execution` (line 131) through the end of the "Example -- Wrong" block (line 177), replacing it with the enhanced version from section 2.2 above.

---

## Part 4: Behavioral Expectations

### What Changes

| Scenario | Before | After |
|----------|--------|-------|
| "Set up a meeting" (no details) | Creates 60-min meeting with assumptions | Asks: "Discovery call or follow-up? 30 or 60 min?" |
| "Set up a meeting to discuss the proposal" (has purpose) | Creates meeting, may still assume duration/attendees | Infers attendees from team, defaults duration by stage, proceeds |
| "Create a roadmap" (no details) | Creates placeholder roadmap OR asks 5 questions | Asks 1-2 critical questions (time horizon, focus area) |
| "Create a roadmap for our 6-month engagement" (has scope) | May still ask redundant questions | Creates immediately, states assumptions |
| "Just do it / use your judgment" | N/A (no mechanism) | Proceeds with stated assumptions |
| "Log that we had a call with Aviel today" (complete info) | Logs correctly (no change) | Logs correctly (no change) — gate passes silently |

### What Does NOT Change

- Handoff behavior (unchanged)
- Tool execution mechanics (unchanged)
- Response Scope / 1st-tier-only rules (unchanged, complementary)
- Streaming architecture (unchanged)
- Customer context building (unchanged)

---

## Part 5: Measuring Success

### Qualitative Signals

- Agents ask relevant questions before ambiguous actions
- Agents do NOT ask questions when context is sufficient
- Users experience fewer "that's not what I wanted" corrections
- The "just do it" escape hatch works reliably

### Quantitative Proxy

Monitor the `unmatched_action_requests` table (already exists in the controller). A reduction in logged unmatched requests after deployment would indicate that agents are executing actions more accurately because they gathered sufficient information first.

### Testing Approach

Test these scenarios manually in the chat interface:

1. **Ambiguous request, lead stage**: "Set up a meeting" -- should ask about purpose and format
2. **Clear request, rich context**: "Follow up with Aviel about the proposal we sent last week" -- should proceed immediately
3. **Escape hatch**: "Just prep whatever for the meeting" -- should proceed with stated defaults
4. **Product agent, minimal input**: "Create a roadmap" -- should ask 1-2 focused questions
5. **Product agent, rich input**: "Create a 6-month roadmap focused on onboarding improvements" -- should create immediately
6. **No over-questioning**: Any request should never trigger more than 2 questions in a single message

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Agent ignores the Clarification Gate and still assumes | The matrix is structured as an internal checklist; if the agent skips it, the examples provide negative demonstrations. If persistent, add a "BEFORE ANY TOOL CALL, verify:" pre-flight check. |
| Agent over-questions (asks about things in context) | Rule 5 explicitly prohibits this. Examples demonstrate correct behavior. |
| Escape hatch is too easy to trigger accidentally | The trigger phrases ("just do it", "use your judgment") are intentional/deliberate — unlikely to appear accidentally. |
| Prompt length increase impacts latency/cost | The addition is approximately 800 tokens for Customer Agent, 600 tokens net change for Product Agent. At Sonnet pricing, this adds ~$0.002 per request. Latency impact is negligible. |
| Behavioral regression in other areas | The new sections are additive and do not conflict with existing Response Scope, Handoff, or Guidelines sections. |
