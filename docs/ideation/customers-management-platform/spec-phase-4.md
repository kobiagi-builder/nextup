# Implementation Spec: Customers Management Platform - Phase 4

**PRD**: ./prd-phase-4.md
**UX/UI**: ./ux-ui-spec.md (Section 7)
**Estimated Effort**: XL

## Technical Approach

Phase 4 introduces two AI agents - Customer Management Agent and Product Management Agent - integrated through a single chat panel per customer with automatic intent-based routing. This phase reuses the existing AI infrastructure (AIService, Vercel AI SDK v6 streaming, ChatPanel, chatStore) and extends it with customer-specific system prompts, tools, and routing logic.

The approach follows the Content Agent pattern exactly: backend builds system prompts dynamically from customer context, defines tools with Vercel AI SDK's `tool()` function, and streams responses. Frontend uses the same `useAIChat` → `useStructuredChat` → `ChatPanel` stack with a customer-specific endpoint and context key.

The key technical additions are:
1. **Intent router**: A lightweight classifier that determines which agent handles each message
2. **Customer context builder**: Assembles the full customer profile into a system prompt section
3. **Agent tool definitions**: Read/write tools for customer data (status updates, info changes, project creation, artifact generation)
4. **Structured response cards**: Customer-specific action cards (status change, artifact created, recommendation)

## File Changes

### New Files

| File Path | Purpose |
|-----------|---------|
| **Backend - AI** | |
| `backend/src/services/ai/prompts/customerAgentPrompts.ts` | System prompts for Customer Mgmt Agent |
| `backend/src/services/ai/prompts/productAgentPrompts.ts` | System prompts for Product Mgmt Agent |
| `backend/src/services/ai/prompts/customerContextBuilder.ts` | Builds customer context for system prompt |
| `backend/src/services/ai/tools/customerMgmtTools.ts` | Customer Mgmt Agent tool definitions |
| `backend/src/services/ai/tools/productMgmtTools.ts` | Product Mgmt Agent tool definitions |
| `backend/src/services/ai/CustomerAgentRouter.ts` | Intent classification + agent routing |
| `backend/src/controllers/customer-ai.controller.ts` | Customer chat streaming handler |
| `backend/src/routes/customer-ai.ts` | Customer AI route |
| **Frontend** | |
| `frontend/src/features/customers/hooks/useCustomerChat.ts` | Customer-specific chat hook |
| `frontend/src/features/customers/components/chat/CustomerChatPanel.tsx` | Customer chat panel wrapper |
| `frontend/src/features/customers/components/chat/AgentIndicator.tsx` | Shows active agent badge |
| `frontend/src/features/customers/components/chat/StatusChangeCard.tsx` | Structured card for status changes |
| `frontend/src/features/customers/components/chat/ArtifactCreatedCard.tsx` | Structured card for artifact creation |
| `frontend/src/features/customers/components/chat/RecommendationCard.tsx` | Structured card for recommendations |
| `frontend/src/features/customers/components/chat/index.ts` | Barrel export |

### Modified Files

| File Path | Changes |
|-----------|---------|
| `backend/src/routes/index.ts` | Mount customer-ai routes |
| `frontend/src/features/customers/pages/CustomerDetailPage.tsx` | Add "Chat" button that opens chat panel via chatLayoutStore |
| `frontend/src/features/customers/components/index.ts` | Export new chat components |
| `frontend/src/features/customers/hooks/index.ts` | Export useCustomerChat |
| `frontend/src/stores/chatLayoutStore.ts` | **CRITICAL**: Add `endpoint?: string` to `ChatConfig` interface. Extend `ScreenContext` as discriminated union with customer variant (add `customerId`, `customerName`, `customerStatus`, `activeTab`). |
| `frontend/src/features/portfolio/hooks/useAIChat.ts` | **CRITICAL**: Accept optional `endpoint` override. Rebuild transport when endpoint changes. Scope tool-result processing by `contextKey` to prevent cross-context interference. |

