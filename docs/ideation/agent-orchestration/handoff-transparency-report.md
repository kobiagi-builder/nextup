# Agent Handoff Transparency: Analysis & Recommendations

**Date:** 2026-03-08
**Status:** Proposal
**Priority:** High — directly impacts user experience quality

---

## Problem Statement

Our dual-agent system (Customer Mgmt + Product Mgmt) exposes internal handoff mechanics to users. When the Customer Agent determines a request belongs to the Product Agent, it writes explanatory text BEFORE calling the handoff tool, revealing the multi-agent architecture.

**Example of the problem:**

> User: "Red Button is a service company fighting DDoS attacks. Please create a deep research..."
>
> Agent: "I can help you research DDoS attacks... However, this type of comprehensive market research and competitive analysis **falls under the Product Management Agent's domain**, as it involves creating detailed research artifacts..."

**Expected behavior:** The handoff should be completely invisible. The user interacts with "the agent" — they should never know about internal agent routing.

---

## Root Cause Analysis

### Evidence Gathered

| Source | Finding |
|--------|---------|
| `customerAgentPrompts.ts:62` | Instruction exists: "call the handoff tool IMMEDIATELY... Do not write any response text before handing off" |
| `customer-ai.controller.ts:316-336` | Stream loop forwards ALL chunks to client before handoff detection |
| `customer-ai.controller.ts:196` | Receiving agent instructed "Do not mention the handoff" — but sending agent has no equivalent |
| User chat logs | Customer Agent writes 1-3 sentences explaining the handoff before calling the tool |

### Root Cause: Two-Layer Failure

1. **Prompt layer:** The LLM ignores the "call handoff IMMEDIATELY" instruction. Explaining reasoning before acting is default LLM behavior that competes with the constraint. The instruction is also buried mid-prompt (in the "Agent Handoff" section), reducing its salience.

2. **Architecture layer:** The controller has no buffering mechanism. Text chunks are forwarded to the client via `writer.write(chunk)` in real-time (line 335). By the time the handoff `tool-output-available` chunk arrives, the pre-handoff explanatory text is already visible to the user.

---

## Approaches Evaluated

### Approach A: Orchestrator Agent

Add a routing agent that owns all user communication. Domain agents (Customer, Product, Content) never speak to the user directly — they produce structured output consumed by the orchestrator.

| Criterion | Assessment |
|-----------|------------|
| Communication quality | 9/10 — eliminates leakage completely |
| Token overhead | $0.001-0.005/request (orchestrator LLM call) |
| Implementation complexity | HIGH — new agent, new stream composition, prompt restructuring |
| Reliability | 8/10 — clean routing, but loses mid-conversation handoff capability |
| Scalability | Excellent — naturally handles N agents |
| Risk | Single point of failure; significant refactor; conversation state complexity |

**Verdict:** Architecturally elegant for 4+ agents. Over-engineered for current 2-agent system. Revisit when adding 3rd+ agent to customer chat.

### Approach B: Stream Buffering (Architecture Fix)

Buffer stream chunks in the controller. When handoff is detected, discard buffered pre-handoff text. When step completes without handoff, flush buffer to client.

| Criterion | Assessment |
|-----------|------------|
| Communication quality | 7-8/10 — eliminates visible handoff text deterministically |
| Token overhead | $0 — pure code change, no additional API calls |
| Implementation complexity | LOW — ~30 lines in controller |
| Reliability | 9/10 — architecturally deterministic, no LLM behavior dependency |
| Scalability | Good — agent-agnostic, works with N agents |
| Risk | Latency on non-handoff messages (mitigated by chunk-level buffering) |

**Key insight from peer review:** Use chunk-level text buffering (accumulate `text-delta` chunks, flush on step completion) rather than step-level buffering to avoid Vercel AI SDK step boundary correlation issues and minimize latency impact.

**Early handoff detection:** Check `tool-invocation` chunks for `toolName === 'handoff'` (before `tool-output-available`) to discard buffer and abort sooner.

### Approach C: Forced Tool-First (`toolChoice`)

