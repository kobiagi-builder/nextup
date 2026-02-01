# Frontend Screen Context Integration

**Version:** 2.0.0
**Last Updated:** 2026-01-29
**Status:** Complete (Phase 4 Writing Quality Enhancement)

> **⚠️ IMPORTANT UPDATE**: This document has been updated for Phase 4 with 9-status workflow and foundations approval integration.

## Overview

The frontend implements a screen context system that automatically gathers contextual information about the user's current page and artifact state. This context is passed to the Content Agent API to enable natural language requests like "research this" or "write it" without requiring explicit artifact IDs or details.

**Key Benefits:**
- **Pronoun Resolution** - "this", "it", "the content" automatically resolve to current artifact
- **Natural Requests** - Users can speak naturally without repeating artifact details
- **Status Awareness** - Content Agent knows which operations are valid for current status
- **Fewer Clarifications** - Reduces back-and-forth with AI assistant

---

## Architecture

### High-Level Flow

```
User Action
    ↓
ArtifactPage Component
    ↓
useScreenContext Hook
    ↓
  ┌─────────────────┐
  │ Gather Context  │
  │ - React Router  │
  │ - URL Params    │
  │ - React Query   │
  └─────────────────┘
    ↓
ScreenContextPayload
    ↓
ChatPanel Component
    ↓
Content Agent API
```

### Component Integration

```typescript
// ArtifactPage.tsx (Lines 44-50)
import { useScreenContext } from '@/hooks/useScreenContext'

export function ArtifactPage() {
  const screenContext = useScreenContext()

  // Screen context automatically populated with:
  // - currentPage: 'artifact'
  // - artifactId: 'abc-123' (from URL params)
  // - artifactType: 'blog'
  // - artifactTitle: 'My Blog Post'
  // - artifactStatus: 'draft'

  return (
    <ChatPanel
      contextKey={`artifact:${id}`}
      screenContext={screenContext}  // Pass to AI assistant
    />
  )
}
```

---

## useScreenContext Hook

### Implementation

```typescript
/**
 * useScreenContext Hook
 *
 * Automatically gathers contextual information about the user's current
 * page and artifact state for the Content Agent API.
 *
 * Location: /frontend/src/hooks/useScreenContext.ts
 */

import { useLocation, useParams } from 'react-router-dom'
import { useArtifacts } from '@/features/portfolio/hooks/useArtifacts'

export interface ScreenContextPayload {
  currentPage: CurrentPage
  artifactId?: string
  artifactType?: ArtifactType
  artifactTitle?: string
  artifactStatus?: ArtifactStatus
}

type CurrentPage = 'dashboard' | 'portfolio' | 'artifact' | 'profile' | 'settings'

export function useScreenContext(): ScreenContextPayload {
  const location = useLocation()
  const params = useParams<{ id?: string }>()
  const { data: artifacts } = useArtifacts()

  // 1. Determine current page from pathname
  const currentPage = getCurrentPage(location.pathname)

  // 2. If on artifact page, get artifact details from React Query cache
  const artifactId = params.id
  const artifact = artifactId && artifacts
    ? artifacts.find(a => a.id === artifactId)
    : undefined

  // 3. Return complete payload
  return {
    currentPage,
    artifactId: artifact?.id,
    artifactType: artifact?.type,
    artifactTitle: artifact?.title || undefined,
    artifactStatus: artifact?.status,
  }
}

/**
 * Map React Router pathname to page identifier
 */
function getCurrentPage(pathname: string): CurrentPage {
  if (pathname === '/') return 'dashboard'
  if (pathname === '/portfolio') return 'portfolio'
  if (pathname.startsWith('/portfolio/artifacts/')) return 'artifact'
  if (pathname === '/profile') return 'profile'
  if (pathname === '/settings') return 'settings'
  return 'dashboard'
}
```

### How It Works

**Step 1: Page Detection**

The hook analyzes the React Router pathname to determine which page the user is viewing:

```typescript
// Pathname: /portfolio/artifacts/abc-123
getCurrentPage('/portfolio/artifacts/abc-123') → 'artifact'

// Pathname: /portfolio
getCurrentPage('/portfolio') → 'portfolio'

// Pathname: /
getCurrentPage('/') → 'dashboard'
```

**Step 2: URL Parameter Extraction**

For artifact pages, the hook extracts the artifact ID from URL parameters:

```typescript
// URL: /portfolio/artifacts/abc-123
useParams<{ id?: string }>() → { id: 'abc-123' }
```

**Step 3: React Query Cache Resolution**

The hook fetches artifact details from the React Query cache (populated by `useArtifacts()` hook):

```typescript
// React Query cache contains all artifacts fetched from database
const artifacts = [
  {
    id: 'abc-123',
    type: 'blog',
    title: 'My Blog Post',
    status: 'draft',
    content: '...',
    // ...
  },
  // ... more artifacts
]

// Find current artifact by ID
const artifact = artifacts.find(a => a.id === 'abc-123')
```

**Step 4: Complete Payload Assembly**

The hook returns a complete ScreenContextPayload with all available fields:

```typescript
// Result:
{
  currentPage: 'artifact',
  artifactId: 'abc-123',
  artifactType: 'blog',
  artifactTitle: 'My Blog Post',
  artifactStatus: 'draft'
}
```

---

## Page Detection Logic

### Route Mapping

| Pathname Pattern | Detected Page | Artifact Context |
|------------------|---------------|------------------|
| `/` | `dashboard` | None |
| `/portfolio` | `portfolio` | None |
| `/portfolio/artifacts/:id` | `artifact` | Full (ID, type, title, status) |
| `/profile` | `profile` | None |
| `/settings` | `settings` | None |

### Implementation

```typescript
function getCurrentPage(pathname: string): CurrentPage {
  if (pathname === '/') return 'dashboard'
  if (pathname === '/portfolio') return 'portfolio'
  if (pathname.startsWith('/portfolio/artifacts/')) return 'artifact'
  if (pathname === '/profile') return 'profile'
  if (pathname === '/settings') return 'settings'
  return 'dashboard' // Fallback
}
```

**Why `startsWith` for artifact routes?**
- Handles both `/portfolio/artifacts/abc-123` and potential query params
- Example: `/portfolio/artifacts/abc-123?autoResearch=true`

---

## Artifact Metadata Resolution

### React Query Caching Strategy

The `useArtifacts()` hook populates a React Query cache with all artifacts, enabling instant metadata resolution without additional API calls:

```typescript
// useArtifacts() hook implementation (Lines 39-75)
export function useArtifacts(options?: {
  type?: ArtifactType | 'all'
  status?: ArtifactStatus | 'all'
  search?: string
}) {
  const { type = 'all', status = 'all', search = '' } = options ?? {}

  return useQuery({
    queryKey: artifactKeys.list({ type, status }),
    queryFn: async () => {
      let query = supabase
        .from('artifacts')
        .select('*')
        .order('updated_at', { ascending: false })

      // Apply filters (type, status, search)
      if (type !== 'all') query = query.eq('type', type)
      if (status !== 'all') query = query.eq('status', status)
      if (search) query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`)

      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as Artifact[]
    },
  })
}
```

### Cache Population Flow

```
1. User navigates to /portfolio
   └─> PortfolioPage renders
       └─> Calls useArtifacts()
           └─> Fetches all artifacts from Supabase
               └─> Populates React Query cache with key ['artifacts', 'list', { type: 'all', status: 'all' }]

2. User clicks on artifact card
   └─> Navigate to /portfolio/artifacts/abc-123
       └─> ArtifactPage renders
           └─> Calls useScreenContext()
               └─> Calls useArtifacts() (returns cached data immediately)
                   └─> Finds artifact with ID 'abc-123' in cache
                       └─> Returns artifact metadata (type, title, status)