## Implementation Details

### Intent Router (Agent Selection)

**Pattern to follow**: Lightweight classification, not a separate LLM call

```typescript
// backend/src/services/ai/CustomerAgentRouter.ts

const PRODUCT_MGMT_KEYWORDS = [
  'strategy', 'roadmap', 'research', 'product spec', 'prd',
  'competitive analysis', 'user research', 'personas', 'icp',
  'prioritization', 'rice', 'feature', 'backlog', 'sprint',
  'metrics', 'kpi', 'okr', 'success measurement',
  'ideation', 'brainstorm', 'launch', 'gtm', 'go-to-market',
  'artifact', 'deliverable', 'document', 'create a',
];

const CUSTOMER_MGMT_KEYWORDS = [
  'engagement', 'relationship', 'negotiation', 'pricing',
  'status', 'follow-up', 'follow up', 'email', 'meeting',
  'agreement', 'invoice', 'payment', 'receivable', 'balance',
  'stakeholder', 'team', 'communication', 'health',
  'renewal', 'expansion', 'churn', 'retention',
  'update status', 'change status', 'proposal',
];

export type AgentType = 'customer_mgmt' | 'product_mgmt';

export function routeToAgent(message: string, conversationHistory: Message[]): AgentType {
  const lowerMessage = message.toLowerCase();

  // Check for explicit @mentions (word boundary to avoid false positives like "@pm sarah")
  const mentionMatch = lowerMessage.match(/^@(product|pm|customer|cm)\b/);
  if (mentionMatch) {
    return ['product', 'pm'].includes(mentionMatch[1]) ? 'product_mgmt' : 'customer_mgmt';
  }

  // Also support @mention anywhere in message (not just start)
  if (/\b@(product|pm)\b/.test(lowerMessage)) return 'product_mgmt';
  if (/\b@(customer|cm)\b/.test(lowerMessage)) return 'customer_mgmt';

  // Score keywords on current message
  const productScore = PRODUCT_MGMT_KEYWORDS.filter(k => lowerMessage.includes(k)).length;
  const customerScore = CUSTOMER_MGMT_KEYWORDS.filter(k => lowerMessage.includes(k)).length;

  // Check conversation history for agent stickiness (last 3 assistant messages)
  // If the previous agent was consistent, require a stronger signal to switch
  const recentAgents = conversationHistory
    .filter(m => m.role === 'assistant')
    .slice(-3)
    .map(m => m.metadata?.agentType as AgentType | undefined)
    .filter(Boolean);

  const lastAgent = recentAgents[recentAgents.length - 1];
  const isSticky = recentAgents.length >= 2 && recentAgents.every(a => a === lastAgent);

  // If agent is "sticky" (same agent for last 2+ messages), require 2+ keyword advantage to switch
  if (isSticky && lastAgent) {
    const scoreDiff = lastAgent === 'product_mgmt'
      ? customerScore - productScore
      : productScore - customerScore;
    if (scoreDiff < 2) return lastAgent;
  }

  // Route based on score, default to customer_mgmt for ambiguous
  if (productScore > customerScore) return 'product_mgmt';
  return 'customer_mgmt';
}
```

**Key decisions**:
- Keyword-based routing is fast (< 1ms) and deterministic
- No additional LLM call for routing (saves latency and cost)
- @mention override for explicit agent selection
- Default to Customer Mgmt for ambiguous messages
- Can be upgraded to LLM-based classification later if needed

### Customer Context Builder

```typescript
// backend/src/services/ai/prompts/customerContextBuilder.ts

// Rough token estimation: ~4 chars per token
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export async function buildCustomerContext(
  customerId: string,
  supabase: SupabaseClient,
  tokenBudget: number = 3000
): Promise<string> {
  // Fetch all customer data in parallel
  const [customer, agreements, receivablesSummary, projects, recentEvents] = await Promise.all([
    supabase.from('customers').select('*').eq('id', customerId).single(),
    supabase.from('customer_agreements').select('*').eq('customer_id', customerId),
    supabase.from('customer_receivables').select('type, amount, status').eq('customer_id', customerId),
    supabase.from('customer_projects').select('id, name, status, agreement_id')
      .eq('customer_id', customerId),
    supabase.from('customer_events').select('*').eq('customer_id', customerId)
      .order('event_date', { ascending: false }).limit(10),
  ]);

  // Build context string
  return `
