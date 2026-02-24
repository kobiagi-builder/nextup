# PRD: User Authentication & Data Separation - Phase 1

**Contract**: ./contract.md
**Phase**: 1 of 2
**Focus**: Supabase Auth Configuration + Database Security + Backend Route Protection

## Phase Overview

Phase 1 establishes the **security foundation** before any UI changes. This phase configures Supabase Auth providers, adds Row Level Security (RLS) policies to all tables, applies `requireAuth` middleware to all backend API routes, and creates a data migration function to reassign placeholder data to the first real user.

This phase is sequenced first because it's the security backbone — Phase 2 (frontend auth UI) depends on all backend routes being protected and RLS being active. After Phase 1, the app will reject unauthenticated API calls, but there won't be a way to authenticate yet from the frontend (that's Phase 2). Testing is done via Supabase dashboard, curl with JWT tokens, or direct API calls.

## User Stories

1. As a **developer**, I want RLS policies on all tables so that data is isolated per user at the database level
2. As a **developer**, I want all API routes to require a valid JWT so that unauthenticated requests are rejected with 401
3. As a **developer**, I want Supabase Auth configured with email and Google providers so that users can register and log in
4. As a **system admin**, I want existing placeholder data reassigned to the first real user so that no data is lost during the auth transition

## Functional Requirements

### Supabase Auth Provider Configuration

- **FR-1.1**: Enable Email/Password auth provider in Supabase with email confirmation required
- **FR-1.2**: Enable Google OAuth provider in Supabase (requires Google Cloud Console OAuth client ID/secret)
- **FR-1.3**: Configure password minimum length to 8 characters in Supabase Auth settings
- **FR-1.4**: Configure email templates for: confirmation, password reset, magic link (use Supabase defaults, customize later)
- **FR-1.5**: Set redirect URLs for auth flows: `{FRONTEND_URL}/auth/callback` for OAuth, `{FRONTEND_URL}/auth/confirm` for email confirmation

### Row Level Security Policies

- **FR-1.6**: Add RLS SELECT policy on all tables: `auth.uid() = user_id`
- **FR-1.7**: Add RLS INSERT policy on all tables: `auth.uid() = user_id` (ensures users can only insert their own data)
- **FR-1.8**: Add RLS UPDATE policy on all tables: `auth.uid() = user_id`
- **FR-1.9**: Add RLS DELETE policy on all tables: `auth.uid() = user_id`
- **FR-1.10**: For child tables without direct `user_id` (artifact_research, artifact_interviews, artifact_writing_characteristics): policy joins through `artifacts.user_id` to verify ownership
- **FR-1.11**: Ensure `supabase_admin` / service role key bypasses RLS (Supabase default behavior — backend operations using service role key are unaffected)

### Backend Route Protection

- **FR-1.12**: Apply `requireAuth` middleware to ALL routes in `backend/src/routes/index.ts` except `GET /api/health`
- **FR-1.13**: Backend middleware must extract `user_id` from JWT and attach to `req.user`
- **FR-1.14**: All database queries via Supabase client must use user-scoped client (`createClientWithAuth(req.accessToken)`) instead of admin client for data operations
- **FR-1.15**: Return 401 with `{ error: 'Authentication required' }` for missing/invalid tokens
- **FR-1.16**: Return 403 with `{ error: 'Forbidden' }` for valid token but insufficient permissions (future-proofing)

### Data Migration

- **FR-1.17**: Create a one-time migration function (SQL or backend endpoint) that updates all rows where `user_id = '00000000-0000-0000-0000-000000000001'` to the provided real `user_id`
- **FR-1.18**: Migration must update ALL tables: artifacts, artifact_research (via artifact join), ai_conversations, user_context, skills, style_examples, user_writing_examples, user_preferences
- **FR-1.19**: Migration should be idempotent (safe to run multiple times)
- **FR-1.20**: Trigger migration automatically when first user signs up (via Supabase database trigger or backend hook)

## Non-Functional Requirements

- **NFR-1.1**: RLS policies must not degrade query performance — use indexed `user_id` columns
- **NFR-1.2**: Auth middleware latency < 50ms (JWT verification is local, no network call needed for cached keys)
- **NFR-1.3**: All auth-related errors must not leak sensitive information (no stack traces, no internal IDs)
- **NFR-1.4**: Service role key must NEVER be exposed to frontend (only used in backend)

## Dependencies

### Prerequisites

- Supabase project `ohwubfmipnpguunryopl` accessible
- Google Cloud Console OAuth credentials (client ID + secret) — user must provide these
- Backend `requireAuth` middleware already exists at `backend/src/middleware/auth.ts`

### Outputs for Phase 2

- All routes protected (frontend must send valid JWT)
- RLS active on all tables (frontend Supabase queries automatically filtered)
- Auth providers configured (frontend can call `supabase.auth.signUp`, `supabase.auth.signInWithPassword`, `supabase.auth.signInWithOAuth`)
- Data migration ready for first-user trigger

## Acceptance Criteria

- [ ] Email/Password and Google OAuth providers enabled in Supabase dashboard
- [ ] RLS policies exist and enforce `auth.uid() = user_id` on all 10 public tables
- [ ] Unauthenticated API calls to any route (except health) return 401
- [ ] Authenticated API calls with valid JWT return expected data (only user's own rows)
- [ ] Cross-user access attempt returns empty result (not 403, just no rows — RLS behavior)
- [ ] Existing placeholder data can be migrated to a real user_id
- [ ] Backend TypeScript compiles without errors
- [ ] Health check endpoint remains publicly accessible

## Open Questions

- Google OAuth client ID/secret: Does the user already have these configured, or do they need to be created?
- Email sender: Should Supabase use its default email sender, or configure a custom SMTP (e.g., Resend, SendGrid)?

---

*Review this PRD and provide feedback before spec generation.*