```

**Performance Benefits:**
- ✅ Zero additional API calls for screen context
- ✅ Instant metadata resolution from cache
- ✅ Automatic cache invalidation on mutations

### Individual Artifact Query

For the artifact page itself, a separate query fetches the specific artifact with real-time updates:

```typescript
// useArtifact() hook (Lines 82-100+)
export function useArtifact(id: string | null) {
  return useQuery({
    queryKey: artifactKeys.detail(id ?? ''),
    queryFn: async () => {
      if (!id) return null

      const { data, error } = await supabase
        .from('artifacts')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data as Artifact
    },
    enabled: !!id,
    // Poll every 2 seconds during processing states (Phase 4: 4 states)
    refetchInterval: (query) => {
      const artifact = query.state.data
      if (!artifact) return false

      // Phase 4: 'foundations' replaces 'skeleton' as processing state
      // 'skeleton' transitions quickly to 'foundations_approval' (not polled)
      const processingStates = ['research', 'foundations', 'writing', 'creating_visuals']
      return processingStates.includes(artifact.status) ? 2000 : false
    }
  })
}
```

**Key Features:**
- **Auto-polling** - Refetches every 2 seconds during processing states
- **Processing Detection** - Stops polling when artifact reaches `ready` or `published`
- **Real-time Updates** - Supabase Realtime subscription for instant status changes (ArtifactPage.tsx Lines 172-229)

---

## ArtifactPage Integration

### Screen Context Logging

```typescript
// ArtifactPage.tsx (Lines 44-50)
export function ArtifactPage() {
  const screenContext = useScreenContext()

  // Log screen context for debugging (future Content Agent integration)
  useEffect(() => {
    console.log('[ArtifactPage] Screen context:', screenContext)
  }, [screenContext])

  // ... rest of component
}
```

**Example Console Output:**
```json
{
  "currentPage": "artifact",
  "artifactId": "abc-123",
  "artifactType": "blog",
  "artifactTitle": "Product Management Best Practices",
  "artifactStatus": "draft"
}
```

### ChatPanel Integration (Future)

```typescript
// Current implementation (Lines 493-503)
<ChatPanel
  contextKey={`artifact:${id}`}
  title="Content Assistant"
  showHeader={false}
  height="100%"
  initialMessage={initialResearchMessage}
  data-testid="ai-chat-panel"
/>

// Future enhancement: Pass screenContext to ChatPanel
<ChatPanel
  contextKey={`artifact:${id}`}
  title="Content Assistant"
  screenContext={screenContext}  // ← Pass screen context here
  initialMessage={initialResearchMessage}
