# Implementation Spec: User Authentication & Data Separation - Phase 2

**PRD**: ./prd-phase-2.md
**UI Design**: ./ui-design-specs.md
**Estimated Effort**: L (Large)

## Technical Approach

Phase 2 builds the complete frontend authentication experience. The implementation centers on four pillars: (1) an `AuthProvider` React context powered by Supabase's `onAuthStateChange` listener (no Zustand — Supabase SDK manages session in localStorage), (2) auth page components following the split-screen layout from the UI design specs, (3) a `ProtectedRoute` wrapper component for React Router, and (4) automatic JWT injection into the `ApiClient`.

The auth flow uses React Router 7 for all navigation between auth screens. Login, signup, email confirmation, and password reset are mounted under `/auth/*` routes outside the `AppShell` layout (they're standalone full-page screens). All existing app routes are wrapped in `ProtectedRoute` which checks the auth context and redirects unauthenticated users.

Supabase handles all auth complexity: JWT generation/refresh, session persistence in localStorage, OAuth redirect handling, email confirmation, and password reset. The frontend's job is to call the right Supabase Auth methods and react to state changes.

## File Changes

### New Files

| File Path | Purpose |
|-----------|---------|
| `frontend/src/providers/AuthProvider.tsx` | React context providing auth state (user, session, loading, signOut) |
| `frontend/src/components/auth/ProtectedRoute.tsx` | Route wrapper that redirects unauthenticated users to login |
| `frontend/src/components/auth/AuthLayout.tsx` | Shared split-screen layout for Login, Signup, Password Reset |
| `frontend/src/components/auth/BrandingPanel.tsx` | Left branding panel (app icon, name, tagline, feature callouts) |
| `frontend/src/components/auth/GoogleButton.tsx` | Google OAuth sign-in button with proper Google G SVG icon |
| `frontend/src/components/auth/PasswordStrength.tsx` | Password strength bar + requirements checklist |
| `frontend/src/components/auth/OrDivider.tsx` | "or" divider between OAuth and email form |
| `frontend/src/features/auth/pages/LoginPage.tsx` | Login screen |
| `frontend/src/features/auth/pages/SignupPage.tsx` | Signup screen with password validation |
| `frontend/src/features/auth/pages/EmailConfirmationPage.tsx` | Post-signup email confirmation screen |
| `frontend/src/features/auth/pages/PasswordResetPage.tsx` | Password reset request + success state |
| `frontend/src/features/auth/pages/AuthCallbackPage.tsx` | OAuth callback handler (`/auth/callback`) |
| `frontend/src/features/auth/hooks/usePasswordValidation.ts` | Password strength calculation and requirements checking |

### Modified Files

| File Path | Changes |
|-----------|---------|
| `frontend/src/App.tsx` | Wrap app in AuthProvider, add auth routes outside AppShell, wrap existing routes in ProtectedRoute |
| `frontend/src/lib/api.ts` | Auto-inject auth token from Supabase session on every request; handle 401 with redirect to login |
| `frontend/src/components/layout/Sidebar.tsx` | Add sign-out button at bottom of navigation |
| `frontend/src/components/layout/MobileNav.tsx` | Add sign-out option to mobile navigation |

### Deleted Files

None.

## Implementation Details

### 1. AuthProvider Context

**Pattern to follow**: `frontend/src/providers/ThemeProvider.tsx` (existing context pattern)

**Overview**: A React context that wraps the entire app, listens to Supabase auth state changes, and exposes auth state to all components.

```typescript
// frontend/src/providers/AuthProvider.tsx
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // IMPORTANT: Subscribe to onAuthStateChange FIRST, then call getSession().
    // This prevents a race condition where onAuthStateChange fires before
    // getSession() resolves, causing stale state overwrites.
    // See: Supabase JS v2 migration guide.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)

        // Handle password recovery flow (finding #8)
        if (event === 'PASSWORD_RECOVERY') {
          // User clicked password reset link in email — Supabase logs them in
          // with a temporary session. Navigate to password update form.
          window.location.href = '/auth/reset-password?recovery=true'
        }

        // Trigger first-user data migration on sign-in
        if (event === 'SIGNED_IN' && session) {
          const migrated = localStorage.getItem('data-migrated')
          if (!migrated) {
            try {
              const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/migrate-data`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.access_token}`
                }
              })
              const result = await res.json()
              localStorage.setItem('data-migrated', 'true')
              if (result.migrated) {
                sessionStorage.setItem('show-migration-toast', 'true')
              }
            } catch {
              // Silent failure — migration is non-critical
            }
          }
        }
      }
    )

    // Get initial session (after subscription is set up)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
```

