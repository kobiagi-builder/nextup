# Error Handling Reference

**Version:** 1.0.0
**Last Updated:** 2026-01-26
**Status:** Complete

## Overview

The Content Agent API uses standardized error responses across all endpoints. Each error includes a category, technical details, user-friendly messages, and recovery guidance. This reference documents all 13 error categories, their HTTP mappings, retry policies, and handling strategies.

## Error Response Format

All API errors return a consistent JSON structure:

```json
{
  "error": {
    "category": "ERROR_CATEGORY",
    "message": "Technical error message for debugging",
    "userMessage": "User-friendly explanation of what went wrong",
    "suggestedAction": "Clear guidance on what the user should do next",
    "recoverable": true,
    "context": {
      "additionalField": "value"
    }
  }
}
```

**Field Descriptions:**
- `category` - Error category enum value (see categories below)
- `message` - Technical error message for logging and debugging
- `userMessage` - User-friendly message safe to display in UI
- `suggestedAction` - Actionable guidance for the user
- `recoverable` - Whether the error can be recovered from
- `context` - Optional additional context (artifact ID, tool name, etc.)

## Error Categories

### Tool Errors

#### TOOL_EXECUTION_FAILED

A tool encountered an unexpected error during execution.

- **HTTP Status:** `500 Internal Server Error`
- **Recoverable:** Yes
- **Retryable:** Yes
- **User Message:** "The operation failed. Please try again."
- **Suggested Action:** "Retry the operation or contact support if the issue persists."

**Example Scenario:**
```json
{
  "error": {
    "category": "TOOL_EXECUTION_FAILED",
    "message": "conductDeepResearch failed: Database connection timeout",
    "userMessage": "The operation failed. Please try again.",
    "suggestedAction": "Retry the operation or contact support if the issue persists.",
    "recoverable": true,
    "context": {
      "toolName": "conductDeepResearch",
      "artifactId": "abc-123"
    }
  }
}
```

#### TOOL_TIMEOUT

A tool exceeded its execution time limit.

- **HTTP Status:** `504 Gateway Timeout`
- **Recoverable:** Yes
- **Retryable:** Yes
- **User Message:** "The operation timed out. Please try again."
- **Suggested Action:** "The system took too long to respond. Try again in a moment."

**Example Scenario:**
```json
{
  "error": {
    "category": "TOOL_TIMEOUT",
    "message": "writeFullContent exceeded 120 second timeout",
    "userMessage": "The operation timed out. Please try again.",
    "suggestedAction": "The system took too long to respond. Try again in a moment.",
    "recoverable": true,
    "context": {
      "toolName": "writeFullContent",
      "timeoutSeconds": 120
    }
  }
}
```

### AI Provider Errors

#### AI_PROVIDER_ERROR

The AI service encountered an error (Anthropic, Google, Tavily).

- **HTTP Status:** `502 Bad Gateway`
- **Recoverable:** Yes
- **Retryable:** Yes
- **User Message:** "AI service is temporarily unavailable."
- **Suggested Action:** "Wait a moment and try again. The AI service will be back shortly."

**Example Scenario:**
```json
{
  "error": {
    "category": "AI_PROVIDER_ERROR",
    "message": "Anthropic API returned 503 Service Unavailable",
    "userMessage": "AI service is temporarily unavailable.",
    "suggestedAction": "Wait a moment and try again. The AI service will be back shortly.",
    "recoverable": true,
    "context": {
      "provider": "anthropic",
      "model": "claude-sonnet-4-20250514"
    }
  }
}
```

#### AI_RATE_LIMIT

AI provider rate limit exceeded.

- **HTTP Status:** `429 Too Many Requests`
- **Recoverable:** Yes
- **Retryable:** No (user must wait)
- **User Message:** "Too many requests. Please wait a moment."
- **Suggested Action:** "You have exceeded the rate limit. Wait a few minutes before trying again."

**Example Scenario:**
```json
{
  "error": {
    "category": "AI_RATE_LIMIT",
    "message": "Anthropic rate limit: 50 requests per minute exceeded",
    "userMessage": "Too many requests. Please wait a moment.",
    "suggestedAction": "You have exceeded the rate limit. Wait a few minutes before trying again.",
    "recoverable": true,
    "context": {
      "provider": "anthropic",
      "retryAfterSeconds": 60
    }
  }
}
```

