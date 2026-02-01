# Content Agent API Endpoints

**Version:** 2.0.0
**Last Updated:** 2026-01-29
**Base URL:** `http://localhost:3001` (development) | `https://api.yourapp.com` (production)

> **⚠️ IMPORTANT UPDATE**: This document has been updated for Phase 4 Writing Quality Enhancement. New endpoints added for foundations approval and writing characteristics.

## Overview

The Content Agent API provides a conversational interface for creating, managing, and refining content artifacts. All endpoints require authentication and support real-time content generation through intent detection and tool orchestration.

### Key Features

- **Conversational Interface**: Natural language requests for content operations
- **Intent Detection**: Automatic understanding of user requests (research, skeleton, writing, etc.)
- **Screen Context Integration**: Contextual awareness based on current page and artifact
- **Session Management**: Maintains conversation history across requests
- **Tool Orchestration**: Coordinates multiple AI tools (Claude, Gemini, Tavily)
- **Writing Quality Enhancement (Phase 4)**: Writing characteristics analysis and approval gate

### API Characteristics

- **Format**: REST API with JSON payloads
- **Authentication**: Bearer token via `Authorization` header
- **Rate Limiting**: 10 requests/minute, 100 requests/hour per user
- **Max Request Size**: 10,000 characters per message
- **Session Timeout**: 30 minutes of inactivity

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

### 1. Execute Content Agent Request

Execute a content agent request with natural language message and optional screen context.

**Endpoint**: `POST /api/content-agent/execute`

**Authentication**: Required

#### Request Body

```typescript
{
  message: string;              // User message (required, 1-10,000 chars)
  screenContext?: {             // Optional page context
    currentPage?: 'portfolio' | 'artifact' | 'dashboard' | 'chat';
    artifactId?: string;        // UUID of current artifact
    artifactType?: 'blog' | 'social_post' | 'showcase';
    artifactTitle?: string;     // Artifact title
    artifactStatus?: 'draft' | 'research' | 'foundations' | 'skeleton' | 'foundations_approval' | 'writing' | 'creating_visuals' | 'ready' | 'published';  // Phase 4: 9 statuses
  };
}
```

#### Request Validation

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `message` | string | ✅ Yes | Non-empty, max 10,000 characters |
| `screenContext` | object | ❌ No | Valid structure if provided |
| `screenContext.currentPage` | string | ❌ No | One of: portfolio, artifact, dashboard, chat |
| `screenContext.artifactId` | string | ❌ No | Valid UUID format |
| `screenContext.artifactType` | string | ❌ No | One of: blog, social_post, showcase |
| `screenContext.artifactStatus` | string | ❌ No | Valid artifact status value |

#### Response Body (Success)

**Status Code**: `200 OK`

```typescript
{
  text: string;                 // Agent's response text
  toolCalls?: Array<{           // Tools that were executed (if any)
    id: string;                 // Tool call UUID
    name: string;               // Tool name (e.g., 'conductDeepResearch')
    input: Record<string, unknown>;  // Tool input parameters
  }>;
  toolResults?: Array<{         // Results from tool executions
    toolCallId: string;         // Corresponding tool call ID
    result: Record<string, unknown>;  // Tool output
  }>;
  conversationId?: string;      // Session conversation ID
}
```

#### Example Request: Simple Message

```bash
curl -X POST http://localhost:3001/api/content-agent/execute \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Research AI in healthcare"
  }'
```

#### Example Response: Research Execution

```json
{
  "text": "I'll conduct deep research on AI in healthcare using 5+ sources (Reddit, LinkedIn, Quora, Medium, Substack). This will gather 20+ relevant insights to inform the content skeleton.",
  "toolCalls": [
    {
      "id": "call-abc-123",
      "name": "conductDeepResearch",
      "input": {
        "artifactId": "artifact-xyz-789",
        "topic": "AI in healthcare",
        "artifactType": "blog"
      }
    }
  ],
  "toolResults": [
    {
      "toolCallId": "call-abc-123",
      "result": {
        "success": true,
        "traceId": "ca-1700000000-abc123",
        "duration": 32451,
        "statusTransition": { "from": "draft", "to": "research" },
        "data": {
          "sourceCount": 18,
          "uniqueSourcesCount": 5,
          "sourcesBreakdown": {
            "reddit": 4,
            "linkedin": 5,
            "medium": 4,
            "quora": 3,
            "substack": 2
          }
        }
      }
    }
  ],
  "conversationId": "session-1700000000-xyz789"
}
```

