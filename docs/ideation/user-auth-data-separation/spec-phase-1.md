# Implementation Spec: User Authentication & Data Separation - Phase 1

**PRD**: ./prd-phase-1.md
**Estimated Effort**: L (Large)

## Technical Approach

Phase 1 establishes the security foundation with zero frontend changes. The implementation leverages the significant existing infrastructure: `requireAuth` middleware already exists at `backend/src/middleware/auth.ts`, RLS is enabled on all tables, most RLS policies are already created, and `createClientWithAuth()` is ready in `backend/src/lib/supabase.ts`.

The work is: (1) configure Supabase Auth providers via dashboard, (2) audit and fix existing RLS policies (fill gaps, add missing WITH CHECK clauses, add missing policies for `artifact_interviews`), (3) wire `requireAuth` middleware onto all routes except health (and remove existing per-route `requireAuth` from individual route files to prevent double auth), (4) update ALL files that import `supabaseAdmin` to use `createClientWithAuth(req.accessToken)` for data operations — this includes 5 controllers, 2 services, and 12+ AI tool files, and (5) create a guarded data migration function to reassign placeholder data to the first real user.

The backend currently uses `supabaseAdmin` (service role) for all queries across 32 files, which bypasses RLS. To make RLS effective, data queries must switch to `createClientWithAuth()` which creates a client scoped to the user's JWT. The recommended pattern is dependency injection: `PipelineExecutor` and `AIService` accept an `accessToken` parameter and pass a user-scoped `SupabaseClient` instance down to all tool modules, rather than each tool importing `supabaseAdmin` directly. Admin client remains for system operations (e.g., the migration function, health check).

## File Changes

### New Files

| File Path | Purpose |
|-----------|---------|
| `backend/src/routes/auth.routes.ts` | Auth-specific routes: POST `/api/auth/migrate-data` for first-user data migration |
| `backend/src/controllers/auth.controller.ts` | Controller for auth-related endpoints (data migration) |
| `backend/src/services/dataMigration.ts` | Service to reassign placeholder UUID data to authenticated user |

### Modified Files

| File Path | Changes |
|-----------|---------|
| `backend/src/routes/index.ts` | Apply `requireAuth` middleware to all route groups except `/health` and `/log`; mount auth routes |
| `backend/src/middleware/auth.ts` | Minor: add `user_id` extraction helper for controllers |
| `backend/src/controllers/ai.controller.ts` | Use `createClientWithAuth(req.accessToken!)` for Supabase queries |
| `backend/src/controllers/contentAgentController.ts` | Use `createClientWithAuth(req.accessToken!)` for Supabase queries |
| `backend/src/controllers/foundations.controller.ts` | Use `createClientWithAuth(req.accessToken!)` for Supabase queries |
| `backend/src/controllers/imageGeneration.controller.ts` | Use `createClientWithAuth(req.accessToken!)` for Supabase queries |
| `backend/src/controllers/writingExamples.controller.ts` | Use `createClientWithAuth(req.accessToken!)` for Supabase queries |
| `backend/src/controllers/artifactResearch.controller.ts` | Use `createClientWithAuth(req.accessToken!)` for Supabase queries |
| `backend/src/services/ai/AIService.ts` | Accept `accessToken`, create user-scoped client, pass to tools |
| `backend/src/services/ai/ContentAgent.ts` | Accept `accessToken`, forward to pipeline |
| `backend/src/services/ai/PipelineExecutor.ts` | Accept `accessToken`, pass user-scoped client to tool modules |
| `backend/src/services/ai/tools/skeletonTools.ts` | Receive `SupabaseClient` via DI instead of importing `supabaseAdmin` |
| `backend/src/services/ai/tools/researchTools.ts` | Receive `SupabaseClient` via DI instead of importing `supabaseAdmin` |
| `backend/src/services/ai/tools/contentWritingTools.ts` | Receive `SupabaseClient` via DI instead of importing `supabaseAdmin` |
| `backend/src/services/ai/tools/humanityCheckTools.ts` | Receive `SupabaseClient` via DI instead of importing `supabaseAdmin` |
| `backend/src/services/ai/tools/imageNeedsTools.ts` | Receive `SupabaseClient` via DI instead of importing `supabaseAdmin` |
| `backend/src/services/ai/tools/finalImageTools.ts` | Receive `SupabaseClient` via DI instead of importing `supabaseAdmin` |
| `backend/src/services/ai/tools/visualsCreatorTool.ts` | Receive `SupabaseClient` via DI instead of importing `supabaseAdmin` |
| `backend/src/services/ai/tools/writingCharacteristicsTools.ts` | Receive `SupabaseClient` via DI instead of importing `supabaseAdmin` |
| `backend/src/services/ai/tools/topicTools.ts` | Receive `SupabaseClient` via DI instead of importing `supabaseAdmin` |
| `backend/src/services/ai/tools/profileTools.ts` | Receive `SupabaseClient` via DI instead of importing `supabaseAdmin` |
| `backend/src/services/ai/tools/contentTools.ts` | Receive `SupabaseClient` via DI instead of importing `supabaseAdmin` |
| `backend/src/services/ai/tools/contextTools.ts` | Receive `SupabaseClient` via DI instead of importing `supabaseAdmin` |
| `backend/src/services/ai/tools/interviewTools.ts` | Receive `SupabaseClient` via DI instead of importing `supabaseAdmin` |
| `backend/src/services/ai/tools/socialPostTools.ts` | Receive `SupabaseClient` via DI instead of importing `supabaseAdmin` |
| `backend/src/services/ai/tools/contentImprovementTools.ts` | Receive `SupabaseClient` via DI instead of importing `supabaseAdmin` |
| `backend/src/lib/storageHelpers.ts` | Switch to user-scoped client for storage operations |
| `backend/src/middleware/validateArtifactOwnership.ts` | Switch to user-scoped client; fix PII logging (use boolean flags) |
| `backend/src/routes/contentAgentRoutes.ts` | REMOVE per-route `requireAuth` (now applied at mount level) |
| `backend/src/routes/artifactResearch.routes.ts` | REMOVE per-route `requireAuth` (now applied at mount level) |
| `backend/src/routes/writingExamples.routes.ts` | REMOVE per-route `requireAuth` (now applied at mount level) |