#### AI_CONTENT_FILTER

AI provider flagged content as unsafe or inappropriate.

- **HTTP Status:** `400 Bad Request`
- **Recoverable:** No
- **Retryable:** No
- **User Message:** "Content was flagged by safety filters."
- **Suggested Action:** "Review your content and remove any inappropriate language or topics."

**Example Scenario:**
```json
{
  "error": {
    "category": "AI_CONTENT_FILTER",
    "message": "Content filtered: Potential policy violation detected",
    "userMessage": "Content was flagged by safety filters.",
    "suggestedAction": "Review your content and remove any inappropriate language or topics.",
    "recoverable": false,
    "context": {
      "provider": "google",
      "filterReason": "HARM_CATEGORY_DANGEROUS_CONTENT"
    }
  }
}
```

### Artifact Errors

#### ARTIFACT_NOT_FOUND

The requested artifact does not exist.

- **HTTP Status:** `404 Not Found`
- **Recoverable:** No
- **Retryable:** No
- **User Message:** "Artifact not found."
- **Suggested Action:** "The artifact may have been deleted. Please refresh and try again."

**Example Scenario:**
```json
{
  "error": {
    "category": "ARTIFACT_NOT_FOUND",
    "message": "No artifact found with id: xyz-789",
    "userMessage": "Artifact not found.",
    "suggestedAction": "The artifact may have been deleted. Please refresh and try again.",
    "recoverable": false,
    "context": {
      "artifactId": "xyz-789"
    }
  }
}
```

#### INVALID_ARTIFACT_ID

The artifact ID format is invalid.

- **HTTP Status:** `400 Bad Request`
- **Recoverable:** No
- **Retryable:** No
- **User Message:** "Invalid artifact ID."
- **Suggested Action:** "The artifact ID is malformed. Please check your request."

**Example Scenario:**
```json
{
  "error": {
    "category": "INVALID_ARTIFACT_ID",
    "message": "Artifact ID must be a valid UUID, got: 'not-a-uuid'",
    "userMessage": "Invalid artifact ID.",
    "suggestedAction": "The artifact ID is malformed. Please check your request.",
    "recoverable": false,
    "context": {
      "providedId": "not-a-uuid"
    }
  }
}
```

#### INVALID_STATUS

The operation cannot be performed at the artifact's current status.

- **HTTP Status:** `400 Bad Request`
- **Recoverable:** No
- **Retryable:** No
- **User Message:** "This operation cannot be performed at the current artifact status."
- **Suggested Action:** "Complete the previous step before proceeding."

**Example Scenario:**
```json
{
  "error": {
    "category": "INVALID_STATUS",
    "message": "Cannot generate skeleton: artifact status is 'draft', expected 'researching'",
    "userMessage": "This operation cannot be performed at the current artifact status.",
    "suggestedAction": "Complete the previous step before proceeding.",
    "recoverable": false,
    "context": {
      "currentStatus": "draft",
      "expectedStatus": "researching",
      "operation": "generateContentSkeleton"
    }
  }
}
```

### Intent Errors

#### UNCLEAR_INTENT

The user's request could not be understood with sufficient confidence.

- **HTTP Status:** `400 Bad Request`
- **Recoverable:** Yes
- **Retryable:** No (requires clarification)
- **User Message:** "Your request was unclear."
- **Suggested Action:** "Please rephrase your request with more specific details."

**Example Scenario:**
```json
{
  "error": {
    "category": "UNCLEAR_INTENT",
    "message": "Intent detection confidence 0.45 below threshold 0.7",
    "userMessage": "Your request was unclear.",
    "suggestedAction": "Please rephrase your request with more specific details.",
    "recoverable": true,
    "context": {
      "message": "do something with this",
      "confidence": 0.45,
      "detectedIntent": "UNCLEAR"
    }
  }
}
```

#### MISSING_CONTEXT

Required context is missing from the request.

- **HTTP Status:** `400 Bad Request`
- **Recoverable:** Yes
- **Retryable:** No (requires additional context)
- **User Message:** "Additional context is needed."
- **Suggested Action:** "Please provide more information about what you want to accomplish."

