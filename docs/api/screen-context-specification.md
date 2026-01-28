# Screen Context Specification

**Version:** 1.0.0
**Last Updated:** 2026-01-26
**Status:** Complete

## Overview

Screen context provides the Content Agent API with information about the user's current page and artifact state. This contextual awareness enables better intent detection, reduces clarification prompts, and allows for natural conversational requests like "research this" or "write it" by understanding what "this" and "it" refer to.

Including screen context in API requests is optional but highly recommended for the best user experience.

## ScreenContextPayload Interface

```typescript
interface ScreenContextPayload {
  currentPage: CurrentPage;
  artifactId?: string;
  artifactType?: ArtifactType;
  artifactTitle?: string;
  artifactStatus?: ArtifactStatus;
}
```

## Type Definitions

### CurrentPage

Identifies which page the user is currently viewing.

```typescript
type CurrentPage = 'dashboard' | 'portfolio' | 'artifact' | 'profile' | 'settings'
```

| Value | Description |
|-------|-------------|
| `dashboard` | User dashboard/home page |
| `portfolio` | Portfolio artifacts list view |
| `artifact` | Individual artifact detail page |
| `profile` | User profile settings page |
| `settings` | Application settings page |

### ArtifactType

The type of content being created or edited.

```typescript
type ArtifactType = 'social_post' | 'blog' | 'showcase'
```

| Value | Description | Examples |
|-------|-------------|----------|
| `social_post` | Social media posts | LinkedIn posts, Twitter threads |
| `blog` | Blog posts and articles | Medium articles, Substack posts, custom blogs |
| `showcase` | Case studies and project showcases | Success stories, project portfolios |

### ArtifactStatus

The current workflow status of the artifact.

```typescript
type ArtifactStatus =
  | 'draft'
  | 'research'
  | 'skeleton'
  | 'writing'
  | 'creating_visuals'
  | 'ready'
  | 'published'
```

| Status | Description | Editor State | User Actions |
|--------|-------------|--------------|--------------|
| `draft` | Initial state | Editable | Can research, edit content |
| `research` | AI researching topic | Locked | Wait for completion |
| `skeleton` | AI creating structure | Locked | Wait for completion |
| `writing` | AI writing content | Locked | Wait for completion |
| `creating_visuals` | AI generating images | Locked | Wait for completion |
| `ready` | Content ready to publish | Editable | Can edit, publish, or humanize |
| `published` | Content published | Editable | Editing transitions to ready |

**Status Workflow:**
```
draft → research → skeleton → writing → creating_visuals → ready → published
                                                                      ↓
                                                                   ready (on edit)
```

## Field Usage

### Required Fields

- **currentPage**: Always required. Indicates which page the user is viewing.

### Optional Fields (Artifact Page Only)

Include these fields only when `currentPage` is `'artifact'`:

- **artifactId**: UUID of the current artifact
- **artifactType**: Type of the artifact (social_post, blog, showcase)
- **artifactTitle**: Title of the artifact
- **artifactStatus**: Current status of the artifact

**Important**: Do not include artifact fields when on other pages (dashboard, portfolio, profile, settings).

## Example Payloads

### Dashboard Page

User is on the main dashboard with no specific artifact context.

```json
{
  "currentPage": "dashboard"
}
```

### Portfolio List Page

User is viewing their portfolio artifacts list.

```json
{
  "currentPage": "portfolio"
}
```

### Artifact Page - Draft Status

User is editing a draft blog post.

```json
{
  "currentPage": "artifact",
  "artifactId": "abc-123",
  "artifactType": "blog",
  "artifactTitle": "Getting Started with Product Management",
  "artifactStatus": "draft"
}
```

### Artifact Page - Ready Status

User has a social post ready to publish.

```json
{
  "currentPage": "artifact",
  "artifactId": "xyz-789",
  "artifactType": "social_post",
  "artifactTitle": "5 Tips for Better Stakeholder Communication",
  "artifactStatus": "ready"
}
```

### Artifact Page - Research Status

AI is currently researching a showcase.

```json
{
  "currentPage": "artifact",
  "artifactId": "def-456",
  "artifactType": "showcase",
  "artifactTitle": "Mobile App Redesign Success Story",
  "artifactStatus": "research"
}
```

## Frontend Integration

### Using useScreenContext Hook

The recommended way to provide screen context from a React application:

