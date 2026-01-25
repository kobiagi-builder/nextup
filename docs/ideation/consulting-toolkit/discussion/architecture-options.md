# Architecture Options: AI Implementation

**PRD**: ./prd-portfolio-mvp.md
**Status**: ✅ DECISIONS FINALIZED

---

## Final Architecture Decisions

| Decision Area | Choice | Rationale |
|---------------|--------|-----------|
| **AI Framework** | Vercel AI SDK | Best React chat UX, multi-LLM support, TypeScript native, cost-efficient |
| **Data Architecture** | X4 (Hybrid) | Supabase direct for CRUD, Express API for AI operations |
| **Session Storage** | Zustand + Supabase | Fast UI cache + permanent persistence |
| **AI Behavior** | Three modes | Predefined workflows, intent matching, graceful fallback |

### AI Behavior Modes

| Mode | Trigger | Example |
|------|---------|---------|
| **Predefined Workflow** | Button/command | "Create Content" button → Research → Write → Graphics |
| **Intent Matching** | Natural language | "Make a post about X" → Create topic → Execute workflow |
| **Graceful Fallback** | Unsupported | "Buy a Ferrari" → Explain limitations |

---

## Exploration History (Below)

## Executive Summary

The AI implementation is the product's core differentiator. We need an architecture that enables:
- **Conversational collaboration** (not just "generate" buttons)
- **Multiple capabilities** (topic research, narrative, content creation, style mimicking)
- **Streaming responses** for real-time feedback
- **Context awareness** (user context, conversation history, artifacts)
- **Multi-LLM support** with easy model switching
- **Scalability** and **cost efficiency**

---

## Option A: Vercel AI SDK + Tool Calling

**Approach**: Use Vercel AI SDK with a single LLM that has access to tools (functions) for different capabilities.

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  ┌─────────────────────────────────────────────────┐    │
│  │  useChat() hook from @ai-sdk/react              │    │
│  │  - Automatic streaming                          │    │
│  │  - Message history management                   │    │
│  │  - Tool call rendering                          │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    Backend (Express)                     │
│  ┌─────────────────────────────────────────────────┐    │
│  │  streamText() with tools                        │    │
│  │  - researchTopics()                             │    │
│  │  - generateNarrative()                          │    │
│  │  - createContent()                              │    │
│  │  - analyzeStyle()                               │    │
│  │  - addToBacklog()                               │    │
│  │  - insertToEditor()                             │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              LLM Provider (OpenAI/Anthropic)            │
│  Single model decides when to call which tool           │
└─────────────────────────────────────────────────────────┘
```

**Pros**:
- ✅ **Simple architecture** - One model, one conversation
- ✅ **Native React integration** - useChat hook handles streaming, history, UI state
- ✅ **Built-in multi-LLM support** - Provider pattern for OpenAI, Anthropic, etc.
- ✅ **Tool calling is mature** - GPT-4 and Claude excel at function calling
- ✅ **Low latency** - No orchestration overhead
- ✅ **Cost efficient** - One LLM call per turn (with tool calls)
- ✅ **Actively maintained** - Vercel's flagship AI product
- ✅ **TypeScript-first** - Excellent DX with your stack

**Cons**:
- ⚠️ **Single model limitation** - Can't use different models for different tasks easily
- ⚠️ **Tool complexity** - Many tools can confuse the model
- ⚠️ **Less "agentic"** - Model decides everything, less explicit control

**Cost**: ~$0.01-0.03 per conversation turn (GPT-4o)

**Complexity**: Low

---

## Option B: Multi-Agent Orchestration (LangGraph/CrewAI)

**Approach**: Multiple specialized agents with an orchestrator that routes requests.

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  Custom chat interface with agent awareness             │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    Orchestrator Agent                    │
│  Analyzes user intent, routes to specialized agents     │
└─────────────────────────────────────────────────────────┘
          │              │              │
          ▼              ▼              ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   Topic     │  │  Narrative  │  │   Content   │
│   Agent     │  │    Agent    │  │    Agent    │
│ (Research)  │  │  (Writing)  │  │  (Style)    │
└─────────────┘  └─────────────┘  └─────────────┘
          │              │              │
          └──────────────┼──────────────┘
                         ▼
┌─────────────────────────────────────────────────────────┐
│                 Shared Memory/Context                    │
│  User context, conversation history, artifacts          │
└─────────────────────────────────────────────────────────┘
```