#### Example Request: With Screen Context

```bash
curl -X POST http://localhost:3001/api/content-agent/execute \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "message": "write it",
    "screenContext": {
      "currentPage": "artifact",
      "artifactId": "abc-123-def-456",
      "artifactType": "blog",
      "artifactTitle": "AI in Healthcare",
      "artifactStatus": "skeleton"
    }
  }'
```

#### Example Response: Context-Enhanced

```json
{
  "text": "I'll write the full content for \"AI in Healthcare\" based on the skeleton. This will take approximately 60-90 seconds.",
  "toolCalls": [
    {
      "id": "call-def-456",
      "name": "writeFullContent",
      "input": {
        "artifactId": "abc-123-def-456",
        "tone": "professional"
      }
    }
  ],
  "toolResults": [
    {
      "toolCallId": "call-def-456",
      "result": {
        "success": true,
        "traceId": "ca-1700000100-def456",
        "duration": 72340,
        "statusTransition": { "from": "skeleton", "to": "creating_visuals" },
        "data": {
          "sectionsWritten": 5,
          "wordCount": 2450,
          "characterCount": 14892
        }
      }
    }
  ],
  "conversationId": "session-1700000000-xyz789"
}
```

#### Error Responses

**400 Bad Request** - Invalid request parameters

```json
{
  "error": "Invalid request",
  "message": "message field is required and must be a string"
}
```

```json
{
  "error": "Message too long",
  "message": "message must be 10,000 characters or less"
}
```

**401 Unauthorized** - Missing or invalid authentication

```json
{
  "error": "Unauthorized",
  "message": "No authentication token provided"
}
```

**500 Internal Server Error** - Server error

```json
{
  "error": "Internal server error",
  "message": "Tool execution failed: conductDeepResearch timeout"
}
```

---

### 2. Clear Session

Clear the current content agent session state and conversation history.

**Endpoint**: `POST /api/content-agent/clear-session`

**Authentication**: Required

#### Request Body

No request body required.

#### Response Body (Success)

**Status Code**: `200 OK`

```typescript
{
  success: boolean;             // Always true on success
  message: string;              // Confirmation message
}
```

#### Example Request

```bash
curl -X POST http://localhost:3001/api/content-agent/clear-session \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Example Response

```json
{
  "success": true,
  "message": "Session cleared successfully"
}
```

#### Use Cases

- **Start Fresh**: Begin new conversation without previous context
- **Context Switch**: Clear conversation when switching between artifacts
- **Session Reset**: Reset after 30-minute timeout warning
- **Testing**: Clear state between test scenarios

#### Error Responses

**401 Unauthorized** - Missing authentication

```json
{
  "error": "Unauthorized",
  "message": "No authentication token provided"
}
```

**500 Internal Server Error** - Server error

```json
{
  "error": "Internal server error",
  "message": "Failed to clear session"
}
```

---

### 3. Get Conversation History

Retrieve the current conversation history for the session.

**Endpoint**: `GET /api/content-agent/history`

**Authentication**: Required

#### Query Parameters

None.

#### Response Body (Success)

**Status Code**: `200 OK`

```typescript
{
  history: Array<{
    role: 'user' | 'assistant';   // Who sent the message
    content: string;               // Message content
    timestamp: number;             // Unix timestamp (ms since epoch)
    toolCalls?: Array<{            // Tool calls in this turn (if assistant message)
      name: string;
      input: Record<string, unknown>;
    }>;
  }>;
  count: number;                   // Total conversation turns
}
```

#### Example Request

```bash
curl -X GET http://localhost:3001/api/content-agent/history \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Example Response

```json
{
  "history": [
    {
      "role": "user",
      "content": "Research AI in healthcare",
      "timestamp": 1700000000000
    },
    {
      "role": "assistant",
      "content": "I'll conduct deep research on AI in healthcare...",
      "timestamp": 1700000001000,
      "toolCalls": [
        {
          "name": "conductDeepResearch",
          "input": { "artifactId": "abc-123", "topic": "AI in healthcare" }
        }
      ]
    },
    {
      "role": "user",
      "content": "Generate the skeleton",
      "timestamp": 1700000040000
    },
    {
      "role": "assistant",
      "content": "I'll create a content skeleton based on the research...",
      "timestamp": 1700000041000,
      "toolCalls": [
        {
          "name": "generateContentSkeleton",
          "input": { "artifactId": "abc-123", "tone": "professional" }
        }
      ]
    }
  ],
  "count": 4
}
```

