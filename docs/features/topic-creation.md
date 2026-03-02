# Topic Creation & Suggestion

**Version:** 1.0.0
**Last Updated:** 2026-02-22
**Status:** Current (documents active implementation)

---

## Overview

Topic creation is the process by which the AI content agent generates personalized content ideas for the user. The agent analyzes the user's profile, skills, and existing content to suggest relevant topics that can be converted into draft artifacts for the full content creation pipeline.

**Two implementations exist in the codebase:**

| Implementation | File | Status | Notes |
|---|---|---|---|
| `suggestArtifactIdeas` | `agents/portfolio/tools/contentTools.ts` | **Active** | Registered in AIService tool registry |
| `createTopic`, `listTopics`, etc. | `topicTools.ts` | **Unused** | 5 tools defined but never registered |

This document covers the **active** implementation.

---

## Entry Points

### 1. Portfolio Page - AI Chat (Primary)

**File:** `frontend/src/features/portfolio/pages/PortfolioPage.tsx`

The Portfolio page opens the AI chat panel automatically with context key `portfolio:research`. The chat's empty state shows suggestion chips including "Research topic ideas". The user types a request like "Research LinkedIn post ideas about product management" and the agent processes it.

**Trigger:** User sends a message in the chat panel requesting topic ideas.

### 2. Chat Suggestion Card - "Create" Button

**File:** `frontend/src/features/portfolio/components/chat/ChatPanel.tsx`

After the agent returns topic suggestions, each suggestion renders as a card with a "Create" button. Clicking it:

1. Creates a draft artifact via `createArtifact.mutateAsync({ type, title, content: description, tags })`
2. Copies current chat context messages to the new artifact's context in the Zustand store
3. Navigates to `/portfolio/artifacts/${id}?autoResearch=true`

**Trigger:** User clicks "Create" on a suggestion card.

### 3. Portfolio Page - Manual Create Modal

**File:** `frontend/src/features/portfolio/pages/PortfolioPage.tsx`

The "New" button opens a dialog with `ArtifactForm` for direct artifact creation (bypasses topic suggestion entirely). Offers "Save as Draft" and "Create Content" actions.

**Trigger:** User clicks "New" button and fills out the form.

### 4. Artifact Page - "Create Content" Button

**File:** `frontend/src/features/portfolio/pages/ArtifactPage.tsx`

When an artifact is in `draft` status, clicking "Create Content" sends `Create content: "<title>"` to the chat. This bypasses topic suggestion and goes directly into the content creation pipeline. Also triggered automatically via `?startCreation=true` or `?autoResearch=true` query params.

**Trigger:** User clicks "Create Content" on a draft artifact, or navigates with auto-creation query params.

---

## System Prompt Instructions

**File:** `backend/src/services/ai/agents/portfolio/prompt/systemPrompts.ts`

### Request Classification

The system prompt instructs the agent to classify every request into one of four categories:

| Decision | Condition | Action |
|---|---|---|
| `SUPPORTED` | Clear content type + clear action, within scope | Proceed with data gathering and suggestion |
| `CLARIFY` | Missing content type or unclear request | Ask clarifying questions via `structuredResponse` |
| `UNSUPPORTED` | Outside content creation scope | Explain limitations |
| `PARTIAL` | Some parts supported, some not | Handle supported parts, explain unsupported |

### Topic Generation vs Content Creation

The prompt distinguishes between two request types:

- **Topic generation**: Has content type but NO topic. Example: "Research blog post topic ideas". The agent will generate topics.
- **Content creation**: Has content type AND a specific topic. Example: "Create a blog post about product management". The agent creates content directly.

### Supported Topic Suggestion Flow (from system prompt)

When `requestDecision = "SUPPORTED"` for a topic generation request:

```
1. Call getUserContext     → fetch user bio, expertise, industries, audience
2. Call getUserSkills      → fetch skills by category
3. Call listRecentArtifacts → see existing content (avoid repetition)
4. Call suggestArtifactIdeas → generate 5 suggestions
5. Output brief acknowledgment (5-8 words max)
6. Call structuredResponse  → format for UI with title, actionableItems, ctaText
7. STOP
```