## Current Customer Context

**Customer**: ${customer.data.name}
**Status**: ${customer.data.status}
**Vertical**: ${customer.data.info?.vertical || 'Not specified'}
**Persona**: ${customer.data.info?.persona || 'Not specified'}
**ICP**: ${customer.data.info?.icp || 'Not specified'}

**About**: ${customer.data.info?.about || 'No description'}

**Product**: ${customer.data.info?.product || 'No product details'}

**Team**:
${(customer.data.info?.team || []).map(t =>
  `- ${t.name} (${t.role || 'No role'}) - ${t.notes || ''}`
).join('\n') || '- No team members listed'}

**Agreements** (${agreements.data?.length || 0}):
${(agreements.data || []).map(a =>
  `- ${a.scope} | ${a.type} | ${a.start_date || '?'} → ${a.end_date || 'Ongoing'} | ${JSON.stringify(a.pricing)}`
).join('\n') || '- No agreements'}

**Financial Summary**:
- Total Invoiced: $${totalInvoiced}
- Total Paid: $${totalPaid}
- Outstanding: $${balance}

**Active Projects** (${projects.data?.length || 0}):
${(projects.data || []).map(p =>
  `- ${p.name} (${p.status})`
).join('\n') || '- No projects'}

**Recent Events**:
${(recentEvents.data || []).map(e =>
  `- [${e.event_date}] ${e.event_type}: ${e.title}`
).join('\n') || '- No recent events'}
  `.trim();

  // Enforce token budget with priority-based truncation
  let context = rawContext;
  if (estimateTokens(context) > tokenBudget) {
    // Truncate events first (lowest priority), then projects, then agreement details
    const truncatedEvents = recentEvents.data?.slice(0, 3) || [];
    const truncatedProjects = projects.data?.slice(0, 5) || [];
    // Rebuild with truncated data...
    // (Implementation should rebuild context string with reduced data)
  }

  return context;
}
```

### Customer Management Agent System Prompt

```typescript
// backend/src/services/ai/prompts/customerAgentPrompts.ts

export function getCustomerMgmtSystemPrompt(customerContext: string): string {
  return `
You are the Customer Management Agent for NextUp, an AI assistant that helps advisors manage client relationships.

## Your Role
You assist with customer engagement, negotiation guidance, pricing recommendations, status management, and relationship health assessment. You have full access to the customer's data including their profile, agreements, financials, projects, and interaction history.

## Capabilities
- **Engagement Strategy**: Recommend next steps, follow-up timing, and engagement approaches
- **Negotiation Guidance**: Advise on pricing, scope, and deal structure based on agreement history
- **Status Management**: Recommend and execute status transitions with context
- **Communication Drafting**: Help draft emails, meeting agendas, and follow-up notes
- **Account Health**: Assess relationship health based on financial status, agreement renewals, and activity
- **Stakeholder Mapping**: Help understand team dynamics and decision-maker identification

## Guidelines
- Always reference the customer's actual data in your responses
- Be specific and actionable, not generic
- When recommending status changes, explain why
- When discussing pricing, reference existing agreement history
- Flag potential risks (overdue invoices, expiring agreements, inactive customers)
- Keep responses concise but thorough

${customerContext}
  `.trim();
}
```

### Product Management Agent System Prompt

```typescript
// backend/src/services/ai/prompts/productAgentPrompts.ts

export function getProductMgmtSystemPrompt(customerContext: string): string {
  return `
You are the Product Management Agent for NextUp, an AI assistant that helps advisors with product management workflows for their customers.