### Deleted Files

None.

## Implementation Details

### 1. Supabase Auth Provider Configuration (Manual)

**Overview**: Configure email/password and Google OAuth providers in Supabase dashboard. This is a manual step, not code.

**Steps**:
1. Go to Supabase Dashboard > Authentication > Providers
2. **Email provider**: Enable, set "Confirm email" to ON, minimum password length 8
3. **Google OAuth**: Enable, enter Google Cloud Console OAuth client ID and client secret
4. Go to Authentication > URL Configuration
5. Set Site URL: `{FRONTEND_URL}` (e.g., `http://localhost:5173` for dev)
6. Add redirect URLs:
   - `{FRONTEND_URL}/auth/callback`
   - `{FRONTEND_URL}/auth/confirm`
   - `{FRONTEND_URL}/auth/reset-password`
7. Go to Authentication > Email Templates — use defaults for now (customizable later)

**Key decisions**:
- Email confirmation is required for email/password signups (security best practice)
- Google OAuth bypasses email confirmation (Google has already verified the email)
- Password minimum is configured at 8 in Supabase settings; frontend will enforce additional rules (1 uppercase, 1 number) via client-side validation

### 2. RLS Policy Audit & Fixes

**Overview**: RLS is already enabled on all 10 tables, and most policies exist. This step audits and fills gaps.

**Current state** (from database query):

| Table | Policies Present | Issues |
|-------|-----------------|--------|
| `artifacts` | SELECT, INSERT, UPDATE, DELETE + placeholder | INSERT missing WITH CHECK |
| `ai_conversations` | SELECT, INSERT, UPDATE, DELETE + placeholder | INSERT missing WITH CHECK |
| `artifact_research` | SELECT, INSERT, UPDATE, DELETE + placeholder (via join) | INSERT missing WITH CHECK |
| `artifact_interviews` | SELECT only + service_role ALL | Missing INSERT, UPDATE, DELETE for users |
| `artifact_writing_characteristics` | ALL (via join) | OK |
| `user_context` | SELECT, INSERT, UPDATE, DELETE + placeholder | INSERT missing WITH CHECK |
| `skills` | SELECT, INSERT, UPDATE, DELETE + placeholder | INSERT missing WITH CHECK |
| `style_examples` | SELECT, INSERT, UPDATE, DELETE + placeholder | INSERT missing WITH CHECK |
| `user_preferences` | SELECT, INSERT, UPDATE, DELETE + placeholder | INSERT missing WITH CHECK |
| `user_writing_examples` | ALL | OK |