**Key decisions**:
- No Zustand store — Supabase SDK already manages session in localStorage with auto-refresh
- `loading` starts as `true` and resolves after `getSession()` — prevents flash of login screen on refresh
- `onAuthStateChange` handles all state transitions: login, logout, token refresh, email confirmation
- `signOut` is memoized with `useCallback` to prevent unnecessary re-renders

### 2. ProtectedRoute Component

**Overview**: A wrapper component that checks auth state and redirects unauthenticated users.

```typescript
// frontend/src/components/auth/ProtectedRoute.tsx
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/providers/AuthProvider'
import { Loader2 } from 'lucide-react'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/auth/login" state={{ from: location.pathname }} replace />
  }

  return <>{children}</>
}
```

**Key decisions**:
- Uses `location.pathname` in state (not search params) to preserve redirect target — cleaner than `?redirect=` query param
- Full-page spinner during loading prevents flash of content or login screen
- `replace` navigation prevents back button from returning to the redirect

### 3. AuthLayout (Split Screen)

**Overview**: Shared layout component used by Login, Signup, and Password Reset pages.

```typescript
// frontend/src/components/auth/AuthLayout.tsx
interface AuthLayoutProps {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen">
      {/* Left branding panel - hidden on mobile/tablet */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary items-center justify-center">
        <BrandingPanel />
      </div>

      {/* Mobile header strip - visible only below lg */}
      <div className="lg:hidden w-full h-20 bg-primary flex items-center justify-center gap-2 fixed top-0 z-10">
        {/* Compact: icon + name */}
      </div>

      {/* Right form panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-8 lg:px-12
                      pt-28 lg:pt-0"> {/* pt-28 accounts for mobile header */}
        <div className="w-full max-w-[400px]">
          {children}
        </div>
      </div>
    </div>
  )
}
```

**Key decisions**:
- `lg:` breakpoint (1024px) for the split layout, matching UI design specs
- Mobile header strip is `fixed top-0` with content area padded below it
- Form max-width 400px, centered in the right panel
- No AppShell, no sidebar — completely standalone

### 4. LoginPage

**Pattern to follow**: UI design specs Screen 1

**Overview**: Full login experience with Google OAuth, email/password, error handling.

```typescript
// frontend/src/features/auth/pages/LoginPage.tsx
import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { GoogleButton } from '@/components/auth/GoogleButton'
import { OrDivider } from '@/components/auth/OrDivider'
// + shadcn: Button, Input, Label, Alert

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string })?.from || '/portfolio'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Invalid email or password. Please try again.')
      setLoading(false)
      return
    }

    navigate(from, { replace: true })
  }

  async function handleGoogleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
  }

  return (
    <AuthLayout>
      {/* Header */}
      <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p className="text-sm text-muted-foreground mt-2">Sign in to your account</p>

      {/* Google button */}
      <div className="mt-8">
        <GoogleButton onClick={handleGoogleLogin} label="Continue with Google" />
      </div>

      <OrDivider />

      {/* Error alert */}
      {error && <Alert variant="destructive">...</Alert>}

      {/* Email/password form */}
      <form onSubmit={handleLogin} className="space-y-4">
        {/* Email field with Mail icon */}
        {/* Password field with Lock icon + eye toggle + "Forgot password?" link */}
        {/* Submit button with loading state */}
      </form>

      {/* Sign up link */}
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Don't have an account?{' '}
        <Link to="/auth/signup" className="text-primary font-medium hover:underline">
          Sign up
        </Link>
      </p>
    </AuthLayout>
  )
}
```

