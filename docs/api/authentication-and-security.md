# Authentication and Security

**Version:** 1.0.0
**Last Updated:** 2026-01-26
**Status:** Complete

## Overview

The Content Agent API implements multiple security layers to protect user data and ensure authorized access. All endpoints require authentication, and additional security measures include rate limiting, prompt injection protection, and artifact ownership validation.

## Authentication

### Bearer Token Authentication

All API requests require a valid access token in the Authorization header:

```
Authorization: Bearer <access_token>
```

### Obtaining Access Token

**Endpoint**: `POST /api/auth/login`

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "your-password"
  }'
```

**Response**:
```json
{
  "user": {
    "id": "user-uuid",
    "email": "user@example.com"
  },
  "session": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "...",
    "expires_at": 1700086400
  }
}
```

## Security Layers

### 1. Authentication (requireAuth Middleware)

Validates access token on every request.

**Checks**:
- Token present in Authorization header
- Token format valid (Bearer scheme)
- Token not expired
- User exists in database

**Error Responses**:
- `401 Unauthorized` - Missing or invalid token
- `403 Forbidden` - Valid token but insufficient permissions

### 2. Rate Limiting

Prevents abuse through request throttling.

**Limits**:
- 10 requests per minute
- 100 requests per hour
- 20 pipeline executions per day

**Implementation**: In-memory rate limiter (MVP), Redis-based (future)

**Response Headers**:
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1700000060
```

**Error Response** (`429 Too Many Requests`):
```json
{
  "error": "Rate limit exceeded",
  "message": "Maximum 10 requests per minute exceeded"
}
```

### 3. Input Validation

Protects against prompt injection and malformed requests.

**Validation Rules**:
- Message: 1-10,000 characters
- No prompt injection patterns detected (15+ patterns)
- Valid UUID format for artifactId
- Valid enum values for status, type, tone

**Prompt Injection Patterns Blocked**:
- System prompt override attempts
- Instruction injection
- Role manipulation
- Token limit exploitation

**Error Response** (`400 Bad Request`):
```json
{
  "error": "Invalid request",
  "message": "Input contains suspicious patterns"
}
```

### 4. Artifact Ownership Validation

Ensures users can only access their own artifacts (future implementation).

**Validation Flow**:
```typescript
// Check artifact belongs to authenticated user
const { data: artifact } = await supabase
  .from('artifacts')
  .select('id')
  .eq('id', artifactId)
  .eq('user_id', userId)
  .single();

if (!artifact) {
  return res.status(403).json({ error: 'Access denied' });
}
```

## Security Best Practices

### For API Consumers

1. **Store tokens securely** - Use httpOnly cookies or secure storage
2. **Implement token refresh** - Refresh before expiration
3. **Handle rate limits** - Implement exponential backoff
4. **Validate responses** - Check success flags and error categories
5. **Use HTTPS** - Never send tokens over HTTP

### For Developers

1. **Never log tokens** - Sanitize logs to remove sensitive data
2. **Validate all inputs** - Check types, lengths, formats
3. **Use prepared statements** - Prevent SQL injection
4. **Implement CORS** - Restrict allowed origins
5. **Monitor for abuse** - Track failed auth attempts

## Related Documentation

- [content-agent-endpoints.md](./content-agent-endpoints.md) - API endpoint specifications
- [error-handling-reference.md](./error-handling-reference.md) - Error categories and responses

---

**Version History:**
- **1.0.0** (2026-01-26) - Initial security documentation