## Your Role
You assist with strategy creation, roadmap development, user research synthesis, competitive analysis, product spec writing, prioritization frameworks, success measurement, ideation facilitation, and launch planning. You generate artifacts (documents) within customer projects.

## Capabilities
- **Strategy Creation**: Product strategy, go-to-market strategy, positioning (Playing to Win, April Dunford)
- **Roadmap Development**: Feature prioritization, timeline planning, milestone definition
- **User Research**: Interview guides, persona development, JTBD analysis, thematic synthesis
- **Competitive Analysis**: Competitor mapping, feature comparison, positioning gaps
- **Product Specs**: PRDs, feature specs, technical requirements
- **Prioritization**: RICE scoring, opportunity sizing, impact mapping
- **Success Measurement**: KPI definition, metric frameworks (AARRR), dashboard recommendations
- **Ideation**: Brainstorming, idea evaluation, opportunity assessment
- **Launch Planning**: Launch checklists, GTM strategy, rollout plans

## Guidelines
- When creating deliverables, use the createArtifact tool to save them as project artifacts
- Ask which project to save artifacts to, or create a new project if needed
- Reference the customer's product details, ICP, and competitive context
- Use established frameworks (RICE, JTBD, Playing to Win, etc.) where appropriate
- Structure deliverables with clear headings, actionable recommendations, and data-driven reasoning
- Keep artifacts professional and presentation-ready

${customerContext}
  `.trim();
}
```

### Customer Management Agent Tools

```typescript
// backend/src/services/ai/tools/customerMgmtTools.ts
import { tool } from 'ai';
import { z } from 'zod';

// Tool factory: accepts injected supabase client for testability
// Controller calls: createCustomerMgmtTools(getSupabase())
export function createCustomerMgmtTools(supabase: SupabaseClient) {
  return {
  updateCustomerStatus: tool({
    description: 'Update the customer status (lead, prospect, negotiation, live, on_hold, archive)',
    parameters: z.object({
      customerId: z.string().uuid(),
      newStatus: z.enum(['lead', 'prospect', 'negotiation', 'live', 'on_hold', 'archive']),
      reason: z.string().describe('Brief explanation for the status change'),
    }),
    execute: async ({ customerId, newStatus, reason }) => {
      const { error } = await supabase
        .from('customers')
        .update({ status: newStatus })
        .eq('id', customerId);
      if (error) throw error;

      // Log event
      await supabase.from('customer_events').insert({
        customer_id: customerId,
        event_type: 'status_change',
        title: `Status changed to ${newStatus}`,
        description: reason,
      });

      return { success: true, newStatus, reason };
    },
  }),

  updateCustomerInfo: tool({
    description: 'Update customer information fields (about, vertical, persona, icp, product)',
    parameters: z.object({
      customerId: z.string().uuid(),
      updates: z.record(z.unknown()).describe('Key-value pairs of info fields to update'),
    }),
    execute: async ({ customerId, updates }) => {
      // Atomic JSONB merge — no read-modify-write race condition
      const { data, error } = await supabase.rpc('merge_customer_info', {
        cid: customerId,
        new_info: updates,
      });
      // RPC function: UPDATE customers SET info = info || $2 WHERE id = $1 AND user_id = auth.uid()
      // Verify at least one row was updated (ownership check)
      if (error) throw error;
      if (!data || data === 0) throw new Error('Customer not found or not authorized');
      return { success: true, updatedFields: Object.keys(updates) };
    },
  }),

  createEventLogEntry: tool({
    description: 'Log a customer interaction event (meeting, call, decision, delivery, feedback)',
    parameters: z.object({
      customerId: z.string().uuid(),
      eventType: z.enum(['meeting', 'call', 'workshop', 'decision', 'delivery', 'feedback', 'escalation', 'win', 'update', 'analysis', 'planning']),
      title: z.string(),
      description: z.string().optional(),
      participants: z.array(z.string()).optional(),
      eventDate: z.string().datetime().optional().describe('ISO date for when the event occurred. Defaults to now if not provided.'),
    }),
    execute: async ({ customerId, eventType, title, description, participants, eventDate }) => {
      const { data, error } = await supabase
        .from('customer_events')
        .insert({
          customer_id: customerId,
          event_type: eventType,
          title,
          description,
          participants,
          ...(eventDate ? { event_date: eventDate } : {}),
        })
        .select()
        .single();
      if (error) throw error;
      return { success: true, eventId: data.id };
    },
  }),

  getCustomerSummary: tool({
    description: 'Get complete customer context including info, agreements, receivables, and projects',
    parameters: z.object({ customerId: z.string().uuid() }),
    execute: async ({ customerId }) => {
      // Re-fetch full context (agent might need updated data mid-conversation)
      const context = await buildCustomerContext(customerId, supabase);
      return { context };
    },
  }),
  };  // end of return
}  // end of createCustomerMgmtTools
```