```typescript
import { useScreenContext } from '@/hooks/useScreenContext'

function ChatPanel() {
  const screenContext = useScreenContext()
  const [message, setMessage] = useState('')

  async function sendMessage() {
    try {
      const response = await fetch('/api/content-agent/execute', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message,
          screenContext  // Automatically includes page and artifact context
        })
      })

      const data = await response.json()
      // Handle response...
    } catch (error) {
      // Handle error...
    }
  }

  return (
    <div>
      <input value={message} onChange={e => setMessage(e.target.value)} />
      <button onClick={sendMessage}>Send</button>
    </div>
  )
}
```

### How useScreenContext Works

The `useScreenContext` hook automatically gathers context from:

1. **React Router pathname** - Determines `currentPage`
   - `/` → `dashboard`
   - `/portfolio` → `portfolio`
   - `/portfolio/artifacts/:id` → `artifact`
   - `/profile` → `profile`
   - `/settings` → `settings`

2. **URL parameters** - Extracts `artifactId` from route params

3. **React Query cache** - Fetches artifact details via `useArtifacts()` hook
   - Type, title, and status populated from cached data

4. **Returns complete payload** - All fields automatically populated

**Example Implementation:**

```typescript
export function useScreenContext(): ScreenContextPayload {
  const location = useLocation()
  const params = useParams<{ id?: string }>()
  const { data: artifacts } = useArtifacts()

  // Determine current page from pathname
  const currentPage = getCurrentPage(location.pathname)

  // If on artifact page, get artifact details
  const artifactId = params.id
  const artifact = artifactId && artifacts
    ? artifacts.find(a => a.id === artifactId)
    : undefined

  return {
    currentPage,
    artifactId: artifact?.id,
    artifactType: artifact?.type,
    artifactTitle: artifact?.title || undefined,
    artifactStatus: artifact?.status,
  }
}
```

## Intent Detection Benefits

Screen context dramatically improves the Content Agent's ability to understand user requests.

### Without Screen Context

```
User: "research this"
AI: "I need more information. What topic would you like me to research?"

User: "write it"
AI: "What would you like me to write? Please provide more details."
```

### With Screen Context

**Scenario**: User on artifact page with draft blog post about "Product Management Best Practices"

```json
{
  "currentPage": "artifact",
  "artifactId": "abc-123",
  "artifactType": "blog",
  "artifactTitle": "Product Management Best Practices",
  "artifactStatus": "draft"
}
```

**Interactions:**

```
User: "research this"
AI: ✓ Understands "this" = current artifact
    ✓ Sees status is "draft" (research is next step)
    ✓ Executes conductDeepResearch immediately

User: "write it"
AI: ✓ Understands "it" = current artifact
    ✓ Sees status is "skeleton" (writing is next step)
    ✓ Executes writeFullContent immediately
```

### Key Benefits

1. **Pronoun Resolution** - "this", "it", "the content" automatically resolve to current artifact
2. **Status Awareness** - Content Agent knows which operations are valid for current status
3. **Fewer Clarifications** - Natural requests work without additional context
4. **Conversational Flow** - Users can speak naturally without repeating artifact details

## Status-Aware Operations

The Content Agent uses `artifactStatus` to determine which operations are valid:

### Draft Status

```json
{ "artifactStatus": "draft" }
```

**Valid Operations:**
- "research this" → Executes `conductDeepResearch`
- "edit content" → User can edit directly

**Invalid Operations:**
- "write it" → Returns error: must research first

### Research Status

```json
{ "artifactStatus": "research" }
```

**Valid Operations:**
- Wait for AI to complete research

**Invalid Operations:**
- "write it" → Returns error: skeleton step required next

### Skeleton Status

```json
{ "artifactStatus": "skeleton" }
```

**Valid Operations:**
- "write it" → Executes `writeFullContent`
- "write the full content" → Executes `writeFullContent`

**Invalid Operations:**
- "humanize it" → Returns error: not yet at creating_visuals status

### Ready Status

```json
{ "artifactStatus": "ready" }
```

**Valid Operations:**
- "humanize it" → Executes `applyHumanityCheck`
- "check humanity" → Executes `checkContentHumanity` (validation only)
- Edit content directly
- Publish (manual user action)

## Request Examples

### Research Request

Start research on a draft blog post:

```bash
curl -X POST http://localhost:3001/api/content-agent/execute \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "message": "research this topic",
    "screenContext": {
      "currentPage": "artifact",
      "artifactId": "abc-123",
      "artifactType": "blog",
      "artifactTitle": "Product Management Best Practices",
      "artifactStatus": "draft"
    }
  }'
```

**Response:**

```json
{
  "text": "I'll research Product Management Best Practices from multiple sources...",
  "toolCalls": [{
    "id": "call_1",
    "name": "conductDeepResearch",
    "input": {
      "artifactId": "abc-123",
      "minRequired": 5
    }
  }],
  "toolResults": [{
    "toolCallId": "call_1",
    "result": {
      "success": true,
      "sourceCount": 7,
      "keyInsights": ["...", "...", "..."]
    }
  }],
  "conversationId": "session-xyz"
}
```