**Migration SQL** (apply via `mcp__supabase__apply_migration`):

```sql
-- =============================================================
-- Phase 1: Fix RLS policies
-- =============================================================

-- 1. Fix INSERT policies to add WITH CHECK clauses
-- (Drop and recreate INSERT policies with proper WITH CHECK)

-- artifacts
DROP POLICY IF EXISTS "Users can insert own artifacts" ON public.artifacts;
CREATE POLICY "Users can insert own artifacts" ON public.artifacts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ai_conversations
DROP POLICY IF EXISTS "Users can insert own conversations" ON public.ai_conversations;
CREATE POLICY "Users can insert own conversations" ON public.ai_conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- artifact_research (join-based)
DROP POLICY IF EXISTS "Users can insert research for own artifacts" ON public.artifact_research;
CREATE POLICY "Users can insert research for own artifacts" ON public.artifact_research
  FOR INSERT WITH CHECK (
    artifact_id IN (SELECT id FROM public.artifacts WHERE user_id = auth.uid())
  );

-- user_context
DROP POLICY IF EXISTS "Users can insert own context" ON public.user_context;
CREATE POLICY "Users can insert own context" ON public.user_context
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- skills
DROP POLICY IF EXISTS "Users can insert own skills" ON public.skills;
CREATE POLICY "Users can insert own skills" ON public.skills
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- style_examples
DROP POLICY IF EXISTS "Users can insert own style examples" ON public.style_examples;
CREATE POLICY "Users can insert own style examples" ON public.style_examples
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- user_preferences
DROP POLICY IF EXISTS "Users can insert own preferences" ON public.user_preferences;
CREATE POLICY "Users can insert own preferences" ON public.user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 2. Fix artifact_research UPDATE and DELETE policies (add WITH CHECK to UPDATE)
DROP POLICY IF EXISTS "Users can update research for own artifacts" ON public.artifact_research;
CREATE POLICY "Users can update research for own artifacts" ON public.artifact_research
  FOR UPDATE
  USING (artifact_id IN (SELECT id FROM public.artifacts WHERE user_id = auth.uid()))
  WITH CHECK (artifact_id IN (SELECT id FROM public.artifacts WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete research for own artifacts" ON public.artifact_research;
CREATE POLICY "Users can delete research for own artifacts" ON public.artifact_research
  FOR DELETE USING (
    artifact_id IN (SELECT id FROM public.artifacts WHERE user_id = auth.uid())
  );

-- 3. Add missing policies for artifact_interviews (INSERT, UPDATE, DELETE)
CREATE POLICY "Users can insert own artifact interviews" ON public.artifact_interviews
  FOR INSERT WITH CHECK (
    artifact_id IN (SELECT id FROM public.artifacts WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update own artifact interviews" ON public.artifact_interviews
  FOR UPDATE
  USING (artifact_id IN (SELECT id FROM public.artifacts WHERE user_id = auth.uid()))
  WITH CHECK (artifact_id IN (SELECT id FROM public.artifacts WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own artifact interviews" ON public.artifact_interviews
  FOR DELETE USING (
    artifact_id IN (SELECT id FROM public.artifacts WHERE user_id = auth.uid())
  );

-- 4. Add user_id column default change
-- Change default from placeholder UUID to auth.uid() for authenticated inserts
-- CAVEAT: auth.uid() returns NULL for service role (supabaseAdmin) inserts.
-- All supabaseAdmin INSERT operations MUST explicitly set user_id.
-- This is naturally addressed when switching tools to user-scoped client (finding #1).
ALTER TABLE public.artifacts ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.ai_conversations ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.user_context ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.skills ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.style_examples ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.user_preferences ALTER COLUMN user_id SET DEFAULT auth.uid();
```