/>
```

**ChatPanel will then:**
1. Include `screenContext` in all Content Agent API requests
2. Enable natural language requests without explicit artifact IDs
3. Support status-aware operations (research, skeleton, writing, humanize)

---

## Real-Time Updates

### Supabase Realtime Subscription

ArtifactPage subscribes to Supabase Realtime for instant artifact updates:

```typescript
// ArtifactPage.tsx (Lines 172-229)
useEffect(() => {
  if (!id) return

  console.log('[ArtifactPage] Setting up Realtime subscription')

  // Subscribe to changes on this specific artifact
  const channel = supabase
    .channel(`artifact-${id}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'artifacts',
        filter: `id=eq.${id}`,
      },
      (payload) => {
        console.log('[ArtifactPage] Realtime update received:', {
          newStatus: payload.new.status,
          oldStatus: payload.old?.status,
          hasContent: !!payload.new.content,
          contentLength: payload.new.content?.length || 0,
        })

        // Invalidate artifact query to trigger refetch
        queryClient.invalidateQueries({ queryKey: ['artifact', id] })

        // If status changed, also invalidate research query
        if (payload.new.status !== payload.old?.status) {
          queryClient.invalidateQueries({ queryKey: ['research', id] })
        }
      }
    )
    .subscribe()

  // Cleanup subscription on unmount
  return () => {
    supabase.removeChannel(channel)
  }
}, [id, queryClient])
```

**Benefits:**
- **Instant UI Updates** - Status changes reflected immediately
- **No Polling** - WebSocket-based, efficient
- **Cache Invalidation** - Automatic React Query cache refresh

---

## Auto-Trigger Content Creation

### URL Parameter Detection

ArtifactPage auto-triggers content creation when navigating with `autoResearch=true` or `startCreation=true` query parameters:

```typescript
// ArtifactPage.tsx (Lines 99-121)
useEffect(() => {
  const autoResearch = searchParams.get('autoResearch')
  const startCreation = searchParams.get('startCreation')

  if ((autoResearch === 'true' || startCreation === 'true') && artifact?.title && artifact.status === 'draft') {
    console.log('[ArtifactPage] Auto content creation triggered:', {
      artifactId: artifact.id,
      artifactTitle: artifact.title,
      source: startCreation === 'true' ? 'create-modal' : 'portfolio-card',
    })

    // Set the content creation message to auto-send (artifact ID provided via screen context)
    const contentMessage = `Create content: "${artifact.title}"`
    setInitialResearchMessage(contentMessage)

    // Open AI Assistant (message will be sent by ChatPanel)
    setIsAIAssistantOpen(true)

    // Clear the URL parameter so it doesn't trigger again
    setSearchParams({}, { replace: true })
  }
}, [searchParams, setSearchParams, artifact?.title, artifact?.status, artifact?.id])
```

**Usage Examples:**

```typescript
// From CreateArtifactModal - Open artifact with auto-trigger
navigate(`/portfolio/artifacts/${newArtifact.id}?startCreation=true`)

// From PortfolioCard - Quick start content creation
navigate(`/portfolio/artifacts/${artifact.id}?autoResearch=true`)
```

**Flow:**
1. User creates artifact or clicks quick-start button
2. Navigate to artifact page with query param
3. ArtifactPage detects param and auto-opens AI Assistant
4. ChatPanel sends pre-filled message: `Create content: "Artifact Title"`
5. Content Agent receives request with full screen context
6. AI starts research/skeleton/writing pipeline automatically

---

## Status-Aware Operations

### Content Agent Intent Detection

The Content Agent uses screen context to determine which operations are valid for the current artifact status:

```typescript
// Backend: ContentAgent.detectIntent()
function detectIntent(message: string, screenContext: ScreenContext): IntentResult {
  const status = screenContext.artifactStatus

  // "research this" with draft status → conductDeepResearch
  if (message.match(/research (this|it)/i) && status === 'draft') {
    return {
      intent: UserIntent.RESEARCH_TOPIC,
      confidence: 0.95,
      artifactId: screenContext.artifactId
    }
  }

  // "write it" with skeleton status → writeFullContent
  if (message.match(/write (it|content)/i) && status === 'skeleton') {
    return {
      intent: UserIntent.WRITE_CONTENT,
      confidence: 0.95,
      artifactId: screenContext.artifactId
    }
  }

  // "humanize it" with creating_visuals or ready status → applyHumanityCheck
  if (message.match(/humanize (this|it)/i) && (status === 'creating_visuals' || status === 'ready')) {
    return {
      intent: UserIntent.HUMANIZE_CONTENT,
      confidence: 0.95,
      artifactId: screenContext.artifactId
    }
  }

  // Invalid operation for current status
  return {
    intent: UserIntent.UNCLEAR_INTENT,
    confidence: 0.5,
    clarification: `Cannot perform this operation. Artifact is in ${status} status.`
  }
}
```

**Status-Based Valid Operations (Phase 4 - 9 Statuses):**

| Status | Valid Operations | Invalid Operations |
|--------|-----------------|-------------------|
| `draft` | Research, Edit | Write, Humanize, Publish |
| `research` | Wait | Edit, Write, Humanize |
| `foundations` | Wait | Edit, Write, Humanize |
| `skeleton` | Wait | Edit, Write, Humanize |
| `foundations_approval` | Approve, Edit Skeleton | Research, Write, Humanize |
| `writing` | Wait | Edit, Research, Humanize |
| `creating_visuals` | Humanize, Wait | Edit, Research, Write |
| `ready` | Humanize, Edit, Publish | Research, Write |
| `published` | Edit (→ ready) | Research, Write, Humanize |

**Phase 4 Key Changes:**
- **`foundations`**: AI analyzing writing characteristics (processing state, polling enabled)
- **`foundations_approval`**: Pipeline PAUSED - user reviews skeleton + characteristics, clicks "Foundations Approved"
- **`skeleton`**: Brief transition state, quickly moves to `foundations_approval` (not polled)

---

## Cache Management

### Query Key Structure

```typescript
// artifactKeys (Lines 23-30)
export const artifactKeys = {
  all: ['artifacts'] as const,
  lists: () => [...artifactKeys.all, 'list'] as const,
  list: (filters: { type?: ArtifactType | 'all'; status?: ArtifactStatus | 'all' }) =>
    [...artifactKeys.lists(), filters] as const,
  details: () => [...artifactKeys.all, 'detail'] as const,
  detail: (id: string) => [...artifactKeys.details(), id] as const,
}
```

**Query Keys Generated:**
- All artifacts list: `['artifacts', 'list', { type: 'all', status: 'all' }]`
- Filtered list: `['artifacts', 'list', { type: 'blog', status: 'draft' }]`
- Single artifact: `['artifacts', 'detail', 'abc-123']`
- All research: `['research', 'abc-123']`

### Cache Invalidation Strategy

```typescript
// Manual invalidation after mutations
await updateArtifact.mutateAsync({ id, updates })
queryClient.invalidateQueries({ queryKey: ['artifacts'] })  // Invalidate all artifact queries

// Specific artifact invalidation
queryClient.invalidateQueries({ queryKey: ['artifact', artifactId] })

// Invalidate research when status changes
if (payload.new.status !== payload.old?.status) {
  queryClient.invalidateQueries({ queryKey: ['research', artifactId] })
}
```

**Cache Lifecycle:**
1. **Population** - `useArtifacts()` fetches and caches all artifacts
2. **Resolution** - `useScreenContext()` reads from cache (no API call)
3. **Updates** - Mutations automatically invalidate affected queries
4. **Realtime** - Supabase Realtime triggers manual invalidation
5. **Refetch** - React Query automatically refetches invalidated queries

---

## Testing Screen Context

### Development Console Logging

```typescript
// Enable detailed screen context logging
useEffect(() => {
  console.log('[ArtifactPage] Screen context:', {
    currentPage: screenContext.currentPage,
    artifactId: screenContext.artifactId,
    artifactType: screenContext.artifactType,
    artifactTitle: screenContext.artifactTitle,
    artifactStatus: screenContext.artifactStatus,
  })
}, [screenContext])
```

### Test Scenarios

**Scenario 1: Portfolio List Page**
```
URL: /portfolio
Expected Screen Context:
{
  currentPage: 'portfolio'
  // No artifact fields
}
```

**Scenario 2: Draft Artifact**
```
URL: /portfolio/artifacts/abc-123
Artifact Status: draft

Expected Screen Context:
{
  currentPage: 'artifact',
  artifactId: 'abc-123',
  artifactType: 'blog',
  artifactTitle: 'My Blog Post',
  artifactStatus: 'draft'
}
```

**Scenario 3: Ready Artifact**
```
URL: /portfolio/artifacts/xyz-789
Artifact Status: ready

Expected Screen Context:
{
  currentPage: 'artifact',
  artifactId: 'xyz-789',
  artifactType: 'social_post',
  artifactTitle: '5 Tips for Better Stakeholder Communication',
  artifactStatus: 'ready'
}
```

**Scenario 4: Dashboard**
```
URL: /
Expected Screen Context:
{
  currentPage: 'dashboard'
  // No artifact fields
}
```

---

## Future Enhancements

### ChatPanel Screen Context Integration

**Current State:**
- Screen context gathered by `useScreenContext()` in ArtifactPage
- Not yet passed to ChatPanel component

**Future Integration:**
```typescript
// ArtifactPage.tsx
<ChatPanel
  contextKey={`artifact:${id}`}
  screenContext={screenContext}  // Pass to ChatPanel
/>

// ChatPanel.tsx
interface ChatPanelProps {
  contextKey: string
  screenContext?: ScreenContextPayload  // New prop
}

function ChatPanel({ contextKey, screenContext }: ChatPanelProps) {
  const sendMessage = async (message: string) => {
    const response = await fetch('/api/content-agent/execute', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message,
        screenContext  // Include in API request
      })
    })
  }
}
```

### Additional Context Fields

**Potential Future Fields:**
```typescript
interface ScreenContextPayload {
  // Current fields
  currentPage: CurrentPage
  artifactId?: string
  artifactType?: ArtifactType
  artifactTitle?: string
  artifactStatus?: ArtifactStatus

  // Future fields
  researchCount?: number          // Number of research sources
  contentLength?: number          // Word count
  lastModified?: Date             // Last edit timestamp
  tone?: ToneOption               // Selected tone
  collaborators?: string[]        // User IDs (multi-user future)
}
```

---

## Related Documentation

- [screen-context-specification.md](../../api/screen-context-specification.md) - Complete ScreenContext payload specification
- [content-agent-endpoints.md](../../api/content-agent-endpoints.md) - API endpoint that receives screen context
- [intent-detection-guide.md](../../ai-agents-and-prompts/intent-detection-guide.md) - How Content Agent uses screen context

---

**Version History:**
- **2.0.0** (2026-01-29) - **Phase 4 Writing Quality Enhancement**:
  - Updated processing states from 4 to 4 (replaced `skeleton` with `foundations`)
  - Added `foundations` and `foundations_approval` to Status-Based Valid Operations table
  - Updated useArtifact hook example with Phase 4 processing states
  - Added Phase 4 key changes documentation
- **1.0.0** (2026-01-26) - Initial frontend screen context integration documentation