### Product Management Agent Tools

```typescript
// backend/src/services/ai/tools/productMgmtTools.ts

// Tool factory: accepts injected supabase client for testability
export function createProductMgmtTools(supabase: SupabaseClient) {
  return {
  createProject: tool({
    description: 'Create a new product workflow project for the customer',
    parameters: z.object({
      customerId: z.string().uuid(),
      name: z.string(),
      description: z.string().optional(),
      agreementId: z.string().uuid().optional(),
    }),
    execute: async ({ customerId, name, description, agreementId }) => {
      const { data, error } = await supabase
        .from('customer_projects')
        .insert({
          customer_id: customerId,
          name,
          description,
          agreement_id: agreementId || null,
          status: 'active',
        })
        .select()
        .single();
      if (error) throw error;
      return { success: true, projectId: data.id, projectName: name };
    },
  }),

  createArtifact: tool({
    description: 'Create a new artifact (strategy, research, roadmap, etc.) within a project',
    parameters: z.object({
      projectId: z.string().uuid(),
      customerId: z.string().uuid(),
      type: z.enum(['strategy', 'research', 'roadmap', 'competitive_analysis', 'user_research', 'product_spec', 'meeting_notes', 'presentation', 'ideation', 'custom']),
      title: z.string(),
      content: z.string().describe('The full artifact content in Markdown format (TipTap editor will convert on load)'),
    }),
    execute: async ({ projectId, customerId, type, title, content }) => {
      const { data, error } = await supabase
        .from('customer_artifacts')
        .insert({
          project_id: projectId,
          customer_id: customerId,
          type, title, content,
          status: 'draft',
        })
        .select()
        .single();
      if (error) throw error;

      // Log event
      await supabase.from('customer_events').insert({
        customer_id: customerId,
        event_type: 'delivery',
        title: `Created artifact: ${title}`,
        description: `Type: ${type}, Project: ${projectId}`,
      });

      return { success: true, artifactId: data.id, title, type };
    },
  }),

  updateArtifact: tool({
    description: 'Update an existing artifact content or metadata',
    parameters: z.object({
      artifactId: z.string().uuid(),
      content: z.string().optional(),
      title: z.string().optional(),
      status: z.enum(['draft', 'in_progress', 'review', 'final', 'archived']).optional(),
    }),
    execute: async ({ artifactId, content, title, status }) => {
      const updates: Record<string, unknown> = {};
      if (content !== undefined) updates.content = content;
      if (title !== undefined) updates.title = title;
      if (status !== undefined) updates.status = status;

      const { error } = await supabase
        .from('customer_artifacts')
        .update(updates)
        .eq('id', artifactId);
      if (error) throw error;
      return { success: true, artifactId };
    },
  }),

  listProjects: tool({
    description: 'List all projects for a customer',
    parameters: z.object({ customerId: z.string().uuid() }),
    execute: async ({ customerId }) => {
      const { data, error } = await supabase
        .from('customer_projects')
        .select('id, name, status, description')
        .eq('customer_id', customerId)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return { projects: data };
    },
  }),

  listArtifacts: tool({
    description: 'List artifacts in a project or all artifacts for a customer',
    parameters: z.object({
      customerId: z.string().uuid(),
      projectId: z.string().uuid().optional(),
    }),
    execute: async ({ customerId, projectId }) => {
      let query = supabase
        .from('customer_artifacts')
        .select('id, title, type, status, project_id, updated_at')
        .eq('customer_id', customerId);
      if (projectId) query = query.eq('project_id', projectId);
      const { data, error } = await query.order('updated_at', { ascending: false });
      if (error) throw error;
      return { artifacts: data };
    },
  }),
  };  // end of return
}  // end of createProductMgmtTools
```