### Write Content Request

Generate full content after skeleton is ready:

```bash
curl -X POST http://localhost:3001/api/content-agent/execute \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "message": "write the full content",
    "screenContext": {
      "currentPage": "artifact",
      "artifactId": "abc-123",
      "artifactType": "blog",
      "artifactStatus": "skeleton"
    }
  }'
```

### Humanize Request

Apply humanity check to ready content:

```bash
curl -X POST http://localhost:3001/api/content-agent/execute \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "message": "humanize this content",
    "screenContext": {
      "currentPage": "artifact",
      "artifactId": "abc-123",
      "artifactType": "social_post",
      "artifactStatus": "ready"
    }
  }'
```

### Minimal Request (No Context)

The API still works without screen context, but requires more explicit instructions:

```bash
curl -X POST http://localhost:3001/api/content-agent/execute \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "message": "research product management best practices for artifact abc-123"
  }'
```

**Note**: Without context, user must explicitly mention the artifact ID and full topic.

## Best Practices

### For Frontend Developers

1. **Always provide currentPage** - This is the minimum required context
2. **Include all artifact fields** - When on artifact page, include ID, type, title, and status
3. **Use useScreenContext hook** - Automatic context gathering from router and cache
4. **Update on navigation** - Screen context should update when route changes
5. **Cache artifact data** - Use React Query to cache artifact details for instant context

**Example Setup:**

```typescript
// In your app root
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/portfolio/artifacts/:id" element={<ArtifactPage />} />
          {/* other routes */}
        </Routes>
      </Router>
    </QueryClientProvider>
  )
}

// In artifact page component
function ArtifactPage() {
  const screenContext = useScreenContext()  // Automatically populated

  return (
    <div>
      <ArtifactEditor />
      <ChatPanel screenContext={screenContext} />
    </div>
  )
}
```

### For API Consumers

1. **screenContext is optional** - API works without it, but user experience suffers
2. **More context = better experience** - Provide all available fields
3. **Validate status transitions** - Don't send invalid operations for current status
4. **Handle UNCLEAR_INTENT errors** - Missing context may trigger this error
5. **Handle MISSING_CONTEXT errors** - Insufficient context for ambiguous requests

**Error Handling:**

```typescript
async function sendMessage(message: string, context?: ScreenContextPayload) {
  try {
    const response = await fetch('/api/content-agent/execute', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, screenContext: context })
    })

    if (!response.ok) {
      const error = await response.json()

      if (error.error.category === 'UNCLEAR_INTENT') {
        // Request was too ambiguous without context
        toast.error('Please be more specific or provide more details')
      } else if (error.error.category === 'MISSING_CONTEXT') {
        // Required context not provided
        toast.error('Missing required information. Please provide artifact details.')
      }
    }
  } catch (error) {
    // Handle network error
  }
}
```

### For Backend Services

1. **Use context in intent detection** - Check screenContext before asking for clarification
2. **Validate status transitions** - Return INVALID_STATUS error for invalid operations
3. **Resolve pronouns** - Use artifactId from context to resolve "this", "it"
4. **Log context** - Include screen context in tracing for debugging

**Example Intent Detection:**

```typescript
function detectIntent(message: string, context: ScreenContextPayload) {
  // Use context to resolve ambiguous requests
  if (message.match(/research (this|it)/i) && context.artifactId) {
    return {
      intent: UserIntent.RESEARCH_TOPIC,
      confidence: 0.95,
      artifactId: context.artifactId
    }
  }

  // Check status for valid operations
  if (message.match(/write (it|content)/i)) {
    if (context.artifactStatus === 'skeleton') {
      return {
        intent: UserIntent.WRITE_CONTENT,
        confidence: 0.95,
        artifactId: context.artifactId
      }
    } else {
      return {
        intent: UserIntent.UNCLEAR_INTENT,
        confidence: 0.5,
        clarification: 'Artifact must be at skeleton status to write content'
      }
    }
  }
}
```

## Related Documentation

- [content-agent-endpoints.md](./content-agent-endpoints.md) - Complete API endpoint specifications
- [../ai-agents-and-prompts/intent-detection-guide.md](../ai-agents-and-prompts/intent-detection-guide.md) - How intent detection uses screen context
- [error-handling-reference.md](./error-handling-reference.md) - UNCLEAR_INTENT and MISSING_CONTEXT error handling

---

**Version History:**
- **1.0.0** (2026-01-26) - Initial screen context specification
