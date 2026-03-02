# Customer AI Chat Endpoints

**Created:** 2026-02-25
**Last Updated:** 2026-02-26
**Version:** 2.0.0
**Status:** Complete

## Overview

Customer AI Chat provides a single streaming endpoint for dual-agent chat with LLM-driven tool-based handoff. The endpoint accepts customer-scoped messages and returns a composed stream that can contain output from multiple sequential agent invocations. Agents transfer conversations via a `handoff` tool — the controller detects it mid-stream, switches agents, and continues writing to the same response. The frontend receives a single seamless stream.

## Endpoints

### POST /api/ai/customer/chat/stream

Stream a customer AI chat response with LLM-driven agent handoff.

**Authentication:** Required (Bearer token via `requireAuth` middleware)

**Route mount:** `backend/src/routes/index.ts` → `/ai/customer/chat` → `customer-ai.ts` → `POST /stream`

**Full path:** `POST /api/ai/customer/chat/stream`

#### Request

**Headers:**
```
Authorization: Bearer <supabase_access_token>
Content-Type: application/json
```

**Body:**
```typescript
{
  messages: Array<{
    role: 'user' | 'assistant'
    content?: string
    parts?: Array<{ type: string; text?: string }>
    metadata?: {
      agentType?: 'customer_mgmt' | 'product_mgmt'
    }
  }>
  customerId: string  // UUID of the customer
  screenContext?: {
    currentPage: string
    activeTab?: string
  }
}
```

**Validation (Zod):**
```typescript
const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().optional(),
  parts: z.array(z.any()).optional(),
  metadata: z.object({
    agentType: z.enum(['customer_mgmt', 'product_mgmt']).optional(),
  }).optional(),
}).refine(
  (data) => data.content !== undefined || data.parts !== undefined,
  { message: 'Message must have either content or parts' }
)

const customerChatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1),
  customerId: z.string().uuid(),
  screenContext: z.object({
    currentPage: z.string(),
    activeTab: z.string().optional(),
  }).optional(),
})
```

#### Response

**Content-Type:** `text/event-stream` (Server-Sent Events via Vercel AI SDK v6)

**Stream format:** Vercel AI SDK UIMessageStream protocol. Includes:
- Text deltas (streamed token by token)
- Tool call results (structured JSON objects)
- Finish reason

**Tool result shapes in stream:**

```typescript
// updateCustomerStatus
{ oldStatus: string, newStatus: string, reason: string }

// createArtifact
{ title: string, artifactType: string, projectName?: string }

// createProject
{ projectName: string }

// createEventLogEntry
{ eventType: string, description: string }

// updateCustomerInfo, getCustomerSummary, listProjects, listArtifacts, updateArtifact
// Standard tool result objects
```

#### Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | Validation Error | Invalid request body (missing customerId, empty messages) |
| 401 | Unauthorized | Missing or invalid Bearer token |
| 500 | Internal Error | AI service failure, database error |

#### Processing Flow

1. Validate request body with Zod
2. Get per-request Supabase client from AsyncLocalStorage
3. Convert messages to simple format (extract text from `content` or `parts`)
4. Build customer context via `buildCustomerContext(customerId, supabase)` (~3000 tokens)
5. Select initial agent from last assistant message's `metadata.agentType` (default: `customer_mgmt`)
6. Create composed stream via `createUIMessageStream({ execute({ writer }) })`:
   - Build system prompt + domain tools + handoff tool for current agent
   - Call `streamText()` directly (not via AIService) with `anthropic('claude-sonnet-4-20250514')`
   - Iterate `result.toUIMessageStream()` chunks via `for await`
   - Forward non-handoff chunks to client via `writer.write(chunk)`
   - If `tool-output-available` with `__handoff: true` detected: abort current agent, switch to other agent
   - New agent gets handoff context (reason, summary, pending request) injected into system prompt
   - Loop continues until agent completes normally or MAX_HANDOFFS (2) reached
7. Pipe composed stream to response via `pipeUIMessageStreamToResponse({ response: res, stream })`

#### Example

**Request:**
```bash
curl -X POST https://api.example.com/api/ai/customer/chat/stream \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      { "role": "user", "content": "Change this customer status to active" }
    ],
    "customerId": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

**TypeScript:**
```typescript
const response = await fetch(`${VITE_API_URL}/api/ai/customer/chat/stream`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    messages: [{ role: 'user', content: 'What is the engagement status?' }],
    customerId: '550e8400-e29b-41d4-a716-446655440000',
  }),
})
```

## Agent Handoff

The endpoint uses LLM-driven tool-based handoff. Each agent has a `handoff` tool — when it determines the user's request is outside its domain, it calls the tool with structured context. The controller detects this in the stream and switches agents.

**Initial agent selection:** Uses the last assistant message's `metadata.agentType` from conversation history. Defaults to `customer_mgmt` for new conversations.

**Handoff flow:**
1. Agent calls `handoff({ reason, summary, pendingRequest })`
2. Controller detects `tool-output-available` with `__handoff: true` in the stream
3. Current agent aborted via `AbortController`
4. Other agent started with handoff context injected into system prompt
5. Client receives single seamless stream — handoff is invisible to frontend

**Loop prevention:**

| Layer | Mechanism |
|-------|-----------|
| Hard limit | MAX_HANDOFFS = 2 per request |
| Tool removal | Handoff tool excluded on final iteration |
| Prompt warning | Ping-pong detection via `previousAgent` parameter |

## Security

- **Authentication:** `requireAuth` middleware validates Bearer token
- **Authorization:** Per-request Supabase client enforces RLS on all database operations
- **Tool safety:** All tools use the authenticated Supabase client, not the service role key
- **PII logging:** Controller logs context size, not content: `[Customer AI] Context built: ${chars} chars`

## Key Files

| Component | File |
|-----------|------|
| Controller | `backend/src/controllers/customer-ai.controller.ts` |
| Route | `backend/src/routes/customer-ai.ts` |
| Route mount | `backend/src/routes/index.ts` |
| Handoff Tools | `backend/src/services/ai/agents/shared/handoffTools.ts` |
| Customer Context Builder | `backend/src/services/ai/agents/shared/customerContextBuilder.ts` |

## Related Documentation

- [Customer AI Chat Feature](../features/customer-ai-chat.md) - Full feature documentation
- [Customer Agents Reference](../ai-agents-and-prompts/customer-agents-reference.md) - Agent + tool schemas + handoff mechanism
- [Content Agent Endpoints](./content-agent-endpoints.md) - Portfolio AI chat endpoint (similar pattern)
- [Authentication](./authentication-and-security.md) - Auth middleware
- [Database Schema](../Architecture/database/database-schema-reference.md) - `merge_customer_info` function