**Pros**:
- ✅ **Specialized agents** - Each agent optimized for its task
- ✅ **Different models per agent** - Use GPT-4 for reasoning, Claude for writing
- ✅ **Explicit control** - Clear routing logic
- ✅ **Scalable complexity** - Add agents without changing core
- ✅ **Agent collaboration** - Agents can hand off to each other

**Cons**:
- ⚠️ **Higher latency** - Orchestrator + agent calls
- ⚠️ **More complex** - Multiple prompts, routing logic, state management
- ⚠️ **Higher cost** - Multiple LLM calls per turn
- ⚠️ **Framework lock-in** - LangChain/CrewAI patterns
- ⚠️ **Python-centric** - Most frameworks are Python-first (your stack is Node/TS)
- ⚠️ **Debugging complexity** - Multi-agent conversations are hard to trace

**Cost**: ~$0.05-0.15 per conversation turn (multiple calls)

**Complexity**: High

---

## Option C: Vercel AI SDK + Generative UI

**Approach**: AI SDK with server components that stream UI, not just text.

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  ┌─────────────────────────────────────────────────┐    │
│  │  useChat() with custom renderers                │    │
│  │  - Tool results render as React components      │    │
│  │  - Topic suggestions as interactive cards       │    │
│  │  - Content previews with edit buttons           │    │
│  │  - Inline editing within chat                   │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    Backend (Express/RSC)                 │
│  ┌─────────────────────────────────────────────────┐    │
│  │  streamUI() - Streams React components          │    │
│  │  OR streamText() with tool UI mappings          │    │
│  │                                                 │    │
│  │  Tools return structured data + UI hints        │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

**Pros**:
- ✅ **Rich UI in chat** - Not just text, but interactive components
- ✅ **Same Vercel AI SDK base** - Familiar patterns
- ✅ **Better UX** - Topic cards, content previews, inline actions
- ✅ **Progressive enhancement** - Start simple, add richness
- ✅ **Native React** - Uses your stack's strengths

