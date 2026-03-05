# NextUp Security Audit Report

**Date:** 2026-03-05
**Auditor:** Claude Opus 4.6 (Security Specialist Agent)
**Scope:** Full-stack audit -- React frontend, Node.js/Express backend, Supabase database
**Methodology:** OWASP Top 10:2021, SANS 25, manual code review, automated scanning

---

## Executive Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 2     |
| HIGH     | 5     |
| MEDIUM   | 8     |
| LOW      | 4     |
| INFO     | 3     |
| **Total** | **22** |

**Overall Security Posture: MODERATE**

The application demonstrates solid foundational security practices: Supabase JWT auth is properly verified server-side, all database tables have RLS enabled with user-scoped policies, Zod validation is used consistently on API inputs, and DOMPurify sanitizes markdown-rendered HTML. However, there are critical gaps in the unauthenticated log endpoint (log injection / DoS vector), a vulnerable DOMPurify version with a known XSS bypass, missing rate limiting on most API routes, and several information disclosure issues.

---

## CRITICAL Findings

### Finding #1: Unauthenticated Log Endpoint Allows Log Injection and Denial of Service

**Severity:** CRITICAL
**Category:** A01:2021 -- Broken Access Control / A04:2021 -- Insecure Design
**CWE:** CWE-117 (Log Injection), CWE-400 (Uncontrolled Resource Consumption)

**Location:** `backend/src/routes/index.ts` lines 20-24

**Description:**
The `/api/log` POST endpoint is publicly accessible with no authentication, no rate limiting, and no input validation. It accepts arbitrary `level`, `message`, and `data` fields from any caller and writes them directly to the server's log file via `logFrontend()`.

```typescript
// backend/src/routes/index.ts:20-24
router.post('/log', (req, res) => {
  const { level, message, data } = req.body
  logFrontend(level || 'log', message || 'No message', data)
  res.status(200).json({ ok: true })
})
```

**Impact:**
1. **Log injection:** An attacker can inject arbitrary log entries, including fake error messages, misleading audit trails, or entries designed to exploit log analysis tools (e.g., ANSI escape codes, JSON injection).
2. **Disk exhaustion DoS:** No rate limiting means an attacker can flood the endpoint, filling the server's disk via `fs.appendFileSync` in `logger.ts` (line 36). The log file grows unbounded.
3. **Log file corruption:** Since `logFrontend` calls `writeToFile` which uses `fs.appendFileSync`, heavy concurrent writes could degrade server performance.

**Proof of Concept:**
```bash
# Flood the server log with 10,000 entries
for i in $(seq 1 10000); do
  curl -s -X POST http://localhost:3001/api/log \
    -H "Content-Type: application/json" \
    -d '{"level":"error","message":"FAKE CRITICAL: Database breach detected","data":{"attacker":"injected"}}' &
done
```

**Recommendation:**
1. Add `requireAuth` middleware to the `/api/log` endpoint
2. Add rate limiting (e.g., `createRateLimiter({ windowMs: 60000, maxRequests: 20 })`)
3. Validate `level` to an allowlist (`log`, `warn`, `error`, `info`, `debug`)
4. Cap `message` length (e.g., 1000 chars) and `data` size
5. Consider removing this endpoint entirely and using frontend-only logging

```typescript
// FIXED
router.post('/log', requireAuth, createRateLimiter({ windowMs: 60000, maxRequests: 20 }), (req, res) => {
  const levelSchema = z.enum(['log', 'info', 'warn', 'error', 'debug'])
  const schema = z.object({
    level: levelSchema.optional(),
    message: z.string().max(1000).optional(),
    data: z.record(z.unknown()).optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid log entry' })
  logFrontend(parsed.data.level || 'log', parsed.data.message || 'No message', parsed.data.data)
  res.status(200).json({ ok: true })
})
```

---

### Finding #2: Vulnerable DOMPurify Version (Known XSS Bypass)

**Severity:** CRITICAL
**Category:** A06:2021 -- Vulnerable and Outdated Components / A03:2021 -- Injection
**CWE:** CWE-79 (Cross-site Scripting)

**Location:** `frontend/package.json` -- `dompurify` 3.1.3-3.3.1 range

**Description:**
The npm audit reports `dompurify` has a known XSS vulnerability (GHSA-v2wj-7wpq-c8vv). DOMPurify is used in **5 components** to sanitize AI-generated and user-provided markdown content before rendering via `dangerouslySetInnerHTML`:

- `frontend/src/features/portfolio/components/chat/ChatMessage.tsx:98`
- `frontend/src/features/customers/components/chat/CustomerChatPanel.tsx:254`
- `frontend/src/features/portfolio/components/writing-references/ReferenceDetailSheet.tsx:144`
- `frontend/src/features/portfolio/components/chat/DiscussionSection.tsx:45`
- `frontend/src/features/portfolio/components/chat/StructuredChatMessage.tsx:206`

**Impact:**
If an attacker can control content that flows through these components (e.g., via AI prompt injection, or stored XSS in writing examples or artifact content), they could bypass DOMPurify and execute arbitrary JavaScript in the user's browser, leading to session hijacking, data theft, or account takeover.

**Recommendation:**
```bash
cd frontend && npm audit fix
# Or explicitly:
npm install dompurify@latest
```

Verify the fix resolves GHSA-v2wj-7wpq-c8vv.

---

## HIGH Findings

### Finding #3: Supabase Project URL Exposed in Committed Example File

**Severity:** HIGH
**Category:** A02:2021 -- Cryptographic Failures / A05:2021 -- Security Misconfiguration
**CWE:** CWE-200 (Information Exposure)

**Location:** `backend/.env.gemini-mock` line 9

**Description:**
The file `backend/.env.gemini-mock` is checked into git and contains the real Supabase project URL:

```
SUPABASE_URL=https://ohwubfmipnpguunryopl.supabase.co
```

While the anon key and service role key use placeholders, the project URL itself reveals the exact Supabase instance, enabling targeted attacks against the Supabase API, auth endpoints, and storage.

**Recommendation:**
1. Replace with placeholder: `SUPABASE_URL=https://xxx.supabase.co`
2. Add `backend/.env.gemini-mock` to `.gitignore` or replace with a true template
3. Scrub the URL from git history if considered sensitive

---

### Finding #4: No Rate Limiting on AI Chat Endpoints (Cost-Based DoS)

**Severity:** HIGH
**Category:** A04:2021 -- Insecure Design
**CWE:** CWE-770 (Allocation of Resources Without Limits)

**Location:** `backend/src/routes/ai.ts` lines 16-18

**Description:**
The AI endpoints (`/api/ai/chat`, `/api/ai/chat/stream`, `/api/ai/generate`) have no rate limiting applied. While they require authentication, a compromised or malicious authenticated user can make unlimited AI API calls, incurring substantial costs (Anthropic/OpenAI billing). The `rateLimiter.ts` middleware exists but is not applied to these routes.

```typescript
// backend/src/routes/ai.ts -- NO rate limiting applied
aiRouter.post('/chat', aiController.chat)
aiRouter.post('/chat/stream', aiController.streamChat)
aiRouter.post('/generate', aiController.generateContent)
```

**Impact:**
An authenticated user could run up thousands of dollars in AI API costs through rapid automated requests.

**Recommendation:**
```typescript
import { perMinuteLimit, dailyPipelineLimit } from '../middleware/rateLimiter.js'

aiRouter.post('/chat', perMinuteLimit, aiController.chat)
aiRouter.post('/chat/stream', perMinuteLimit, aiController.streamChat)
aiRouter.post('/generate', dailyPipelineLimit, aiController.generateContent)
```

---

### Finding #5: Stack Traces Exposed in Development Mode Error Responses

**Severity:** HIGH
**Category:** A05:2021 -- Security Misconfiguration
**CWE:** CWE-209 (Generation of Error Message Containing Sensitive Information)

**Location:** `backend/src/middleware/errorHandler.ts` lines 49, 60-61

**Description:**
When `NODE_ENV=development`, the error handler returns full stack traces and detailed error messages to the client:

```typescript
// Line 49: Supabase error path
...(process.env.NODE_ENV === 'development' && { detail: err.message }),

// Lines 59-62: General error path
res.status(statusCode).json({
  error: message,
  ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
})
```

If the production environment variable is not properly set (a common deployment misconfiguration), stack traces including file paths, dependency versions, and internal implementation details leak to attackers.

**Impact:**
Stack traces reveal internal paths (`/app/backend/src/services/...`), module versions, and error handling logic that aids attackers in crafting targeted exploits.

**Recommendation:**
1. Verify `NODE_ENV=production` is enforced in all deployment environments
2. Consider removing stack trace exposure entirely -- use structured logging instead
3. Add an explicit check: `if (process.env.NODE_ENV !== 'production')` with a fallback

