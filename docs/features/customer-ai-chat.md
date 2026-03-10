# Customer AI Chat

**Created:** 2026-02-25
**Last Updated:** 2026-03-09
**Version:** 2.5.0
**Status:** Complete

## Overview

Customer AI Chat provides two specialized AI agents accessible from the customer detail page via the AppShell split-view chat panel. Agents use **LLM-driven tool-based handoff** to transfer conversations between domains — each agent has a `handoff` tool that it calls when the user's request is outside its domain. The controller composes multiple agent streams into a single seamless HTTP response using `createUIMessageStream`. The system uses Vercel AI SDK v6 with streaming, tool calling, and structured response cards.

## Agents

### Customer Management Agent

**Purpose:** Engagement strategy, negotiation guidance, status management, communication drafting, account health assessment, stakeholder mapping.

**System prompt:** `backend/src/services/ai/agents/customer-mgmt/prompt/customerAgentPrompts.ts`

**Tools (5):**

| Tool | Description | Side Effects |
|------|-------------|--------------|
| `updateCustomerStatus` | Change customer status + auto-log event | Updates `customers.status`, inserts `customer_events` |
| `updateCustomerInfo` | Atomic JSONB merge via `merge_customer_info` RPC | Updates `customers.info` |
| `createEventLogEntry` | Log interaction to timeline | Inserts `customer_events` |
| `getCustomerSummary` | Re-fetch full customer context mid-conversation | Read-only |
| `analyzeMeetingNotes` | Analyze customer-facing meeting notes (relationship-focused) | Inserts `customer_documents` + `customer_events` |

### Product Management Agent

**Purpose:** Strategy creation, roadmap development, user research synthesis, competitive analysis, product specs, prioritization (RICE), success measurement (KPIs), ideation, launch planning.

**System prompt:** `backend/src/services/ai/agents/product-mgmt/prompt/productAgentPrompts.ts`

**Tools (27):**

| Tool | Description | Side Effects |
|------|-------------|--------------|
| `createInitiative` | Create initiative in `customer_initiatives` | Inserts `customer_initiatives` |
| `createDocument` | Create document with Markdown content + log event | Inserts `customer_documents` + `customer_events` |
| `updateDocument` | Update document content/title/status | Updates `customer_documents` |
| `listInitiatives` | List customer's initiatives | Read-only |
| `listDocuments` | List documents by initiative or customer | Read-only |
| `analyzeMeetingNotes` | Analyze product-focused meeting notes (product-focused) | Inserts `customer_documents` + `customer_events` |

## Clarification Gate

Both agents implement a **Clarification Gate** — a pre-action internal check that prevents agents from making unannounced assumptions. Before executing any action (creating an action item, drafting an email, creating an artifact), the agent:

1. Identifies the action type from its requirements matrix
2. Checks what info is available (user message + customer context)
3. Asks 1-2 targeted clarifying questions if critical info is missing (with options, not open-ended)
4. Proceeds immediately if all info is present or inferable from context

**Escape hatch:** If the user says "just do it" or similar, the agent proceeds with smart defaults and states its assumptions.

**Example:** User says "Set up a meeting with Acme" → Agent responds: "I see Acme is in the prospect stage with Aviel (CEO) on the team. Is this a discovery call or a follow-up? Should I plan for 30 minutes or more?" — instead of silently creating a 1-hour meeting with assumptions.