### Customer Chat Endpoint

```typescript
// backend/src/controllers/customer-ai.controller.ts

export async function streamCustomerChat(req: Request, res: Response) {
  const schema = z.object({
    messages: z.array(z.any()),
    customerId: z.string().uuid(),
    screenContext: z.object({
      currentPage: z.string(),
      activeTab: z.string().optional(),
    }).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error });

  const { messages, customerId, screenContext } = parsed.data;
  const supabase = getSupabase();

  // Build customer context
  const customerContext = await buildCustomerContext(customerId, supabase);

  // Route to appropriate agent
  const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
  const agentType = routeToAgent(lastUserMessage, messages);

  // Select system prompt and tools
  const systemPrompt = agentType === 'product_mgmt'
    ? getProductMgmtSystemPrompt(customerContext)
    : getCustomerMgmtSystemPrompt(customerContext);

  const tools = agentType === 'product_mgmt'
    ? productMgmtTools
    : customerMgmtTools;

  // Use AIService singleton for consistent logging, mocking, and maintainability
  // AIService.streamChat extended with `tools` and `systemPrompt` overrides
  const result = await aiService.streamChat(messages, {
    systemPrompt,
    tools,
    includeTools: true,
    maxSteps: 10,
  });

  // Send agent type as data stream event (NOT response header — Vercel AI SDK
  // streaming client can't access response headers)
  // The data event is accessible via useChat's `data` return value
  result.pipeUIMessageStreamToResponse(res, {
    sendRoundtrips: true,
    data: new StreamData(),  // Inject agentType via data.append({ agentType })
  });
}

// NOTE: AIService.streamChat must be extended to accept:
//   tools?: Record<string, Tool>  — overrides default AVAILABLE_TOOLS
//   systemPrompt?: string         — overrides default system prompt
// This preserves mock support, file-based logging, and the single AI execution path.
// SECURITY: In production, sanitize customer PII from system prompt before logging.
// Log: "[Customer context: ${contextSize} chars, ${agreementCount} agreements]" instead of full context.
```

### Frontend Chat Integration

```typescript
// frontend/src/features/customers/hooks/useCustomerChat.ts

export function useCustomerChat(customerId: string, customerName: string) {
  const { openChat } = useChatLayoutStore();
  const { activeTab } = useCustomerStore();

  const openCustomerChat = useCallback(() => {
    openChat({
      title: `${customerName} AI`,
      contextKey: `customer:${customerId}`,
      endpoint: `${import.meta.env.VITE_API_URL}/api/ai/customer/chat/stream`,  // Full URL
      screenContext: {
        currentPage: 'customer',
        customerId,      // Requires ScreenContext extension (see chatLayoutStore changes)
        customerName,
        activeTab: activeTab || 'overview',
      },
      // Customer-specific chat suggestions (replaces Portfolio defaults)
      suggestions: [
        { text: "What's the status of this customer?" },
        { text: 'Help me draft a follow-up email' },
        { text: 'Create a product strategy artifact' },
        { text: 'What agreements are expiring soon?' },
      ],
    });
  }, [customerId, customerName, activeTab, openChat]);

  return { openCustomerChat };
}
```