**Implementation steps**:
1. Create `AuthLayout` with split-screen + mobile header
2. Create `BrandingPanel` with app icon, name, tagline, feature callouts
3. Create `GoogleButton` with actual Google G SVG (inline, not Lucide)
4. Create `OrDivider` component
5. Build `LoginPage` with form, error states, loading states
6. Wire up `supabase.auth.signInWithPassword` and `signInWithOAuth`
7. Handle redirect to original URL after login

### 5. SignupPage

**Pattern to follow**: UI design specs Screen 2

**Overview**: Registration with email/password validation, password strength, Google OAuth.

```typescript
// Key additions over LoginPage:
// - Password strength indicator (PasswordStrength component)
// - Confirm password field with match validation
// - Redirects to EmailConfirmationPage on success

async function handleSignup(e: React.FormEvent) {
  e.preventDefault()

  if (password !== confirmPassword) {
    setFieldErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match' }))
    return
  }

  if (!isPasswordStrong) {
    setFieldErrors(prev => ({ ...prev, password: 'Password must meet all requirements' }))
    return
  }

  setLoading(true)
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
  })

  if (error) {
    if (error.message.includes('already registered')) {
      setError('An account with this email already exists. Try signing in instead.')
    } else {
      setError('Something went wrong. Please try again.')
    }
    setLoading(false)
    return
  }

  // Navigate to confirmation screen
  navigate('/auth/confirm', { state: { email } })
}
```

**Implementation steps**:
1. Create `usePasswordValidation` hook
2. Create `PasswordStrength` component (bar + checklist)
3. Build `SignupPage` with all fields and validation
4. Handle confirm password blur validation
5. Wire up `supabase.auth.signUp`
6. Navigate to confirmation page with email in state

### 6. usePasswordValidation Hook

**Overview**: Computes password strength and individual requirement status in real-time.

```typescript
// frontend/src/features/auth/hooks/usePasswordValidation.ts
interface PasswordValidation {
  hasMinLength: boolean    // >= 8 characters
  hasUppercase: boolean    // at least 1 uppercase letter
  hasNumber: boolean       // at least 1 number
  strength: 'weak' | 'fair' | 'strong'
  strengthPercent: number  // 0, 33, 66, 100
  isValid: boolean         // all 3 requirements met
}

export function usePasswordValidation(password: string): PasswordValidation {
  const hasMinLength = password.length >= 8
  const hasUppercase = /[A-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)

  const met = [hasMinLength, hasUppercase, hasNumber].filter(Boolean).length
  const strength = met <= 1 ? 'weak' : met === 2 ? 'fair' : 'strong'
  const strengthPercent = Math.round((met / 3) * 100)

  return { hasMinLength, hasUppercase, hasNumber, strength, strengthPercent, isValid: met === 3 }
}
```

### 7. EmailConfirmationPage

**Pattern to follow**: UI design specs Screen 3

**Overview**: Centered card shown after email signup. Includes resend with cooldown.

```typescript
// Key implementation details:
// - Receives email via location.state
// - Resend button calls supabase.auth.resend({ type: 'signup', email })
// - 60-second cooldown timer using useEffect + setInterval
// - onAuthStateChange auto-detects confirmation if user clicks email link in same browser

function EmailConfirmationPage() {
  const location = useLocation()
  const email = (location.state as { email?: string })?.email || ''
  const [cooldown, setCooldown] = useState(0)

  async function handleResend() {
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    if (error) {
      toast.error('Failed to send. Please try again.')
      return
    }
    toast.success('Confirmation email sent')
    setCooldown(60)
  }

  // Countdown timer
  useEffect(() => {
    if (cooldown <= 0) return
    const id = setInterval(() => setCooldown(c => c - 1), 1000)
    return () => clearInterval(id)
  }, [cooldown])

  // Auto-detect confirmation via onAuthStateChange (handled by AuthProvider)
  // If user confirms in same browser, AuthProvider updates → ProtectedRoute allows access
}
```

### 8. PasswordResetPage

**Pattern to follow**: UI design specs Screen 4

**Overview**: Two-state screen — request form and success state.

```typescript
// State A: Request form
async function handleResetRequest(e: React.FormEvent) {
  e.preventDefault()
  setLoading(true)
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`
  })
  // Always show success (security: prevent email enumeration)
  setShowSuccess(true)
  setLoading(false)
}

