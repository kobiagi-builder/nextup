# Design: Analytical Integrity — Anti-Exaggeration Directive

## Problem

Agent outputs exaggerate and over-interpret user input to appear impressive. Example: user said they used a tool "one time" but the agent wrote "extensive use validates core value proposition." This happens because:

1. Tool descriptions encourage maximalist extraction without proportionality
2. "Don't fabricate" is present but "don't exaggerate" is absent
3. System prompts say "professional and presentation-ready" which pushes toward polished/optimistic framing
4. No instruction to acknowledge data gaps

## Solution: Two-Layer Directive

### Layer 1 — System Prompts (2 files)

Add "Analytical Integrity" section after "Your Role" in both system prompts. Full block with rules and examples. Positioned early for maximum LLM attention.

**Files:**
- `backend/src/services/ai/agents/customer-mgmt/prompt/customerAgentPrompts.ts`
- `backend/src/services/ai/agents/product-mgmt/prompt/productAgentPrompts.ts`

### Layer 2 — Tool Guidelines (17 tool files)

Append 3 lines to every tool's existing `## Guidelines` section. Brief reinforcement at the point where content is actually written.

**PM tool files (16):**
- analyzeCompetitionTool.ts
- analyzeProductDataTool.ts
- analyzeMeetingNotesTool.ts
- applyDecisionFrameworkTool.ts
- assessShipReadinessTool.ts
- buildPersonaIcpTool.ts
- createGrowthStrategyTool.ts
- createLaunchPlanTool.ts
- createNarrativeTool.ts
- createProductStrategyTool.ts
- designAiFeatureTool.ts
- designUserFlowTool.ts
- designUxUiTool.ts
- evaluateBuildStrategyTool.ts
- planUserResearchTool.ts
- prioritizeItemsTool.ts
- scopeMvpTool.ts

**CM tool files (1):**
- analyzeMeetingNotesTool.ts

### System Prompt Block

```
## Analytical Integrity — CRITICAL

Your value comes from being honest and proportional, never from being impressive or pleasing.

- State facts exactly as they are. "Used once" means once — not "extensively." "Mentioned briefly" stays brief — don't expand it into a theme.
- Scale conclusions to the evidence. One data point is an observation, not a trend. A single mention is not a pattern.
- Never inflate, exaggerate, or add optimistic spin to make findings sound more significant than they are.
- When evidence is thin or missing, say so directly: "Not enough data to assess" or "Only mentioned in passing." Do not fill gaps with speculation or flattery.
- Be direct and straight. Blunt honesty is more valuable than diplomatic softening.
- Never use "validates," "demonstrates strong," "highlights the importance of," or similar amplifying language unless the evidence genuinely supports that level of confidence.
- Omit sections or topics that lack sufficient evidence. A shorter, accurate analysis beats a longer, padded one.
- If something is unclear from the available information, flag it as needing clarification rather than interpreting charitably.
```

### Tool Guidelines Append (3 lines)

```
- Never exaggerate, inflate, or add optimistic spin. State facts proportionally to the evidence.
- When evidence is thin or missing, say so explicitly. Do not fill gaps with flattery or speculation.
- Prefer shorter, accurate output over longer, padded output. Omit sections that lack sufficient evidence.
```

## Total Changes

- 2 system prompt files (add ~10-line block each)
- 17 tool files (append 3 lines to existing Guidelines each)
- 19 files total
