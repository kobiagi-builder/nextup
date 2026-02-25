# API Endpoints

**Version:** 4.0.0
**Last Updated:** 2026-02-25
**Base URL:** `http://localhost:3001` (development) | `https://api.yourapp.com` (production)

> **⚠️ v4.0.0**: Content Agent refactored to Vercel AI SDK v6. Routes changed from `/api/content-agent/*` to `/api/ai/*`. `ContentAgent.ts` replaced by `AIService.ts`. Intent detection now handled implicitly by LLM tool-calling (no explicit `intentDetection.ts`).

## Overview

The API provides a conversational AI interface for creating, managing, and refining content artifacts. The AI backend uses **Vercel AI SDK v6** with `streamText`/`generateText` for multi-provider support (Anthropic Claude, OpenAI). All AI endpoints require authentication and support real-time content generation through LLM tool-calling orchestration.

### Key Features

- **Streaming Chat**: Real-time streaming responses via Vercel AI SDK v6 `streamText`
- **LLM Tool-Calling**: Claude autonomously decides which tools to invoke based on user message and context
- **Screen Context Integration**: Contextual awareness based on current page and artifact
- **Selection Context**: In-editor text/image selection context for content improvement
- **Multi-Provider**: Anthropic Claude (default) and OpenAI GPT-4o support
- **Pipeline Execution**: PipelineExecutor handles multi-step content creation workflows
- **Writing Quality Enhancement**: Writing characteristics analysis and approval gate

### API Characteristics

- **Format**: REST API with JSON payloads
- **Authentication**: Bearer token via `Authorization` header
- **Rate Limiting**: 10 requests/minute, 100 requests/hour per user
- **Streaming**: SSE (Server-Sent Events) for `/api/ai/chat/stream`
- **AI SDK**: Vercel AI SDK v6 message format (content or parts)

---

## Authentication

All Content Agent endpoints require authentication via Bearer token.

### Authentication Header

```
Authorization: Bearer <access_token>
```

### Obtaining Access Token

```bash
# Login to get access token
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "your-password"
  }'

# Response includes access_token
{
  "user": { "id": "user-uuid", "email": "user@example.com" },
  "session": { "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
}
```

### Authentication Errors

| Status | Error | Description |
|--------|-------|-------------|
| **401** | Unauthorized | Missing or invalid access token |
| **403** | Forbidden | Valid token but insufficient permissions |

---

## Endpoints

