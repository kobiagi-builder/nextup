# User Authentication & Data Separation Contract

**Created**: 2026-02-19
**Confidence Score**: 98/100
**Status**: Draft

## Problem Statement

The Product Consultant Helper application currently has **zero authentication**. All data (artifacts, research, writing examples, AI conversations, user context) is accessible without login to anyone who can reach the URL. There is no concept of user identity — all records default to a placeholder UUID (`00000000-0000-0000-0000-000000000001`).

This means:
- Any visitor can see, edit, or delete all content
- No multi-user support — the app can only serve one person
- No audit trail of who did what
- No ability to personalize experience per user
- Data cannot be protected at the database level (RLS policies exist structurally but have no filtering rules)

This is a **blocking prerequisite** for any production deployment or multi-user usage.

## Goals

1. **User Registration**: Support email/password and Google OAuth signup with proper validation and email confirmation for email signups
2. **User Login**: Provide a login screen with easy toggle to signup, supporting both auth methods, plus password reset via email
3. **Session Management**: Maintain authenticated sessions across page refreshes, handle token expiry, and provide logout
4. **Data Isolation**: Every database table filters data by `auth.uid()` via RLS policies — users can only see their own data
5. **Route Protection**: All frontend routes require authentication (redirect to login if unauthenticated); all backend API routes require valid JWT
6. **Data Migration**: Existing placeholder-user data (`user_id = 00000000-...0001`) is reassigned to the first real user who signs up

## Success Criteria

- [ ] User can sign up with email/password — receives confirmation email, must verify before full access
- [ ] User can sign up with Google OAuth — immediate access after consent
- [ ] Password validation enforces: minimum 8 characters, at least 1 uppercase letter, at least 1 number
- [ ] User can log in with email/password or Google OAuth
- [ ] User can reset forgotten password via email link
- [ ] Unauthenticated users are redirected to login page
- [ ] All frontend API calls include valid JWT token
- [ ] All backend routes (except health check) require valid JWT via `requireAuth` middleware
- [ ] RLS policies on all tables filter by `auth.uid()` — verified by attempting cross-user access
- [ ] Existing data is automatically reassigned to first authenticated user
- [ ] Session persists across page refresh (Supabase handles via localStorage)
- [ ] Logout clears session and redirects to login
- [ ] TypeScript compiles without errors (`npx tsc --noEmit` in both frontend and backend)
- [ ] Frontend builds successfully (`npm run build`)

## Scope Boundaries

### In Scope

- Email/password signup with email confirmation
- Google OAuth signup/login
- Password strength validation (8+ chars, 1 upper, 1 number)
- Password reset (forgot password) via email
- Login page with signup/login toggle
- Frontend auth state management (Supabase `onAuthStateChange`)
- Protected route wrapper for React Router
- Backend `requireAuth` middleware applied to all API routes
- RLS policies on all public tables (artifacts, artifact_research, artifact_interviews, ai_conversations, user_context, skills, style_examples, user_writing_examples, user_preferences, artifact_writing_characteristics)
- Existing data migration to first authenticated user
- Auth error handling (expired tokens, invalid credentials, network errors)
- Supabase Auth provider configuration (email + Google)

### Out of Scope

- Multi-tenancy / team accounts — `account_id` column ignored for now
- Role-based access control (RBAC) — all users have same permissions
- Social login beyond Google (GitHub, Apple, etc.) — can add later
- Two-factor authentication (2FA) — deferred
- Account deletion / GDPR data export — deferred
- User profile avatar upload — deferred
- Rate limiting on auth endpoints beyond Supabase's built-in limits

### Future Considerations

- Multi-tenant support via `account_id` when teams feature is needed
- Additional OAuth providers (GitHub, LinkedIn)
- 2FA support
- Admin dashboard for user management
- GDPR compliance (data export, right to deletion)

---

*This contract was generated from brain dump input. Review and approve before proceeding to PRD generation.*