**Example Scenario:**
```json
{
  "error": {
    "category": "MISSING_CONTEXT",
    "message": "Cannot determine artifact: screenContext.artifactId is undefined",
    "userMessage": "Additional context is needed.",
    "suggestedAction": "Please provide more information about what you want to accomplish.",
    "recoverable": true,
    "context": {
      "missingField": "artifactId",
      "currentPage": "portfolio"
    }
  }
}
```

### Research Errors

#### RESEARCH_NOT_FOUND

No research data exists for the artifact.

- **HTTP Status:** `404 Not Found`
- **Recoverable:** No
- **Retryable:** No
- **User Message:** "No research data found for this artifact."
- **Suggested Action:** "Run research first before proceeding with this operation."

**Example Scenario:**
```json
{
  "error": {
    "category": "RESEARCH_NOT_FOUND",
    "message": "No research data found for artifact abc-123",
    "userMessage": "No research data found for this artifact.",
    "suggestedAction": "Run research first before proceeding with this operation.",
    "recoverable": false,
    "context": {
      "artifactId": "abc-123",
      "operation": "generateContentSkeleton"
    }
  }
}
```

### Validation Errors

#### INVALID_TONE

The specified tone is not supported.

- **HTTP Status:** `400 Bad Request`
- **Recoverable:** No
- **Retryable:** No
- **User Message:** "Invalid tone specified."
- **Suggested Action:** "Choose a valid tone: professional, casual, or enthusiastic."

**Example Scenario:**
```json
{
  "error": {
    "category": "INVALID_TONE",
    "message": "Tone 'super-formal' is not valid. Valid tones: professional, casual, enthusiastic, friendly, authoritative, conversational, inspirational, educational",
    "userMessage": "Invalid tone specified.",
    "suggestedAction": "Choose a valid tone: professional, casual, or enthusiastic.",
    "recoverable": false,
    "context": {
      "providedTone": "super-formal",
      "validTones": ["professional", "casual", "enthusiastic", "friendly", "authoritative", "conversational", "inspirational", "educational"]
    }
  }
}
```

#### INVALID_CONTENT_TYPE

The specified content type is not supported.

- **HTTP Status:** `400 Bad Request`
- **Recoverable:** No
- **Retryable:** No
- **User Message:** "Invalid content type specified."
- **Suggested Action:** "Choose a valid content type: blog, social_post, or showcase."

**Example Scenario:**
```json
{
  "error": {
    "category": "INVALID_CONTENT_TYPE",
    "message": "Content type 'newsletter' is not valid. Valid types: blog, social_post, showcase",
    "userMessage": "Invalid content type specified.",
    "suggestedAction": "Choose a valid content type: blog, social_post, or showcase.",
    "recoverable": false,
    "context": {
      "providedType": "newsletter",
      "validTypes": ["blog", "social_post", "showcase"]
    }
  }
}
```

## Retry Policy

### Automatic Retry Configuration

The Content Agent system automatically retries certain errors using exponential backoff:

```typescript
{
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  retryableCategories: [
    'TOOL_EXECUTION_FAILED',
    'TOOL_TIMEOUT',
    'AI_PROVIDER_ERROR'
  ]
}
```

### Exponential Backoff Formula

```
delay = min(baseDelay * 2^attempt + random(0, baseDelay), maxDelay)
```

**Retry Delays:**
- Attempt 1: 1000-2000ms (1-2 seconds)
- Attempt 2: 2000-4000ms (2-4 seconds)
- Attempt 3: 4000-8000ms (4-8 seconds)
- Max delay: 10000ms (10 seconds)

**Jitter:** Random delay added to prevent thundering herd problem when multiple requests retry simultaneously.

### Circuit Breaker

If 5 consecutive errors occur, the circuit breaker opens:
- **Open State:** All requests fail immediately for 60 seconds
- **Half-Open State:** After 60 seconds, allow 1 request to test recovery
- **Closed State:** If test succeeds, resume normal operation

## Error Handling Examples

### Client-Side Handling (Frontend)