**Cons**:
- ⚠️ **Requires careful design** - UI components need to be chat-friendly
- ⚠️ **RSC complexity** - If using Next.js server components (you're on Vite)
- ⚠️ **State sync** - Chat UI state vs. editor state coordination

**Cost**: Same as Option A (~$0.01-0.03 per turn)

**Complexity**: Medium

---

## Option D: Hybrid - AI SDK + Capability Router

**Approach**: AI SDK core with explicit capability routing layer.

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  ┌─────────────────────────────────────────────────┐    │
│  │  useChat() + capability-aware UI               │    │
│  │  - User can explicitly invoke capabilities      │    │
│  │  - OR AI auto-selects based on conversation    │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  Capability Router                       │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Route by:                                      │    │
│  │  - Explicit user command ("/research")          │    │
│  │  - AI classification of intent                  │    │
│  │  - Context (editing artifact = content mode)    │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
          │              │              │
          ▼              ▼              ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Research   │  │  Narrative  │  │   Content   │
│ Capability  │  │ Capability  │  │ Capability  │
│             │  │             │  │             │
│ - Web search│  │ - Draft gen │  │ - Style     │
│ - Trend API │  │ - Structure │  │ - Full doc  │
│ - Topic gen │  │ - Outline   │  │ - Edit      │
└─────────────┘  └─────────────┘  └─────────────┘
          │              │              │
          ▼              ▼              ▼
┌─────────────────────────────────────────────────────────┐
│              LLM Abstraction Layer                       │
│  Each capability can specify preferred model            │
│  - Research: GPT-4o (tool use)                          │
│  - Narrative: Claude (writing quality)                  │
│  - Content: Configurable per style                      │
└─────────────────────────────────────────────────────────┘
```

**Pros**:
- ✅ **Best of both worlds** - Simple core, explicit capabilities
- ✅ **Model flexibility** - Different LLM per capability
- ✅ **User control** - Can explicitly invoke capabilities
- ✅ **AI autonomy** - Can also auto-route based on intent
- ✅ **TypeScript native** - Build with your stack
- ✅ **No framework lock-in** - Custom but standard patterns
- ✅ **Testable** - Each capability is independently testable
- ✅ **Configurable** - Add capabilities without changing core

**Cons**:
- ⚠️ **More code to write** - Custom routing logic
- ⚠️ **Design decisions** - Need to define capability boundaries
- ⚠️ **Medium complexity** - Not as simple as pure Option A

**Cost**: ~$0.02-0.05 per turn (depends on routing)

**Complexity**: Medium

---

## Option E: OpenAI Assistants API

**Approach**: Use OpenAI's managed assistant infrastructure.

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  Custom chat interface with thread management           │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    Backend (Express)                     │
│  OpenAI Assistants API client                           │
│  - Create/manage threads                                │
│  - Run assistant with tools                             │
│  - Handle function call responses                       │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              OpenAI Assistant (Hosted)                   │
│  - Persistent threads                                   │
│  - Built-in file handling                               │
│  - Code interpreter                                     │
│  - Function calling                                     │
└─────────────────────────────────────────────────────────┘
```

**Pros**:
- ✅ **Managed infrastructure** - OpenAI handles conversation state
- ✅ **Persistent threads** - Built-in conversation memory
- ✅ **File handling** - Can process uploaded files
- ✅ **Code execution** - Code interpreter for analysis

**Cons**:
- ❌ **Vendor lock-in** - OpenAI only, no multi-LLM
- ❌ **Limited streaming** - Streaming support is newer/limited
- ❌ **Less control** - Can't customize as deeply
- ❌ **Cost uncertainty** - Thread storage and retrieval costs
- ❌ **Latency** - Additional network hops to OpenAI

**Cost**: Higher (assistant storage + retrieval + tokens)

**Complexity**: Low-Medium

---

## Recommendation: Option D (Hybrid)

### Why Option D?

| Requirement | Option D Fit |
|-------------|--------------|
| Modern & advanced | ✅ Custom capability system with AI routing |
| Scalable | ✅ Add capabilities without core changes |
| Easy to develop | ✅ TypeScript, familiar patterns, AI SDK base |
| Cost efficient | ✅ Route to cheapest capable model per task |
| Agile & configurable | ✅ Capabilities are pluggable, models configurable |
| Top-notch result | ✅ Best model for each task type |
| Multi-LLM | ✅ Built into architecture |
| Conversational | ✅ AI SDK's chat primitives |

### Recommended Tech Stack

```
Frontend:
- @ai-sdk/react (useChat, useCompletion)
- Zustand for capability state
- Rich tool result renderers

Backend:
- @ai-sdk/openai, @ai-sdk/anthropic
- Custom CapabilityRouter class
- Capability modules (research, narrative, content)
- LLMProvider abstraction

Database:
- Supabase for conversations, artifacts, context
- Embeddings for style examples (future RAG)
```

### Implementation Phases

**Phase 1 (Core)**:
- AI SDK setup with streaming
- Basic capability router (manual mode selection)
- Content creation capability with style examples

**Phase 2 (Smart)**:
- AI-powered intent classification
- Auto-routing to capabilities
- Capability handoff during conversation

**Phase 3 (Rich)**:
- Generative UI components in chat
- Inline editing mode
- Cross-capability workflows

---

## Alternative Recommendation: Option A (Simpler)

If you prefer **speed to market** over flexibility:

| Consideration | Option A |
|---------------|----------|
| Time to build | 30-40% faster |
| Complexity | Lower |
| Future flexibility | Moderate (refactor possible) |
| Risk | Lower (proven patterns) |

Start with Option A, refactor to Option D when:
- You need different models per capability
- Tool count exceeds 10-15 (model confusion)
- Complex multi-step workflows emerge

---

## Decision Matrix (User Priorities)

**Priority Order:**
1. Native chat UX + session persistence (25%)
2. AI services diversity/scalability (20%)
3. AI latency (20%)
4. AI costs (15%)
5. Deployment complexity (10%)
6. Development complexity (10%)

| Factor | Weight | A (AI SDK) | B (Multi-Agent) | C (Gen UI) | D (Hybrid) | E (Assistants) |
|--------|--------|------------|-----------------|------------|------------|----------------|
| Chat UX + Sessions | 25% | 9 | 6 | 9 | 9 | 7 |
| AI Diversity/Scale | 20% | 6 | 9 | 6 | 9 | 3 |
| AI Latency | 20% | 9 | 5 | 9 | 8 | 6 |
| AI Costs | 15% | 9 | 4 | 9 | 8 | 5 |
| Deployment Complexity | 10% | 9 | 5 | 8 | 8 | 7 |
| Development Complexity | 10% | 9 | 4 | 7 | 7 | 7 |
| **Weighted Score** | | **8.2** | **5.7** | **8.0** | **8.5** | **5.6** |

**Winner: Option D (Hybrid) with score 8.5**

Option A is very close (8.2) - simpler but less scalable for AI diversity.

---

---

# Data Architecture: API vs. Shared Cache

## The Question

Should we reduce frontend/backend API complexity by using shared data caching or direct database access patterns?

## Option X1: Traditional API (Current Default)

```
Frontend → Express API → Supabase
    ↑          ↓
React Query   Business Logic
(client cache)
```

**How it works:**
- Frontend calls Express API endpoints for all CRUD
- Backend handles business logic, validation, auth
- React Query caches responses on client

**Pros:**
- ✅ Clear separation of concerns
- ✅ Business logic centralized on backend
- ✅ Security - anon key never exposed for writes
- ✅ Easy to add auth middleware later
- ✅ Testable backend

**Cons:**
- ⚠️ More API endpoints to build and maintain
- ⚠️ Two caches (React Query + potential backend cache)
- ⚠️ Latency for simple CRUD operations
- ⚠️ Boilerplate for each resource

**API Count Estimate:** ~30-40 endpoints for MVP

---

## Option X2: Supabase Direct + Backend for Complex Ops

```
Frontend → Supabase (direct) → for CRUD
Frontend → Express API → for AI, complex business logic
    ↑
React Query + Supabase Realtime
```

**How it works:**
- Frontend uses Supabase client directly for reads/writes
- React Query + Supabase Realtime for cache invalidation
- Express API only for: AI operations, complex workflows, external integrations
- RLS policies handle authorization (even in MVP with single user, prep for future)

**Pros:**
- ✅ **Fewer API endpoints** - Only ~10-15 for AI/complex ops
- ✅ **Real-time sync** - Supabase Realtime for live updates
- ✅ **Faster development** - No API for basic CRUD
- ✅ **Lower latency** - Direct database access
- ✅ **Type safety** - Supabase generates TypeScript types
- ✅ **RLS ready** - Security at database level

**Cons:**
- ⚠️ Business logic split between frontend and database (RLS)
- ⚠️ Supabase anon key in frontend (but RLS protects data)
- ⚠️ More complex debugging (frontend + database)
- ⚠️ Tighter coupling to Supabase

**API Count Estimate:** ~10-15 endpoints (AI only)

---

## Option X3: tRPC (Type-safe API Layer)

```
Frontend → tRPC Client → tRPC Server → Supabase
    ↑           ↓
Auto-generated   Shared types
types & cache    (zod schemas)
```

**How it works:**
- tRPC provides end-to-end type safety
- Procedures defined once, types auto-generated
- Built-in React Query integration
- Backend still handles all logic

**Pros:**
- ✅ **End-to-end type safety** - No API type drift
- ✅ **Auto-completion** - Frontend knows backend types
- ✅ **Less boilerplate** - No manual API client
- ✅ **Built-in caching** - React Query integration
- ✅ **Batching** - Multiple calls batched automatically

**Cons:**
- ⚠️ **Another framework** - Learning curve
- ⚠️ **Tight coupling** - Frontend/backend must deploy together (or version carefully)
- ⚠️ **Less RESTful** - Harder to expose as public API later
- ⚠️ **Overkill?** - For single-user MVP

**API Count Estimate:** Similar to X1, but less code per endpoint

---

## Option X4: Hybrid with React Query + Supabase Hooks

```
Frontend:
├── useSupa() hooks → Supabase direct (CRUD)
├── useAI() hooks → Express API (AI operations)
└── React Query → Unified cache layer

Backend:
└── Express API → AI operations only
```

**How it works:**
- Custom hooks abstract data source
- `useArtifacts()` → Supabase direct
- `useAIChat()` → Express API
- React Query manages cache for both
- Single source of truth: Supabase
- Supabase Realtime for cross-tab/cross-device sync

**Pros:**
- ✅ **Best of both worlds** - Simple CRUD direct, complex ops via API
- ✅ **Unified cache** - React Query handles everything
- ✅ **Clean abstraction** - Hooks hide implementation
- ✅ **Flexible** - Can move operations backend later
- ✅ **Real-time ready** - Supabase subscriptions
- ✅ **Fewer endpoints** - Only AI needs API

**Cons:**
- ⚠️ **Two data paths** - Some complexity in hooks
- ⚠️ **Cache coordination** - Must ensure consistency
- ⚠️ **Testing** - Need to test both paths

**API Count Estimate:** ~10-15 endpoints (AI only)

---

## Recommendation: Option X4 (Hybrid Hooks)

### Why X4?

| Your Priority | X4 Fit |
|---------------|--------|
| Chat UX + Sessions | ✅ React Query + Supabase Realtime = instant sync |
| AI Diversity | ✅ AI ops go through Express where we control routing |
| AI Latency | ✅ CRUD is direct, only AI has API hop |
| AI Costs | ✅ No impact (AI architecture separate) |
| Deployment | ✅ Simpler - fewer API routes |
| Development | ✅ Faster - no CRUD API boilerplate |

### Implementation Pattern

```typescript
// hooks/useArtifacts.ts
export function useArtifacts() {
  return useQuery({
    queryKey: ['artifacts'],
    queryFn: () => supabase.from('artifacts').select('*'),
  });
}

export function useCreateArtifact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (artifact) => supabase.from('artifacts').insert(artifact),
    onSuccess: () => queryClient.invalidateQueries(['artifacts']),
  });
}

// hooks/useAIChat.ts
export function useAIChat(artifactId: string) {
  return useChat({
    api: '/api/ai/chat',
    body: { artifactId },
    // ... AI SDK options
  });
}
```

### What Goes Where

| Operation | Data Path | Why |
|-----------|-----------|-----|
| CRUD artifacts | Supabase direct | Simple, fast, real-time |
| CRUD topics | Supabase direct | Simple, fast |
| CRUD user context | Supabase direct | Simple, fast |
| AI chat | Express API | Need LLM orchestration |
| AI topic research | Express API | Need web search + LLM |
| AI content generation | Express API | Need style examples + LLM |
| File uploads | Supabase Storage | Native support |

### Cache Strategy

```
┌─────────────────────────────────────────────────────────┐
│                   React Query Cache                      │
│  ┌─────────────────┐  ┌─────────────────────────────┐   │
│  │ Supabase Data   │  │ AI Conversations            │   │
│  │ - artifacts     │  │ - chat history              │   │
│  │ - topics        │  │ - streaming state           │   │
│  │ - user_context  │  │                             │   │
│  └────────┬────────┘  └──────────────┬──────────────┘   │
│           │                          │                   │
│           ▼                          ▼                   │
│  ┌─────────────────┐  ┌─────────────────────────────┐   │
│  │ Supabase        │  │ Express API                 │   │
│  │ Realtime Sync   │  │ (AI operations)             │   │
│  └─────────────────┘  └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## Data Architecture Decision Matrix

| Factor | X1 (API) | X2 (Supa Direct) | X3 (tRPC) | X4 (Hybrid) |
|--------|----------|------------------|-----------|-------------|
| Development Speed | 6 | 8 | 7 | 9 |
| API Complexity | 5 | 9 | 7 | 8 |
| Type Safety | 7 | 8 | 10 | 8 |
| Real-time Support | 6 | 9 | 6 | 9 |
| Flexibility | 8 | 7 | 6 | 9 |
| Future Auth Ready | 9 | 8 | 9 | 8 |
| **Score** | **6.8** | **8.2** | **7.5** | **8.5** |

**Winner: Option X4 (Hybrid) with score 8.5**

---

## Combined Recommendation

### AI Architecture: Option D (Hybrid Capability Router)
### Data Architecture: Option X4 (Hybrid Hooks)

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    React Query Cache                     │    │
│  │  ┌───────────────┐        ┌────────────────────────┐    │    │
│  │  │ Data Hooks    │        │ AI Chat Hooks          │    │    │
│  │  │ useArtifacts  │        │ useAIChat (streaming)  │    │    │
│  │  │ useTopics     │        │ useCapability          │    │    │
│  │  │ useContext    │        │                        │    │    │
│  │  └───────┬───────┘        └───────────┬────────────┘    │    │
│  └──────────┼────────────────────────────┼─────────────────┘    │
│             │                            │                       │
│             ▼                            ▼                       │
│  ┌───────────────────┐      ┌─────────────────────────────┐     │
│  │ Supabase Client   │      │ Express API                 │     │
│  │ (direct CRUD)     │      │ /api/ai/*                   │     │
│  └─────────┬─────────┘      └──────────────┬──────────────┘     │
└────────────┼───────────────────────────────┼────────────────────┘
             │                               │
             ▼                               ▼
┌─────────────────────┐      ┌─────────────────────────────────┐
│     Supabase        │      │        Capability Router        │
│  ┌───────────────┐  │      │  ┌─────────┐ ┌─────────┐       │
│  │ PostgreSQL    │  │      │  │Research │ │Narrative│ ...   │
│  │ Storage       │  │      │  └────┬────┘ └────┬────┘       │
│  │ Realtime      │  │      │       └─────┬─────┘            │
│  └───────────────┘  │      │             ▼                  │
└─────────────────────┘      │  ┌─────────────────────────┐   │
                             │  │ LLM Abstraction Layer   │   │
                             │  │ GPT-4 / Claude / etc    │   │
                             │  └─────────────────────────┘   │
                             └─────────────────────────────────┘
```

---

## Questions for Your Decision

1. **AI Architecture**: Option D (Hybrid) vs Option A (Simple)?
   - D: More flexible, multi-LLM, medium complexity
   - A: Simpler, faster to build, refactor later

2. **Data Architecture**: Option X4 (Hybrid) vs Option X1 (Traditional API)?
   - X4: Faster dev, fewer endpoints, Supabase native
   - X1: More control, clearer separation

3. **Capability Routing**: Auto-detect vs Explicit commands vs Hybrid?

4. **Session Persistence**: Store in Supabase (persistent) or localStorage (ephemeral)?