**Design document:** `docs/ideation/clarification-before-action/design.md`
**Agent reference:** [Customer Agents Reference](../ai-agents-and-prompts/customer-agents-reference.md#clarification-gate)

## Agent Handoff

**File:** `backend/src/services/ai/agents/shared/handoffTools.ts`

Each agent has a `handoff` tool. When the LLM determines the user's request requires the other agent's tools, it calls `handoff({ reason, summary, pendingRequest })`. The controller detects this in the stream and switches agents.

**How it works:**
1. Initial agent selected from last assistant message's `metadata.agentType` (default: `customer_mgmt`)
2. Controller wraps streaming in `createUIMessageStream({ execute({ writer }) })`
3. Iterates `result.toUIMessageStream()` chunks via `for await`, writing to `writer`
4. When `tool-output-available` with `__handoff: true` is detected: abort current agent, start other agent
5. New agent gets handoff context (reason, summary, pending request) injected into system prompt
6. Client receives a single seamless stream — handoff is invisible to the frontend

**Loop prevention:** MAX_HANDOFFS=2 per request. Handoff tool removed on final iteration.

**Step budget:** Dual-condition stop prevents runaway tool execution:
- Hard ceiling: `stepCountIs(8)` — never exceed 8 total steps
- Soft limit: stop after 4 steps containing tool calls — prevents duplicate artifact creation while allowing conversational steps

**Anti-duplication:** The Product Management Agent prompt explicitly instructs: never create a second artifact to improve/replace one just created in the same conversation — use `updateArtifact` instead.

**Initiative inference:** The Product Agent defaults to saving documents in the initiative mentioned in conversation context. It only asks the user which initiative if the context is ambiguous or no initiative is identifiable.

**Tool routing for market research:** `analyzeCompetition` handles competitive positioning only. General market research (TAM/SAM/SOM, industry opportunities, regulatory landscape) routes to `createArtifact (type: custom)`.

**Interaction logging:** Every agent action is logged to `agent_interaction_logs` table via fire-and-forget inserts with a unique `sessionId` per request. Logged events: `tool_call`, `agent_text`, `agent_finish`, `handoff`. Content truncated to 2000 chars.

**Previous approach (removed in v2.0.0):** Keyword-based router (`CustomerAgentRouter.ts`) using static keyword lists and sticky routing. Replaced because it couldn't handle nuanced intent or natural cross-domain conversation flow.

## Customer Context Builder

**File:** `backend/src/services/ai/agents/shared/customerContextBuilder.ts`

Builds a structured text block injected into the system prompt. Fetches in parallel:
- Customer record (name, status, company, role, info JSONB)
- Agreements (type, status, value, dates)
- Receivables (type, amount, status, dates)
- Projects with artifacts (name, status, type)
- Recent events (last 20, type, description, timestamp)

**Token budget:** ~3000 tokens with 3-round progressive truncation:
1. Truncate events to 10
2. Truncate projects to 5
3. Truncate agreement details

## Frontend Components

### CustomerChatPanel

**File:** `frontend/src/features/customers/components/chat/CustomerChatPanel.tsx`

Main chat panel rendered inside AppShell's `ChatPanelWrapper` when `screenContext.currentPage === 'customer'`. Uses `useCustomerStructuredChat` hook for tool result parsing.

**Features:**
- Markdown rendering via `markdownToHTML()` + `DOMPurify.sanitize()`
- Structured response cards for tool results
- Auto-scroll to bottom on new messages
- Suggestion chips in empty state
- Streaming indicator with animated dots
- Error display

### Structured Response Cards

| Card | Trigger | Color | Icon |
|------|---------|-------|------|
| `StatusChangeCard` | `updateCustomerStatus` tool result | Green | `ArrowRightLeft` |
| `ArtifactCreatedCard` | `createArtifact` tool result | Purple | `FileText` |
| `ProjectCreatedCard` | `createProject` tool result | Amber | `FolderPlus` |

### Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useCustomerChat` | `hooks/useCustomerChat.ts` | Opens chat panel with customer config via `chatLayoutStore` |
| `useCustomerStructuredChat` | `hooks/useCustomerStructuredChat.ts` | Wraps `useAIChat` with customer tool result parsing + query invalidation |

## Integration Points

### AppShell

`ChatPanelWrapper` in `frontend/src/components/layout/AppShell.tsx` detects customer context via `config.screenContext?.currentPage === 'customer'` and renders `CustomerChatPanel` instead of portfolio's `ChatPanel`.

### CustomerDetailPage

A "Chat" button (Sparkles icon) in the detail page header opens the chat panel via `useCustomerChat.openCustomerChat()`.

### chatLayoutStore Extensions

- `ScreenContext` changed to discriminated union: `{ currentPage: 'portfolio', ... } | { currentPage: 'customer', customerId, ... }`
- `ChatConfig` extended with `endpoint?: string` and `suggestions?: Array<{ text: string }>`

### useAIChat Extensions

- Added `endpoint` override (customer chat uses `/api/ai/customer/chat/stream`)
- Added `extraBody` for passing `customerId` to the backend
- Module-level `_extraBodyMap` pattern (avoids stale closures in AI SDK v6)

### Query Invalidation

When AI tools modify customer data, `onCustomerDataChanged` callback invalidates:
- `customerKeys.detail(customerId)` — refreshes customer detail
- `customerKeys.lists()` — refreshes customer list

## Data Flow

```
User types message in CustomerChatPanel
  → useCustomerStructuredChat.sendMessage()
    → useAIChat (with endpoint override + extraBody)
      → POST /api/ai/customer/chat/stream
        → customer-ai.controller.ts
          → buildCustomerContext(customerId)
          → selectInitialAgent(from conversation metadata)
          → createUIMessageStream({ execute({ writer }) })
            → Agent 1: streamText() → toUIMessageStream()
              → for await (chunk): writer.write(chunk)
              → if handoff detected: abort, switch to Agent 2
            → Agent 2 (if handoff): streamText() with handoff context
              → for await (chunk): writer.write(chunk)
          → pipeUIMessageStreamToResponse(res, stream)
        → Frontend parses tool results → renders cards
        → Invalidates React Query caches
```

## Meeting Notes Analysis

Both agents include an `analyzeMeetingNotes` tool for structured analysis of meeting notes. Each agent has its own variant with agent-specific analysis flavoring:

**Customer Management Agent** — relationship-focused analysis:
- Relationship signals and engagement health indicators
- Financial/agreement impact (pricing, scope, renewals)
- Stakeholder dynamics and decision-maker identification
- Status change triggers
- Meeting types: status, discovery, pricing, kickoff, introduction, account_review, demo

**Product Management Agent** — product-focused analysis:
- Product implications (features, bugs, requirements)
- Technical decisions (architecture, build-vs-buy, tech debt)
- User/market signals and roadmap impact
- Design/UX feedback
- Meeting types: sprint_planning, roadmap_review, design_review, user_interview, retrospective

**Routing:** When a user provides meeting notes, the active agent assesses the topic. If the notes are primarily about the other agent's domain, it hands off via the `handoff` tool before analysis.

**Output:** Analysis is saved as a `customer_documents` entry with `type: 'meeting_notes'` and metadata containing `meetingType`, `agentSource`, `attendees`, `meetingDate`, and `actionItemsSummary`.

**Follow-up actions** (always offered after analysis):
1. Draft a follow-up email (inline in chat)
2. Create tracked action items (CM agent uses `createActionItem` directly; PM agent handoffs to CM agent)

**Shared schema:** `backend/src/services/ai/agents/shared/meetingNotesSchema.ts` — Zod schema with 13-value `meetingType` enum and regex-validated `meetingDate` (YYYY-MM-DD).

## Analytical Integrity

Both agents enforce an **Analytical Integrity** directive at two levels: system prompts and tool descriptions. This prevents agents from exaggerating, inflating, or "pleasing" the user with overstated conclusions. Agents must state facts proportionally to evidence, acknowledge data gaps explicitly, and omit sections that lack sufficient evidence. All 18 content-generation tools include anti-exaggeration guidelines. See [customer-agents-reference.md](../ai-agents-and-prompts/customer-agents-reference.md) for full details.

## Known Limitations

- No agent indicator badge in chat header yet (AgentIndicator component exists but is not wired into the panel header)
- Chat history does not persist across page navigation (AppShell closes chat on route change)
- No test files for the handoff tools or context builder (planned follow-up)
- Agent may emit brief text before deciding to hand off (prompt instructs "handoff first", but not guaranteed)

## Key Files

| Component | File |
|-----------|------|
| Context Builder | `backend/src/services/ai/agents/shared/customerContextBuilder.ts` |
| Customer Agent Prompt | `backend/src/services/ai/agents/customer-mgmt/prompt/customerAgentPrompts.ts` |
| Product Agent Prompt | `backend/src/services/ai/agents/product-mgmt/prompt/productAgentPrompts.ts` |
| Handoff Tools | `backend/src/services/ai/agents/shared/handoffTools.ts` |
| Customer Mgmt Tools | `backend/src/services/ai/agents/customer-mgmt/tools/customerMgmtTools.ts` |
| Product Mgmt Tools | `backend/src/services/ai/agents/product-mgmt/tools/productMgmtTools.ts` |
| Controller | `backend/src/controllers/customer-ai.controller.ts` |
| Route | `backend/src/routes/customer-ai.ts` |
| CustomerChatPanel | `frontend/src/features/customers/components/chat/CustomerChatPanel.tsx` |
| useCustomerChat | `frontend/src/features/customers/hooks/useCustomerChat.ts` |
| useCustomerStructuredChat | `frontend/src/features/customers/hooks/useCustomerStructuredChat.ts` |

## Related Documentation

- [Customer Management](./customer-management.md) - CRM feature (Phases 1-3)
- [Customer AI Endpoints](../api/customer-ai-endpoints.md) - API reference
- [Customer Agents Reference](../ai-agents-and-prompts/customer-agents-reference.md) - Agent + tool details
- [Database Schema](../Architecture/database/database-schema-reference.md) - `merge_customer_info` function
- [Customer Pages](../screens/customer-pages.md) - Screen components