```typescript
async function executeContentAgent(message: string, context: ScreenContext) {
  try {
    const response = await fetch('/api/content-agent/execute', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message, screenContext: context })
    });

    if (!response.ok) {
      const errorData = await response.json();
      handleError(errorData.error);
      return;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Network error:', error);
    throw error;
  }
}

function handleError(error: ApiError) {
  // Check if error is retryable
  if (error.recoverable && isRetryable(error.category)) {
    // Implement exponential backoff retry
    retryWithBackoff(() => executeContentAgent(message, context));
  } else {
    // Show user message and suggested action
    showErrorNotification({
      title: error.userMessage,
      description: error.suggestedAction,
      severity: error.recoverable ? 'warning' : 'error'
    });
  }
}

function isRetryable(category: string): boolean {
  const retryableCategories = [
    'TOOL_EXECUTION_FAILED',
    'TOOL_TIMEOUT',
    'AI_PROVIDER_ERROR'
  ];
  return retryableCategories.includes(category);
}

async function retryWithBackoff(
  fn: () => Promise<any>,
  maxRetries = 3,
  baseDelay = 1000
) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;

      const delay = Math.min(
        baseDelay * Math.pow(2, attempt) + Math.random() * baseDelay,
        10000
      );
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

### Server-Side Handling (Backend)

```typescript
import { createErrorResponse, ErrorCategory } from './types/errors';

export async function executeContentAgent(
  message: string,
  context: ScreenContext
): Promise<ContentAgentResponse> {
  try {
    // Validate artifact exists
    const artifact = await getArtifact(context.artifactId);
    if (!artifact) {
      throw createErrorResponse(
        ErrorCategory.ARTIFACT_NOT_FOUND,
        `Artifact ${context.artifactId} not found`,
        { artifactId: context.artifactId }
      );
    }

    // Execute content agent
    return await contentAgent.processRequest(message, context);
  } catch (error) {
    // Map internal errors to standardized error responses
    if (error.category) {
      throw error; // Already a standardized error
    }

    // Unknown error - wrap in TOOL_EXECUTION_FAILED
    throw createErrorResponse(
      ErrorCategory.TOOL_EXECUTION_FAILED,
      error.message,
      { originalError: error.name }
    );
  }
}
```

## HTTP Status Code Summary

| Category | HTTP Status | Recoverable | Retryable | User Action |
|----------|-------------|-------------|-----------|-------------|
| TOOL_EXECUTION_FAILED | 500 | Yes | Yes | Retry |
| TOOL_TIMEOUT | 504 | Yes | Yes | Retry |
| AI_PROVIDER_ERROR | 502 | Yes | Yes | Retry |
| AI_RATE_LIMIT | 429 | Yes | No | Wait |
| AI_CONTENT_FILTER | 400 | No | No | Revise content |
| ARTIFACT_NOT_FOUND | 404 | No | No | Refresh |
| INVALID_ARTIFACT_ID | 400 | No | No | Check request |
| INVALID_STATUS | 400 | No | No | Complete previous step |
| UNCLEAR_INTENT | 400 | Yes | No | Clarify request |
| MISSING_CONTEXT | 400 | Yes | No | Provide context |
| RESEARCH_NOT_FOUND | 404 | No | No | Run research first |
| INVALID_TONE | 400 | No | No | Choose valid tone |
| INVALID_CONTENT_TYPE | 400 | No | No | Choose valid type |

## Best Practices

### For API Consumers

1. **Always check the `recoverable` flag** - Determines if the user should retry or abandon the operation
2. **Use the `suggestedAction` field** - Display this to users for clear guidance
3. **Implement exponential backoff** - For retryable errors, use increasing delays between retries
4. **Log technical messages** - Use the `message` field for debugging, not the `userMessage`
5. **Handle rate limits gracefully** - For 429 errors, respect `retryAfterSeconds` in context
6. **Display user-friendly errors** - Show `userMessage` in UI, not technical error details

### For Developers

1. **Use standardized error categories** - Don't create custom error types
2. **Include context** - Add relevant context (artifact ID, tool name, etc.) to errors
3. **Set correct HTTP status codes** - Follow the status code mappings above
4. **Make errors actionable** - Every error should have clear recovery guidance
5. **Log errors properly** - Include trace IDs, timestamps, and full context for debugging
6. **Test error scenarios** - Verify error handling for all 13 categories

## Related Documentation

- [content-agent-endpoints.md](./content-agent-endpoints.md) - API endpoint specifications
- [authentication-and-security.md](./authentication-and-security.md) - Security and rate limiting
- [pipeline-execution-flow.md](../ai-agents-and-prompts/pipeline-execution-flow.md) - Error recovery in pipeline

---

**Version History:**
- **1.0.0** (2026-01-26) - Initial error handling reference