### Content Creation Detection (bypasses topic flow)

When the message matches `Create content: "<title>"`:
- Skip topic suggestions entirely
- Extract artifact ID from `screenContext.artifactId`
- Call `conductDeepResearch` immediately to start the pipeline

---

## Tools

### Active Tools (registered in AIService)

#### `suggestArtifactIdeas` (agents/portfolio/tools/contentTools.ts)

The primary topic suggestion tool. Acts as a **pass-through formatter** — the AI agent generates the actual suggestions, this tool structures them with temporary IDs.

**Input Schema:**
```typescript
{
  suggestions: Array<{
    title: string          // Title of the suggested content
    description: string    // Brief description of the content idea
    type: 'social_post' | 'blog' | 'showcase'  // Artifact type
    rationale: string      // Why this content would be valuable
    tags?: string[]        // Suggested tags
  }>  // min: 1, max: 10
}
```

**Output:**
```typescript
{
  success: true,
  type: 'artifact_suggestions',
  suggestions: Array<{
    id: string    // Temporary ID: `suggestion-${Date.now()}-${index}`
    title: string
    description: string
    type: string
    rationale: string
    tags?: string[]
  }>,
  message: string  // "Generated N content suggestions"
}
```

**Behavior:**
- Does NOT write to the database
- Assigns temporary IDs for frontend rendering
- Returns suggestions for the UI to display as cards

#### `getUserContext` (agents/portfolio/tools/profileTools.ts)

Fetches user profile data from the `user_context` table.

**Input:** None (uses authenticated user from request context)

**Output:** User bio, value proposition, expertise areas, industries, target audience, years of experience.

**Used for:** Personalizing topic suggestions based on user's professional profile.

#### `getUserSkills` (agents/portfolio/tools/profileTools.ts)

Fetches user skills grouped by category from the `user_skills` table.

**Input:** None (uses authenticated user from request context)

**Output:** Skills organized by category (e.g., Technical, Leadership, Domain).

**Used for:** Ensuring suggestions align with user's skill areas.

#### `listRecentArtifacts` (agents/portfolio/tools/contentTools.ts)

Lists existing artifacts to prevent topic duplication.

**Input Schema:**
```typescript
{
  limit?: number          // 1-20, default: 5
  type?: 'social_post' | 'blog' | 'showcase' | 'all'
}
```

**Output:** Array of `{ id, type, title, tags }` for recent artifacts.

**Used for:** The agent checks existing content to avoid suggesting duplicate topics.

#### `structuredResponse` (responseTools.ts)

Mandatory final tool that formats the response for the frontend UI.

**Relevant fields for topic suggestions:**
```typescript
{
  interpretation: {
    userRequest: string
    requestDecision: 'SUPPORTED' | 'CLARIFY' | 'UNSUPPORTED' | 'PARTIAL'
  },
  title: string              // e.g., "LinkedIn Post Ideas for Product Management"
  actionableItems: Array<{   // The suggestions formatted as UI cards
    title: string
    description: string
    type: string
    rationale: string
    tags?: string[]
  }>,
  ctaText: string            // e.g., "Click 'Create' on any suggestion..."
}
```

### Unused Tools (topicTools.ts - NOT registered)

These 5 tools exist in `topicTools.ts` but are NOT imported or registered in `AIService.ts`:

| Tool | Description | Notes |
|---|---|---|
| `createTopic` | Create topic as artifact with `metadata.is_topic: true` | Writes to DB |
| `updateTopic` | Update topic title/description/tags | Writes to DB |
| `getTopic` | Fetch specific topic details | Read-only |
| `listTopics` | List topics (draft artifacts) with filtering | Read-only |
| `executeTopicToArtifact` | Convert topic to active artifact, set tone | Sets `status: 'in_progress'` |

