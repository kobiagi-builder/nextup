# PRD: User Authentication & Data Separation - Phase 2

**Contract**: ./contract.md
**Phase**: 2 of 2
**Focus**: Frontend Auth UI + State Management + Protected Routes + Token Integration

## Phase Overview

Phase 2 builds the **user-facing authentication experience** on top of the security foundation from Phase 1. This includes login and signup screens, email confirmation flow, password reset flow, auth state management, protected route wrappers, and automatic token injection into all API calls.

After this phase, the app is fully authenticated end-to-end: users must log in to access any content, all API calls include JWTs, data is filtered by user, and the auth experience is polished with proper error handling, loading states, and responsive design.

This phase is sequenced second because it depends on Phase 1's backend route protection and Supabase Auth configuration.

## User Stories

1. As a **new user**, I want to sign up with my email and password so that I can create an account
2. As a **new user**, I want to sign up with Google so that I can get started without creating a password
3. As a **new user**, I want to confirm my email after signing up so that my account is verified
4. As a **returning user**, I want to log in with email/password or Google so that I can access my content
5. As a **user who forgot their password**, I want to reset it via email so that I can regain access
6. As an **authenticated user**, I want my session to persist across page refreshes so that I don't have to log in repeatedly
7. As an **unauthenticated visitor**, I want to be redirected to the login page so that I know I need to sign in

## Functional Requirements

### Auth State Management

- **FR-2.1**: Create auth state management using Supabase's `onAuthStateChange` listener — no separate Zustand store needed (Supabase SDK manages session in localStorage)
- **FR-2.2**: Create an `AuthProvider` React context that wraps the app and exposes: `user`, `session`, `loading`, `signOut`
- **FR-2.3**: On app mount, check for existing session via `supabase.auth.getSession()` and set loading=true until resolved
- **FR-2.4**: Auto-refresh tokens via Supabase SDK (built-in, no custom logic needed)

### Login Page

- **FR-2.5**: Full-page login screen (no AppShell, no sidebar — standalone layout)
- **FR-2.6**: Email/password form with validation (email format, password not empty)
- **FR-2.7**: "Sign in with Google" button triggering `supabase.auth.signInWithOAuth({ provider: 'google' })`
- **FR-2.8**: "Forgot password?" link navigating to password reset view
- **FR-2.9**: "Don't have an account? Sign up" link toggling to signup view
- **FR-2.10**: Inline error messages for: invalid credentials, unconfirmed email, network errors
- **FR-2.11**: Loading spinner on submit button during auth request
- **FR-2.12**: On successful login, redirect to `/portfolio` (or the originally requested URL)

### Signup Page

- **FR-2.13**: Full-page signup screen matching login layout
- **FR-2.14**: Email, password, confirm password fields
- **FR-2.15**: Real-time password strength validation as user types:
  - Minimum 8 characters
  - At least 1 uppercase letter
  - At least 1 number
  - Visual indicator (progress bar or checklist with green/red icons)
- **FR-2.16**: Confirm password field must match password field
- **FR-2.17**: "Sign up with Google" button
- **FR-2.18**: On successful email signup, navigate to email confirmation screen
- **FR-2.19**: On successful Google signup, redirect directly to `/portfolio`
- **FR-2.20**: Handle "email already registered" error gracefully

### Email Confirmation Screen

- **FR-2.21**: Shown after email/password signup — simple card with mail icon
- **FR-2.22**: Display the email address the confirmation was sent to
- **FR-2.23**: "Resend confirmation email" button with 60-second cooldown timer
- **FR-2.24**: "Back to sign in" link
- **FR-2.25**: Auto-detect confirmation (if user clicks email link in same browser, `onAuthStateChange` triggers redirect)

### Password Reset Flow

- **FR-2.26**: Password reset request screen: email field + "Send reset link" button
- **FR-2.27**: Success state: "Check your email for reset instructions" message
- **FR-2.28**: Password reset completion: when user clicks email link, show new password form
- **FR-2.29**: New password form with same validation rules (8+ chars, 1 upper, 1 number)
- **FR-2.30**: On successful reset, redirect to login with success toast