---

### Finding #6: Rate Limiter Logs userId in Plain Text

**Severity:** HIGH
**Category:** A09:2021 -- Security Logging and Monitoring Failures
**CWE:** CWE-532 (Insertion of Sensitive Information into Log File)

**Location:** `backend/src/middleware/rateLimiter.ts` lines 152, 223

**Description:**
The rate limiter logs `userId` as a direct value, not as a boolean flag, violating the project's own PII logging policy:

```typescript
// Line 152
logger.warn('[RateLimiter] Rate limit exceeded', {
  userId,        // PII: direct user ID logged
  endpoint,
  count: entry.count,
  ...
});

// Line 223
logger.info('[RateLimiter] Rate limit reset', { userId, endpoint });
```

**Recommendation:**
```typescript
logger.warn('[RateLimiter] Rate limit exceeded', {
  hasUserId: !!userId,
  endpoint,
  count: entry.count,
  limit: config.maxRequests,
  windowMs: config.windowMs,
});
```

---

### Finding #7: Multer Denial of Service via Uncontrolled Recursion (CVE)

**Severity:** HIGH
**Category:** A06:2021 -- Vulnerable and Outdated Components
**CWE:** CWE-674 (Uncontrolled Recursion)

**Location:** Backend dependency -- `multer < 2.1.1`

**Description:**
The backend uses `multer` for file uploads (LinkedIn CSV import, writing example uploads). The installed version is vulnerable to GHSA-5528-5vmv-3xc2 -- a DoS via uncontrolled recursion that can crash the Node.js process with a crafted multipart form upload.

**Recommendation:**
```bash
cd backend && npm audit fix
```

---

## MEDIUM Findings

### Finding #8: Placeholder User RLS Policies Grant Public Access to Specific UUID

**Severity:** MEDIUM
**Category:** A01:2021 -- Broken Access Control
**CWE:** CWE-284 (Improper Access Control)

**Location:** Database RLS policies on `artifacts`, `ai_conversations`, `skills`, `style_examples`, `user_context`, `user_preferences`, `artifact_research`

**Description:**
Multiple tables have an "Allow placeholder user access" RLS policy granting full CRUD to `user_id = '00000000-0000-0000-0000-000000000001'`. If any data inadvertently remains associated with this placeholder UUID after migration, it would be accessible to anyone who crafts a request with this user context. Since the policy applies to the `public` role, any authenticated user's requests through the anon key could potentially interact with this data.

**Recommendation:**
1. Audit whether any real data is still associated with this placeholder UUID
2. Remove these policies once the migration feature is stable
3. If needed for development, restrict to service_role only

---

### Finding #9: Mutable Search Path on Security-Critical RLS Helper Functions

**Severity:** MEDIUM
**Category:** A01:2021 -- Broken Access Control
**CWE:** CWE-426 (Untrusted Search Path)

**Location:** Database functions: `is_customer_owner`, `get_receivables_summary`, `is_feature_active`, `update_updated_at`

**Description:**
Supabase security advisor flagged 4 functions with mutable search_path. The `is_customer_owner` function is used in RLS policies for 8 customer-related tables. If the search_path can be manipulated, an attacker could substitute a malicious function, bypassing RLS.

**Remediation:** https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable

```sql
ALTER FUNCTION public.is_customer_owner(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_receivables_summary() SET search_path = public, pg_temp;
ALTER FUNCTION public.is_feature_active(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.update_updated_at() SET search_path = public, pg_temp;
```

---

### Finding #10: Leaked Password Protection Disabled in Supabase Auth

**Severity:** MEDIUM
**Category:** A07:2021 -- Identification and Authentication Failures
**CWE:** CWE-521 (Weak Password Requirements)

**Location:** Supabase Auth configuration

**Description:**
The Supabase security advisor reports that leaked password protection (HaveIBeenPwned integration) is disabled. Users can sign up with passwords that are known to be compromised in data breaches.

**Recommendation:**
Enable leaked password protection in Supabase Dashboard > Authentication > Settings.

**Remediation:** https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

---

### Finding #11: SSRF Risk in URL-Based Enrichment and Scraping Endpoints

**Severity:** MEDIUM
**Category:** A10:2021 -- Server-Side Request Forgery
**CWE:** CWE-918 (Server-Side Request Forgery)