Force the LLM to call a routing tool on the first step using `toolChoice: { type: 'tool', toolName: 'route' }`, preventing any pre-handoff text.

| Criterion | Assessment |
|-----------|------------|
| Communication quality | 8/10 — prevents first-turn text leakage |
| Token overhead | $0.001-0.003/request (extra routing step) |
| Implementation complexity | MEDIUM — two-phase streaming, new routing tool |
| Reliability | 7/10 — first-turn only; mid-conversation handoffs still leak |
| Scalability | Good |
| Risk | Adds latency to every request; does not solve mid-conversation handoffs |

**Verdict:** Partial solution. Does not cover mid-conversation handoffs, which is a key failure mode.

### Approach D: Pre-classification Router

Run a lightweight classification (keyword-based, small model, or embedding) before invoking any agent to route to the correct one initially.

| Criterion | Assessment |
|-----------|------------|
| Communication quality | 6/10 — reduces handoff frequency, does NOT eliminate leakage |
| Token overhead | $0-0.001/request |
| Implementation complexity | LOW-MEDIUM |
| Reliability | 5/10 — misrouting worse than visible handoff |
| Scalability | Moderate — classifier needs updating as agents evolve |
| Risk | False confidence; handoffs still happen and still leak |

**Verdict:** Complementary measure, not a solution. Only reduces frequency.

### Approach E: Prompt Engineering (Strengthen Instructions)

Improve the existing handoff instructions in both agent system prompts.

| Criterion | Assessment |
|-----------|------------|
| Communication quality | 6-7/10 — estimated 60-80% reduction in leakage |
| Token overhead | $0 |
| Implementation complexity | TRIVIAL — prompt text changes only |
| Reliability | 6/10 — LLM compliance is probabilistic, not guaranteed |
| Scalability | Good — applies to any agent |
| Risk | Zero risk; cannot make things worse |

**Specific improvements identified:**
1. Move handoff constraint to top of prompt (before role description) for higher salience
2. Add explicit negative examples of wrong handoff behavior
3. Strengthen language: "NEVER write ANY text before calling handoff"

---

## Comparison Matrix

| Criterion | A: Orchestrator | B: Buffer | C: Tool-First | D: Pre-class | E: Prompt |
|-----------|:-:|:-:|:-:|:-:|:-:|
| **Solves problem completely** | Yes | Yes | Partial | No | Partial |
| **Solves mid-conversation** | No | Yes | No | No | Partial |
| **Token overhead** | $0.001-0.005 | $0 | $0.001-0.003 | $0-0.001 | $0 |
| **Implementation effort** | Days | Hours | Half-day | Half-day | Minutes |
| **Reliability** | 8/10 | 9/10 | 7/10 | 5/10 | 6/10 |
| **Risk** | High | Low | Medium | Medium | Zero |
| **Streaming UX preserved** | Yes | Mostly* | Yes | Yes | Yes |
| **Scales to N agents** | Excellent | Good | Good | Moderate | Good |

*With chunk-level buffering, latency impact is limited to the window before handoff detection (~1-2 seconds on handoff requests only).

---

## Recommendation: Two-Phase Implementation

### Phase 1: Prompt Engineering (Ship today, $0 cost)

Strengthen handoff instructions in both agent prompts:

**Changes to both `customerAgentPrompts.ts` and `productAgentPrompts.ts`:**

1. Add a "CRITICAL RULES" section immediately after "Your Role" (before "Capabilities"):
```
## Your Role
You are the Customer Management Agent...

## CRITICAL RULES
- When handing off, call the handoff tool IMMEDIATELY as your FIRST and ONLY action.
- NEVER write ANY text, explanation, or acknowledgment before calling handoff.
- The user must not know that multiple agents exist.

WRONG: "That's a great question! This falls under product strategy, let me transfer you." [calls handoff]
WRONG: "I can help you with that. However, this requires the Product Management Agent." [calls handoff]
CORRECT: [calls handoff immediately with no preceding text]
```