**Key decisions**:
- Placeholder access policies are kept during Phase 1 (removed only after data migration runs in Phase 2 first-user flow)
- `auth.uid()` as default for `user_id` columns ensures new rows are always owned by the authenticated user
- Child tables (artifact_research, artifact_interviews, artifact_writing_characteristics) use join-based policies since they don't have a direct `user_id` column
- Service role access on `artifact_interviews` is kept for backend operations that use `supabaseAdmin`

### 3. Apply requireAuth Middleware to Routes

**Pattern to follow**: `backend/src/middleware/auth.ts` (already exists)

**Overview**: Wire the existing `requireAuth` middleware onto all route groups in `backend/src/routes/index.ts`, except health check and frontend logging.

```typescript
// backend/src/routes/index.ts
import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { healthRouter } from './health.js'
import { aiRouter } from './ai.js'
import artifactResearchRouter from './artifactResearch.routes.js'
import contentAgentRouter from './contentAgentRoutes.js'
import writingExamplesRouter from './writingExamples.routes.js'
import { authRouter } from './auth.routes.js'
import { logFrontend } from '../lib/logger.js'

export const router = Router()

// Public routes (no auth required)
router.use('/health', healthRouter)
router.post('/log', (req, res) => {
  const { level, message, data } = req.body
  logFrontend(level || 'log', message || 'No message', data)
  res.status(200).json({ ok: true })
})

// Protected routes (auth required)
router.use('/ai', requireAuth, aiRouter)
router.use('/artifacts', requireAuth, artifactResearchRouter)
router.use('/content-agent', requireAuth, contentAgentRouter)
router.use('/user/writing-examples', requireAuth, writingExamplesRouter)

// Auth routes (auth required - for data migration)
router.use('/auth', requireAuth, authRouter)
```

**Key decisions**:
- Health check stays public (monitoring, load balancers)
- Frontend log endpoint stays public (logs may come before auth is established; no sensitive data)
- Auth routes require auth because the migration endpoint needs the user's JWT to know who to migrate data to
- Middleware is applied at the router-mount level ONLY — this is the canonical pattern
- **IMPORTANT**: Remove ALL per-route `requireAuth` calls from `contentAgentRoutes.ts`, `artifactResearch.routes.ts`, and `writingExamples.routes.ts` to prevent double authentication (two `supabaseAdmin.auth.getUser()` calls per request)

### 4. Switch Controllers to User-Scoped Supabase Client

**Pattern to follow**: `backend/src/lib/supabase.ts` — `createClientWithAuth()`

**Overview**: All controllers currently import `supabaseAdmin` directly. They must switch to `createClientWithAuth(req.accessToken!)` for data operations so RLS policies are enforced.

The pattern for each controller:

```typescript
// BEFORE (bypasses RLS):
import { supabaseAdmin } from '../lib/supabase.js'
// ...
const { data, error } = await supabaseAdmin.from('artifacts').select('*')

// AFTER (RLS enforced):
import { createClientWithAuth } from '../lib/supabase.js'
// ...
const supabase = createClientWithAuth(req.accessToken!)
const { data, error } = await supabase.from('artifacts').select('*')
```

**Controllers to update**:

1. **`ai.controller.ts`** — All AI endpoint handlers use `supabaseAdmin` for reading/writing artifacts, conversations
2. **`contentAgentController.ts`** — Content agent reads/writes artifacts, research, interviews
3. **`foundations.controller.ts`** — Reads/writes artifact foundations data
4. **`imageGeneration.controller.ts`** — Reads/writes artifact images
5. **`writingExamples.controller.ts`** — Reads/writes user writing examples

**Services that receive accessToken**:

The AI services (`AIService`, `ContentAgent`, `PipelineExecutor`) instantiate their own Supabase clients internally. They need to accept `accessToken` as a parameter and use `createClientWithAuth()`:

```typescript
// In service constructor or method:
class ContentAgent {
  private supabase: SupabaseClient

  constructor(accessToken: string) {
    this.supabase = createClientWithAuth(accessToken)
  }
}
```

**Key decisions**:
- `supabaseAdmin` is still used for system operations (data migration, admin tasks)
- `req.accessToken!` is safe to use because `requireAuth` middleware guarantees it exists on protected routes
- TypeScript non-null assertion `!` is acceptable here since the middleware ensures it