### Route Summary

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/ai/health` | Yes | AI service health check |
| `POST` | `/api/ai/chat` | Yes | Non-streaming AI chat (generateText) |
| `POST` | `/api/ai/chat/stream` | Yes | Streaming AI chat with tools (streamText) |
| `POST` | `/api/ai/generate` | Yes | Content generation |
| `POST` | `/api/artifacts/:id/approve-foundations` | Yes | Resume pipeline after approval |
| `GET` | `/api/artifacts/:id/writing-characteristics` | Yes | Get writing analysis |
| `GET` | `/api/user/writing-examples` | Yes | List writing examples |
| `GET` | `/api/user/writing-examples/:id` | Yes | Get single example |
| `POST` | `/api/user/writing-examples` | Yes | Create example (paste) |
| `PUT` | `/api/user/writing-examples/:id` | Yes | Update example |
| `DELETE` | `/api/user/writing-examples/:id` | Yes | Delete example |
| `POST` | `/api/user/writing-examples/upload` | Yes | Upload file |
| `POST` | `/api/user/writing-examples/extract-url` | Yes | Extract from file URL |
| `POST` | `/api/user/writing-examples/extract-publication` | Yes | Scrape publication URL |
| `POST` | `/api/user/writing-examples/:id/retry` | Yes | Retry failed extraction |
| `DELETE` | `/api/artifacts/:id` | Yes | Delete artifact + storage |
| `POST` | `/api/log` | No | Frontend logging bridge |
| `POST` | `/api/auth/migrate-data` | Yes | Auth data migration |

> **Migration note (v4.0.0)**: All `/api/content-agent/*` endpoints were removed. The AI chat functionality moved to `/api/ai/*` using Vercel AI SDK v6 message format. Session management is now handled by the frontend via conversation message arrays (no server-side session state).

---

### 1. Streaming AI Chat (Primary Endpoint)

Stream an AI response with tool execution. This is the primary chat endpoint used by the frontend.

**Endpoint**: `POST /api/ai/chat/stream`

**Authentication**: Required

**Implementation**: Uses Vercel AI SDK v6 `streamText` with `anthropic('claude-sonnet-4-20250514')` and all registered tools.

#### Request Body

Uses Vercel AI SDK v6 message format:

```typescript
{
  messages: Array<{
    role: 'user' | 'assistant';
    content?: string;              // Text content
    parts?: Array<any>;            // AI SDK parts format (alternative to content)
  }>;
  model?: 'claude-sonnet' | 'claude-haiku' | 'gpt-4o' | 'gpt-4o-mini';  // Default: claude-sonnet
  includeTools?: boolean;          // Default: true
  screenContext?: {
    currentPage: string;
    artifactId?: string;
    artifactType?: 'blog' | 'social_post' | 'showcase';
    artifactTitle?: string;
    artifactStatus?: string;
  };
  selectionContext?: {             // For in-editor content improvement
    type: 'text' | 'image';
    selectedText?: string | null;  // Max 5000 chars
    startPos?: number | null;
    endPos?: number | null;
    surroundingContext?: {
      before: string;              // Max 2000 chars
      after: string;               // Max 2000 chars
      sectionHeading: string | null;
    } | null;
    imageSrc?: string | null;
    imageNodePos?: number | null;
    artifactId?: string | null;
  };
}
```

#### Response

**Status Code**: `200 OK`
**Content-Type**: `text/event-stream` (SSE)

Returns a Vercel AI SDK v6 streaming response with text deltas and tool call results.

#### Example Request

```bash
curl -X POST http://localhost:3001/api/ai/chat/stream \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{ "role": "user", "content": "Research AI in healthcare" }],
    "screenContext": {
      "currentPage": "artifact",
      "artifactId": "abc-123",
      "artifactType": "blog",
      "artifactStatus": "draft"
    }
  }'
```

---

### 2. Non-Streaming AI Chat

Same as streaming but returns complete response. Used for programmatic calls.

**Endpoint**: `POST /api/ai/chat`

**Authentication**: Required

**Implementation**: Uses Vercel AI SDK v6 `generateText`.

#### Request/Response

Same request body as streaming endpoint. Returns complete JSON response:

```typescript
{
  text: string;
  toolCalls?: Array<{ id: string; name: string; input: Record<string, unknown> }>;
  toolResults?: Array<{ toolCallId: string; result: Record<string, unknown> }>;
}
```

---

### 3. Content Generation

Generate content using AI without chat context.

**Endpoint**: `POST /api/ai/generate`

**Authentication**: Required

---

### 4. AI Health Check

**Endpoint**: `GET /api/ai/health`

**Authentication**: Required

Returns AI service status and provider availability.

---

### 4. Approve Foundations (Phase 4 NEW)

Resume the content pipeline after user approves the foundations (skeleton + writing characteristics).

**Endpoint**: `POST /api/artifacts/:id/approve-foundations`

**Authentication**: Required

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Artifact ID |

#### Request Body

```typescript
{
  skeletonContent?: string;     // Optional: Updated skeleton content (if user edited it)
}
```

#### Response Body (Success)

**Status Code**: `200 OK`

```typescript
{
  success: boolean;             // Always true on success
  message: string;              // Confirmation message
  nextStatus: string;           // 'writing'
  artifactId: string;           // Artifact UUID
}
```

#### Example Request

```bash
curl -X POST http://localhost:3001/api/artifacts/abc-123/approve-foundations \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "skeletonContent": "# Updated Title\n\n## Section 1\n..."
  }'
```

#### Example Response

```json
{
  "success": true,
  "message": "Foundations approved. Starting content writing.",
  "nextStatus": "writing",
  "artifactId": "abc-123"
}
```

#### Preconditions

- Artifact must be in `foundations_approval` status
- User must own the artifact

#### Error Responses

**400 Bad Request** - Invalid artifact status

```json
{
  "error": "Invalid status",
  "message": "Artifact must be in 'foundations_approval' status to approve. Current status: skeleton"
}
```

**404 Not Found** - Artifact not found

```json
{
  "error": "Not found",
  "message": "Artifact with ID abc-123 not found"
}
```

---

### 5. Get Writing Characteristics (Phase 4 NEW)

Retrieve the AI-analyzed writing characteristics for an artifact.

**Endpoint**: `GET /api/artifacts/:id/writing-characteristics`

**Authentication**: Required

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Artifact ID |

#### Response Body (Success)

**Status Code**: `200 OK`

```typescript
{
  artifactId: string;
  characteristics: {
    tone?: { value: string; confidence: number; source: string; reasoning?: string };
    voice?: { value: string; confidence: number; source: string; reasoning?: string };
    sentence_structure?: { value: string; confidence: number; source: string; reasoning?: string };
    vocabulary_complexity?: { value: string; confidence: number; source: string; reasoning?: string };
    pacing?: { value: string; confidence: number; source: string; reasoning?: string };
    use_of_evidence?: { value: string; confidence: number; source: string; reasoning?: string };
    // ... 20+ additional characteristics
  };
  summary: string;              // Human-readable summary
  recommendations: string;      // Content generation recommendations
  createdAt: string;           // ISO timestamp
  updatedAt: string;           // ISO timestamp
}
```

#### Example Request

```bash
curl -X GET http://localhost:3001/api/artifacts/abc-123/writing-characteristics \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Example Response

```json
{
  "artifactId": "abc-123",
  "characteristics": {
    "tone": {
      "value": "professional",
      "confidence": 0.85,
      "source": "examples",
      "reasoning": "User's examples consistently use formal language with industry terminology"
    },
    "voice": {
      "value": "first-person-plural",
      "confidence": 0.70,
      "source": "mix",
      "reasoning": "Mix of 'we' statements in examples, appropriate for blog"
    },
    "sentence_structure": {
      "value": "varied",
      "confidence": 0.75,
      "source": "examples",
      "reasoning": "Examples show mix of simple and complex sentences"
    }
  },
  "summary": "Professional, authoritative writing style with moderate technical depth and conversational elements.",
  "recommendations": "Use industry terminology, maintain professional tone, include data-driven examples, vary sentence length for engagement.",
  "createdAt": "2026-01-29T10:00:00.000Z",
  "updatedAt": "2026-01-29T10:00:00.000Z"
}
```

#### Error Responses

**404 Not Found** - Characteristics not found

```json
{
  "error": "Not found",
  "message": "Writing characteristics for artifact abc-123 not found. Ensure artifact has passed 'foundations' status."
}
```

---

### 6. User Writing Examples (8 endpoints)

Manage user's writing references for style analysis. References are categorized by artifact type (blog, social_post, showcase) and support 4 upload methods: paste text, file upload, file URL extraction, and publication URL scraping.

#### 6a. List Writing Examples

**Endpoint**: `GET /api/user/writing-examples`

**Authentication**: Required

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `active_only` | boolean | `false` | Only return active examples |
| `artifact_type` | string | - | Filter by type: `blog`, `social_post`, `showcase` |

```bash
curl -X GET "http://localhost:3001/api/user/writing-examples?artifact_type=blog" \
  -H "Authorization: Bearer $TOKEN"
```

**Response (200):**
```json
{
  "examples": [
    {
      "id": "uuid-123",
      "user_id": "uuid-user",
      "name": "My LinkedIn Article",
      "content": "Full text content...",
      "word_count": 1200,
      "source_type": "pasted",
      "source_url": null,
      "artifact_type": "blog",
      "extraction_status": "success",
      "analyzed_characteristics": {},
      "is_active": true,
      "created_at": "2026-02-24T10:00:00.000Z",
      "updated_at": "2026-02-24T10:00:00.000Z"
    }
  ],
  "count": 1
}
```

**Error (400) - Invalid artifact_type:**
```json
{
  "error": "Validation error",
  "message": "artifact_type must be one of: blog, social_post, showcase"
}
```

#### 6b. Get Writing Example

**Endpoint**: `GET /api/user/writing-examples/:id`

**Authentication**: Required

**Response (200):** Single `UserWritingExample` object.
**Error (404):** Example not found or not owned by user.

#### 6c. Create Writing Example (Paste Text)

**Endpoint**: `POST /api/user/writing-examples`

**Authentication**: Required

**Request Body:**
```typescript
{
  name: string;                  // Required
  content: string;               // Required
  source_type?: 'pasted' | 'file_upload' | 'artifact' | 'url';  // Default: 'pasted'
  source_reference?: string;     // Optional
  artifact_type?: 'blog' | 'social_post' | 'showcase';  // Optional
}
```

```bash
curl -X POST http://localhost:3001/api/user/writing-examples \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Best Blog Post",
    "content": "Full text of example...",
    "source_type": "pasted",
    "artifact_type": "blog"
  }'
```

**Response (201):** Created `UserWritingExample` object.

#### 6d. Update Writing Example

**Endpoint**: `PUT /api/user/writing-examples/:id`

**Authentication**: Required (ownership verified)

**Request Body:**
```typescript
{
  name?: string;       // Non-empty if provided
  content?: string;    // Recalculates word_count, clears analyzed_characteristics
  is_active?: boolean;
}
```

**Response (200):** Updated `UserWritingExample` object.
**Error (403):** Not the owner.

#### 6e. Delete Writing Example

**Endpoint**: `DELETE /api/user/writing-examples/:id`

**Authentication**: Required (ownership verified)

**Response:** `204 No Content`
**Error (403):** Not the owner.

#### 6f. Upload File

**Endpoint**: `POST /api/user/writing-examples/upload`

**Authentication**: Required

**Content-Type**: `multipart/form-data`

**Form Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | .md, .txt, .docx, .pdf (max 10MB) |
| `name` | string | No | Display name (auto-detected from filename) |
| `artifact_type` | string | Yes | `blog`, `social_post`, or `showcase` |

```bash
curl -X POST http://localhost:3001/api/user/writing-examples/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@my-article.pdf" \
  -F "artifact_type=blog"
```

**Response (201):** Created `UserWritingExample` with extracted content.

**Supported MIME types:**
- `text/plain` (.txt)
- `text/markdown` (.md)
- `application/pdf` (.pdf) -- parsed via pdf-parse v2
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (.docx) -- parsed via mammoth

#### 6g. Extract from File URL

**Endpoint**: `POST /api/user/writing-examples/extract-url`

**Authentication**: Required

**Request Body:**
```typescript
{
  url: string;          // HTTPS URL to a .md/.txt/.docx/.pdf file
  name?: string;        // Optional (auto-detected from URL path)
  artifact_type: 'blog' | 'social_post' | 'showcase';
}
```

**Response (202):** `UserWritingExample` with `extraction_status: 'extracting'`.

Extraction happens asynchronously after response. Frontend polls `GET /api/user/writing-examples` every 2 seconds until status resolves to `success` or `failed`.

**SSRF Protection:** Private IPs (localhost, 127.x, 10.x, 192.168.x, 172.16-31.x) are blocked with 400 error.

#### 6h. Extract from Publication URL

**Endpoint**: `POST /api/user/writing-examples/extract-publication`

**Authentication**: Required
**Rate Limit**: 5 requests/user/minute

**Request Body:**
```typescript
{
  url: string;          // HTTPS URL to a publication
  name?: string;        // Optional (auto-detected from scraped title)
  artifact_type: 'blog' | 'social_post' | 'showcase';
}
```

**Response (202):** `UserWritingExample` with `extraction_status: 'extracting'`.

Scraping happens asynchronously. Supported platforms: LinkedIn, Medium, Substack, Reddit. Unknown URLs use a generic scraper (article/main/paragraph heuristic).

**Error (429):** Rate limit exceeded.

#### 6i. Retry Failed Extraction

**Endpoint**: `POST /api/user/writing-examples/:id/retry`

**Authentication**: Required (ownership verified)

**Conditions:**
- `extraction_status` must be `failed`
- `source_type` must be `url` (file uploads cannot be retried)

**Response (202):** `UserWritingExample` with `extraction_status: 'extracting'`.

Automatically detects whether to use file extractor or publication scraper based on URL pattern (file extensions like .md/.txt/.docx/.pdf use file extractor, all others use publication scraper).

---

### 7. Frontend Logging Bridge

Accept structured log messages from the frontend for server-side aggregation.

**Endpoint**: `POST /api/log`

**Authentication**: **Not required** (public endpoint)

#### Request Body

```typescript
{
  level?: string;       // Log level: 'debug' | 'info' | 'warn' | 'error' | 'log' (default: 'log')
  message?: string;     // Log message (default: 'No message')
  data?: unknown;       // Additional context data
}
```

#### Response Body (Success)

**Status Code**: `200 OK`

```json
{ "ok": true }
```

#### Notes

- This endpoint has **no authentication** to avoid blocking frontend error reporting
- Logs are processed by `logFrontend()` which applies the same sanitization as backend logs
- No PII should be sent from the frontend (see production logging security rules)

---

### 8. Auth Data Migration

Reassign anonymous/placeholder data to the authenticated user after login.

**Endpoint**: `POST /api/auth/migrate-data`

**Authentication**: Required

#### Request Body

None required. The authenticated user's ID is extracted from the JWT token.

#### Response Body (Success)

**Status Code**: `200 OK`

```typescript
{
  migrated: boolean;         // Whether any data was migrated
  tablesUpdated: string[];   // Tables that had rows reassigned
}
```

#### Example Request

```bash
curl -X POST http://localhost:3001/api/auth/migrate-data \
  -H "Authorization: Bearer $TOKEN"
```

#### Example Response

```json
{
  "migrated": true,
  "tablesUpdated": ["artifacts", "user_context", "skills"]
}
```

#### Notes

- **Idempotent**: Safe to call multiple times (no-op if already migrated)
- Called automatically by the frontend after first login
- Migrates data from placeholder user to authenticated user across all user-owned tables

---

### 9. Delete Artifact

Delete an artifact and clean up all associated storage objects.

**Endpoint**: `DELETE /api/artifacts/:id`

**Authentication**: Required

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Artifact ID to delete |

#### Response Body (Success)

**Status Code**: `200 OK`

```json
{ "success": true }
```

#### Cleanup Process

1. **Storage cleanup**: Lists and removes all files in `artifacts/{id}/` and `artifacts/{id}/images/final/` from Supabase Storage
2. **Database cascade**: Deletes the artifact row, which cascades to `artifact_research`, `artifact_writing_characteristics`, `ai_conversations`, and `artifact_interviews`
3. Storage failures are **non-blocking** — the artifact row is still deleted even if storage cleanup fails

#### Error Responses

**500 Internal Server Error** - Database deletion failed

```json
{ "error": "Failed to delete artifact" }
```

#### Notes

- Uses user-scoped Supabase client — RLS policies enforce ownership automatically
- Storage cleanup runs first to avoid orphaned files
- Cascading deletes handle all related records via foreign key constraints

---

## Error Handling Reference

### HTTP Status Codes

| Status Code | Meaning | When It Occurs |
|-------------|---------|----------------|
| **200** | OK | Successful request |
| **400** | Bad Request | Invalid request parameters (missing message, message too long, invalid format) |
| **401** | Unauthorized | Missing or invalid authentication token |
| **403** | Forbidden | Valid token but insufficient permissions (future: artifact ownership) |
| **429** | Too Many Requests | Rate limit exceeded (10/min, 100/hr) |
| **500** | Internal Server Error | Tool execution failure, database error, AI provider error |
| **502** | Bad Gateway | AI provider (Claude, Gemini, Tavily) unreachable |
| **504** | Gateway Timeout | Tool execution timeout, AI provider timeout |

### Error Response Format

All error responses follow consistent format:

```typescript
{
  error: string;                // Error category/type
  message: string;              // Human-readable error description
  details?: Record<string, unknown>;  // Additional error context (optional)
}
```

### Common Error Scenarios

#### 1. Missing Message Field

**Status**: `400 Bad Request`

```json
{
  "error": "Invalid request",
  "message": "message field is required and must be a string"
}
```

**Solution**: Ensure `message` field is present and is a string.

---

#### 2. Message Too Long

**Status**: `400 Bad Request`

```json
{
  "error": "Message too long",
  "message": "message must be 10,000 characters or less"
}
```

**Solution**: Truncate message to 10,000 characters or less.

---

#### 3. Unauthorized Access

**Status**: `401 Unauthorized`

```json
{
  "error": "Unauthorized",
  "message": "No authentication token provided"
}
```

**Solution**: Include `Authorization: Bearer <token>` header.

---

#### 4. Tool Execution Failure

**Status**: `500 Internal Server Error`

```json
{
  "error": "Internal server error",
  "message": "Tool execution failed: conductDeepResearch - Insufficient sources found"
}
```

**Solution**: Check tool-specific requirements (e.g., research needs 5+ sources).

---

#### 5. Rate Limit Exceeded

**Status**: `429 Too Many Requests`

```json
{
  "error": "Rate limit exceeded",
  "message": "Maximum 10 requests per minute exceeded. Try again in 30 seconds."
}
```

**Solution**: Implement exponential backoff and retry after specified time.

---

## Example Workflows

### Workflow 1: Full Content Pipeline

```bash
# Step 1: Create artifact and start research
curl -X POST http://localhost:3001/api/content-agent/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Create a blog post about quantum computing",
    "screenContext": { "currentPage": "portfolio" }
  }'

# Response: { text: "Starting full pipeline...", toolCalls: [...], conversationId: "session-xyz" }

# Step 2: Check progress (after 2 minutes)
curl -X GET http://localhost:3001/api/content-agent/history \
  -H "Authorization: Bearer $TOKEN"

# Response: { history: [...4 turns...], count: 4 }

# Step 3: Check if artifact is ready
curl -X POST http://localhost:3001/api/content-agent/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What's the status?",
    "screenContext": { "artifactId": "abc-123" }
  }'

# Response: { text: "Artifact is ready to publish (status: ready)..." }
```

---

### Workflow 2: Step-by-Step Interaction

```bash
# Step 1: Research
curl -X POST http://localhost:3001/api/content-agent/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "message": "Research blockchain in supply chain" }'

# Wait for research to complete (~30-60s)

# Step 2: Generate skeleton
curl -X POST http://localhost:3001/api/content-agent/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "message": "Create the skeleton" }'

# Wait for skeleton generation (~20-40s)

# Step 3: Write content
curl -X POST http://localhost:3001/api/content-agent/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "write it",
    "screenContext": {
      "artifactId": "abc-123",
      "artifactStatus": "skeleton"
    }
  }'
```

---

### Workflow 3: Session Management

```bash
# Start conversation
curl -X POST http://localhost:3001/api/content-agent/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "message": "Generate topics for tech blog" }'

# Response includes conversationId

# Continue conversation
curl -X POST http://localhost:3001/api/content-agent/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "message": "Use the first topic and create full content" }'

# Check history
curl -X GET http://localhost:3001/api/content-agent/history \
  -H "Authorization: Bearer $TOKEN"

# Clear session when switching context
curl -X POST http://localhost:3001/api/content-agent/clear-session \
  -H "Authorization: Bearer $TOKEN"
```

---

## Rate Limiting

### Limits

| Limit Type | Threshold | Reset Window |
|------------|-----------|--------------|
| **Per Minute** | 10 requests | 1 minute rolling window |
| **Per Hour** | 100 requests | 1 hour rolling window |
| **Pipeline Executions** | 20 per day | 24 hours |

### Rate Limit Headers

Response includes rate limit information in headers:

```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1700000060
```

### Handling Rate Limits

```typescript
// Exponential backoff implementation
async function executeWithRetry(request, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(request);

    if (response.status !== 429) {
      return response;
    }

    // Rate limited, wait and retry
    const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
    const delay = Math.min(1000 * Math.pow(2, attempt), retryAfter * 1000);
    await sleep(delay);
  }

  throw new Error('Rate limit exceeded after retries');
}
```

---

## Related Documentation

### Core Systems
- [system-prompt-specification.md](../ai-agents-and-prompts/system-prompt-specification.md) - System prompt with tool execution rules
- [intent-detection-guide.md](../ai-agents-and-prompts/intent-detection-guide.md) - How user messages are interpreted

### Tool References
- [core-tools-reference.md](../ai-agents-and-prompts/core-tools-reference.md) - All 13 content creation tools (v3.0.0)
- [context-tools-reference.md](../ai-agents-and-prompts/context-tools-reference.md) - Context fetching tools

### Workflow Execution
- [pipeline-execution-flow.md](../ai-agents-and-prompts/pipeline-execution-flow.md) - 3 pipeline paths with interview, social post, and improvement flows (v4.0.0)
- [STATUS_VALUES_REFERENCE.md](../artifact-statuses/STATUS_VALUES_REFERENCE.md) - 11-status workflow specification

### Security & Context
- [authentication-and-security.md](./authentication-and-security.md) - Authentication flow and security measures
- [screen-context-specification.md](./screen-context-specification.md) - Screen context payload structure

### Error Handling
- [error-handling-reference.md](./error-handling-reference.md) - All 13 error categories with HTTP mappings

---

**Version History:**
- **4.0.0** (2026-02-25) - **Content Agent Refactor to Vercel AI SDK v6**:
  - All `/api/content-agent/*` routes removed (ContentAgent.ts deleted)
  - New routes: `POST /api/ai/chat`, `POST /api/ai/chat/stream`, `POST /api/ai/generate`, `GET /api/ai/health`
  - AI backend now uses `AIService.ts` with Vercel AI SDK v6 `streamText`/`generateText`
  - Intent detection removed (LLM decides tools via tool-calling)
  - Server-side session state removed (frontend manages conversation via message arrays)
  - Request format changed to Vercel AI SDK v6 message format (content or parts)
  - Added `selectionContext` support for in-editor content improvement
- **3.0.0** (2026-02-20) - Phase 5: logging bridge, auth migration, artifact deletion
- **2.0.0** (2026-01-29) - Phase 4: foundations approval, writing characteristics, writing examples CRUD
- **1.0.0** (2026-01-26) - Initial API documentation