**Note:** The role section must come first (establishes identity context for all subsequent instructions), with the critical rules immediately after for high salience.

2. Remove the duplicate handoff instruction from the "Agent Handoff" section (keep the routing rules but remove the "call immediately" part since it's now covered above).

**Expected impact:** 60-80% reduction in handoff text leakage. Zero cost, zero risk.

### Phase 2: Chunk-Level Stream Buffering (Ship this week, $0 cost)

Modify the controller's stream consumption loop to buffer text-delta chunks and detect handoff early:

**Architecture:**
```
Stream chunks arrive →
  IF text-delta: accumulate in buffer
  IF tool-invocation with toolName='handoff': discard buffer, abort
  IF tool-output-available with __handoff: discard buffer, abort
  IF step-finish/finish-message: flush buffer to client
  IF stream ends: flush remaining buffer
```

**Key implementation details:**
- Buffer only `text-delta` chunks (tool invocations and other metadata pass through)
- Detect handoff at `tool-invocation` stage (before execution) for faster abort
- On non-handoff step completion, flush accumulated text to client
- ~30 lines of change in `customer-ai.controller.ts`

**Expected impact:** 100% elimination of handoff text leakage. Deterministic — no LLM behavior dependency.

**Latency impact:** For handoff requests (~5-10% of traffic), the user sees a brief pause (~1-2 seconds) followed by the correct agent's response. For non-handoff requests (90-95%), latency impact is negligible since text is flushed at step boundaries.

### Phase 3: Orchestrator Pattern (Future, when 4+ agents)

When adding a 3rd or 4th agent to the customer chat, consider migrating to an orchestrator pattern. The stream buffering approach remains valid as a safety net regardless.

---

## ROI Summary

| Metric | Phase 1 (Prompt) | Phase 2 (Buffer) | Combined |
|--------|:-:|:-:|:-:|
| **Communication quality improvement** | 60-80% | 100% | 100% |
| **API cost increase per request** | $0 | $0 | $0 |
| **Implementation time** | 30 minutes | 2-3 hours | 3-4 hours |
| **Scalability for future agents** | Good | Good | Good |
| **Risk** | Zero | Low | Low |

**Return:** Complete elimination of internal architecture leakage to users. Scales to N agents.
**Investment:** Zero additional API cost. ~3-4 hours of development.

---

## Peer Review Summary

Two independent AI agent architecture reviews were conducted. Key consensus:

1. **Stream buffering is the correct primary fix** — architecturally deterministic, zero cost
2. **Prompt improvements should ship first** — zero risk, immediate partial improvement
3. **Orchestrator is premature** for a 2-agent system — revisit at 4+ agents
4. **Use chunk-level buffering** (not step-level) to avoid AI SDK step boundary issues
5. **Detect handoff at `tool-invocation`** stage for faster abort

Key disagreement resolved: The first reviewer recommended step-level buffering; the peer reviewer correctly identified that step boundaries in `toUIMessageStream()` are not explicitly represented as chunk types, making chunk-level buffering more reliable. **Adopted the peer reviewer's approach.**

---

## Files Affected

| File | Change |
|------|--------|
| `backend/src/services/ai/agents/customer-mgmt/prompt/customerAgentPrompts.ts` | Add top-level handoff constraint |
| `backend/src/services/ai/agents/product-mgmt/prompt/productAgentPrompts.ts` | Add top-level handoff constraint |
| `backend/src/controllers/customer-ai.controller.ts` | Chunk-level stream buffering (lines 314-336) |

---

## Decision Log

| Decision | Rationale |
|----------|-----------|
| Rejected orchestrator (for now) | Over-engineered for 2-agent system; HIGH complexity |
| Rejected forced tool-first | Doesn't solve mid-conversation handoffs |
| Rejected pre-classifier as standalone | Reduces frequency but doesn't eliminate leakage |
| Selected prompt + buffer combo | Zero cost, low risk, 100% reliable, covers all handoff scenarios |
| Chunk-level over step-level buffer | More reliable with Vercel AI SDK v6 stream types |