These tools store topics as artifacts in the `artifacts` table using `metadata.is_topic: true` as a discriminator. They were an early implementation that was superseded by the `suggestArtifactIdeas` approach.

---

## External APIs

### During Topic Suggestion

| Service | Usage | Details |
|---|---|---|
| **Claude Sonnet 4** (`claude-sonnet-4-20250514`) | Main agent reasoning | Generates the actual topic suggestions based on user context. Called via Vercel AI SDK `streamText()` with `toolChoice: 'auto'`. |
| **Supabase** | Data queries | `user_context`, `user_skills`, `artifacts` tables queried by context tools |

**No web search APIs** are called during topic suggestion. Tavily is only used later during `conductDeepResearch` (after the user selects a topic and triggers content creation).

### After Topic Selection (content creation pipeline)

| Service | Usage | Details |
|---|---|---|
| **Tavily API** | Web research | 5 parallel searches across Reddit, LinkedIn, Quora, Medium, Substack |
| **Claude Haiku** | Query generation | Generates 8-10 search queries from the topic |
| **Claude Sonnet 4** | Pipeline orchestration | Continues to orchestrate all subsequent pipeline tools |

---

## Data Model

### No Dedicated Topics Table

Topics are **not persisted** during the suggestion phase. The `suggestArtifactIdeas` tool returns in-memory suggestions with temporary IDs.

### Artifact Creation (on user action)

When the user clicks "Create" on a suggestion card, the frontend creates a draft artifact:

```typescript
// ChatPanel.tsx - handleCreateContent
await createArtifact.mutateAsync({
  type: suggestion.type,        // 'blog' | 'social_post' | 'showcase'
  title: suggestion.title,
  content: suggestion.description,  // Description becomes initial content
  tags: suggestion.tags || [],
});
// → INSERT INTO artifacts (status='draft')
```

### Relevant Database Tables

| Table | Role in Topic Flow |
|---|---|
| `artifacts` | Draft artifacts created from suggestions. Fields: `id`, `type`, `title`, `content`, `status`, `tags`, `metadata` |
| `user_context` | User profile data used to personalize suggestions |
| `user_skills` | User skills used to align suggestions with expertise |
| `artifact_research` | Research results stored after `conductDeepResearch` (post-topic-selection) |

---

## Frontend Flow

### Transport Layer

**`useAIChat`** (`frontend/src/features/portfolio/hooks/useAIChat.ts`):
- Uses Vercel AI SDK v6 `useChat` with `DefaultChatTransport`
- Points to `POST /api/ai/chat/stream`
- Injects `screenContext` (current page, artifactId, artifactType, artifactTitle, artifactStatus) into every request
- On stream completion, parses tool results from assistant message parts

**`useStructuredChat`** (`frontend/src/features/portfolio/hooks/useStructuredChat.ts`):
- Wraps `useAIChat`, intercepts `onToolResult` callbacks
- When `toolName === 'suggestArtifactIdeas'`, stores suggestions on the message in the Zustand chat store
- When `toolName === 'structuredResponse'`, stores structured response data
- Exposes `parsedMessages` with `artifactSuggestions` field for the UI

### Rendering

Suggestion cards are rendered by `StructuredChatMessage` in `ChatPanel.tsx`. Each card displays:
- Title and description
- Content type badge
- Rationale
- Tags
- "Create" button → calls `handleCreateContent`

---

## Complete Data Flow

### Topic Suggestion Flow

```
User types "Research LinkedIn post ideas about product management"
  → useAIChat.sendMessage()
  → DefaultChatTransport → POST /api/ai/chat/stream
  → ai.controller.streamChat validates request (Zod schema)
  → aiService.streamChat()
  → fetchUserContext() from Supabase user_context table
  → getBaseSystemPrompt(userContext, screenContext) builds system prompt
  → streamText() calls Claude Sonnet 4 with tools enabled, toolChoice: 'auto'
  → Claude classifies request: requestDecision = "SUPPORTED"
  → Claude calls getUserContext tool → fetches from Supabase
  → Claude calls getUserSkills tool → fetches from Supabase
  → Claude calls listRecentArtifacts tool → fetches from Supabase
  → Claude generates 5 personalized suggestions
  → Claude calls suggestArtifactIdeas tool (formats with temp IDs)
  → Claude outputs brief acknowledgment: "I'll research that."
  → Claude calls structuredResponse tool (formats for UI cards)
  → STOP
  → pipeUIMessageStreamToResponse streams back to frontend
  → useAIChat detects tool-suggestArtifactIdeas part
  → useStructuredChat stores suggestions in Zustand chat store
  → ChatPanel renders suggestion cards
```