### Protected Routes

- **FR-2.31**: Create `ProtectedRoute` wrapper component that checks auth state
- **FR-2.32**: If loading (checking session), show full-page loading spinner
- **FR-2.33**: If not authenticated, redirect to `/auth/login` with the original URL preserved via React Router `location.state` (not query params — state is cleaner and sufficient since bookmarking the login page defaults to `/portfolio`)
- **FR-2.34**: Wrap all existing routes (`/portfolio`, `/portfolio/artifacts/:id`, `/profile`, `/settings`, `/settings/style`) in `ProtectedRoute`
- **FR-2.35**: Auth routes (`/auth/login`, `/auth/signup`, `/auth/confirm`, `/auth/reset-password`, `/auth/callback`) are public (no protection)

### API Token Integration

- **FR-2.36**: Modify `ApiClient` to automatically include auth token from Supabase session on every request
- **FR-2.37**: On 401 response from API, attempt token refresh; if refresh fails, redirect to login
- **FR-2.38**: All React Query hooks that call the backend API must use the auto-token ApiClient
- **FR-2.39**: Direct Supabase queries from frontend automatically use the session token (SDK handles this)

### OAuth Callback

- **FR-2.40**: Create `/auth/callback` route that handles OAuth redirect from Google
- **FR-2.41**: Parse hash fragment tokens from Supabase OAuth redirect
- **FR-2.42**: On successful token exchange, redirect to `/portfolio`

### First-User Data Migration Trigger

- **FR-2.43**: After first successful signup/login, check if placeholder data exists (user_id = 00000000-...0001)
- **FR-2.44**: If placeholder data exists, call backend migration endpoint to reassign data to the authenticated user
- **FR-2.45**: Show brief toast: "Your existing data has been linked to your account"

## Non-Functional Requirements

- **NFR-2.1**: Auth pages must be responsive — stacked layout on mobile, split layout on desktop (>= 768px)
- **NFR-2.2**: Auth pages must support light and dark themes
- **NFR-2.3**: Time from "click login" to "see portfolio" should be < 2 seconds (excluding network latency to Google)
- **NFR-2.4**: Auth state check on page refresh must resolve in < 500ms
- **NFR-2.5**: All auth forms must be keyboard-navigable and screen-reader accessible (proper labels, focus management)
- **NFR-2.6**: Password fields must have visibility toggle (show/hide password)
- **NFR-2.7**: No PII logged in console or sent to any logging service (per production logging security rules)

## Dependencies

### Prerequisites

- Phase 1 complete: all routes protected, RLS active, Supabase Auth configured
- Google OAuth credentials configured in Supabase dashboard
- Email confirmation enabled in Supabase Auth settings

### Outputs

- Complete auth flow (signup → confirm → login → use app → logout)
- All frontend API calls authenticated
- All routes protected
- Data migration triggered on first user signup

## Acceptance Criteria

- [ ] User can sign up with email/password — sees confirmation screen
- [ ] User receives confirmation email and can verify account
- [ ] User can sign up with Google — immediate access to app
- [ ] User can log in with email/password
- [ ] User can log in with Google
- [ ] Password validation enforces 8+ chars, 1 uppercase, 1 number — with real-time visual feedback
- [ ] User can reset forgotten password via email
- [ ] Unauthenticated user visiting any protected route is redirected to login
- [ ] After login, user is redirected to original URL (or /portfolio)
- [ ] Session persists across page refresh
- [ ] Logout clears session and redirects to login
- [ ] All API calls include auth token (verified via backend logs)
- [ ] First authenticated user inherits existing placeholder data
- [ ] Auth screens work in both light and dark themes
- [ ] Auth screens are responsive on mobile
- [ ] Frontend TypeScript compiles without errors
- [ ] Frontend builds successfully

## Open Questions

- Should there be a "Remember me" checkbox on login, or always persist sessions?
- What should the session duration be? (Supabase default is 1 hour with auto-refresh — likely fine)

---

*Review this PRD and provide feedback before spec generation.*