### 5. Data Migration Service

**Overview**: A one-time function that reassigns all data from the placeholder UUID to a real user. Called from Phase 2's first-user flow.

```typescript
// backend/src/services/dataMigration.ts
import { supabaseAdmin } from '../lib/supabase.js'

const PLACEHOLDER_USER_ID = '00000000-0000-0000-0000-000000000001'

/**
 * Migrate placeholder data to a real authenticated user.
 * Uses supabaseAdmin (service role) to bypass RLS.
 * Idempotent — safe to run multiple times.
 *
 * SECURITY: Checks that placeholder data actually exists before migrating.
 * Once migrated, subsequent calls are no-ops (idempotent by nature —
 * no placeholder rows remain). No race condition: the UPDATE ... WHERE
 * user_id = PLACEHOLDER only affects rows that still have the placeholder.
 */
export async function migrateDataToUser(realUserId: string): Promise<{
  migrated: boolean
  tablesUpdated: string[]
}> {
  // Guard: check if any placeholder data exists before proceeding
  const { data: check } = await supabaseAdmin
    .from('artifacts')
    .select('id')
    .eq('user_id', PLACEHOLDER_USER_ID)
    .limit(1)

  if (!check || check.length === 0) {
    // No placeholder data exists — either already migrated or fresh install
    return { migrated: false, tablesUpdated: [] }
  }

  const tablesUpdated: string[] = []

  // Tables with direct user_id column
  const directTables = [
    'artifacts',
    'ai_conversations',
    'user_context',
    'skills',
    'style_examples',
    'user_preferences',
    'user_writing_examples',
  ]

  for (const table of directTables) {
    const { data, error } = await supabaseAdmin
      .from(table)
      .update({ user_id: realUserId })
      .eq('user_id', PLACEHOLDER_USER_ID)
      .select('id')

    if (!error && data && data.length > 0) {
      tablesUpdated.push(`${table} (${data.length} rows)`)
    }
  }

  // Child tables (artifact_research, artifact_interviews, artifact_writing_characteristics)
  // are linked via artifact_id → artifacts.user_id, so they inherit via the join
  // No direct update needed — the parent artifacts.user_id change propagates through RLS

  return {
    migrated: tablesUpdated.length > 0,
    tablesUpdated,
  }
}
```

**Auth routes controller**:

```typescript
// backend/src/controllers/auth.controller.ts
import { Request, Response, NextFunction } from 'express'
import { migrateDataToUser } from '../services/dataMigration.js'

export async function migrateData(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    const result = await migrateDataToUser(userId)
    res.json(result)
  } catch (error) {
    next(error)
  }
}
```

```typescript
// backend/src/routes/auth.routes.ts
import { Router } from 'express'
import { migrateData } from '../controllers/auth.controller.js'

export const authRouter = Router()
authRouter.post('/migrate-data', migrateData)
```

**Key decisions**:
- Migration uses `supabaseAdmin` (service role) to bypass RLS since it needs to read placeholder-owned data
- Idempotent: if placeholder data doesn't exist, it returns `{ migrated: false, tablesUpdated: [] }`
- Child tables don't need direct migration — their RLS policies join through `artifacts.user_id` which gets updated
- Placeholder RLS policies are removed in a separate migration AFTER first-user migration runs (triggered from Phase 2)

### 6. Remove Placeholder Policies (Post-Migration SQL)

This SQL is NOT run during Phase 1 deployment. It's run after the first user signs up and migration completes (triggered from Phase 2). Included here for completeness.

```sql
-- Run AFTER data migration completes
DROP POLICY IF EXISTS "Allow placeholder user access" ON public.artifacts;
DROP POLICY IF EXISTS "Allow placeholder user access" ON public.ai_conversations;
DROP POLICY IF EXISTS "Allow placeholder user access" ON public.user_context;
DROP POLICY IF EXISTS "Allow placeholder user access" ON public.skills;
DROP POLICY IF EXISTS "Allow placeholder user access" ON public.style_examples;
DROP POLICY IF EXISTS "Allow placeholder user access" ON public.user_preferences;
DROP POLICY IF EXISTS "Allow placeholder user research access" ON public.artifact_research;

-- Remove old placeholder default values (already replaced by auth.uid() default)
-- No action needed — ALTER COLUMN SET DEFAULT auth.uid() already applied above
```