### Topic → Content Creation Flow

```
User clicks "Create" on a suggestion card
  → ChatPanel.handleCreateContent()
  → createArtifact.mutateAsync({ type, title, content: description, tags })
  → INSERT INTO artifacts (status='draft')
  → Copy chat messages to new artifact's context key in Zustand
  → navigate to /portfolio/artifacts/${id}?autoResearch=true
  → ArtifactPage mounts, reads ?autoResearch=true query param
  → Sets isContentCreationTriggered = true
  → Sends "Create content: \"${artifact.title}\"" via chat
  → Claude detects "Create content:" pattern
  → Bypasses topic suggestion flow entirely
  → Calls getArtifactContent → fetches artifact.content (user's description)
  → Calls conductDeepResearch → starts full pipeline
  → Status transitions: draft → research → foundations → ...
```

---

## Key Files Reference

| File | Purpose |
|---|---|
| `backend/src/services/ai/agents/portfolio/tools/contentTools.ts` | `suggestArtifactIdeas` (active tool), `listRecentArtifacts`, `getArtifactContent` |
| `backend/src/services/ai/tools/topicTools.ts` | Legacy unused topic tools (5 tools, never registered) |
| `backend/src/services/ai/agents/portfolio/tools/contextTools.ts` | `fetchArtifactTopics` (reads existing titles for dedup) |
| `backend/src/services/ai/agents/portfolio/prompt/systemPrompts.ts` | Request classification, topic suggestion workflow instructions |
| `backend/src/services/ai/AIService.ts` | Tool registry (lines 104-143), Claude model config, streaming |
| `backend/src/controllers/ai.controller.ts` | `streamChat` endpoint handler |
| `frontend/src/features/portfolio/pages/PortfolioPage.tsx` | Primary topic research entry point |
| `frontend/src/features/portfolio/components/chat/ChatPanel.tsx` | Suggestion card rendering, `handleCreateContent` |
| `frontend/src/features/portfolio/hooks/useAIChat.ts` | Transport layer, tool result parsing |
| `frontend/src/features/portfolio/hooks/useStructuredChat.ts` | Suggestion extraction, Zustand storage |

---

## Known Limitations

1. **No topic persistence** - Suggestions are not saved to the database. If the user refreshes or navigates away, suggestions are lost (only exist in the chat message history in Zustand).
2. **No web research during suggestion** - Topics are generated purely from the user's profile and Claude's training data. No Tavily/web search is used until content creation starts.
3. **No topic management** - Users cannot save, organize, or revisit topic ideas outside of the chat conversation.
4. **Unused tools** - `topicTools.ts` has 5 fully implemented tools for topic CRUD that are never registered. These could enable persistent topic management if activated.
5. **Temporary IDs** - Suggestion IDs are `suggestion-${Date.now()}-${index}`, not UUIDs. They're only used for React key rendering.

---

**Related Documentation:**
- [Content Creation Agent](./content-creation-agent.md) - Full pipeline after topic selection
- [Research Pipeline](./research-pipeline.md) - Deep research that runs after topic → artifact
- [Core Tools Reference](../ai-agents-and-prompts/core-tools-reference.md) - All registered AI tools
- [Pipeline Execution Flow](../ai-agents-and-prompts/pipeline-execution-flow.md) - Pipeline orchestration
- [Artifact Creation Flow](../flows/artifact-creation-flow.md) - End-to-end creation flow