#### Use Cases

- **Review Conversation**: See what has been discussed in current session
- **Debug Intent Detection**: Understand how agent interpreted previous messages
- **Context Recovery**: Recover conversation after page refresh
- **Audit Trail**: Log user interactions for analysis

#### Conversation History Limits

- **Max Turns Stored**: 10 conversation turns (older turns summarized)
- **Session Timeout**: History cleared after 30 minutes of inactivity
- **Per-Session**: Each user has independent conversation history

#### Error Responses

**401 Unauthorized** - Missing authentication

```json
{
  "error": "Unauthorized",
  "message": "No authentication token provided"
}
```

**500 Internal Server Error** - Server error

```json
{
  "error": "Internal server error",
  "message": "Failed to retrieve conversation history"
}
```

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

### 6. User Writing Examples CRUD (Phase 4 NEW)

Manage user's writing examples for style analysis.

#### 6a. List Writing Examples

**Endpoint**: `GET /api/user/writing-examples`

**Authentication**: Required

```bash
curl -X GET http://localhost:3001/api/user/writing-examples \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "examples": [
    {
      "id": "example-123",
      "name": "LinkedIn Post - Product Launch",
      "wordCount": 650,
      "sourceType": "manual",
      "isActive": true,
      "createdAt": "2026-01-28T10:00:00.000Z"
    }
  ],
  "count": 1
}
```

#### 6b. Create Writing Example

**Endpoint**: `POST /api/user/writing-examples`

**Authentication**: Required

**Request Body:**
```typescript
{
  name: string;                 // Example name (required)
  content: string;              // Example content (required, min 500 words)
  sourceType?: 'manual' | 'file' | 'artifact';  // Optional, defaults to 'manual'
}
```

```bash
curl -X POST http://localhost:3001/api/user/writing-examples \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "LinkedIn Post - Product Launch",
    "content": "Full text of example (500+ words)...",
    "sourceType": "manual"
  }'
```

**Response:**
```json
{
  "id": "example-123",
  "name": "LinkedIn Post - Product Launch",
  "wordCount": 650,
  "sourceType": "manual",
  "isActive": true,
  "createdAt": "2026-01-28T10:00:00.000Z"
}
```

**Error - Insufficient Word Count:**
```json
{
  "error": "Validation failed",
  "message": "Writing example must contain at least 500 words. Current word count: 342"
}
```

#### 6c. Update Writing Example

**Endpoint**: `PUT /api/user/writing-examples/:id`

**Authentication**: Required

```bash
curl -X PUT http://localhost:3001/api/user/writing-examples/example-123 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name",
    "isActive": false
  }'
```

#### 6d. Delete Writing Example

**Endpoint**: `DELETE /api/user/writing-examples/:id`

**Authentication**: Required

```bash
curl -X DELETE http://localhost:3001/api/user/writing-examples/example-123 \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "Writing example deleted successfully"
}
```

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
- [core-tools-reference.md](../ai-agents-and-prompts/core-tools-reference.md) - All 7 core content creation tools (v2.0.0)
- [context-tools-reference.md](../ai-agents-and-prompts/context-tools-reference.md) - Context fetching tools

### Workflow Execution
- [pipeline-execution-flow.md](../ai-agents-and-prompts/pipeline-execution-flow.md) - Full pipeline execution with Phase 4 approval gate (v2.0.0)
- [7-status-workflow-specification.md](../artifact-statuses/7-status-workflow-specification.md) - 9-status workflow specification (v3.0.0)

### Security & Context
- [authentication-and-security.md](./authentication-and-security.md) - Authentication flow and security measures
- [screen-context-specification.md](./screen-context-specification.md) - Screen context payload structure

### Error Handling
- [error-handling-reference.md](./error-handling-reference.md) - All 13 error categories with HTTP mappings

---

**Version History:**
- **2.0.0** (2026-01-29) - **Phase 4 Writing Quality Enhancement**:
  - Added `POST /api/artifacts/:id/approve-foundations` endpoint
  - Added `GET /api/artifacts/:id/writing-characteristics` endpoint
  - Added Writing Examples CRUD endpoints (GET, POST, PUT, DELETE)
  - Updated `artifactStatus` to include 9 statuses (added `foundations`, `foundations_approval`)
- **1.0.0** (2026-01-26) - Initial API documentation with all 3 endpoints