// State B: New password form (when user clicks email link)
// Detected via ?recovery=true query param set by AuthProvider's
// PASSWORD_RECOVERY event handler (see AuthProvider section).
// When Supabase processes the reset link, it fires onAuthStateChange
// with event === 'PASSWORD_RECOVERY', which sets a temporary session
// and redirects here. The user is already "logged in" with a temp session.
// User sets new password via supabase.auth.updateUser({ password })
const searchParams = new URLSearchParams(window.location.search)
const isRecoveryMode = searchParams.get('recovery') === 'true'

async function handlePasswordUpdate(e: React.FormEvent) {
  e.preventDefault()
  setLoading(true)
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) {
    setError('Failed to update password. Please try again.')
    setLoading(false)
    return
  }
  // Success — redirect to login with toast
  navigate('/auth/login', { state: { passwordReset: true } })
}
```

**Key decisions**:
- Always shows success after submitting email (never reveal if email exists — prevents enumeration)
- Password recovery is detected via Supabase's `PASSWORD_RECOVERY` event in `onAuthStateChange` (AuthProvider redirects to `/auth/reset-password?recovery=true`)
- The user is already authenticated with a temporary session when they arrive at the recovery form
- `supabase.auth.updateUser({ password })` updates the password using the active session
- New password form uses the same `PasswordStrength` component for validation

### 9. AuthCallbackPage

**Overview**: Handles OAuth redirects from Google. Supabase appends tokens to the URL hash.

```typescript
// frontend/src/features/auth/pages/AuthCallbackPage.tsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/providers/AuthProvider'
import { Loader2 } from 'lucide-react'

/**
 * OAuth callback page. Shows a spinner while Supabase SDK processes
 * the hash fragment tokens. Relies on AuthProvider's onAuthStateChange
 * to detect when the session is established (more reliable than calling
 * getSession() which may resolve before token exchange completes).
 *
 * Data migration is handled in AuthProvider's SIGNED_IN handler,
 * so no migration logic needed here.
 */