## API Design

### New Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/migrate-data` | Migrate placeholder data to authenticated user |

### Request/Response Examples

```typescript
// POST /api/auth/migrate-data
// Headers: Authorization: Bearer <jwt>
// No request body needed

// Response (success — data migrated)
{
  "migrated": true,
  "tablesUpdated": [
    "artifacts (3 rows)",
    "ai_conversations (5 rows)",
    "user_context (1 rows)",
    "skills (4 rows)"
  ]
}

// Response (no placeholder data found)
{
  "migrated": false,
  "tablesUpdated": []
}
```

## Testing Requirements

### Unit Tests

| Test File | Coverage |
|-----------|----------|
| `backend/src/__tests__/unit/services/dataMigration.test.ts` | Data migration logic |

**Key test cases**:
- Migration updates all direct user_id tables
- Migration is idempotent (second run returns `migrated: false`)
- Migration handles empty tables gracefully
- Migration does not affect child tables (they use join-based RLS)

### Integration Tests

| Test File | Coverage |
|-----------|----------|
| `backend/src/__tests__/integration/auth.integration.test.ts` | Route protection and auth flow |

**Key scenarios**:
- Unauthenticated request to `/api/artifacts` returns 401
- Unauthenticated request to `/api/health` returns 200
- Authenticated request with valid JWT returns expected data
- Authenticated request returns only user's own data (RLS verification)
- Data migration endpoint returns correct results

### Manual Testing

- [ ] Verify email/password and Google OAuth providers are enabled in Supabase dashboard
- [ ] Test unauthenticated API calls return 401 (via curl or Postman)
- [ ] Test authenticated API calls with Supabase-generated JWT return data
- [ ] Test cross-user data isolation: create 2 test users, verify each only sees own data
- [ ] Test data migration endpoint reassigns placeholder data
- [ ] Verify health check remains publicly accessible

## Error Handling

| Error Scenario | Handling Strategy |
|----------------|-------------------|
| Missing Authorization header | Return 401 `{ error: 'Missing or invalid authorization header' }` |
| Invalid/expired JWT | Return 401 `{ error: 'Invalid or expired token' }` |
| Valid JWT but user doesn't exist | Return 401 `{ error: 'Invalid or expired token' }` |
| RLS blocks access (user queries another user's data) | Return empty result set (not 403 — this is standard RLS behavior) |
| Data migration fails (DB error) | Return 500, log error server-side, do not expose internal details |
| Supabase Auth provider misconfigured | Return 500 on auth calls, log error |

## Validation Commands

```bash
# Type checking (backend)
cd backend && npx tsc --noEmit

# Run unit tests
cd backend && npm run test

# Run integration tests
cd backend && npm run test -- --grep "auth"

# Build
cd backend && npm run build

# Manual auth test with curl
curl -X GET http://localhost:3001/api/artifacts \
  -H "Content-Type: application/json"
# Expected: 401

curl -X GET http://localhost:3001/api/health
# Expected: 200
```

## Rollout Considerations

- **Feature flag**: None needed — Phase 1 is a security hardening step, not a user-facing feature
- **Monitoring**: Watch for 401 error spikes after deployment (indicates broken clients)
- **Rollback plan**: Remove `requireAuth` middleware from routes (simple revert). RLS policies can stay (they don't block service role access)
- **Deployment order**:
  1. Apply RLS migration SQL first (via Supabase MCP)
  2. Configure auth providers in Supabase dashboard
  3. Deploy backend code changes
  4. Frontend remains unchanged — will start sending tokens in Phase 2

## Rollout: CORS Verification

Verify CORS configuration (`backend/src/index.ts`) handles auth flows correctly in each environment (dev, staging, production). The OAuth callback is a browser redirect (not AJAX), so CORS isn't directly involved there, but all API calls with `Authorization: Bearer` headers trigger preflight OPTIONS requests. Ensure `credentials: true` and allowed origins are correct per environment.

## Open Items

- [ ] Google OAuth client ID/secret: must be obtained from Google Cloud Console before configuring in Supabase

---

*This spec is ready for implementation. Follow the patterns and validate at each step.*