**Location:**
- `backend/src/services/ProfileExtractionService.ts:137` -- `fetch(url, ...)`
- `backend/src/services/EnrichmentService.ts:735` -- `fetch(url, ...)`
- `backend/src/services/publicationScraper.ts:78` -- `fetch(url, ...)`
- `backend/src/services/ai/agents/shared/fetchUrlTool.ts:69` -- `fetch(fetchUrl, ...)`

**Description:**
Multiple services accept user-provided URLs and make server-side HTTP requests (profile extraction from LinkedIn/websites, publication scraping, URL content fetching). While URLs are validated with Zod `z.string().url()`, there is no allowlist/blocklist preventing requests to:
- Internal network addresses (`http://169.254.169.254/` -- cloud metadata)
- Localhost (`http://127.0.0.1/`, `http://localhost/`)
- Private IP ranges (`10.x.x.x`, `192.168.x.x`, `172.16-31.x.x`)

**Impact:**
An authenticated user could probe internal network services, access cloud metadata endpoints (AWS/GCP instance credentials), or scan internal ports.

**Recommendation:**
Add URL validation to block internal/private addresses:
```typescript
function isInternalUrl(url: string): boolean {
  const parsed = new URL(url);
  const hostname = parsed.hostname;
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('10.') ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('172.') ||
    hostname === '169.254.169.254' ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.local')
  );
}
```

---

### Finding #12: Error Response Leaks Internal Error Details on 500

**Severity:** MEDIUM
**Category:** A05:2021 -- Security Misconfiguration
**CWE:** CWE-209 (Information Disclosure via Error Messages)

**Location:** `backend/src/controllers/ai.controller.ts` line 181

**Description:**
The `streamChat` controller includes the raw error message in the 500 response:

```typescript
res.status(500).json({ error: 'Failed to process chat', details: errorMessage })
```

This leaks internal error details (e.g., API key errors, Supabase connection strings, module paths) to the client.

**Recommendation:**
Remove `details` from production error responses:
```typescript
res.status(500).json({ error: 'Failed to process chat' })
```

---

### Finding #13: console.error Logs Full Error Object in AI Controller

**Severity:** MEDIUM
**Category:** A09:2021 -- Security Logging and Monitoring Failures
**CWE:** CWE-532 (Sensitive Information in Logs)

**Location:** `backend/src/controllers/ai.controller.ts` line 177

**Description:**
```typescript
console.error('Chat stream error:', error)
```

This logs the full error object (which may contain request context, tokens, or user data) to both console and the log file (due to the console interceptor in `logger.ts`).

**Recommendation:**
Use the structured logger instead:
```typescript
logger.error('Chat stream error', {
  error: error instanceof Error ? error.message : String(error),
  sourceCode: 'streamChat',
})
```

---

### Finding #14: AI Health Check Reveals API Key Configuration Status

**Severity:** MEDIUM
**Category:** A05:2021 -- Security Misconfiguration
**CWE:** CWE-200 (Information Exposure)

**Location:** `backend/src/controllers/ai.controller.ts` lines 266-282

**Description:**
The `/api/ai/health` endpoint (behind auth) reveals which AI providers have API keys configured:

```typescript
res.json({
  status: 'ok',
  providers: {
    anthropic: hasAnthropicKey ? 'configured' : 'missing',
    openai: hasOpenAIKey ? 'configured' : 'missing',
  },
})
```

**Impact:**
Reveals infrastructure configuration to any authenticated user, aiding targeted attacks on the specific AI providers in use.

**Recommendation:**
Return only a boolean health status without provider details, or restrict to admin users.

---

### Finding #15: Backend Log File Written with appendFileSync (Blocking I/O)

**Severity:** MEDIUM
**Category:** A04:2021 -- Insecure Design
**CWE:** CWE-400 (Uncontrolled Resource Consumption)

**Location:** `backend/src/lib/logger.ts` line 36