export function AuthCallbackPage() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading) {
      if (user) {
        navigate('/portfolio', { replace: true })
      } else {
        // Session not established — token exchange may have failed
        navigate('/auth/login', { replace: true })
      }
    }
  }, [user, loading, navigate])

  return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )
}
```

**Key decisions**:
- Supabase SDK handles token extraction from URL hash automatically
- Migration check happens during callback (silent, non-blocking)
- Migration result stored in sessionStorage so the portfolio page can show a toast
- Failure is silent — user should not be blocked from logging in if migration fails

### 10. API Client Token Auto-Injection

**Pattern to follow**: `frontend/src/lib/api.ts` (existing)

**Overview**: Modify `ApiClient` to automatically include the auth token from Supabase session on every request. Handle 401 with token refresh.

```typescript
// frontend/src/lib/api.ts — modified
import { supabase } from '@/lib/supabase'

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { token: explicitToken, ...fetchOptions } = options

    // Auto-inject token from Supabase session if not explicitly provided
    let token = explicitToken
    if (!token) {
      const { data: { session } } = await supabase.auth.getSession()
      token = session?.access_token ?? undefined
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (options.headers) {
      Object.assign(headers, options.headers as Record<string, string>)
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...fetchOptions,
      headers,
    })

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: 'Request failed' }))

      // Handle 401: redirect to login.
      // Note: Supabase SDK auto-refreshes tokens via onAuthStateChange before
      // they expire. If we get a 401, the token is genuinely invalid (not just
      // expired), so retrying with refresh is pointless and risks infinite loops.
      if (response.status === 401) {
        window.location.href = '/auth/login'
        throw new Error('Session expired')
      }

      if (response.status === 503 && body.code === 'SUPABASE_UNAVAILABLE') {
        const err = new Error(body.error || 'Database service unavailable')
        ;(err as Error & { code?: string }).code = 'SUPABASE_UNAVAILABLE'
        throw err
      }

      throw new Error(body.error || `HTTP ${response.status}`)
    }

    return response.json()
  }

  // ... get, post, put, patch, delete methods unchanged
}
```

**Key decisions**:
- Token auto-injection happens in the base `request()` method — all HTTP methods automatically get it
- Explicit `token` option still works (backward compatible) and takes precedence
- 401 handling: try token refresh first, retry request, then redirect to login if refresh fails
- `window.location.href` (hard redirect) used instead of React Router navigate because ApiClient is outside React context

### 11. App.tsx Route Structure

**Overview**: Restructure routing to include auth routes outside AppShell and wrap existing routes in ProtectedRoute.

```typescript
// frontend/src/App.tsx
import { AuthProvider } from '@/providers/AuthProvider'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { SignupPage } from '@/features/auth/pages/SignupPage'
import { EmailConfirmationPage } from '@/features/auth/pages/EmailConfirmationPage'
import { PasswordResetPage } from '@/features/auth/pages/PasswordResetPage'
import { AuthCallbackPage } from '@/features/auth/pages/AuthCallbackPage'

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="system">
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                {/* Public auth routes - no AppShell, no ProtectedRoute */}
                <Route path="/auth/login" element={<LoginPage />} />
                <Route path="/auth/signup" element={<SignupPage />} />
                <Route path="/auth/confirm" element={<EmailConfirmationPage />} />
                <Route path="/auth/reset-password" element={<PasswordResetPage />} />
                <Route path="/auth/callback" element={<AuthCallbackPage />} />

                {/* Protected app routes - wrapped in AppShell */}
                <Route element={
                  <ProtectedRoute>
                    <AppShell />
                  </ProtectedRoute>
                }>
                  <Route path="/" element={<Navigate to="/portfolio" replace />} />
                  <Route path="/portfolio" element={<PortfolioPage />} />
                  <Route path="/portfolio/artifacts/:id" element={<ArtifactPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/settings/style" element={<WritingStylePage />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </AuthProvider>

          <Toaster />
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
```

**Key decisions**:
- `AuthProvider` wraps the entire `BrowserRouter` so auth state is available everywhere
- Auth routes are outside the `AppShell` layout route — they render standalone
- `ProtectedRoute` wraps the `AppShell` parent route — all child routes inherit protection
- This avoids wrapping each route individually

### 12. First-User Data Migration Trigger

**Overview**: After first successful login (email or Google), check if placeholder data exists and trigger migration. This logic is centralized in the `AuthProvider`'s `onAuthStateChange` handler (see Section 1 above).

The migration runs from a single place:
- **AuthProvider** `SIGNED_IN` event handler — calls `POST /api/auth/migrate-data` with the session token

This covers both email/password login and OAuth callback (AuthCallbackPage just shows a spinner and lets AuthProvider handle everything).

**Key decisions**:
- Uses `localStorage` (not `sessionStorage`) for the `data-migrated` flag — persists across browser sessions to prevent unnecessary migration calls on every cold start
- Migration is non-blocking — login flow proceeds regardless of migration result
- Toast notification deferred to portfolio page via `sessionStorage` flag (`show-migration-toast`)
- Backend endpoint is idempotent — if no placeholder rows exist, it returns `{ migrated: false }` instantly
- The `localStorage` flag prevents even hitting the endpoint after the first successful check

### 13. Sidebar Logout Button

**Overview**: Add a sign-out button to the desktop sidebar and mobile navigation.

```typescript
// In Sidebar.tsx, add at the bottom of the nav:
import { useAuth } from '@/providers/AuthProvider'
import { LogOut } from 'lucide-react'

function Sidebar() {
  const { signOut } = useAuth()
  // ... existing sidebar code

  // Add logout button at bottom:
  <button onClick={signOut} className="...">
    <LogOut className="h-5 w-5" />
    <span>Sign out</span>
  </button>
}
```

The `signOut` from `useAuth()` calls `supabase.auth.signOut()`, which clears the session. `onAuthStateChange` fires, setting `user` to `null`, which triggers `ProtectedRoute` to redirect to `/auth/login`.

## Testing Requirements

### Unit Tests

| Test File | Coverage |
|-----------|----------|
| `frontend/src/features/auth/hooks/__tests__/usePasswordValidation.test.ts` | Password strength logic |
| `frontend/src/components/auth/__tests__/PasswordStrength.test.tsx` | Strength UI component |
| `frontend/src/components/auth/__tests__/ProtectedRoute.test.tsx` | Route protection logic |

**Key test cases**:
- `usePasswordValidation`: empty string = weak, "password" = weak, "Password1" = strong
- `PasswordStrength`: renders bar at correct width, shows checklist items
- `ProtectedRoute`: loading state shows spinner, no user redirects, authenticated user passes through
- `LoginPage`: form submission calls `signInWithPassword`, error displayed on failure
- `SignupPage`: validation prevents submit when passwords don't match, calls `signUp` on valid input

### Integration Tests

| Test File | Coverage |
|-----------|----------|
| `frontend/src/features/auth/__tests__/authFlow.integration.test.ts` | End-to-end auth flow |

**Key scenarios**:
- Login with valid credentials → redirected to /portfolio
- Login with invalid credentials → error message shown
- Signup → redirected to confirmation page with email
- Unauthenticated visit to /portfolio → redirected to /auth/login
- Token auto-injection in API calls → Authorization header present

### Manual Testing

- [ ] Sign up with email/password — see confirmation screen with correct email
- [ ] Click confirmation link in email — auto-redirected to app
- [ ] Sign up with Google — immediate access to app
- [ ] Log in with email/password
- [ ] Log in with Google
- [ ] Password validation shows real-time feedback (bar + checklist)
- [ ] Forgot password → receive email → reset password → login with new password
- [ ] Visit /portfolio without auth → redirected to login
- [ ] After login, redirected to original URL (e.g., /portfolio/artifacts/123)
- [ ] Refresh page while logged in → session persists (no re-login)
- [ ] Click logout → redirected to login, session cleared
- [ ] All API calls include Authorization header (verify in Network tab)
- [ ] First user signup triggers data migration (check backend logs)
- [ ] Auth screens work in dark mode
- [ ] Auth screens work on mobile (responsive layout)
- [ ] TypeScript compiles: `cd frontend && npx tsc --noEmit`
- [ ] Build succeeds: `cd frontend && npm run build`

## Error Handling

| Error Scenario | Handling Strategy |
|----------------|-------------------|
| Invalid credentials (wrong email/password) | Show destructive Alert: "Invalid email or password" (never reveal which is wrong) |
| Email already registered (signup) | Show error: "An account with this email already exists" |
| Unconfirmed email (login attempt) | Supabase returns error; show: "Please confirm your email first" |
| Network error (any auth call) | Show: "Something went wrong. Please try again." |
| OAuth popup blocked | Supabase handles via redirect (not popup), so this shouldn't occur |
| Token expired during API call | Auto-refresh token, retry request; if refresh fails, redirect to login |
| Password too weak (client-side) | Prevent form submission, highlight unmet requirements in red |
| Passwords don't match (signup) | Inline error below confirm field on blur |
| Email confirmation link expired | User clicks "Resend confirmation email" |
| Password reset link expired | User starts the reset flow again |

## Validation Commands

```bash
# Type checking (frontend)
cd frontend && npx tsc --noEmit

# Run tests
cd frontend && npm run test

# Build
cd frontend && npm run build

# Dev server (for manual testing)
cd frontend && npm run dev
```

## Rollout Considerations

- **Deployment order**: Phase 1 backend changes must be deployed FIRST. Phase 2 frontend depends on protected routes and RLS being active.
- **Feature flag**: None needed — auth is an all-or-nothing feature
- **Monitoring**: Watch for auth-related errors in Supabase Auth logs (`mcp__supabase__get_logs` with `service: "auth"`)
- **Rollback plan**: Revert frontend deployment; backend with `requireAuth` will block access, but the previous frontend won't send tokens. If emergency rollback needed, also revert backend to remove `requireAuth` from routes.
- **Post-deploy**: After first real user signs up and migration completes, run the "Remove Placeholder Policies" SQL from spec-phase-1.md section 6

## Open Items

- [ ] Google OAuth: Need client ID + secret from Google Cloud Console
- [ ] Custom email templates: Using Supabase defaults for now; can customize branding later
- [ ] "Remember me" checkbox: Not implementing (Supabase auto-persists sessions with 1-hour refresh)
- [ ] Session duration: Using Supabase default (1 hour with auto-refresh)

---

*This spec is ready for implementation. Follow the patterns and validate at each step.*