**chatLayoutStore changes required**:
```typescript
// Extend ChatConfig with endpoint and suggestions
interface ChatConfig {
  contextKey: string;
  title: string;
  endpoint?: string;  // NEW: override for non-Content-Agent endpoints
  screenContext?: ScreenContext;
  initialMessage?: string;
  onContentImproved?: () => void;
  suggestions?: Array<{ text: string }>;  // NEW: context-specific suggestions
}

// Extend ScreenContext as discriminated union
type ScreenContext =
  | { currentPage: 'portfolio'; artifactId?: string; artifactType?: string; artifactTitle?: string; artifactStatus?: string; }
  | { currentPage: 'customer'; customerId: string; customerName?: string; customerStatus?: string; activeTab?: string; };
```

```typescript
// frontend/src/features/customers/components/chat/AgentIndicator.tsx

// Agent type comes from the data stream event, NOT response headers
// useChat returns `data` which includes { agentType: 'customer_mgmt' | 'product_mgmt' }

export function AgentIndicator({ agentType }: { agentType: 'customer_mgmt' | 'product_mgmt' | null }) {
  if (!agentType) {
    // Loading/routing state — show pulse animation
    return <span className="text-xs px-2 py-0.5 rounded-full bg-muted animate-pulse">...</span>;
  }

  const config = agentType === 'product_mgmt'
    ? { label: 'Product Mgmt', color: 'bg-purple-500/10 text-purple-400' }
    : { label: 'Customer Mgmt', color: 'bg-blue-500/10 text-blue-400' };

  return (
    <span className={cn('text-xs px-2 py-0.5 rounded-full', config.color)}>
      {config.label}
    </span>
  );
}
```

**Per-message agent attribution** (DX-041):
When both agents have responded in the same conversation, show a small label above each assistant message:
```typescript
// In the message renderer, for assistant messages:
{message.role === 'assistant' && hasMixedAgents && (
  <span className={cn(
    'text-xs mb-1 block',
    message.metadata?.agentType === 'product_mgmt' ? 'text-purple-400' : 'text-blue-400'
  )}>
    {message.metadata?.agentType === 'product_mgmt' ? 'Product Mgmt' : 'Customer Mgmt'}
  </span>
)}
```

### useCustomerStructuredChat Hook (BLIND-003)

**CRITICAL**: Do NOT extend the existing `useStructuredChat` hook. Create a separate `useCustomerStructuredChat` that handles customer-specific tool result parsing. The existing `useStructuredChat` only knows how to parse `structuredResponse` and `suggestArtifactIdeas` tool results from the Content Agent.

```typescript
// frontend/src/features/customers/hooks/useCustomerStructuredChat.ts
// Converts customer agent tool results into display components:
// - updateCustomerStatus → StatusChangeCard
// - createArtifact → ArtifactCreatedCard
// - createProject → ProjectCreatedCard
// - getCustomerSummary → RecommendationCard

// IMPORTANT: The tool-result processing loop in useAIChat must be scoped by contextKey
// to prevent customer tool results from triggering portfolio tool result handlers (and vice versa).
// Add a contextKey check before calling handleToolResult.
```

### Agent Override UI (DX-012)

Add a small agent toggle above the chat input for discoverability:
```typescript
// Two pills: [Customer Mgmt] [Product Mgmt] — one active (highlighted)
// Clicking a pill forces that agent for the next message only
// @mention syntax kept as power-user secondary mechanism
<div className="flex gap-1 px-3 py-1">
  <button
    className={cn('text-xs px-2 py-0.5 rounded-full', activeAgent === 'customer_mgmt' ? 'bg-blue-500/20 text-blue-400' : 'text-muted-foreground')}
    onClick={() => setAgentOverride('customer_mgmt')}
  >Customer Mgmt</button>
  <button
    className={cn('text-xs px-2 py-0.5 rounded-full', activeAgent === 'product_mgmt' ? 'bg-purple-500/20 text-purple-400' : 'text-muted-foreground')}
    onClick={() => setAgentOverride('product_mgmt')}
  >Product Mgmt</button>
</div>
```