**Description:**
`fs.appendFileSync(LOG_FILE, line)` is used for all logging. This is synchronous blocking I/O on every log call (including the intercepted `console.*`). Under load or log flooding (see Finding #1), this will block the Node.js event loop, degrading performance for all requests.

**Recommendation:**
Use async file I/O (`fs.appendFile`) or a write stream (`fs.createWriteStream`) with buffering.

---

## LOW Findings

### Finding #16: In-Memory Rate Limiter Does Not Scale Across Instances

**Severity:** LOW
**Category:** A04:2021 -- Insecure Design
**CWE:** CWE-770 (Allocation of Resources Without Limits)

**Location:** `backend/src/middleware/rateLimiter.ts` line 113

**Description:**
The rate limiter uses an in-memory `Map`. If the application scales to multiple instances (e.g., behind a load balancer), rate limits are not shared. A user could bypass limits by having requests distributed across instances. The code acknowledges this with a comment: "Future: Redis-based for multi-instance deployments."

**Recommendation:**
When deploying multiple instances, migrate to Redis-backed rate limiting (e.g., `rate-limiter-flexible` with Redis store).

---

### Finding #17: No CSRF Protection on State-Changing API Endpoints

**Severity:** LOW
**Category:** A01:2021 -- Broken Access Control
**CWE:** CWE-352 (Cross-Site Request Forgery)

**Location:** Application-wide

**Description:**
The application relies on Bearer token authentication (JWT in Authorization header) rather than cookie-based sessions, which inherently mitigates traditional CSRF attacks since browsers do not automatically attach Authorization headers. However, the CORS configuration allows `credentials: true`, which means cookies are sent cross-origin. If any session cookies are used alongside the JWT pattern, CSRF could be possible.

**Impact:** Low risk given the JWT-based auth pattern. No session cookies are used for auth decisions.

**Recommendation:**
Monitor for any future addition of cookie-based auth. Consider removing `credentials: true` from CORS if cookies are not needed.

---

### Finding #18: Validation Error Details Exposed to Client

**Severity:** LOW
**Category:** A05:2021 -- Security Misconfiguration
**CWE:** CWE-209 (Information Disclosure)

**Location:** Multiple controllers (e.g., `ai.controller.ts` lines 129-132, 196-199)

**Description:**
Zod validation errors are returned directly to the client:
```typescript
res.status(400).json({
  error: 'Invalid request',
  details: parsed.error.errors,
})
```

While useful for development, this reveals internal field names and validation logic.

**Recommendation:**
In production, return generic validation error messages without internal field details.

---

### Finding #19: `.passthrough()` on Customer Info Schema Allows Arbitrary Fields

**Severity:** LOW
**Category:** A08:2021 -- Software and Data Integrity Failures
**CWE:** CWE-20 (Improper Input Validation)

**Location:** `backend/src/controllers/customer.controller.ts` line 50

**Description:**
```typescript
const customerInfoSchema = z.object({
  // ... defined fields ...
}).passthrough() // Allow extensible fields
```

The `.passthrough()` allows any additional fields to be stored in the `info` JSONB column. While JSONB is flexible by design, this means an attacker could store arbitrary data (including very large payloads) in customer records.

**Recommendation:**
Consider using `.strip()` (remove unknown fields) instead of `.passthrough()`, or add a maximum size constraint on the `info` field.

---

## INFO Findings

### Finding #20: Backend npm Dependencies Have 10 Vulnerabilities (6 moderate, 4 high)

**Category:** A06:2021 -- Vulnerable and Outdated Components

**Details:**
- `esbuild <= 0.24.2` -- moderate (dev server request interception)
- `minimatch 9.0.0-9.0.6` -- high (ReDoS)
- `multer < 2.1.1` -- high (DoS via recursion) -- see Finding #7
- `tar <= 7.5.9` -- high (path traversal via hardlink)

**Action:** Run `npm audit fix` in backend.

---

### Finding #21: Frontend npm Dependencies Have 5 Vulnerabilities (2 moderate, 3 high)

**Category:** A06:2021 -- Vulnerable and Outdated Components

**Details:**
- `dompurify 3.1.3-3.3.1` -- moderate (XSS) -- see Finding #2
- `ajv 7.x-8.17.1` -- moderate (ReDoS via `$data` option)
- `minimatch <= 3.1.3` -- high (ReDoS)

**Action:** Run `npm audit fix` in frontend.

---

### Finding #22: Startup Log Includes Environment Variable Presence Check

**Category:** A09:2021 -- Security Logging and Monitoring Failures

**Location:** `backend/src/index.ts` lines 16-21

**Description:**
```typescript
console.log('[STARTUP] Environment check:', {
  cwd: process.cwd(),
  MOCK_ALL_AI_TOOLS: process.env.MOCK_ALL_AI_TOOLS,
  MOCK_CONTENT_WRITING_TOOLS: process.env.MOCK_CONTENT_WRITING_TOOLS,
  SUPABASE_URL: process.env.SUPABASE_URL ? 'SET' : 'MISSING',
})
```

The `SUPABASE_URL` is properly masked, but `MOCK_ALL_AI_TOOLS` and `MOCK_CONTENT_WRITING_TOOLS` env vars are logged with their full values. While not secrets, this reveals configuration details.

**Recommendation:**
Log all environment variables as boolean presence checks: `SET` or `MISSING`.

---

## Positive Security Controls Observed

The following security practices are well-implemented:

1. **JWT Verification:** All protected routes verify tokens server-side via `supabaseAdmin.auth.getUser(token)` -- not just decoding the JWT
2. **RLS Enabled on All Tables:** All 22+ public tables have RLS enabled with user-scoped policies
3. **Zod Input Validation:** Consistent use across all controllers
4. **DOMPurify Sanitization:** All `dangerouslySetInnerHTML` usages are wrapped with DOMPurify (though the version needs updating)
5. **Helmet.js:** Properly configured for security headers
6. **CORS Restriction:** Origin restricted to `FRONTEND_URL`
7. **Request Body Limit:** `express.json({ limit: '5mb' })` prevents large payload attacks
8. **Artifact Ownership Validation:** Dedicated middleware for multi-tenant data isolation
9. **User-Scoped Supabase Client:** `createClientWithAuth(token)` creates RLS-enforced clients per request
10. **Logger Sanitization:** Production log sanitization strips sensitive fields
11. **`.gitignore` Coverage:** `.env`, `.env.local`, `backend/.env`, `frontend/.env.local` all excluded
12. **No `process.env` in Frontend:** Frontend only accesses `import.meta.env.VITE_*` variables (no server secrets leak to client)
13. **No `eval()` or Command Injection:** No `eval()`, `child_process`, or dynamic code execution found in production code

---

## Remediation Priority

### Immediate (This Week)
1. **Finding #1** -- Secure the `/api/log` endpoint (add auth + rate limiting + validation)
2. **Finding #2** -- Update DOMPurify to latest (`npm audit fix` in frontend)
3. **Finding #7** -- Update multer (`npm audit fix` in backend)
4. **Finding #3** -- Remove real Supabase URL from `.env.gemini-mock`

### Short-Term (Next 2 Weeks)
5. **Finding #4** -- Add rate limiting to AI endpoints
6. **Finding #9** -- Fix mutable search_path on RLS helper functions
7. **Finding #10** -- Enable leaked password protection in Supabase Auth
8. **Finding #5** -- Ensure NODE_ENV=production in all deployments; remove stack traces
9. **Finding #6** -- Replace userId with hasUserId in rate limiter logs

### Medium-Term (Next Month)
10. **Finding #11** -- Add SSRF protection to URL-fetching services
11. **Finding #12** -- Remove `details` from production 500 responses
12. **Finding #13** -- Replace console.error with structured logger in AI controller
13. **Finding #14** -- Restrict AI health check response detail
14. **Finding #15** -- Switch to async file I/O for logging
15. **Finding #8** -- Audit and remove placeholder user RLS policies

### Long-Term / Backlog
16. **Finding #16** -- Redis-backed rate limiting for multi-instance deployment
17. **Finding #17** -- Monitor CSRF risk if cookie auth is added
18. **Findings #20, #21** -- Regular dependency audit schedule (monthly `npm audit`)
19. **Finding #18** -- Suppress validation details in production
20. **Finding #19** -- Replace `.passthrough()` with `.strip()` or size limits

---

## Security Checklist

| Control | Status |
|---------|--------|
| JWT auth on protected routes | PASS |
| RLS enabled on all tables | PASS |
| RLS policies user-scoped | PASS |
| Input validation (Zod) | PASS |
| XSS protection (DOMPurify) | NEEDS UPDATE |
| Helmet.js security headers | PASS |
| CORS restricted to frontend | PASS |
| Request body size limit | PASS |
| Rate limiting on auth routes | FAIL -- not applied to most routes |
| Rate limiting on AI routes | FAIL |
| Secrets not in source code | MOSTLY PASS -- one URL exposed |
| No eval/exec in backend | PASS |
| Error responses sanitized | PARTIAL -- dev mode leaks |
| PII not in logs | PARTIAL -- userId in rate limiter |
| SSRF protection | FAIL |
| Leaked password protection | FAIL |
| Dependency vulnerabilities | NEEDS FIX (15 total) |
| Mutable search_path fixed | FAIL (4 functions) |

---

*End of Security Audit Report*
