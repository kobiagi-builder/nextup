# Authentication Screens

**Created:** 2026-02-25
**Last Updated:** 2026-02-25
**Version:** 1.0.0
**Status:** Complete

## Overview

NextUp has 5 public authentication pages, all located under `/auth/*`. Pages use a shared `AuthLayout` component that renders a split-panel design: branding panel on the left (desktop), form panel on the right. On mobile, a compact header strip replaces the branding panel.

---

## Shared Components

### AuthLayout

**File:** `frontend/src/components/auth/AuthLayout.tsx`

Split-panel layout used by LoginPage, SignupPage, and PasswordResetPage.

| Breakpoint | Left Panel | Right Panel |
|------------|-----------|-------------|
| Desktop (`lg+`) | `BrandingPanel` (50% width, primary background) | Form content (50% width, centered, max-w-400px) |
| Mobile (`< lg`) | Hidden | Full width + fixed header strip (h-20, primary bg, NextUp logo) |

### BrandingPanel

**File:** `frontend/src/components/auth/BrandingPanel.tsx`

Left-side branding content displayed on desktop auth screens.

### GoogleButton

**File:** `frontend/src/components/auth/GoogleButton.tsx`

**Props:** `onClick: () => void`, `label?: string`, `disabled?: boolean`

Renders a Google OAuth sign-in button. Default label: "Continue with Google".

### OrDivider

**File:** `frontend/src/components/auth/OrDivider.tsx`

Horizontal divider with "or" text, placed between Google OAuth button and email/password form.

### PasswordStrength

**File:** `frontend/src/components/auth/PasswordStrength.tsx`

**Props:**
```typescript
interface PasswordStrengthProps {
  hasMinLength: boolean    // >= 8 characters
  hasUppercase: boolean    // at least 1 uppercase
  hasNumber: boolean       // at least 1 digit
  strength: 'weak' | 'fair' | 'strong'
  strengthPercent: number  // 0, 33, 67, or 100
  show: boolean            // only visible when password has input
}
```

Visual password strength indicator showing requirement checklist and strength bar.

### ProtectedRoute

**File:** `frontend/src/components/auth/ProtectedRoute.tsx`

Route guard wrapping all authenticated routes. Behavior:
- **Loading**: Full-screen spinner (`Loader2` animation)
- **No user**: Redirect to `/auth/login` with `state.from` set to current path
- **Has user**: Render children

---

## Page 1: LoginPage

**Route:** `/auth/login`
**File:** `frontend/src/features/auth/pages/LoginPage.tsx`
**Layout:** `AuthLayout`

### Component Hierarchy

```
AuthLayout
  h1: "Welcome back"
  p: "Sign in to your account"
  Alert (conditional: passwordReset state)
  GoogleButton
  OrDivider
  Alert (conditional: error)
  form
    Label + Input (email, with Mail icon)
    Label + Input (password, with Lock icon + show/hide toggle)
    Link: "Forgot password?" -> /auth/reset-password
    Button: "Sign in" (or "Signing in..." with spinner)
  Link: "Don't have an account? Sign up" -> /auth/signup
```

### State

| State | Type | Default | Purpose |
|-------|------|---------|---------|
| `email` | `string` | `''` | Email input value |
| `password` | `string` | `''` | Password input value |
| `showPassword` | `boolean` | `false` | Toggle password visibility |
| `error` | `string \| null` | `null` | Inline error message |
| `loading` | `boolean` | `false` | Submit loading state |

### Key Interactions

| Interaction | Behavior |
|-------------|----------|
| Submit form | Call `supabase.auth.signInWithPassword()`, navigate to `from` or `/portfolio` on success |
| Click Google | Call `supabase.auth.signInWithOAuth({ provider: 'google' })`, redirect to Google |
| Toggle eye icon | Show/hide password text |
| Click "Forgot password?" | Navigate to `/auth/reset-password` |
| Click "Sign up" | Navigate to `/auth/signup` |

### Conditional Rendering

- **Success banner**: Shown when `location.state.passwordReset === true` (after successful password reset)
- **Error alert**: Shown when `error` state is non-null

---

## Page 2: SignupPage

**Route:** `/auth/signup`
**File:** `frontend/src/features/auth/pages/SignupPage.tsx`
**Layout:** `AuthLayout`

### Component Hierarchy

```
AuthLayout
  h1: "Create your account"
  p: "Start creating better content today"
  GoogleButton (label: "Continue with Google")
  OrDivider
  Alert (conditional: error)
  form
    Label + Input (email, with Mail icon)
    Label + Input (password, with Lock icon + show/hide toggle)
    PasswordStrength (visible when password has input)
    Label + Input (confirm password, with Lock icon + show/hide toggle)
    p (conditional: match/mismatch indicator after blur)
    Button: "Create account" (or "Creating account..." with spinner)
  p: Terms of Service notice
  Link: "Already have an account? Sign in" -> /auth/login
```

### State

| State | Type | Default | Purpose |
|-------|------|---------|---------|
| `email` | `string` | `''` | Email input |
| `password` | `string` | `''` | Password input |
| `confirmPassword` | `string` | `''` | Confirm password input |
| `showPassword` | `boolean` | `false` | Password visibility |
| `showConfirmPassword` | `boolean` | `false` | Confirm visibility |
| `error` | `string \| null` | `null` | Inline error |
| `confirmTouched` | `boolean` | `false` | Whether confirm field has been blurred |
| `loading` | `boolean` | `false` | Submit loading state |

### Validation

Uses `usePasswordValidation(password)` hook:

| Rule | Visual Indicator |
|------|-----------------|
| Min 8 characters | Checklist item |
| 1 uppercase letter | Checklist item |
| 1 number | Checklist item |
| Strength bar | Progress (weak/fair/strong) |

**Submit enabled** when: `email && isValid && passwordsMatch && confirmPassword.length > 0`

**Confirm mismatch**: After blur on confirm field, shows red "Passwords do not match" or green "Passwords match" text. Confirm input border turns red on mismatch.

### Key Interactions

| Interaction | Behavior |
|-------------|----------|
| Submit form | Call `supabase.auth.signUp()`, navigate to `/auth/confirm` with email state |
| Click Google | Same OAuth flow as LoginPage |
| Type password | `PasswordStrength` component updates live |
| Blur confirm field | Show match/mismatch indicator |

---

## Page 3: EmailConfirmationPage

**Route:** `/auth/confirm`
**File:** `frontend/src/features/auth/pages/EmailConfirmationPage.tsx`
**Layout:** Standalone (no `AuthLayout`)

### Component Hierarchy

```
div (centered, min-h-screen)
  Card (max-w-480px, shadow-lg)
    Mail icon (h-20 w-20, rounded-full, primary/10 bg)
    h1: "Check your email"
    p: "We sent a confirmation link to {email}"
    Button (outline): "Resend confirmation email" / "Resend in {M:SS}"
    Separator
    Link: "Back to sign in" -> /auth/login
    p: "Didn't receive it? Check your spam folder."
```

### State

| State | Type | Default | Purpose |
|-------|------|---------|---------|
| `cooldown` | `number` | `0` | Seconds remaining before resend allowed |
| `sending` | `boolean` | `false` | Resend loading state |

### Key Interactions

| Interaction | Behavior |
|-------------|----------|
| Click "Resend" | Call `supabase.auth.resend({ type: 'signup', email })`, start 60s cooldown |
| Cooldown active | Button disabled, shows "Resend in M:SS" with Clock icon |
| Click "Back to sign in" | Navigate to `/auth/login` |

### Data Source

- `email` is read from `location.state.email` (passed by SignupPage on successful signup)

---

## Page 4: PasswordResetPage

**Route:** `/auth/reset-password`
**File:** `frontend/src/features/auth/pages/PasswordResetPage.tsx`
**Layout:** `AuthLayout`

This page renders two different forms based on the `?recovery=true` query parameter:

### Mode A: RequestResetForm (default)

Shown when `recovery` param is absent.

```
AuthLayout
  Link: "Back to sign in" -> /auth/login (ArrowLeft icon)
  h1: "Reset your password"
  p: "Enter your email and we'll send you a reset link"
  form
    Label + Input (email, with Mail icon)
    Button: "Send reset link" (or "Sending..." with spinner)
  Link: "Remember your password? Sign in" -> /auth/login
```

**On success**: Renders a confirmation screen with CheckCircle2 icon, "Check your email" heading, and "The link expires in 24 hours" note.

### Mode B: NewPasswordForm (`?recovery=true`)

Shown after clicking the reset link in email. Supabase `PASSWORD_RECOVERY` event triggers `AuthProvider` to redirect here with `?recovery=true`.

```
AuthLayout
  h1: "Set new password"
  p: "Choose a strong password for your account"
  Alert (conditional: error)
  form
    Label + Input (new password, with Lock + show/hide)
    PasswordStrength
    Label + Input (confirm new password, with Lock + show/hide)
    p (conditional: match/mismatch)
    Button: "Update password" (or "Updating password..." with spinner)
```

**Same validation as SignupPage** (usePasswordValidation hook, confirm match).

**On success**: Navigate to `/auth/login` with `{ passwordReset: true }` state, triggering success banner.

---

## Page 5: AuthCallbackPage

**Route:** `/auth/callback`
**File:** `frontend/src/features/auth/pages/AuthCallbackPage.tsx`
**Layout:** None (minimal spinner)

### Component Hierarchy

```
div (h-screen, centered)
  Loader2 (h-8 w-8, animate-spin)
```

### Behavior

- Renders only a centered loading spinner
- Uses `useAuth()` to monitor `user` and `loading` state
- When `loading` becomes `false`:
  - If `user` exists: redirect to `/portfolio` (replace)
  - If no `user`: redirect to `/auth/login` (replace)

### Purpose

Handles OAuth callback (Google) and email confirmation redirects. Supabase SDK processes hash fragment tokens automatically; this page just waits for the session to be established.

---

## Responsive Behavior

| Element | Mobile (`< lg`) | Desktop (`lg+`) |
|---------|-----------------|-----------------|
| Branding panel | Hidden | Visible (50% width) |
| Mobile header strip | Visible (h-20, fixed, primary bg) | Hidden |
| Form panel | Full width, top padding for header | 50% width, centered |
| Form container | max-w-400px | max-w-400px |
| EmailConfirmationPage | max-w-480px card | max-w-480px card |

---

## Route Summary

| Route | Component | Auth Required | Layout |
|-------|-----------|--------------|--------|
| `/auth/login` | `LoginPage` | No | `AuthLayout` |
| `/auth/signup` | `SignupPage` | No | `AuthLayout` |
| `/auth/confirm` | `EmailConfirmationPage` | No | Standalone |
| `/auth/reset-password` | `PasswordResetPage` | No | `AuthLayout` |
| `/auth/callback` | `AuthCallbackPage` | No | None (spinner) |

---

## Related Documentation

- [Authentication Flow](../flows/auth-flow.md) — step-by-step auth flows with sequence diagrams
- [Authentication & Security API](../api/authentication-and-security.md) — backend auth middleware, rate limits
- [App Shell](./app-shell.md) — sidebar sign out, ProtectedRoute integration