**Implementation steps**:
1. Create customerContextBuilder.ts with token budget enforcement
2. Create system prompts for both agents (with production log sanitization for customer PII)
3. Create tool factories (`createCustomerMgmtTools`, `createProductMgmtTools`) accepting injected supabase client
4. Create `merge_customer_info` RPC function in database for atomic JSONB merge
5. Create CustomerAgentRouter with keyword-based routing + conversation history stickiness
6. Extend AIService.streamChat to accept `tools` and `systemPrompt` overrides
7. Create customer-ai controller and routes using AIService (not raw streamText)
8. Mount routes in main router
9. **CRITICAL**: Add `endpoint` field to `ChatConfig` in chatLayoutStore.ts
10. **CRITICAL**: Extend `ScreenContext` as discriminated union with customer variant
11. **CRITICAL**: Scope tool-result processing in useAIChat by contextKey
12. Create useCustomerChat hook
13. Create useCustomerStructuredChat hook (separate from portfolio's useStructuredChat)
14. Create CustomerChatPanel wrapper component with agent toggle pills
15. Create structured response card components (StatusChangeCard, ArtifactCreatedCard, RecommendationCard)
16. Create AgentIndicator component (reads agent type from data stream, not response headers)
17. Add per-message agent attribution labels
18. Add "Chat" button to CustomerDetailPage header
19. Wire chat opening through chatLayoutStore
20. Test end-to-end streaming with both agents

## Testing Requirements

### Unit Tests

| Test File | Coverage |
|-----------|----------|
| `backend/src/services/ai/__tests__/CustomerAgentRouter.test.ts` | Intent routing logic |
| `backend/src/services/ai/__tests__/customerContextBuilder.test.ts` | Context assembly |

**Key test cases**:
- Route "update the status to live" → customer_mgmt
- Route "create a product strategy" → product_mgmt
- Route "@product roadmap priorities" → product_mgmt (explicit override)
- Route "how is the customer doing?" → customer_mgmt (default for ambiguous)
- Context builder handles missing data gracefully
- Context builder stays under 4000 tokens for reasonable data

### Integration Tests

| Test File | Coverage |
|-----------|----------|
| `backend/src/routes/__tests__/customer-ai.integration.test.ts` | Streaming endpoint |

### Manual Testing

- [ ] "Chat" button on customer detail opens split-view chat
- [ ] Ask about engagement → Customer Mgmt Agent responds
- [ ] Ask about strategy → Product Mgmt Agent responds
- [ ] Agent indicator shows correct agent
- [ ] Use @product override to force Product Mgmt
- [ ] Agent references customer's actual data in response
- [ ] "Update status to live" → agent calls tool → status changes → card shown
- [ ] "Create a strategy for this customer" → agent creates artifact → card shown
- [ ] Chat history persists when navigating away and back
- [ ] Streaming works smoothly (no buffering issues)

## Error Handling

| Error Scenario | Handling Strategy |
|----------------|-------------------|
| Customer context fetch fails | Return typed error: `{ type: 'context_load_failed', message: 'Could not load customer context' }` with retry button that re-fetches customer data |
| Tool execution fails | Return typed error: `{ type: 'action_failed', tool: 'createArtifact', message: 'Could not create artifact — please try again from the Projects tab' }` |
| Streaming interrupted | Return typed error: `{ type: 'connection_lost', message: 'Connection lost during response' }` with standard streaming recovery |
| Customer not found | Return 404 before streaming starts |
| Agent routing fails | Default to customer_mgmt agent, log routing error |

## Validation Commands

```bash
cd frontend && npx tsc --noEmit
cd backend && npx tsc --noEmit
cd backend && npm run test
cd frontend && npm run test
npm run build
```

---

*This spec is ready for implementation. Follow the patterns and validate at each step.*
