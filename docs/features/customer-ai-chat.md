# Customer AI Chat

**Created:** 2026-02-25
**Last Updated:** 2026-02-26
**Version:** 2.0.0
**Status:** Complete

## Overview

Customer AI Chat provides two specialized AI agents accessible from the customer detail page via the AppShell split-view chat panel. Agents use **LLM-driven tool-based handoff** to transfer conversations between domains — each agent has a `handoff` tool that it calls when the user's request is outside its domain. The controller composes multiple agent streams into a single seamless HTTP response using `createUIMessageStream`. The system uses Vercel AI SDK v6 with streaming, tool calling, and structured response cards.

## Agents

### Customer Management Agent

**Purpose:** Engagement strategy, negotiation guidance, status management, communication drafting, account health assessment, stakeholder mapping.

**System prompt:** `backend/src/services/ai/agents/customer-mgmt/prompt/customerAgentPrompts.ts`

**Tools (4):**

| Tool | Description | Side Effects |
|------|-------------|--------------|
| `updateCustomerStatus` | Change customer status + auto-log event | Updates `customers.status`, inserts `customer_events` |
| `updateCustomerInfo` | Atomic JSONB merge via `merge_customer_info` RPC | Updates `customers.info` |
| `createEventLogEntry` | Log interaction to timeline | Inserts `customer_events` |
| `getCustomerSummary` | Re-fetch full customer context mid-conversation | Read-only |

### Product Management Agent

**Purpose:** Strategy creation, roadmap development, user research synthesis, competitive analysis, product specs, prioritization (RICE), success measurement (KPIs), ideation, launch planning.

**System prompt:** `backend/src/services/ai/agents/product-mgmt/prompt/productAgentPrompts.ts`

**Tools (25):**

| Tool | Description | Side Effects |
|------|-------------|--------------|
| `createProject` | Create project in `customer_projects` | Inserts `customer_projects` |
| `createArtifact` | Create artifact with Markdown content + log event | Inserts `customer_artifacts` + `customer_events` |
| `updateArtifact` | Update artifact content/title/status | Updates `customer_artifacts` |
| `listProjects` | List customer's projects | Read-only |
| `listArtifacts` | List artifacts by project or customer | Read-only |

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
